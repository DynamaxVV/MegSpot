'use strict'

const fs = require('fs')
const { parentPort } = require('worker_threads')
const { initializeCanvas, readPsd } = require('ag-psd')

const MAX_PSD_PIXELS = 100 * 1000 * 1000
const MAX_PSD_DECODE_BYTES = 768 * 1024 * 1024

// ag-psd uses ImageData as its pixel allocation abstraction. The worker only
// needs byte arrays, so do not install a heavyweight node-canvas dependency.
initializeCanvas(
  () => {
    throw new Error('PSD decoder requested a canvas unexpectedly')
  },
  (width, height) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4)
  })
)

const toErrorPayload = (error) => ({
  name: error && error.name ? error.name : 'PsdDecodeError',
  message: error && error.message ? error.message : String(error),
  code: error && error.code ? error.code : 'PSD_DECODE_FAILED'
})

const assertHeader = (buffer) => {
  if (!buffer || buffer.length < 26 || buffer.toString('ascii', 0, 4) !== '8BPS') {
    throw new Error('Invalid PSD signature')
  }

  const version = buffer.readUInt16BE(4)
  const channels = buffer.readUInt16BE(12)
  const height = buffer.readUInt32BE(14)
  const width = buffer.readUInt32BE(18)
  const bitsPerChannel = buffer.readUInt16BE(22)

  if (![1, 2].includes(version)) throw new Error(`Invalid PSD file version: ${version}`)
  if (!width || !height) throw new Error(`Invalid PSD size: ${width}x${height}`)
  if (channels > 16) throw new Error(`Invalid PSD channel count: ${channels}`)
  if (![1, 8, 16, 32].includes(bitsPerChannel)) {
    throw new Error(`Invalid PSD bitsPerChannel: ${bitsPerChannel}`)
  }

  const pixels = width * height
  const bytesPerChannel = Math.max(1, bitsPerChannel / 8)
  const estimatedBytes = pixels * Math.max(4, channels) * bytesPerChannel
  if (pixels > MAX_PSD_PIXELS || estimatedBytes > MAX_PSD_DECODE_BYTES) {
    const error = new Error(`PSD image is too large to decode safely: ${width}x${height}`)
    error.code = 'PSD_TOO_LARGE'
    throw error
  }

  return { width, height, bitsPerChannel }
}

const toRgba8 = (source, width, height) => {
  const size = width * height * 4
  if (source instanceof Uint8ClampedArray && source.byteOffset === 0 && source.byteLength === source.buffer.byteLength) {
    return source
  }

  const result = new Uint8ClampedArray(size)
  if (source instanceof Uint16Array) {
    for (let index = 0; index < size; index += 1) {
      result[index] = source[index] >>> 8
    }
    return result
  }

  if (source instanceof Float32Array) {
    for (let index = 0; index < size; index += 1) {
      if ((index & 3) === 3) {
        result[index] = Math.max(0, Math.min(255, Math.round(source[index] * 255)))
      } else {
        const value = Math.max(0, Math.min(1, source[index]))
        result[index] = Math.max(0, Math.min(255, Math.round(Math.pow(value, 1 / 2.2) * 255)))
      }
    }
    return result
  }

  const view = source instanceof Uint8Array
    ? source
    : new Uint8Array(source.buffer, source.byteOffset, source.byteLength)
  result.set(view.subarray(0, size))
  return result
}

const resizeRgba = (source, width, height, maxDimension) => {
  if (!maxDimension || Math.max(width, height) <= maxDimension) {
    return { data: source, width, height }
  }

  const scale = maxDimension / Math.max(width, height)
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))
  const result = new Uint8ClampedArray(targetWidth * targetHeight * 4)

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(height - 1, Math.floor((y + 0.5) * height / targetHeight))
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(width - 1, Math.floor((x + 0.5) * width / targetWidth))
      const sourceOffset = (sourceY * width + sourceX) * 4
      const targetOffset = (y * targetWidth + x) * 4
      result[targetOffset] = source[sourceOffset]
      result[targetOffset + 1] = source[sourceOffset + 1]
      result[targetOffset + 2] = source[sourceOffset + 2]
      result[targetOffset + 3] = source[sourceOffset + 3]
    }
  }

  return { data: result, width: targetWidth, height: targetHeight }
}

const decodeComposite = (filePath, maxDimension) => {
  let fileBuffer = null
  let psd = null
  let imageData = null
  try {
    fileBuffer = fs.readFileSync(filePath)
    const header = assertHeader(fileBuffer)
    psd = readPsd(fileBuffer, {
      skipLayerImageData: true,
      skipCompositeImageData: false,
      skipThumbnail: true,
      skipLinkedFilesData: true,
      useImageData: true,
      totalMemoryLimit: MAX_PSD_DECODE_BYTES
    })
    imageData = psd.imageData
    if (!imageData || !imageData.data) throw new Error('PSD composite image data is unavailable')

    const rgba = toRgba8(imageData.data, header.width, header.height)
    const resized = resizeRgba(rgba, header.width, header.height, maxDimension)
    return {
      width: resized.width,
      height: resized.height,
      data: resized.data
    }
  } finally {
    // Do not retain the source PSD buffer or ag-psd's temporary pixel object.
    if (psd) {
      psd.imageData = null
      psd.layers = null
      psd.children = null
    }
    imageData = null
    psd = null
    fileBuffer = null
  }
}

parentPort.on('message', (message) => {
  const { id, path: filePath, maxDimension } = message || {}
  Promise.resolve()
    .then(() => decodeComposite(filePath, Number.isFinite(maxDimension) ? maxDimension : 0))
    .then((result) => {
      parentPort.postMessage(
        { id, ok: true, width: result.width, height: result.height, data: result.data.buffer },
        [result.data.buffer]
      )
    })
    .catch((error) => {
      parentPort.postMessage({ id, ok: false, error: toErrorPayload(error) })
    })
})
