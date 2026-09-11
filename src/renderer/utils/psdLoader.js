import fs from 'fs-extra'
import path from 'path'

const PSD_EXTENSION_RE = /\.psd$/i
const THUMBNAIL_MAX_DIMENSION = 320
const MAX_PSD_CACHE_BYTES = 256 * 1024 * 1024

export const PSD_DECODE_PURPOSE = Object.freeze({
  thumbnail: 'thumbnail',
  display: 'display',
  original: 'original'
})

const cache = new Map()
const identityRequests = new Map()
let preloadKeys = new Set()
let preloadGeneration = 0

const now = () => Date.now()

export const isPsdPath = (filePath = '') => PSD_EXTENSION_RE.test(String(filePath).split('?')[0])

const normalizeMaxDimension = (purpose, maxDimension) => {
  if (purpose === PSD_DECODE_PURPOSE.original) return 0
  if (purpose === PSD_DECODE_PURPOSE.thumbnail) return THUMBNAIL_MAX_DIMENSION
  const value = Number(maxDimension)
  return Number.isFinite(value) && value > 0 ? Math.max(1, Math.floor(value)) : 1600
}

const normalizeIdentity = (filePath, stat) => {
  const resolvedPath = path.resolve(String(filePath))
  const mtime = Number(stat?.mtimeMs ?? stat?.mtime?.getTime())
  const size = Number(stat?.size)
  if (!Number.isFinite(mtime) || !Number.isFinite(size)) {
    throw new Error(`PSD file identity is unavailable: ${resolvedPath}`)
  }
  return {
    path: resolvedPath,
    mtime,
    size,
    key: `${resolvedPath}\u0000${mtime}\u0000${size}`
  }
}

const getIdentity = async (filePath) => {
  const resolvedPath = path.resolve(String(filePath))
  if (!identityRequests.has(resolvedPath)) {
    const request = fs.stat(resolvedPath)
      .then((result) => normalizeIdentity(resolvedPath, result))
      .finally(() => identityRequests.delete(resolvedPath))
    identityRequests.set(resolvedPath, request)
  }
  return identityRequests.get(resolvedPath)
}

const variantKey = (identity, purpose, maxDimension) =>
  `${identity.key}\u0000${purpose}\u0000${maxDimension || 0}`

const releaseEntry = (entry) => {
  if (!entry) return
  entry.value = null
  entry.promise = null
  cache.delete(entry.key)
  preloadKeys.delete(entry.key)
}

const markStalePathEntries = (identity) => {
  for (const entry of cache.values()) {
    if (entry.path !== identity.path || entry.identityKey === identity.key) continue
    entry.stale = true
    if (entry.references === 0 && !entry.preload) releaseEntry(entry)
  }
}

const trimCache = () => {
  let totalBytes = 0
  for (const entry of cache.values()) {
    totalBytes += entry.value?.data?.byteLength || 0
  }
  if (totalBytes <= MAX_PSD_CACHE_BYTES) return

  const candidates = [...cache.values()]
    .filter((entry) => entry.references === 0 && !entry.preload && entry.value)
    .sort((left, right) => left.lastUsed - right.lastUsed)
  for (const entry of candidates) {
    if (totalBytes <= MAX_PSD_CACHE_BYTES) break
    totalBytes -= entry.value?.data?.byteLength || 0
    releaseEntry(entry)
  }
}

const createEntry = (identity, purpose, maxDimension) => {
  const key = variantKey(identity, purpose, maxDimension)
  const entry = {
    key,
    path: identity.path,
    identityKey: identity.key,
    purpose,
    maxDimension,
    references: 0,
    preload: false,
    stale: false,
    preloadCancelled: false,
    lastUsed: now(),
    value: null,
    promise: null
  }
  const { ipcRenderer } = require('electron')
  entry.promise = ipcRenderer.invoke('psd:decode', {
    path: identity.path,
    maxDimension,
    mtime: identity.mtime,
    size: identity.size
  }).then((result) => {
    const data = result?.data instanceof ArrayBuffer
      ? new Uint8ClampedArray(result.data)
      : ArrayBuffer.isView(result?.data)
        ? new Uint8ClampedArray(result.data.buffer, result.data.byteOffset, result.data.byteLength)
        : new Uint8ClampedArray(result?.data || 0)
    entry.value = {
      width: Number(result.width),
      height: Number(result.height),
      data
    }
    entry.promise = null
    entry.lastUsed = now()
    if (entry.preloadCancelled && entry.references === 0 && !entry.stale) {
      // Keep a completed adjacent raster in the bounded shared cache. If the
      // user navigates into that group immediately, the current view can
      // acquire it instead of decoding the same PSD again.
      trimCache()
      return entry.value
    }
    if (entry.stale && entry.references === 0 && !entry.preload) releaseEntry(entry)
    trimCache()
    return entry.value
  }).catch((error) => {
    cache.delete(entry.key)
    preloadKeys.delete(entry.key)
    entry.promise = null
    throw error
  })
  cache.set(key, entry)
  return entry
}

