import fs from 'fs-extra'
import path from 'path'
import { dedupeImageEntries, filterDirectChildImageEntries } from './imagePairing.js'

const toIgnored = (input, reason) => ({ input, reason })

const toDescriptor = (sourcePath, type) => ({
  path: path.resolve(String(sourcePath)),
  type
})

const normalizeSourcePath = (rawPath) => {
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    return null
  }
  return path.resolve(rawPath)
}

const normalizeSourceInput = (rawSource) => {
  if (typeof rawSource === 'string') {
    const sourcePath = normalizeSourcePath(rawSource)
    return sourcePath ? { path: sourcePath } : null
  }
  if (!rawSource || typeof rawSource !== 'object') {
    return null
  }
  const sourcePath = normalizeSourcePath(rawSource.path)
  return sourcePath ? { path: sourcePath, type: rawSource.type } : null
}

const statSafe = async (targetPath) => {
  try {
    return await fs.stat(targetPath)
  } catch (error) {
    return null
  }
}

const toImageItem = (filePath, stat, sourceIndex) => ({
  path: filePath,
  name: path.basename(filePath),
  lastModifyTime: stat.mtime.getTime(),
  size: stat.size,
  isFile: true,
  sourceIndex
})

const isSupportedImageItem = (item) => filterDirectChildImageEntries([item], path.dirname(item.path)).length > 0

const readFolderItems = async (folderPath) => {
  const names = await fs.readdir(folderPath).catch(() => [])
  const entries = await Promise.all(names.map(async (name) => {
    const filePath = path.resolve(folderPath, name)
    const stat = await statSafe(filePath)
    return stat && stat.isFile() ? toImageItem(filePath, stat) : null
  }))
  return filterDirectChildImageEntries(entries.filter(Boolean), folderPath)
}

const buildSourcePayload = async (source, sourceIndex) => {
  const stat = await statSafe(source.path)
  if (!stat) {
    return { ignored: toIgnored(source.path, 'missing') }
  }
  if (stat.isDirectory()) {
    return {
      source: toDescriptor(source.path, 'folder'),
      items: (await readFolderItems(source.path)).map((item) => ({ ...item, sourceIndex }))
    }
  }
  if (!stat.isFile()) {
    return { ignored: toIgnored(source.path, 'unsupported-type') }
  }
  const item = toImageItem(source.path, stat, sourceIndex)
  if (!isSupportedImageItem(item)) {
    return { ignored: toIgnored(source.path, 'unsupported-image') }
  }
  return {
    source: toDescriptor(source.path, 'file'),
    items: [item]
  }
}

const collectSourcePayload = async (rawSources = []) => {
  const seen = new Set()
  const ignored = []
  const queue = rawSources.reduce((list, rawSource) => {
    const source = normalizeSourceInput(rawSource)
    if (!source) {
      ignored.push(toIgnored(rawSource, 'invalid-path'))
      return list
    }
    if (seen.has(source.path)) {
      ignored.push(toIgnored(source.path, 'duplicate'))
      return list
    }
    seen.add(source.path)
    list.push(source)
    return list
  }, [])
  const results = await Promise.all(queue.map((source, sourceIndex) => buildSourcePayload(source, sourceIndex)))
  return results.reduce((acc, result) => {
    if (result.ignored) {
      acc.ignored.push(result.ignored)
      return acc
    }
    acc.sources.push(result.source)
    acc.items.push(...result.items)
    return acc
  }, { sources: [], items: [], ignored })
}

export const ingestImageSources = async (rawPaths = []) => {
  const result = await collectSourcePayload(Array.isArray(rawPaths) ? rawPaths : [rawPaths])
  result.items = dedupeImageEntries(result.items)
  return result
}

export const rebuildItemsFromSources = async (sources = []) => ingestImageSources(
  (Array.isArray(sources) ? sources : [sources]).map((source) => normalizeSourceInput(source) || source)
)

export const toAbsoluteItemPathSet = (items = []) => {
  const seen = new Set()
  return (Array.isArray(items) ? items : []).reduce((list, item) => {
    if (!item || !item.path) {
      return list
    }
    const resolvedPath = path.resolve(String(item.path))
    if (seen.has(resolvedPath)) {
      return list
    }
    seen.add(resolvedPath)
    list.push(resolvedPath)
    return list
  }, [])
}

export const hasItemPathSetChanged = (nextItems = [], currentItems = []) => {
  const nextPaths = toAbsoluteItemPathSet(nextItems)
  const currentPaths = toAbsoluteItemPathSet(currentItems)
  if (nextPaths.length !== currentPaths.length) {
    return true
  }
  const currentSet = new Set(currentPaths)
  return nextPaths.some((itemPath) => !currentSet.has(itemPath))
}

const freshnessInFlight = new Map()

const buildFreshnessKey = (sources = [], storedItems = []) => JSON.stringify({
  sources: (Array.isArray(sources) ? sources : []).map((source) => normalizeSourceInput(source) || source),
  stored: toAbsoluteItemPathSet(storedItems)
})

export const inspectImageSourceFreshness = async (sources = [], storedItems = []) => {
  const key = buildFreshnessKey(sources, storedItems)
  if (freshnessInFlight.has(key)) {
    return freshnessInFlight.get(key)
  }
  const task = rebuildItemsFromSources(sources).then((scan) => ({
    stale: hasItemPathSetChanged(scan.items, storedItems),
    scan
  })).finally(() => {
    freshnessInFlight.delete(key)
  })
  freshnessInFlight.set(key, task)
  return task
}
