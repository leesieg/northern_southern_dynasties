# 侯景之乱高保真界面效果图

性质：美术目标／设计预览，非实机截图；人物身份、数据和地图边界用于示意，不作为历史资料或存档事实。

生成方式：内置 image_gen；用户原图作为美术与构图参考。第二轮仅修正地图政权边界与配色。

## 首轮提示词

Use case: ui-mockup
Asset type: high-fidelity desktop strategy-game interface design preview, a single polished full-screen landscape image.
Primary request: Design the Hou Jing Rebellion event workspace for the Chinese historical character-centered strategy game《风云南北朝》, based on the attached reference's antique Chinese aesthetic, but execute the mechanism-grounded redesign specified below. Produce a beautiful, production-quality legible Chinese interface screenshot mockup, 16:9, preferably 3840×2160, viewed straight-on. This is one coherent game screen, no device frame, no external presentation boards or annotations.

Input image: visual style and map composition reference only. Rebuild the interface; do not preserve its inaccurate mechanics, faction labels, text, portraits, dates, statistics or overcrowding.

Scene and art direction: Southern and Northern Dynasties China. A sophisticated painted-relief campaign map, subtle three-dimensional mountains and little walled towns, jade rivers, parchment land, tactile hand-painted terrain, sparse banners. Warm parchment, deep ink-green panels (#172d27 / #20382f), restrained aged-gold hairline frames, warm ivory readable Chinese text. Flat line-and-wash Chinese portraits, convincing human faces, officers and generals in period robes and armor. Do not put imperial bead crowns on officers. Ornamental corners only, quieter than the reference, luxurious and compact, excellent hierarchy. Chinese Songti headings and crisp legible Chinese body type. No modern dashboard look.

Composition: 1920×1080 logical desktop layout rendered at high resolution. Maintain compact existing HUD: top-left player panel about 420×84 logical px, top-right time panel about 380×84, narrow 68px left icon rail; do not use the oversized top navigation banners from the reference. The map is the center and remains usable. Under the HUD, left event panel about 330px wide, middle map about 1000px wide, right workspace about 440px wide. Panels must be crisp, aligned, high contrast, no overlapping buttons, no cropped text. Lower right small antique circular minimap, below the right work panel. Plenty of readable map between panels.

Top-left HUD: modest square portrait of male Liang statesman 萧绎, text “萧绎”, “梁 · 执政”, small icon values “影响力 86”, “私财 237”, understated gold divider. Top-right parchment date “550年10月12日”, pause/play and compact speed choices “1× 3× 5×”. In the gap a single small cloth war flag “侯景之乱” and signed score “+18”. No notification overflow. Left rail uses consistent etched gold icons, a few short labels “人物 / 朝廷 / 军事 / 外交 / 事件”, selected event state.

Left event panel:
- Short atmospheric horizontal illustration of a military camp and arriving dispatches at dusk, subtle smoke from a distant battlefield, not a captured burning capital.
- Large beautiful title “侯景之乱”, a small seal “内战”.
- Compact state line “举兵争权 · 首都未陷”.
- Narrative exact: “侯景另立军府，举兵要求更换执政者。各地官将正在表态，建康仍由梁廷控制。”
- Three small completed/current stage nodes “归附交涉 — 安置争议 — 举兵争权”; show current third node filled gold, previous nodes subdued; no promised future stage.
- Small line “内战已持续 164 日”.
- Section “当前战局”. Two restrained flag/portrait summaries:
  “梁廷” “24,600 人” “实控 12 城”
  “侯景” “8,200 人” “实控 3 城”
  Real war-score diverging scale centered at zero with a marker slightly on rebel side, label “起兵方战分 +18”. A small readable explanatory line “战分表示优势，非战争完成度”. Do NOT use percentage progress.
- Section “当前等待”. Three clearly separated factual rows: “建康尚未形成围城”, “地方官将自主决定响应”, “当前无待本人裁决事项”. Tiny calm “局势变化后继续评估”, no artificial countdown and no claim of scripted guaranteed rebellion.
- Bottom section “可办事项”, 2×2 compact illustrated action tiles “争取响应”, “调军粮运”, “朝廷任命”, “查看议和”. Only navigation actions, not execute buttons; restrained outlines, no bright gold filled launch buttons.

Central campaign map:
- Northern background labels “西魏” muted yellow west and “东魏” dusty rose northeast, Liang muted jade green south.
- Hou Jing's actual-controlled area is a SMALL contrasting terracotta / reddish-brown enclave around “寿春” north of the Yangtze inside the broader Liang region, label ONLY “侯景”, never “侯景军府” on map. Do not color all Eastern Wei as Hou Jing.
- Show plausible geographic placement: 洛阳 far northwest of 寿春, 襄阳 west, 寿春 north of 建康, 建康 lower east along the great river, 江陵 west along the Yangtze, 广州 farther south. Sparse useful place labels, no duplicated city names or nonsense province geometry.
- A modest armored Hou Jing portrait/banner near 寿春; a dashed military route southward ends short of 建康. 建康 remains green, intact, with shield flag; no flames and no captured-city art.
- Small understated locator “战争目标 · 建康” near capital, “根据地 · 寿春” near base. Use muted gold selected borders and thin dashed links, no giant glowing circles.
- One selected character location marker “陈霸先” in southern area, linked to selection in the right panel; no rows of unconnected portraits.

Right workspace:
- A single shared top tab row “局势 / 响应 / 战报 / 议和 / 经过”, 响应 selected with restrained gold underline.
- Header “地方响应”.
- Single compact filter row “全部 20 / 勤王 8 / 响应 5 / 观望 6 / 待表态 1”, 全部 selected. These are filters not additional hierarchical navigation.
- Four clearly separated rows, small square portraits, meaningful stance pills, name and known troop strength:
  “侯景” “响应” “8,200 人” second line “起兵领袖 · 寿春”
  “王僧辩” “勤王” “8,400 人” second line “梁臣 · 郢州”
  “陈霸先” “观望守土” “2,600 人” second line “梁臣 · 广州” SELECTED muted gold stroke and dark jade highlight.
  “柳仲礼” “待表态” “4,200 人” second line “梁臣 · 竟陵”
  Tiny pagination/scroll cue “显示 4 / 20 人”. Do not show a sovereignty category called 独立 or 中立. Do not fabricate separate family faction power values.
- Lower attached selected-person section within same right workspace, thin divider and header “选中人物”.
- Slightly larger square line-and-wash portrait, name “陈霸先”, tag “观望守土”, subtitle “当前效忠 梁 · 驻地 广州”.
- Compact stats “当前统兵 2,600 人” and smaller note “立场变化不保证全部兵员跟随”.
- Two legible fact lines “保持现有治理、输税与防卫”, “暂不参加本场远征”.
- Obligation row “与我方约定：暂无”.
- Two side-by-side compact action cards, consistent painted gold icons: “劝其勤王” subline “本人影响力 10”; “承诺待遇” subline “本人影响力 10”. These lead to preview dialogs, not immediate forced success. A restrained final line “对方仍将自行决定”.
- NO “劝其保持中立”, NO “暗中策动”, NO “施加压力”, NO “独立派”, no unimplemented loyalty/threat composite bars or invented success percentages.
- Keep lower-right minimap clear below this workspace.

At the very bottom, outside dense content, a quiet unobtrusive label “设计预览 · 示例局势，非存档实况”. All numbers and offices in this mockup are explicitly illustrative alternate-gameplay data, not a claim of actual save or historical chronology.

Constraints: Render correct Chinese characters sharply, use quoted strings verbatim. Preserve all key actions and their cost labels. Avoid too much copy and tiny illegible dense grids. No repeated titles, no nested modal on this overview screen, no artificial gold glow, no copied incorrect reference text, no futuristic UI, no modern sans-only dashboard, no percentage war completion, no watermark. Prioritize a convincing finished historical game interface and precise operational clarity.

## 定向修正提示词

Use case: precise-object-edit / ui-mockup.
Edit the attached generated high-fidelity interface mockup. Keep the entire excellent UI unchanged: all panels, layouts, portraits, typography, Chinese text, troop values, score, buttons, HUD, route, minimap, city positions and decorative details must remain exactly as in the input. Make ONLY one targeted cartographic correction in the CENTRAL map around 寿春/侯景:
1. The Hou Jing military government must be an unmistakable independent terracotta / reddish-BROWN enclave (#995944 with lighter #bd7b5f washes), with a fine aged-gold boundary, distinct from the dusty rose Eastern Wei territory to its north.
2. Move ONLY Eastern Wei's southern territory-color boundary northward so there is a visible jade-green Liang territory band separating the main Eastern Wei pink territory from the small brown Hou Jing enclave around 寿春. East Wei remains the northeast background, not the realm containing 寿春.
3. The Hou Jing enclave should contain 寿春 and two small nearby existing town symbols, bounded south by Liang territory before 建康. Keep the map label ONLY “侯景”; preserve “根据地 · 寿春”. Do not change city location, route or map terrain. Preserve intact green 建康 and all other political colors.
4. Also repair the small footer text so it reads exactly “设计预览 · 示例局势，非存档实况”.
Do not redraw or rearrange the UI. Retain the same aspect ratio, sharp high-fidelity 16:9 historical game screenshot appearance and the highest possible resolution. No new mechanics, labels or extra controls.
