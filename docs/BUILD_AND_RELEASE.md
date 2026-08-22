# 构建与发布指南

本文档描述当前二次开发版的本地构建和 GitHub Release 流程。目标是先发布 Windows x64、Linux x64 与 macOS Apple Silicon（arm64）的公开预发布版本；macOS 预发布产物暂为未签名 DMG，签名、公证和真实设备验证仍是后续稳定版的发布条件。

当前公开 Release 只承诺本地图片对比及其配套的审校、诊断能力。图像快照（<code>.mgt</code>）、GIF 导出、视频流程、HEVC/H.265 播放、Linux 命令行启动和多语言界面均未启用，不应写入当前 Release 的功能亮点或验收结论。

## 1. 版本与发布边界

当前版本：

- package 版本：<code>2.2.12-vv1.0.8</code>
- 建议 Git tag：<code>v2.2.12-vv1.0.8</code>
- Release 类型：GitHub Pre-release
- 首次发布平台：Windows x64 Portable、Linux x64 AppImage、macOS arm64 DMG
- 签名状态：Windows 与 macOS 预发布产物未签名；macOS 首次打开可能触发 Gatekeeper 提示

tag 使用 <code>v*-vv*</code> 形式。工作流只对这种修改版标签触发，避免上游版本标签或普通测试标签误生成公开 Release。

应用运行时与发布 CI 是不同边界：当前应用不包含自动更新、在线埋点和外部 HTTP 服务，但依赖安装、GitHub Actions、下载 Electron 构建依赖以及上传 Release 资产都需要网络。

## 2. 固定环境

仓库通过 Volta 声明：

- Node.js <code>16.20.2</code>
- Yarn <code>1.22.21</code>

建议先确认环境：

~~~bash
node --version
yarn --version
corepack enable
corepack prepare yarn@1.22.21 --activate
~~~

安装依赖时使用锁文件：

~~~bash
yarn install --frozen-lockfile --ignore-engines
~~~

<code>--ignore-engines</code> 是有意保留的兼容设置：项目固定使用 Node.js 16 和 Webpack 4，而锁文件中的部分间接依赖声明了更高的 Node engine；构建结果仍由后续自检和打包步骤验证。

不要在未确认 Node 版本的情况下升级依赖或重新生成 <code>yarn.lock</code>。本项目使用 Webpack 4，较新的 Node/OpenSSL 组合可能导致加密初始化或压缩阶段失败。

## 3. 发布前本地检查

在准备 tag 前，至少执行以下检查：

~~~bash
BABEL_ENV=main node -r @babel/register src/renderer/utils/imagePairing.check.js
BABEL_ENV=main node -r @babel/register src/renderer/utils/translationAnnotations.check.js
BABEL_ENV=main node -r @babel/register src/renderer/utils/diagnosticLog.check.js
npm run pack:main
npm run build:web
git diff --check
~~~

三个 <code>*.check.js</code> 是不依赖测试框架的最小自检，分别覆盖配对规则、TXT 标注解析和诊断日志清理。<code>npm run build:web</code> 用于确认渲染包可以通过 Webpack 4 与 Terser 压缩；<code>pack:main</code> 用于确认主进程入口可以打包。

可选检查：

~~~bash
npm run lint
npm run e2e
~~~

如果环境不支持图形桌面或 Playwright 浏览器，不能把未运行的 E2E 检查写成发布通过；在 Release 说明中记录未运行原因。

## 4. 生成平台产物

Windows x64：

~~~bash
npm run build:win64
~~~

公开 Release 中的 Windows x64 Portable 也在 macOS runner 上执行上述命令进行交叉构建，以保持与 macOS 本地直接打包的产物路径一致；Release 不使用原生 Windows runner 构建 Windows 包。

Linux x64：

~~~bash
npm run build:linux
~~~

macOS Apple Silicon（未签名）：

~~~bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run build:mac
~~~

