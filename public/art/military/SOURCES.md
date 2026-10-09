# 军队地图素材

- `material-atlas.png`：2026-09-30 使用内置 imagegen 生成并保存的原创六格材质图集，1536×1024。用于军队模型的彩色贴图／微小凹凸与兵力牌底材；不是考古复原或历史器物照片。
- 政权军旗来自项目现有 `RealmFlag`，沿用国号、颜色与纹章。SVG 经 React 转义并以独立图像载入；未新增历史国徽声明。
- 兵模网格、甲片、马具、车架与动画由项目代码原创构建。EU4、CK3 仅作为军旗／兵力牌层级与战略地图微缩单位的视觉参考，未使用其商业美术文件。
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
- 导出坐标：米制、Y 向上、+Z 为正面、脚底在原点附近，连盔缨约 1.82 米。行军为原地动画，后续接入时位置由游戏真实军队坐标驱动，按实际移动速度调整播放速度并与待机交叉淡化。
- 可编辑源文件：`art/military/infantry-rigged-v1.blend`，包含打包贴图、命名骨架和独立动画。复现入口：`scripts/map-sample/rig_infantry.py`，以 Blender 后台模式运行，`--` 后传入原始 GLB 路径；脚本会覆盖本项目上述生成资产。
- 验证：`npx vitest run scripts/map-sample/infantry-rig.test.mjs`，在 Three.js 中加载实际导出骨架并采样两段动画，检查权重、循环端点、根骨、形变与落地范围；另以 Blender 重新导入导出 GLB 做离线预览。
- 当前交付为可接入资产，尚未替换正式地图的军队渲染。动画观感与甲裙在近景下的效果待用户人工验收，低面数源模型的脸部与轮廓精度仍受原网格限制。
- 自然度修订：修正关节局部轴导致的手臂扭动，站姿收拢上臂并微屈肘；行军改为反向摆臂、支撑侧重心转移、双脚承重时降低骨盆、单脚支撑时抬高骨盆。脚部采用脚跟接触／全脚掌承重／脚尖离地，摆动轨迹衔接前后速度并降低抬脚高度；待机呼吸、头部和盔缨错开相位。补充实际 GLB 的站姿手臂位置及手脚反向摆动回归检查，预览以 30 fps 输出正面与侧面。此修订仍为人工制作的程序化动作，最终自然度由用户验收。
