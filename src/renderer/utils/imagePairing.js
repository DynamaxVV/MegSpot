import path from 'path'

const NAME_COLLATOR = new Intl.Collator('zh', {
  numeric: true,
  sensitivity: 'base'
})

export const DEFAULT_COMPARE_MODE = 'side-by-side'
const COMPARE_MODES = [DEFAULT_COMPARE_MODE, 'single', 'split']
export const DEFAULT_SORT_CONFIG = {
  field: 'name',
  order: 'asc'
}

const IMAGE_FILE_RE = /\.(jpe?g|ico|svg|bmp|avif|tif|tiff|a?png)$/i
const COPY_SUFFIX_RE = /\s*拷贝$/
const COMPOSITE_NAME_RE = /^\d+(?:\+\d+)+$/

const normalizeNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const normalizeOrder = (order) => order === 'desc' ? 'desc' : 'asc'

const splitBaseName = (name = '') => {
  const fileName = String(name).split(/[\\/]/).pop() || ''
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0) {
    return fileName
  }
  return fileName.slice(0, dotIndex)
}

const compareName = (left, right) => NAME_COLLATOR.compare(left.name, right.name)

const compareNumber = (left, right, field) => normalizeNumber(left[field]) - normalizeNumber(right[field])

const comparePath = (left, right) => NAME_COLLATOR.compare(left.path, right.path)

const getCompositeTokens = (name = '') => {
  const baseName = normalizeBaseName(name)
  return COMPOSITE_NAME_RE.test(baseName) ? baseName.split('+') : []
}

const getLogicalName = (entry) => {
  const tokens = getCompositeTokens(entry && entry.name)
  return tokens[0] || normalizeBaseName(entry && entry.name)
}

const collectCompositeCandidates = (leftSorted, rightSorted, nameMatches, matchedRight) => {
  const candidates = []
  leftSorted.forEach((left, leftIndex) => {
    if (nameMatches[leftIndex] || !getCompositeTokens(left.name).length) return
    rightSorted.forEach((right, rightIndex) => {
      if (matchedRight.has(rightIndex) || getCompositeTokens(right.name).length) return
      const tokenIndex = getCompositeTokens(left.name).indexOf(normalizeBaseName(right.name))
      if (tokenIndex > -1) candidates.push({ leftIndex, rightIndex, tokenIndex })
    })
  })
  rightSorted.forEach((right, rightIndex) => {
    if (matchedRight.has(rightIndex) || !getCompositeTokens(right.name).length) return
    leftSorted.forEach((left, leftIndex) => {
      if (nameMatches[leftIndex] || getCompositeTokens(left.name).length) return
      const tokenIndex = getCompositeTokens(right.name).indexOf(normalizeBaseName(left.name))
      if (tokenIndex > -1) candidates.push({ leftIndex, rightIndex, tokenIndex })
    })
  })
  return candidates.sort((left, right) => left.tokenIndex - right.tokenIndex
    || left.leftIndex - right.leftIndex || left.rightIndex - right.rightIndex)
}

const applyCompositeMatches = (leftSorted, rightSorted, nameMatches, matchedRight) => {
  collectCompositeCandidates(leftSorted, rightSorted, nameMatches, matchedRight)
    .forEach(({ leftIndex, rightIndex }) => {
      if (nameMatches[leftIndex] || matchedRight.has(rightIndex)) return
      nameMatches[leftIndex] = rightSorted[rightIndex]
      matchedRight.add(rightIndex)
    })
}

const sortRowsByLogicalName = (rows, leftSort, rightSort, leftSorted, rightSorted) => {
  if (leftSort.field !== 'name' || rightSort.field !== 'name') return rows
  if (!leftSorted.concat(rightSorted).some((entry) => getCompositeTokens(entry.name).length)) return rows
  return rows
    .map((row, index) => ({ row, index, logicalName: getLogicalName(row.left || row.right) }))
    .sort((left, right) => {
      const result = NAME_COLLATOR.compare(left.logicalName, right.logicalName)
      return (leftSort.order === 'desc' ? -result : result) || left.index - right.index
    })
    .map((item) => item.row)
}

const isSupportedImagePath = (filePath = '') => IMAGE_FILE_RE.test(String(filePath).split('?')[0])

