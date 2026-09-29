# 幼儿英语绘本小屋 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可本地运行的幼儿英语绘本小屋，包含 16 本原创 3D 绘本、点读、四套主题及每日本地阅读轨迹。

**Architecture:** React 静态前端，以内容数据驱动书架与阅读器。独立音频控制器管理单音轨；独立记录模块以活动区间计算有效时间并写入 IndexedDB。主题与阅读内容隔离，统计从会话派生。

**Tech Stack:** React、TypeScript、Vite、CSS、IndexedDB；Vitest、Testing Library、fake-indexeddb 用于必要的行为测试；浏览器完成视觉与真实音频验证。

**Spec:** `D:/raz_english/docs/superpowers/specs/2026-09-29-raz-reading-design.md`

## Global Constraints

- 制作 aa、A 各 8 本，共 16 本。每本包含独立封面、6 个正文页。
- 产品预留 aa～F；aa～C 为核心启蒙范围，D～F 为后续拓展，不按年龄强制分级。
- 默认主题为长颈鹿；选择后立即生效并本地保存。
- 主要触控目标至少 48×48 CSS 像素。
- 全部绘本插图使用实际制作的 3D 风格位图。
- 禁止以 emoji、空白占位或简单几何图替代交付插图。
- 使用 IndexedDB 保存阅读事件与会话，localStorage 保存主题等轻量偏好。
- 有效计时规则：阅读页在前台，且音频正在播放，或距离最近一次点击/翻页/键盘阅读操作不超过 60 秒，才累计时长。
- 使用单调时钟计算间隔，约每 5 秒保存已累计时长，并在翻页、暂停、页面隐藏或离开时保存。
- 所有声音由用户点击启动；同一时间只播放一个音轨。
- 不制作 B～F 内容，不加入登录、付费、排名、测验、语音打分、自由拼装主题、在线生成主题、多儿童档案或云同步。
- 先完成可在本地运行与审阅的网站。当前不创建外部项目或公开发布。

## Review Focus

1. 旧音轨结束事件晚于翻页到达：不得跳过新页或错误标记完成；任务 5 验证。
2. 系统睡眠或手动调整时间：不得计入整段睡眠或生成负时长；任务 3 验证。
3. 损坏记录或未知数据版本：保留正常记录并提示异常，不能清空全部数据；任务 4 验证。
4. 英语语音列表异步加载且用户迅速退出：不迟到发声，不选中文语音读英文；任务 5 验证。
5. 多标签会话重叠及跨午夜：日总时间不重复、历史日期稳定、明细口径可解释；任务 3、4、7 验证。

## 执行前提与目录

2026-09-29 已核实：目录仅有设计文档，非 Git 仓库；系统可找到 Node、npm、Python、Git；图像生成工具已提供；未发现专用语音生成工具。尚未安装依赖、测试网络、调用付费生成或创建产品文件。工具存在不等于生成成功，执行时须实际验证。

实施前读取选定执行技能，以及适用的 imagegen、设计和 Sites 技能；Sites 若要求外部项目或部署，应遵循已批准的本地优先范围，使用其适用的本地流程，不擅自扩展发布范围。在当前空项目目录实施，不另建无意义 worktree。只有建立 Git 仓库后才执行每项提交；若 Git 写入受限，保留文件并报告，不为提交阻塞可完成工作。

所有路径相对 `D:/raz_english`：

| 文件 | 职责 |
|---|---|
| package.json、package-lock.json、index.html、tsconfig*.json、vite.config.ts | 本地运行、锁定依赖、类型检查与测试 |
| src/main.tsx、src/App.tsx、src/styles/base.css | 应用入口与 hash 页面导航 |
| src/content/types.ts、src/content/catalog.ts、src/content/books/*.json | 读物结构与 16 本逐页内容 |
| scripts/validate-content.ts | 校验数量、资源、唯一 id 与文本 |
| public/books/{bookId}/cover.webp、page-01.webp…page-06.webp | 112 张交付图片 |
| public/audio/{bookId}/page-01.*…page-06.* | 如能制作，交付 96 段音频 |
| docs/content/art-direction.md、asset-manifest.json | 角色参考、图片来源、生成批次与验收状态 |
| src/themes/themes.ts、ThemePicker.tsx、themes.css、public/themes/* | 四套主题与选择器 |
| src/reading/types.ts、clock.ts、statistics.ts、storage.ts、useReadingSession.ts | 计时、存储、会话与汇总 |
| src/audio/controller.ts、browserSpeech.ts、useAudio.ts | 音频与系统语音适配 |
| src/shelf/Bookshelf.tsx、BookCard.tsx、shelf.css | 书架与继续阅读 |
| src/reader/Reader.tsx、reader.css | 读物交互 |
| src/history/ReadingHistory.tsx、history.css | 月历与轨迹 |
| src/components/BookImage.tsx、Notice.tsx | 图片重试与状态提示 |
| src/**/*.test.ts、src/**/*.test.tsx、src/test/setup.ts | 有意义的行为测试 |
| README.md、docs/verification.md | 运行方式、限制及验收证据 |

