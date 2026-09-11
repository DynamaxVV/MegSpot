import fs from 'fs'
import path from 'path'
import { Worker } from 'worker_threads'

class PsdDecoder {
  constructor() {
    this.worker = null
    this.nextId = 1
    this.pending = new Map()
  }

  ensureWorker() {
    if (this.worker) return this.worker
    const workerPath = this.getWorkerPath()
    const worker = new Worker(workerPath)
    worker.on('message', (message) => {
      const task = this.pending.get(message && message.id)
      if (!task) return
      this.pending.delete(message.id)
      if (message.ok) {
        task.resolve(message)
      } else {
        const error = new Error(message.error?.message || 'PSD decode failed')
        error.name = message.error?.name || 'PsdDecodeError'
        error.code = message.error?.code || 'PSD_DECODE_FAILED'
        task.reject(error)
      }
    })
    worker.on('error', (error) => {
      this.rejectPending(error)
      this.worker = null
    })
    worker.on('exit', (code) => {
      if (this.worker === worker) this.worker = null
      if (code !== 0) {
        const error = new Error(`PSD decode worker exited with code ${code}`)
        error.code = 'PSD_WORKER_EXITED'
        this.rejectPending(error)
      }
    })
    this.worker = worker
    return worker
  }

  getWorkerPath() {
    const candidates = [path.join(__dirname, 'psdDecodeWorker.js')]
    try {
      const { app } = require('electron')
      if (app && typeof app.getAppPath === 'function') {
        candidates.unshift(path.join(app.getAppPath(), 'dist/electron/psdDecodeWorker.js'))
      }
    } catch (error) {
      // Unit tests can use the source worker without a running Electron app.
    }
    return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0]
  }

  rejectPending(error) {
    for (const { reject } of this.pending.values()) reject(error)
    this.pending.clear()
  }

  async decode({ path: filePath, maxDimension = 0, mtime, size } = {}) {
    if (typeof filePath !== 'string' || !filePath) {
      throw new Error('PSD path is required')
    }
    const expectedMtime = Number(mtime)
    const expectedSize = Number(size)
    const validateIdentity = async () => {
      const stat = await fs.promises.stat(filePath)
      if (Number.isFinite(expectedMtime) && Math.abs(stat.mtimeMs - expectedMtime) > 0.01) {
        const error = new Error('PSD file changed before decode')
        error.code = 'PSD_FILE_CHANGED'
        throw error
      }
      if (Number.isFinite(expectedSize) && stat.size !== expectedSize) {
        const error = new Error('PSD file changed before decode')
        error.code = 'PSD_FILE_CHANGED'
        throw error
      }
    }
    await validateIdentity()
    const id = this.nextId++
    const result = await new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      try {
        this.ensureWorker().postMessage({
          id,
          path: filePath,
          maxDimension: Number.isFinite(maxDimension) ? Math.max(0, Math.floor(maxDimension)) : 0
        })
      } catch (error) {
        this.pending.delete(id)
        reject(error)
      }
    })
    try {
      await validateIdentity()
    } catch (error) {
      result.data = null
      throw error
    }
    return result
  }

  dispose() {
    if (!this.worker) return
    const worker = this.worker
    this.worker = null
    this.rejectPending(new Error('PSD decoder disposed'))
    worker.terminate()
  }
}

export const psdDecoder = new PsdDecoder()