const getOrCreateEntry = (identity, purpose, maxDimension) => {
  markStalePathEntries(identity)
  const key = variantKey(identity, purpose, maxDimension)
  return cache.get(key) || createEntry(identity, purpose, maxDimension)
}

const acquire = async (filePath, options = {}) => {
  const purpose = options.purpose || PSD_DECODE_PURPOSE.display
  const maxDimension = normalizeMaxDimension(purpose, options.maxDimension)
  const identity = await getIdentity(filePath)
  const entry = getOrCreateEntry(identity, purpose, maxDimension)
  entry.references += 1
  entry.lastUsed = now()
  try {
    const value = await (entry.promise || Promise.resolve(entry.value))
    let released = false
    return {
      ...value,
      key: entry.key,
      path: identity.path,
      purpose,
      release() {
        if (released) return
        released = true
        entry.references = Math.max(0, entry.references - 1)
        entry.lastUsed = now()
        if (entry.references === 0 && (entry.stale || purpose === PSD_DECODE_PURPOSE.original) && !entry.preload) {
          releaseEntry(entry)
        } else {
          trimCache()
        }
      }
    }
  } catch (error) {
    entry.references = Math.max(0, entry.references - 1)
    throw error
  }
}

export const loadPsdImageElement = async (filePath, options = {}) => {
  const resource = await acquire(filePath, options)
  const canvas = document.createElement('canvas')
  let imageData = null
  try {
    canvas.width = resource.width
    canvas.height = resource.height
    const context = canvas.getContext('2d')
    imageData = new ImageData(resource.data, resource.width, resource.height)
    context.putImageData(imageData, 0, 0)
    // The canvas now owns its pixels; release the shared raster and temporary ImageData.
    return {
      image: canvas,
      width: resource.width,
      height: resource.height,
      dispose() {
        canvas.width = 0
        canvas.height = 0
      }
    }
  } finally {
    imageData = null
    resource.release()
  }
}

export const loadPsdThumbnailDataUrl = async (filePath, options = {}) => {
  const loaded = await loadPsdImageElement(filePath, {
    ...options,
    purpose: PSD_DECODE_PURPOSE.thumbnail,
    maxDimension: THUMBNAIL_MAX_DIMENSION
  })
  try {
    return loaded.image.toDataURL('image/png')
  } finally {
    loaded.dispose()
  }
}

export const preloadPsdWindow = async (filePaths = [], options = {}) => {
  const generation = ++preloadGeneration
  for (const entry of cache.values()) {
    if (!entry.preload) continue
    entry.preload = false
    entry.preloadCancelled = true
  }
  preloadKeys = new Set()
  trimCache()
  const paths = [...new Set((Array.isArray(filePaths) ? filePaths : []).filter(isPsdPath))]
  const purpose = options.purpose || PSD_DECODE_PURPOSE.display
  const maxDimension = normalizeMaxDimension(purpose, options.maxDimension)
  const nextKeys = new Set()
  await Promise.all(paths.map(async (filePath) => {
    try {
      const identity = await getIdentity(filePath)
      const entry = getOrCreateEntry(identity, purpose, maxDimension)
      entry.preload = true
      entry.preloadCancelled = false
      nextKeys.add(entry.key)
      await (entry.promise || Promise.resolve(entry.value))
    } catch (error) {
      // A failed adjacent preload must not block the current comparison group.
      console.warn('PSD preload failed', filePath, error)
    }
  }))

  if (generation !== preloadGeneration) return
  preloadKeys = nextKeys
}

export const invalidatePsdPath = (filePath) => {
  const resolvedPath = path.resolve(String(filePath))
  for (const entry of [...cache.values()]) {
    if (entry.path !== resolvedPath) continue
    entry.stale = true
    if (entry.references === 0 && !entry.preload) releaseEntry(entry)
  }
}

export const clearPsdCache = () => {
  preloadGeneration += 1
  for (const entry of [...cache.values()]) {
    if (entry.references === 0) releaseEntry(entry)
    else entry.stale = true
  }
  preloadKeys = new Set()
}

export const getPsdThumbnailMaxDimension = () => THUMBNAIL_MAX_DIMENSION
