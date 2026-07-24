import assert from 'assert'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import {
  dedupeImageEntries,
  filterDirectChildImageEntries,
  pairImageEntries,
  rebuildCompareTask,
  relocateCurrentRowIndex,
  swapCompareTaskSides
} from './imagePairing.js'
import {
  hasItemPathSetChanged,
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
  { path: '/left/direct.png', name: 'direct.png', lastModifyTime: 2, size: 20, isFile: true },
  { path: '/left/nested/child.png', name: 'child.png', lastModifyTime: 3, size: 30, isFile: true },
  { path: '/left/notes.txt', name: 'notes.txt', lastModifyTime: 4, size: 40, isFile: true },
  { path: '/left/folder', name: 'folder', lastModifyTime: 5, size: 50, isFile: false },
  { name: 'missing-path.png', lastModifyTime: 6, size: 60, isFile: true },
  null
], '/left')

assert.deepStrictEqual(ingested.map((item) => item.path), ['/left/direct.png'])

const rows = pairImageEntries(
  leftItems,
  rightItems,
  { field: 'name', order: 'asc' },
  { field: 'name', order: 'asc' }
)

assert.deepStrictEqual(rows.map((row) => [row.left && row.left.path, row.right && row.right.path]), [
  ['/left/a-1.JPG', '/right/A-1.webp'],
  ['/left/B-02.png', '/right/b-02.jpeg'],
  ['/left/extra.png', '/right/extra-2.png'],
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

const runSourceChecks = async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'megspot-image-sources-'))
  const folderPath = path.join(tmpRoot, 'folder')
  const nestedPath = path.join(folderPath, 'nested')
  const imagePath = path.join(folderPath, 'direct.png')
  const nestedImagePath = path.join(nestedPath, 'child.png')
  const txtPath = path.join(folderPath, 'notes.txt')
  const singleImagePath = path.join(tmpRoot, 'single.jpg')
  try {
    await fs.ensureDir(nestedPath)
    await Promise.all([
      fs.writeFile(imagePath, 'png'),
      fs.writeFile(nestedImagePath, 'png'),
      fs.writeFile(txtPath, 'txt'),
      fs.writeFile(singleImagePath, 'jpg')
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
    const rebuiltSources = await rebuildItemsFromSources(ingestedSources.sources)
    assert.deepStrictEqual(rebuiltSources.sources, [
      { path: folderPath, type: 'folder' }
    ])
    assert.deepStrictEqual(rebuiltSources.items.map((item) => item.path), [imagePath])
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
    const freshScan = await inspectImageSourceFreshness(
      ingestedSources.sources,
      [{ path: imagePath, lastModifyTime: 999 }]
    )
    assert.strictEqual(freshScan.stale, false)
    assert.deepStrictEqual(freshScan.scan.items.map((item) => item.path), [imagePath])
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
