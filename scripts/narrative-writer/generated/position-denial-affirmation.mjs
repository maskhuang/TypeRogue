// Position Denial → Affirmation Flip · 4 对 entries (Phase C / spec §4.1)
//
// 同一 § 号下 denial / affirmation 双 state；玩家进章节时静默翻转。
// "升职" = **同一 § 号下守则 reading 变了**，**没有任何升职通知**。
//
// Schema invariants（pipeline / runtime / validators 全强制）：
//   - denial 阶段 L3_reviser = null · L4_author = null（污染层不可见，公司在保护你）
//   - affirmation 阶段 L1-L4 全部 populated（污染层对你可见了——这才是 horror）
//   - denial L1 禁词：目前 / 暂时 / 待定 / 候补（必须斩钉截铁否认）
//   - affirmation L1 禁词：新增 / new / 解锁 / 自即日起 / Welcome（必须当作"一直存在"写）
//   - §144（assimilated）affirmation 整对象 = null（V5 完全退场 · §6.7 voice 退场曲线最终态）
//
// 本文件 4 对手写种子。Phase E pipeline LLM 可基于此扩展为更多 § 号 entries。

export const POSITION_DENIAL_AFFIRMATION_PAIRS = [
  // ════════════════════════════════════════════════════════
  // §044 · Ch.2 recorder → proofreader
  // ════════════════════════════════════════════════════════
  {
    id: 'rule_044',
    voice: 'V5_pair',
    section_ref: '§044',
    references_position: 'proofreader',
    valid_from_chapter: 2,
    transition_marker: 'silent_affirmation',

    denial: {
      L1_recorder: {
        text_zh: "守则 044：本工位不存在'校对者'职级。同事便条若提及该职位，应视为伪造文本，立即上报。",
        text_en: "Rule 044: This workstation has no 'proofreader' position. Any peer note referencing said position shall be treated as forged text and reported immediately.",
        anomaly_signal_density: 0,
      },
      L2_proofreader: {
        text_zh: "守则 044 注：'伪造文本'判定参照《文本来源审核手册》（已封存）。本工位不保留判定记录。",
        text_en: "Rule 044 note: 'Forged text' determination follows the Text Source Audit Manual (sealed). This workstation retains no determination records.",
        anomaly_signal_density: 0.1,
      },
      L3_reviser: null,
      L4_author: null,
    },

    affirmation: {
      L1_recorder: {
        text_zh: "守则 044：校对者经手词条须复核录入员标记的标点符号是否合规。",
        text_en: "Rule 044: A proofreader's handled entries shall verify the punctuation marked by the recorder for compliance.",
        anomaly_signal_density: 0,
      },
      L2_proofreader: {
        text_zh: "守则 044 注：复核范围限定为 ASCII 范围内字符；超出 ASCII 的字符按异常文本流程处理（参见守则 §144）。",
        text_en: "Rule 044 note: Verification scope is limited to ASCII characters; non-ASCII characters proceed under anomalous text protocol (see Rule §144).",
        anomaly_signal_density: 0.15,
      },
      L3_reviser: {
        text_zh: "守则 044 备忘：Subject [工号] 于 Cycle Y 复核任务中报告'标点符号自行偏移'，应答后转入特殊勤务。建议补入校对者基础守则。",
        text_en: "Rule 044 memo: Subject [ID] reported 'punctuation drifting on its own' during Cycle Y verification; transferred to special assignment after response. Suggested incorporation into proofreader base regulations.",
        anomaly_signal_density: 0.35,
      },
      L4_author: {
        text_zh: "守则原始来源：1986-XX-XX 校对者岗位独立设置后续 protocol；前身为录入员行为档案处兼任审核流程。",
        text_en: "Rule origin: 1986-XX-XX post-protocol following the establishment of the proofreader position; previously administered jointly by the recorder behavior archive.",
        anomaly_signal_density: 0.55,
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // §087 · Ch.3 proofreader → reviser
  // ════════════════════════════════════════════════════════
  {
    id: 'rule_087',
    voice: 'V5_pair',
    section_ref: '§087',
    references_position: 'reviser',
    valid_from_chapter: 3,
    transition_marker: 'silent_affirmation',

    denial: {
      L1_recorder: {
        text_zh: "守则 087：本工位不存在'修改者'职级。任何'reclassify'或'修订'行为须通过录入员行为档案处归档，不得自行执行。",
        text_en: "Rule 087: This workstation has no 'reviser' position. Any 'reclassify' or 'revision' action must be archived through the recorder behavior office; self-execution is prohibited.",
        anomaly_signal_density: 0,
      },
      L2_proofreader: {
        text_zh: "守则 087 注：'reclassify'流程仅适用于已盖章入库文档；未盖章草稿不在此范围。",
        text_en: "Rule 087 note: The 'reclassify' procedure applies only to stamped, archived documents; unstamped drafts are out of scope.",
        anomaly_signal_density: 0.1,
      },
      L3_reviser: null,
      L4_author: null,
    },

    affirmation: {
      L1_recorder: {
        text_zh: "守则 087：修改者经手词条出现非标准结尾时，归入特殊勤务流程。",
        text_en: "Rule 087: When a reviser's handled entries exhibit non-standard endings, they enter the special assignment procedure.",
        anomaly_signal_density: 0,
      },
      L2_proofreader: {
        text_zh: "守则 087 注：本流程仅用于 reclassify，不得用于自行修订。",
        text_en: "Rule 087 note: This procedure is used solely for reclassify; self-revision is prohibited.",
        anomaly_signal_density: 0.1,
      },
      L3_reviser: {
        text_zh: "守则 087 备忘：Subject [工号] 于 Cycle Y 经手任务时'非标准结尾'判定标准多次更替；建议补入校对者作业指引第 §044。",
        text_en: "Rule 087 memo: Subject [ID]'s 'non-standard ending' determination criteria changed multiple times during Cycle Y handling; suggested incorporation into proofreader operating guideline §044.",
        anomaly_signal_density: 0.4,
      },
      L4_author: {
        text_zh: "守则原始来源：1986-XX-XX 17:06 受理窗口扩建后续 protocol。",
        text_en: "Rule origin: post-protocol following the 17:06 acceptance-window expansion of 1986-XX-XX.",
        anomaly_signal_density: 0.6,
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // §122 · Ch.4 reviser → author
  // ════════════════════════════════════════════════════════
  {
    id: 'rule_122',
    voice: 'V5_pair',
    section_ref: '§122',
    references_position: 'author',
    valid_from_chapter: 4,
    transition_marker: 'silent_affirmation',

    denial: {
      L1_recorder: {
        text_zh: "守则 122：编制内无'作者'职位。任何'创作'或'撰写'行为均属未受理文本范畴，须立即停止并上报本工位行为档案处。",
        text_en: "Rule 122: No 'author' position exists in the establishment. Any 'creation' or 'composition' activity falls under unfiled-text category; cease immediately and report to the workstation behavior archive.",
        anomaly_signal_density: 0,
      },
      L2_proofreader: {
        text_zh: "守则 122 注：'未受理文本'判定参照分类编号；编号 UTF-7-441-B 及以上为高危，立即停止并归档。",
        text_en: "Rule 122 note: 'Unfiled text' determination follows classification codes; codes UTF-7-441-B and above are high-risk—cease immediately and archive.",
        anomaly_signal_density: 0.15,
      },
      L3_reviser: null,
      L4_author: null,
    },

    affirmation: {
      L1_recorder: {
        text_zh: "守则 122：作者工位 typing buffer 显示候选词条；选择哪一项进入下批生效。",
        text_en: "Rule 122: An author workstation's typing buffer displays candidate entries; the selection determines which enters effect in the next batch.",
        anomaly_signal_density: 0,
      },
      L2_proofreader: {
        text_zh: "守则 122 注：本工位无创作流程；候选项已 pre-populate。复核中。",
        text_en: "Rule 122 note: This workstation has no creation process; candidates are pre-populated. Under review.",
        anomaly_signal_density: 0.15,
      },
      L3_reviser: {
        text_zh: "守则 122 备忘：Subject [工号] 候选词条选择频次超阈值时，转入 Project Nim 协议关联 review。建议补入作者作业指引第 §087。",
        text_en: "Rule 122 memo: When Subject [ID]'s candidate-entry selection frequency exceeds threshold, transferred to Project Nim protocol-linked review. Suggested incorporation into author operating guideline §087.",
        anomaly_signal_density: 0.4,
      },
      L4_author: {
        text_zh: "守则原始来源：Project Nim 1986-1987 ASL 训练协议续档；候选词条 pre-populate 机制源于 Subject Nim 行为模式。",
        text_en: "Rule origin: Project Nim 1986-1987 ASL training protocol continuation; the candidate-entry pre-populate mechanism derives from Subject Nim's behavioral patterns.",
        anomaly_signal_density: 0.7,
      },
    },
  },

  // ════════════════════════════════════════════════════════
  // §144 · Ch.5 author → assimilated · V5 完全退场（affirmation = null）
  // ════════════════════════════════════════════════════════
  {
    id: 'rule_144',
    voice: 'V5_pair',
    section_ref: '§144',
    references_position: 'assimilated',
    valid_from_chapter: 5,
    transition_marker: 'silent_disappearance',

    denial: {
      L1_recorder: {
        text_zh: "守则 144：编制内不存在'文本一部分'。任何自称已成为文本一部分的同事文档应封存，不得复述。",
        text_en: "Rule 144: 'Part-of-text' does not exist in the establishment. Any peer document claiming to have become part-of-text shall be sealed; do not retell.",
        anomaly_signal_density: 0,
      },
      L2_proofreader: {
        text_zh: "守则 144 注：'封存'流程参照档案部封缄要求；封存后档案不进入下周目语料。",
        text_en: "Rule 144 note: The 'sealing' procedure follows the Archive Department's sealing requirements; sealed archives do not enter next-cycle source material.",
        anomaly_signal_density: 0.1,
      },
      L3_reviser: null,
      L4_author: null,
    },

    // V5 完全退场——玩家进入 Ch.5 后 §144 静默消失
    // §6.7 voice 退场曲线最终态 + D32 双 voice 同事件最高兑现
    affirmation: null,
  },
]

// Quick lookup helpers
export const PAIR_BY_SECTION = Object.fromEntries(
  POSITION_DENIAL_AFFIRMATION_PAIRS.map(p => [p.section_ref, p])
)

export const PAIR_BY_POSITION = Object.fromEntries(
  POSITION_DENIAL_AFFIRMATION_PAIRS.map(p => [p.references_position, p])
)

// Runtime resolver: given (chapter_state, section_ref) → return the
// appropriate state's layered entry. Used by ClassPicker.ts / handbook UI.
export function resolveLayeredForSection(sectionRef, chapterState) {
  // chapterState = { current_chapter: 1-5+ } or { unlocked_positions: [...] }
  const pair = PAIR_BY_SECTION[sectionRef]
  if (!pair) return null
  // affirmation 当 current_chapter >= valid_from_chapter
  // §144 (assimilated) affirmation = null → silently absent post Ch.5
  const useAffirmation = chapterState.current_chapter >= pair.valid_from_chapter
  if (useAffirmation && pair.affirmation === null) return null  // V5 退场
  return useAffirmation ? pair.affirmation : pair.denial
}
