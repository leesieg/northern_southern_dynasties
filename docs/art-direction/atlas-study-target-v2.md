# 舆图室视觉目标 · 2026-10-09

参考图：`atlas-study-target-v2.png`。内置 image_gen 原创生成，用于房间构图、材质和道具制作，不作为史实复原。实时地图继续使用项目真实地理数据，不使用效果图中的示意地图替换可操作地图。

对应制作脚本：`scripts/map-sample/build_study_v2.py`；新模型：`public/art/campaign/atlas-study-v2.glb`。主要对应项为低木案与铜角、榫接腿撑、木地板、双侧格窗和竹帘、后方卷轴架、织物屏风、油灯、席垫与案边笔砚。旧资产保留。

## 完整生成提示词

Use case: historical-scene. Asset: visual development target for a realtime 3D strategy-game atlas room, 1536x1024 landscape composition. An original Northern and Southern Dynasties Chinese commander's study, circa sixth century, historically inspired rather than a reconstruction. Camera looking steeply down from an open front wall at a centered broad low rectangular dark reddish timber map table. The table fills 65 percent of the frame and has a completely FLAT rectangular pale warm parchment map of China covering most of its top; no raised terrain, no mountains protruding, no modern labels. Map must remain clearly legible and brightly lit. Four substantial square legs and cross-braces, subtly worn bevels, fine dark wood grain, bronze corner fittings. Spacious timber post-and-beam room surrounds the table: dark wood plank floor, pale earthen plaster walls on three sides, restrained straight geometric timber lattice windows on left and right admitting cool soft daylight, exposed stout beams and simple bracket joinery, low rolled bamboo blinds, woven floor mats and one kneeling cushion, low shelf with tightly rolled scrolls and tied bamboo documents at back, two restrained bronze oil lamps on short stands with tiny warm flames, a dark green fabric screen near back corner. Two rolled scrolls, inkstone, brush rest and small bronze weights on table edges OUTSIDE the flat map. Refined tactile materials and physically plausible contact shadows. Warm side lighting against muted cool ambient light, quiet ink-green, aged gold, walnut, vermilion accents, parchment palette. Grounded and realistic fine game environment art, no fantasy, no ornate Qing palace decorations, no pagodas, no porcelain vase centerpiece, no chairs, no people, no modern furniture, no electric lights, no UI, no text, no watermark. The full table and three sides of the room visible with clean balanced composition and room details kept subordinate to map.

## 木材贴图与完整提示词

`public/art/campaign/study-walnut-v2.jpg`：内置 image_gen 原创生成，转换为 1024×1024 JPEG，用于案面、梁柱及木地板的木纹明暗；运行时保留模型已有底色和接触遮蔽。原生成图与转换产物未作为真实历史材质考据。

Use case: stylized-concept. Asset type: production seamless tileable PBR base-color texture for a realistic ancient Chinese walnut map table, viewed perfectly straight down, square image. One continuous flat sheet of dark aged reddish walnut timber with fine longitudinal grain, subtle long pores, a few restrained dark knots, rubbed desaturated honey-brown wear. Real wood photographic detail at macro scale, even diffuse neutral lighting, no directional shadow, no reflection, no vignette, no plank seams, no edges, no objects, no text. Grain runs vertically. Muted medium-dark brown not orange, quiet variation, horizontally and vertically seamless edges. This is an albedo material texture, not a room illustration.

## 实现与验收边界

Blender MCP 当前连接不可用、CLI 工具未配置 Blender 路径，本轮改用已安装的 Blender 5.2.1 原生后台执行同目录制作脚本；未替换 MCP 配置。模型为 14 个材质批次、67,622 个三角面，保留独立可编辑场景于忽略目录 `.cache/map-room-refinement/atlas-study-v2.blend`。

已按效果图落实低木案、腿撑、铜角、双侧格窗、卷轴、屏风、笔砚与席垫的结构及位置关系；为了保留实时地图可读性，使用较高视角并去掉会遮住地图的前方横梁。当前光照、软阴影、织物形变和细小器物轮廓仍有差距，不能将实时截图标为效果图完全复现，最终美术效果待用户验收。
