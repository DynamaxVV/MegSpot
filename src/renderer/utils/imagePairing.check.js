import assert from 'assert'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import {
  dedupeImageEntries,
  filterDirectChildImageEntries,
  findPreviousRowImage,
  isMatchInOrderForIndex,
  normalizeMatchInOrder,
  pairImageEntries,
  rebuildCompareTask,
  relocateCurrentRowIndex,
  swapCompareTaskSides
} from './imagePairing.js'
import {
  hasItemPathSetChanged,
  hasTranslationSetChanged,
  ingestImageSources,
  inspectImageSourceFreshness,
  rebuildItemsFromSources,
  toAbsoluteItemPathSet
} from './imageComparisonSources.js'

const leftItems = [
  { path: '/left/B-02.png', name: 'B-02.png', lastModifyTime: 30, size: 400 },
  { path: '/left/a-1.JPG', name: 'a-1.JPG', lastModifyTime: 10, size: 300 },
  { path: '/left/extra.png', name: 'extra.png', lastModifyTime: 20, size: 200 },
  { path: '/left/a-1.JPG', name: 'a-1.JPG', lastModifyTime: 999, size: 999 }
]

const rightItems = [
  { path: '/right/extra-2.png', name: 'extra-2.png', lastModifyTime: 5, size: 500 },
  { path: '/right/A-1.webp', name: 'A-1.webp', lastModifyTime: 15, size: 100 },
  { path: '/right/b-02.jpeg', name: 'b-02.jpeg', lastModifyTime: 25, size: 600 },
  { path: '/right/right-only.png', name: 'right-only.png', lastModifyTime: 35, size: 700 }
]

const deduped = dedupeImageEntries(leftItems)
assert.deepStrictEqual(deduped.map((item) => item.path), [
  '/left/B-02.png',
  '/left/a-1.JPG',
  '/left/extra.png'
])

const ingested = filterDirectChildImageEntries([
  { path: '/left/direct.png', name: 'direct.png', lastModifyTime: 1, size: 10, isFile: true },
  { path: '/left/design.PSD', name: 'design.PSD', lastModifyTime: 1, size: 11, isFile: true },
  { path: '/left/direct.png', name: 'direct.png', lastModifyTime: 2, size: 20, isFile: true },
  { path: '/left/nested/child.png', name: 'child.png', lastModifyTime: 3, size: 30, isFile: true },
  { path: '/left/notes.txt', name: 'notes.txt', lastModifyTime: 4, size: 40, isFile: true },
  { path: '/left/folder', name: 'folder', lastModifyTime: 5, size: 50, isFile: false },
  { name: 'missing-path.png', lastModifyTime: 6, size: 60, isFile: true },
  null
], '/left')

assert.deepStrictEqual(ingested.map((item) => item.path), ['/left/direct.png', '/left/design.PSD'])

const rows = pairImageEntries(
  leftItems,
  rightItems,
  { field: 'name', order: 'asc' },
  { field: 'name', order: 'asc' }
)

const copiedNameRows = pairImageEntries(
  [{ path: '/left/01.jpg', name: '01.jpg' }],
  [{ path: '/right/01-copy.jpg', name: '01 拷贝.jpg' }]
)
assert.strictEqual(copiedNameRows[0].left.path, '/left/01.jpg')
assert.strictEqual(copiedNameRows[0].right.path, '/right/01-copy.jpg')

const compositeRows = pairImageEntries(
  [
    { path: '/left/091.jpeg', name: '091.jpeg' },
    { path: '/left/092+093.jpeg', name: '092+093.jpeg' },
    { path: '/left/094.jpeg', name: '094.jpeg' }
  ],
  [
    { path: '/right/091.jpeg', name: '091.jpeg' },
    { path: '/right/092.jpeg', name: '092.jpeg' },
    { path: '/right/093.jpeg', name: '093.jpeg' },
    { path: '/right/094.jpeg', name: '094.jpeg' }
  ]
)
assert.deepStrictEqual(compositeRows.map((row) => [row.left && row.left.name, row.right && row.right.name]), [
  ['091.jpeg', '091.jpeg'],
  ['092+093.jpeg', '092.jpeg'],
  [null, '093.jpeg'],
  ['094.jpeg', '094.jpeg']
])

