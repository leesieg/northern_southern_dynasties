# 游戏字体

2026-10-14 用户选择 B 人物庭院 + F1 思源宋体，题字采用马善政楷书。

- 正文／操作／标题：Adobe Source Han Serif SC 2.003，Regular 与 SemiBold。
  官方原件：`https://raw.githubusercontent.com/adobe-fonts/source-han-serif/release/OTF/SimplifiedChinese/SourceHanSerifSC-Regular.otf` 与同目录 `SourceHanSerifSC-SemiBold.otf`。
- 游戏题字：Ma Shan Zheng 2.003，仅五字“风云南北朝”。官方原件：`https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf`。
- 原始文件 SHA-256 见项目 `docs/art-direction/menu-typography/fonts/manifest.json`；许可完整保留在本目录 `source-serif-OFL.txt`、`mashanzheng-OFL.txt`，均为 SIL OFL 1.1。

网页子集经过格式转换并改名：FYN Song／FYN Ma Title，保留原作者版权，不使用 Adobe 的保留字体名称冒充新发布。正文字体每个字重保留原字体全部44,779个 Unicode 映射，按互不重叠的 unicode-range 加载；常用文字先加载 core，其余按出现的字符加载对应分片。题字有意只包含游戏名称，其他文字使用正文族，不把有限题字字库作为全局字体。

生成脚本：`scripts/build-game-fonts.py`，使用 fontTools 4.60.2 与 Brotli 1.2.0；依赖隔离安装在 `.cache/menu-font-tools`，不加入游戏 npm 依赖。官方原件暂存 `.cache/menu-font-originals`。运行：

```sh
PYTHONPATH=.cache/menu-font-tools /usr/bin/python3 scripts/build-game-fonts.py
```

`game-fonts.css` 与所有 WOFF2 是运行资源，跟随游戏发布；相对路径兼容 `/games/fengyun-nanbeichao/`。`manifest.json` 保存每个分片的字符范围、大小与哈希。使用真实400／600字重，禁用合成字形；样张字库不进入游戏。网络失败时保留明确的宋体备用链，不阻断操作。
