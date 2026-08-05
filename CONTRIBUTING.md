# 贡献指南

感谢你关注 MegSpot 二次开发版。本文件只约定 [DynamaxVV/MegSpot](https://github.com/DynamaxVV/MegSpot) 的协作方式；它不代表上游 MegEngine/MegSpot 的维护政策。

## 提交前

- 先搜索现有 Issue 和 Pull Request，避免重复工作。
- 影响行为的修改请补充最小可运行检查；配对、标注解析、资源释放和发布配置尤其需要留下可执行证据。
- 文档应以当前代码和实际界面为准，区分“当前支持”和“计划支持”。
- 不要提交原始用户图片、日志、证书、token、<code>node_modules</code>、<code>dist</code>、<code>build</code> 或本机临时目录。
- 不要为了修复文档而顺手升级旧版依赖；依赖升级需要单独评估和构建验证。

## 开发流程

1. 在本仓库创建分支，说明目标和影响范围。
2. 修改代码或文档，并保留与改动对应的最小检查。
3. 本地运行与修改相关的检查；发布相关变更至少运行 [构建与发布指南](docs/BUILD_AND_RELEASE.md) 中的配置和构建检查。
4. 提交 Pull Request，描述背景、实际行为、验证命令和未验证部分。
5. 等待维护者审阅；未经确认不要把 PR 标记为已发布。

## Commit 约定

使用 Conventional Commits：

- <code>feat:</code> 新功能
- <code>fix:</code> bug 修复
- <code>docs:</code> 文档更新
- <code>refactor:</code> 重构
- <code>test:</code> 测试或自检
- <code>build:</code> 构建、依赖或发布配置

示例：

~~~text
docs: refresh public release documentation
fix: preserve scoped dependency externals in web build
build: prepare unsigned windows and linux prerelease
~~~

## Pull Request 内容

PR 至少说明：

- 修改解决了什么问题，是否包含二次开发特有行为。
- 影响哪些平台、路由、文件格式或用户流程。
- 执行过哪些命令；哪些检查因环境限制未执行。
- 是否改变版本号、CHANGELOG、Release notes、许可或用户数据边界。
- 如果改动涉及日志、文件路径或网络，请说明脱敏和隐私影响。

保持 PR 小而聚焦。不要在一个 PR 中同时混入无关格式化、依赖升级和功能重写。

## Issue 反馈

请优先在本仓库提交 [Issue](https://github.com/DynamaxVV/MegSpot/issues)，并提供：

- MegSpot 版本和下载来源。
- 操作系统、架构和是否使用预发布版本。
- 可复现步骤、期望行为和实际行为。
- 涉及的图片格式与大致尺寸；不要默认上传原始内容。
- 必要时附上“设置 → 日志”中已经检查过敏感信息的片段。

安全问题不要在公开 Issue 中发布可直接利用的细节；先联系仓库维护者并等待处理方式确认。

## 许可与归属

本仓库基于上游 MegSpot 二次开发。上游代码和第三方依赖仍受 [LICENSE](LICENSE)、[COPYRIGHT](COPYRIGHT) 与 [ACKNOWLEDGMENTS](ACKNOWLEDGMENTS) 约束。

本仓库不要求贡献者签署上游 MegEngine 的 CLA，也不把仓库中的历史性 [CONTRIBUTOR_LICENSE_AGREEMENT.md](CONTRIBUTOR_LICENSE_AGREEMENT.md) 当作当前 PR 的提交条件。请只提交你有权提交的内容，并在引入第三方代码时同时说明来源、版本和许可证。

除非 PR 中另有明确书面约定，贡献应能在 Apache-2.0 许可兼容的范围内分发。
