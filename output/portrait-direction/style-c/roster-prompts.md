# C 风格全人物素材记录

2026-09-23。使用内置 imagegen，共新增 18 张原始 PNG（3 张去五官底稿、15 张双栏图集），配合此前四人样板及元善见组合素材使用。所有原始生成图片均保留，项目复制到 `public/art/portraits/painted-c/roster/`。未通过脚本离线修改图片；运行时 Canvas 裁切、遮罩及有限形变属于人物组合渲染。

双栏图集左栏为五官来源，右栏为去五官底稿，实际尺寸为 1448 × 1086，每栏 724 × 1086；单人图为 1024 × 1536。实际尺寸与源坐标见 `src/data/paintedAssetMetadata.json`、`src/data/paintedRoster.ts`。容貌、视觉年龄与衣冠是游戏美术演绎，不是历史真实性或同时代肖像保证。部分生成结果未完全达到提示词描述（如女性年龄感与衣冠颜色差异），不据此宣称这些细节已考据或通过人工验收。

## 覆盖与边界

- 11 位开局历史人物各有独立底稿（含已验收的元善见）；沈行舟独立底稿。
- 三位历史女性独立底稿；架空女性采用南北两类底稿加各自基因。
- 陈霸先独立底稿；宇文护复用长须成年男性规格，元廓复用青年规格；萧方智、宇文觉复用幼年规格，参数分别取各自 ID。共享规格不是断言真实容貌相同。
- 正式肖像入口全部使用 C 风格分层渲染，继续读取旧 Genome；未实现世界婚育或自动随年月老化。
- 元善见仍保留两组五官、两套袍服；本次新增底稿为一组绘制五官，通过现有遗传参数做有界形变。每个人每个职务的全套换装尚未补齐，多数衣冠仍随专属底稿；不能宣称所有人物均具备任意衣冠互换。
- 原画已目视检查，新增组合及游戏 UI 按项目规则由用户人工验收，不使用浏览器自动化。

## gao-huan

参考：portrait-direction/gao-huan-c.png

原文件：exec-47e85a2a-a46b-4532-8750-5fb74f01e9a9.png

项目文件：`gao-huan-base.png`

Use case: precise-object-edit. Edit target is this approved finished game painting. Produce its modular blank-face base plate. EXACT SAME 1024x1536 framing and pixel positions; preserve all artwork except the internal facial features. Erase both eyebrows, both eyes, nose and mouth, replacing with smoothly continuous skin matching the neighboring cheeks. Erase moustache immediately around lips if any, but KEEP chin beard, sideburns, wrinkles around outer cheeks, the head outline, hair, headwear, neck, entire clothes and hands. Inside the face, no ghost brows, lids, nostrils, lip edges or nose shadows remain. No change to pose, head size, jaw contour, age, colors, background, clothing, art style or canvas. No text. This is an intentionally featureless base that will be covered by independent painted facial parts.

## xiao-yan

参考：style-c/xiao-yan.png

原文件：exec-d2d9c72e-01eb-4274-ac94-8e3daf183b06.png

项目文件：`xiao-yan-base.png`

Use case: precise-object-edit. Edit target is this approved finished game painting. Produce its modular blank-face base plate. EXACT SAME 1024x1536 framing and pixel positions; preserve all artwork except the internal facial features. Erase both eyebrows, both eyes, nose and mouth, replacing with smoothly continuous skin matching the neighboring cheeks. Erase moustache immediately around lips if any, but KEEP chin beard, sideburns, wrinkles around outer cheeks, the head outline, hair, headwear, neck, entire clothes and hands. Inside the face, no ghost brows, lids, nostrils, lip edges or nose shadows remain. No change to pose, head size, jaw contour, age, colors, background, clothing, art style or canvas. No text. This is an intentionally featureless base that will be covered by independent painted facial parts.

## female

参考：style-c/female-study.png

原文件：exec-568f2413-2d8d-4866-83fc-de8e7bfb2289.png

项目文件：`female-base.png`

Use case: precise-object-edit. Edit target is this approved finished game painting. Produce its modular blank-face base plate. EXACT SAME 1024x1536 framing and pixel positions; preserve all artwork except the internal facial features. Erase both eyebrows, both eyes, nose and mouth, replacing with smoothly continuous skin matching the neighboring cheeks. Erase moustache immediately around lips if any, but KEEP chin beard, sideburns, wrinkles around outer cheeks, the head outline, hair, headwear, neck, entire clothes and hands. Inside the face, no ghost brows, lids, nostrils, lip edges or nose shadows remain. No change to pose, head size, jaw contour, age, colors, background, clothing, art style or canvas. No text. This is an intentionally featureless base that will be covered by independent painted facial parts.

