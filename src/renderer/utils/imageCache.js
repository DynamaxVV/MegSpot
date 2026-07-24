// Bounded LRU cache for full-resolution thumbnail images.
// Keeps at most MAX_CACHE_SIZE images loaded; evicts off-screen images first.
// Also manages a preload pool for nearby groups in compare view.

const MAX_CACHE_SIZE = 30
const MAX_PRELOAD_POOL = 24

class ImageCacheManager {
  constructor(maxSize = MAX_CACHE_SIZE) {
    this.maxSize = maxSize
    this.cache = new Map()
    // Preload pool: url → { img: Image, promise: Promise<Image>, loaded: boolean }
    this.preloadPool = new Map()
  }

  // ---- Thumbnail cache (vue-lazyload managed) ----

  register(el, src) {
    if (this.cache.has(src)) {
      this.cache.delete(src)
    }
    this.cache.set(src, { el })
    this.prune()
  }

  prune() {
    if (this.cache.size <= this.maxSize) return

    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const buffer = 400

    const entries = [...this.cache.entries()]
    const toEvict = []

    for (const [src, { el }] of entries) {
      if (this.cache.size - toEvict.length <= this.maxSize) break

      if (!el || !el.isConnected) {
        toEvict.push(src)
        continue
      }

      const rect = el.getBoundingClientRect()
      const isNearViewport =
        rect.bottom >= -buffer &&
        rect.top <= viewportHeight + buffer &&
        rect.right >= -buffer &&
        rect.left <= viewportWidth + buffer

      if (!isNearViewport) {
        toEvict.push(src)
      }
    }

    for (const src of toEvict) {
      const entry = this.cache.get(src)
      if (entry?.el?.isConnected) {
        entry.el.removeAttribute('src')
        entry.el.setAttribute('lazy', 'loading')
      }
      this.cache.delete(src)
    }
  }

  clear() {
    for (const [, { el }] of this.cache) {
      if (el?.isConnected) {
        el.removeAttribute('src')
        el.setAttribute('lazy', 'loading')
      }
    }
    this.cache.clear()
  }

  // ---- Preload pool (compare group pre-caching) ----

  /**
   * Set the preload window to exactly the given URLs.
   * Evicts entries no longer in the window, preloads new ones.
   * This prevents unbounded accumulation across group navigations.
   */
  setPreloadWindow(urls) {
    const urlSet = new Set(urls)
    // Evict entries no longer in the window
    for (const [url, { img }] of this.preloadPool) {
      if (!urlSet.has(url)) {
        if (img && img.src) img.src = ''
        this.preloadPool.delete(url)
      }
    }
    // Preload new entries not yet in the pool
    for (const url of urls) {
      if (this.preloadPool.has(url) || this.cache.has(url)) continue
      const img = new Image()
      const entry = { img, loaded: false }
      entry.promise = new Promise((resolve) => {
        img.onload = () => {
          entry.loaded = true
          resolve(img)
        }
        img.onerror = () => resolve(null)
      })
      img.src = url
      this.preloadPool.set(url, entry)
    }
  }

  /**
   * Preload images by creating Image objects for the given URLs.
   * This warms Chromium's in-process decoded image cache so subsequent
   * ImageCanvas mounts load faster. Prefer setPreloadWindow for
   * group navigation to avoid unbounded growth.
   *
   * @param {string[]} urls - Image URLs to preload
   */
  preload(urls) {
    for (const url of urls) {
      if (this.preloadPool.has(url) || this.cache.has(url)) continue

      const img = new Image()
      const entry = { img, loaded: false }
      entry.promise = new Promise((resolve) => {
        img.onload = () => {
          entry.loaded = true
          resolve(img)
        }
        img.onerror = () => resolve(null)
      })
      img.src = url
      this.preloadPool.set(url, entry)
    }

    this.prunePreloadPool()
  }

  /**
   * Take a preloaded Image from the pool.
   * Returns the entry { img, loaded } or null if not preloaded.
   */
  takePreloaded(url) {
    const entry = this.preloadPool.get(url)
    if (entry) {
      this.preloadPool.delete(url)
      return entry
    }
    return null
  }

  prunePreloadPool() {
    if (this.preloadPool.size <= MAX_PRELOAD_POOL) return

    const entries = [...this.preloadPool.entries()]
    const excess = entries.slice(0, this.preloadPool.size - MAX_PRELOAD_POOL)
    for (const [url, { img }] of excess) {
      if (img && img.src) img.src = ''
      this.preloadPool.delete(url)
    }
  }

  clearPreloadPool() {
    for (const [, { img }] of this.preloadPool) {
      if (img && img.src) img.src = ''
    }
    this.preloadPool.clear()
  }
}

export const imageCache = new ImageCacheManager()
