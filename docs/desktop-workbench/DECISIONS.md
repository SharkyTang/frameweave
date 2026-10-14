# D0 实现决定

2026-10-14；范围仅 D0 → D1 → D2。

1. 当前工作目录是独立空仓库，`main` 尚无提交，无 remote、源码、README 或适用 AGENTS.md。检查时无用户未提交成果。只新增 `apps/desktop`、根忽略规则、README 和本交接目录；不访问、移动或修改其他工程的插件/Python 实现，不探测历史端口。
2. 采用 Tauri 2 + React + TypeScript + Vite、npm 独立 package。用户于 2026-10-14 确认品牌 FrameWeave / 映构；最终标识为 `com.sharkytang.frameweave.workbench`，窗口壳偏好目录已迁移并保留内容。使用系统 WKWebView，生产资源打包在应用内。后续 D3 用 Rust Repository + SQLite；D2 不提前实现真实业务持久化。
3. macOS 26.6.2 arm64，Node 26.0.0，Xcode 已安装；初始没有 Rust。工具链安装脚本限定在 `.toolchains`，不改 shell 配置、不使用 sudo，安装动作按环境审批。Rust/Node 实际安装版本以锁文件、交付测试记录为准。
4. 本次提供的两份 Markdown 已完整读取。用户后续授权品牌更名，工程内计划和提示词已更新为 FrameWeave / 映构副本；更名前文件已独立备份。Downloads 与工程均未找到 `references/workbench-visual-reference.png`，因此按计划文字实现浅色 Mac 风格，不声称看过参考图。
5. 个人工作区默认空。演示使用独立内存 Repository，可走学习/创作/方法/复盘流程，明确提示退出会丢失。只有窗口和最后页面等桌面壳偏好可以由 Rust 保存 JSON；不用 localStorage 保存业务数据。
6. 主窗口单实例；Mac 关闭隐藏窗口，Dock 激活重新显示，退出结束进程。退出有未保存演示编辑时提示。原生文件/编辑/窗口菜单及快捷键；深层路由用 hash，生产不需要服务器回退。
7. 本阶段最小原生命令只读取应用诊断、保存有限壳偏好、明确退出。无任意文件、shell、SQL、网络接口，未接入 AI/下载/雷达从服务层返回明确错误。
8. 新工程无现有可运行基线。回退可将本轮新增目录移出工程；不执行 reset/clean、不提交、不发布、不改变用户机器的安全设置。

## 执行后的版本与验证补充

- 工程内 Rust 1.99.0，Cargo.lock：Tauri 2.12.3、single-instance 2.5.3；npm 锁文件：React 19.3.1、Tauri API 2.12.3 / CLI 2.12.2、Vite 7.3.7、TypeScript 5.9.3、Vitest 5.0.4、Playwright 1.64.1。
- 初选 Vitest 的审计提示已通过升级到修复版本解决；最终安装审计报告 0 个已知 npm 漏洞。未升级其他用户工程。
- 原生命令收口在 `adapters/desktop.ts`：`shell_info`、`remember_route`、`quit_application`。无任意 SQL、shell、文件接口；路径与日志不承接私人内容。
- 生产 `.app` 使用框架 ad hoc 签名（`signingIdentity: "-"`），实际签名验证通过。没有使用开发者证书、Apple 账号或公证。
- 已应用 React 检查技能核对 hooks、统一监听清理、可见焦点、表单标签、弹窗焦点与不可信文本；源码经 Prettier 整理。未引入云服务。
- 首次原生验证受锁屏阻挡；用户解锁后补做真实窗口验证。八页、原生命令、菜单与示例流程已操作；Finder 双击由用户完成后复核；详细证据和未测项见 NATIVE_VALIDATION.md。Windows/Linux、其他 Mac、全部编码和实际外接屏拔除无通过声明。
- 实机发现 macOS 预定义 Quit 直接终止，跳过示例变更提示；替换为普通 Cmd+Q 菜单项，通过现有受控退出事件处理。最终 `.app` 重新构建，提示/取消/确认退出均原生回归通过。
- D0 所述 Git 状态是开始执行时的快照。后续出现的 AGENTS.md、frameweave origin 和暂存文件按实际状态保留，本轮没有覆盖 Git 配置、提交或推送。

官方依据（执行时已访问）：[桌面前置](https://v2.tauri.app/start/prerequisites/)、[Mac 应用包](https://v2.tauri.app/distribute/macos-application-bundle/)、[菜单](https://v2.tauri.app/learn/window-menu/)、[单实例](https://v2.tauri.app/plugin/single-instance/)。这些说明框架能力，不是本工程已实机验收的证据。
