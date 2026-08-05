# MegSpot - vv版

<p align="center">
  <img width="550" src="./src/renderer/assets/images/big_logo_dark.png" alt="MegSpot logo">
</p>

<p align="center">
  <a href="README_EN.md">English</a> | 中文
</p>

<p align="center">
  <a href="https://github.com/DynamaxVV/MegSpot/actions/workflows/build.yml"><img src="https://github.com/DynamaxVV/MegSpot/actions/workflows/build.yml/badge.svg" alt="Build status"></a>
  <a href="https://github.com/DynamaxVV/MegSpot/releases"><img src="https://img.shields.io/github/v/release/DynamaxVV/MegSpot?include_prereleases&label=release" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="Apache 2.0 license"></a>
</p>

MegSpot - vv版是面向图像结果审校、版本差异检查和标注复核的本地图片对比桌面工具。它将两组图片或图片文件夹组织成可追溯的对比任务，重点优化批量配对、三种对比布局、文件变化保护、TXT 标注审校和大图/快速翻页时的资源管理，适合不希望上传素材、需要逐组核对图片的本地工作流。

本仓库是由 [vv](https://github.com/DynamaxVV) 维护的非官方二次开发版本，基于上游 [MegEngine/MegSpot](https://github.com/MegEngine/MegSpot)。它不代表上游项目或上游组织；上游代码、版权和第三方许可仍以仓库中的许可文件为准。

## 适用场景

- **结果审校**：逐组比较基准图与生成图、修改前后图片或不同版本的渲染结果。
- **批量差异检查**：将两侧图片文件夹自动配对，保持排序和配对关系可复核。
- **标注复核**：读取图片来源目录中的 TXT 标注，在对比画布和审校面板中同步查看。

## 二次开发重点

- **成对图片对比工作区**：首页左右两侧分别接收图片或文件夹，支持预览、排序、配对和进入对比。
- **更可控的配对规则**：文件名匹配忽略扩展名和大小写；剩余图片按两侧排序顺序配对；文件夹只读取直属图片并按绝对路径去重。
- **三种对比布局**：并排、单页、分割；支持方向键临时查看另一侧和切换对比组。
- **文件变化保护**：内容修改会重新加载；文件新增、删除或重命名会冻结任务，必须显式刷新配对，避免比较过程中静默改变顺序。
- **审校标注模式**：从图源文件夹读取有效 TXT 标注，在画布显示标注序号，并通过审校面板查看评审文本。
- **大图与快速翻页优化**：对缩略图、ImageBitmap、OpenCV 矩阵、Blob URL、Canvas 后备存储和邻近对比组预加载进行生命周期管理。
- **本地诊断日志**：为配对动作、图片加载和渲染异常保留可关联的诊断信息，便于定位白屏或加载失败。
- **交互调整**：支持可配置快捷键、空格回正、双击选择单图缩放，以及原图/高清显示模式。

## 使用流程

### 1. 准备图片来源

在首页左右两侧添加图片或文件夹。每一侧可以添加多个来源，并可在同侧拖拽调整文件夹顺序。文件夹只读取直属子文件中的支持图片，不递归扫描子目录；同一路径按绝对路径去重。

### 2. 确认配对结果

应用会先显示配对预览。文件名去掉扩展名后进行精确匹配，并忽略大小写；无法精确匹配的图片按两侧排序结果依次配对。确认顺序和缺图状态后进入工作区。

### 3. 进行图片对比

工作区提供并排、单页和分割三种模式。上下方向键切换对比组，按住左右方向键临时查看另一侧；亮度、对比度、饱和度、灰度、Gamma、色阶、RGB 取色器、直方图、缩放和旋转等工具作用于当前图片。

### 4. 进行审校与刷新

如果图片目录中存在符合格式的 TXT 标注文件，可以打开审校模式，在画布和侧栏中查看标注。图片内容修改会重新加载；文件新增、删除或重命名会使任务进入待刷新状态，需要显式刷新配对后继续。

## 当前功能边界

当前公开功能聚焦本地图片对比。图像快照（<code>.mgt</code>）、GIF 导出、视频预览/截屏对比/帧同步、HEVC/H.265 播放、Linux 命令行启动和多语言界面不属于当前公开能力；是否纳入后续版本，以具体代码和 Release notes 为准。

## 下载、构建与发布

版本资产和校验和发布在 [GitHub Releases](https://github.com/DynamaxVV/MegSpot/releases)。不同版本的支持平台、CPU 架构、签名状态和安装方式以对应 Release notes 为准。未签名程序可能触发 Windows SmartScreen 或 macOS Gatekeeper 提示，这是发布状态限制，不代表应用运行时会上传图片。

项目使用旧版 Webpack 4 和 Electron 构建链，推荐使用仓库声明的 Node.js <code>16.20.2</code> 与 Yarn <code>1.22.21</code>：

```bash
corepack enable
corepack prepare yarn@1.22.21 --activate
yarn install --frozen-lockfile
yarn dev
```

常用检查和构建命令：

```bash
yarn lint
yarn e2e
npm run pack:main
npm run build:web
npm run build:win64
npm run build:linux
npm run build:mac
```

完整的环境要求、产物检查、版本标签和 GitHub Actions 流程见 [构建与发布指南](docs/BUILD_AND_RELEASE.md)。

## 数据与网络边界

应用运行时以本地文件处理为边界：不要求登录，不内置自动更新、Firebase 埋点或对外 HTTP 服务，普通图片对比任务不会把图片上传到远程服务。依赖安装、GitHub Actions 和 GitHub Release 仍需要网络，请将应用运行时、开发依赖安装和发布 CI 视为不同边界。

## 项目文档

- [用户指南](docs/USER_GUIDE.md)：成对图片、标注审校、图片对比流程和快捷键。
- [构建与发布指南](docs/BUILD_AND_RELEASE.md)：本地构建、Release 准入条件和 GitHub Actions 流程。
- [CHANGELOG](CHANGELOG.md)：按修改版本记录二次开发变更。
- [内存生命周期说明](docs/MEMORY_LIFECYCLE.md)：图片、Canvas、Worker、缓存和预加载资源的释放约束。
- [贡献指南](CONTRIBUTING.md)：Issue、Pull Request 和许可边界。

## 归属与许可

本项目基于上游 MegSpot 二次开发。上游代码、原始版权和第三方依赖声明仍受仓库中的 [LICENSE](LICENSE)、[COPYRIGHT](COPYRIGHT) 和 [ACKNOWLEDGMENTS](ACKNOWLEDGMENTS) 约束；本仓库新增或修改的内容不改变上游代码的许可条件。

问题反馈和改进建议请提交到本仓库的 [Issues](https://github.com/DynamaxVV/MegSpot/issues)。欢迎通过 [Pull Request](https://github.com/DynamaxVV/MegSpot/pulls) 参与，但请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。
