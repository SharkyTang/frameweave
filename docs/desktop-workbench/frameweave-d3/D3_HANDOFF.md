# D3 交接

D3核心实现与本机主要原生闭环完成：原生选择 → 管理副本 → SQLite资料保存/搜索/收藏/归档恢复 → 真实播放与seek → 受控退出和重启恢复。没有开始D4。验收为 **50 PASS / 3 MANUAL_PENDING / 1 NOT_RUN**，不声称54项全部通过。

## 最新权限诊断：审批通路已实测可用（伦敦时间2026-10-15 00:00）

当前轮的approval_policy已在UTC2026-10-14 22:55:57.296从granular/sandbox_approval=false变为on-request；同一会话的工作区权限profile摘要完全相同。随后同一条 `/bin/ps -axo pid=,ppid=,rss=,comm=` 在默认沙箱内仍退出127，通过require_escalated正常审批执行则退出0并返回进程行。此前阻断是真实历史记录，但不再代表当前审批能力。无需再切同一模式开关或重建任务。

限制已定位到命令沙箱和该轮运行时审批策略。用户/项目/系统配置及com.openai.codex的两项MDM键未发现相应false；获准的独立只读config/read显示审批/沙箱键未显式设置、无对应origins，configRequirements/read返回requirements=null。尚无证据确定哪个UI或主机内部事件触发策略改变，不能称为已找到具体缓存故障。

下一步可对完整采样器命令申请沙箱外执行并实测；这次ps获准不等于采样器或原生启动也已获准。采样器路径、摘要与隔离参数见 [权限来源实证](evidence/permission-source-diagnosis-20261014.json)。本次没有启动FrameWeave、未采集导入RSS、未执行V37或人工项，54项仍为50 PASS / 3 MANUAL_PENDING / 1 NOT_RUN。原生启动和vmmap归属仍需实际验证，不因ps成功提前判通过。

## 前一次续做闸门（2026-10-14 UTC 22:51–22:52，历史）

本地续做任务已在真实工程 `/Users/shaoqitang/Documents/ChatGPT/FrameWeave` 执行，开始时工作区干净，HEAD为 `16357690a2b7789d56f03e7ace923627564ca1dd`，main追踪origin/main，远端地址符合AGENTS。D3 evidence目录的自有临时文件创建、读回及清理成功；写入范围已实际生效。

进程读取仍未获准：`ps -axo pid=,ppid=,rss=,comm=` 退出127，原文为 `zsh:1: operation not permitted: ps`。本任务sandbox_approval=false；虽有request_permissions工具，其可申请范围只有文件系统和网络，没有进程读取授权。本次未重复申请被禁止的提权，也未换API或Terminal界面绕过。按续做指令停在原生启动前，V13采样和V37原生导入/解码均未执行，RSS样本数0，无新增原生截图。不能确认当前是否有应用进程；不将历史正常退出记录当作本次进程核验。

本次只读复核：61项源码摘要与BUILD_MANIFEST全部匹配，最终exe与ZIP摘要仍匹配；隔离库各表与旧SQLite Backup API快照一致，2个资产、4次尝试、0活动尝试、staging空；正式根仍仅shell.json，其解析值与续做前一致。三份已准备的编码样本大小/摘要匹配原记录，仍未原生选择或播放；FFmpeg历史预检不替代WK结果。未改产品代码、未重建、未提交或推送。

本次真实证据：[权限闸门](evidence/followup-permission-gate-20261014T225141Z.json)、[只读保护复核及夹具摘要](evidence/followup-readonly-audit-20261014T225249Z.json)。旧任务的pending-repo-update未直接套用，原记录与快照继续保留。54项状态不变。下述历史检查数量不是本次重新运行结果。

下一前提是执行环境实际允许进程读取；当前任务没有可申请该授权的工具范围。前提满足前不启动最终包、不安排中文IME或系统断网人工验收、不进入D4。满足后沿用旧任务d3-followup中的采样器，先验无既有实例和隔离根，再在BASELINE_READY_USE_NATIVE_PICKER后用真实选择器导入长片；之后逐个验三份编码样本。无需重新开发D3或覆盖既有数据库。

## 交付位置

- 最终应用：`/Users/shaoqitang/Documents/ChatGPT/FrameWeave/deliverables/D3/FrameWeave.app`
- 压缩包：`/Users/shaoqitang/Documents/ChatGPT/FrameWeave/deliverables/D3/FrameWeave-D3-mac-arm64.zip`
- 清单与校验：同目录 `BUILD_MANIFEST.json`、`SHA256SUMS.txt`
- 源码：`apps/desktop/src`、`apps/desktop/src-tauri/src`；新增Rust personal/imports/commands/schema/tests，复用既有领域、adapter、Repository及八页。
- 本目录：D3_WORKLOG.md、D3_DATA_CONTRACT.md、D3_NATIVE_VALIDATION.md、D3_TEST_RESULTS.json、D3_SCREENSHOT_INDEX.md、evidence/、screenshots/。

最终打包核验通过：D3-V52/53 为 PASS；架构、字节数、签名与 SHA-256 见 deliverables/D3/BUILD_MANIFEST.json。
最终可执行文件SHA-256：`407b4b2ff9ca89eb93c79bba28bc504f5b1e133f2f329033acdd14e8ff97fc20`。版本0.1.0、arm64、ad hoc；没有Developer ID/公证。最后代码修改后已重建并对这个最终包复验，用户明确确认“最终包画面和音调都正常”。

## 已交付行为

Rust拥有SQLite和文件。运行时AppData与shell分离，schema1、短事务、revision冲突、参数校验、进程写锁、损坏/过新阻断；无自动删库。原生多选结果保留在Rust，前端只用10分钟token；顺序1MiB分块复制/hash、20项/5GiB限额、逐项真实进度与取消。只复制原视频；发布+SQL有可核对恢复证据，重复内容只一份，归档重复不恢复，同内容缺失修复保持ID和资料。