const createRow = (left, right) => ({
  id: `${left ? left.path : ''}::${right ? right.path : ''}`,
  left: left || null,
  right: right || null
})

const toLookupKey = (leftPath, rightPath) => `${leftPath || ''}::${rightPath || ''}`

const getSourceFolderCount = (sources = []) => sources.filter((source) => source && source.type === 'folder').length

const withDisplayName = (entry, showFolderName = false) => {
  if (!entry || !showFolderName) {
    return entry
  }
  return {
    ...entry,
    displayName: `${path.basename(path.dirname(entry.path))}/${entry.name}`
  }
}

export const normalizeBaseName = (name = '') => {
  const baseName = splitBaseName(name)
  const normalized = baseName.replace(COPY_SUFFIX_RE, '')
  return (normalized || baseName).toLocaleLowerCase()
}

export const normalizeImageEntry = (entry = {}) => {
  if (!entry || !entry.path) {
    return null
  }
  return {
    path: String(entry.path),
    name: String(entry.name || String(entry.path).split(/[\\/]/).pop() || ''),
    lastModifyTime: normalizeNumber(entry.lastModifyTime),
    size: normalizeNumber(entry.size),
    sourceIndex: Number.isInteger(entry.sourceIndex) ? entry.sourceIndex : null
  }
}

export const dedupeImageEntries = (entries = []) => {
  const seen = new Set()
  return entries.reduce((list, entry) => {
    const normalized = normalizeImageEntry(entry)
    if (!normalized || seen.has(normalized.path)) {
      return list
    }
    seen.add(normalized.path)
    list.push(normalized)
    return list
  }, [])
}

export const filterDirectChildImageEntries = (entries = [], folderPath = '') => {
  if (!folderPath) {
    return []
  }
  const targetFolder = path.resolve(String(folderPath))
  return dedupeImageEntries(entries).filter((entry) => {
    if (!isSupportedImagePath(entry.path)) {
      return false
    }
    if (entry.isFile === false) {
      return false
    }
    return path.dirname(path.resolve(entry.path)) === targetFolder
  })
}

export const normalizeSortConfig = (sortConfig = {}) => ({
  field: ['name', 'lastModifyTime', 'size'].includes(sortConfig.field) ? sortConfig.field : DEFAULT_SORT_CONFIG.field,
  order: normalizeOrder(sortConfig.order)
})

export const sortImageEntries = (entries = [], sortConfig = DEFAULT_SORT_CONFIG) => {
  const config = normalizeSortConfig(sortConfig)
  const compare = config.field === 'name'
    ? compareName
    : (left, right) => compareNumber(left, right, config.field) || compareName(left, right)
  return dedupeImageEntries(entries)
    .slice()
    .sort((left, right) => {
      const result = compare(left, right) || comparePath(left, right)
      return config.order === 'desc' ? -result : result
    })
}

const pairImageEntriesInScope = (
  leftEntries = [],
  rightEntries = [],
  leftSort = DEFAULT_SORT_CONFIG,
  rightSort = DEFAULT_SORT_CONFIG
) => {
  const leftSorted = sortImageEntries(leftEntries, leftSort)
  const rightSorted = sortImageEntries(rightEntries, rightSort)
  const rightQueues = rightSorted.reduce((map, entry, index) => {
    const key = normalizeBaseName(entry.name)
    map[key] = map[key] || []
    map[key].push(index)
    return map
  }, {})
  const matchedRight = new Set()
  const nameMatches = leftSorted.map((left) => {
    const key = normalizeBaseName(left.name)
    const queue = rightQueues[key] || []
    const rightIndex = queue.find((index) => !matchedRight.has(index))
    if (rightIndex === undefined) {
      return null
    }
    matchedRight.add(rightIndex)
    return rightSorted[rightIndex]
  })
  applyCompositeMatches(leftSorted, rightSorted, nameMatches, matchedRight)
  const remainingLeft = []
  const remainingRight = []
  nameMatches.forEach((right, index) => {
    if (!right) {
      remainingLeft.push(index)
    }
  })
  rightSorted.forEach((entry, index) => {
    if (!matchedRight.has(index)) {
      remainingRight.push(entry)
    }
  })
  const rows = leftSorted
    .map((left, index) => {
      if (nameMatches[index]) {
        return createRow(left, nameMatches[index])
      }
      const nextRight = remainingRight[remainingLeft.indexOf(index)] || null
      return createRow(left, nextRight)
    })
    .concat(remainingRight.slice(remainingLeft.length).map((right) => createRow(null, right)))
  return sortRowsByLogicalName(rows, leftSort, rightSort, leftSorted, rightSorted)
}

