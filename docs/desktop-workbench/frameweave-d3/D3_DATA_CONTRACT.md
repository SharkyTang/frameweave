# D3 数据与原生接口契约

本契约对应最终 D3 源码和 schema 1。业务入口沿用 `VideoAsset`、`WorkspacePort`、`PersonalMediaPort` 与 `adapters/desktop.ts`；页面不直接调用 invoke、SQL 或本地路径。个人 Workspace 的 notes/projects/methods 等 D4/D5 集合保持为空，演示仍使用原内存 Repository。

## 资料根与所有权

运行时由 Tauri `app.path().app_data_dir()` 解析。当前本机正式根为 `~/Library/Application Support/com.sharkytang.frameweave.workbench`。不写入 .app、仓库、public、localStorage、浏览器缓存或原视频目录。

| 相对资料根 | 内容 |
|---|---|
| shell.json | 继承 D2 的 route、width、height、x、y；不含业务资料 |
| data/frameweave.sqlite3 | SQLite schema 1，素材/标签/导入尝试 |
| data/library.lock | fs2 独占进程所有权，防第二写队列 |
| media/originals/<uuid>.mp4 或 .mov | 应用确认的管理副本；名称不来自用户文件名 |
| staging/<attempt-uuid>.part | 明确归属某次导入的暂存 |
| recovery/pre-migration-<uuid>.sqlite3 | 已有非空 schema 0 库变更前的 SQLite Backup API 一致副本 |

SQLite 采用 bundled rusqlite 0.37.0；DELETE journal、FULL synchronous、foreign_keys=ON、5s busy_timeout。一个 Library Mutex 协调短事务，复制/hash/等待不长持 SQL 锁。启动 quick_check；过新 schema、损坏、异常链接与迁移失败明确阻断。没有删库重建或自动降级。备份不是复制活动主库单文件；本轮正式 AppData 尚无业务库。产品备份/恢复不在 D3。

## 实体与字段

| 表 | 约束与语义 |
|---|---|
| assets | UUID 主键、唯一 SHA-256、唯一 managed_relpath；title、description、learning_goal、original_filename、manual_import 来源、byte_size、favorite、archived_at、revision、imported_at/updated_at；可空 duration_ms/width/height 与 playback_status |
| tags / asset_tags | 规范化名称唯一；关联外键；保存位置顺序；事务更新 |
| import_attempts | attempt/batch/candidate UUID、原文件名、应用生成暂存/目标相对路径、state、真实 bytes_copied/total_bytes、SHA、最终 asset_id、结构化错误和时间戳 |
| schema_migrations | version 与 applied_at；当前唯一版本1 |

不保存原视频绝对路径、永久媒体 URL、视频二进制、示例字幕、时间笔记、脚本、项目、AI 分析或伪造热度。原文件名只作为显示资料。所有 SQL 参数化。UUID 从应用生成 v4，入参校验规范 UUID 文本；不把 capability 当业务校验。

标题 trim 后 1–200 Unicode 字符；备注/目标最多4000；标签最多20个、每个40字符，trim、忽略空值、按小写去重并保留首个写法；拒绝 NUL。HTML 由 React 当文本渲染。修改须提供 expectedRevision，事务内核对后 revision+1；失败回滚并保留表单。媒体观测不增加编辑 revision、不改用户资料。收藏/归档/恢复复用相同 updateAsset，不另造一套数据模型；归档保留文件与资料，不自动恢复。

## 原生业务面

下表命令仅由既有 desktop adapter 发起。命令通过 AppManifest 和 main capability 精确列出，再校验主窗口和本机 tauri://localhost 来源；debug 仅允许既有127.0.0.1:1420。Rust 返回 FwResult，序列化错误为 `{code,message,retryable}`，前端由 NativeError 承接；不把底层含源路径错误原样展示。

| Port 方法 | Rust 命令 | 请求/结果 |
|---|---|---|
| info | library_info | ready/schemaVersion/journalMode/recoveryWarnings/maxFiles/maxFileBytes |
| load(personal) | list_assets | offset/limit（1–200）；adapter 分页装配既有 Workspace |
| getAsset | get_asset | asset UUID → VideoAsset；不返回 managed_relpath |
| updateAsset | update_asset | id/expectedRevision/title/description/learningGoal/tags/favorite/archived；拒绝未知字段 |
| choose | choose_local_videos | Rust 打开 rfd 原生多选；返回不透明 token、filename/byteSize；取消无 token |
| start | start_import | 仅 token → durable batch；不接收路径、URL、destination |
| batch | import_batch | 当前或指定 batch；每项 state/bytes/result/error，可在事件丢失后查询 |
| cancel | cancel_import | batch UUID、可选 attempt UUID；检查归属 |
| playback | resolve_playback | asset UUID → 经过校验的精确文件及内容hash/lease；adapter convertFileSrc，页面只获 url |
| releasePlayback | release_playback | 释放 lease，旧媒体回调失效 |
| metadata | record_media_metadata | id/hash/lease、实际 durationMs/width/height；拒绝未知字段、过期/跨素材回调 |
| playbackFailed | record_playback_failure | 同一有效 lease 的加载失败观测；不伪称已经解码 |

metadata 时长须有限且0–7天（不含0），尺寸1–16384。未加载字段为 null，不从文件名猜测。metadata_loaded 仅意味着元数据加载；UI 用“已加载视频”，不把“已入库”或这个状态等同所有编码的播放保证。

继承 shell_info、remember_route、quit_application。后者等待导入取消/当前提交安全收尾，再设置 allow_exit；Cmd+Q 仍由受控菜单和 ExitRequested 经过前端保护，不使用直接终止的预定义 Quit。