当前 macOS 发布目标明确为 arm64。由于设置了 <code>CSC_IDENTITY_AUTO_DISCOVERY=false</code>，electron-builder 会跳过 Apple Developer/Developer ID 应用签名，上述命令生成的是未签名 DMG；本地 Mach-O 可能显示 ad hoc linker signature，但这不等同于可分发的 Developer ID 签名。首次打开时可能需要用户在 Gatekeeper 提示中手动确认。

在 Apple Silicon 宿主机上，electron-builder 默认会按宿主架构尝试生成 Linux ARM64；要在本地复现首版的 x86_64 资产，请显式追加参数：

~~~bash
npm run build:linux -- --x64
~~~

产物输出到 <code>build/</code>。当前配置计划生成：

- <code>MegSpot-2.2.12-vv1.0.8-win-x64-portable.exe</code>
- <code>MegSpot-2.2.12-vv1.0.8-linux-x86_64.AppImage</code>
- <code>MegSpot-2.2.12-vv1.0.8-mac-arm64.dmg</code>

实际文件名以 electron-builder 输出为准。不要把旧版本残留文件、调试目录或临时压缩包一并上传。

基础产物检查：

~~~bash
find build -maxdepth 1 -type f -print
file build/*.exe build/*.AppImage build/*.dmg
sha256sum \
  build/MegSpot-2.2.12-vv1.0.8-win-x64-portable.exe \
  build/MegSpot-2.2.12-vv1.0.8-linux-x86_64.AppImage \
  build/MegSpot-2.2.12-vv1.0.8-mac-arm64.dmg > SHA256SUMS
~~~

上面的 <code>sha256sum</code> 适用于 Linux/CI；在 macOS 本地可将命令替换为 <code>shasum -a 256</code>。

macOS DMG 可以作为明确标注的公开预发布资产，但在完成 Apple Developer 证书、公证凭据和真实设备验证前，不要把它描述为已签名或稳定版本安装包。

## 5. GitHub Actions 发布流程

工作流文件为 <code>.github/workflows/build.yml</code>，分为三个阶段：

1. **quality**：固定 Node/Yarn，安装锁定依赖，执行三个最小自检、主进程打包和 Web 构建。
2. **build**：在 macOS runner 上交叉构建 Windows x64 Portable 和 macOS arm64 DMG，在 Ubuntu runner 上构建 Linux x64 AppImage，并上传单独的 artifact。当前 job 统一设置 <code>CSC_IDENTITY_AUTO_DISCOVERY=false</code>，明确生成未签名预发布产物。
3. **release**：仅在 tag 触发时执行，合并构建资产，生成 <code>SHA256SUMS</code>，使用仓库自动提供的 <code>GITHUB_TOKEN</code> 创建 Draft + Pre-release，并自动生成 GitHub 发布说明。

当前 Windows/Linux/macOS 预发布不需要代码签名 secret。工作流只申请构建阶段的 <code>contents: read</code>，Release 阶段单独申请 <code>contents: write</code>；这是 GitHub Actions 自动令牌的最小权限边界。参考 [GitHub 自动令牌权限](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication)。

触发发布：

~~~bash
git status --short
git tag -a v2.2.12-vv1.0.8 -m "release: v2.2.12-vv1.0.8"
git push fork v2.2.12-vv1.0.8
~~~

其中 <code>fork</code> 是本仓库远程名时才使用；如果远程名不同，请替换为实际指向 <code>DynamaxVV/MegSpot</code> 的 remote。推送后在 GitHub Actions 页面确认 quality、build 和 release 三个 job 均成功。

也可以从 GitHub Actions 手动运行工作流进行构建验证。手动运行没有 tag，quality 和 build 会执行，release 会跳过，不会创建 Release。

## 6. Draft Release 验收

工作流创建 Draft 后，发布者必须逐项检查：

- tag 为 <code>v2.2.12-vv1.0.8</code>，package 版本为 <code>2.2.12-vv1.0.8</code>，Release 标题应为 <code>MegSpot v2.2.12-vv1.0.8</code>。
- 只有 Windows x64 Portable、Linux x64 AppImage、macOS arm64 DMG 和 <code>SHA256SUMS</code> 等预期资产。
- 下载资产的 SHA-256 与 <code>SHA256SUMS</code> 一致。
- Windows 产物明确标注“未签名”；Linux AppImage 可执行。
- macOS DMG 明确标注“未签名”，并记录首次打开可能触发 Gatekeeper 提示。
- Release notes 与 [CHANGELOG](../CHANGELOG.md) 只描述当前修改版，不把上游未验证功能写成当前能力。
- 下载后在至少一台 Windows x64、一台 Linux x64 和一台 Apple Silicon macOS 机器上完成启动、打开图片、成对配对、切换三种模式和退出检查。
- 确认没有把原始图片、用户日志、证书、token、<code>node_modules</code> 或 <code>dist</code> 上传。

验收通过后，才在 GitHub Release 页面取消 Draft 并发布。预发布阶段可以保留 Pre-release 标记；不要为了让版本“看起来稳定”而省略已知限制。

## 7. 建议的 Release Notes 模板

~~~markdown
## MegSpot 2.2.12-vv1.0.8

这是基于 MegEngine/MegSpot 2.2.12 的非官方二次开发预发布版本，由 DynamaxVV 维护。

### 主要变化

- 完善 LP 标注文档排序、跨侧匹配、空页保留、“拷贝”后缀和 `999` 发布页处理。
- 支持选择左侧或右侧基准图，优化审校模式状态、抽屉布局和单页缺图显示。
- 图片内容变化自动刷新，LP 文档改用内容 MD5 判断变化，并修复错误配对、同组混排和文件列表显示类型问题。
- 发布流程支持 macOS runner 交叉构建 Windows，并检查是否打包了嵌套 Electron 运行时。
- 应用采用单实例模式；生产环境使用明确的本地 HTML 文件加载和失败诊断。

### 下载

- Windows x64 Portable：未签名，Windows SmartScreen 可能提示风险。
- Linux x64 AppImage：下载后赋予执行权限。
- macOS arm64 DMG：未签名，首次打开可能触发 Gatekeeper 提示；当前仅支持 Apple Silicon。

### 已知限制

- 这是预发布版本，尚未提供 Windows/macOS 代码签名与 macOS 公证。
- 当前公开版本只启用图片对比；图像快照、GIF、视频、HEVC/H.265、Linux 命令行和多语言界面流程暂不提供。
- 文件新增、删除或重命名后需要手动刷新配对。
~~~

## 8. 当前仍欠缺的稳定发布条件

首个预发布版本可以在明确警告的前提下使用未签名 Windows 和 macOS 产物；如果要升级为面向普通用户的稳定版本，还需要：

- Windows Authenticode 证书、证书安全存储和 CI 签名验证。
- macOS Developer ID Application、Developer ID Installer（如使用安装器）、Notarization 凭据和至少一台真实 macOS 设备验收。
- 跨平台启动、文件选择、GPU/大图和卸载/升级路径的手工冒烟记录。
- 固定的版本检查清单，确保 package、CHANGELOG、README、Release notes 和产物名称同步。
- 对外支持策略：Issue 模板、漏洞披露边界、日志脱敏提示和可复现问题的最小信息要求。
- 如未来恢复自动更新，必须重新设计更新源、签名、回滚和网络隐私说明；当前发布流程不依赖自动更新。

代码签名和公证的概念、平台要求及 Electron 配置见 [Electron Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)。electron-builder 的发布配置和 GitHub provider 说明见 [electron-builder publishing](https://www.electron.build/publish.html)。

## 9. 发布失败与回滚

- quality 失败：先修复代码或构建链，不发布平台产物。
- 单个平台 build 失败：保留失败日志；不要用另一平台产物冒充完整发布。
- Release job 失败：可以在同一个 tag 上重新运行失败的 job；若资产内容已经不可信，删除 Draft 后修复并使用新的递增版本 tag。
- 已公开版本发现严重问题时，先在 Release 标记说明并停止推广；修复后发布新的版本，不重写已经对外使用的 tag。
