# FrameWeave · 映构

这是独立的 **Tauri 2 macOS 桌面应用**，当前交付到 D2：完整八页界面与隔离的演示流程。生产应用将界面、图标和自制视频内置在 `.app` 中，不需要浏览器、Node / Python 服务、下载插件或模型。

**品牌统一为 FrameWeave，中文名为映构。**应用包、菜单、诊断信息、包名、标识、资料目录及工程文件名已同步更名。新包在没有开发服务器时独立启动，八页原生截图、退出保护和重启恢复已复核；此前 D2 的人工 Finder 验证通过，本次更名后未重复人工双击。见 [更名交接](docs/desktop-workbench/REBRAND_HANDOFF.md) 与 [原生验收记录](docs/desktop-workbench/NATIVE_VALIDATION.md)。

- 应用与运行说明：[D2 运行说明](docs/desktop-workbench/RUNNING.md)
- 实施与待验收状态：[CURRENT_STATUS.md](docs/desktop-workbench/CURRENT_STATUS.md)
- 阶段交接：[D2_HANDOFF.md](docs/desktop-workbench/handoffs/D2_HANDOFF.md)
- 八页截图：[截图索引](docs/desktop-workbench/screenshots/README.md)，分列真实 Mac 窗口与浏览器组件截图。

个人工作区默认空。示例可编辑但只保留在本次会话，退出恢复初始内容。真实 SQLite 和个人视频导入在下一轮 D3 实现；本轮未修改或接入下载插件、ASR、AI、模型或榜单。

从独立 package 启动开发：

```sh
cd apps/desktop
npm ci
npm run desktop:dev
```

构建与测试：

```sh
npm run typecheck
npm test
npm run native:test
npm run desktop:build
```

界面自动化需要另一个终端运行 `npm run ui:dev` 后执行 `npm run test:ui`，仅用于组件验证。已安装的工程内 Rust 由启动脚本自动识别，不必改系统 PATH。新机器需要 Rust 和 macOS 构建工具；当前 package / Cargo 锁文件可复现依赖。
