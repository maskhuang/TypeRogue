---
title: "Epic 58: 叙事层落地 · 活字大教堂"
epic_key: "epic-58"
status: "draft"
created: "2026-04-15"
source_documents:
  - docs/narrative-design.md
  - docs/art-style-guide.md
  - docs/project-context.md
stories:
  - "58-1-cursed-tier-residual-anomaly"
  - "58-2-collection-dual-voice-lore-page"
  - "58-3-object-class-rarity-labels"
  - "58-4-relic-flavor-batch-production"
  - "58-5-affix-flavor-batch-production"
  - "58-6-boss-modifier-dual-form-text"
  - "58-7-class-narrative-rebranding"
  - "58-8-ceremonial-shortline-set"
  - "58-9-tutorial-primer-rite-rewrite"
  - "58-10-global-term-rename-pass"
---

# Epic 58: 叙事层落地 · 活字大教堂

## 背景

`docs/narrative-design.md` v1.0（2026-04-15 完成）为打字肉鸽确立了 **《活字大教堂》** 叙事 DNA —— 战锤 40K × SCP Foundation × 活字印刷隐喻的融合，核心创新是 **双声叙事（🔔 《圣键启示录》教会语气 + 📄 《祷文引擎档案》档案语气）**。

叙事文档产出了 **7 套 flavor text 模板 + 9 类意象池 + 六大圣律 + 七圣流 + 三大圣门** 的完整生产工具包，可立即用于批量生产所有游戏内 flavor text。

本 Epic 将这些"待落地"内容拆分为 10 个可实现的 Story，覆盖 **1 个新机制（cursed 级别）+ 2 个 UI 组件 + 7 批内容生产任务**。

## 设计目标

- **叙事可见性**：所有玩家可见的字符串（Relic/Affix/Boss Modifier/Class/Tutorial/Ritual/Unlock）按叙事文档的双声规则重写
- **机制-叙事同构**：cursed 稀有度在机制层真实带负面（Residual Anomaly），不只是 flavor 包装
- **一致性**：7 套模板 + 9 类意象池强制执行，禁止越界写新的基调
- **IP 合规**：严守 GW 40K 专有名词禁用 + SCP CC-BY-SA 致谢要求
- **可追溯性**：所有内容生产必须在 PR 描述中引用使用的模板编号（T1-T7）

## 非目标（Out of Scope）

- **WordPack 独立 flavor 层** —— 用户 2026-04-15 明确要求不做
- **线性剧情 / 过场动画 / 角色对话** —— Quick Narrative 模式定位
- **新增 P1 角色资产** —— 遵循 `art-style-guide.md` v1.2 的 P0 美术预算（只有 1 个训练假人）
- **原有代码 ID 重命名** —— 代码层的 `relic_combo_buffer` / `AffixType.Pulse` 等英文 ID 保持不变，只改用户可见字符串

## 依赖

| 依赖 | 来源 | 说明 |
|---|---|---|
| `narrative-design.md` v1.0 | Epic 58 的圣经 | 所有 flavor 必须参照其模板 |
| `art-style-guide.md` v1.2 | Object Class 标签色彩 | Rarity 7 档映射颜色 |
| Epic 36（Relic System Expansion） | 53 Relic 已全部落地 | 58-4 的生产基数 |
| Epic 34/35（Affix Skill Refactor） | 22 Affix Type 已稳定 | 58-5 的生产基数 |
| Epic 18/42（Boss/Stage Flow） | 15 Boss Modifier 已稳定 | 58-6 的生产基数 |
| Epic 22（Class System） | Wordsmith/Metamorph 已实现 | 58-7 的生产基数 |

## 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| Cursed 机制破坏构筑平衡 | 高 | 58-1 先做 tech-spec 再实现，首版仅 2-3 个 cursed 遗物做最小验证 |
| 双声 Collection 页 UI 工作量大 | 中 | 58-2 复用现有 CollectionScene 架构，只加新容器组件 |
| AI 批量生成 flavor 味道漂移 | 中 | 每 PR 必须抽检 ≥20% 条目，人工二审 |
| GW IP 意外使用（如 "Adeptus"） | 高 | 58-10 加入 CI lint 规则：禁用词列表检测 |
| i18n 键位改动影响 demo 多语言 | 中 | 58-10 先只改 zh-CN，en/pinyin 跟随后续迭代 |