const reversedCompositeRows = pairImageEntries(
  [
    { path: '/left/091.jpeg', name: '091.jpeg' },
    { path: '/left/092.jpeg', name: '092.jpeg' },
    { path: '/left/093.jpeg', name: '093.jpeg' },
    { path: '/left/094.jpeg', name: '094.jpeg' }
  ],
  [
    { path: '/right/091.jpeg', name: '091.jpeg' },
    { path: '/right/092+093.jpeg', name: '092+093.jpeg' },
    { path: '/right/094.jpeg', name: '094.jpeg' }
  ]
)
assert.deepStrictEqual(reversedCompositeRows.map((row) => [row.left && row.left.name, row.right && row.right.name]), [
  ['091.jpeg', '091.jpeg'],
  ['092.jpeg', '092+093.jpeg'],
  ['093.jpeg', null],
  ['094.jpeg', '094.jpeg']
])

const hyphenCompositeRows = pairImageEntries(
  [
    { path: '/left/05.png', name: '05.png' },
    { path: '/left/06-07.png', name: '06-07.png' },
    { path: '/left/08.png', name: '08.png' }
  ],
  [
    { path: '/right/05.png', name: '05.png' },
    { path: '/right/06.png', name: '06.png' },
    { path: '/right/07.png', name: '07.png' },
    { path: '/right/08.png', name: '08.png' }
  ]
)
assert.deepStrictEqual(hyphenCompositeRows.map((row) => [row.left && row.left.name, row.right && row.right.name]), [
  ['05.png', '05.png'],
  ['06-07.png', '06.png'],
  [null, '07.png'],
  ['08.png', '08.png']
])

const reversedHyphenCompositeRows = pairImageEntries(
  [
    { path: '/left/05.png', name: '05.png' },
    { path: '/left/06.png', name: '06.png' },
    { path: '/left/07.png', name: '07.png' },
    { path: '/left/08.png', name: '08.png' }
  ],
  [
    { path: '/right/05.png', name: '05.png' },
    { path: '/right/06-07.png', name: '06-07.png' },
    { path: '/right/08.png', name: '08.png' }
  ]
)
assert.deepStrictEqual(reversedHyphenCompositeRows.map((row) => [row.left && row.left.name, row.right && row.right.name]), [
  ['05.png', '05.png'],
  ['06.png', '06-07.png'],
  ['07.png', null],
  ['08.png', '08.png']
])

const unpaddedHyphenCompositeRows = pairImageEntries(
  [
    { path: '/left/5.png', name: '5.png' },
    { path: '/left/6-7.png', name: '6-7.png' },
    { path: '/left/8.png', name: '8.png' }
  ],
  [
    { path: '/right/5.png', name: '5.png' },
    { path: '/right/6.png', name: '6.png' },
    { path: '/right/7.png', name: '7.png' },
    { path: '/right/8.png', name: '8.png' }
  ]
)
assert.deepStrictEqual(unpaddedHyphenCompositeRows.map((row) => [row.left && row.left.name, row.right && row.right.name]), [
  ['5.png', '5.png'],
  ['6-7.png', '6.png'],
  [null, '7.png'],
  ['8.png', '8.png']
])

const unpaddedPlusCompositeRows = pairImageEntries(
  [
    { path: '/left/5.png', name: '5.png' },
    { path: '/left/6+7.png', name: '6+7.png' },
    { path: '/left/8.png', name: '8.png' }
  ],
  [
    { path: '/right/5.png', name: '5.png' },
    { path: '/right/6.png', name: '6.png' },
    { path: '/right/7.png', name: '7.png' },
    { path: '/right/8.png', name: '8.png' }
  ]
)
assert.deepStrictEqual(unpaddedPlusCompositeRows.map((row) => [row.left && row.left.name, row.right && row.right.name]), [
  ['5.png', '5.png'],
  ['6+7.png', '6.png'],
  [null, '7.png'],
  ['8.png', '8.png']
])

