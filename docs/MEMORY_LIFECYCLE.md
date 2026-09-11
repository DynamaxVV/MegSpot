# MegSpot 内存组件管理及生命周期文档

> 版本：2.2.12-vv1.0.10
> 更新日期：2026.09.12

本文档面向当前二次开发版的图片对比工作区维护者。它描述图片、Canvas、Worker、OpenCV.js、缓存和预加载资源的当前释放约束；不把浏览器或 GPU 的理论回收时间当作已经验证的稳定内存上限。

当前公开版本的产品范围是图片对比。本文中保留的 <code>video/</code>、快照或其他历史组件引用仅用于说明代码生命周期，不代表视频、HEVC、快照、GIF、Linux 命令行或多语言界面功能已在公开安装包中启用。

---

## 目录

1. [架构概览](#1-架构概览)
2. [内存资源类型与大小](#2-内存资源类型与大小)
3. [组件生命周期与资源管理](#3-组件生命周期与资源管理)
4. [缓存与预加载系统](#4-缓存与预加载系统)
5. [GPU 内存管理](#5-gpu-内存管理)
6. [渲染进程内存管理](#6-渲染进程内存管理)
7. [已知技术栈瓶颈](#7-已知技术栈瓶颈)
8. [开发检查清单](#8-开发检查清单)

---

## 1. 架构概览

### 1.1 内存分层

```
┌──────────────────────────────────────────────────┐
│                    GPU 进程                        │
│  ImageBitmap 纹理 · Canvas 后备存储 · 合成层        │
│  占用：ImageBitmap(~200MB/50MP) × N 个渲染画布       │
├──────────────────────────────────────────────────┤
│              渲染进程 (JS 堆 + WASM 堆)              │
│  JS 堆: HTMLImageElement · ImageData · Blob · DOM  │
│  WASM 堆: cv.Mat (Uint8Array, grow-only)           │
├──────────────────────────────────────────────────┤
│         持久化存储 (vuex-electron-store)              │
│  路径字符串 · 用户偏好 · 布局配置 · 色彩/滤镜参数 (KB 级) │
└──────────────────────────────────────────────────┘
```

### 1.2 数据流

```
[文件系统] → Vuex(路径字符串) → ImageCanvas → 屏幕
                 │                    │
                 │                    ├─ new Image()      → HTMLImageElement (CPU 解码)
                 │                    ├─ createImageBitmap() → ImageBitmap (GPU 纹理)
                 │                    ├─ cv.imread()      → cv.Mat (CPU, 懒创建)
                 │                    └─ canvas.width=N   → Canvas 后备存储 (GPU)
                 │
                 └─ Thumbnail → v-lazy → <img> → GPU 合成纹理
```

### 1.3 对比工作区滤镜状态

`EffectPreview` 的色彩与滤镜参数保存在 `preferenceStore.imageFilter`，gamma 和色阶继续使用同一模块中的持久化配置。`PairCompareWorkspace` 在左右两侧都有图片时会复用现有的 `ImageCanvas` 实例，只更新 `path` 并重新加载图片；因此切换对比组或返回首页不会导致滤镜恢复默认值。某一侧从有图变为缺图时，模板中的 `v-if` 仍会销毁该侧实例。滤镜面板的“重置所有”是唯一的显式重置入口。

### 1.4 ImageCanvas 加载流程（优化后）

```
initImage()
├─ resolvePath()          → no-cache-file:// URL
├─ new Image() / takePreloaded()
├─ initBitMap()           → 检查滤镜是否为默认值
│   ├─ 默认 (gamma=1, levels=[0,255]): 跳过 Worker
│   │   └─ this.bitMap = createImageBitmap(this.image)  ← 仅一张 GPU 纹理
│   └─ 有滤镜: Worker 往返 → 替换 bitmap
└─ cv.Mat 懒创建          → 仅当直方图/RGB文本/滤镜需要时通过 ensureImageMat()
```

PSD 路径不进入普通 `Image` 预加载池，而是走共享的 `psdLoader`：

```
PSD 路径
├─ 扫描阶段：只记录 path + mtime + size，不解析文件
├─ thumbnail → 320px 以内的预览合成图
├─ display   → 按当前画布显示尺寸的合成图
└─ original  → 仅原图/像素检查时请求完整分辨率

psdLoader → ipcRenderer → 主进程 PsdDecoder → psdDecodeWorker
                                      └─ ag-psd：只读取 composite image data
```

`ImageCanvas`、分割模式和缩略图都复用同一个 `psdLoader`。缓存身份由
`path + mtime + size` 确定；文件身份变化会创建新条目并使旧条目失效。PSD 预加载只保留当前对比组前后各一组，不占用普通图片的 24 张预加载窗口。

---

## 2. 内存资源类型与大小

### 2.1 CPU 内存 (JavaScript 堆)

| 资源 | 创建方式 | 大小 (50MP 图) | 生命周期 | 优化 |
|------|---------|---------------|---------|------|
| `HTMLImageElement` | `new Image()` | ~200MB | 跟随组件实例 | `image = null` |
| `cv.Mat` | `cv.imread()` | ~200MB | 需 `.delete()` | **懒创建**：仅直方图/RGB/滤镜需要 |
| `ImageData` | `getImageData()` | ~200MB (临时) | GC 回收 | **跳过 Worker 时免创建** |
| PSD 原始 Buffer | `psdDecodeWorker` 读取文件 | 取决于文件 | 解码 `finally` 置空 | 不回传到渲染进程 |
| PSD 合成图 `ImageData` | Worker `readPsd()` | 解码分辨率 | 缩放/回传后置空 | 跳过图层像素数据 |
| `OffscreenCanvas` | `new OffscreenCanvas()` | ~200MB (临时) | GC 回收 | 同上 |
| `Blob` | `imageToBlob()` | 压缩后 | 函数作用域 | — |
| 路径字符串 | Vuex 存储 | ~100B/张 | 持久化 | — |

### 2.2 GPU 内存 (GPU 进程)

| 资源 | 创建方式 | 大小 (50MP) | 清理 | 优化 |
|------|---------|------------|------|------|
| `ImageBitmap` | `createImageBitmap()` | ~200MB | `.close()` | **默认跳过 Worker，单张 bitmap** |
| Canvas 后备存储 | `canvas.width=W, height=H` | ~10MB | `width=height=0` | `beforeDestroy` 归零 |
| `<img>` 合成纹理 | 浏览器解码 | 全分辨率 | 随 DOM 移除 | LRU 缓存(30) + 离屏驱逐 |
| Worker 回传 Bitmap | `postMessage` 传输 | ~200MB | `.close()` | `_destroyed` 检查 + 孤儿关闭 |

### 2.3 WASM 堆 (OpenCV.js Emscripten)

| 特性 | 说明 |
|------|------|
| 分配 | `cv.imread()` 从 WASM 堆分配 Uint8Array 底层 buffer |
| 释放 | `cv.Mat.delete()` 内部 free，但 WASM `Memory.buffer` 不收缩 |
| 碎片 | dlmalloc 分配/释放循环导致堆增长 |
| 每周期增长 | ~30-40MB（4 个 Mats 的碎片化） |
| 缓解 | 懒创建 cv.Mat（减少分配次数），接受稳态峰值 |

### 2.4 Blob URL 管理

| 位置 | 场景 | 释放 | 状态 |
|------|------|------|------|
| `image/Content.vue:315` | 拖拽对比 | `beforeDestroy` revoke | ✅ |
| `video/Content.vue:462` | 视频对比 | `beforeDestroy` revoke | ✅ |
| `compress.js:145` | 快照解压 | `SnapshotHelper.cleanupFiles()` | ✅ |
| `ImageDragDropCompare` | 外部传入 | `goBack()` / `beforeDestroy` | ✅ |

---

## 3. 组件生命周期与资源管理

### 3.1 ImageCanvas.vue — 核心渲染组件

**initImage() 优化后流程：**

```
initImage()
├─ takePreloaded() → 命中则复用 Image (避免重复加载)
├─ new Image() + src = url → onload
├─ initBitMap()
│   ├─ _isFilterNoOp(params)? → createImageBitmap(this.image) → 完成
│   └─ 有滤镜 → getImageData() → createImageBitmap → useWorker → 替换
├─ cv.Mat 懒创建（不在此处创建）
└─ reDraw() → 绘制到屏幕
```

PSD 分支改为：

```
loadPsdImageElement()
├─ 以 path + mtime + size + 用途/尺寸取得共享缓存
├─ Worker 返回合成图 RGBA
├─ 临时 ImageData 写入专用 Canvas
├─ release() 共享栅格
└─ ImageCanvas 创建 ImageBitmap；切换/销毁时 dispose Canvas 并 close Bitmap
```

Worker 完成后立即释放 PSD 原始 Buffer、临时 `ImageData` 和中间对象；渲染进程只保留当前画布需要的 Canvas/`ImageBitmap`。完整分辨率条目在不再被当前视图引用后主动从缓存移除。

**beforeDestroy 清理：**
```
1. this._destroyed = true          → 阻止 Worker 异步回调
2. closeWatcher()                   → 关闭 chokidar
3. cancelAnimationFrame()           → 取消待处理 RAF
4. removeEvents()                   → $bus.$off 全部
5. imgMat?.delete()                 → 释放 OpenCV 矩阵
6. bitMap?.close()                  → 释放 GPU 纹理
7. canvas.width = canvas.height = 0 → 释放 GPU 后备存储
8. this.image = null                → 提示 GC
9. initFilters()                    → 清空 Worker filter 数据
```

### 3.2 ImagePreview.vue — 文件选择页 + 缩略图

```
mounted/deactivated 生命周期：
├─ 显示时: v-lazy 触发缩略图加载 → imageCache.register()
├─ 切换列表: imageCache.clear() → 清除 30 个缓存
├─ 全部取消: imageCache.clear() + thumbnailKey++ → 强制重建 DOM
└─ 离开页面: deactivated → cleanup() → imageCache.clear()
```

### 3.3 Content.vue — 对比页布局

```
mounted → preloadNearbyGroups()   → 前1+后1组预热
changeGroup (legacy Content) → 按旧布局清理/更新资源
PairCompareWorkspace       → 保留左右 ImageCanvas → 仅更新 path 并重新加载
                             → preloadNearbyGroups() → 更新滑动窗口
beforeDestroy → 撤销 blob URLs、clearPreloadPool、移除 resize 监听
```

`Content.vue` 负责旧的多图/快照布局；成对图片任务使用 `PairCompareWorkspace`。后者固定保留左右两个 `ImageCanvas`（对应侧存在图片时），切页只更新 `path`，由组件 watcher 关闭旧文件监听并启动新图片加载，从而避免连续切页时的组件销毁和创建开销。

### 3.4 keep-alive 组件（ImageRoot / VideoRoot）

此组件的 beforeDestroy 永不触发，改为使用 activated/deactivated：

```
deactivated(): 释放重资源
├─ imageCache.clear()
├─ imageCache.clearPreloadPool()
├─ ImagePreview.cleanup() → thumbnailList=[] + thumbnailKey++
└─ FileTable 窗口事件监听器移除

activated(): 重新注册
├─ window.addEventListener('keydown', ...)
├─ FileTable 窗口事件监听器恢复
└─ Vue 响应式系统自动恢复数据
```

### 3.5 FileTable — keep-alive 兼容

```
created()  → 预建 _debouncedResize / _handleShiftDown / _handleShiftUp
mounted()  → 注册 $bus.$on（仅一次）
activated()  → 注册 window 事件监听器
deactivated() → 移除 window 事件监听器
beforeDestroy() → 清理 $bus.$off + watcher.close()
```

---

## 4. 缓存与预加载系统

### 4.1 缩略图 LRU 缓存

```
imageCache (src/renderer/utils/imageCache.js)
├── cache (Map, max=30): 视口感知 LRU 缓存
│   ├── register(el, src): vue-lazyload loaded 回调注册
│   └── prune(): 驱逐离屏(>400px)图片 — 移除 src + reset lazy='loading'
├── preloadPool (Map, max=24): 对比组预加载滑动窗口
│   ├── setPreloadWindow(urls): 驱逐非窗口条目 → 预加载新条目
│   └── takePreloaded(url): ImageCanvas 消费预加载 Image
└── 清理: clear() / clearPreloadPool() / clearPreloadPool()
```

### 4.2 对比组预加载策略

```
当前组 = groupStartIndex
预加载窗口 = [前 1 组, 后 1 组]   ← 滑动窗口，非累积

changeGroup() 或 mounted() 时:
  1. getNearbyGroupPaths() 计算窗口内图片路径
  2. → getImageUrlSyncNoCache() 转 URL
  3. imageCache.setPreloadWindow(urls)
     ├─ 驱逐不在窗口内的旧条目
     └─ 创建 new Image() 开始预加载

ImageCanvas.initImage() 消费:
  → takePreloaded(url) → 命中则复用，避免重复解码
```

### 4.3 PSD 专用缓存与预加载

`src/renderer/utils/psdLoader.js` 使用独立 Map，不复用 `imageCache` 的普通图片池：

- `thumbnail` 固定使用低分辨率预览；`display` 按当前画布尺寸请求；`original` 不限制最大尺寸。
- 同一身份和用途的并发请求共享一个 Promise，避免 `ImageCanvas`、分割模式和缩略图重复解码。
- 当前工作区只向 `preloadPsdWindow()` 传入上一组和下一组的 PSD 路径；窗口变化时旧条目立即退出预加载窗口，进行中的请求完成后进入有上限的共享缓存，便于用户立刻切入相邻组时复用。
- 读取前后由主进程重新校验 `mtime` 和 `size`；若文件变化，返回 `PSD_FILE_CHANGED`，旧栅格不会继续作为新内容使用。

---

## 5. GPU 内存管理

### 5.1 关键原则

| 原则 | 实现位置 |
|------|---------|
| ImageBitmap 必须 `.close()` | `beforeDestroy` + Worker 回调 `_destroyed` 检查 |
| Canvas 尺寸归零 | 所有 canvas 组件 `beforeDestroy` 设 `width=height=0` |
| 预加载池滑动窗口 | `setPreloadWindow` 驱逐非窗口条目 |
| 孤儿 Bitmap 关闭 | `_destroyed` 时 `res?.close()` 再 return |
| **默认跳过 Worker** | `_isFilterNoOp` 检查 (gamma=1, levels=[0,255]) |
| **cv.Mat 懒创建** | `ensureImageMat()` 仅当直方图/RGB/滤镜需要 |

### 5.2 优化后 GPU 占用估算

| 场景 | 并发数 | 每项 GPU 成本 | 估算 |
|------|--------|-------------|------|
| 纯看图 (2×3, 50MP) | 6 张 ImageBitmap | ~200MB | **1.2GB** |
| 预加载池 (前1+后1) | ~8 张 Image | ~200MB (CPU解码) | ~1.6GB CPU |
| Canvas 后备存储 | 6 个 | ~10MB | 60MB |
| 缩略图 (可见) | ~10-15 张 `<img>` | 全分辨率 | 取决于视口 |

---

## 6. 渲染进程内存管理

### 6.1 keep-alive 组件资源管理

| 场景 | 清理方式 |
|------|---------|
| 离开 ImageRoot → 进入对比 | `deactivated`: imageCache.clear() + clearPreloadPool() + ImagePreview.cleanup() |
| 仪表盘"新建任务" | `clearAllImageData`: 清空 imageFolders, imageList, collections, expandData |
| 删除单个文件夹 | `ImageRoot.onClose`: removeExpandData + 清空子图片 |
| FileTable 窗口事件 | `activated`/`deactivated` 注册/移除（避免 keep-alive 泄漏） |

### 6.2 已知泄漏修复清单

| # | 位置 | 问题 | 修复 |
|---|------|------|------|
| 1 | `Content.vue:130` | resize 监听器不在 beforeDestroy 移除 | 添加 removeEventListener |
| 2 | `ImageBrowser.vue:343` | `keyup`→`keydown` 拼写错误 | 修复 typo |
| 3 | `router/index.js:19` | 并发导航覆盖 `var end` → Timer 泄漏 | `const done = end` 本地捕获 |
| 4 | `VideoRoot.vue:103` | resize 在 mounted 注册，keep-alive 下 beforeDestroy 不触发 | 移到 `activated`/`deactivated` |
| 5 | `FileTable:180-192` | 3 个 window 事件在 mounted 注册 | 移到 `created`+`activated`/`deactivated` |
| 6 | `imageStore.js` | expandData 删除文件夹时不清理 | onClose → removeExpandData；CLEAR_ALL_IMAGE_DATA 清空 |
| 7 | `imageStore.js` | collections/list/folders 不清理 | 新增 clearAllImageData mutation |
| 8 | `ImageCanvas.vue:567` | Worker 回调返回后 _destroyed 时不关闭 bitmap | `res?.close()` |
| 9 | `ImageCanvas.vue:681` | 每张图无条件创建 cv.Mat (~200MB) | **懒创建 ensureImageMat()** |
| 10 | `ImageCanvas.vue:573` | 默认滤镜下仍走 Worker 往返 | **跳过 Worker，直接 createImageBitmap** |

---

## 7. 已知技术栈瓶颈

以下为技术栈固有限制，无 JS 级修复方案：

| 瓶颈 | 说明 | 影响 | 缓解 |
|------|------|------|------|
| **WASM 堆不收缩** | Emscripten `WebAssembly.Memory` grow-only + dlmalloc 碎片 | 每周期 ~30-40MB 增长 | 懒创建 cv.Mat（减分配次数）；接受稳态 |
| **V8 堆碎片** | DOM/Canvas 创建/销毁 → hidden class 残留 | 每周期 ~5-10MB | 最小化组件创建次数 |
| **Chromium GPU 缓存** | 解码图像可能残留在合成器缓存中 | ~5-10MB | ImageBitmap.close() + canvas 归零 |
| **vuex-electron-store** | 每次 mutation 写磁盘 | IPC 开销 | 无修复方案（架构依赖） |

---

## 8. 开发检查清单

### 8.1 beforeDestroy 必须清理

| 资源 | 清理方式 |
|------|---------|
| `new Image()` | `this.image = null` |
| `createImageBitmap()` | `.close()` |
| `cv.imread()` | `.delete()` |
| `URL.createObjectURL()` | `URL.revokeObjectURL()` |
| `<canvas>` | `canvas.width = canvas.height = 0` |
| `window.addEventListener` | `.removeEventListener()` |
| `$bus.$on` | `$bus.$off()` |
| `chokidar.watch()` | `.close()` |
| `requestAnimationFrame` | `cancelAnimationFrame()` |
| Worker 回调 | 检查 `this._destroyed` + `res?.close()` |

### 8.2 keep-alive 组件特殊规则

| 规则 | 说明 |
|------|------|
| `mounted()` 不注册 window 事件 | 用 `activated`/`deactivated` |
| `beforeDestroy` 不会触发 | 改用 `deactivated` 清理重资源 |
| 保持 Vuex 状态同步 | `clearAllImageData` 在仪表盘"新建任务"时调用 |

### 8.3 性能优化检查

| 检查项 | 问题 |
|--------|------|
| Worker 是否在默认滤镜下仍被调用 | 加 `_isFilterNoOp` 跳过 |
| cv.Mat 是否在纯看图时创建 | 用 `ensureImageMat()` 懒创建 |
| v-for 是否用 key | 避免 DOM 重建 |
| 成对切页是否给 `ImageCanvas` 绑定随路径变化的 key | 会触发组件销毁和创建；保持实例稳定并通过 `path` watcher 重新加载 |
| 大数据是否用 v-show 而非 v-if | 隐藏时不销毁但保留内存 |
| 预加载是否用滑动窗口 | 避免 `preload()` 累积 → 用 `setPreloadWindow()` |

---

## 变更记录

| 版本 | 日期 | 变更 |
|------|------|------|
| 2.2.12-vv1.0.10 | 2026.09.12 | 新增 PSD 合成图解码 Worker、分级解码、路径与文件身份缓存，前后各一组 PSD 预加载和资源释放约束；成对切页复用左右 `ImageCanvas` |
| 2.2.12-vv1.0.9 | 2026.09.11 | 同步文件夹嵌套定位、组合文件名配对、缩放比例显示、LP 排序优化，以及成对对比切页复用 `ImageCanvas` 和临时性能诊断日志移除 |
| 2.2.12-vv1.0.8 | 2026.08.22 | 同步滤镜持久化、快捷键配置、单文件配对和单实例启动 |
| 2.2.12-vv1.0.7 | 2026.08.17 | 同步 LP 配对与审校流程、内容变化刷新和生产页面加载诊断 |
| 2.2.12-vv1.0.6 | 2026.08.05 | 新增审校模式和本地诊断日志后的生命周期与问题定位说明同步 |
| 2.2.12-vv1.0.5 | 2026.08.04 | 同步快捷键配置和设置页原项目信息折叠调整 |
| 2.2.12-vv1.0.4 | 2026.07.27 | 同步同侧文件夹排序、缺图回退和文件名匹配规则 |
| 2.2.12-vv1.0.2 | 2026.07.24 | 初版并重构：LRU 缓存、预加载池、Canvas/ImageBitmap/Blob URL 清理，以及 Worker 跳过、cv.Mat 懒创建和 keep-alive 生命周期 |
