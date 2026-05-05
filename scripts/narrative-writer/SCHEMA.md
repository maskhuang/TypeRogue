# Narrative-Writer Pipeline · v4.1 Output Schema

**Version**: 4.1
**Last update**: 2026-05-04
**Spec**: `docs/implementation-artifacts/narrative-pipeline-v41-spec.md` §6.1

Pipeline LLM 跑批后写出 JSON 文件至 `output/<timestamp>-<type>-{raw,approved}.json`。
Ingest scripts 读取这些 JSON 并写入 `src/src/data/narrative/*.ts` / `src/src/data/relics.ts` 等 game 代码。

本文档定义所有 v4.1 voice / type 的 output shape，作为 ingest scripts 的 input contract。

---

## 1 · Top-level shape

每个 output 文件是一个 JSON 数组，每个 entry 含以下 envelope：

```json
{
  "schema_version": "v4.1",
  "type": "relic | affix | bossModifier | handbook | bossTooltip | charDrift | freeTypeNote | positionDenialAffirmation | environmental | class | ritual | tutorial | achievement | scriptorNotes | shopnote",
  "id": "string · 与游戏对象 id 对齐（relic.id / affix.id 等）",
  "voice": "V1 | V2 | V3 | V4 | V5 | V5_pair | V6 | V7",
  "metadata": {
    "cycle_target": [1, 2, 3, 4, 5] | null,
    "channel": "DC1 | DC2 | ... | DC11 | null",
    "anchor_d_refs": ["D26_v2", "D31"],
    "anchor_b_refs": ["B5"],
    "anchor_c_refs": ["C2", "C6"],
    "generated_at": "ISO timestamp",
    "model_used": "claude-sonnet-4-6"
  },
  "content": { ... }  // voice-specific shape，见 §2-§9
}
```

`content` 字段的 shape 由 `voice` 决定。

---

## 2 · V1 · DPCA Boilerplate

```json
{
  "voice": "V1",
  "content": {
    "text_zh": "员工 [工号] 转入独立工位。本职位无配额。",
    "text_en": "Employee [ID] transferred to independent workstation.",
    "length_class": "short | long"
  }
}
```

**Word limits**：
- short: zh ≤60 字 / en ≤30 词
- long: zh ≤200 字 / en ≤80 词

**适用 type**：tutorial / class / ritual / shopnote / achievement / 部分 relic+affix codex

---

## 3 · V2 · 同事便条 (peer ghost · C2)

```json
{
  "voice": "V2",
  "content": {
    "text_zh": "想回去：少思考。",
    "text_en": "To return: think less.",
    "worker_id_signature": "047 | Subject XX-1138 | \"\" (omit)",
    "sentiment": "warning | contradictory | redacted | plea | farewell"
  }
}
```

**Word limits**：zh ≤40 字 / en ≤20 词

**适用 type**：scriptorNotes / freeTypeNote / 偶发 shopnote

---

## 4 · V3 · Anomaly Dictation (fragment · C5)

```json
{
  "voice": "V3",
  "content": {
    "fragment_zh": "字 看 我",
    "fragment_en": "the word watches me",
    "drift_pattern": ["员工编号 0048", "0049", "0048"],
    "readability": "fully_readable | partial | self_consistent_but_alien"
  }
}
```

**Word limits**：zh ≤20 字 / en ≤10 词
**drift_pattern**：可选；仅 Cycle 6+ 启用；用于 charDrift type 的 hover sequence

**适用 type**：charDrift / 部分 affix / 部分 bossModifier

---

## 5 · V4 · D29 检测员 prompt (C3)

```json
{
  "voice": "V4",
  "content": {
    "item_id": "mask | name | date | sentence | distinction",
    "degradation_state": "witness | routine | partial_fail | auto_fail",
    "prompt_zh": "请摘下面具。",
    "prompt_en": "Please remove the mask.",
    "response_zh": "本项检测对当前职位不适用。",  // partial/fail 阶段；witness/routine 可 null
    "response_en": "This check does not apply to your current position."
  }
}
```

**适用 type**：tutorial（Ch.1+ D29 序列）

---

## 6 · V5 · 规则手册 layered (D31)

### 6.1 V5 plain (single-rule, full 4 layers)

```json
{
  "voice": "V5",
  "content": {
    "section_ref": "§003",
    "references_position": "recorder | proofreader | reviser | author | assimilated | null",
    "L1_recorder": {
      "text_zh": "守则 003：视线停留在当前高亮字符。",
      "text_en": "Rule 003: Keep gaze on the currently highlighted character.",
      "anomaly_signal_density": 0
    },
    "L2_proofreader": {
      "text_zh": "守则 003 注：本条已审阅，无需进一步处理。",
      "text_en": "Rule 003 note: Reviewed.",
      "anomaly_signal_density": 0.1
    },
    "L3_reviser": { /* density 0.2-0.5 */ },
    "L4_author": { /* density 0.5-0.8 */ },
    "state": "plain"
  }
}
```