const unmatchedCompositeRows = pairImageEntries(
  [
    { path: '/left/05.png', name: '05.png' },
    { path: '/left/08.png', name: '08.png' }
  ],
  [
    { path: '/right/05.png', name: '05.png' },
    { path: '/right/6-7.png', name: '6-7.png' },
    { path: '/right/08.png', name: '08.png' }
  ]
)
assert.deepStrictEqual(unmatchedCompositeRows.map((row) => [row.left && row.left.name, row.right && row.right.name]), [
  ['05.png', '05.png'],
  [null, '6-7.png'],
  ['08.png', '08.png']
])

assert.deepStrictEqual(rows.map((row) => [row.left && row.left.path, row.right && row.right.path]), [
  ['/left/a-1.JPG', '/right/A-1.webp'],
  ['/left/B-02.png', '/right/b-02.jpeg'],
  ['/left/extra.png', null],
  [null, '/right/extra-2.png'],
  [null, '/right/right-only.png']
])

const sourceScopedRows = pairImageEntries(
  [
    { path: '/left/folder-1/a.png', name: 'a.png', sourceIndex: 0 },
    { path: '/left/folder-2/b.png', name: 'b.png', sourceIndex: 1 }
  ],
  [
    { path: '/right/folder-1/a.png', name: 'a.png', sourceIndex: 0 },
    { path: '/right/folder-3/b.png', name: 'b.png', sourceIndex: 2 }
  ]
)

assert.deepStrictEqual(sourceScopedRows.map((row) => [row.left && row.left.path, row.right && row.right.path]), [
  ['/left/folder-1/a.png', '/right/folder-1/a.png'],
  ['/left/folder-2/b.png', null],
  [null, '/right/folder-3/b.png']
])

assert.strictEqual(findPreviousRowImage(sourceScopedRows, 2, 'left').path, '/left/folder-2/b.png')
assert.strictEqual(findPreviousRowImage(sourceScopedRows, 0, 'right'), null)

const positionalImageRows = pairImageEntries(
  [
    { path: '/left/cover-a.png', name: 'cover-a.png', sourceIndex: 0 },
    { path: '/left/folder-1/page-01.png', name: 'page-01.png', sourceIndex: 1 }
  ],
  [
    { path: '/right/cover-b.png', name: 'cover-b.png', sourceIndex: 0 },
    { path: '/right/folder-1/page-01.png', name: 'page-01.png', sourceIndex: 1 }
  ],
  { field: 'name', order: 'asc' },
  { field: 'name', order: 'asc' },
  [
    { path: '/left/cover-a.png', type: 'file' },
    { path: '/left/folder-1', type: 'folder' }
  ],
  [
    { path: '/right/cover-b.png', type: 'file' },
    { path: '/right/folder-1', type: 'folder' }
  ]
)
assert.deepStrictEqual(positionalImageRows.map((row) => [row.left && row.left.path, row.right && row.right.path]), [
  ['/left/cover-a.png', '/right/cover-b.png'],
  ['/left/folder-1/page-01.png', '/right/folder-1/page-01.png']
])

const lpRows = pairImageEntries(
  [
    { path: '/left/group-1/002.jpg', name: '002.jpg', sourceIndex: 0 },
    { path: '/left/group-1/999.jpg', name: '999.jpg', sourceIndex: 0 },
    { path: '/left/group-1/extra.png', name: 'extra.png', sourceIndex: 0 },
    { path: '/left/group-2/001.jpg', name: '001.jpg', sourceIndex: 1 }
  ],
  [
    { path: '/right/group-1/001 拷贝.png', name: '001 拷贝.png', sourceIndex: 0 },
    { path: '/right/group-2/001.jpg', name: '001.jpg', sourceIndex: 1 }
  ],
  { field: 'name', order: 'asc' },
  { field: 'name', order: 'asc' },
  [
    { path: '/left/group-1', type: 'folder', translation: { imageOrder: ['001.jpg', '002.jpg'] } },
    { path: '/left/group-2', type: 'folder' }
  ],
  [
    { path: '/right/group-1', type: 'folder' },
    { path: '/right/group-2', type: 'folder' }
  ]
)
assert.deepStrictEqual(lpRows.map((row) => [row.left && row.left.path, row.right && row.right.path]), [
  [null, '/right/group-1/001 拷贝.png'],
  ['/left/group-1/002.jpg', null],
  ['/left/group-1/999.jpg', null],
  ['/left/group-1/extra.png', null],
  ['/left/group-2/001.jpg', '/right/group-2/001.jpg']
])