## Task 1：可运行的内容目录及完整文案

**Files:** 创建基础配置、入口、内容类型与 16 个 JSON、`src/content/catalog.test.ts`。创建 `scripts/validate-content.ts`。

**Interfaces:** `Level = 'aa' | 'A'`；`Page = {id:string; english:string; chinese:string; image:string; alt:string; audio: {kind:'file';src:string} | {kind:'speech';lang:'en-US'}}`；`Book = {id:string;level:Level;title:string;cover:string;tags:string[];order:number;pages:Page[]}`。导出 `books: Book[]`、`getBook(id:string): Book | undefined`。

- [ ] 读取本机 Node 版本，选择兼容依赖并锁定；建立 React/TypeScript/Vite 与 Vitest 测试环境。脚本固定为 `dev`、`build`、`test`、`validate:content`，test 使用 `vitest run`，build 包含类型检查。
- [ ] 写内容测试并运行 `npm test -- src/content/catalog.test.ts`，确认缺少目录数据导致失败：`expect(books).toHaveLength(16)`；两个等级各 8 本，每本 6 页，全部 book/page id 唯一，英文中文及 alt 非空。
- [ ] 按设计表书名创建固定 id 的 16 本逐页文案，英文句型自然、中文对应、画面可表现；完成内容目录接口。图片指向约定路径，暂不宣称素材已完成。
- [ ] 执行同一测试得到 PASS，人工逐本检查 96 句；资源完整校验独立保留给任务 2，不能通过跳过缺失资源让最终验收通过。
- [ ] 在可用 Git 仓库中提交 `feat: add original graded reading catalog`。

## Task 2：3D 图片及配音素材制作

**Files:** 创建上述图片和主题资源目录、艺术指导与 manifest；更新每页 audio 数据；创建 `scripts/validate-content.test.ts`。

**Interfaces:** manifest 每条为 `{assetId,bookId?,pageId?,path,kind:'cover'|'page'|'theme'|'audio',source,reviewed:boolean}`；`validateAssets(books:Book[],root:string): string[]` 返回缺失或无效文件错误。

- [ ] 写资源检查失败测试：不存在路径与空文件必须返回错误；为每本强制检查封面与 6 张正文图，不能只检查路径字符串。运行 `npm test -- scripts/validate-content.test.ts` 确认失败。
- [ ] 使用图像技能制作一本 aa 与一本 A 的角色参考、封面和正文，确认实际输出能保存到项目并达到图文对应标准。不得使用生成工具之外的绘图来冒充要求的插图。
- [ ] 按每批 4 本完成余下读物：aa 前 4 本、aa 后 4 本、A 前 4 本、A 后 4 本，已制作样本计入对应批次。逐页按文案生成画面；必要时引用角色参考保持一致。每本 7 张独立可用图片，不能把整张拼图直接充当多个正文页。
- [ ] 制作四套主题装饰，保持与读物资产独立。检查所有书的颜色、对象数量、动作、方位和连续角色；修改错误图，并更新 manifest reviewed 状态。
- [ ] 检查可用英语配音方式；若有实际可用合适工具，先制作试听样本，再完成 96 个音轨并填 file 地址；没有可用方式则按批准设计填 speech/en-US，在交付说明和设置中标注“系统英语语音”。不发现或打印密钥，不未经授权购买服务。
- [ ] 实现资源检查，执行 `npm run validate:content`，期待 16 本、96 页、112 张图片全部存在且非空，四套主题资源有效；file 音频逐一验证存在，speech 页面必须标明模式。抽听两级句子，记录实际方式和声音可用条件。
- [ ] 提交 `feat: add reviewed 3d reading artwork and narration assets`。如生成服务失败，保存已完成资源与明确缺口，不能减少书目后宣称首版完成。

## Task 3：确定性的有效计时与每日统计

**Files:** 创建 `src/reading/types.ts`、`clock.ts`、`statistics.ts` 及对应测试。

**Interfaces:** `ActiveInterval={startMs:number;endMs:number;localDate:string}`；`Visit={page:number;at:number;localDate:string}`；`Session={id:string;bookId:string;startedAt:number;lastActivityAt:number;endedAt:number|null;visits:Visit[];intervals:ActiveInterval[];completedAt:number|null;completionDate:string|null}`；`Progress={bookId:string;page:number;completed:boolean;updatedAt:number}`。`ReadingClock.sample(input:{monoMs:number;wallMs:number;visible:boolean;playing:boolean;interaction:boolean}):ActiveInterval[]`；`summarizeDay(sessions:Session[],date:string):{activeMs:number;bookCount:number;completionCount:number}`。

