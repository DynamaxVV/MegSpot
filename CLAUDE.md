# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

MegSpot 是一款基于 Electron + Vue 2 的跨平台图片&视频对比桌面应用。使用 JavaScript（非 TypeScript）。

## 常用命令

```bash
# 开发模式启动
npm run dev

# 生产构建（web + electron）
npm run build

# 按平台构建
npm run build:mac
npm run build:win64
npm run build:linux

# Web 模式构建（纯前端，无 Electron）
npm run build:web

# 代码检查
npm run lint

# E2E 测试（Playwright）
npm run e2e

# 生成 changelog
npm run changelog
```

## 项目架构

### 双进程架构 (Electron)

- **主进程** `src/main/` — Electron 主进程入口、窗口管理、IPC、系统托盘、自动更新、命令行参数解析
  - `index.js` — 应用入口，注册协议、初始化窗口、安装 devtools
  - `services/windowManager.js` — 窗口创建与管理（主窗口 + 加载窗口）
  - `services/ipcMain.js` — IPC 处理器（窗口控制、对话框、内嵌服务器控制）
  - `services/cmdParse.js` — Linux 命令行参数解析
  - `services/autoUpdate.js` — 自动更新逻辑
  - `services/tray.js` — 系统托盘
  - `server/` — 内嵌 HTTP 服务器（Express），用于外部访问
  - `config/` — 菜单配置、禁用按钮、静态路径

- **渲染进程** `src/renderer/` — Vue 2 应用

### 渲染进程结构

```
src/renderer/
├── main.js              # Vue 入口，注册插件（Element UI, VXETable, vue-i18n 等）
├── App.vue              # 根组件
├── router/              # Vue Router 路由配置
│   ├── index.js
│   └── routes.js        # 路由定义：dashboard, image/*, video/*
├── store/               # Vuex 状态管理（通过 vuex-electron-store 持久化到磁盘）
│   └── modules/
│       ├── imageStore.js        # 图片对比状态
│       ├── imageSnapshotStore.js # 快照状态
│       ├── videoStore.js        # 视频对比状态
│       └── preferenceStore.js   # 用户偏好（语言、主题、缩放选项等）
├── views/               # 页面级组件
│   ├── dashboard/       # 首页（左右来源、排序、配对预览和最近文件夹快捷入口）
│   ├── image/           # 图片对比功能
│   │   ├── ImageRoot.vue        # 文件选择页
│   │   ├── ImageCompare.vue     # 图片对比页（核心）
│   │   ├── PairCompareWorkspace.vue # 成对图片对比工作区（并排、单页、分割）
│   │   ├── ImageDragDropCompare.vue  # 拖拽对比
│   │   ├── ImageBrowser.vue     # 图片浏览器
│   │   ├── ImagePreview.vue     # 图片预览
│   │   ├── Toolbar.vue          # 工具栏
│   │   ├── Content.vue          # 对比内容区
│   │   └── components/ImageCanvas.vue  # 画布组件
│   └── video/           # 视频对比功能
│       ├── VideoRoot.vue        # 文件选择页
│       ├── VideoCompare.vue     # 视频对比页
│       ├── VideoPreview.vue     # 视频预览
│       ├── Toolbar.vue
│       ├── Content.vue
│       └── components/          # videoCanvas, slider, frameSetting, videoProgressBar
├── components/          # 共享组件（30+ 个组件目录）
│   ├── image-viewer/    # 图像查看器（核心显示组件）
│   ├── image-setting/   # 图像参数调节（亮度/对比度/饱和度/灰度/Gamma）
│   ├── file-table/      # 文件列表表格
│   ├── file-tree/       # 文件夹树
│   ├── thumbnail/       # 缩略图组件（支持懒加载）
│   ├── gallery/         # 文件长廊
│   ├── hist-container/  # 直方图
│   ├── rgba-exhibit/    # RGB 颜色信息展示
│   ├── scale-editor/    # 缩放比例编辑器
│   ├── effect-preview/  # 效果预览
│   ├── gif-dialog/      # GIF 导出对话框
│   └── ...              # 其他通用组件
├── utils/               # 工具函数
│   ├── canvas.js        # Canvas 操作（核心图像处理）
│   ├── image.js         # 图像加载/解码
│   ├── video.js         # 视频帧提取
│   ├── eyedropper.js    # 取色器
│   ├── file.js          # 文件操作
│   ├── analyze.js       # 数据埋点/分析
│   ├── worker.js        # Web Worker 管理
│   ├── imagePairing.js  # 成对图片排序、匹配和任务重建
│   └── imageComparisonSources.js # 图片/文件夹来源读取与新鲜度检查
├── tools/               # 工具函数（hotkey, compress, performance, timer）
├── lib/                 # 库加载（异步加载 OpenCV.js）
├── lang/                # 国际化 (zh.js, en.js, ja.js)
├── styles/              # 全局样式 (SCSS)
├── filter/              # Vue 过滤器
├── directive/           # Vue 自定义指令
├── icons/               # SVG 图标（svg-sprite-loader）
├── assets/              # 静态资源
└── constants.js         # 全局常量
```

