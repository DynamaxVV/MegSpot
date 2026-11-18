import fse from 'fs-extra'
import { decode, decodeImage, toRGBA8 } from 'utif2'
import { getImageUrlSyncNoCache } from './image'
import {
  DIFF_BACKGROUND_OPACITY,
  DEFAULT_DIFF_TOLERANCE,
  MAX_DIFF_DIMENSION,
  buildSideDiffMasks,
  getDiffCanvasSize
} from './imageDiff'
import {
  PSD_DECODE_PURPOSE,
  isPsdPath,
  loadPsdImageElement
} from './psdLoader'

const loadBrowserImage = (filePath) => new Promise((resolve, reject) => {
  const image = new Image()
  const timeout = setTimeout(() => reject(new Error('diff_image_load_timeout')), 15000)
  image.onload = () => {
    clearTimeout(timeout)
    resolve(image)
  }
  image.onerror = () => {
    clearTimeout(timeout)
    reject(new Error('diff_image_load_failed'))
  }
  image.src = getImageUrlSyncNoCache(filePath)
})

const loadTiffImage = async (filePath) => {
  const file = await fse.readFile(filePath)
  const ifds = decode(file.buffer)
  if (!ifds.length) {
    throw new Error('diff_tiff_decode_failed')
  }
  const ifd = ifds[0]
  decodeImage(file, ifd)
  const imageData = toRGBA8(ifd)
  const canvas = document.createElement('canvas')
  canvas.width = ifd.width
  canvas.height = ifd.height
  canvas.getContext('2d').putImageData(
    new ImageData(new Uint8ClampedArray(imageData), ifd.width, ifd.height, { colorSpace: 'srgb' }),
    0,
    0
  )
  return {
    source: canvas,
    width: ifd.width,
    height: ifd.height,
    dispose() {
      canvas.width = 0
      canvas.height = 0
    }
  }
}

export const loadDiffImage = async (filePath, maxDimension = MAX_DIFF_DIMENSION) => {
  if (isPsdPath(filePath)) {
    const loaded = await loadPsdImageElement(filePath, {
      purpose: PSD_DECODE_PURPOSE.display,
      maxDimension
    })
    return {
      source: loaded.image,
      width: loaded.width,
      height: loaded.height,
      dispose() {
        loaded.dispose()
      }
    }
  }
  if (/tiff?$/i.test(String(filePath))) {
    return loadTiffImage(filePath)
  }
  const image = await loadBrowserImage(filePath)
  return {
    source: image,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    dispose() {
      image.src = ''
    }
  }
}

export const computeDiffPreview = async (leftPath, rightPath, maxDimension = MAX_DIFF_DIMENSION) => {
  const [left, right] = await Promise.all([
    loadDiffImage(leftPath, maxDimension),
    loadDiffImage(rightPath, maxDimension)
  ])
  let leftCanvas = null
  let rightCanvas = null

  try {
    const size = getDiffCanvasSize(left.width, left.height, right.width, right.height, maxDimension)
    leftCanvas = document.createElement('canvas')
    rightCanvas = document.createElement('canvas')
    leftCanvas.width = size.width
    leftCanvas.height = size.height
    rightCanvas.width = size.width
    rightCanvas.height = size.height

    const leftContext = leftCanvas.getContext('2d', { willReadFrequently: true })
    const rightContext = rightCanvas.getContext('2d', { willReadFrequently: true })
    leftContext.drawImage(left.source, 0, 0, size.width, size.height)
    rightContext.drawImage(right.source, 0, 0, size.width, size.height)
    const leftPixels = leftContext.getImageData(0, 0, size.width, size.height).data
    const rightPixels = rightContext.getImageData(0, 0, size.width, size.height).data
    const { left: leftDiffData, right: rightDiffData, count } = buildSideDiffMasks(
      leftPixels,
      rightPixels,
      size.width,
      size.height,
      DEFAULT_DIFF_TOLERANCE,
      DIFF_BACKGROUND_OPACITY
    )

    const makeCanvas = (data) => {
      const canvas = document.createElement('canvas')
      canvas.width = size.width
      canvas.height = size.height
      const context = canvas.getContext('2d')
      const imageData = context.createImageData(size.width, size.height)
      imageData.data.set(data)
      context.putImageData(imageData, 0, 0)
      return canvas
    }

    return {
      leftCanvas: makeCanvas(leftDiffData),
      rightCanvas: makeCanvas(rightDiffData),
      count,
      width: size.width,
      height: size.height,
      scaled: size.scaled,
      sizeMismatch: left.width !== right.width || left.height !== right.height
    }
  } finally {
    left.dispose()
    right.dispose()
    if (leftCanvas) {
      leftCanvas.width = 0
      leftCanvas.height = 0
    }
    if (rightCanvas) {
      rightCanvas.width = 0
      rightCanvas.height = 0
    }
  }
}