### 6.2 V5_pair (denial → affirmation 同 § 号配对 · §4.1)

```json
{
  "voice": "V5_pair",
  "content": {
    "section_ref": "§087",
    "references_position": "proofreader | reviser | author | assimilated",
    "denial": {
      "L1_recorder": { ... },
      "L2_proofreader": { ... },
      "L3_reviser": null,           // ❗ 必须 null
      "L4_author": null              // ❗ 必须 null
    },
    "affirmation": {
      "L1_recorder": { ... },
      "L2_proofreader": { ... },
      "L3_reviser": { ... },
      "L4_author": { ... }
    } | null,                        // ❗ assimilated (§144) 必须 null
    "valid_from_chapter": 3,
    "transition_marker": "silent_affirmation | silent_disappearance"
  }
}
```

### 6.3 V5 redaction-versioned (single-layer snapshot history)

```json
{
  "voice": "V5",
  "content": {
    "section_ref": "§014",
    "versions": [
      {
        "version": 1,
        "valid_from_cycle": 1,
        "valid_to_cycle": 3,
        "L1_recorder": {
          "text_zh": "守则 014：每 30 字确认一次计时钟。",
          "text_en": "Rule 014: Verify the timer every 30 characters.",
          "anomaly_signal_density": 0
        },
        "redaction_marker": null
      },
      {
        "version": 2,
        "valid_from_cycle": 4,
        "valid_to_cycle": 5,
        "L1_recorder": { /* density 0-0.5 */ },
        "redaction_marker": "silent_amendment | silent_addition | silent_truncation | silent_replacement | silent_deletion"
      }
    ]
  }
}
```

**Word limits**：每 layer ≤50 字 zh / ≤25 词 en

**适用 type**：handbook（V5 plain / pair / versioned）

---

## 7 · V6 · Boss Tooltip / 反身闭合 (C6)

```json
{
  "voice": "V6",
  "content": {
    "text_zh": "本场 modifier: {{MODIFIER_TEXT:source=player_history,chapter=2}}\n上一任作者: {{ATTRIBUTION:type=approximate_player_worker_id,drift=1}}",
    "text_en": "Current modifier: {{MODIFIER_TEXT:source=player_history,chapter=2}}\nPrevious author: {{ATTRIBUTION:type=approximate_player_worker_id,drift=1}}",
    "placeholders_used": [
      "{{MODIFIER_TEXT:source=player_history,chapter=2}}",
      "{{ATTRIBUTION:type=approximate_player_worker_id,drift=1}}"
    ],
    "chapter_target": 3
  }
}
```

**Word limits**：zh ≤80 字 / en ≤40 词
**Placeholder syntax**：必须在 `prompts/voice-schemas.mjs` `VALID_PLACEHOLDER_PATTERNS` 登记；未登记 → validators reject

**适用 type**：bossTooltip / 部分 bossModifier flavor

---

## 8 · V7 · Environmental (structured spec, no text)

```json
{
  "voice": "V7",
  "content": {
    "id": "ch4_workstation_minimalism",
    "channel": "spatial | temporal | motion | sonic",
    "chapter_scope": [4, 5],
    "spec": {
      "props_present": ["typewriter", "chair", "ribbon_window"],
      "props_absent": ["nameplate", "rules_handbook", "cup", "calendar"],
      "lighting": "fluorescent_dim | yellow_warm | red_stamp",
      "motion_vector": "centripetal | pulsing | static | none",
      "motion_intensity": 0.15,
      "ambient_density_pct": 15,
      "clock_state": "no_second_hand | stopped_at_17:06",
      "time_window_active": "1706-1713",
      "ambient_sounds": ["typewriter_clack", "fluorescent_hum"],
      "sound_density_pct": 30,
      "design_intent": "Ch.4 工位最简（§7.3.1）；M2 中心 pulse 启动"
    }
  }
}
```

**适用 type**：environmental（PL-11 视觉 / 音效落地的可机器读 manifest）

---

## 9 · 反身闭合 Placeholder · runtime resolution

V6 输出含 placeholder 字符串。Runtime（PL-5 NarrativeArchive 已 implemented · commit `f36a331`）替换契约：

