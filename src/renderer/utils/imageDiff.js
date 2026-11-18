export const DEFAULT_DIFF_TOLERANCE = 8
export const MAX_DIFF_DIMENSION = 4096
export const DIFF_HIGHLIGHT_RGB = Object.freeze([255, 77, 94])
export const DIFF_BACKGROUND_OPACITY = 0.2

const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(Number(value) || 0)))

export const normalizeDiffTolerance = (value) => clampChannel(value)

const isChangedPixel = (leftPixels, rightPixels, offset, threshold) => {
  const leftAlpha = leftPixels[offset + 3]
  const rightAlpha = rightPixels[offset + 3]
  if (leftAlpha === 0 && rightAlpha === 0) {
    return false
  }
  if (leftAlpha === 0 || rightAlpha === 0) {
    return Math.abs(leftAlpha - rightAlpha) > threshold
  }
  return Math.abs(leftPixels[offset] - rightPixels[offset]) > threshold
    || Math.abs(leftPixels[offset + 1] - rightPixels[offset + 1]) > threshold
    || Math.abs(leftPixels[offset + 2] - rightPixels[offset + 2]) > threshold
    || Math.abs(leftAlpha - rightAlpha) > threshold
}

export const getDiffCanvasSize = (
  leftWidth,
  leftHeight,
  rightWidth,
  rightHeight,
  maxDimension = MAX_DIFF_DIMENSION
) => {
  const sourceWidth = Math.max(1, Math.round(Math.max(leftWidth, rightWidth) || 1))
  const sourceHeight = Math.max(1, Math.round(Math.max(leftHeight, rightHeight) || 1))
  const limit = Math.max(1, Math.round(Number(maxDimension) || MAX_DIFF_DIMENSION))
  const scale = Math.min(1, limit / Math.max(sourceWidth, sourceHeight))
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
    scaled: scale < 1
  }
}

export const buildDiffMask = (leftPixels, rightPixels, width, height, tolerance = DEFAULT_DIFF_TOLERANCE) => {
  const pixelCount = Math.max(0, width * height)
  const data = new Uint8ClampedArray(pixelCount * 4)
  const threshold = normalizeDiffTolerance(tolerance)
  const [red, green, blue] = DIFF_HIGHLIGHT_RGB
  let count = 0

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4
    if (isChangedPixel(leftPixels, rightPixels, offset, threshold)) {
      data[offset] = red
      data[offset + 1] = green
      data[offset + 2] = blue
      data[offset + 3] = 255
      count += 1
    }
  }

  return { data, count }
}

export const buildSideDiffMasks = (
  leftPixels,
  rightPixels,
  width,
  height,
  tolerance = DEFAULT_DIFF_TOLERANCE,
  backgroundOpacity = 0
) => {
  const pixelCount = Math.max(0, width * height)
  const leftData = new Uint8ClampedArray(pixelCount * 4)
  const rightData = new Uint8ClampedArray(pixelCount * 4)
  const threshold = normalizeDiffTolerance(tolerance)
  const backgroundAlpha = Math.round(Math.max(0, Math.min(1, Number(backgroundOpacity) || 0)) * 255)
  const [red, green, blue] = DIFF_HIGHLIGHT_RGB
  let count = 0

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4
    if (isChangedPixel(leftPixels, rightPixels, offset, threshold)) {
      leftData[offset] = red
      leftData[offset + 1] = green
      leftData[offset + 2] = blue
      leftData[offset + 3] = 255
      rightData[offset] = red
      rightData[offset + 1] = green
      rightData[offset + 2] = blue
      rightData[offset + 3] = 255
      count += 1
      continue
    }
    if (backgroundAlpha === 0) {
      continue
    }
    const leftAlpha = Math.round(leftPixels[offset + 3] * backgroundAlpha / 255)
    const rightAlpha = Math.round(rightPixels[offset + 3] * backgroundAlpha / 255)
    const leftGray = Math.round(
      leftPixels[offset] * 0.299 + leftPixels[offset + 1] * 0.587 + leftPixels[offset + 2] * 0.114
    )
    const rightGray = Math.round(
      rightPixels[offset] * 0.299 + rightPixels[offset + 1] * 0.587 + rightPixels[offset + 2] * 0.114
    )
    leftData[offset] = leftGray
    leftData[offset + 1] = leftGray
    leftData[offset + 2] = leftGray
    leftData[offset + 3] = leftAlpha
    rightData[offset] = rightGray
    rightData[offset + 1] = rightGray
    rightData[offset + 2] = rightGray
    rightData[offset + 3] = rightAlpha
  }

  return { left: leftData, right: rightData, count }
}
