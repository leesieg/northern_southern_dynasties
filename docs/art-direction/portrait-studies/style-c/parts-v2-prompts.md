# C 风格组合样板 · 第二轮

2026-09-23，内置 imagegen 生成。参考图为本项目原创 `yuan-shanjian.png`。保留原文件，复制到 `public/art/portraits/painted-c/`，未离线重绘或修改生成结果。运行时通过 Canvas 按部件配置裁切和遮罩混合。

## 资产对应

- `features-a.png`：上一轮元善见样板。
- `base.png`：`exec-0acd6e5e-61fb-4b62-9f76-632542992e38.png`，去除五官底稿。
- `features-b.png`：`exec-cfe00f45-1666-4f1c-8a9c-e0ad49fdd26c.png`，第二组绘制五官。
- `robe-b.png`：`exec-7fb32b7e-ae69-40fe-8d21-0081bc58fd4c.png`，青色袍服。

每张 1024 × 1536。原始生成文件位于本任务 generated_images 目录。成品仍是完整图像，独立部件由裁切、定位和遮罩定义，并非已交付透明独立分层源文件。只提供一种青年男性规格；不得宣称已覆盖女性、年龄、脸型、文化和特质，亦不是真实历史容貌复原。

## base

Use case: precise-object-edit. Edit target is the provided portrait. Make a modular game portrait BASE PLATE. Keep EXACT 1024x1536 composition, hat, hair, ears, jaw outline, chin, neck, clothing, hands, background, lighting and ink-wash art treatment unchanged. ONLY erase both eyebrows, both eyes, the nose and the mouth, replacing these features with smoothly continuous blank warm facial skin, matching the adjacent cheek tones and paint texture. The area between hairline, ear, chin and right face outline must be a completely featureless face blank, with no residual eyelids, brows, lips, nostrils, nose ridge, nose shadow or ghost features. Keep the face silhouette in the same place, even though the features inside are erased. Do NOT move, zoom, restyle or change any other pixels unnecessarily. No text, no new parts, no sprite sheet. This blank face will be filled in with independent painted features at runtime.

## features-b

Use case: identity-preserve. Edit target is provided portrait, used as a fixed registration template for modular facial features. Keep EXACT 1024x1536 composition, hair, hat, ears, jaw silhouette, head angle, neck, robe, hands, background, facial skin palette and ink-wash style unchanged. Change ONLY eyebrows, eyes, nose and lips INSIDE the same face, keeping each feature's center position identical. New features: noticeably slender flatter eyebrows instead of thick angled brows; narrower calm slightly hooded eyes instead of wide almond eyes; a wider straight prominent nose instead of narrow pointed nose; firmer thinner closed lips instead of soft full lips. Still a handsome believable East Asian young adult, no beard. Preserve precise head position, face silhouette and cheek planes so features can be interchanged. Do not turn or enlarge the head. Do not age face or change skin tone. No labels, no borders, no layout change.

## robe-b

Use case: identity-preserve. Edit target is provided portrait. Create an interchangeable clothing alternative for a fixed registration historical game portrait. Keep EXACT 1024x1536 framing, the whole head including face/eyes/nose/mouth/hat/hair, neck, shoulder geometry, hands and background IDENTICAL. Change ONLY robe fabric and its ornament: replace the ash-purple brocade OUTER robe with subdued jade-teal plain silk with very restrained dark embroidered edging. Keep the light silver-grey inner crossed collar, all seam and collar positions, sleeve silhouette, folds, belt and hand locations precisely the same. Original sophisticated ink-line mineral-wash style; no new shadows across face, no zoom, no labels, no border, no new pose. Sixth-century-inspired aristocratic robe artistic variant, no modern clothes.