const rightBaselineLpRows = pairImageEntries(
  [
    { path: '/left/001.jpg', name: '001.jpg', sourceIndex: 0 },
    { path: '/left/002.jpg', name: '002.jpg', sourceIndex: 0 }
  ],
  [
    { path: '/right/002.jpg', name: '002.jpg', sourceIndex: 0 },
    { path: '/right/001.jpg', name: '001.jpg', sourceIndex: 0 }
  ],
  { field: 'name', order: 'asc' },
  { field: 'name', order: 'asc' },
  [{ path: '/left', type: 'folder' }],
  [{ path: '/right', type: 'folder', translation: { imageOrder: ['002.jpg', '001.jpg'] } }],
  'right'
)
assert.deepStrictEqual(rightBaselineLpRows.map((row) => row.right && row.right.name), ['002.jpg', '001.jpg'])

const rebuilt = rebuildCompareTask({
  leftItems,
  rightItems,
  leftSort: { field: 'name', order: 'asc' },
  rightSort: { field: 'name', order: 'asc' },
  rows,
  currentIndex: 1,
  mode: 'split'
})

const displayNamed = rebuildCompareTask({
  sources: {
    left: [
      { path: '/left/folder-1', type: 'folder' },
      { path: '/left/folder-2', type: 'folder' }
    ],
    right: [{ path: '/right/folder-1', type: 'folder' }]
  },
  leftItems: [{ path: '/left/folder-2/a.png', name: 'a.png', sourceIndex: 1 }],
  rightItems: [{ path: '/right/folder-1/a.png', name: 'a.png', sourceIndex: 0 }]
})

assert.deepStrictEqual(displayNamed.rows.map((row) => [
  row.left && row.left.displayName,
  row.right && row.right.displayName
]), [
  [null, 'folder-1/a.png'],
  ['folder-2/a.png', null]
])

assert.strictEqual(rebuilt.currentIndex, 1)
assert.strictEqual(rebuildCompareTask({ mode: 'single' }).mode, 'single')
assert.strictEqual(
  relocateCurrentRowIndex(rebuilt.rows, rebuilt.rows[1], 0),
  1
)
assert.strictEqual(
  relocateCurrentRowIndex(rebuilt.rows.slice(1), rebuilt.rows[0], 0),
  0
)

const swapped = swapCompareTaskSides({
  sources: {
    left: [{ kind: 'folder', path: '/left' }],
    right: [{ kind: 'folder', path: '/right' }]
  },
  leftItems,
  rightItems,
  leftSort: { field: 'name', order: 'asc' },
  rightSort: { field: 'size', order: 'desc' },
  rows,
  currentIndex: 2
})

assert.deepStrictEqual(swapped.sources, {
  left: [{ kind: 'folder', path: '/right' }],
  right: [{ kind: 'folder', path: '/left' }]
})
assert.strictEqual(swapped.leftSort.field, 'size')
assert.strictEqual(swapped.rightSort.field, 'name')
assert.strictEqual(swapped.rows[0].left.path, '/right/right-only.png')

// matchInOrder tests
const inOrderLeft = [
  { path: '/left/c.png', name: 'c.png' },
  { path: '/left/a.png', name: 'a.png' },
  { path: '/left/b.png', name: 'b.png' }
]
const inOrderRight = [
  { path: '/right/03.jpg', name: '03.jpg' },
  { path: '/right/01.jpg', name: '01.jpg' },
  { path: '/right/02.jpg', name: '02.jpg' }
]

