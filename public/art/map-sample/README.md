# 地图样板资源

`northern-city.glb` 与 `woodland-tree.glb` 均为本项目通过 Blender MCP 制作、导出的原创模型，未提取《全面战争：三国》资源。

- 城邑：47,286 三角面、5 个材质批次，内嵌原创程序化表面纹理，包含近郊建筑与静态旗帜。长安、洛阳暂共用北方城邑美术原型，不是历史城建复原。
- 林木：140 三角面、2 个材质批次，约 8.2 KiB。运行时实例化，上限 280 株；不按叶片建模。
- 模型为展示单位，地图侧按米换算并绑定实际城邑坐标。规模夸张属于视觉参数，不影响人口、建设或规则。
- `ground-atlas.png`：本项目使用 imagegen 原创生成的四区地表材质（草地、林冠、岩石、耕地），直接作为运行时纹理使用；没有截取《全面战争：三国》的游戏资源。林地覆盖取自真实矢量数据，岩坡依据真实 DEM 坡度；城郊田块及点景树木是美术布置，不是历史土地利用复原。

导出脚本：`scripts/map-sample/export_assets.py`。在 Blender 中打开前期保存的 `guanzhong-heluo-sample.blend`（含 `Guanzhong_Heluo_Style_Study_v2` 场景），设置环境变量 `FYNBC_PROJECT_ROOT` 为项目根目录，再经 Blender MCP 执行脚本。不要导出其他场景的默认 Cube。

运行时地形与矢量数据沿用游戏提供方：Mapterhorn 高程（https://mapterhorn.com/attribution/），OpenFreeMap / OpenMapTiles / OpenStreetMap（https://www.openstreetmap.org/copyright）。备用地理数据来自 Natural Earth。署名保留在地图上；现代河流和林地不作为 546 年地理复原。
