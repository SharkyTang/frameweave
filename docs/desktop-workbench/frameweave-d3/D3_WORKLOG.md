# D3 工作日志

唯一范围：Rust SQLite、原生选择和管理副本、素材资料保存、真实播放及重启恢复。停止在 D3。

## D3.0 / G0

- 实际工程：/Users/shaoqitang/Documents/ChatGPT/FrameWeave；package 为 apps/desktop。唯一适用 AGENTS.md 为根目录文件。
- HEAD：4338b275185aad08889f0748bb20c3971fceb90b。开始时无 staged/unstaged 修改，仅六份 D3 输入文档 untracked。这与交接历史不同，以实际状态为准，全部保留。
- 规划附件与工程副本 SHA256 相同：0e99de82c058fb5a8919b151640b7ac7809d0d575ea189616fab2d390c404f14。sources 两份交接哈希匹配原文。
- origin、identifier、npm/Rust 名称不改；不再次迁移品牌目录。正式 AppData 当前只有 shell.json，没有需迁移的个人 SQLite。
- 更名临时备份存在；稳定保护副本：/Users/shaoqitang/Documents/Codex/2026-10-14/macos-frameweave-d3-1-agents-md-2/protection，含源码、Git 状态/diff、D2 全产物、更名备份及 shell.json。未修改原备份。
- 本轮基线：npm run typecheck PASS；npm test 16 PASS；npm run native:test 2 PASS。不是复制历史通过数。
- 测试资料：Rust 独立 tmp 根；生产包使用显式的 /private/tmp/frameweave-d3-native-* 本轮测试根。不向正式 AppData 导入测试数据。

## 既有实现 → D3 扩展

| 既有边界 | D3 扩展 |
|---|---|
| VideoAsset / Workspace (src/domain.ts) | 扩展导入来源、revision、未知元数据及存储/播放状态，不另造 Workspace |
| WorkspacePort / SessionWorkspaceAdapter | 演示仍只装配 fixtures；个人从 Rust 读 assets，其余 D4/D5 集合为空 |
| src/adapters/desktop.ts | 新增类型化业务调用及媒体转换，页面不 invoke、不拼路径 |
| Library / Dashboard / Analysis | 复用卡片、详情表单及播放器，只接个人素材相关操作 |
| src-tauri/src/lib.rs | 保留 shell.json、受控 Quit、ExitRequested、Cmd+W hide、single-instance、Reopen；增加导入安全停机 |
| personal.rs | schema v1、DELETE journal、FULL synchronous、5s busy timeout、外键、短事务、单 Mutex 写协调 |
| imports.rs | 原生 rfd → 10分钟 token → 顺序 worker → staging → 不覆盖发布 → SQL确认，不存源路径 |
| 媒体权限 | 内置 asset protocol；静态 scope=[]，resolve 时仅 allow_file 校验后的精确正式副本 |

G0 通过。D3-001–010 已核实；D3-009 的实际依赖编译仍待验证。下一项 D3-011。