const normalMatchRows = pairImageEntries(
  inOrderLeft,
  inOrderRight,
  { field: 'name', order: 'asc' },
  { field: 'name', order: 'asc' },
  [],
  [],
  'left',
  false
)
// Without matchInOrder, completely different names do not match
assert.strictEqual(normalMatchRows.length, 6)

const sequentialRows = pairImageEntries(
  inOrderLeft,
  inOrderRight,
  { field: 'name', order: 'asc' },
  { field: 'name', order: 'asc' },
  [],
  [],
  'left',
  true
)
// With matchInOrder, items are sorted by name asc and paired 1-to-1 directly
assert.deepStrictEqual(sequentialRows.map((row) => [row.left && row.left.name, row.right && row.right.name]), [
  ['a.png', '01.jpg'],
  ['b.png', '02.jpg'],
  ['c.png', '03.jpg']
])

// Unequal lengths: left has more items
const leftHeavyRows = pairImageEntries(
  inOrderLeft,
  inOrderRight.slice(0, 2),
  { field: 'name', order: 'asc' },
  { field: 'name', order: 'asc' },
  [],
  [],
  'left',
  true
)
assert.deepStrictEqual(leftHeavyRows.map((row) => [row.left && row.left.name, row.right && row.right.name]), [
  ['a.png', '01.jpg'],
  ['b.png', '03.jpg'],
  ['c.png', null]
])

// Unequal lengths: right has more items
const rightHeavyRows = pairImageEntries(
  inOrderLeft.slice(0, 1),
  inOrderRight,
  { field: 'name', order: 'asc' },
  { field: 'name', order: 'asc' },
  [],
  [],
  'left',
  true
)
assert.deepStrictEqual(rightHeavyRows.map((row) => [row.left && row.left.name, row.right && row.right.name]), [
  ['c.png', '01.jpg'],
  [null, '02.jpg'],
  [null, '03.jpg']
])

// rebuildCompareTask with matchInOrder
const rebuiltInOrderTask = rebuildCompareTask({
  leftItems: inOrderLeft,
  rightItems: inOrderRight,
  matchInOrder: true
})
assert.strictEqual(rebuiltInOrderTask.matchInOrder, true)
assert.deepStrictEqual(rebuiltInOrderTask.rows.map((row) => [row.left && row.left.name, row.right && row.right.name]), [
  ['a.png', '01.jpg'],
  ['b.png', '02.jpg'],
  ['c.png', '03.jpg']
])

// swapCompareTaskSides preserves matchInOrder
const swappedInOrderTask = swapCompareTaskSides(rebuiltInOrderTask)
assert.strictEqual(swappedInOrderTask.matchInOrder, true)
assert.deepStrictEqual(swappedInOrderTask.rows.map((row) => [row.left && row.left.name, row.right && row.right.name]), [
  ['01.jpg', 'a.png'],
  ['02.jpg', 'b.png'],
  ['03.jpg', 'c.png']
])

// 1.jpg vs 999.jpg test case (pairing by sequence, not filename identity)
const userCaseLeft = [{ path: '/left/1.jpg', name: '1.jpg' }]
const userCaseRight = [{ path: '/right/999.jpg', name: '999.jpg' }]

const userCaseNormal = pairImageEntries(userCaseLeft, userCaseRight, { field: 'name', order: 'asc' }, { field: 'name', order: 'asc' }, [], [], 'left', false)
assert.strictEqual(userCaseNormal.length, 2)
assert.strictEqual(userCaseNormal[0].left.name, '1.jpg')
assert.strictEqual(userCaseNormal[0].right, null)
assert.strictEqual(userCaseNormal[1].left, null)
assert.strictEqual(userCaseNormal[1].right.name, '999.jpg')

const userCaseInOrder = pairImageEntries(userCaseLeft, userCaseRight, { field: 'name', order: 'asc' }, { field: 'name', order: 'asc' }, [], [], 'left', true)
assert.strictEqual(userCaseInOrder.length, 1)
assert.strictEqual(userCaseInOrder[0].left.name, '1.jpg')
assert.strictEqual(userCaseInOrder[0].right.name, '999.jpg')

