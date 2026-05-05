// Auto-derived from docs/narrative-design.md v4.1 (LOCKED 2026-05-04)
//
// v3.1 → v4.1 校准：
//   - 5 工种命名替换：None / Wordsmith / Metamorph / Endless → recorder / proofreader / reviser / author / assimilated
//   - "主任突袭" / "月度考核官" 移除（D14 v2 + D21 banal evil 没有 villain face）
//   - "月度团建" / "月度奖金" → BATCH 词典
//   - "12 阶段循环" → 12 stages per BATCH（Cycle 词典统一）

export const TRANSLATION_TABLE = [
  {
    "game": "classId: none",
    "zh": "录入员（recorder · Tier 1）",
    "en": "recorder (Tier 1)"
  },
  {
    "game": "classId: proofreader (NEW)",
    "zh": "校对者（proofreader · Tier 2）",
    "en": "proofreader (Tier 2)"
  },
  {
    "game": "classId: metamorph",
    "zh": "修改者（reviser · Tier 3）",
    "en": "reviser (Tier 3)"
  },
  {
    "game": "classId: wordsmith",
    "zh": "作者（author · Tier 4）",
    "en": "author (Tier 4)"
  },
  {
    "game": "classId: endless",
    "zh": "文本一部分（assimilated · Tier 5）",
    "en": "assimilated (Tier 5)"
  },
  {
    "game": "12 stages per BATCH",
    "zh": "一个 BATCH 的工作序列（共 12 stage）",
    "en": "12 stages per BATCH"
  },
  {
    "game": "精英关 (Stage 5)",
    "zh": "中段复审节点（DPCA 公告 + cameo 短句，无 specific persona）",
    "en": "mid-batch review checkpoint (DPCA notification + cameo, no persona)"
  },
  {
    "game": "仪式关 (Stage 6)",
    "zh": "附注台 / 流程 6（V1 通知 + V5 守则节录）",
    "en": "Annotation Station / Procedure 6 (V1 notice + V5 handbook excerpt)"
  },
  {
    "game": "Boss 关 (Stage 12)",
    "zh": "BATCH 末考核节点（V6 boss tooltip 反身闭合 attribution）",
    "en": "end-of-BATCH evaluation (V6 boss tooltip with reflexive attribution)"
  },
  {
    "game": "永久 modifier 累积",
    "zh": "守则修订（'§044 已增补' 等；§4.1 deny→affirm flip 之外的其他 V5 静默修订）",
    "en": "handbook silent amendments"
  },
  {
    "game": "Cycle 时间衰减 (×0.9)",
    "zh": "\"本批次产能要求上调\" / \"近期人手紧张\"",
    "en": "\"Output requirement raised this BATCH\""
  },
  {
    "game": "暴击",
    "zh": "你超额完成了配额",
    "en": "you exceeded quota"
  },
  {
    "game": "调岗",
    "zh": "run 失败的统称，去向永远不写明（C2 peer ghost 退场 protocol）",
    "en": "reassignment (run-fail euphemism; destination never written)"
  },
  {
    "game": "蕉",
    "zh": "BATCH 奖金（财务严肃语调，参见 Ethical Stance Rule 9 注脚）",
    "en": "BATCH bonus (financial deadpan, never gag-frame)"
  },
  {
    "game": "工号 [Subject ID]",
    "zh": "玩家在 DPCA 内的身份编号；deny→affirm flip 时 attribution 用 'Subject [工号]' 格式",
    "en": "Player Subject ID; used in deny→affirm attribution"
  },
  {
    "game": "endless 模式",
    "zh": "Cycle 6+ assimilated（D32 双 voice 同事件最高兑现）",
    "en": "Cycle 6+ assimilated (D32 dual-voice highest fulfillment)"
  },
  {
    "game": "boss modifier",
    "zh": "BATCH 末考核条件（V6 反身闭合 attribution = 玩家以前 endless 工号）",
    "en": "BATCH-end evaluation modifier (V6 attribution = player's prior endless ID)"
  }
]

// Quick lookup: game term → narrative term (zh)
export const TERM_ZH = Object.fromEntries(
  TRANSLATION_TABLE.map(e => [e.game, e.zh])
)

// Quick lookup: game term → narrative term (en, may be empty)
export const TERM_EN = Object.fromEntries(
  TRANSLATION_TABLE.map(e => [e.game, e.en])
)