### 构建配置

- `.electron-vue/` — Webpack 4 配置（main + renderer 两个入口）
- `config/` — 开发/生产环境变量
- `package.json` — `build` 字段包含 electron-builder 配置
- `volta` 指定 `node 16.20.2`, `yarn 1.22.21`
- `static/lib/opencv.js` — OpenCV.js 运行时加载

### 状态持久化

使用 `vuex-electron-store` 将 Vuex 状态（imageStore, videoStore, preferenceStore）自动持久化到磁盘。应用启动时会固定进入 `/dashboard` 并清空 `imageStore.compareTask`，因此不会恢复上一次配对任务；`recentCompareFolders` 和常规偏好仍会保留。

## 关键依赖

- **Vue 2** + Vue Router 3 + Vuex 3
- **Element UI** — UI 组件库（设置 `size: mini`）
- **vxe-table** — 增强表格
- **OpenCV.js** — 图像处理（异步加载，通过 `$cv` 全局访问）
- **Swiper** — 轮播图（首页帮助视频）
- **viewerjs** — 图片查看器
- **mediainfo.js** — 媒体信息解析
- **dayjs** — 日期处理
- **electron-log / electron-store / electron-updater** — Electron 生态工具
- **Playwright** — E2E 测试

## 核心功能流程

1. **成对图片对比：首页 → 对两侧分别选择或拖入图片/文件夹 → 配对预览 → `/image/compare?pairTask=1`**
   - 文件夹只读取直属图片，来源按绝对路径去重。
   - 文件名忽略扩展名和大小写进行精确匹配；未匹配项依两侧排序顺序配对，左侧决定整体顺序。
   - 工作区支持 `side-by-side`（默认）、`single`（满画布显示对比图）和 `split`。
   - 上下方向键切换配对；按住左右方向键临时在当前画布显示另一侧，松开恢复。
   - 内容修改立即重新加载；新增、删除和重命名会冻结任务，需显式刷新配对。
2. **传统图片/视频流程：首页 → 选择图片/视频 → 文件选择页 → 对比页**
   - 文件选择：左侧文件夹树（file-tree）+ 右侧文件列表（file-table）
   - 选中文件加入"已选列表"，通过"文件长廊"管理
3. **图片对比**：支持叠加对比、分割对比、拖拽对比、多种布局（1x1 到 2x3）
4. **视频对比**：视频播放、帧同步、截屏对比
5. **图像调节**：亮度、对比度、饱和度、灰度、Gamma、色阶
6. **辅助工具**：RGB 取色器、直方图、缩放、镜像/翻转、GIF 导出、快照 (.mgt)

## 路由

- `/dashboard` — 首页与成对图片对比任务面板
- `/image/index` — 图片文件选择
- `/image/compare` — 图片对比；追加 `?pairTask=1` 进入成对图片工作区
- `/image/drag-drop-compare` — 拖拽对比
- `/image/browser` — 图片浏览器
- `/video/index` — 视频文件选择
- `/video/compare` — 视频对比