## 导入状态机与一致性

原生选择结果只在 Rust 内存持有。授权 token 有效10分钟；最多20项、5GiB/项，先预检查副本空间再预留64MiB。只有原生 picker 能建立 Source；前端传任意路径没有读盘入口。同 token 重复 start 读取既有 batch，活动批次/选择框防重入。重启不自动寻找原视频。

`queued → copying → validating → staged → committing → imported / duplicate / repaired`。失败终态为 failed/cancelled/interrupted/needs_review，各项独立，已成功项不随其他项失败回滚。错误后需重新原生选择对应文件，不持久保存源路径。FTYP/品牌与MP4/MOV后缀只是候选初筛，不是解码保证；老式无FTYP的MOV也可能被初筛拒绝。

复制使用 O_NOFOLLOW/O_NONBLOCK、普通文件检查，选择时 dev/inode/size/mtime 指纹与复制前/后复核；1MiB 分块写入和 SHA-256，不整片 base64/读入内存。进度写入真实字节，UI 每500ms查询 durable batch；import-progress 事件仅作 attempt id 通知（批次结束为空串），不依赖事件 payload 保证一致性。这是对规划中完整事件 payload 的最小实现差异，未来消费者应重新查询 batch。

暂存 create_new、不覆盖；sync 后保存 staged 的摘要/大小证据，再记录 committing。相同文件系统内 hard_link 做原子不覆盖发布并同步父目录；正式文件和导入记录在短 SQL 事务确认后才成功。最后清理已知归属 .part。相同内容先检查既有副本的摘要，不新增第二份正式文件；同名不同内容生成不同UUID。归档重复不恢复；缺失副本按既有SHA恢复原asset id、资料和revision。异常替换/链接/内容冲突不覆盖。

启动只核对已知 attempt/受控目录：复制中状态标 interrupted 并清理明确归属的暂存；staged/committing 核对摘要后幂等收尾；已提交状态只清理已知 .part。未知正式文件和 needs_review 不删除、不扫描全磁盘、不自动修复/重建库，设置页显示警告数量。断电保证来自构造恢复窗口的隔离测试；未声称实测物理断电。

## 媒体权限

静态 assetProtocol.scope=[]。resolve_playback 用 asset id 找 DB 路径，校验生成式相对路径、父目录canonical归属、非符号链接普通文件、字节数及可读性后，仅 scope.allow_file 该正式管理副本。没有 grant home、整个 AppData 或整个 originals 目录；拒绝 DB、shell、staging、recovery。CSP 保留开启，只增加 asset 媒体源；connect-src 仍仅 IPC。URL 不持久化，不把用户源路径交页面。

播放会话绑定 asset/hash，释放或切换后过期回调不能更新。切页 cleanup pause/remove src/load；默认冷启动暂停。缺失、访问/归属失败与 WebKit 解码失败分开提示；不能仅凭媒体错误码严格区分损坏与未支持编码，明确合并说明并建议核验编码。无自动转码或网络后备。

为生产 WKWebView 的负向 URL 验证保留两个窄测试命令 isolated_media_probe / record_isolated_probe。只有 FRAMEWEAVE_TEST_MODE=1、FRAMEWEAVE_TEST_NATIVE_PROBE=1、/private/tmp 直接子目录 frameweave-d3-native-* 和精确标记内容同时满足才启用；没有IPC路径/root参数，普通个人库返回NOT_IMPLEMENTED。它们只读取固定的7个已知测试目标、写固定无路径结果文件；不是通用fs/SQL API。标记根未显式启用时拒绝，不回退写正式数据。

## 错误与保存

常见 code：DB_BUSY、DB_READ_ONLY、DB_CORRUPT、DB_WRITE_FAILED、DB_INIT_FAILED、SCHEMA_TOO_NEW、DISK_FULL、ACCESS_DENIED、IO_FAILED、VALIDATION_FAILED、LIMIT_EXCEEDED、SELECTION_EXPIRED、SOURCE_CHANGED、IMPORT_BUSY、CANCELLED、INTERRUPTED、MANAGED_FILE_MISSING、ASSET_NOT_FOUND、REVISION_CONFLICT。失败不变成空库成功。SQL无法持久化导入错误时保留内存错误，UI不报已确认落库。

页面保存须等待Rust回应；失败/冲突保留草稿；冲突需显式刷新修订再确认保存；离开和退出受保护。组合输入事件阻断Enter/Cmd+S误保存；真实中文输入法候选验收仍待人工。素材目标/备注不扩大为脚本自动保存。

## 后续边界

未来插件可复用资产/导入应用服务；必须重新设计受控授权入口，不能直接复用任意路径能力。本轮无插件连接通道、端口探测、Python服务、ASR、字幕/时间笔记、AI/下载/雷达实服务、转码、项目/脚本/方法持久化、永久删除或备份恢复。相关服务仍返回 NOT_CONNECTED。新增 batch/attempt UUID 属于本地导入，不伪装 jobId。

核对依据：锁定 Tauri 2.12.3 的 asset Range/scope 源码，以及 [Tauri asset protocol](https://v2.tauri.app/security/asset-protocol/)、[capabilities](https://v2.tauri.app/security/capabilities/)、[SQLite Backup API](https://www.sqlite.org/backup.html)、[SQLite foreign_keys](https://www.sqlite.org/pragma.html#pragma_foreign_keys)。依赖变更以当前Cargo.lock为准；既有锁定包版本未整体升级。