const groupEntriesBySource = (entries = [], sortConfig = DEFAULT_SORT_CONFIG) => {
  return sortImageEntries(entries, sortConfig).reduce((groups, entry) => {
    if (!Number.isInteger(entry.sourceIndex)) {
      return groups
    }
    groups[entry.sourceIndex] = groups[entry.sourceIndex] || []
    groups[entry.sourceIndex].push(entry)
    return groups
  }, {})
}

export const pairImageEntries = (
  leftEntries = [],
  rightEntries = [],
  leftSort = DEFAULT_SORT_CONFIG,
  rightSort = DEFAULT_SORT_CONFIG
) => {
  const hasSourceOrder = leftEntries.concat(rightEntries).some((entry) => Number.isInteger(entry?.sourceIndex))
  if (!hasSourceOrder) {
    return pairImageEntriesInScope(leftEntries, rightEntries, leftSort, rightSort)
  }
  const leftGroups = groupEntriesBySource(leftEntries, leftSort)
  const rightGroups = groupEntriesBySource(rightEntries, rightSort)
  const sourceCount = Math.max(Object.keys(leftGroups).length ? Math.max(...Object.keys(leftGroups)) + 1 : 0,
    Object.keys(rightGroups).length ? Math.max(...Object.keys(rightGroups)) + 1 : 0)
  return Array.from({ length: sourceCount }, (_, sourceIndex) => pairImageEntriesInScope(
    leftGroups[sourceIndex] || [],
    rightGroups[sourceIndex] || [],
    leftSort,
    rightSort
  )).flat()
}

export const relocateCurrentRowIndex = (rows = [], currentRow = null, fallbackIndex = 0) => {
  if (!rows.length) {
    return 0
  }
  const leftPath = currentRow && currentRow.left ? currentRow.left.path : ''
  const rightPath = currentRow && currentRow.right ? currentRow.right.path : ''
  const matchIndex = rows.findIndex((row) => row.id === toLookupKey(leftPath, rightPath))
  if (matchIndex > -1) {
    return matchIndex
  }
  return Math.min(Math.max(fallbackIndex, 0), rows.length - 1)
}

export const findPreviousRowImage = (rows = [], rowIndex = 0, side = 'left') => {
  for (let index = rowIndex - 1; index >= 0; index -= 1) {
    const image = rows[index] && rows[index][side]
    if (image) {
      return image
    }
  }
  return null
}

export const rebuildCompareTask = (task = {}) => {
  const leftSort = normalizeSortConfig(task.leftSort)
  const rightSort = normalizeSortConfig(task.rightSort)
  const leftItems = dedupeImageEntries(task.leftItems)
  const rightItems = dedupeImageEntries(task.rightItems)
  const leftSources = task.sources && task.sources.left
  const rightSources = task.sources && task.sources.right
  const showFolderName = getSourceFolderCount(leftSources) > 1 || getSourceFolderCount(rightSources) > 1
  const rows = pairImageEntries(leftItems, rightItems, leftSort, rightSort).map((row) => ({
    ...row,
    left: withDisplayName(row.left, showFolderName),
    right: withDisplayName(row.right, showFolderName)
  }))
  const currentRow = (task.rows || [])[task.currentIndex] || null
  return {
    ...task,
    leftItems,
    rightItems,
    leftSort,
    rightSort,
    rows,
    currentIndex: relocateCurrentRowIndex(rows, currentRow, task.currentIndex || 0),
    mode: COMPARE_MODES.includes(task.mode) ? task.mode : DEFAULT_COMPARE_MODE
  }
}

export const swapCompareTaskSides = (task = {}) => rebuildCompareTask({
  ...task,
  sources: {
    left: task.sources && task.sources.right ? task.sources.right : [],
    right: task.sources && task.sources.left ? task.sources.left : []
  },
  leftItems: task.rightItems || [],
  rightItems: task.leftItems || [],
  leftSort: task.rightSort || DEFAULT_SORT_CONFIG,
  rightSort: task.leftSort || DEFAULT_SORT_CONFIG
})