---

## Story 拆分

### Story 58-1: Cursed 级别机制 · Residual Anomaly 系统

**范围：**
- 在 `data/relics.ts` 增加 `rarity: 'cursed'` 稀有度支持（现有为 0-3 数字枚举，需扩展）
- 设计 `CursedEffect` 数据结构：`positive: RelicEffect` + `residual: BossModifierId`
- 复用 `bossModifierEngine.ts` 的 `applyModifier()` / `cleanupModifier()` 流水线，实现"持有 cursed 遗物时自动叠加一个永久 Residual Anomaly"
- 首版：创建 **2 个 cursed 遗物** 做最小验证（例：`cursed_unbroken_litany` 无限连击但词盘震颤，`cursed_taboo_vow` 超高倍率但字母加速乱序）
- Tech-spec 先行：本 Story 先产出 `docs/tech-specs/58-1-cursed-tier-spec.md`，评审通过后再实现

**验收标准：**
- [ ] `RelicRarity` 类型扩展支持 `'cursed'`
- [ ] 购买 cursed 遗物后 `state.activeModifiers` 自动 push 对应 Residual Anomaly
- [ ] 卖出 cursed 遗物后 Residual Anomaly 正确清理
- [ ] 2 个首版 cursed 遗物在战斗中验证效果
- [ ] Tech-spec 覆盖：数据结构、生成规则、商店池配置、存档序列化兼容

**技术说明：**
- 涉及文件：`data/relics.ts`、`systems/bossModifierEngine.ts`、`systems/shop.ts`（池配置）、`core/state/RunState.ts`（序列化）
- **不引入**新的 modifier pipeline —— 直接复用现有 Boss Modifier 系统

---

### Story 58-2: Collection 双声 Lore 详情页 UI

**范围：**
- 在 `scenes/collection/` 下新建 `DualVoiceLoreView.ts` 组件
- 布局：顶部对象名（中英双行）→ 🔔 教会格言区（短 quote）→ 分隔线 → 📄 档案区（多行 clinical text）
- 按 T5 模板规格实现（见 `narrative-design.md` Step 4 · T5）
- 接入 CollectionScene 的 Relic / Skill / Class 三个 tab 的详情 modal
- 占位文案：先用"待补充"字符串，具体内容由 58-4/5/7 填入

**验收标准：**
- [ ] `DualVoiceLoreView` 可接收 `{ nameZh, nameEn, churchQuote, archiveEntry }` 并渲染
- [ ] 三个 Tab（Relic/Skill/Class）的详情 modal 统一使用此组件
- [ ] 字体 / 间距 / 色彩符合 `art-style-guide.md` v1.2（Resurrect-32、Fusion Pixel 12px、1px 黑描边）
- [ ] 打开/关闭动画遵循 12fps steps() 原则
- [ ] 占位文案不阻塞 UI 开发，58-4/5/7 可并行填内容

**技术说明：**
- 涉及文件：`scenes/collection/DualVoiceLoreView.ts`（新建）、`scenes/collection/CollectionScene.ts`（接入）
- **该组件是"唯一的双声配对场所"** —— 其他地方禁止使用双声

---

### Story 58-3: Object Class 稀有度标签系统

**范围：**
- 在 `core/types.ts` 增加 `RARITY_OBJECT_CLASS` 映射表：
  ```
  common → 'Safe'
  uncommon → 'Euclid'
  rare → 'Keter'
  epic → 'Thaumiel'
  legendary → 'Apollyon'
  mythic → 'Archon'
  cursed → 'Breached'
  ```
- 更新 tooltip / Collection 详情页显示 `Object Class: Thaumiel-II`（罗马数字后缀由稀有度次级排序决定）
- `ui/theme.ts` 增加 rarity → 颜色映射对齐 `art-style-guide.md` v1.2 的 Resurrect-32 稀有度配色

