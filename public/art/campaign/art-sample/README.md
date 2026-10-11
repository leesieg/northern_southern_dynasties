# 建康独立美术样板资源

仅由 `map-art-sample.html` 使用，未接入正式游戏。2026-10-11 制作，画面待用户确认。

- `outcrop-0.glb`、`outcrop-1.glb`、`outcrop-2.glb`：本项目原创风化岩体，分别为主岩面、岩脊与坡脚碎石组合，3840／3840／5120 三角形；包含顶点矿物色，无外部贴图。生成脚本：`scripts/map-sample/build_sample_outcrops.py`；可编辑源：`art/campaign/sample-outcrops.blend`。坡向摆放、埋地与材质细节由独立样板实现。
- `jiankang-dem/`：Mapzen Terrain Tiles on AWS 的 Terrarium z11，建康附近约 65 米采样，9 块 256×256 高程，转为 gzip 小端 int16 米值。生成脚本：`scripts/map-sample/build_jiankang_sample_dem.py`。来源：<https://s3.amazonaws.com/elevation-tiles-prod/terrarium/>；署名：SRTM、GMTED2010 courtesy USGS；ETOPO1 courtesy NOAA。许可及来源说明：<https://github.com/tilezen/joerd/blob/master/docs/attribution.md>。

高程是现代地形数据；显示高度作统一夸张。河流中心线沿用项目 Natural Earth 数据，展示河宽、岸坡、浅滩及岩石布置为美术处理，不能解释为测绘河宽或南北朝景观复原。外围继续使用项目已有低精度真实高程，以平滑权重衔接精细区域；不叠加虚构山丘。

美术方向沿用已核对的《全面战争：三国》战役地图参考，未提取或复制其模型、贴图。