- [ ] 写测试并运行 `npm test -- src/reading/clock.test.ts src/reading/statistics.test.ts`，确认失败：无播放活动 90 秒只记 60000ms；前台播放 90000ms 记 90000ms；隐藏 30000ms 记 0；同日重叠区间 [0,10000] 与 [5000,15000] 合并为 15000ms。
- [ ] 实现状态区间结算：先结算旧状态再应用本次输入，按 60 秒边界裁剪，播放与操作不叠加；wall 时间用于归档，mono 用于时长。
- [ ] 增加并通过测试：23:59:58 到 00:00:03 分成 2000ms 和 3000ms；同书两次完成 bookCount=1、completionCount=2；未来或负区间被拒绝。采样间隔超过 10 秒视为可能睡眠，不计该异常间隔，记录诊断；系统墙钟回拨重设锚点，不产生负时间。
- [ ] 日汇总用保存的 localDate，不根据当前时区重算历史。时间线同时展示各会话有效时长；存在跨会话重叠时标注“每日总时长已去除重叠时间”。运行测试得到 PASS。
- [ ] 提交 `feat: track active reading time and daily statistics`。

## Task 4：可恢复的本地存储与阅读会话

**Files:** 创建 `src/reading/storage.ts`、`useReadingSession.ts`、对应测试与测试环境。

**Interfaces:** `ReadingStore` 提供 `listSessions():Promise<Session[]>`、`saveSession(s:Session):Promise<void>`、`getProgress(bookId:string):Promise<Progress|undefined>`、`saveProgress(p:Progress):Promise<void>`；`openReadingStore():Promise<ReadingStore>`。`useReadingSession(book:Book)` 返回 `{page,setPage,complete,playingChanged,interact,saveError}`；保存错误必须传给界面。偏好读取采用独立 try/catch。

- [ ] 使用 fake-indexeddb 写失败测试：保存后重开可恢复；两个会话 id 独立；完成标记重复调用仅一次；不完整会话以最后保存时间显示，不把关闭时长补计。运行该测试确认失败。
- [ ] 建立版本 1 的 sessions、progress 存储；逐条校验，不因一条坏记录丢弃其他记录。未知未来版本只提示读取限制，不清空数据库。
- [ ] 实现 hook：打开创建 session；恢复未完成页、已完成从第 1 页；每秒采样、约每 5 秒保存；在翻页、隐藏和退出尽力保存。不能依赖卸载时异步写入成功；刷新前已保存数据为恢复依据。
- [ ] 添加并通过拒绝写入、损坏记录、重复生命周期挂载、翻页后刷新、重新阅读旧完成书测试。对存储失败显示“本次阅读记录无法保存”，仍允许临时内存阅读；旧完成记录不变。
- [ ] 使用存储变化通知刷新其他标签页的统计；合并进度按 updatedAt，session 以各自 id 独立保存。运行 `npm test -- src/reading` 得到 PASS。
- [ ] 提交 `feat: persist reading sessions and progress locally`。

## Task 5：单音轨播放与连续阅读控制

**Files:** 创建 `src/audio/controller.ts`、`browserSpeech.ts`、`useAudio.ts` 和控制器测试。

**Interfaces:** `AudioState='idle'|'loading'|'playing'|'paused'|'error'`；`createAudioController(callbacks:{onState:(s:AudioState)=>void;onEnded:()=>void;onError:(message:string)=>void})` 返回 `{load(page:Page):void;play():Promise<void>;pause():void;replay():Promise<void>;stop():void;dispose():void}`。每次 load/stop/dispose 递增播放令牌，旧事件不得生效。

- [ ] 用可控媒体适配器写失败测试：连续两次 load 只有新音轨可发 ended；pause/resume 保留进度；replay 回到 0；dispose 后异步播放请求不发声。运行音频测试确认失败。
- [ ] 实现 file 音频及 speech 适配，优先英语 en-US，次选其他 en-*；监听延迟到达的 voiceschanged，找不到英语语音时明确报错，不以中文语音替代。浏览器不可靠的系统语音恢复可退回本句重读，但须在文档说明实测差异。
- [ ] 测试延迟语音加载期间退出、音频网络失败、用户播放被浏览器拒绝、快速重播，确认没有叠音或迟到声音。
- [ ] 在实际浏览器点击试听。模拟测试不能证明扬声器真的有声；记录可验证的播放状态以及实际试听结果。全部音频行为测试 PASS 后提交 `feat: add accessible single-track narration`。

## Task 6：绘本书架、四主题与阅读器

**Files:** 创建主题、书架、阅读器和公共组件文件；完善 `App.tsx` 与样式；创建 `src/reader/Reader.test.tsx`。