// Helper unit checks
assert.strictEqual(isMatchInOrderForIndex(true, 0), true)
assert.strictEqual(isMatchInOrderForIndex(true, 5), true)
assert.strictEqual(isMatchInOrderForIndex(false, 0), false)
assert.strictEqual(isMatchInOrderForIndex({ 0: true, 1: false }, 0), true)
assert.strictEqual(isMatchInOrderForIndex({ 0: true, 1: false }, 1), false)
assert.strictEqual(isMatchInOrderForIndex({ 0: true, 1: false }, 2), false)

assert.deepStrictEqual(normalizeMatchInOrder(true), true)
assert.deepStrictEqual(normalizeMatchInOrder(false), false)
assert.deepStrictEqual(normalizeMatchInOrder({ 0: true, 1: 0 }), { 0: true, 1: false })

// Multi-group independent match test
const multiGroupLeft = [
  { path: '/left1/a.jpg', name: 'a.jpg', sourceIndex: 0 },
  { path: '/left1/b.jpg', name: 'b.jpg', sourceIndex: 0 },
  { path: '/left2/common_1.jpg', name: 'common_1.jpg', sourceIndex: 1 },
  { path: '/left2/common_2.jpg', name: 'common_2.jpg', sourceIndex: 1 }
]
const multiGroupRight = [
  { path: '/right1/1.jpg', name: '1.jpg', sourceIndex: 0 },
  { path: '/right1/2.jpg', name: '2.jpg', sourceIndex: 0 },
  { path: '/right2/common_1.jpg', name: 'common_1.jpg', sourceIndex: 1 },
  { path: '/right2/diff.jpg', name: 'diff.jpg', sourceIndex: 1 }
]

// Group 0 in order (true), Group 1 normal (false)
const multiGroupRows = pairImageEntries(
  multiGroupLeft,
  multiGroupRight,
  { field: 'name', order: 'asc' },
  { field: 'name', order: 'asc' },
  [{ path: '/left1', type: 'folder' }, { path: '/left2', type: 'folder' }],
  [{ path: '/right1', type: 'folder' }, { path: '/right2', type: 'folder' }],
  'left',
  { 0: true, 1: false }
)

// Group 0 should pair in order: a.jpg <-> 1.jpg, b.jpg <-> 2.jpg
assert.strictEqual(multiGroupRows[0].left.name, 'a.jpg')
assert.strictEqual(multiGroupRows[0].right.name, '1.jpg')
assert.strictEqual(multiGroupRows[1].left.name, 'b.jpg')
assert.strictEqual(multiGroupRows[1].right.name, '2.jpg')

// Group 1 should pair by filename: common_1.jpg <-> common_1.jpg, common_2.jpg <-> null, null <-> diff.jpg
assert.strictEqual(multiGroupRows[2].left.name, 'common_1.jpg')
assert.strictEqual(multiGroupRows[2].right.name, 'common_1.jpg')
assert.strictEqual(multiGroupRows[3].left.name, 'common_2.jpg')
assert.strictEqual(multiGroupRows[3].right, null)
assert.strictEqual(multiGroupRows[4].left, null)
assert.strictEqual(multiGroupRows[4].right.name, 'diff.jpg')

