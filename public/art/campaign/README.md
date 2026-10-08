# 关中河洛三维战役地图资产

2026-10-08，经用户授权，由 Blender MCP 执行 `scripts/map-sample/build_campaign.py` 生成。用于独立 `map-sample.html`，尚未替换正式游戏地图。

- `terrain.glb`：296,065 顶点／589,824 三角面；范围 107.6°E–113.8°E，33.1°N–35.6°N。
- `elevation.bin`：769 × 385 个 little-endian float32，北到南、行优先，单位米；`terrain.json` 保存坐标与比例。高程约 62–3,610 米。
- `city.glb`：29,394 三角面；原创城墙、门楼、院落、瓦顶与近郊建筑，长安和洛阳共用基础原型，南侧留出三个动态营建地块。
- `market-1/2/3.glb`、`granary-1/2/3.glb`、`hostel-1/2/3.glb`：市肆、城仓、驿舍各三级原创模型；`worksite-0/1/2.glb`：地基、主体、屋面三个施工阶段。每个建筑模块低于 10,000 三角面，施工模块低于 3,000 面。
- `tree-0/1/2.glb`：332／332／76 三角面；全区域合计不超过 18,000 株，以实例化绘制。`rocks.glb`：115 面。
- `rivers.json`：10 条区域河段，包括黄河、渭河及部分支流；并非古代水系全集。

## 来源、署名与使用边界

