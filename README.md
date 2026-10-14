# 逆向轻抖 · 视频创作者工作台

这是独立的 **Tauri 2 macOS 桌面应用**，当前交付到 D2：完整八页界面与隔离的演示流程。生产应用将界面、图标和自制视频内置在 `.app` 中，不需要浏览器、Node / Python 服务、下载插件或模型。

**当前限制：Mac 锁屏且用户暂时无法解锁，因此真实原生窗口验收待补做。不能把已通过的浏览器组件测试视作 WKWebView、Finder 或 Dock 测试。**

- 应用与运行说明：[D2 运行说明](docs/desktop-workbench/RUNNING.md)
- 实施与待验收状态：[CURRENT_STATUS.md](docs/desktop-workbench/CURRENT_STATUS.md)
- 阶段交接：[D2_HANDOFF.md](docs/desktop-workbench/handoffs/D2_HANDOFF.md)
- 八页截图：[截图索引](docs/desktop-workbench/screenshots/README.md)，均明确标记为浏览器组件截图。

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