| Placeholder family | runtime source |
|---|---|
| `{{ATTRIBUTION:type=current_player_worker_id}}` | `localStorage.getItem('dpca-worker-id')` |
| `{{ATTRIBUTION:type=approximate_player_worker_id, drift=1}}` | `localStorage worker_id ± drift` |
| `{{ATTRIBUTION:type=previous_endless_worker_id}}` | `NarrativeArchive.getBossModifierAttribution(modifier).playerWorkerId` |
| `{{ATTRIBUTION:type=previous_endless_worker_id, fallback=Subject XX-####}}` | 同上 + fallback 文本 |
| `{{MODIFIER_TEXT:source=player_history, chapter=N}}` | `NarrativeArchive playerWorkerIdHistory + 关联 entry` |
| `{{MODIFIER_TEXT:source=player_endless, fallback=...}}` | `NarrativeArchive endlessFreeTypeNotes` |
| `{{TIMESTAMP:format=cycle_relative, drift=-N}}` | `state.cycle - drift` |
| `{{WORKER_ID_HISTORY:source=player_chapter_clear, chapter=N}}` | `NarrativeArchive playerWorkerIdHistory.find(e => e.chapterCleared === N)` |

---

## 10 · Type → Voice Map

参考 `config.mjs` `VOICE_TYPE_MAP_V41`：

| type | primary voices | secondary voices | 备注 |
|---|---|---|---|
| relic | V5, V1 | V6 | layered footnote 主路径 |
| affix | V5, V1 | V3 | |
| enchantment | V5 | V1 | |
| bossModifier | V1, V6 | V3 | |
| class | V1 | V5 | |
| ritual | V1, V5 | V3 | |
| tutorial | V1 | — | 全 boilerplate |
| achievement | V1 | — | V1 only · 评估通报；零 V5 / 零 fanfare |
| bossTooltip | V6 | V1 | NEW · 反身闭合 attribution |
| scriptorNotes | V2 | — | |
| shopnote | V1 | V2 | |
| handbook | V5 | — | V5 layered library 主路径 · plain + V5_pair + versioned |
| charDrift | V3 | — | NEW · Cycle 6+ 字符级缓变 |
| freeTypeNote | V2 | — | NEW · DC2 致后来者便签 |
| positionDenialAffirmation | V5_pair | — | §4.1 转换核心 |
| environmental | V7 | — | NEW · structured spec |

---

## 11 · Output 文件命名

`output/<ISO-timestamp>-<type>-{raw,approved}.json`

例：
- `2026-05-04T14-23-09-handbook-raw.json` · LLM raw 输出
- `2026-05-04T14-23-09-handbook-approved.json` · 通过 validators + reviewer 后的输出

Ingest scripts **优先**读 `*-approved.json`。

---

## 12 · Pipeline → Game Code 路径

| Pipeline output type | → Ingest script | → Game code 目标文件 |
|---|---|---|
| relic | `ingest-relics.mjs` | `src/src/data/relics.ts` (替换 58/95 v2.3 残留 flavor) |
| affix / skill | `ingest-skills.mjs` | `src/src/data/skillGeneration.ts` (~85% v2.3 残留) |
| bossModifier | `ingest-bossmods.mjs` | `src/src/data/bossModifiers.ts` (reframe + V6 placeholders) |
| class / tutorial / ritual / shopnote | `ingest-i18n.mjs` | `src/src/demo/demo-i18n.ts` (audit Tier 1A/1B/2A/2B 替换) |
| handbook | `ingest-handbooks.mjs` | `src/src/data/narrative/handbooks.ts` (新文件) |
| charDrift | `ingest-chardrift.mjs` | `src/src/data/narrative/charDrift.ts` (新文件) |
| environmental | （未实现）| `docs/visual-spec.md` 或 PL-11 直接 consume |
| scriptorNotes / freeTypeNote | （Phase F 待规划）| `src/src/data/narrative/scriptorNotes.ts` |
| bossTooltip | （runtime 路径）| 由 V6 placeholder runtime 替换；无静态 ingest |

---

## 13 · v4.1 · v3.1 残留替换路径（spec §7.2 决策待 finalize）

两选项：

**A. 直接覆盖**
- `src/src/data/relics.ts` 旧 flavor 直接被 v4.1 layered footnote 替换
- 优点：clean
- 缺点：v3.1 内容丢失，无法回滚

**B. Archive 后覆盖**
- 旧文件先 copy 到 `*.v3.1.backup.ts`
- 然后 v4.1 内容覆盖原文件
- 优点：可回滚
- 缺点：`*.backup.ts` 文件污染 src/

**建议**：A（git 已经是 backup；v3.1 内容在 git 历史里仍可访问）

---

**Last update**：2026-05-04
**Next consumer**：6 个 ingest scripts + LLM 跑批运营者