**Interfaces:** `ThemeId='pig'|'pip-posy'|'giraffe'|'panda'`；`themes:Record<ThemeId,ThemeDefinition>`；`BookImage({src,alt}: {src:string;alt:string})`。路由为 `#/`、`#/read/{bookId}`、`#/history`，未知 bookId 返回友好提示与书架入口。

- [ ] 写阅读行为测试并确认失败：首次第 1 页，恢复进度，中文默认隐藏，手动翻页停止音频，末页手动完成不重复，整本模式结束后 1000ms 翻页且末页仅完成一次。
- [ ] 制作书架与主题：大封面、aa/A 切换、继续阅读、主题弹层与足迹入口。四套主题提供独立装饰和材质，不只换主色；主题偏好读写异常有降级，默认 giraffe。
- [ ] 接入任务 4、5 的接口完成阅读器：英文句子点击从头读；播放按钮负责播放/暂停/恢复，重播按钮始终从头；整本模式与手动操作互斥；隐藏取消自动翻页计时器。
- [ ] 接入响应式图上文下或左右布局、48px 点击区、可见键盘焦点、装饰隐藏于读屏、图片重试、音频错误提示和相邻页预加载；减少动态效果设置关闭非必要动画。
- [ ] 增加并通过后台发生在 1 秒翻页间隔、连续模式手动翻页、图片加载失败、错误 URL 测试。确认主题切换不改变绘本文案与图片。
- [ ] 运行相关测试和 `npm run build` 得到 PASS，提交 `feat: build themed bookshelf and immersive reader`。

## Task 7：阅读足迹与月历

**Files:** 创建 `src/history/ReadingHistory.tsx`、`history.css`、`ReadingHistory.test.tsx`。

**Interfaces:** 使用 `ReadingStore.listSessions` 与 `summarizeDay`；页面本地 selectedDate 为 YYYY-MM-DD，不把日期字符串作为 UTC 时间转换；读物名称使用 `getBook`。

- [ ] 写失败测试：空数据无虚构数字或示例记录；同书两会话分行展示，今日本数去重；跨日会话分别展示当天活动；重复完成次数正确。
- [ ] 实现日总计、可切月份日历与选择日期，按会话开始时间显示轨迹；页序完整保存，包括回翻。跨午夜显示当天部分时长；未知书 id 显示“已移除的读物”而不崩溃。
- [ ] 添加跨月、闰年日期、重叠区间说明、存储失败提示测试，运行 `npm test -- src/history` 得到 PASS；从记录点书可继续阅读。
- [ ] 提交 `feat: show daily reading calendar and journey`。

## Task 8：整体验收与本地交付

**Files:** 创建 `README.md`、`docs/verification.md`；修复验收发现的对应文件。

**Interfaces:** README 明确 `npm install`、`npm run dev -- --host 127.0.0.1`、`npm run build`、`npm test`、`npm run validate:content`；不声称离线或跨设备同步。

- [ ] 执行 `npm test`、`npm run validate:content`、`npm run build`，记录真实结果；只有发现新问题或修复后才重复相关检查。
- [ ] 在 390×844、768×1024、1024×768、1440×900 检查书架、阅读和足迹；浏览全部四主题，确认无溢出遮挡、按压和焦点清晰、控件至少 48px。用实际截图记录结果。
- [ ] 完成浏览器闭环：选书 → 点读 → 暂停/重播 → 整本播放 → 手动翻页 → 返回 → 刷新恢复 → 完成 → 看日历；验证页面隐藏停止声音和计时，检查控制台错误及损坏图片。
- [ ] 查看全部 112 张图片的检查记录，核对 96 句文本和实际音频模式。检查配音缺失、系统语音依赖和存储不可用提示，没有条件验证的项目如实注明。
- [ ] 按选定执行技能完成独立代码审阅，重点审阅音频竞态、计时口径、IndexedDB 与主题可访问性；修复确认的问题并运行受影响测试。
- [ ] 保存启动说明、素材清单和验证记录；提交 `docs: document local setup and verification`。交付可点击的本地预览入口及已知限制；不以计划完成代替网站完成。

## 计划自查及执行选择

设计 1～2 对应任务 1、2；设计 3 对应任务 2、6；设计 4 对应任务 5～7；设计 5 对应任务 3、4；设计 6 对应任务 2、5；设计 7 对应模块接口；设计 8 对应各任务测试与任务 8。没有缩减首版内容，也没有引入外部部署或账号。

建议选择本会话直接执行：任务共享内容、音频和会话接口，连续实施容易保持一致，最终独立审阅关键逻辑。另一选择是逐任务子代理实施与逐项独立审阅，适合希望每一步有额外审查且接受更高开销的情况。

本计划待用户审阅并选择执行方式；此阶段尚未生成产品代码或素材。
