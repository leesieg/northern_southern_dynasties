# 地图来源与第三方许可

## MapStage 设计与配置参考

- 项目：https://github.com/hopechen067/MapStage
- 参考版本：da43a271c9a0f59f63b4cffb6ce8aade239d37e6
- 参考内容：古地图配色、真实 DEM + 分层晕渲 + 矢量水系的组合、默认参数与城市分级的表现思路。
- 部分图层配置与配色按其 MIT 许可适配。完整许可保留在 `/licenses/MapStage-LICENSE.txt`。
- 未使用该项目的展示图片、视频、卫星影像服务或地区裁切边界数据；未安装其全局技能，未直接加载其调参界面。

## 运行库

MapLibre GL JS 6.10.0：用于地图投影、DEM 地形、矢量图层、海拔设色与城邑体块。许可见 `/licenses/MapLibre-LICENSE.txt`。

MapLibre Style Spec：用于构建阶段地图样式校验；许可见 `/licenses/MapLibre-Style-Spec-LICENSE.txt`。

## 高程

Mapterhorn：<https://mapterhorn.com/attribution/>。来源是 Terrarium 编码的真实高程瓦片，运行时从 `https://tiles.mapterhorn.com/{z}/{x}/{y}.webp` 获取；本地开发与预览通过固定来源代理转发，正式静态站点由浏览器直接请求。不同底层数据的完整署名与使用条件以该来源说明为准。

高程用于现代地形表达，游戏以轻度高度放大与自定义颜色渲染；不表示南北朝历史地貌考据。数据瓦片未打包进游戏。

## 矢量自然地理

OpenFreeMap © OpenMapTiles，数据来自 OpenStreetMap：

- <https://openfreemap.org/>
- <https://openmaptiles.org/>
- <https://www.openstreetmap.org/copyright>

使用公开 TileJSON `https://tiles.openfreemap.org/planet`，运行时仅显示水面、自然河流，以及林地、草地、沙地等地表覆盖；未显示现代行政区、城市名称、建筑或交通道路。底层数据为现代自然地理，不等于历史疆界与古河道，也不代表南北朝时期林地或土地利用范围。林冠、地表颗粒与水面细纹由本作原创静态纹理表现，不是新增地理观测数据。

## 本地备用图层

Natural Earth 1:110m 陆地与河流，公共领域。<https://www.naturalearthdata.com/about/terms-of-use/>。

在线数据不可用时，本地图层仍可显示并继续游戏，界面会显示加载问题；本地图层不具有在线高程和矢量水系的细节。

## 游戏原创示意数据

庄园底画与建筑图集（`/art/estate/landscape.png`、`/art/estate/buildings-clean.png`）由 OpenAI ImageGen 为本项目生成。未复制或分发《Crusader Kings III》的图片资源。建筑造型为游戏美术想象，不作为历史建筑考据依据。

政权着色与边界为手工编制的开发示意区，不是 546 年历史疆界复原。城邑建筑是夸张比例的战略符号，不是古城测绘模型。人物位置和行程来自游戏规则，其展示不改变存档、资源或旅行时间。

## 历史区划与庄园设计参考

- 《南齐书》卷 14、15（古籍原文）：https://zh.wikisource.org/wiki/南齊書/卷14 、https://zh.wikisource.org/wiki/南齊書/卷15 。用于较早的州郡县名录基底，不能直接代表梁中大同元年的全部沿革。
- 《魏书》卷 106 上、下（古籍原文）：https://zh.wikisource.org/wiki/魏書/卷106上 、https://zh.wikisource.org/wiki/魏書/卷106下 。区分东魏武定时期记载和西部较早资料。
- 《梁书》卷 3（古籍原文）：https://zh.wikisource.org/wiki/梁書/卷03 。用于梁代州名与时间校读。
- CK3《Roads to Power》官方庄园介绍：https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-roads-to-power 。参考家族在没有官职领地时仍持有庄园、通过建设增强家产的机制方向；不使用其媒体、代码或建筑数值。

新增坐标为开发者手工近似锚点，区划几何为生成的交互分区，不是来源提供的历史边界。未导入 CHGIS 的非商业许可数据库。所有地图中的工程造价、工期和收益属于游戏参数。

## Three.js

城市立体模型使用 Three.js 0.180.0（含 OrbitControls），MIT 许可。模型几何由本项目生成。

The MIT License

Copyright © 2010-2025 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

## 历史人物资料