个人资料等待DB确认；失败/冲突保留输入；离开/退出受保护。首页与素材库为真实数据，个人拆解页不套演示字幕/笔记/AI分析。按asset id授权精确正式文件，静态scope空、CSP开启；没有全home/AppData目录权限或通用fs/SQL/shell入口。Cmd+Q保留受控退出并安全收尾导入；Cmd+W与重复启动恢复同一实例。

最终包实测自制H.264/AAC MP4：180秒样本含音轨、原生画面/声音人工确认；1.95GiB/约150分钟样本真实导入、75分钟seek与倍速/暂停。最终原生重复导入、导入中两条退出路径、深层冷启动、缺失/归档/不存在路由、源文件移走后播放、两档窗口八页均有证据。灰色视频截图原样保留，人工确认与事件证据另列。

## 检查结果

实际工作目录为 `apps/desktop`（根目录没有package.json）。本轮最终执行：typecheck、ui:build、npm test **25通过**、native:test **27通过**、test:ui **10通过**、Prettier、Rustfmt、desktop:build，全部成功；详见D3_TEST_RESULTS及带UTC/退出码的日志。它们不是54项原生验收的等价替代。修正过一次Rust标记比较编译失败，原失败日志也保留。

最终原生负向URL请求：正式媒体可加载；DB/shell/staging/recovery/源/符号链接不可加载，另有Tauri真实scope测试；没有虚报HTTP状态码。故障注入在隔离库，正式库没有被用于测试。

## 资料与保护

正式数据根由运行时解析，本机为 `~/Library/Application Support/com.sharkytang.frameweave.workbench`：shell.json保留，新业务库将位于data/frameweave.sqlite3，视频位于media/originals。首次正式启动会建立空个人库，不seed演示。此次测试结束正式根仍仅shell；窗口位置x/y相对保护副本变化，route/尺寸保留，未回写旧备份覆盖偏好。

原生测试根为 `/private/tmp/frameweave-d3-native-validation`，不是正式库。2个测试资产/4个尝试、staging为空；原素材id=92435947-9fdc-42f9-bf91-e979e497d6d8、revision4、favorite=true；另一个150分钟asset=aa474f2c-dba5-4a31-8fdc-b3f6a1f1733f。测试进程已正常退出，路由故障夹具与自制源已恢复，不需要清空任何库。

保护副本：`/Users/shaoqitang/Documents/Codex/2026-10-14/macos-frameweave-d3-1-agents-md-2/protection`，含原源码/Git状态、D2全产物、更名临时备份稳定副本和原shell。更名原临时备份也仍存在；未再次迁移。隔离库有SQLite Backup API一致快照：本对话目录下native-first-snapshot、native-after-cancel-snapshot、native-before-routing-snapshot。不是产品备份恢复功能，不把活动主库单文件拷贝冒充完整备份。

D3实现会话当时HEAD为4338b275185aad08889f0748bb20c3971fceb90b，origin为https://github.com/SharkyTang/frameweave.git，开始时6份D3输入untracked而无staged/unstaged；这是历史基线，当前续做HEAD见本页最新闸门记录。输入和AGENTS保留。当时所有新增/修改均未自动暂存、提交、推送或stash/reset/clean。D2目录保留，不覆盖D2交付；现有Cargo锁定包版本保留，只增加新依赖所需项。

## 待验及下一项准确动作

1. **D3-V13 MANUAL_PENDING**：在标记隔离根启动最终包，采集导入前、1.95GiB导入中与结束后的主进程及WebKit RSS时间序列；当前已测完整导入/UI响应，播放峰值不能冒充导入内存测试。不要在正式AppData压测。
2. **D3-V37 MANUAL_PENDING**：准备标准封装且已知目标系统不能解码的自制样本，经原生面板选入后打开，确认准确的损坏/编码提示及无转码/联网；当前37字节候选Open禁用，未产生业务记录。MOV/HEVC/ProRes等均不声明支持。
3. **D3-V48 MANUAL_PENDING**：使用真实中文输入法候选组合验证Enter/Esc/Cmd+S及焦点恢复；普通中文和组件isComposing不替代。
4. **D3-V51 NOT_RUN**：在用户可控的实际断网环境复验本地闭环并记录；本轮没关闭系统网络。

另保留原生“缺失后同内容重新导入”完整UI复验、Finder双击/实际Dock、外接屏、其他机器/系统和物理故障等范围说明。Rust同ID修复、演示重置隔离与恢复窗口已测试，通过层级请看54项映射。没有将人工未测项改成PASS。

已停在安全边界：最终测试进程退出，无活动队列，管理副本/DB一致，暂存为空，正式AppData无测试业务数据。若续做先读本目录交接与D3_WORKLOG，从上述待验项继续，禁止删库重建、覆盖当前工作区或重跑品牌迁移。若要回退应用，保留D3库/副本并改用保留的D2.app；D2不读D3业务库。不要让旧版本降级改写schema；备份应在关闭应用后或通过SQLite Backup API一致进行，不能自动覆盖恢复。

D4前提只是确认本轮剩余验收并取得下一阶段授权；本轮没有实现字幕、个人时间笔记、AI/下载/雷达、插件服务、项目/脚本/方法/作品持久化、永久删除、目录扫描、云同步或备份恢复。


补充格式核对：现有Prettier检查与本轮变更/新增Rust文件的Rustfmt检查通过。额外全量Rustfmt对未改动的src-tauri/src/main.rs报原有单行格式差异，文件与保护副本字节一致；失败日志保留于evidence/rustfmt-existing-main.log/json，没有将这次全量检查写作通过。
