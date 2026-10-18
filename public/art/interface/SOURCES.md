# 界面美术来源

## reference-hud-clean-v1.png

2026-10-18 用户反馈生产组件边缘不干净后，使用内置 `image_gen`，以用户原图 `reference-hud.png` 为编辑目标提取／再绘干净的 1672×941 RGBA 装饰图集。保留木纹、墨绿漆面、卷轴、鎏金云纹、绢旗与花枝；去除地图、人物、文字、数值、标注线及操作图标，头像和小地图开口为透明。完整实际提示词见 `docs/art-direction/top-hud/prompts.md` 同日「透明边缘整改」。生成原件直接复制，保留原始 alpha，不以程序改写 PNG；SVG 在运行时用轻量 alpha 传递清除不透明度约 1/255 的背景残点，并将近不透明漆面收实。组件外轮廓由素材自身透明度决定，区域遮罩仅拆分相邻组件，不再用粗多边形模拟自然轮廓。

此图替代旧参考图承担生产边框；原 `reference-hud.png` 保留为不可变参考和图标图集，朝廷仍用既有 `CourtIcon`。这是一份生成后的生产美术资产，不是实机截图，也不是原图逐像素抠出的副本；最终画面由用户人工验收。

## reference-hud.png

2026-10-18 用户提供的《魏晋南北朝水墨策略界面》参考原图，1672×941，原件直接复制为不可变图集。`ReferenceHudArt` 使用 SVG 视口及遮罩，仅显示四角界面的木雕、旧金云纹、竹简外缘、卷轴、绢旗镶边和操作插画；原图人物、示例数值、文字标注、地图及朝廷入口均不作为运行内容。姓名、身份、个人资源、日期、时间状态、事项和小地图来自实际世界，朝廷继续使用 `CourtIcon`。本轮未生成替代图、未改变历史与玩法数据。原图仅为美术参考，最终界面效果待用户人工验收。

## operations-ink-frame.svg / operations-button-frame.svg / operations-close.svg / operations-paper-tab.svg

2026-10-13 根据已确认效果图的控件语言制作的原创矢量界面资产。分别为九宫格切片墨刷外框、旧金折角按钮细线、方形细金边关闭控件、毛边纸签遮罩；未提取商业游戏素材。`operationsChrome.css` 仅用于界面装饰，实际文字、交互区域、焦点及操作规则由前端保留。

## operations-scenes-wide.png / operations-scenes.png

2026-10-13 使用内置 imagegen 生成的原创南北朝题材淡彩水墨场景图集，不含文字、游戏数值或 UI。依据本会话已确认的左侧操作栏目标图制作，没有提取商业游戏素材。运行使用 `operations-scenes-wide.png`（1536×1024，2 列×4 行，每格 768×256），依次为案牍、使节、军营、密议、庄园、档案、朝殿、公库；`OperationsArt` 以 SVG viewBox 保持比例裁切。早期 4 列×2 行图集 `operations-scenes.png` 保留来源但不用于最终运行。

对应 JSON 保存生成提示词与布局。全部生成原稿及 SHA-256 校验位于 `docs/art-direction/left-operations-tabs/session-originals/` 和 `archive-manifest.json`。人物身份、肖像、资源与具体操作由真实世界数据渲染，不来自这些插画。

## lifestyle-plum-tree.png

2026-09-30 使用内置 imagegen 生成的原创水墨梅树背景；用于南北朝题材生活重心弹窗。画面为独立栅格美术，不含 UI、文字或游戏数值，不来自商业游戏截图。枝干与花瓣仅作场景，实际技能前置、学习状态、点数和效果由游戏数据与节点详情表示。图片静态展示，不再由 SVG 或程序绘制树木。

## person-ink-panel.svg

2026-10-09 为人物详情弹窗绘制的原创 SVG 墨刷边缘与深墨底板，依据用户确认的人物弹窗预览调整轮廓和配色；未提取商业游戏素材。复用项目已有朝堂、图标和当前身份人物肖像，文字、国号与人物状态由真实游戏数据绘制。

## top-hud-art.png / top-hud-frame.svg

2026-10-13 顶部组件采用本会话内置 image_gen 生成、经用户确认实施的 `docs/art-direction/top-hud/components-v1.png`。`top-hud-art.png` 保留相同原图，`HudArt` 只通过 SVG viewBox 显示盘缠、行粮、影响力、功绩、威望、压力、书册、卷轴、花枝与兵器的插画区域，不展示原图示例文字、数值和肖像。其他类别复用已有原创策略图标。无需再生成或模拟存档中的数值。

`top-hud-frame.svg` 为本地原创九宫格墨纸边框和细金角饰；`HudFlagCloth` 为原创可伸缩绢纹、绣边与横杆，按真实事项类型保留旗形和颜色。无商业游戏素材提取。提示词及方向图留在上述美术目录。

## dialog-scenes.png / dialog-scenes.json / dialog-paper.svg

2026-10-13 按弹窗图册实施要求，用内置 imagegen 生成原创、无文字的淡彩水墨场景图集，1536×1024，2列×4行。依次为黄土城垒、军中传报、静养、家业交接、商旅、迁民、册命、拘押。没有从商业游戏提取素材。完整提示词及格位保存在同名 JSON；`DialogArt` 使用 SVG 视口裁切，标题、肖像、数值及身份由真实组件提供。`dialog-paper.svg` 为本地绘制的带固定种子纤维噪声的宣纸底纹。

对应参考、正式存档截图与隔离组件示例见 `docs/art-direction/dialog-redesign/comparison.html`，三者分别标注；生成画面不承担历史或机制事实。
