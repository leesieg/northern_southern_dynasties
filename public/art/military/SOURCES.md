# 军队地图素材

- `material-atlas.png`：2026-09-30 使用内置 imagegen 生成并保存的原创六格材质图集，1536×1024。用于军队模型的彩色贴图／微小凹凸与兵力牌底材；不是考古复原或历史器物照片。
- 政权军旗来自项目现有 `RealmFlag`，沿用国号、颜色与纹章。SVG 经 React 转义并以独立图像载入；未新增历史国徽声明。
- 旧版程序化兵模网格、甲片、马具、车架与动画由项目代码原创构建，现已统一替换为下文的 Tripo 单兵资产。EU4、CK3 仅作为军旗／兵力牌层级与战略地图微缩单位的视觉参考，未使用其商业美术文件。
- 参考：[EU4 官方介绍](https://www.paradoxinteractive.com/games/europa-universalis-iv/about)、[CK3 官方介绍](https://www.paradoxinteractive.com/games/crusader-kings-iii/about)。

## 生成模式与提示词

内置 imagegen；无 API／CLI 备用调用。完整提示词：

```text
Use case: historical-scene
Asset type: original physically based game material color atlas, for detailed sixth-century Chinese military miniatures in a historical grand strategy game.
Create ONE clean 3-column by 2-row material atlas. Landscape, exactly six equal rectangular panels, no gutters, no margin, no text, no labels, no objects and no icons. Every panel is a flat orthographic material surface with completely even neutral lighting: no directional shadows, no specular hot spots, no vignette. Fine, restrained, natural color variation, excellent close-up surface detail. Each panel is independently seamless at its edges.
Top left: deep muted ink-green woven silk and wool cloth, fine thread structure, slight hand-dyed tonal variation, base #334637.
Top center: aged dark iron lamellar armour surface, closely spaced small overlapping rectangular iron lames with fine leather lacing and subtle hammered iron grain, charcoal slate #535952, restrained rubbed pale edges, no modern screws.
Top right: worn old brass / bronze, softly brushed, subtle patina in recesses, rich dull antique gold #a98c58, no bright yellow.
Bottom left: dark oxblood brown vegetable-tanned leather, fine pores and creases, base #493b2d, lightly worn, no dramatic tears.
Bottom center: dark brown fine-grained historical hardwood, long natural grain running vertically, base #65533b, hand-worked timber, no nails or modern machining.
Bottom right: pale unbleached linen fabric for historical tents, warm paper-beige #c4b597, visible fine weave, subtle wear, no stains, no patterns.
Style: high-quality art-directed realistic material texture work suitable for a premium historical strategy game, tactile and understated. Original asset. No Paradox logos or copied game artwork. Do not draw a scene or a character; ONLY the SIX evenly lit seamless material panels.
```

## 兵团立牌插画（2026-09-30）

`regiment-portraits.png`：使用内置 imagegen 生成的原创南北朝题材游戏插画，六格分别表现刀盾兵、长矛兵、弓弩兵、轻骑兵、甲骑与攻城队。非史料复原，不使用商业游戏截图裁片。用于 UI 兵种识别；兵数、训练、经验来自世界状态。源图 1254 × 1254，每格 418 × 627；SVG 视口裁取并保持纵横比，不拉伸、不附带文字或虚构数值。

## Tripo 单兵骨骼与动画（2026-10-09）

- `infantry-rigged-v1.glb`：用户通过 Tripo 制作并提供的 `风云南北朝-单兵.glb`，经本地 Blender 5.2 添加骨骼、蒙皮及动画。保留原有 5,864 个三角面、单材质及三张内嵌 PBR 贴图；原始文件未修改。其生成与授权沿用用户的 Tripo 资产来源，不声明为第三方开放许可素材。
- 原文件 SHA-256：`e90362779e62a1d93dd8b6deee9888f71c886d2318f34f89a7b6c6a27c616dd5`。
- 29 个关节，包含躯干、头部、四肢、脚趾、盔缨及左右各三片甲裙骨骼；每顶点最多四个归一化权重。自定义命名骨架，不声明直接兼容 Mixamo 重定向；手掌为整体控制，无独立手指骨骼。
- `Idle`：2.4 秒循环，呼吸、轻微头部及手臂运动；`Walk`：1.2 秒循环，交替迈步、摆臂与甲裙跟随。两段均从零秒开始、以 30 fps 烘焙关节关键帧，根骨固定。动画为程序化制作，不是动作捕捉；未包含跑步、攻击或受击。
- 导出坐标：米制、Y 向上、+Z 为正面、脚底在原点附近，连盔缨约 1.82 米。行军为原地动画，位置由游戏真实军队坐标驱动。正式地图以实时时钟播放，行军／撤退用 Walk，驻军／训练／围城／交战暂用 Idle，状态切换混合过渡；游戏逐日位置更新与美术步频分别处理，不引入动画根位移。
- 可编辑源文件：`art/military/infantry-rigged-v1.blend`，包含打包贴图、命名骨架和独立动画。复现入口：`scripts/map-sample/rig_infantry.py`，以 Blender 后台模式运行，`--` 后传入原始 GLB 路径；脚本会覆盖本项目上述生成资产。
- 验证：`npx vitest run scripts/map-sample/infantry-rig.test.mjs`，在 Three.js 中加载实际导出骨架并采样两段动画，检查权重、循环端点、根骨、形变与落地范围；另以 Blender 重新导入导出 GLB 做离线预览。
- 已接入正式 Three.js 地图及共用地图兵模入口，所有兵种暂时共用此单兵；原有兵种属性、数量、军旗和操作保持不变。动画观感与甲裙在近景下的效果待用户人工验收，低面数源模型的脸部与轮廓精度仍受原网格限制。
- 自然度修订：修正关节局部轴导致的手臂扭动，站姿收拢上臂并微屈肘；行军改为反向摆臂、支撑侧重心转移、双脚承重时降低骨盆、单脚支撑时抬高骨盆。脚部采用脚跟接触／全脚掌承重／脚尖离地，摆动轨迹衔接前后速度并降低抬脚高度；待机呼吸、头部和盔缨错开相位。补充实际 GLB 的站姿手臂位置及手脚反向摆动回归检查，预览以 30 fps 输出正面与侧面。此修订仍为人工制作的程序化动作，最终自然度由用户验收。

- 接入实现：共享加载单份 GLB，使用 SkeletonUtils 为每支军队克隆独立骨架与 AnimationMixer，共享网格和材质；关闭军队动态时显示静态待机姿态。移除军队／重建模型／退出地图时释放独立骨架与混合器，下载期间卸载不会重新挂载模型；加载失败保留军旗操作并提示。正式地图的 +Z 朝南，模型朝向按真实路线方向转换。CPU 局部测试覆盖正式场景挂载、坐标锚定、兵种共用、独立动画、过渡、关闭动态、加载失败和释放；视觉仍待用户人工验收。
- 光影修订：兵模加载后共享一份程序化柔和日光环境反射（16×16×6 面，线性色彩），补充背光金属缺失的间接反射；金属度系数为原值的 0.85，法线强度为原值的 0.8，保留原贴图、粗糙度及场景投影／受影。不使用自发光提亮，不改变全图曝光、地形或城市光照。环境纹理随模型资源释放；具体亮度与盔甲质感待用户在正式地图人工验收。

## 轻／重骑兵完整资产（2026-10-09）

- 用户在 iCloud `05 AIGC/3D` 提供减面后的两套战马。原轻骑 65,802 面、18.03 MiB；原重骑 68,040 面、20.01 MiB，均为无骨骼单网格，三张内嵌贴图完整。只读取源文件，未覆盖 iCloud 资产。同期投石车为 60,796 面、15.75 MiB，本轮仅检查，未制作投石车动画。
- `light-cavalry-v1.glb` / `heavy-cavalry-v1.glb`：马体分别简化至 20,000 面，复用现有 Tripo 单兵 5,864 面制作骑乘姿态，补两条缰绳；完整资产各 27,016 面、3 个材质、6 张内嵌贴图，分别 10.17 / 10.80 MiB。马体使用 1K 图，骑手保留原贴图。为本项目战役地图的展示模型，不宣称历史装备复原。
- 源文件 SHA-256：轻骑 `d5c14edcc5d66e016356816aa11bd1be943a5146be120af361fee136367d585c`；重骑 `9ea49675177f281798774bae056c0a67b4464e290f1db6a913a79ec619bd988b`。授权沿用用户提供的 Tripo 资产，不声明额外开放许可。
- 每套单骨架 48 个关节，每顶点至多四个归一化权重。四蹄定位来自各自源网格，修正减面导出的平面朝向偏转；骑手包含坐姿、踩镫、持缰手臂和甲裙展开，骨盆随马鞍，躯干轻微补偿。轻重骑暂共用同一骑手，主要以马匹披甲区分。
- `Idle` 为 3 秒循环：呼吸、颈头与尾部微动；`Walk` 为 1.6 秒循环：四拍慢步、较长支撑期、低抬蹄、身体重心和尾部跟随。抬蹄段使用与支撑段衔接的速度曲线。动画采用程序化关节制作，非动作捕捉；未包含快跑、冲锋、攻击或受击。根骨固定，GLB 为 Y 向上、+Z 向前，地理位移仍应由正式地图负责。
- 可编辑源：`art/military/light-cavalry-v1.blend`、`heavy-cavalry-v1.blend`。生成脚本 `scripts/map-sample/rig_cavalry.py`，在 Blender 后台使用 `--python-exit-code 1 --python` 运行、`--` 后传入战马目录；重新导入实际 GLB 的离线预览脚本为 `scripts/map-sample/render_cavalry_preview.py`，预览输出到忽略目录 `.cache/cavalry-rig/`。
- 验证：`npx vitest run scripts/map-sample/cavalry-rig.test.mjs` 使用 Three.js 读取实际 GLB，检查网格与文件预算、内嵌贴图、骑手／马体、全部权重、零起点与循环端点、根骨、逐帧有限形变、落地范围、四拍支撑及尾部／胸腹网格的局部拉伸；共 3 项资产测试通过。生产构建通过。未进行浏览器 UI 自动验收、正式地图性能测试或全量游戏回归；骑乘自然度及近景穿插仍由用户看动态预览确认。
- 本轮只补齐并交付两套骑兵资产，尚未接入 `MilitaryModels` 或改变正式地图的兵种映射。后续接入需要分别缓存轻重骑、保持独立动画混合器，并复用兵模补光、实际军队坐标和资源释放机制；投石车仍需拆件和制作动画。

## 骑兵正式接入与攻城队准备（2026-10-10）

- 轻骑与甲骑已分别接入正式 Three.js 地图和共用地图兵模入口。混编军队按现存人数最多的展示组选择代表模型：刀盾／长矛／弓弩合计为步兵组，轻骑、甲骑、攻城各自统计；同人数按步兵、轻骑、甲骑、攻城顺序稳定选择，零兵力不影响选择。仅影响美术，不改兵种属性、人数或战斗结算。
- 各兵种按需加载、每类共享一份网格／贴图，军队各自克隆骨架与混合器；骑兵使用 0.76 的展示缩放，兼容现有军旗与点击范围。继承日光补光、实际军队坐标、行军／撤退 Walk、其他状态 Idle、关闭动态、失败提示及资源释放。重编／伤亡引起主兵种变化时重新选模；攻城暂保留现有单兵展示。
- `siege-crew-v1.glb` 为尚未接入游戏的准备资产：用户当前投石车 60,796 面，保留原轮廓简化至 20,000 面，加两名现有单兵后共 31,728 面、60 个关节、约 9.85 MiB；车体贴图缩至 1K，6 张内嵌 PBR 图。源文件 SHA-256：`910945f6a3233bf84e96cbf3f73c244694ed5a84c62f9a338ad3caed3df1826a`。来源及授权沿用用户的 Tripo 资产，iCloud 原文件未修改。
- 攻城队 `Idle` 2.4 秒、`Walk` 1.2 秒，均仅包含两名军士的现有动作，根骨与车体固定。源模型的轮轴／轮面与车架连成一体，按空间区域切割会破面，因此准备版保留完整车体；车轮转动、推动／牵引、装填、投臂与绳索抛射仍待专门拆件、绑定和动画，不能作为完成的攻城动画交付。此资产为游戏演绎，未声称南北朝器械的考古复原。
- 可编辑准备源 `art/military/siege-crew-v1.blend`；复现脚本 `scripts/map-sample/rig_siege.py`，Blender 后台 `--python-exit-code 1 --python` 后传脚本、`--` 后传投石车 GLB。仅覆盖项目内准备资产，离线预览与统计输出在 `.cache/siege-rig/`。
- 本次局部验证：`src/map/riggedInfantry.test.ts`、`src/map/three/armyActors.test.ts`、`src/map/militaryPresentation.test.ts`、`src/map/militaryLayer.test.ts`、`scripts/map-sample/siege-rig.test.mjs`，连同其直接依赖测试共 9 文件 80 项通过。覆盖实际轻重骑 GLB 的缓存、独立动画、迟到下载与换模、失败隔离、军队坐标、投影点击范围与释放，以及攻城准备资产的预算、权重、循环、落地、军士运动和车体无形变。生产构建通过，保留既有大包体提示。未做浏览器 UI 自动验收、正式地图帧率测量或全量回归；用户在正式游戏人工确认骑兵外观、方向和动画自然度。

### 攻城车方向、完整动画与正式接入（2026-10-10）

- 修正车体前后相反的问题：军士与车体统一以 Blender -Y／GLB +Z 为前进方向；长投臂待机在轮轴后方，发射越过轮轴向前。iCloud 源文件仍未修改。
- 保留源模型上部车架与 PBR 材质，重建原先连成一体的下车架、四轮、轮轴、投臂、铁箍、绕索筒、吊索及开口皮兜；旧轮面／吊兜不叠留。刚性部件独立绑定，车架切口平面裁切封口，避免旋转破面或悬垂碎片。新增木纹为脚本生成的内嵌贴图，木铁与绳索几何为本项目制作，不另引入第三方素材。
- 当前 `siege-crew-v1.glb`：40,455 三角面、70 关节、8 材质、7 张内嵌图、12,414,084 字节（约 11.84 MiB）。包含两名复用单兵。每顶点至多四个归一化权重；四轮各为刚性绑定，半径 0.30、正向完整转动，模型根骨不移动。
- `Idle` 2.4 秒；`Walk` 3.6 秒，三个军士步态周期配合一圈车轮，手臂 IK 保持把手位置；`Attack` 8 秒，军士装填、牵索、投臂前甩、双绳保持连接、石弹离袋向 +Z 飞出后隐去、缓慢复位。循环端点按旋转等价性检查（四元数 q 与 -q 等价）。动画为战役地图展示，不是动作捕捉或南北朝器械的工程／历史复原；石弹仅为视觉效果，不产生新的伤害、弹药或战斗结算。
- 已正式接入攻城队代表模型，按原混编主兵种选择规则显示，展示比例 0.68。围城／交战用 Attack，行军／撤退用 Walk，其余用 Idle；进入新的攻击状态从装填开始，转换混合过渡，关闭动态时回到静态待机。步兵与骑兵不含 Attack 时沿用原行为。军队仍使用真实地图坐标；抛出石弹不扩大军队的固定点击轮廓。加载失败保留军旗和操作并提示。
- 编辑源与构建脚本沿用原路径；新增 `scripts/map-sample/render_siege_preview.py`，重新导入实际 GLB 后做离线关键帧检查，`--animate` 输出两套完整循环。导入前设定 30 fps，避免 Blender 默认导入帧率让预览加速；预览放 `.cache/siege-rig/`，不包含游戏 UI 自动验收。
- 验证：上述五个局部测试入口及直接依赖共 9 文件 84 项通过，覆盖骨架／预算／权重、方向、滚动、落地、循环、装填与前向抛射、状态转换、正式地图定位、变形后多角度点击轮廓与资源释放。生产构建通过（既有大包体提示保留），本地 GLB HTTP 200 与资源长度一致。未做全量游戏回归、GPU 性能实测或浏览器 UI 自动验收；游戏内动作自然度与最终美术效果待用户人工确认。
- 投石袋方向修订：原摆动角符号导致投石袋相对投臂末端顺时针运动。改为发力至 4.48 秒释放点持续逆时针摆动，投臂退回后才回摆；扩大摆幅并延后回摆，避免反向后袋体擦入投臂。开索方向及开始时刻、石弹释放位置共用修正后的摆角，石弹上抛轨迹同步避开投臂。新增实际 GLB 的有向转角、袋体／石弹与投臂间距及离袋连续性回归，修复前失败、修复后通过；资产及动态点击轮廓等局部检查共 3 文件 64 项通过，生产构建通过。更新的离线发射动图为 `.cache/siege-rig/siege-attack-ccw.gif`，游戏内效果仍由用户人工确认。
- 双绳连接修订：移除“开索”阶段主动移动右侧袋口绳端的偏移，发射时仅石弹离袋，两根绳子在顶部、发射和复位期间始终系在袋口。新增实际蒙皮网格两端的连接检查，以 60 Hz 采样全部 Idle／Walk／Attack 动画，检测袋口及投臂连接点，允许烘焙帧间插值误差小于绳半径；修复前复现 Attack 4.5 秒右绳端脱离，修复后全部 6 项资产检查与生产构建通过。离线预览为 `.cache/siege-rig/siege-attack-ropes-fixed.gif`；待用户在游戏内人工验收。

### 2026-10-10 分兵种武器装备

用户提供 iCloud `05 AIGC/3D` 下的刀、盾、矛、弓、箭袋 GLB。原始文件保持不变，许可沿用用户自备 Tripo 素材的使用授权；不新增第三方武器素材。来源校验：

- `风云南北朝-刀.glb`：SHA-256 `5bab1a238dbb609bf148ddee7b3270724ca8cbfe8d291cd83b9660b7b9b6e6db`；游戏版 3,000 三角面。
- `风云南北朝-盾.glb`：SHA-256 `254d68d3e81de2d6639b46cdcdf4b7eb2755b098ce07727b1eceb58f6339b866`；游戏版 2,999 三角面。
- `风云南北朝-矛.glb`：SHA-256 `98d4d250217664bc402c89863b11d5d425dbeb24b77036c9e2d4f0827f66e43d`；游戏版 3,000 三角面。
- `风云南北朝-弓.glb`：SHA-256 `d82678fe55762507c37df6d6d447b703d9ceb8f1376c2b7eb8f2cd26ce88cf05`；游戏版 5,000 三角面。
- `风云南北朝-箭袋.glb`：SHA-256 `c9eb1ee4f7dcc3c4c244be7e196330d2f90b4d5497ee06c76d7a378dfa46f2ec`；游戏版 5,000 三角面。

- `weapons-v1.glb` 为共享装备包，共 18,999 三角面、15 张内嵌 512×512 贴图、6,135,580 字节。保留原 PBR 与 UV，减面并归一化握点；每军独立骨骼挂点，共享武器几何与材质。源工程 `art/military/weapons-v1.blend`，构建脚本 `scripts/map-sample/build_weapons.py`。
- 刀盾兵配右刀左盾、长矛兵配矛、弓弩兵配弓和背部箭袋、轻骑兵配刀、甲骑配矛；攻城队保持原操作器械模型。步兵总量仍用于原主力类别比较，再按存活最多的步兵子类选择装备，同数按刀盾／长矛／弓弩稳定优先。旧编制默认刀盾，不修改兵员、伤害、征募、存档或军队坐标。
- 武器随手部或胸部骨骼运动，复用现有待机／行军动画；本次不新增挥砍、刺击或拉弓动作。装备下载失败提示并保留军士和操作；模型替换及销毁不复活旧装备。
- 7 个直接相关测试文件共 87 项通过，覆盖资源预算／内嵌贴图、实际模型挂点、全动画片段抽样离地、主兵种选择、异步加载与失败、正式地图定位及多朝向点击范围。生产构建通过（保留既有包体警告）。离线预览脚本 `scripts/map-sample/render_weapons_preview.py`，预览 `.cache/weapons/equipped-lineup.jpg`；游戏 UI 与最终美术效果待用户人工验收。
