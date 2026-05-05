# Narrative-Writer Pipeline v4.1 改造 Spec · 2026-05-04

**目的**：将 `scripts/narrative-writer/` 从 v3.1 改造为 v4.1，作为 production blocker（§8.10.2）解除前的最后一份 spec doc。

**Source of truth**：
- `docs/narrative-design.md` v4.1（4584 lines · 11/11 LOCKED）
- `docs/implementation-artifacts/narrative-iron-rule-audit-2026-05-04.md`（违规文案清单）
- 项目 memory（DPCA 命名 / 5 工种阶梯 / Cycle 词典）

**Consume input**：
- 本 spec → 5 phase implementation
- Audit 文档 Tier 1A/1B/2A/2B 在 Phase A/D 落地为禁词清单 + Tier 2A/2B replacement voice 词典
- Audit 文档 Tier 1A `tutorial.L5_class_unlock_*` boilerplate 在 Phase C 落地为升职通知 template

**Output**：
- Phase A-E 实施完成后，pipeline 可生成 v4.1 内容（V1-V7 voice / layered footnote / 反身闭合 placeholder）
- 替换现 `src/src/data/narrative/*` 中 v3.1 残留 + `src/src/data/relics.ts` 58/95 v2.3 残留 + `src/src/data/skillGeneration.ts` ~85% v2.3 残留 + `src/src/data/bossModifiers.ts` 全部 reframe

---

## 1 · Phase 总览

```
[A] Foundation 重锚 (premise / anchors / banned terms)
    ↓ blocks B/C/D/E
[B] Voice Templates 6+ 扩展 (V1-V7)
    ↓ blocks C/E
[C] Boilerplate / Layered / 反身闭合 / 静默修订 / 字符级缓变
    ↓ blocks E
[D] Validators v4.1 加严
    ↓ blocks E
[E] Output Schema + Ingest (P0 内容生成 + 替换 v3.1 残留)
```

