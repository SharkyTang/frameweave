# 当前阶段

- 日期：2026-10-14
- 本轮：桌面工作台 0.1.0，授权 D0 → D1 → D2，之后停止。
- D0：通过。空 Git 仓库、工具链和边界已核实，见 DECISIONS.md。
- D1：实现与生产构建完成；原生规则测试通过。Finder / WKWebView / 菜单 / 窗口行为实测待补，不标为阶段整体验收通过。
- D2：全部 8 页、组件系统、隔离示例流程已实现；16 项逻辑/组件测试、2 项 Rust 规则测试、10 项浏览器流程测试通过。四种宽度、无横向溢出、键盘焦点与中文长标题已检查。
- 当前停止位置：D2 实现交付。Mac 锁屏，用户明确回复“暂时无法解锁，先完成其余验证”。原生截图与真实桌面门槛待补；没有使用浏览器证据冒充原生通过。
- 真实个人 SQLite、媒体导入/播放/重启恢复：下一轮 D3。
- 真实 AI、下载插件、模型、榜单、云服务、API Key：本轮不实施。
- 生产 `.app`：`deliverables/D2/逆向轻抖.app`；副本 ZIP 与 SHA-256 见同目录清单。本机 ad hoc 签名，未 Developer ID 签名、未公证。
- 所有现有截图为 `browser-*` 组件截图；没有 `desktop-*` 截图。
- 运行说明：RUNNING.md；交接：handoffs/D1_HANDOFF.md 与 handoffs/D2_HANDOFF.md。
- 下一动作：解锁后补 D1/D2 原生验收；下一开发阶段唯一目标为 D3，需下一轮授权。
- 交付收尾：最终 `.app` 与 ZIP 已实际复制到 deliverables/D2；副本 `codesign --verify --deep --strict` 通过。测试服务器已停止，1420 端口无监听。应用在服务器停止后的实际启动仍待解锁验证。
- 文件清单：CHANGED_FILES.md；最终浏览器测试原始结果：BROWSER_TEST_RESULTS.json；构建与哈希清单：deliverables/D2/BUILD_MANIFEST.json、SHA256SUMS.txt。