**验收标准：**
- [ ] 所有 Relic tooltip 显示 Object Class 标签
- [ ] Collection 列表按 Object Class 分组可视化
- [ ] `cursed` 级别显示为 "Breached" 并带警示色（黑/深紫）
- [ ] 标签字体与 art-style-guide v1.2 一致

**技术说明：**
- 涉及文件：`core/types.ts`、`ui/theme.ts`、`ui/keyboard/KeyTooltip.ts`、`scenes/collection/*`

---

### Story 58-4: Relic Flavor Text 批量生产（53 条）

**范围：**
- 按 T1 模板（🔔 教会 tooltip）为 53 个 Relic 各写 1 条 flavor quote
- 按 T5 模板（双声配对）为 53 个 Relic 各写 1 页 Collection 详情文案
- 每条生产必须：
  1. 从 Block 1 意象池取至少 1 个物质意象
  2. 不写机制数值
  3. 遵循伪拉丁命名规则（3 秒朗读测试）
  4. 中文 ≤60 字 / 英文 ≤25 词（tooltip）
  5. 档案条目 ≤8 行

**产出物：**
- `data-json/relic-flavor.zh-CN.json`（53 条 × 2 版本）
- PR 描述必须列出使用的模板 T1/T5 和每条参考的 Block 1 意象

**验收标准：**
- [ ] 53 个 Relic 全部有 tooltip flavor
- [ ] 53 个 Relic 全部有 Collection 双声 lore 页
- [ ] 随机抽检 12 条（~20%）人工二审无基调偏差
- [ ] 无 GW 40K 专有名词（CI lint 通过）
- [ ] 无 SCP 真实编号（CI lint 通过）
- [ ] `data:extract` 流水线正常产出

**技术说明：**
- 可以用 AI 批量生成，使用 `narrative-design.md` Step 4 结尾的 prompt 骨架
- 每批生成后人工精修

---

### Story 58-5: Affix / Inscription Flavor Text 批量生产（22 条）

**范围：**
- 按 T2 模板为 22 个 AffixType 各写 1 条 sigil 描述
- 每条必须：主语为铅字本身、动词有质感、标注所属圣律（六大圣律之一）
- 六大圣律本身作为分组 header 文案也需写一段（6 条）

**产出物：**
- `data-json/affix-flavor.zh-CN.json`（22 × sigil + 6 × canon header）
- 更新 `KeyTooltip.ts` 渲染时读取此 JSON

**验收标准：**
- [ ] 22 个 AffixType 全部有 sigil flavor
- [ ] 6 个 Canon header 全部有 tagline
- [ ] 键盘 hover 显示正确的 sigil 名 + 格言 + 归属圣律
- [ ] 随机抽检 5 条人工二审无偏差

**技术说明：**
- 涉及文件：`ui/keyboard/KeyTooltip.ts`、新建 `data-json/affix-flavor.zh-CN.json`

---

### Story 58-6: Boss Modifier 双形态文案（15 × 2）

**范围：**
- 按 T3a 模板为 15 个 Boss Modifier 各写 1 条 HUD 角标短格言（≤15 字）
- 按 T3b 模板为 15 个 Boss Modifier 各写 1 条 Codex 详情档案（≤8 行）
- 每个 modifier 需标注"归属 Boss"（第 N 层 + Boss 名），这意味着 58-6 也顺带定义了 **12 层塔楼每一层的 Boss 设定**（至少名字 + 一句描述）

**产出物：**
- `data-json/boss-modifier-flavor.zh-CN.json`（15 × 2 版本）
- `docs/narrative-tower-bosses.md`（副产物：12 层塔楼 Boss 名册 + 简短设定）
- 更新 HUD 角标渲染读取 T3a；更新 Codex 页渲染读取 T3b

