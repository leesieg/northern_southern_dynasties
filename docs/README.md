# 项目文档索引

[项目首页](../README.md) · [项目约定](../AGENTS.md) · [落地方案](../落地方案.md)

## 实施与历史

- [迭代整合进度](迭代整合进度.md)：近期实施、实际验证与待验收项。
- [逐轮更新日志](更新日志/README.md)：已有各轮日志；缺失轮次不补造记录。
- [历史开发记录](历史开发记录.md)：从原 README 完整归档的开发过程。
- [完整游戏迭代方案 v1](../chat/northern_southern_dynasties_iteration_plan_v1.md)：外部设计输入，提案不等于已实现功能。

## 机制与数值

| 主题 | 文档 |
| --- | --- |
| 数值核对 | [资源与机制影响审计](数值资源与机制影响审计.md)、[数值字段清单](数值字段清单.md) |
| 官制与治理 | [治理体系优化方案](治理体系优化方案.md)、[地方官制与县域治理](地方官制与县域治理.md)、[官职差事与评议](官职差事与评议.md) |
| 人物与人生 | [人物家族互动设计](人物家族互动设计.md)、[生活重心系统](生活重心系统.md)、[幕僚与世族](幕僚与世族.md) |
| 家产与军事 | [庄园赋役与兵源](庄园赋役与兵源.md)、[军事系统整合](军事系统整合.md) |
| 政权与内容 | [政体改革与政权更替](政体改革与政权更替.md)、[546 年区划人物与人口扩充](546年区划人物与人口扩充.md) |

## 美术、素材与来源

- [人物形象与遗传设计](人物形象与遗传设计.md)、[人物分层素材提示词](人物分层素材提示词.md)。
- [生活重心插画提示词](art-direction/lifestyle-art-prompts.md)、[地图图集提示词](art-direction/terrain-atlas-prompt.txt)、[山水目标提示词](art-direction/landscape-target-prompt.txt)、[地图书房目标](art-direction/atlas-study-target-v2.md)。
- [战役地图资产说明](../public/art/campaign/README.md)、[朝廷图标说明](../public/art/court/icons-v1/README.md)。
- [人物服饰](../public/art/portraits/painted-c/costumes/README.md)、[朝服](../public/art/portraits/painted-c/court/README.md)、[文化衣装](../public/art/portraits/painted-c/cultures/README.md)。
- [第三方来源与许可](../public/THIRD_PARTY_NOTICES.md)。

`art/` 保存模型源文件，`public/art/` 保存游戏实际使用的素材；`output/` 保存既有样板与评估。临时生成、诊断与实机截图使用 `.cache/` 或 `.tmp/`，不混入设计正文。

## 仓库目录

| 路径 | 用途 |
| --- | --- |
| `src/core/` | 独立于浏览器的世界规则与局部测试 |
| `src/worker/` | 世界状态写入、命令与持久化入口 |
| `src/ui/` | 游戏界面与操作流程 |
| `src/map/` | 正式地图、地图样板、模型与地理投影 |
| `src/data/` | 场景数据、稳定实体 ID 与资料来源 |
| `src/character/`、`src/city/` | 人物外观、城市展示及配套逻辑 |
| `public/art/`、`public/data/` | 运行时美术、模型与地理数据 |
| `art/` | Blender 源文件；与发布模型分别保留 |
| `scripts/`、`tests/` | 数据与美术生成脚本、资产验证；其他测试就近存放 |
| `docs/` | 专题设计、实施记录、数值审计与日志 |
| `docs/images/` | README 精选实机截图；不进入游戏构建 |
| `chat/` | 外部设计输入；本地预览压缩包不提交 |
| `output/` | 已保留的美术方向样板与评估资料 |

`node_modules/`、`dist/`、`.cache/`、`.tmp/` 与 WorkBuddy 工作目录为本地产物，不提交。临时诊断日志、预览与截图放入已忽略目录；README 精选实机截图保存在 `docs/images/`；需要保留的源素材、来源说明和设计文档按对应目录归档。缓存中的实机验收证据不随日常整理自动删除。