## dugu-xin

参考：style-c/yuan-shanjian.png

原文件：exec-43d07db6-df10-4ada-a093-6f5dce0c7680.png

项目文件：`dugu-xin.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Dugu Xin, attractive dignified male commander around43, refined long oval face, strong graceful eyebrows and almond eyes, straight nose, neat short beard, hair in dark cloth headdress. Dark slate lamellar armor with restrained bronze fastenings over muted red underrobe, no modern helmet. Athletic calm posture, hand on belt.

## yuwen-tai

参考：style-c/yuan-shanjian.png

原文件：exec-bc889bde-534b-47fb-8c05-a601d26934da.png

项目文件：`yuwen-tai.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Yuwen Tai, male regent around40, broad squared forehead, strong wide angular face, deep narrow eyes, strong arched brows, broad nose, a distinctly LONG dark beard. Dark olive and warm brown northern aristocratic robe, dark soft military-style cloth cap. Powerful substantial physique, grave thoughtful expression, no imperial crown.

## xiao-gang

参考：style-c/yuan-shanjian.png

原文件：exec-82a21eba-f21c-4943-9865-33e661eb9cac.png

项目文件：`xiao-gang.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Xiao Gang, refined southern male crown prince around43, softly rounded oval face distinctly different from reference, long gentle eyes, fine arched brows, modest nose, neatly trimmed short moustache and beard. Muted warm brown silk robe with ivory crossed collar, understated geometric edging, high dark gauze cap, poised scholarly posture, folded sleeves.

## xiao-yi

参考：style-c/yuan-shanjian.png

原文件：exec-65cee149-25cf-4b5c-8c10-383fb319ac01.png

项目文件：`xiao-yi.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Xiao Yi, middle aged southern scholarly prince around38. Very long lean narrow face and narrow jaw, long dark beard and thin moustache, thin finely arched eyebrows, thoughtful smaller eyes, slim long nose. Muted blue-grey cross-collar silk robe, plain dark soft cap without bronze badge, one hand holding a closed scroll below chest. Do not arbitrarily show an eye disability. Clearly different face shape from reference.

## gao-cheng

参考：style-c/yuan-shanjian.png

原文件：exec-e7757a58-b5d3-4fe6-9944-c92f678afbcd.png

项目文件：`gao-cheng.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Gao Cheng, male northern aristocratic regent age25, very long lean angular face, high cheekbones, large intense narrow eyes, clean shaven, thick dark brows, a confident focused gaze. Dark indigo and wine-red court robe, dark folded cap with modest bronze fixture, hand on belt. Young man with natural adult proportions, not teen.

## gao-yang

参考：style-c/yuan-shanjian.png

原文件：exec-f2842a7f-cab8-43df-9dc5-970c120675a4.png

项目文件：`gao-yang.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Gao Yang, male northern noble in early twenties. DISTINCTLY SHORT WIDE square face, broad jaw and cheekbones, short broad nose, small penetrating slanted eyes, thick low brows, short dark chin beard. Stocky broad shoulders, dark rust-red robe with black edging and dark folded headdress, severe gaze. MUST not be reference narrow handsome oval face.

## yuan-baoju

参考：style-c/yuan-shanjian.png

原文件：exec-aefb3f29-3288-4439-8d7e-02e68682d060.png

项目文件：`yuan-baoju.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Yuan Baoju, male emperor around39. DISTINCTLY BROAD ROUNDED face, full cheeks, broad jaw, wide short nose, straight broad brows, calm small hooded eyes, neat short beard. Substantial middle-aged body, muted dark ochre and brown formal court robes, high black gauze cap. Restrained dignified expression, not reference youth.

## lou-zhaojun

参考：style-c/female-study.png

原文件：exec-246c832a-c336-4cff-a969-fa2a85e9e4a8.png

项目文件：`lou-zhaojun.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Lou Zhaojun, dignified middle-aged northern aristocratic woman, artistic appearance about mid-forties. Broad oval face and full cheek planes, some fine eye wrinkles, straight dark brows, strong thoughtful eyes, substantial straight nose, firm natural mouth. Dark muted burgundy robe with ivory crossed inner collar, dark braided upswept hair with restrained bronze comb, no imperial tiara. Resolute mature presence, not youthful doll.

## wang-lingbin

参考：style-c/female-study.png

原文件：exec-497ea482-168c-4576-84b7-228b82e8ff85.png