**验收标准：**
- [ ] 15 个 modifier 全部有 HUD + Codex 两版文案
- [ ] 12 层塔楼 Boss 名册产出
- [ ] HUD 角标在 1920×1080 分辨率下余光可读
- [ ] Codex 页排版符合 `art-style-guide.md` v1.2

**技术说明：**
- 涉及文件：`data/bossModifiers.ts`、`ui/hud/ModifierBadge.ts`（新建或更新）、`scenes/collection/*`

---

### Story 58-7: Class 叙事化 · 三大圣门重命名 + 双声宣誓词

**范围：**
- 按 T5 模板为 3 个 Class（None/Wordsmith/Metamorph）各写 1 套双声宣誓词 + 档案页
- Wordsmith → 铭刻誓门 / The Order of the Graven Oath
- Metamorph → 熔变誓门 / The Order of the Molten Verse
- None → 初誓键徒 / The Unsworn
- 更新 Class 选择界面（`classes.ts` / Class 选择 UI）显示新名字 + 宣誓词
- **工作站重命名**：Crafting Station → 铸字坊 / The Casting Forge；Mutation Station → 熔变祭坛 / The Mutation Altar
- **资源重命名**（仅 UI 可见字符串）：fragment → 铅屑 / Lead Shavings；mutagen → 熔蜡 / Molten Unguent

**产出物：**
- `data-json/class-flavor.zh-CN.json`
- 更新 Class 选择界面 UI
- 工作站 UI header 文案更新

**验收标准：**
- [ ] 3 个 Class 全部有双声宣誓词 + 档案页
- [ ] Class 选择界面显示新名字
- [ ] 工作站 UI 显示新名字
- [ ] 资源显示名称已替换（代码层 `resource: 'fragment'` 保持不变）
- [ ] Collection · Class Tab 使用 DualVoiceLoreView 组件

**技术说明：**
- 涉及文件：`data/classes.ts`、`systems/classes/CraftingStation.ts`、`systems/classes/MetamorphStation.ts`、相关 UI 文件

---

### Story 58-8: 仪式短句集 · Run 开场 / 结算 / Boss / Ritual / Unlock

**范围：**
- 按 T4 模板为 5 种仪式场合各写 ≥3 条短句（可随机抽选一条显示）
  - T4.1 Run 开场（踏上第 I 层）：3-5 条
  - T4.2 Ritual Stage 6（铭封祈礼）：3-5 条
  - T4.3 Boss 登场（Stage 12）：3-5 条（可按 Boss 差异化）
  - T4.4 Run 失败 · 站点污染：3-5 条
  - T4.5 Run 胜利 · 登顶启示：3-5 条
  - T4.6 Unlock 通知：5-8 条（按 Unlock 类型差异化）
- 接入各个 Scene 的触发点：BattleScene.onRunStart、ritualEnchantment.openRitual、bossEncounter、GameOverScene、VictoryScene、UnlockNotification

**产出物：**
- `data-json/ceremonial-lines.zh-CN.json`
- 各 Scene 的文案接入

**验收标准：**
- [ ] 6 种场合全部有 ≥3 条短句
- [ ] 每次触发随机选一条显示
- [ ] 文案出现在正确场景的正确时机
- [ ] 所有短句 ≤30 字（符合 T4 规范）

---

### Story 58-9: Tutorial 改写 · 入门圣礼

**范围：**
- 按 T6 模板重写现有 `systems/tutorial/` 的所有 tutorial 步骤文案
- 分节编号："入门圣礼 · 第 I 节"、"第 II 节"……
- 每节末尾加 "—— 《入门圣礼 · 第 VII 代抄本》" 落款
- 保留现有 tutorial 触发逻辑，只替换文案字符串

**产出物：**
- `data-json/tutorial-flavor.zh-CN.json`
- 更新 `TutorialManager.ts` / `TutorialOverlay.ts` 读取新文案

**验收标准：**
- [ ] 所有 tutorial 步骤按 T6 模板重写
- [ ] 游戏内新建 Run 全流程走一遍 tutorial 无内容丢失
- [ ] 文案风格与 narrative-design.md 一致（随机抽检 3 节人工二审）