const runSourceChecks = async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'megspot-image-sources-'))
  const folderPath = path.join(tmpRoot, 'folder')
  const nestedPath = path.join(folderPath, 'nested')
  const imagePath = path.join(folderPath, 'direct.png')
  const psdPath = path.join(folderPath, 'design.psd')
  const nestedImagePath = path.join(nestedPath, 'child.png')
  const txtPath = path.join(folderPath, 'notes.txt')
  const singleImagePath = path.join(tmpRoot, 'single.jpg')
  const nestedOnlyRoot = path.join(tmpRoot, 'nested-only')
  const nestedOnlyLeaf = path.join(nestedOnlyRoot, 'child', 'leaf')
  try {
    await fs.ensureDir(nestedPath)
    await fs.ensureDir(nestedOnlyLeaf)
    await Promise.all([
      fs.writeFile(imagePath, 'png'),
      fs.writeFile(psdPath, 'not parsed during scan'),
      fs.writeFile(nestedImagePath, 'png'),
      fs.writeFile(txtPath, 'txt'),
      fs.writeFile(singleImagePath, 'jpg'),
      fs.writeFile(path.join(nestedOnlyRoot, '.DS_Store'), '')
    ])
    const nestedOnlySources = await ingestImageSources([nestedOnlyRoot])
    assert.deepStrictEqual(nestedOnlySources.sources, [
      { path: nestedOnlyLeaf, type: 'folder' }
    ])

    const ingestedSources = await ingestImageSources([
      folderPath,
      singleImagePath,
      folderPath,
      txtPath,
      path.join(tmpRoot, 'missing.png'),
      '',
      null
    ])
    assert.deepStrictEqual(ingestedSources.sources, [
      { path: folderPath, type: 'folder' },
      { path: singleImagePath, type: 'file' }
    ])
    assert.deepStrictEqual(ingestedSources.items.map((item) => item.path).sort(), [
      imagePath,
      psdPath,
      singleImagePath
    ].sort())
    assert.deepStrictEqual(ingestedSources.ignored.map((item) => item.reason), [
      'duplicate',
      'invalid-path',
      'invalid-path',
      'unsupported-image',
      'missing'
    ])

    await fs.remove(singleImagePath)
    await fs.writeFile(txtPath,
      '>>>>>>>>[direct.png]<<<<<<<<\n\n>>>>>>>>[missing.png]<<<<<<<<\n')
    const rebuiltSources = await rebuildItemsFromSources(ingestedSources.sources)
    assert.deepStrictEqual(rebuiltSources.sources, [
      {
        path: folderPath,
        type: 'folder',
        translation: {
          path: txtPath,
          lastModifyTime: rebuiltSources.sources[0].translation.lastModifyTime,
          contentHash: rebuiltSources.sources[0].translation.contentHash,
          annotations: {},
          imageOrder: ['direct.png', 'missing.png']
        }
      }
    ])
    assert.deepStrictEqual(rebuiltSources.items.map((item) => item.path).sort(), [imagePath, psdPath].sort())
    assert.deepStrictEqual(rebuiltSources.ignored, [
      { input: singleImagePath, reason: 'missing' }
    ])
    assert.deepStrictEqual(toAbsoluteItemPathSet([
      { path: imagePath },
      { path: imagePath },
      { path: path.join(folderPath, '.', 'direct.png') },
      null
    ]), [imagePath])
assert.strictEqual(hasItemPathSetChanged(
      [{ path: imagePath, lastModifyTime: 1 }],
      [{ path: path.join(folderPath, 'direct.png'), lastModifyTime: 999 }]
    ), false)
    assert.strictEqual(hasItemPathSetChanged(
      [{ path: imagePath }],
      [{ path: singleImagePath }]
), true)
assert.strictEqual(hasTranslationSetChanged(
  [{ translation: { path: txtPath, lastModifyTime: 2, contentHash: 'same' } }],
  [{ translation: { path: txtPath, lastModifyTime: 1, contentHash: 'same' } }]
), false)
assert.strictEqual(hasTranslationSetChanged(
  [{ translation: { path: txtPath, contentHash: 'new' } }],
  [{ translation: { path: txtPath, contentHash: 'old' } }]
), true)
    const freshScan = await inspectImageSourceFreshness(
      ingestedSources.sources,
      [{ path: imagePath, lastModifyTime: 999 }, { path: psdPath, lastModifyTime: 999 }]
    )
    assert.strictEqual(freshScan.stale, false)
    assert.deepStrictEqual(freshScan.scan.items.map((item) => item.path).sort(), [imagePath, psdPath].sort())
    const staleScan = await inspectImageSourceFreshness(
      ingestedSources.sources,
      [{ path: singleImagePath }]
    )
    assert.strictEqual(staleScan.stale, true)
  } finally {
    await fs.remove(tmpRoot)
  }
}

runSourceChecks().then(() => {
  console.log('Run with: BABEL_ENV=main node -r @babel/register src/renderer/utils/imagePairing.check.js')
  console.log('imagePairing.check.js: ok')
}).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
