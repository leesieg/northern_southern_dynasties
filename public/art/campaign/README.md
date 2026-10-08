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
