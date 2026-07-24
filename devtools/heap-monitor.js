/**
 * MegSpot Renderer Heap Monitor — JS / WASM split tracking
 * Paste into Chrome DevTools console on the MegSpot window.
 *
 * Usage:
 *   heapMonitor.start()              — baseline snapshot
 *   [perform add→compare→exit→delete cycle in UI]
 *   heapMonitor.report("cycle 1")    — print JS + WASM delta
 *   heapMonitor.inspectStore()       — dump Vuex + imageCache state
 *   heapMonitor.forceGC()            — manual GC (needs --js-flags="--expose-gc")
 */

;(function () {
  const heapMonitor = {
    _baseline: null,
    _history: [],

    forceGC() {
      if (typeof gc !== 'undefined') { gc(); console.log('%c[HeapMonitor] GC done', 'color: #4caf50') }
      else console.warn('%c[HeapMonitor] gc() not available. Launch with --js-flags="--expose-gc"', 'color: #ff9800')
    },

    start() {
      this.forceGC()
      this._baseline = this._read()
      this._history = [this._baseline]
      const b = this._baseline
      console.log(
        `%c[HeapMonitor] Baseline: %c${b.used}MB JS%c / %c${b.wasm || '?'}MB WASM%c / ${b.total}MB total`,
        'color: #4caf50', 'font-weight: bold', '', 'color: #9c27b0', ''
      )
    },

    report(label) {
      this.forceGC()
      const n = this._read()
      const b = this._baseline || n
      const dJS = +(n.used - b.used).toFixed(1)
      const wasmNow = n.wasm || 0
      const wasmBase = b.wasm || 0
      const dWASM = +(wasmNow - wasmBase).toFixed(1)
      const dTotal = +(dJS + dWASM).toFixed(1)
      this._history.push(n)

      const tag = label ? ` [${label}]` : ''
      const c = dTotal > 30 ? '#f44336' : dTotal > 10 ? '#ff9800' : '#4caf50'
      console.log(
        `%c[HeapMonitor]${tag} %c${n.used}MB JS%c / %c${n.wasm || '?'}MB WASM%c  |  Δ %c${dJS > 0 ? '+' : ''}${dJS}MB JS%c + %c${dWASM > 0 ? '+' : ''}${dWASM}MB WASM%c = %c${dTotal > 0 ? '+' : ''}${dTotal}MB`,
        'color: #2196f3',
        'font-weight: bold', '', 'color: #9c27b0', '',
        `color: ${c}`, '', `color: ${c}`, '', `color: ${c}`, 'font-weight: bold'
      )
      return { jsDelta: dJS, wasmDelta: dWASM, totalDelta: dTotal }
    },

    inspectStore() {
      try {
        const st = document.querySelector('#app').__vue__.$store.state.imageStore
        console.log('%c[HeapMonitor] imageStore:', 'color: #9c27b0')
        console.log('  folders:', st.imageFolders.length, 'list:', st.imageList.length, 'expandData:', st.expandData.length)
        st.collections.forEach(c => console.log(`  collection "${c.name}": ${c.list.length} items, tmp=${!!c.isTmp}`))
      } catch (e) { console.warn(e) }

      try {
        // Dynamically import imageCache
        const ctx = document.querySelector('#app').__vue__.$options
        // Can't easily access ES module singletons from console — use Vue devtools instead
      } catch (e) {}
    },

    _read() {
      const m = performance.memory || {}
      let wasm = 0
      try {
        const cv = document.querySelector('#app')?.__vue__?.$cv
        if (cv?.HEAP8?.buffer) wasm = +(cv.HEAP8.buffer.byteLength / 1e6).toFixed(1)
      } catch (e) {}
      return {
        used: +(m.usedJSHeapSize / 1e6).toFixed(1),
        total: +(m.totalJSHeapSize / 1e6).toFixed(1),
        limit: +(m.jsHeapSizeLimit / 1e6).toFixed(1),
        wasm,
        ts: Date.now()
      }
    }
  }

  window.heapMonitor = heapMonitor
  console.log(
    '%c[HeapMonitor] Ready. %cheapMonitor.start()%c → do cycle → %cheapMonitor.report("cycle N")%c → watch JS vs WASM delta',
    'color: #4caf50', 'font-weight: bold', '', 'font-weight: bold', ''
  )
})()
