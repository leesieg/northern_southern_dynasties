# 文化服饰图集 v1

2026-10-01，使用内置 ImageGen 生成并编辑，透明 PNG 已复制到项目。没有导入《全面战争：三国》或其他游戏美术。服饰为南北朝题材的游戏概括，并非考古复原；历史参考见 `src/data/cultures.ts` 中的国博陶俑资料。

| 文件 | 实际尺寸 | 排列与裁切 |
| --- | --- | --- |
| male-v1.png | 1254 × 1254 | 3 列 × 2 行，每格 418 × 627 |
| female-v1.png | 1254 × 1254 | 3 列 × 2 行，每格 418 × 627 |
| child-v1.png | 1448 × 1086 | 2 列 × 1 行，每格 724 × 1086 |

成人上排汉式、下排鲜卑式；列依次为日常、行政官员、统帅。儿童左汉式、右鲜卑式，使用独立身形，不叠成人冠帽。君主沿用既有礼服；敕勒、羯及未详暂保留原立绘。衣身和冠帽单独裁切，脸、五官、基因与年龄来自既有人物绘制流程。实际裁切取最终尺寸，不以生成时要求的尺寸冒充结果。

以下为按最终资产整理的复现提示词；成年两张经过透明背景和等分布局修订。最终图集已查看，PNG 结构、尺寸、透明通道、配方坐标和五官保留通过非 UI 检查；与原脸拼合后的衣领、帽子、边缘色晕、男女及儿童比例仍待游戏中人工验收。

## 男性服饰

```text
Create an original Northern and Southern Dynasties costume-only atlas for an existing flat ink-line and muted watercolor portrait system. A square transparent PNG with exactly three columns and two rows of equal 2:3 cells. Each cell has the same centered three-quarter-view shoulder and torso rig. NO face, head, skin, hair, neck, hands, text, labels, background, ground or cast shadow. Leave the head and neck opening empty. Separate matching headwear near the upper portion of each cell; the body starts below it. Keep clear padding between cells and all ink inside each cell.
Top row, Han-style: (1) broad cross-collar civilian robe in muted jade and paper colors; (2) formal administrative robe with a modest black official cap; (3) practical lamellar military clothing and a compact military cap.
Bottom row, Xianbei-style: (1) fitted narrow-sleeved belted tunic; (2) compact belted administrative outfit and modest cap; (3) cavalry-oriented narrow-sleeved lamellar outfit and compact military cap.
Use delicate dark ink outlines, soft subdued watercolor, consistent light, no glossy rendering or 3D model aesthetic. Historical game interpretation, no ethnic facial traits. Garments only, reusable across the existing faces. True transparent alpha everywhere outside the ink and watercolor garments.
```

## 女性服饰

```text
Create the female version of the same original Northern and Southern Dynasties costume-only atlas. Exactly three columns by two rows of equal 2:3 cells in a square transparent PNG. Same centered three-quarter-view shoulder and torso rig, modest practical silhouettes and consistent scale. Top row Han-style civilian cross-collar robe, administrative robe, and practical military lamellar outfit. Bottom row Xianbei-style narrow-sleeved belted civilian tunic, administrative outfit, and cavalry-oriented military outfit. Place detached matching modest headwear above the garment in each adult cell.
Delicate ink line and muted jade, old gold and paper watercolor, consistent with a flat painted portrait game. NO head, face, skin, neck, hair, hands, text, grid lines, background, haze, ground or cast shadow. Empty neck opening. Every non-garment pixel must be truly transparent. No adult body exaggeration, no pin-up styling, no imported game artwork.
```

## 儿童服饰

```text
Create an original two-cell costume-only atlas for child portraits in a Northern and Southern Dynasties ink-line and soft muted watercolor game. One row of two equal 2:3 cells on a transparent canvas. Left: a child-sized Han-style broad cross-collar robe. Right: a child-sized Xianbei-style narrow-sleeved belted tunic. Matching small shoulders, child-sized torso and the same three-quarter pose and neck opening in both cells. Leave room above the clothing for the existing child's face and hair.
NO head, face, skin, hair, neck, hands, headwear, armor, adult anatomy, text, labels, ground, shadows or background. Jade, cream, subdued ochre, delicate ink outlines. True transparent alpha outside the clothes, enough padding to avoid crossing cells.
```

## 成人图集最终编辑指令

```text
Preserve the six existing garment designs and their ink-watercolor style. Correct the layout to a square canvas containing exactly three columns and two rows of equal 2:3 cells, identical centered rig and garment scale. Preserve detached headwear above the clothing, empty neck holes and clear cell padding. Remove every background, haze, gradient and cast shadow so every non-garment pixel has true transparent alpha. Do not add faces, heads, skin, hair, hands, text or labels; do not recolor or redesign the clothes.
```

实现入口：`src/character/culturalCostume.ts`。配方包含 `costume-v1` 与素材路径；替换内容时须新建版本文件并同步版本标识，保证肖像缓存随实际内容失效。
