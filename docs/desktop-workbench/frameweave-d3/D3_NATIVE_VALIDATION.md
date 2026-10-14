# D3 原生验证

主要闭环在实际生产 `.app` 完成；以下原生证据与 Rust/React/浏览器分开。不是54项全部通过。

- 系统：macOS 26.6.2（25G83），arm64；本机WKWebView。
- 最终运行包：`/Users/shaoqitang/Documents/ChatGPT/FrameWeave/deliverables/D3/FrameWeave.app`。
- 最终可执行文件 SHA-256：`407b4b2ff9ca89eb93c79bba28bc504f5b1e133f2f329033acdd14e8ff97fc20`。
- 首轮生产包 SHA-256：`b721cd3db65cddd7050431994551d5c5380d1fce9c621464630a88a43e33681e`；首轮资料编辑/归档证据明确归属于首包，不冒充最终包重新操作。
- 原生资料根：`/private/tmp/frameweave-d3-native-validation`，只有进程显式测试环境与标记允许覆盖。最终测试进程均正常退出，未留下全局环境设置。
- Vite 已停止；最终包的导入、播放、查询、重启均在无开发服务器时完成。未做系统实际断网。
- 最后产品代码修改后重新构建：UTC 21:19:13–21:19:28，详见 evidence/desktop-build.json/log；之后仅做测试夹具、证据与文档/打包。
- 最终打包核验通过：D3-V52/53 为 PASS；架构、字节数、签名与 SHA-256 见 deliverables/D3/BUILD_MANIFEST.json。

## 已完成的原生过程

1. 先在空隔离库启动，默认个人空态。原生选择取消没有建立假素材；手动选择中文、空格、#、%文件名的自制MP4，真实字节进度后imported。SQLite与管理副本匹配，源SHA不变。
2. 首包原生编辑标题`D3 原生验证 😀 <b>按纯文本</b>`、三标签、备注和目标；Cmd+Q触发草稿保护，继续后输入保留，再明确保存、收藏、归档、主动恢复。退出后SQLite资料保存，revision=4。
3. 最终包冷启动同一asset `92435947-9fdc-42f9-bf91-e979e497d6d8`，深层页恢复，默认暂停00:00；180000ms、640×360为实际加载值。再次导入同内容返回“已在素材库”，没有第二asset或资料覆盖。
4. 最终包原生Play/Pause、进度条中段seek、1.5×选择；3分钟测试片从90秒后实际onTimeUpdate继续。150分钟长片跳到约75分钟后继续推进并可暂停，见原始AX文本。
5. 最终包通过原生选择导入2,096,466,000字节长片，SQL imported。再次导入中Cmd+Q，操作“继续导入”，再Cmd+Q“取消未完成导入并退出”。进程退出码0；第二次attempt cancelled，已复制519,045,120字节，asset_id为空；staging为空，两个既有资产保留。
6. 仅在隔离根移走管理副本，原生冷启动显示缺失且资料/目标保留。Rust同内容修复同ID测试通过；额外原生修复面板没能提交选择，未把这段写成原生修复成功。随后将明确归属的测试副本原样放回。
7. 移走自制原视频及同内容候选，再冷启动原生包仍能加载和播放正式管理副本，时间推进到00:22；随后恢复测试源。没有操作用户原视频。
8. Cmd+W隐藏保留进程；同隔离根第二次启动进程立即退出0并唤回原窗口/同深层页，没有第二写队列或重复attempt。实际Dock鼠标点击未测。
9. 原生最窄1024×680与常用1512×867，八页逐页截图和AX记录。浏览器另有四宽度回归，不当作四档原生验收。
10. 归档路由、缺失路由、不存在UUID路由分别冷启动：归档有明确标签、返回入口和默认暂停媒体；不存在有清楚提示，可返回真实个人库。路由/归档故障夹具只改隔离根，已有一致DB与shell快照，测试后已恢复。

最终隔离状态：schema1、DELETE journal、foreign_key_check无异常；2个asset、4个attempt（imported、duplicate、imported、cancelled），staging为空。第一条资料revision4/favorite=true/archived_at=null，标题/备注/目标仍在。详细值见 evidence/native-final-state.json。

## 画面与音频的证据边界

原生捕获的视频区域为灰色，原JPEG全部保留。没有拼接、编辑或用浏览器帧替换。实际播放时间来自个人video的事件/控件，最终用户另外明确回复：**“最终包画面和音调都正常”**；首包回复为“画面正常，也能听到音调”。最终人工确认对应上述最终可执行文件。工具不能独立听声音，也没有将灰色截图称为画面像素验证通过。150分钟片的播放/seek有原生事件证据，但没有再次单独索取长片画面/听感确认。

AX直接setValue/End/某些坐标seek尝试没有生效，坐标接口还返回noWindowsAvailable；只记录实际发生的90秒及约75分钟seek，不虚报150秒或112分钟。重新启动时个别ScreenCaptureKit -3811/-3812错误通过重新读取AX恢复；原始已捕获截图仍保留。

## 实际媒体矩阵

