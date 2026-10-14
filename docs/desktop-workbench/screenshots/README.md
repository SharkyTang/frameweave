# D2 八页界面截图

`desktop-*.jpg` 由真实 Tauri / WKWebView 的 Mac 窗口直接捕获；`browser-*.png` 来自本机 Chrome 的 1440×900 组件测试。示例页始终有演示提示，个人空态另列。原生工具返回 JPEG 字节，保存为 `.jpg`；没有将浏览器图片或补画内容替代原生截图。

| 页面 | FrameWeave 原生 1512 宽 | 最终应用 1024×680 | 浏览器组件 |
|---|---|---|---|
| 工作台 | [desktop-home.jpg](desktop-home.jpg) | [desktop-min-home.jpg](desktop-min-home.jpg) | [browser-home.png](browser-home.png) |
| 灵感素材库 | [desktop-library.jpg](desktop-library.jpg) | [desktop-min-library.jpg](desktop-min-library.jpg) | [browser-library.png](browser-library.png) |
| 视频拆解 | [desktop-analysis.jpg](desktop-analysis.jpg) | [desktop-min-analysis.jpg](desktop-min-analysis.jpg) | [browser-analysis.png](browser-analysis.png) |
| 创作导师 | [desktop-creator.jpg](desktop-creator.jpg) | [desktop-min-creator.jpg](desktop-min-creator.jpg) | [browser-creator.png](browser-creator.png) |
| 创作方法库 | [desktop-methods.jpg](desktop-methods.jpg) | [desktop-min-methods.jpg](desktop-min-methods.jpg) | [browser-methods.png](browser-methods.png) |
| 我的作品 | [desktop-works.jpg](desktop-works.jpg) | [desktop-min-works.jpg](desktop-min-works.jpg) | [browser-works.png](browser-works.png) |
| 爆款雷达 | [desktop-radar.jpg](desktop-radar.jpg) | [desktop-min-radar.jpg](desktop-min-radar.jpg) | [browser-radar.png](browser-radar.png) |
| 设置 | [desktop-settings.jpg](desktop-settings.jpg) | [desktop-min-settings.jpg](desktop-min-settings.jpg) | [browser-settings.png](browser-settings.png) |

两列均来自更名后重新构建的 FrameWeave.app。第一列为系统缩放后的 1512 宽，第二列为保留的 1024×680；图片像素尺寸与哈希见 BUILD_MANIFEST.json，不将 Retina 像素直接当作逻辑窗口尺寸。此前品牌截图已移至工程外备份。

其他原生证据：

- [最终个人工作台空态](desktop-final-personal-home.jpg)
- [新品牌应用冷启动、恢复深层页](desktop-native-relaunch.jpg)
- [修复后的退出确认](desktop-quit-confirm.jpg)
- [用户实际拖到最窄窗口](desktop-width-1024.jpg)
- [系统缩放后的窗口](desktop-window-zoomed.jpg)
- [1512 宽设置页](desktop-wide-settings.jpg)
- [全屏窗口](desktop-fullscreen.jpg)
- [原生播放控件状态](desktop-analysis-playing.jpg)

视频区域在原生截图中呈灰色；用户确认实际能看到正常视频，原生控件记录了 12 秒时长与播放进度。图片没有修补，捕获原因未单独测定，不能从这一效果推断播放器空白。

浏览器自动化检查 1024、1280、1440、1728 宽度的八页并测量横向溢出；本次原生观察宽度为 1024 / 1512。完整原生结果与人工未测项见 [NATIVE_VALIDATION.md](../NATIVE_VALIDATION.md)。
