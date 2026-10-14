# FrameWeave · 映构：品牌更名交接

2026-10-14，范围是当前工作台的品牌更新，开发阶段仍为 D2。

| 位置 | 最终名称 |
|---|---|
| 应用与主品牌 | FrameWeave |
| 中文品牌 | 映构 |
| 工程根目录 | `/Users/shaoqitang/Documents/ChatGPT/FrameWeave` |
| 应用包 | `deliverables/D2/FrameWeave.app` |
| 压缩包 | `FrameWeave-D2-mac-arm64.zip` |
| macOS 标识 | `com.sharkytang.frameweave.workbench` |
| npm package | `frameweave-desktop-workbench` |
| Rust executable / library | `frameweave-workbench` / `frameweave_workbench_lib` |
| 本机资料目录 | `~/Library/Application Support/com.sharkytang.frameweave.workbench` |

界面侧栏、窗口标题、HTML 标题、系统菜单、设置与诊断信息已同步；两份工程内计划/提示词也更新了文件名、标题、引用及品牌约定。目录仍保留 apps/desktop、docs/desktop-workbench 等描述功能的名称。

既有未提交的 D2 退出修复与原生验证记录全部保留。更名前源码、工作区差异、应用 ZIP 和 shell.json 备份位于 `/private/tmp/frameweave-rebrand-20261014-8142b955/`；旧截图和旧编译产物放在该目录的 retired-files。备份是临时目录，若需长期保留，应另行复制。Git 历史和 Downloads 原始附件作为来源保留，没有改写历史；独立下载插件工程保持原范围。

旧资料目录原本仅含 shell.json。应用退出后直接迁移目录，保留窗口和最后页面；新标识下已验证 1024×680、物理位置 x588/y236。旧标识的 Caches / WebKit 目录移至同一备份的 system-state-before-rebrand，保留内容供回退。没有业务数据库迁移或新增 D3 功能。

验证：16 项组件/逻辑、2 项 Rust、10 项浏览器流程测试通过；四种宽度的品牌文本边界检查通过。FrameWeave.app 生产构建、严格 ad hoc 签名、无服务器原生启动、菜单名称、八页窄/宽窗口、全屏、退出保护与深层路由恢复已检查。26 张原生和 8 张浏览器截图全部换为新品牌，详见截图索引。最终产物内容与哈希见 BUILD_MANIFEST.json。

本次未提交或推送。根目录移动后，在 Codex 重新选择 FrameWeave 目录；Git 仓库仍为既有 frameweave，原有提交与工作区内容随目录保留。下一开发阶段仍需单独授权 D3。