| 素材 | 已知封装/编码 | 大小/实际时长 | 原生结果 | 未覆盖 |
|---|---|---|---|---|
| 原生音轨 空格#%.mp4 | MP4；H.264 yuv420p 640×360/24fps；AAC mono48kHz | 41,930,946字节；WK180000ms | 原生选择/复制/SHA、实际画面和音调人工确认、播放暂停、90s seek后推进、重启 | 不代表全部H.264 profile/音轨/容器 |
| 长片_150分钟_约2GiB.mp4 | 50段以上述文件stream-copy拼接；同编码 | 2,096,466,000字节；WK9001045ms | 原生成功入库、SHA匹配；约75分钟seek推进、1.5×、暂停；另一次导入安全取消 | 没有完整播放150分钟；无人再次逐段画面/听感确认 |
| 不可解码.mp4 | 37字节自制FTYP候选，无有效视频轨 | 37字节 | 原生picker Open禁用，未入库 | 实际WK解码失败路径MANUAL_PENDING；不是已验证“不支持编码”样本 |
| 取消退出验证.mp4 | 原测试片后truncate至1GiB的早期候选 | 1,073,741,824字节 | picker未提交；没有记成功/取消证据 | 后来用有效1.95GiB长片完成退出测试，不能混淆 |
| D2 three-scenes.mp4 | 已有无声H.264演示 | 保留原文件 | 浏览器既有播放/seek回归；本轮原生演示页面回归 | 不能作为D3音频证据 |
| MOV / HEVC / ProRes / 其他MP4编码 | 未测 | — | 未声明支持 | 需要每类实际原生样本；无自动转码 |

来源为本机FFmpeg合成testsrc2与轻声440Hz正弦，无私人或下载媒体。测试片为本轮自制内容，可用于本轮复验，不附入生产包。源SHA：`258cb8675c3e8b0012c432ae5cc16a6813ccffd2512694bb9a5184c8341c821c`；长片SHA：`5451bc9a284cade2ca338204c613fd66a7cdb57ebd7bf22aa8cb998b40cf4618`。

生成策略（只作开发夹具，产品不依赖FFmpeg/Python）：

```sh
ffmpeg -f lavfi -i testsrc2=size=640x360:rate=24 -f lavfi -i sine=frequency=440:sample_rate=48000 -t 180 -c:v libx264 -preset ultrafast -pix_fmt yuv420p -g 48 -c:a aac -b:a 96k -af volume=0.08 -movflags +faststart "$TEST_ROOT/input/原生音轨 空格#%.mp4"
ffmpeg -stream_loop 49 -i "$TEST_ROOT/input/原生音轨 空格#%.mp4" -c copy -movflags +faststart "$TEST_ROOT/input/长片_150分钟_约2GiB.mp4"
```

原生主进程播放测量：180秒文件会话峰值RSS124,846,080字节；长片会话130,383,872字节。是`/usr/bin/time -l`对Rust主进程的本次测量，不包括WebKit子进程，也未覆盖2GiB导入期间RSS；不能据此宣称所有导入体量内存已实测。V13保留导入RSS序列待验。

## 实际媒体URL负向验证

最终包显式开启隔离测试探针，在真实WKWebView创建video请求固定目标。唯一正式管理副本loadedmetadata=true，duration180000、640×360；数据库、shell、staging文件、recovery文件、原视频路径、指向DB的未登记媒体符号链接均loaded=false/errorCode4，且Tauri FsScope断言拒绝。结果见 evidence/native-media-probe-final.json。该结果不是HTTP403抓包，也不是“任意文件全部不可读”的无限域证明；Rust路径/绝对路径/编码越界/链接测试补充覆盖。探针固定哨兵已从隔离根清理，普通个人资料根不能启用。

## 待验与限制

- D3-V13：有效1.95GiB导入和UI响应已测；导入期间主进程/子进程RSS序列、接近5GiB持续压力未测。
- D3-V37：损坏/不支持编码的最终原生解码错误还待可提交样本；当前37字节候选Open禁用。已有Rust头部拒绝与错误UI实现，不能替代这一原生检查。
- D3-V48：真实中文输入法候选组合、候选Enter/Esc、Cmd+S组合尚待人工；组件isComposing和普通中文输入不替代。
- D3-V51：未实际关闭系统网络；静态CSP和浏览器请求检查不替代。
- 原生修复流程的额外面板提交待人工复验，Rust同内容/同ID/元资料保留测试已通过；最终原生重置演示完整流程未另行完成，隔离逻辑测试通过。
- Finder双击、实际Dock点击、外接屏断开、其他macOS/机器、系统声音设备切换、物理断电/磁盘填满均未测。
- 无Developer ID、无公证；ad hoc本机严格签名验证通过，不宣称跨机器Gatekeeper无提示。

正式资料目录复核只有shell.json；没有创建业务库或导入测试视频。与保护副本相比shell仅x/y位置变化，route与1024×680尺寸相同；保留当前偏好，没有覆盖回旧备份。故障全部在标记隔离根；没有重复迁移旧品牌目录。
