import assert from 'assert'
import {
  buildDiffMask,
  buildSideDiffMasks,
  getDiffCanvasSize,
  MAX_DIFF_DIMENSION,
  normalizeDiffTolerance
} from './imageDiff.js'

const pixels = (...values) => new Uint8ClampedArray(values.flat())

{
  const { data, count } = buildDiffMask(
    pixels([10, 20, 30, 255], [40, 50, 60, 255]),
    pixels([10, 20, 30, 255], [40, 50, 60, 255]),
    2,
    1
  )
  assert.strictEqual(count, 0)
  assert.deepStrictEqual([...data], [0, 0, 0, 0, 0, 0, 0, 0])
}

{
  const { data, count } = buildDiffMask(
    pixels([10, 20, 30, 255], [100, 100, 100, 255]),
    pixels([18, 28, 38, 255], [109, 109, 109, 255]),
    2,
    1,
    8
  )
  assert.strictEqual(count, 1)
  assert.deepStrictEqual([...data.slice(4)], [255, 77, 94, 255])
}

{
  const { count } = buildDiffMask(
    pixels([0, 0, 0, 0], [100, 100, 100, 0]),
    pixels([0, 0, 0, 0], [200, 200, 200, 255]),
    2,
    1,
    255
  )
  assert.strictEqual(count, 0)
}

{
  const { count } = buildDiffMask(
    pixels([0, 0, 0, 0], [255, 0, 0, 200]),
    pixels([0, 0, 0, 255], [0, 255, 0, 255]),
    2,
    1,
    8
  )
  assert.strictEqual(count, 2)
}

{
  const size = getDiffCanvasSize(8000, 4000, 6000, 3000)
  assert.strictEqual(size.width, MAX_DIFF_DIMENSION)
  assert.strictEqual(size.height, 2048)
  assert.strictEqual(size.scaled, true)
}

{
  const size = getDiffCanvasSize(1200, 800, 1200, 800)
  assert.deepStrictEqual(size, { width: 1200, height: 800, scaled: false })
}

assert.strictEqual(normalizeDiffTolerance(-4), 0)
assert.strictEqual(normalizeDiffTolerance(300), 255)
assert.strictEqual(normalizeDiffTolerance('12'), 12)

{
  const { left, right, count } = buildSideDiffMasks(
    pixels([10, 20, 30, 255], [100, 100, 100, 255]),
    pixels([10, 20, 30, 255], [200, 150, 50, 255]),
    2,
    1,
    8
  )
  assert.strictEqual(count, 1)
  assert.deepStrictEqual([...left], [0, 0, 0, 0, 255, 77, 94, 255])
  assert.deepStrictEqual([...right], [0, 0, 0, 0, 255, 77, 94, 255])
}

{
  const { left, right } = buildSideDiffMasks(
    pixels([10, 20, 30, 255], [100, 100, 100, 255]),
    pixels([10, 20, 30, 255], [200, 150, 50, 255]),
    2,
    1,
    8,
    0.2
  )
  assert.deepStrictEqual([...left], [18, 18, 18, 51, 255, 77, 94, 255])
  assert.deepStrictEqual([...right], [18, 18, 18, 51, 255, 77, 94, 255])
}

console.log('imageDiff.check: ok')
