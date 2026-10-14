# 当前阶段

- 日期：2026-10-14
- 本轮：桌面工作台 0.1.0，授权 D0 → D1 → D2，之后停止。
- D0：通过。空 Git 仓库、工具链和边界已核实，见 DECISIONS.md。
- D1：桌面壳与生产构建完成；既有原生验证通过。品牌更新为 FrameWeave / 映构，新包独立启动、菜单名称、受控退出、全屏及深层路由恢复已复核；人工 Finder 是更名前的 D2 验证，本次未重复。未测项见 NATIVE_VALIDATION.md。
- D2：8 页与隔离示例流程已实现。更名后重跑 16 项组件/逻辑、2 项 Rust、10 项浏览器测试通过；英文品牌四宽度溢出检查通过。新品牌原生 1024 / 1512 各八页截图已更新。
- 当前停止位置：D2 开发与本机核心运行交付完成。解锁后已补齐真实桌面证据；Cmd+Q 实机发现的提示绕过问题已修复、重新打包并回归。
- 真实个人 SQLite、媒体导入/播放/重启恢复：下一轮 D3。
- 真实 AI、下载插件、模型、榜单、云服务、API Key：本轮不实施。
- 生产 `.app`：`deliverables/D2/FrameWeave.app`；副本 ZIP 与 SHA-256 见同目录清单。本机 ad hoc 签名，未 Developer ID 签名、未公证。
- `desktop-*.jpg` 为真实 Mac 原生窗口，`browser-*.png` 为组件截图；工具捕获的视频区域呈灰色，用户确认实际画面正常，未修图。
- 运行说明：RUNNING.md；交接：handoffs/D1_HANDOFF.md 与 handoffs/D2_HANDOFF.md。
- 保留待验：输入法候选词、外接屏拔除、实际 Dock 鼠标重开、最小化视觉过程、原生 1280/1728。没有将这些环境检查勾为通过。
- 下一开发阶段唯一目标为 D3，需下一轮授权。本轮不继续开发。
- 交付收尾：FrameWeave.app 与 ZIP 已同步到 deliverables/D2，严格签名验证通过；1420 无监听，新包原生冷启动后运行正常。壳偏好目录同步更名并保留 1024×680、x588/y236。
- 文件清单：CHANGED_FILES.md；浏览器原始结果：BROWSER_TEST_RESULTS.json；原生结果：NATIVE_TEST_RESULTS.json、NATIVE_VALIDATION.md；最终构建与哈希清单：deliverables/D2/BUILD_MANIFEST.json、SHA256SUMS.txt。
- Git：本轮没有提交或推送。执行中新增的 AGENTS.md、origin 和已有暂存内容已保留；收尾修复与证据文件没有重新暂存。

- 品牌更名收尾：根目录现为 `/Users/shaoqitang/Documents/ChatGPT/FrameWeave`，旧标识系统缓存已归档；从新路径已实际打开 FrameWeave.app，类型检查通过。详见 REBRAND_HANDOFF.md。