人物身份与关系依据《梁书》卷三、四、五，《魏书》卷十二，《北史》卷五，《北齐书》卷二、三、四，《周书》卷二、十六；来源为维基文库所载古籍原文。逐人链接保存在 `src/data/characters.ts` 并在游戏人物页展示。简介由本项目概述，未使用第三方肖像。单城治理、初始资产与胜利目标为游戏设计，不作为史实数据。

## 主菜单场景

`/art/menu/realm-dawn.png` 由 OpenAI ImageGen 为本项目原创生成（2026-09-22），表现架空演绎的城邑、朝堂、农田与军旅。没有使用 CK3 图片或音频；不声称为某一南北朝城市、服饰或建筑的考古复原。原图约 2.6 MB，随本地项目提供。

## 人物三维肖像

历史人物半身网格、参数配置和服饰部件为本项目代码生成，使用 Three.js（MIT）及其 OrbitControls、GLTFExporter。未使用 CK3 模型、贴图或其他第三方人物资产。脸型、发须、冠帽与服饰是美术演绎，未主张真实容貌或考古复原；历史身份来源与造型参数分开维护。

## 界面彩绘图标

`/art/interface/strategy-icons.png` 为 OpenAI ImageGen 为本项目原创生成的 4×4 透明图集（2026-09-22，约 1.9 MB），用于资源、六种特质、人物／城市定位、全图和庄园入口。图形为游戏语义与艺术演绎，不是古物或制度考据；不使用 CK3 图标。部分类别预留，不代表对应游戏功能已开放。


## 人物平面绘卷

`/art/portraits/liang.png`、`east.png`、`west.png` 为 OpenAI ImageGen 为本项目原创生成的 2×2 图集（2026-09-22），共 11 位历史人物及虚构人物沈行舟。传统工笔勾线、水墨设色和纸本质感为艺术方向；参考《太吾绘卷》官方展示（https://www.conchship.com.cn/）的平面人物表达，未使用该游戏的立绘、纹理或其他资产。造型为艺术演绎，不主张真实容貌或服饰考古复原。原始生成文件保留，游戏通过 CSS 分区展示，未对图集二次加工。

## 组合立绘图层

### C 线描淡彩组合试制（2026-09-23）

全量接入新增 `/art/portraits/painted-c/roster/`：18 张内置 OpenAI ImageGen 原始生成文件及此前 3 张项目原创面容来源图，未使用商业游戏素材。原始文件保持不变，运行时裁切和遮罩组合。覆盖全部现有人物入口；部分次要人物共享年龄／性别模板，以各自稳定基因区分。新增人物衣冠、视觉年龄及面容为美术演绎，不代表真实历史容貌。完整提示词、文件映射与已知边界见 `output/portrait-direction/style-c/roster-prompts.md`。

`/art/portraits/painted-c/` 的 `base.png`、`features-a.png`、`features-b.png`、`robe-b.png` 为内置 OpenAI ImageGen 为本项目原创生成。参考为项目自有 C 风格元善见原画，未使用商业游戏素材。图片原样保留，运行时通过 Canvas 裁切、遮罩和定位组合。组合样板经用户人工验收通过，已首批接入元善见正式肖像，其余规格仍待制作。衣冠与容貌为美术演绎，不代表考古复原或真实人类遗传规律。生成提示词及源文件对应关系保存于 `output/portrait-direction/style-c/parts-v2-prompts.md`。

`/art/portraits/layers/heads-male.png`、`heads-female.png` 和 `clothes.png` 为内置 OpenAI ImageGen 原创生成（2026-09-22）。两张男女面容图集各四种脸型，一张南北文武衣装图集四种衣装，均为透明 PNG。原图保留，游戏通过 CSS 分区叠放，未用商业游戏资产。职位佩饰和特质物件为项目原生 SVG 绘制。生成提示词保存在 `docs/人物分层素材提示词.md`。衣冠、面容、性别表现和遗传参数都是游戏美术设计，不作为真实历史容貌、民族血统或生物遗传结论。


### 梁武帝形象参考

《历代帝王半身像　册　梁武帝》，国立故宫博物院，台北。参考公开低分辨率图与目录（馆方说明低阶图像 CC0，目录文字 CC BY 4.0）：https://digitalarchive.npm.gov.tw/Collection/Detail/15644?dep=P 。游戏使用原创参数化矢量绘制，未嵌入馆藏原图，不表示馆方参与或认可本游戏；传世画像不被当作同时代写生证明。