项目文件：`wang-lingbin.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Wang Lingbin, mature southern noblewoman, artistic appearance around late forties, graceful slender long face, subtle forehead lines, delicate arched brows, narrow calm eyes, slim long nose, small lips. Slate-violet silk crossed robe with pale grey edging, dark upswept hair, modest jade pin. Clearly mature, refined and serene, not modern beauty photo.

## xu-zhaopei

参考：style-c/female-study.png

原文件：exec-9cc777d2-975c-483b-b538-0098c0c116ca.png

项目文件：`xu-zhaopei.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Xu Zhaopei, adult southern aristocratic woman with DIFFERENT face from reference, long angular oval face, high cheeks, wide-set slim eyes, long tapering brows, pronounced nose bridge, expressive thin lips and thoughtful serious gaze. Muted ochre and sage silk robe, dark gathered hair in restrained asymmetrical bun with a small bronze pin. Artistic adult appearance, do not claim exact age or authentic likeness.

## chen-baxian

参考：style-c/yuan-shanjian.png

原文件：exec-d1977edc-67e2-42a6-867a-486901864e35.png

项目文件：`chen-baxian.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Chen Baxian, southern Chinese military commander, adult aroundforty artistic appearance, broad weathered square face, tanned warm skin, bushy low brows, deep intense smaller eyes, broad nose, short rough black beard. Dark iron lamellar armor and muted olive sleeves, dark simple cloth headwrap rather than court cap, wide shoulders, hand on belt. Different rugged face from reference.

## yuan-qin

参考：style-c/yuan-shanjian.png

原文件：exec-f0f9668e-6d8c-4761-8524-baf2ba76adf4.png

项目文件：`yuan-qin.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Young northern male crown prince, Yuan Qin, early twenties artistic appearance. Gently squared chin, long oval face, wide-set calm almond eyes, slim straight brows, straight slender nose, no beard. Muted pale grey-blue court robe with ivory inner collar, restrained dark high cloth cap. Distinct from the purple-robed reference, natural adult anatomy.

## fictional

参考：style-c/yuan-shanjian.png

原文件：exec-495965bf-2315-430d-97a9-848784a1cd13.png

项目文件：`fictional.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Shen Xingzhou, ORIGINAL FICTIONAL southern Chinese traveling young adult gentleman. Slim triangular face, warm expressive dark eyes, gently curved brows, slightly broader nose, no beard. Simple muted light sage-green linen robe, plain brown sash, modest short cloth headwrap instead of tall official cap, one hand holding a tied document pouch. Modest traveler, no imperial jewelry.

## child

参考：style-c/yuan-shanjian.png

原文件：exec-593a712f-9e83-46d2-b74c-79c65628e4fb.png

项目文件：`child.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Original CHILD boy of a sixth-century northern Chinese aristocratic household, approximately six-year-old artistic appearance, natural child proportions, soft round face, small nose, gentle dark almond eyes, absolutely no facial hair. Modest dark hair gathered into small topknot, simple light blue-grey crossed robe. No adult imperial hat, no adult shoulders, not chibi/anime. Upright calm waist-up portrait. Face should remain at same vertical band y190-470 for the production layout.

## female-north

参考：style-c/female-study.png

原文件：exec-98e467ac-6ed8-4888-a279-22a60b3fad7e.png

项目文件：`female-north.png`

Use case: stylized-concept. Original modular portrait asset for a 546 CE historical Chinese RPG, approved fine ink contours and restrained mineral washes matching the reference. Canvas 2048x1536 landscape, EXACTLY TWO equal 1024x1536 portrait panels side by side with no border, no divider, no text. Each panel contains the SAME person at the SAME pose and pixel-relative location. In the LEFT panel draw the finished portrait with all facial features. In the RIGHT panel duplicate all artwork exactly but erase ONLY eyebrows, eyes, nose and lips/moustache, replacing with smooth featureless facial skin; keep jaw outline, cheek planes, ears, beard on chin, hair, cap, clothes, hands. These two panels are source face and blank base for runtime layering. Both full waist-up, head near horizontal center of each panel, head top at y=50, face between y=190 and y=470, neck to y=550. Adult proportions, three-quarter face turned subtly right. Pale near-white background. Sixth-century inspired clothing, no Qing/Ming hats, no fantasy crowns. Do not use reference person's exact face, only style. Distinguished adult, not doll, not vector, not 3D. Original northern Chinese aristocratic adult woman age roughly thirty-five artistic appearance. Broad gently squared face, strong straight brows, bright slim eyes, straight substantial nose, natural thin lips, composed dignified gaze. Deep muted blue and ivory cross-collar robe with burgundy edging and plain brown sash; dark swept-up hair with a single modest bronze hairpin. No cleavage, no fantasy crown. Distinct face from style reference, no beard.