---

### Story 58-10: 全局术语命名 Pass + IP Lint

**范围：**
- 产出 **术语映射表** `docs/narrative-term-map.md`（代码 ID → 设定层中文名 → 设定层英文名）
- 全项目 grep 所有硬编码中文字符串，按映射表替换为新命名（仅 UI 可见层）
- CI 新增 lint 规则（`scripts/lint-narrative-ip.ts`）：
  - 禁用词列表：Adeptus, Mechanicus, Omnissiah, Imperium, Emperor, Astartes, Space Marine, Primarch, Tech-Priest, Ecclesiarchy, Aquila 等 GW 40K 专有名词
  - 禁用词列表：SCP-173, SCP-096, SCP-682 等真实 SCP 编号
  - 扫描 `data-json/*.json` 和 `src/src/**/*.ts` 的字符串字面量
- 更新 credits 文件加入 SCP Foundation CC-BY-SA 致谢

**产出物：**
- `docs/narrative-term-map.md`
- `scripts/lint-narrative-ip.ts`（CI 集成）
- `docs/credits.md`（新建或更新）
- 全局术语替换 PR

**验收标准：**
- [ ] 术语映射表覆盖所有叙事化对象
- [ ] CI lint 规则生效，触发示例测试用例通过
- [ ] Credits 包含 SCP Foundation 致谢
- [ ] 全项目字符串 grep 无遗漏的旧命名

**技术说明：**
- 这是 Epic 58 的最后一个 Story，依赖 58-4/5/6/7/8/9 全部完成
- 代码层 ID（`AffixType.Pulse` 等英文枚举）**保持不变**，只替换用户可见字符串

---

## Story 依赖图

```
58-1 (Cursed Tech)    ──┐
58-2 (Lore UI)        ──┼──→ 58-4, 58-5, 58-6, 58-7 (批量内容，可并行)
58-3 (Object Class)   ──┘
                                 │
                                 ▼
                          58-8, 58-9 (仪式 + Tutorial，可并行)
                                 │
                                 ▼
                          58-10 (全局替换 + IP Lint 收尾)
```

**关键路径**：58-1/2/3 (基础设施) → 58-4/5/6/7 (内容批量) → 58-10 (收尾)
**并行机会**：58-8/9 可以在基础设施完成后立即启动，不依赖内容批量

## 验收总标准（Epic 级别）

- [ ] 所有 10 个 Story 状态 = `done`
- [ ] `narrative-design.md` 中 7 套模板的使用场景全部被覆盖
- [ ] 游戏内从 Tutorial → 战斗 → Shop → Ritual → Boss → 结算 → Unlock 全流程玩家可见文案 100% 替换为活字大教堂叙事
- [ ] CI IP Lint 无违规
- [ ] Credits 包含 SCP Foundation 致谢
- [ ] Cursed 级别至少 2 个首版遗物在商店池中正常出现
- [ ] Collection 三个 Tab（Relic/Skill/Class）全部使用 DualVoiceLoreView 组件
- [ ] 从 `narrative-design.md` 更新 stepsCompleted 到 stable 状态（追加 `implementation: "epic-58"` 字段）

## 备注

- 本 Epic 属于**内容驱动**类型，工程量集中在 58-1（机制）+ 58-2（UI），其余 8 个 Story 主要是 flavor text 批量生产
- 建议在 58-1/2/3 完成后启动 **AI 批量生成辅助** —— 严格遵守 `narrative-design.md` Step 4 结尾的 prompt 骨架
- Epic 58 完成后，打字肉鸽的**叙事层将从"隐藏"升级到"显性卖点"**，可作为 Steam 页面的差异化 USP 之一
- **后续可能的 Epic 58.5**：如果玩家反响好，可追加"失踪守卷人隐藏 lore 线"（通过成就触发的 T7 单声档案条目，构成一条可拼凑的隐藏叙事）

---

_Epic 58 created: 2026-04-15 by Samus Shepard (game-designer agent)_
_Source: docs/narrative-design.md v1.0_