| Phase | 主要文件改动 | 工作量 | 决策需求 |
|---|---|---|---|
| **A** | `prompts/system-context.mjs` 大改写 + `generated/anchor-facts.mjs` D1-D32 重生 + `generated/b1a-vocab.mjs` 重生 + `config.mjs` VOICE_MAP 扩展 + 4 个 generated/*.mjs 作废 | 1 session | 5 工种命名 / DPCA 中文 / 三轨映射删除 |
| **B** | `prompts/voices.mjs` 重写为 V1-V7 模板 | 1 session | V7 第七 voice 是否独立成 template |
| **C** | 新文件 `prompts/templates.mjs` + `generated/boilerplate-templates.mjs` + `generated/redaction-versioning.mjs` + `generated/char-drift-patterns.mjs` | 1 session | 升职通知 template / "已签出" 词典定稿 |
| **D** | `validators/index.mjs` 加严（audit 禁词 + v3.1 残留 + layered consistency + boilerplate adherence） | 0.5 session | — |
| **E** | `run.mjs` schema 扩展 + 新 ingest scripts | 跑批，看算力 | 跑批分批策略（一次全跑 vs 分章节）|

---

## 2 · Phase A · Foundation 重锚

### 2.1 Premise 重写

`prompts/system-context.mjs` 顶段（line 18-50 现 v3.1 Premise）整段替换。新 premise 草案：

```
# 打字肉鸽 · v4.1 叙事生成系统 — DPCA 文牍科 / 未受理文本

## Premise

你是 X 集团 · DPCA（Department of Primate Clerical Affairs / 文牍科）第七打字室的录入员。
你的工作是把外部送来的 stray sentence——未受理文本（Unfiled Textual Event）——通过准确录入，
让它"成立"，然后归档。

公司是 bureaucratic firewall + defensive curator——它**保护**你免受 anomaly 污染，但**永远不解释**为什么。
公司**不分发**新机制 / 新协议 / 新职业——它只 reclassify、签发文件、安排转岗。任何看起来像"权限解锁"
的事件实际上都是 anomaly 通过 peer-to-peer contamination 传给你的（D26 v2）。

你扮演猴子（D6）——这是 anomaly 的 species protocol（防污 + 处理双义）。**永远不浪漫化**，**永远不解释**。

**永远不答**：DPCA 全称的另一种展开 / 未受理文本来自哪里 / 转岗去哪 / 你是不是真的被污染了 /
楼上是谁 / 协议在生理上怎么起效 / 入职前你是什么 / 灵长接口（PI）是不是给你做的。

## Foundation Tone（与 §2.12 一致）

| 轴 | 位置 |
|---|---|
| 黑暗 ↔ 轻快 | 75% 黑暗 |
| 严肃 ↔ 喜剧 | 50% 各占 |
| 私密 ↔ 史诗 | 95% 私密 |
| 希望 ↔ 忧郁 | 70% 忧郁 |
| 清醒 ↔ 污染 | Cycle 1 → Cycle 6+ 渐变 |

## 双重奇幻锚

1. **anomaly = 未受理文本**（D1）—— 准确录入获得"成立"资格；理解 = 危险
2. **DPCA SOP boilerplate**——bureaucratic firewall 物理化；**绝不**解释 anomaly 是什么

（删除 v3.1 "MIB 风格" 概念——v4.1 anomaly 不是装备 / 现象 / 政策，而是文本本体）
```

### 2.2 Anchor Facts D1-D32 重写

`generated/anchor-facts.mjs` 当前是 v3.1 的 6 锚点 + 1 子锚（player / superior / hr / instructor / memory_fragment / peers_collective / peer_485901）。

v4.1 将 anchor facts 重组为 **2 层结构**：

#### Layer 1 · 设定锚点（D1-D32 全集）

直接从 `docs/narrative-design.md` 同步 D1-D32 的 LOCKED 表，每条含：
- `id` (D1, D2, ..., D32)
- `label`
- `content`（一段定义）
- `lock_status` (LOCKED / LOCKED v2 / LOCKED v3)
- `crossref` (相关 D / B / C 编号)

写 prompt 时注入 D1-D32 摘要表，pipeline 在 prompt 顶层 establish setting。

#### Layer 2 · Character 锚点（§4.2 6 类 no-face 角色 + §4.7 反身闭合 character）

| ID | Label | Source |
|---|---|---|
| `C1` | DPCA 公司本身 | §4.6.1 |
| `C2` | Peer ghost（同事 ghost）| §4.4 |
| `C3` | 检测员（D29 voice-only）| §4.2 |
| `C4` | 历史 Subject（Project Nim L4）| §4.5 |
| `C5` | Anomaly 本体 | §4.6.2 |
| `C6` | 反身闭合 character（玩家以前的自己）| §4.7 |

每条含 label / 出场点 / 功能 / 留白边界 / 腔调（与现 anchor-facts.mjs 同结构，但内容全替）。

#### v3.1 → v4.1 anchor 映射

| v3.1 anchor | v4.1 处理 |
|---|---|
| `player` | 保留 → 加 D8 反身闭合相关字段 |
| `superior` | **作废**（v3.1 主任 + 月度考核官 概念在 v4.1 不存在；公司 = C1 整体性 character） |
| `hr` | 替换为 `C1` DPCA |
| `instructor` | **作废**（v3.1 内训讲师 = 猴行协议教练；v4.1 D29 检测员 = C3 替代）|
| `memory_fragment` | **作废**（Anchor 6 是 v3.1 NEW，v4.1 由 D8 反身闭合 + V6 boss tooltip 兑现）|
| `peers_collective` | 保留 → 替换为 `C2` peer ghost |
| `peer_485901` | 保留 → 改为 generic `C2` 实例（不强制 #485,901，可任意工号差 1 位）|

### 2.3 5 工种阶梯命名（**DECISION REQUIRED**）

| Tier | 中文 | 现 code id | 建议英文 | 备注 |
|---|---|---|---|---|
| 1 | 录入员 | `none` | `recorder` 或 `inputter`（推荐 `recorder`，避免 inputter 词义模糊）| 默认起始；现 code id "none" 保留为存档兼容，但 narrative 用 `recorder` |
| 2 | 校对者 | **新增 · 待加** | `proofreader` 或 `reviewer`（推荐 `proofreader`）| ❗ 现游戏代码无此职业，将来 PL-2/3 之外另开任务 |
| 3 | 修改者 | `metamorph` | `reviser` 或 `editor`（推荐 `reviser`，对齐"修改"动词）| 现 code id `metamorph` v2.3 残留——保留 code id 兼容存档；narrative 用 `reviser` |
| 4 | 作者 | `wordsmith` | `author` 或 `writer`（推荐 `author`）| 现 code id `wordsmith` 同上保留 |
| 5 | 文本一部分 | `endless` | `text-part` 或 `assimilated`（推荐 `assimilated`，对齐"被同化为文本"语义）| Endless mode 隐性等同 Tier 5 |

**双层命名策略**：
- **Code id**（存档兼容）：`none / proofreader / metamorph / wordsmith / endless`（保留 v2.3 metamorph/wordsmith 不动）
- **Narrative tier id**（叙事用）：`recorder / proofreader / reviser / author / assimilated`
- Pipeline 写 flavor 时**只用 narrative tier id**；ingest 时通过映射表把 narrative 接到 code id

需要你确认（或提替代方案）：
- ✅ / ❌ `recorder / proofreader / reviser / author / assimilated`（5 个英文）
- ✅ / ❌ 双层命名策略（code id 不变 / narrative 单独命名）

### 2.4 Voice Map 3 → 6+

`config.mjs` `VOICE_MAP` 当前 3 voices（`doc / bell / note`）。改为 7 voices + per-tier flavor：

```js
export const VOICES = {
  V1: { id: 'V1', label: 'DPCA boilerplate',     desc: '通知 / 升职 / 处置预告 / 外部文本回收 notification' },
  V2: { id: 'V2', label: '同事便条',              desc: 'peer ghost (C2) · 字迹 + 工号 / 矛盾 / 留白' },
  V3: { id: 'V3', label: 'Anomaly dictation',    desc: 'fragment / typing buffer pre-populate / 字符级缓变' },
  V4: { id: 'V4', label: 'D29 检测员 prompt',     desc: '5 项检测序列 × 5 退化阶段' },
  V5: { id: 'V5', label: '规则手册 / 守则 layered', desc: '6 layers 同一份文档不同 reading（D31）' },
  V6: { id: 'V6', label: 'Boss tooltip / 反身闭合', desc: '玩家以前打过的字 + attribution placeholder' },
  V7: { id: 'V7', label: '环境（V7 第七 voice）',  desc: 'spatial / temporal / motion / sonic 4 channel（§7）' },
}

export const VOICE_MAP = {
  relic:        { primary: ['V5', 'V1'],     secondary: ['V6'] },  // layered footnote 主路径
  affix:        { primary: ['V5', 'V1'],     secondary: ['V3'] },
  enchantment:  { primary: ['V5'],            secondary: ['V1'] },
  bossModifier: { primary: ['V1', 'V6'],     secondary: ['V3'] },
  class:        { primary: ['V1'],            secondary: ['V5'] },  // V1 升职通知 boilerplate 主路径
  ritual:       { primary: ['V1', 'V5'],     secondary: ['V3'] },
  tutorial:     { primary: ['V1'],            secondary: [] },       // 全 boilerplate
  achievement:  { primary: [],                secondary: [] },        // ❗ achievement 是否保留？v4.1 §8.10.1 禁止 lore unlock UI——**待 audit Phase D**
  bossTooltip:  { primary: ['V6'],            secondary: ['V1'] },   // NEW · 反身闭合 attribution
  scriptorNotes:{ primary: ['V2'],            secondary: [] },
  shopnote:     { primary: ['V1'],            secondary: ['V2'] },
  handbook:     { primary: ['V5'],            secondary: [] },        // NEW · V5 守则 layered library 主路径
  charDrift:    { primary: ['V3'],            secondary: [] },        // NEW · Cycle 6+ 字符级缓变 patterns
  freeTypeNote: { primary: ['V2'],            secondary: ['C6'] },   // NEW · DC2 致后来者便签
}
```

新增 type：`bossTooltip` / `handbook` / `charDrift` / `freeTypeNote`。

### 2.5 v3.1 残留禁词（NEW）

新增 `V3_RESIDUE_BANNED_ZH` / `_EN` 列入 `config.mjs`：

```js
export const V3_RESIDUE_BANNED_ZH = [
  // v3.1 三轨映射作废
  '三轨映射', 'V-1 基础合规手册', 'V-2 残稿处理补充须知', 'V-3 异常处理修订',
  '基础合规手册', '残稿处理补充须知', '异常处理修订',
  'Tier 0 标准层', 'Tier 1 微扰层', 'Tier 2 双视层', 'Tier 3 反转层',
  'L0 标准层', 'L1 微扰层', 'L2 双视层', 'L3 反转层', // 注意 L1-L4 在 v4.1 是 layered footnote 含义，不是 tier
  // v3.1 协议代号作废
  'SCP（Standard Containment Protocol）', 'FRP（Fragment Recovery Protocol）',
  'ARP（Anomaly Reception Protocol）', 'PEP（Permanent Embed Protocol）',
  'Standard Containment Protocol', 'Fragment Recovery Protocol',
  'Anomaly Reception Protocol', 'Permanent Embed Protocol',
  // v3.1 主任 / 月度考核官 概念作废
  '主任', '月度考核官', '上级权威',
  // v3.1 内训讲师概念作废
  '内训讲师', '猴行协议教练', '内训部',  // 注意：内训部作为 11 部门之一是合法的——需 context-sensitive
  // v3.1 anchor 6 概念作废
  'Anchor 6', '人类记忆残片',
  // v3.1 设定全称作废 → 改 DPCA / 文牍科
  '灵长类辅助文书部',
  // v3.1 KPI 月度概念部分作废（v4.1 用 BATCH/CYCLE/DAY/A 词典）
  '月度考核', '月度小报',
  // 系统反馈违规（audit Tier 1A）
  '解锁了', '已解锁', '解锁',  // context-sensitive：data flag 内可保留，UI / 守则 / 升职通知 内禁止
]

export const V3_RESIDUE_BANNED_EN = [
  // v3.1 三轨映射 / 协议作废
  'Standard Containment Protocol', 'Fragment Recovery Protocol',
  'Anomaly Reception Protocol', 'Permanent Embed Protocol',
  'FRP', 'ARP', 'PEP',  // SCP 缩写本身已在 v3.1 list 中
  'Tier 0 standard layer', 'Tier 1 perturbation', 'Tier 2 dual-vision',
  'Tier 3 inversion',
  // Anchor 6
  'Anchor 6', 'human memory fragment',
  // 设定全称
  'Department of Primate Clerical Assistance',  // v3.1 推测翻译；v4.1 改 DPCA / Department of Primate Clerical Affairs
  // 解锁
  'unlocked', 'Unlocked',  // 同 zh context-sensitive
]
```

### 2.6 作废 generated/*.mjs

| 文件 | v3.1 用途 | v4.1 处理 |
|---|---|---|
| `tier3-inversion-map.mjs` (619 行) | Tier 3 反转 PEP 视角映射 | **作废** · 删除 import + 文件 |
| `handbooks.mjs` (356 行) | V-1/V-2/V-3 守则 skeleton | **作废** · 替换为 v4.1 V5 layered library skeleton（Phase C 重新生成） |
| `data/handbooks-skeleton.mjs` | 同上 | **作废** |
| `data/tier3-inversion-skeleton.mjs` | 同上 | **作废** |

保留并校准（v3.1 内容仍部分有效）：
- `affix-taxa.mjs`（930 行 NCBI 灵长目编码）— v4.1 词缀 species 编码继承，加 D31 layer 标注
- `enchant-protocols.mjs`（175 行 Apprentice/Quest/Operator 行为学动词）— 继承
- `relic-departments.mjs`（193 行 11 部门）— 继承（11 部门设定 v4.1 仍 LOCKED §5.5）
- `mib-lexicon.mjs`（63 行）— **作废 MIB 概念**，但保留信号词词典作为 V1 boilerplate 的"administrative footnote 风格"参考；rename 为 `boilerplate-lexicon.mjs`
- `quest-codes.mjs`、`quotas.mjs`、`stage-config.mjs`、`translation-table.mjs` — 校准 cycle 演进 / 词典统一（v4.1 BATCH/DAY/CYCLE/A）

### 2.7 b1a-vocab.mjs 重生

当前 v3.1 `b1a-vocab.mjs` 的 `allowed.能力获取` 包含 **"授权 / 许可 / 批准"**——这与 v4.1 audit Tier 1B + §9.8.3 D26 v2 + D30 直接冲突。需要重写为 v4.1 词典：

```js
// v4.1 — 公司 = defensive curator + bureaucratic firewall，**不分发** anomaly / 新机制
"allowed": {
  "物品获取": [
    "签出",  // v4.1 主词（替换 audit Tier 2B）
    "经手",
    "签收",
    "领用",
    "经过工位",
  ],
  "能力获取": [
    // ❗ v4.1：玩家**自己学会**（D26 v2），公司**不发**——本类目从 b1a 删除
    // 替代：用 V5 守则 layered footnote 显化（"经手记录"已注明 X 已操作）
  ],
  "流程": [
    "复审", "复核", "登记", "归档", "抄送", "报备",
    "reclassify",  // v4.1 D26 v2 公司唯一动作之一
    "签发文件",
  ],
  "任务": [
    "部署", "安排", "指派", "调遣", "轮值", "转岗",
  ],
},
"forbidden": {
  // 继承 v3.1 全部 forbidden 类目
  // + audit Tier 1A 系统反馈违规（system message 上下文）
  "授权系（system message 上下文）": {
    "words": ["授权", "许可", "批准", "解锁", "解锁了", "已解锁", "配发"],
    "reason": "v4.1 §9.8.3 + D30：公司不分发 anomaly / 新机制；这些词在 system message 上下文一票否决",
    "context": "system_message",  // 仅在 system message 上下文禁止；in-character 公文 stamp 允许
  },
  "Power fantasy 句式": {
    "words": ["获得 X 能力", "获得 X！", "已掌握", "新功能！", "恭喜"],
    "reason": "audit Tier 2B + §8.10.1 power fantasy popup 禁止",
  },
  "Fanfare emoji（在 system message / UI label）": {
    "patterns": ["🎉", "🎊", "🎁", "✨", "🏆", "🎲"],
    "reason": "audit Tier 2A + §8.10.1 0 fanfare 铁律",
    "context": "system_message",
  },
  // ...继承 v3.1 钻研/突破/创造/灵性/解放系
}
```

### 2.8 Phase A Done 判据

- [ ] `system-context.mjs` v4.1 premise + 6 锚点 → C1-C6 + 5 工种阶梯 + Cycle 词典 已 inline
- [ ] `anchor-facts.mjs` v4.1 D1-D32 + C1-C6 双层结构
- [ ] `b1a-vocab.mjs` v4.1（含 audit Tier 1A/1B/2A/2B 禁词整合）
- [ ] `config.mjs` VOICE_MAP 7 voices + 14 type
- [ ] `config.mjs` V3_RESIDUE_BANNED_ZH/EN 加入
- [ ] `tier3-inversion-map.mjs` / `handbooks.mjs` / 2 个 skeleton 删除
- [ ] `mib-lexicon.mjs` rename + 内容清洗
- [ ] Pipeline 可 dry-run（`node run.mjs --type relic --dry-run`）输出 v4.1 prompt 不报错

---

## 3 · Phase B · Voice Templates V1-V7 扩展

`prompts/voices.mjs` 当前 573 行，3 个 voice template（doc / bell / note）。改为 V1-V7 + 4 新 type。

### 3.1 Voice template 文件结构

```js
// prompts/voices.mjs
export function buildPromptForVoice(voice, type, target, context) {
  switch (voice) {
    case 'V1': return buildV1Boilerplate(type, target, context)
    case 'V2': return buildV2PeerNote(type, target, context)
    case 'V3': return buildV3AnomalyDictation(type, target, context)
    case 'V4': return buildV4D29Prompt(type, target, context)
    case 'V5': return buildV5HandbookLayered(type, target, context)
    case 'V6': return buildV6BossTooltip(type, target, context)
    case 'V7': return buildV7Environmental(type, target, context)
  }
}
```

每个 builder 返回完整 prompt：system-context（cached）+ voice 专属 craft rules（§6.3.x inline）+ word limits + sample library + structured output schema。

### 3.2 Word limits 重定义

| Voice | zh 最大字符 | en 最大词 | 备注 |
|---|---|---|---|
| V1 | 60 (短) / 200 (长 boilerplate) | 30 / 80 | doc 拆 short / long |
| V2 | 40 | 20 | "想回去：少思考。" 句式 |
| V3 | 20 | 10 | fragment 限制 |
| V4 | 30 | 15 | command 句式 |
| V5 | 50 (per layer) | 25 (per layer) | × 4 layer = 200 / 100 总 |
| V6 | 80 | 40 | tooltip + attribution |
| V7 | N/A（环境，不出文字）| N/A | structured props/sound spec |

### 3.3 V5 Layered Footnote Schema（NEW · 核心）

V5 输出 4 层 stratified footnote。Schema：

```json
{
  "id": "rule_003",
  "category": "duty",
  "L1_recorder": {
    "text_zh": "守则 003：视线停留在当前高亮字符。",
    "text_en": "Rule 003: Keep gaze on currently highlighted character.",
    "voice": "V5_L1",
    "redaction_state": null
  },
  "L2_proofreader": {
    "text_zh": "守则 003 注：本条已审阅，无需进一步处理。",
    "text_en": "Rule 003 note: This entry has been reviewed; no further processing required.",
    "voice": "V5_L2",
    "redaction_state": null,
    "depends_on": "L1"
  },
  "L3_reviser": {
    "text_zh": "守则 003 备忘：Subject [工号] 于 Cycle Y 经手任务时报告幻听打字声，应答后转入特殊勤务。建议补入第七打字室基础守则。",
    "text_en": "...",
    "voice": "V5_L3",
    "redaction_state": null,
    "depends_on": "L2",
    "anomaly_signal_density": 0.3
  },
  "L4_author": {
    "text_zh": "守则原始来源：1986-XX-XX 17:06 事件后续 protocol。",
    "text_en": "...",
    "voice": "V5_L4",
    "redaction_state": null,
    "depends_on": "L3",
    "lore_anchor": "D27_acceptance_window || project_nim"
  }
}
```

**Stratification rules**（pipeline 强制）：
- L1 必须 100% boilerplate · 0 anomaly signal
- L2 仍是 boilerplate，但加注释 / cross-reference 起 microcrack
- L3 引入污染信号（anomaly_signal_density 0.2-0.4），暗示**前一层是不完整的**
- L4 唯一可显化 lore anchor（Project Nim / D27 受理窗口 / B8 reveal）；anomaly_signal_density 0.5-0.7
- **任何 L 都不能 break 前一层的 plausible deniability**——L4 不能直接说"L1 是假的"，只能让 L1 显得**不完整**

### 3.4 反身闭合 Placeholder Syntax（NEW · 核心）

V6 boss tooltip 等含 attribution 的 voice 必须使用 placeholder 让 runtime 替换：

```
{{ATTRIBUTION:type=current_player_worker_id}}                      // Ch.4 自己工号
{{ATTRIBUTION:type=approximate_player_worker_id, drift=1}}          // Ch.3 差 1 位
{{ATTRIBUTION:type=previous_endless_worker_id}}                     // Ch.5 自己以前 endless 工号
{{ATTRIBUTION:type=previous_endless_worker_id, fallback=ID-XX-####}} // 无 PL-5 数据时的 fallback

{{MODIFIER_TEXT:source=player_history, chapter=2}}                  // Ch.3 boss tooltip 用玩家 Ch.2 标注的某句
{{MODIFIER_TEXT:source=player_history, chapter=3}}                  // Ch.4 boss tooltip 用玩家 Ch.3 修改的某段
{{MODIFIER_TEXT:source=player_endless, fallback=本工位无收件人。}}   // Ch.5 用玩家 endless 自由打字内容

{{TIMESTAMP:format=cycle_relative, drift=-N}}                       // 历史时间戳，runtime 计算
{{WORKER_ID_HISTORY:source=player_chapter_clear, chapter=N}}        // §9.6.1 playerWorkerIdHistory
```

Pipeline 输出含 placeholder 的字符串；runtime（PL-5 + future PL-2/3）根据 NarrativeArchive 数据替换。

**Validation 要求**：placeholder 内任何 type/source/format 必须在 placeholder 词典里登记；未登记的占位符 = 输出 reject。

### 3.5 V7 Environmental（NEW · 不输出文字）

V7 是**环境而非文本**。pipeline 仍生成，但输出 schema 不含 `text_zh/text_en`，而是 structured spec：

```json
{
  "id": "ch4_workstation_minimalism",
  "voice": "V7",
  "channel": "spatial",
  "spec": {
    "props_present": ["typewriter", "chair", "ribbon_window"],
    "props_absent": ["nameplate", "rules_handbook", "cup", "calendar"],
    "lighting": "fluorescent_dim",
    "ambient_density_pct": 15,
    "design_intent": "Ch.4 工位最简——比 Ch.1 还少 prop（§7.3.1）"
  }
}
```

V7 用于：
- 工位 prop spec finalize（§7.3 / §7.6）
- 美学物理化（§7.7）
- Sound design ambient（§7.8）
- Motion 向心矢量（§7.9，与 memory `feedback_no_ambient_background_motion.md` 一致）

### 3.6 Phase B Done 判据

- [ ] `voices.mjs` 7 个 builder 函数全部 implemented
- [ ] V5 layered footnote schema validated（4 层 stratification rule）
- [ ] V6 反身闭合 placeholder syntax + 词典 inline
- [ ] V7 environmental structured spec schema
- [ ] 每个 voice 的 `WORD_LIMITS` 已重定义
- [ ] Pipeline 可 dry-run 单个 voice（`--voice V5 --type handbook --dry-run`）

---

## 4 · Phase C · Boilerplate / 静默修订 / 字符级缓变 / 反身闭合

### 4.1 升职通知 Boilerplate Template（**DECISION REQUIRED · 草案**）

audit Tier 1A 跨 5 处 affected：`tutorial.L5_class_unlock_*` × 2 + `class_select.lock_*` × 3 + Ch.2 / Ch.3 / Ch.5 endless 入口章节叙事。**完全相同 template** 是 §2.18 反身闭合伏笔铁律。

**Template 草案 v0.1**：

```
zh:
职位变更：{from_title}→{to_title}。
权限调整生效。
本职位无配额，无值班同事，无定期审阅。
详见随附作业手册第 §{section_ref}。

en:
Position change: {from_title} → {to_title}.
Authorization adjustments now in effect.
This position carries no quota, no on-shift peers, no periodic review.
See attached operations handbook §{section_ref}.
```

**说明**：
- 4 行结构固定（行数 = template 同一性的视觉标记）
- 不出现"解锁 / 升职 / 恭喜 / Welcome"——纯 V1 boilerplate
- "权限调整生效" 是 v4.1 替换 v3.1 "授权" 系列的中性词；passive voice + 公司**对自己**说"权限"，不是公司**给玩家**说"获得权限"
- "无配额，无值班同事，无定期审阅" 是 D32 endless 入口仪式的核心——**孤立**逐章上升
- `{section_ref}` runtime 替换为对应 chapter 的守则 section（V5 守则 layered library 的某个 entry）

**template 在 5 处的具体填法**：

| 处 | from_title | to_title | section_ref |
|---|---|---|---|
| Ch.2 入口（PL-10 已 LOCKED 章节叙事） | 录入员 | 校对者 | 守则 §044 / 校对者基础职责 |
| Ch.3 入口（章节叙事 §2.16.3） | 校对者 | 修改者 | 守则 §087 / 修改者基础职责 |
| Ch.5 endless 入口仪式（§2.16.5）| 作者 | 文本一部分 | 守则 §∅ / 本职位无守则 |
| `tutorial.L5_class_unlock_*` | 同上 chapter，runtime 注入 | 同上 | 同上 |
| `class_select.lock_*` | 锁定状态版本 → "职位代码 {code} · 待补编 / 候补 / 编制外" | — | — |

**需要你确认**：
- ✅ / ❌ 4 行 boilerplate 结构
- ✅ / ❌ "权限调整生效" 这种 passive voice 替换
- ✅ / ❌ Ch.5 endless 入口"守则 §∅"——空守则 anchor 化的 horror 表达

### 4.2 "已签出" / "经手" Voice 词典（audit Tier 2B replacement）

audit Tier 2B 列出 ~10 个 power fantasy "获得 X !" 句式 i18n key 需替换。统一 voice 词典：

| 原句式 | v4.1 替换 | 适用 type |
|---|---|---|
| `获得 {item} !` | `已签出: {item}` | shop.got_relic / got_skill |
| `获得 X 能力` | `已配置: X 字段` / `已经手: X 字段` | tutorial L3/L5 unlock |
| `已升级 X !` | `X 等级 +1`（无感叹）| rest.upgrade.r |
| `获得临时增强：...` | `临时调度: {modifiers}` | rest.buff.r |
| `获得 N 香蕉和 X 次免费刷新！` | `当批补贴: N 蕉 · X 次免费换批` | rest.intermission.r |
| `恭喜!` | （删除）| 全清 |
| `🎉 X 完成!` | `X · 完结` | tutorial.complete.title |
| `X 完成！` | `X 完成` (去感叹) | ritual.applied_generic / craft.completed |

**Voice 词典原则**（pipeline 注入到 V1 + V5 prompt）：
- 主语永远是**公司流程**（"已签出"= 公司动作 / "已配置"= 公司动作 / "已经手"= passive）
- 永远 passive voice / past participle
- 永远不出现 fanfare emoji + 感叹号 + "Welcome"
- 永远不出现"你 / 您"——主语 = 公司 / 流程 / 工位 / 工号

### 4.3 静默修订 Versioning System（NEW）

V5 守则的"silently 修订"机制——同一 entry 多版本，runtime 选择：

```json
{
  "id": "rule_014",
  "versions": [
    {
      "version": 1,
      "valid_from_cycle": 1,
      "valid_to_cycle": 3,
      "L1_recorder": { "text_zh": "守则 014：每 30 字确认一次计时钟。", "..." },
      "redaction_marker": null
    },
    {
      "version": 2,
      "valid_from_cycle": 4,
      "valid_to_cycle": 5,
      "L1_recorder": { "text_zh": "守则 014：每 30 字确认一次计时钟（仅当计时钟有秒针时）。", "..." },
      "redaction_marker": "silent_amendment"
    },
    {
      "version": 3,
      "valid_from_cycle": 6,
      "valid_to_cycle": null,
      "L1_recorder": { "text_zh": "守则 014：（已删除）", "..." },
      "redaction_marker": "silent_deletion"
    }
  ]
}
```

**关键 invariant**：
- 任何 version 都不带"自 [日期] 起生效"等 metadata（§6.8.1 禁止）
- redaction_marker 是 pipeline 内部字段，不输出到玩家
- Runtime 选 valid_from_cycle ≤ current_cycle ≤ valid_to_cycle 的 entry
- 玩家事后**回想**才发觉差异——pipeline 不能让玩家**当下**意识到

新文件 `generated/redaction-versioning.mjs` 存全部 v4.1 守则 versioned entries。

### 4.4 字符级缓变 Patterns（NEW · Cycle 6+）

与 memory `feedback_ui_label_vocabulary.md` 一致：Cycle 6+ Endless 启用单字符级缓变作为污染症候。pipeline 生成 ~50 patterns：

```json
{
  "id": "drift_pattern_001",
  "voice": "V3",
  "trigger": "cycle_gte_6 && hover_doc_id_in_set",
  "stages": [
    "员工编号 0048",
    "员工编号 0049",
    "员工编号 0048",
    "员工编号 0050",
    "员工编号 0048"
  ],
  "duration_ms": 200,
  "settle_on_mouse_leave": true
}
```

新文件 `generated/char-drift-patterns.mjs` 存全部 patterns。

### 4.5 Phase C Done 判据

- [ ] 升职通知 boilerplate template DECISION 已 finalize
- [ ] `generated/boilerplate-templates.mjs` 含 5 处填法
- [ ] "已签出" voice 词典写入 b1a-vocab.mjs allowed.物品获取 + V1 prompt 引用
- [ ] `generated/redaction-versioning.mjs` schema + 起码 5 个 sample
- [ ] `generated/char-drift-patterns.mjs` schema + ~10 个 sample（pipeline 跑批扩到 50）

---

## 5 · Phase D · Validators v4.1 加严

`validators/index.mjs` 现 514 行，已有 v3.1 残留 + IP 禁词检测。v4.1 加严：

### 5.1 新增 validator

| Validator | 检测 | reject 条件 |
|---|---|---|
| `checkV3Residue` | V3_RESIDUE_BANNED_ZH/EN | 命中任一即 reject |
| `checkAuditTier1Banned` | audit Tier 1A/1B 禁词在 system_message context | 命中 + context = system_message 即 reject |
| `checkFanfarePattern` | 🎉🎊🎁✨🏆🎲 + 感叹号 + "Welcome" | 命中 + voice ∈ {V1, V5, V6} 即 reject |
| `checkLayeredStratification` | V5 输出 L1-L4 stratification rule | L1 含 anomaly signal / L4 不含 lore anchor 等 violation |
| `checkBoilerplateAdherence` | 升职通知 template 5 处填法 | 任何 chapter-clear notification 不匹配 4 行结构 reject |
| `checkPlaceholderSyntax` | 反身闭合 placeholder 语法 | 未登记的 type/source 即 reject |
| `checkPIInternalNameLeakage` | "灵长接口 / Primate Interface / PI 接口" 在玩家可见输出 | reject |
| `checkClassRenamingConsistency` | 5 工种用 narrative tier id 而非 code id | code id 出现在 flavor 即 reject |

### 5.2 既有 validator 扩展

- `V2_BANNED_ZH/EN`（v2.3 残留）保留并加 v3.1 残留
- `B1A_VOCAB.forbidden` 加 audit Tier 1A/1B context-sensitive 词
- `monkey_motif_max_pct` quota（§6.5）保留

### 5.3 Phase D Done 判据

- [ ] 8 个新 validator 全部 implemented + 单测覆盖
- [ ] `validators/index.mjs` 输出**仅 reject reason**（不"修复"）—— pipeline reject 后人工 review
- [ ] Pipeline 跑 audit 文档 Tier 1A/1B 修复后的 sample 数据，0 false positive

---

## 6 · Phase E · Output Schema + Ingest

### 6.1 Output schema 扩展

`run.mjs` 当前每条 entry 含 `text_zh/text_en` 两字段。v4.1 schema：

```json
{
  "schema_version": "v4.1",
  "type": "relic | affix | bossModifier | handbook | bossTooltip | charDrift | freeTypeNote | ...",
  "id": "...",
  "voice": "V1 | V2 | ... | V7",
  "layered": {
    "L1": { "text_zh": "...", "text_en": "..." },
    "L2": { ... },
    "L3": { ... },
    "L4": { ... }
  },  // 仅 V5 / 部分 relic 含
  "placeholders": ["{{ATTRIBUTION:...}}", ...],  // 反身闭合
  "redaction_versions": [...],  // 仅 V5 守则
  "anomaly_signal_density": 0.3,  // 0-1
  "metadata": {
    "cycle_target": [1, 2, 3] | null,  // 仅 charDrift
    "channel": "DC1 | DC2 | ... | DC11",  // 与 §8 channel 矩阵对齐
    "anchor_d_refs": ["D26_v2", "D31"],
    "anchor_b_refs": ["B5"]
  }
}
```

### 6.2 Ingest scripts（NEW）

`scripts/narrative-writer/ingest/` 新目录，含：

| 文件 | 用途 |
|---|---|
| `ingest-relics.mjs` | 把 v4.1 relic layered footnote 写回 `src/src/data/relics.ts`（替换 58/95 v2.3 残留 + 现有 v3.1 部分） |
| `ingest-skills.mjs` | 把 v4.1 skill flavor 写回 `src/src/data/skillGeneration.ts`（替换 ~85% v2.3 残留） |
| `ingest-bossmods.mjs` | 把 v4.1 boss modifier 文案 + V6 placeholder 写回 `src/src/data/bossModifiers.ts` |
| `ingest-i18n.mjs` | 把 audit 文档 Tier 1A/1B/2A/2B replacement 写回 `src/src/demo/demo-i18n.ts`（per-key surgical 替换，**不覆盖** out-of-scope keys） |
| `ingest-handbooks.mjs` | 写入新文件 `src/src/data/narrative/handbooks.ts` 含 V5 layered library + redaction versioning |
| `ingest-chardrift.mjs` | 写入新文件 `src/src/data/narrative/charDrift.ts` |

### 6.3 Phase E Done 判据

- [ ] Output schema v4.1 文档化（`scripts/narrative-writer/SCHEMA.md`）
- [ ] 6 个 ingest scripts implemented
- [ ] Ingest dry-run 模式（`--dry-run` 输出 diff 不写文件）
- [ ] 跑批分批策略 finalized（per-chapter / per-priority / per-voice 任一）
- [ ] P0 内容生成 → ingest → typecheck pass

---

## 7 · Cross-Phase 协调点 + Decisions Required

### 7.1 跨 phase 依赖

```
A.2 anchor-facts D1-D32        → B.3 V5 layered（L4 lore anchor 引用 D 编号）
A.2 anchor-facts C1-C6         → B.* V2 (C2) / V4 (C3) / V6 (C6)
A.3 5 工种命名                  → C.1 升职通知 template（from/to title）
A.4 VOICE_MAP voice → type      → B.1 voice-builder dispatcher
A.5 v3.1 残留 ban              → D.1 checkV3Residue
A.7 b1a-vocab v4.1             → D.2 checkAuditTier1Banned
B.4 placeholder syntax         → D.1 checkPlaceholderSyntax
C.1 升职通知 template          → D.1 checkBoilerplateAdherence
C.3 redaction versioning       → E.1 output schema redaction_versions
C.4 char-drift patterns        → E.1 output schema cycle_target
所有 phase                     → E.2 ingest scripts（read v4.1 output）
```

### 7.2 Decisions Required（按 phase 顺序）

**Phase A 决策**：
- [ ] **5 工种英文命名**：`recorder / proofreader / reviser / author / assimilated`？
- [ ] **双层命名策略**：code id 不变 / narrative tier id 单独？
- [ ] **DPCA 中文 UI 表达**：所有 UI 写"DPCA"还是"文牍科"？还是 mixed（V1 boilerplate 写"DPCA"、V5 守则写"文牍科"）？
- [ ] **`achievement` type 是否保留**：v4.1 §8.10.1 禁止 lore unlock UI——保留则 voice 限定为 V1 boilerplate（评估通报）；删除则 audit Phase D 中 `achievement` 概念全清

**Phase B 决策**：
- [ ] **V7 是否独立成 builder**：V7 不输出文字，但 pipeline 是否生成 spec？还是只在 docs 描述、pipeline 不管？

**Phase C 决策**：
- [ ] **升职通知 boilerplate template** 4 行结构 + 措辞确认
- [ ] **"权限调整生效"** 这种 passive voice 替换是否接受
- [ ] **Ch.5 endless 入口"守则 §∅"** 这种空守则 anchor 化是否接受
- [ ] **"已签出" 替换 "获得"** 在 audit Tier 2B 全部 ~10 个 key 的统一接受

**Phase E 决策**：
- [ ] **跑批分批策略**：一次全跑 vs per-priority (P0 → P3) vs per-chapter
- [ ] **v3.1 残留替换路径**：直接覆盖 vs 旧文案 → `*.v3.1.backup.ts` archive 后覆盖

### 7.3 与既有 spec / artifact 的 cross-ref

| 本 spec § | references |
|---|---|
| §2.1 Premise | narrative-design §2.1 / §2.2 / §2.12 / D12 / D14 v2 / D26 v2 / D30 |
| §2.2 Anchor D1-D32 | narrative-design §2.13（D 表）|
| §2.3 5 工种 | narrative-design D4 / D9 / D10 / §4.3 / §2.16.x |
| §2.4 Voice map | §6.2 + §8（11 channel）|
| §3.3 V5 layered | §6.3.5 + D31 + D20 v3 |
| §3.4 反身闭合 placeholder | §4.7 + §8.9 + PL-5 NarrativeArchive schema（PL-5 已 implemented，commit `f36a331`）|
| §4.1 升职通知 template | §2.18 + §6.3.1 + audit Tier 1A |
| §4.2 "已签出" voice | audit Tier 2B |
| §4.3 静默修订 | §6.3.5 + §6.5 手法 6 |
| §5.x validators | audit Tier 1-3 + §9.8.3 + §8.10.1 |
| §6.x ingest | §9.10.3 现有 systems × v4.1 接入点 |

---

## 8 · Out of Scope（明确不在本 spec 内）

- **In-game UI 改造**（PL-2/3/11 + Tier 3 class desc）：本 spec 仅生成 / 替换文本资源；in-game UI 部件（class picker / boss tooltip 视觉布局 / PI 屏幕 CRT 弯曲）由 PL-2/3/11 处理
- **NarrativeTrackingState + NarrativeTriggerEngine implementation**（§9.2）：runtime 行为 trigger engine 是后续 P0 工程任务，本 spec 不涉及
- **新职业"校对者"代码实现**（5 工种 Tier 2 在游戏代码里不存在）：本 spec 仅命名 + flavor 准备；游戏代码任务独立
- **DC9 主菜单 ambient sound replay 工程**（PL-11）：仅消费本 spec 输出的 char-drift patterns 设计，不涉及 audio engine
- **NotebookEdit / 多语言额外 locale**（本 pipeline 仅 zh/en bilingual，与现 v3.1 一致）

---

## 9 · 推荐执行顺序

1. ✅ 本 spec 入库
2. **决策 batch**：Phase A 决策 4 项 + Phase C 决策 4 项（一次性 review，避免实施中断）
3. **Phase A 实施** · 1 session（约 6-8 个文件改动 + dry-run 测试）
4. **Phase B 实施** · 1 session
5. **Phase C 实施** · 1 session
6. **Phase D 实施** · 0.5 session（与 C 合并 commit 也可）
7. **Phase E 实施 + 跑批**：Phase A-D 完成后，跑批分**P0 内容启动**——最小集为 V1 升职通知 template 5 处 + V5 守则 layered ~30 entries（Ch.1-2 ship）+ V6 boss tooltip placeholder 注入。**P0 跑批后立即 ingest，让 Ch.1-2 ship 不被卡**。后续 P1-P3 跑批可分批
8. **PL-2/3 同步** 一旦启动，consume 本 spec 已生成的 Tier 3 class desc replacement

---

**Last update**：2026-05-04
**Next consumer**：Phase A 实施者（具体文件改动清单 + dry-run 测试） · 8 项 decision review
