# 建康独立美术样板资源

仅由 `map-art-sample.html` 使用，未接入正式游戏。2026-10-11 制作，画面待用户确认。

- `outcrop-0.glb` 至 `outcrop-4.glb`：本项目原创风化岩体，分别为宽岩台、斜断面、坡脚碎石、薄岩棚与错层岩面，1084／964／1560／664／958 三角形；包含顶点矿物色，GLB 无外部依赖；样板着色复用项目 terrain-atlas-v1.png。生成脚本：`scripts/map-sample/build_sample_outcrops.py`；可编辑源：`art/campaign/sample-outcrops.blend`。坡向摆放、埋地与材质细节由独立样板实现。
- `jiankang-dem/`：Mapzen Terrain Tiles on AWS 的 Terrarium z11，建康附近约 65 米采样，9 块 256×256 高程，转为 gzip 小端 int16 米值。生成脚本：`scripts/map-sample/build_jiankang_sample_dem.py`。来源：<https://s3.amazonaws.com/elevation-tiles-prod/terrarium/>；署名：SRTM、GMTED2010 courtesy USGS；ETOPO1 courtesy NOAA。许可及来源说明：<https://github.com/tilezen/joerd/blob/master/docs/attribution.md>。

高程是现代地形数据；显示高度以米值乘 0.010 作统一夸张，精细高程以跨瓦片的高斯滤波降低过密起伏，不改源高程文件。河流中心线沿用项目 Natural Earth 数据，展示河宽、岸坡、浅滩及岩石布置为美术处理，不能解释为测绘河宽或南北朝景观复原。外围继续使用项目已有低精度真实高程，以平滑权重衔接精细区域；不叠加虚构山丘。

美术方向沿用已核对的《全面战争：三国》战役地图参考，未提取或复制其模型、贴图。

2026-10-12 按用户提供的战役地图截图细化：宽面节理岩体替换球状岩体，河弯内侧岸坡放宽、外侧收窄，林缘树木随覆盖度降低尺寸；近中心使用已有高精度树模，外围复用轻量树模。参考截图仅用于美术对照，不提取其中资产或替换真实地理。

2026-10-12 岩石二次优化：取消收尖圆顶和全表面平滑，保留宽面与不规则斜断口；五种轮廓采用沿等高线的倾斜、错位组合，主岩面与碎石采用不同露出高度。材质改为三向投影，减弱低频凹凸与重复条纹，降低球面塑料感。