真实地形采用 [Mapzen Terrain Tiles on AWS](https://registry.opendata.aws/terrain-tiles/)，2026-10-08 获取，Terrarium z8，x=204–209、y=100–103。下载 URL 模板：`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/8/{x}/{y}.png`。

SRTM and GMTED2010 terrain data courtesy of the U.S. Geological Survey. Global ETOPO1 terrain data courtesy of the U.S. National Oceanic and Atmospheric Administration. [上游署名与数据使用说明](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)。本区域派生地形做了网格插值、轻微滤波和约 10 倍垂直展示夸张；浏览器中还对城址做局部平整、对河槽做展示性适配。不得用于测绘、导航或历史精度主张。

河流来自 [Natural Earth 1:10m rivers](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/)，[公共领域](https://www.naturalearthdata.com/about/terms-of-use/)。源 GeoJSON：`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson`。现代中心线按附近 DEM 谷地做有限贴合和曲线平滑，河宽夸张以保证战役视角辨识；不代表南北朝古河道。

城市坐标和 ID 引用游戏 `siteById`。建筑、林木、农田、城郊路径及旗帜均为美术布局，不新增历史事实、政权关系或游戏状态。模型由本项目脚本原创，无《全面战争：三国》提取资产。全部运行时数据随本地构建提供，不依赖在线瓦片。

## 重建

将上述 24 张 DEM 原始瓦片放入 `.cache/map-style-sample/dem8/{x}-{y}.png`，Natural Earth 文件放入 `.cache/map-style-sample/rivers-10m.geojson`。在 Blender MCP 里设置 `FYNBC_PROJECT_ROOT` 为仓库根、`FYNBC_CAMPAIGN_BLEND` 为独立 `.blend` 输出路径；使用有 window 的上下文执行 `build_campaign.py`。脚本创建独立 scene，不修改既有场景。

城邑旗帜由运行时复用 `armyHeraldry` / `RealmFlag`：长安按开局归属展示西魏旗，洛阳展示东魏旗；不再使用样板单独绘制的国号旗。

动态建筑从独立教学演示局的真实营建状态派生，复用现有报价、扣款、工期、完工和三级上限规则。演示资金初始 2000 钱，日期推进包含现有营建模块的月度收入结算；不读取或写入正式存档。升级期间保留已建建筑并叠加工地，完成后切换新等级。城墙、人口密度和战损尚未动态化。

## 全国正式地图高程

`national-elevation.bin` 为 2048 × 1536 的 little-endian float32 米制高程，12 MiB；坐标窗口和数据来源见 `national-terrain.json`。由 `scripts/map-sample/build_national_dem.py` 解码 48 张 AWS Terrarium z5 瓦片（x=21–28、y=9–14），未经程序化造山。全国网格使用距离分级采样；近景按需读取同来源 z8 的 3 × 3 瓦片并与本地底图接缝过渡。城市覆盖范围测试通过，细化失败仍保留真实本地底图并告知用户。

正式入口使用 `src/map/three` 的独立 Three.js 场景，共用样板的地形、水面和季节材质；全国位置采用 Mercator 公里坐标，10 倍高程展示夸张。城址平整、河槽适配、田块和疏林仍为明确的美术展示，不用于历史精度或面积推断。资源沿用本页上方 Mapzen／USGS／NOAA 的来源与署名；水系及陆地轮廓使用项目已有 Natural Earth 本地资源。

### 全国本地近景高程

`elevation/manifest.json` 与 768 个 `elevation/*.bin.gz` 分块覆盖与全国底图相同的范围（Terrarium z7，x=84..115，y=36..59）。每块 256×256，gzip 压缩、小端有符号 16 位整数米；由原始 Terrarium 样本四舍五入到米，未生成山丘。来源仍为 Mapzen Terrain Tiles on AWS（SRTM / GMTED2010 courtesy USGS；ETOPO1 courtesy NOAA）。生成脚本 `scripts/map-sample/build_detail_dem.py` 保留下载缓存并验证载荷，缺块可独立重试。

运行时仅加载镜头附近 3×3 分块，最多缓存 48 张解码瓦片；全国资源约 58.9 MiB，不随首屏一次性下载。全国网格约 5 万顶点，近景细化约 14.8 万顶点，沿用真实高程与展示夸张。无需在游戏运行时请求 AWS。植被仍为确定性美术布局，不代表历史林地调查数据。

`national-parchment.webp` 是 `scripts/map-sample/build_parchment.py` 从同一全国 DEM 与 Natural Earth 陆地、水系预生成的纸绘图（2048×1536，约 67 KiB）。采用真实 DEM 连续山影，不再铺设重复山形符号；仅绘制自然地貌，不包含政权、城邑或军队；运行时复用实际控制遮罩，不再逐次重绘约 315 万像素。

`national-relief.png` 为 `scripts/map-sample/build_strategic_relief.py` 从全国真实 DEM 预生成的战略法线／高程纹理（1024×768，线性 RGBA 数据；RGB 为法线编码，alpha 为展示高程／180）。战略视图统一采样这一纹理，山纹、坡面光照与季节高程效果不再依赖镜头附近的近景网格细化程度。不是随机地形或新增历史数据。

### 室内舆图与雾外山水（2026-10-08）

`atlas-study.glb` 为本项目原创、通过 Blender MCP 制作的题材化室内模型（生成脚本 `scripts/map-sample/build_table_room.py`），11 个材质网格、52,270 个三角面、约 4.0 MiB。采用木构、素壁、屏风、低案、卷轴与文房器物营造南北朝氛围，不宣称考古复原。模型单位对应 1000 投影公里，桌上空出的 10.018754×7.514066 区域与真实全国 DEM 范围匹配，不含静态游戏地图截图。

`hidden-shanshui.webp` 由纸图生成脚本独立生成（2048×1536、约 180 KiB），仅在未建模范围遮罩中显示。其山峦、云带与竹枝是美术装饰，不代表新增地理考据、城邑或其他游戏实体；已知领地继续使用 `national-parchment.webp`。


### 室内精细化与原创山水长卷 v2（2026-10-08）

室内新增双段木作倒角、抽屉框与铜环、榫接装饰、卷轴包边、有内壁及口沿的旋转器皿；12 方向射线采样的环境遮蔽烘焙为顶点颜色，避免最远视角额外实时阴影开销。地面、器物、柜体接触明暗均随资产导出。木纹 shader 按屏幕采样范围淡出，减少缩放闪纹。

`hidden-shanshui-v2.png` 是本项目通过 imagegen 生成的原创淡彩山水装饰画（1448×1086，约 2.7 MiB），替换旧程序化雾外画；同图复用于五扇屏风的连续 UV，地图使用与屏风共享纹理，不新增重复图片。画中亭台、松竹与山峦仅为装饰，不是游戏实体或新增真实地理。旧 `hidden-shanshui.webp` 仅保留为旧版生成器产物，当前运行时不引用。

生成提示要点：四周非对称山水构图、中央大片丝绢留白；淡青灰远山、干笔山石、松竹、芦苇与小亭；细密笔触，不要重复三角山形、粗线、文字、印章或边框。原始生成图已复制入项目，不依赖本机生成目录。

右侧改为完整素壁，保留四扇有窗框与透光绢面的格窗；雾外山水在地图着色器中转为浅黑白，室内屏风仍复用原淡彩图。转换无需额外图像下载。


### 战役地图近中远景美术重作（2026-10-08）

`refine_campaign_art.py` 经 Blender MCP 处理原创城池、九种营建等级、三个施工阶段及三种树木。石墙和木构增加细倒角，六方向射线烘焙檐下／院落接触阴影，颜色与阴影一次写入命名顶点色 `Campaign AO`；导出显式指定该属性，避免空白主色覆盖烘焙色。屋顶保留曲面瓦垄与深青灰色，墙体为暖石灰／米灰，木构为深褐。原有城墙占地、门洞、宫署和营建地块保持可用。

城池为 29,394 三角面；阔叶树两种各 416 面，层叠针叶树 64 面，均在原预算内。正式地图加载全部三种树冠，合计仍为中景最多 1,000 棵、近景最多 2,400 棵；去除自发光，使用统一季节材质和场景日光。既有 `rocks.glb` 仅作实测陡坡上的局部装饰，最多中景 80／近景 240 组，不能充当缺失 DEM 的替代。

地表按大块黄绿草地、深绿林地、暖灰岩壁组织；四季继续共用同一着色链路。纸图从同一 DEM 与陆地／水系数据重新生成，暖白底、浅蓝水面、低对比山影。重建纸图可用 `build_parchment.py --national-only`，不改动已有雾外山水图。

资产重作的输入必须是 `build_campaign.py` 的原始导出目录，输出另存目录，分别由 `FYNBC_ART_SOURCE`、`FYNBC_ART_OUTPUT` 指定；不要把已经倒角的最终资产再次当作原始输入。所有形体、材质和植被布局均为本作美术表达，不是《全面战争：三国》提取资产，也不构成历史建筑／林地复原。


2026-10-08 浏览器实测修正：阔叶树冠修复向内的面绕序并封闭上下端，枝干改为四面截面；两种阔叶模型各 484 面，针叶 62 面，仍在原上限内。已用真实 GLB 有向体积测试约束树冠向外，并在正式地图夏／冬近景复核，不再出现黑色空洞。室内模型始终使用透明材质通道，只改变透明度和深度写入；正式地图空闲时按真实光照预编译，避免进入舆图及退出舆图时重新编译材质。

### 分枝树冠、连续水系与临河落位（2026-10-08）

`build_campaign_foliage.py` 经 Blender MCP 在独立场景生成原创枝干、细分叉与封闭小叶簇，不使用参考游戏资产或外部纹理。环境变量 `FYNBC_FOLIAGE_OUTPUT` 指向独立输出目录；编辑源 `.blend` 与报告保留在本地忽略目录。三种常规树为 656／656／912 面，三种近景树 `tree-close-0..2.glb` 为 3,056／3,056／4,272 面。常规模型单体上限 1,000 面，近景上限 4,500 面；近景细树总量不超过 450，包含在既有 2,400 棵总预算内，其余使用常规档。树位不随档位变化，移动期间不重建实例；颜色使用命名顶点色，季节与阴影仍共享正式渲染链路。

`river-corridors.geojson` 从 [Natural Earth 1:10m rivers and lake centerlines v5.0.0](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/) 提取，公共领域。仅保留全国 DEM 范围周边与 rank ≤ 6 的河段，共 203 条、32,123 个原始节点；下载原文件 SHA-256、来源及许可写入文件元数据。可通过 `node scripts/map-sample/build_river_corridors.mjs <下载文件>` 重建。**这里的 10m 指一千万分之一比例尺，不是 10 米精度。** 数据是现代概化河道，不作为南北朝历史河道、疆界或通行规则依据。

正式立体地图使用上述水系、受约束的圆滑转角和连续岸缘；每 512 段分块剔除，舆图远景不绘制细河道。道路仍是已有路网的示意路径，柔化曲线与路肩只改变展示，不改变行程、权限、地理判定或军队坐标。水面与道路采样实际渲染的地形三角面，减少穿地断线。

临河城市按保守包围圆缩放和有限移位，建康明确使用长江南岸约束；城池、铭牌、可点击模型、道路端点及农田中心共用展示落点。城址 ID、经纬度、规则和存档保持权威。没有安全展示位置时仅保留铭牌，不启用旧挤出模型。此为地图符号避让，不是历史城墙范围复原。