核对依据：[Tauri asset scope](https://v2.tauri.app/security/asset-protocol/)、[capabilities](https://v2.tauri.app/security/capabilities/)、[rfd](https://docs.rs/rfd/latest/rfd/struct.AsyncFileDialog.html)、[SQLite Backup](https://www.sqlite.org/backup.html)、[foreign_keys](https://www.sqlite.org/pragma.html#pragma_foreign_keys)。另已读取锁定 Tauri 2.12.3 的 asset Range/canonical scope 源码。

## D3.1 / G1

11 项 Rust 测试通过（2项继承壳规则、9项新增 SQLite），typecheck 通过。CRUD/重开、归档恢复、标签规范化、FK/唯一、触发器故障完整回滚、过新/损坏库保留、迁移前一致副本、写入所有权及路径校验均有隔离测试。数据层不 seed 演示。D3-011–019 完成；D3-020 的启动状态将随 UI 接线核验。

已核实新增锁定依赖：rusqlite 0.37.0、rfd 0.17.2、fs2 0.4.3；既有 Tauri 2.12.3 保留。首次编译因 asset feature 尚未对应配置失败，补齐 enable=true/scope=[] 后通过；另修复锁定 rusqlite backup API 名称与 Rust guard 类型。保留 G0 和 G1 实际日志于后续证据集合。开始 D3.2。

## D3.2 / G2 与尽早原生媒体核验

23 项 Rust 测试 PASS，包括12项新增导入用例；复制/去重/修复/取消/中断与提交失败均针对本轮 tmp 根。第一次 D3 desktop:build 生产 .app 成功，8.83 MiB、ad hoc，无 Developer ID/公证。

首份 D3 包在 /private/tmp/frameweave-d3-native-validation 显式测试根独立启动：原生选择取消正常；手动选择自制180秒 H.264/AAC MP4（41930946字节，中文空格#%文件名），真实字节进度后 SQL 终态 imported；asset id=92435947-9fdc-42f9-bf91-e979e497d6d8；源和副本 SHA256=258cb8675c3e8b0012c432ae5cc16a6813ccffd2512694bb9a5184c8341c821c。实际 WKWebView读取180000ms、640x360；Play/Pause、1.5×选择、从中段继续推进通过。用户本轮明确确认“画面正常，也能听到音调”。原生视频截图仍灰色，原样保留，不替换浏览器画面。

正式 AppData 再核实仍只有 shell.json。测试片由本机ffmpeg合成测试图和低音量440Hz音调，非私人视频；产品未引入FFmpeg。首包核验不是最终包验证，最终将重建并复核。

## D3.3 接线中

个人 Workspace 经既有 desktop adapter 读取 SQLite；复用卡片/详情与播放器；保存、收藏、归档等待Rust确认。原生已输入中文/emoji/HTML纯文本、取消Cmd+Q后输入保留，并完成明确保存。测试版发现原生视频截图仍灰色；caption时间推进与用户确认分开记录。继续验证重启恢复、演示隔离、保存失败与最终原生包。

## D3.3 / G3

原生个人表单的中文/emoji/HTML文本保存、Cmd+Q阻断/取消输入不丢、收藏、归档与主动恢复通过；同一 asset id 已保存标题/标签/备注/目标、favorite=true、revision=4。应用正常退出，数据库只读核对仍有上述资料。隔离测试库已有一致SQLite snapshot位于本对话 native-first-snapshot（不是产品备份功能）。原生深层页恢复将在最终包复核。

本轮组件与逻辑25项PASS；原有10项浏览器流程PASS（含4宽度八页、示例播放seek、示例原创/方法/复盘）。修复新增测试文字查询歧义；JSdom媒体pause/load在组件测试中替身，实际媒体操作由浏览器与原生另外验证。

D3-020、035–044 接线完成（最终重启证据待D3.5），继续D3.4/5媒体范围、失效回调、故障与最终打包。

## D3.4 / G4 与最终 D3.5


最终产品代码已冻结并在UTC21:19:13–21:19:28重新desktop:build；最终可执行文件SHA=407b4b2ff9ca89eb93c79bba28bc504f5b1e133f2f329033acdd14e8ff97fc20。此前最终typecheck/ui:build/25组件/27Rust/10浏览器/Prettier/Rustfmt均通过。Rust首次编译的io::Error比较错误已修正，保留失败与最终通过日志。没有在此后修改产品代码。

最终包无Vite启动，同一asset/revision资料、真实画面/声音人工确认、中段及150分钟长片约75分钟seek/倍速/暂停均核验。最终负向URL探针唯一正式媒体加载，DB/shell/staging/recovery/源/符号链接拒绝加载，另有Tauri scope原生逻辑测试。不把媒体错误码说成观测到HTTP403。

1.95GiB长片真实成功入库并与源SHA一致；第二次导入中先继续，再取消未完成并退出，cancelled记录519,045,120字节，暂存清理，先前资产保存。Cmd+W隐藏、第二次进程启动退出0并恢复同窗口/深层页。最终冷启动缺失/归档/不存在状态已捕获；源移走后正式副本仍播放。所有故障只在隔离根，夹具已恢复，测试进程已正常退出。详细证据见D3_NATIVE_VALIDATION与evidence/native-final-state.json。

G0–G4实现与主闭环通过；G5产物/文档核验见最终清单。54项当前50 PASS / 3 MANUAL_PENDING / 1 NOT_RUN。最终打包核验通过：D3-V52/53 为 PASS；架构、字节数、签名与 SHA-256 见 deliverables/D3/BUILD_MANIFEST.json。D3-064、065：PASS；最终压缩包、签名、哈希、D2 保留和隐私检查已核验。

保留未测：V13导入RSS序列（1.95GiB导入/UI响应已测，播放RSS不是导入压力证据）；V37实际损坏/不支持编码的原生解码（FTYP候选在picker Open禁用，未入库）；V48真实中文输入法候选；V51实际系统断网。额外原生同内容修复面板完整提交/Finder/Dock/外接屏/其他机器也未冒充通过。Rust同ID修复测试与恢复状态窗口测试通过。

实现差异：复用既有模型与ports，元数据显式保存；无需SQLite前端插件。DELETE journal替代规划可选WAL；迁移前使用Backup API。事件只通知attempt id，UI每500ms查durable batch，事件丢失不决定成功。媒体使用精确allow_file，无目录grant。两条探针命令只在进程显式开关+标记隔离根启用；正常个人库拒绝。依赖只新增所需项，既有Cargo锁定版本保留。无FFmpeg/Python产品运行依赖。

正式资料根仍仅shell.json，无D3测试业务库/视频。相对保护副本仅x/y位置变化，route与尺寸相同；保留当前shell，没有覆盖用户当前偏好。原更名备份及稳定保护副本存在，未重复迁移；D2交付另行字节核对。没有暂存、提交、推送、reset、clean、stash或改远端。

续做下一准确动作：从V13隔离导入RSS采样开始，再按D3_HANDOFF列出的V37/V48/V51步骤补验；不重做D3、不删库、不启动D4。

### D3-001–070 逐项结论

除下列说明外，D3-001–070的实现/本轮执行记录均已完成，原始任务措辞保留如下。PASS不把其附带人工环境未测细项视为通过；54项层级与限制以D3_TEST_RESULTS为准。

| 编号 | 状态 | 原任务 |
|---|---|---|
| D3-001 | PASS | 阅读本轮文件、适用 AGENTS、D2 验证与构建清单，核实当前工程根目录和 identifier。 |
| D3-002 | PASS | 记录 `git status`、已有 staged/unstaged/untracked 文件及当前 diff；不重新暂存或改 Git 历史。 |
| D3-003 | PASS | 找到 Cmd+Q 受控退出、Cmd+W、shell.json 与深层路由恢复实现，标注保护点。 |
| D3-004 | PASS | 查找现有领域类型、原生/演示/未连接 adapter，绘制最小“接口 → 文件 → 调用页面”映射。 |
| D3-005 | PASS | 确认数据库和个人导入是否仍未实现；若实际已有新增 D3 成果，记录并复用，不覆盖。 |
| D3-006 | PASS | 核实 AppData 与旧更名备份状态，按需要保留稳定保护副本；不重复迁移、不删除旧备份。 |
| D3-007 | PASS | 复用既有命令做必要基线检查，记录真实结果与既有失败，不把历史通过数当作本次通过。 |
| D3-008 | PASS | 建立隔离测试资料根和无私人内容的媒体测试策略；实际产品资料不用于故障注入。 |
| D3-009 | PASS | 确定 Rust SQLite binding、原生选择器、媒体协议方案与最小权限变更；按当前依赖核实，不盲目升级全栈。 |
| D3-010 | PASS | 写入 `D3_WORKLOG.md`：范围、基线、映射、计划差异和当前执行到的位置。 |
| D3-011 | PASS | Rust 解析应用资料根并创建必要目录，保留 shell.json 原格式。 |
| D3-012 | PASS | 实现初始 schema 与迁移记录，包括 assets、标签关系和导入尝试最小数据。 |
| D3-013 | PASS | 实现重复启动安全初始化、schema 太新阻断、迁移失败不破坏旧库。 |
| D3-014 | PASS | 设置并验证外键、参数化 SQL、写入协调、锁等待与错误映射。 |
| D3-015 | PASS | 实现个人素材 list/get/update/favorite/archive/restore 原生服务，沿用既有领域模型。 |
| D3-016 | PASS | 实现稳定 ID、修订冲突检测、标签规范化、搜索筛选和归档默认规则。 |
| D3-017 | PASS | 按领域字段定义校验，未知元数据允许为空，禁止引入虚假热度或分析字段。 |
| D3-018 | PASS | 增加隔离数据库测试：初始化、重开、CRUD、事务失败、唯一约束与冲突。 |
| D3-019 | PASS | 增加演示/个人空间隔离测试，证明建库不 seed fixtures。 |
| D3-020 | PASS | 更新个人 adapter 与数据库可用/不可用状态，错误不静默回退演示。 |
| D3-021 | PASS | 原生文件选择器、多选、取消语义、复制占用空间提示与同一流程入口。 |
| D3-022 | PASS | 原生选择授权记录/token 与校验；拒绝任意前端路径、过期或伪造 token。 |
| D3-023 | PASS | 文件属性/类型初筛、非媒体/空文件拒绝、大小/批量限额和磁盘空间预检查。 |
| D3-024 | PASS | 顺序导入队列，流式复制与摘要，UI 不阻塞、不整片读入内存。 |
| D3-025 | PASS | 真实字节进度、状态事件与可查询批次；不能以事件丢失导致重复入库。 |
| D3-026 | PASS | `.part` → 核验 → 正式文件 → SQL 提交顺序，不覆盖已有文件。 |
| D3-027 | PASS | 同内容去重、同名不同内容分开、已归档重复不自动恢复。 |
| D3-028 | PASS | 部分失败、取消、重复点击、错误重试；已成功项不被整批回滚。 |
| D3-029 | PASS | 中断恢复核对，覆盖文件发布前后与数据库提交前后窗口。 |
| D3-030 | PASS | 已有素材副本缺失后的同内容修复，保留原 asset id 与资料。 |
| D3-031 | PASS | 提供真实导入结果 UI，不创建下载/AI 假任务，源文件从不改写。 |
| D3-032 | PASS | 给新原生调用配置最小能力范围并验证 Rust 输入校验。 |
| D3-033 | PASS | 将第一条可控视频真实导入隔离资料库，并尽早在生产 `.app` 验证受限媒体来源能加载。 |
| D3-034 | PASS | 增加复制错误、空间不足、中断、去重、源文件移动不影响副本的原生逻辑测试。 |
| D3-035 | PASS | 素材库 list/get 接入个人 Repository，复用现有网格/列表/详情组件。 |
| D3-036 | PASS | 个人标题、标签、收藏、归档/恢复与既有资料字段真实落库。 |
| D3-037 | PASS | 保存等待、成功、失败保留输入、重试与修订冲突 UI。 |
| D3-038 | PASS | 搜索/筛选/排序由真实素材数据驱动，加载、空结果、DB 错误互不混淆。 |
| D3-039 | PASS | 首页接入真实最近素材和导入入口，不为 D5 项目概览填充假值。 |
| D3-040 | PASS | 管理副本缺失/不可读状态与同内容重新导入修复提示。 |
| D3-041 | PASS | 不同空间的请求/缓存/事件隔离，重置演示不能删除或改动个人数据。 |
| D3-042 | PASS | 原素材编辑离开/退出保护与已保存状态，中文组合输入不误提交。 |
| D3-043 | PASS | 设置显示准确的资料库状态与存储策略，继续区分未连接 AI/下载/雷达。 |
| D3-044 | PASS | 重启校验素材标题、标签、收藏、归档、真实首页数据及稳定 asset id。 |
| D3-045 | PASS | 按 asset id 解析受控正式文件，由 adapter 提供会话媒体地址，不落永久 URL。 |
| D3-046 | PASS | 精确配置媒体 scope 与 CSP，拒绝数据库、shell.json、暂存区和越界媒体请求。 |
| D3-047 | PASS | 现有拆解页挂载个人媒体与正确素材资料，不展示示例笔记/示例报告。 |
| D3-048 | PASS | 验证播放/暂停、倍速、长视频 seek、时长/尺寸及切换素材后的音频停止。 |
| D3-049 | PASS | 媒体元数据回写校验，拒绝过期 asset 的回调与非法数值；无证据字段保持未知。 |
| D3-050 | PASS | 区分缺失、编码不支持、媒体损坏与协议权限失败，并给准确说明。 |
| D3-051 | PASS | 数据库就绪后恢复真实深层页，正确处理已归档/不存在/缺失素材；默认暂停。 |
| D3-052 | PASS | 保留受控 Cmd+Q，加入导入安全取消/收尾；Cmd+W 与重激活不重复初始化/写入。 |
| D3-053 | PASS | 验证重复启动/重开不会同时创建多个写队列，必要时最小化补充实例保护。 |
| D3-054 | PASS | 原生视频与音频测试矩阵记录容器、已知编码、尺寸、时长、seek 和实际环境。 |
| D3-055 | PASS | 八页与现有最窄窗口回归，保留 D2 其他演示路径和阶段提示。 |
| D3-056 | PASS | 运行完整类型、前端构建、组件/逻辑、Rust、浏览器流程与格式检查，记录实际数量和日志。 |
| D3-057 | PASS | 执行第 11 节的导入/DB/权限负向测试，故障注入只在隔离测试空间。 |
| D3-058 | PASS | 验证 `.app` 无开发服务器启动和保存后重启恢复；不能仅凭浏览器测试通过。 |
| D3-059 | PASS | 核实原生画面、音频、seek、退出取消与重新激活；截图灰色时保留真实截图和旁证，不修图伪装。 |
| D3-060 | PASS | 原生 1024×680 与一档常用宽窗口回归；其他宽度和环境按实测填，不复用 D2 声称全过。 |
| D3-061 | MANUAL_PENDING | 测试中文输入法组合和焦点；工具无法实测时明确人工待验，不能用普通输入替代。 |
| D3-062 | PASS | 检查无新增远程请求、无插件/AI/Python/端口访问、无运行时模型或转码依赖。 |
| D3-063 | PASS | 最后一次修改后重新构建 `deliverables/D3/FrameWeave.app`，不要覆盖 D2。 |
| D3-064 | PASS | 记录真实架构、尺寸、签名验证状态和 SHA-256，输出 `FrameWeave-D3-mac-arm64.zip` 与构建清单。 |
| D3-065 | PASS | 审查应用包和 ZIP 不含个人数据库、导入视频、源路径日志或测试资料残留。 |
| D3-066 | PASS | 更新 D3 数据/接口契约，写出未来插件可复用应用服务边界，但不开放连接通道。 |
| D3-067 | PASS | 更新测试结果、原生验证、截图索引、媒体矩阵和已知限制，区分通过/失败/未测/人工待验。 |
| D3-068 | PASS | 写 `D3_HANDOFF.md` 和工作日志，明确完成项、未完成项、当前数据版本及恢复/回退方式。 |
| D3-069 | PASS | 复核最终 diff，没有覆盖原有 D2 未提交成果，没有自动提交、推送或重命名。 |
| D3-070 | PASS | 停在 D3；只说明后续 D4 的前提，不开始字幕、个人笔记、AI、下载或创作项目开发。 |

D3-061明确保留真实输入法待人工；D3-048的长片/倍速/暂停已有最终原生事件证据，切页音频停止由媒体清理及页面检查补证、未单独人工听辨。D3-057的磁盘/中断为隔离逻辑与构造故障状态，物理故障未做。D3-064/065已完成最终打包核验；D3-070执行边界已经锁定，不进入D4。


补充格式核对：现有Prettier检查与本轮变更/新增Rust文件的Rustfmt检查通过。额外全量Rustfmt对未改动的src-tauri/src/main.rs报原有单行格式差异，文件与保护副本字节一致；失败日志保留于evidence/rustfmt-existing-main.log/json，没有将这次全量检查写作通过。

## 2026-10-14 本地续做：权限闸门未通过

- 本次实际cwd为 `/Users/shaoqitang/Documents/ChatGPT/FrameWeave`，适用工程根AGENTS，apps/desktop及D3文档/产物下没有更深AGENTS。初始main追踪origin/main，工作区干净，HEAD=`16357690a2b7789d56f03e7ace923627564ca1dd`，origin符合固定地址。旧4338基线只属于历史实现会话；本次未执行Git暂存、提交或推送。
- 在D3 evidence目录创建唯一命名自有临时文件，读回相同内容后删除，写入/清理实际成功。`ps -axo pid=,ppid=,rss=,comm=`仍退出127，`zsh:1: operation not permitted: ps`。本任务sandbox_approval=false，request_permissions虽可调用却只提供文件系统和网络范围，没有进程读取授权；不重复请求禁止的升级、不借其他API或Terminal绕过。
- 依照用户的失败边界，停在原生启动前，未运行采样器--launch、未打开FrameWeave或选择器、未导入编码样本，RSS样本0。没有进程读取证据，不能声称当前应用已退出。未安排真实IME或断网操作，未进入D4。证据为 [followup-permission-gate-20261014T225141Z.json](evidence/followup-permission-gate-20261014T225141Z.json)。
- 只读保护复核：当前源码61项与BUILD_MANIFEST全部匹配；exe/ZIP摘要匹配原清单，没有构建或签名重验。隔离库schema1/DELETE、quick_check=ok、外键无异常，逐表与旧Backup API快照一致，2资产/4尝试/0活动，staging空；正式根仅shell.json，解析值与续做前一致。未改任何库、媒体或正式资料，也未复制活跃主库文件。详见 [followup-readonly-audit-20261014T225249Z.json](evidence/followup-readonly-audit-20261014T225249Z.json)。
- 已读取旧d3-followup的工作日志、采样说明/脚本、三份夹具元数据和各次权限失败记录。三小样本大小/SHA本次匹配；FFmpeg预检属于UTC22:11的旧准备，未重跑生成器或解码，不能算最终WK验收。旧pending-repo-update未覆盖canonical文件；本次仅按新实证增量更新D3文档、54项JSON的补充信息、截图说明和媒体矩阵。
- 54行状态保持50 PASS / 3 MANUAL_PENDING / 1 NOT_RUN。V13/V37没有新增通过，V48/V51不变；历史25组件/27Rust/10浏览器及既有格式结果未在本次重跑。无产品代码变化，保留最终app/ZIP、BUILD_MANIFEST和D2全部产物。

下一准确动作是先具备实际进程读取能力，当前任务没有可申请该授权的工具范围；未满足前不启动原生测试。满足后复用旧d3-followup/sample_import_memory.py，以--launch --responsible-method vmmap-summary采集，BASELINE_READY_USE_NATIVE_PICKER后真实选入长片；如命中既有asset的duplicate，只能报告复制/摘要/查重路径。再逐个原生验三编码夹具，最后提供IME和系统断网人工步骤。不得清库、盲套旧补丁或开始D4。

## 权限来源诊断与本轮实际恢复（伦敦时间2026-10-15 00:00）

用户要求查清来源和有效步骤，不再重复切同一开关。已使用openai-docs核对官方说明，并读取会话turn_context和本机配置来源；未修改权限配置或项目代码。

旧会话UTC22:07:53.955由on-request变为granular/sandbox_approval=false；本续做任务UTC22:50:56.642仍为false。本次UTC22:55:57.296实际已变on-request，同一工作区permission_profile摘要未变。默认ps再次退出127；立即通过本轮允许的require_escalated申请运行完全相同命令，UTC22:56:30.564返回exit0和进程行。未将进程全表复制到工程证据。

用户config没有审批/沙箱/权限显式键，项目/祖先配置及系统requirements/managed_config文件不存在，标准CFPreferences查询的com.openai.codex两键均不存在且未forced。默认沙箱内独立app-server诊断也被拒；经单次正常审批启动临时stdio诊断进程，只执行initialize、config/read、configRequirements/read，正常退出0。对应安全键均未显式设置、origins无对应项，requirements=null；没有thread/start、command/exec或配置写入。不能据此推断触发桌面策略改变的具体UI事件，但已定位实际拒绝层及已生效的审批执行路径。

完整脱敏实证见 [permission-source-diagnosis-20261014.json](evidence/permission-source-diagnosis-20261014.json)。当前进程读取可经审批完成；继续采样时须为完整采样器/隔离启动命令申请审批，不能把ps一次获准当成其他命令已获准。没有原生应用启动、导入RSS或编码测试，仍未验证vmmap归属，54项状态不变；原产品包、数据和Git历史未改。
