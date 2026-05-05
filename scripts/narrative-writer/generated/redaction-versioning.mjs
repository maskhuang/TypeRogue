// 静默修订 Versioning System (Phase C / spec §4.3)
//
// V5 守则的"silently 修订"机制——同一 entry 多版本，runtime 选择。
// Cycle 推进时守则 silently 增加 / 修改 / 删除——玩家事后回想才发觉。
//
// 关键 invariants：
//   - 任何 version 都不带"自 [日期] 起生效"等 metadata（§6.8.1 禁止）
//   - redaction_marker 是 pipeline 内部字段，不输出到玩家
//   - Runtime 选 valid_from_cycle ≤ current_cycle ≤ valid_to_cycle 的 entry
//   - 玩家事后**回想**才发觉差异——pipeline 不能让玩家**当下**意识到
//
// redaction_marker 类型：
//   silent_amendment  - L1 文本被 silently 修改（细节增加 / 限定条件）
//   silent_addition   - 整段新增（未来 version 比早期 version 多了句）
//   silent_truncation - 文本 silently 被截断（未来 version 比早期短）
//   silent_replacement - 整段被替换为不同语义的句
//   silent_deletion   - 整条 entry 消失（未来 version L1 = "（已删除）"）
//
// 5 sample 守则 (014/003/008/022/027) 由本文件提供；Phase E pipeline 扩展。

export const REDACTION_VERSIONED_RULES = [
  // ════════════════════════════════════════════════════════
  // 守则 §014 · 计时钟确认（v3 silent_deletion · 计时钟在 cycle 6+ 退场）
  // ════════════════════════════════════════════════════════
  {
    id: 'rule_014',
    section_ref: '§014',
    voice: 'V5',
    versions: [
      {
        version: 1,
        valid_from_cycle: 1,
        valid_to_cycle: 3,
        L1_recorder: {
          text_zh: "守则 014：每 30 字确认一次计时钟。",
          text_en: "Rule 014: Verify the timer every 30 characters.",
          anomaly_signal_density: 0,
        },
        redaction_marker: null,
      },
      {
        version: 2,
        valid_from_cycle: 4,
        valid_to_cycle: 5,
        L1_recorder: {
          text_zh: "守则 014：每 30 字确认一次计时钟（仅当计时钟有秒针时）。",
          text_en: "Rule 014: Verify the timer every 30 characters (only when the timer has a second hand).",
          anomaly_signal_density: 0.1,
        },
        redaction_marker: 'silent_amendment',
        // 加了一个限定条件，暗示秒针时有时无（D27 受理窗口锚点）
      },
      {
        version: 3,
        valid_from_cycle: 6,
        valid_to_cycle: null,
        L1_recorder: {
          text_zh: "守则 014：（已删除）",
          text_en: "Rule 014: (deleted)",
          anomaly_signal_density: 0,
        },
        redaction_marker: 'silent_deletion',
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // 守则 §003 · 视线规则（silent_addition · cycle 4+ 加入"漂移上报"条款）
  // ════════════════════════════════════════════════════════
  {
    id: 'rule_003',
    section_ref: '§003',
    voice: 'V5',
    versions: [
      {
        version: 1,
        valid_from_cycle: 1,
        valid_to_cycle: 3,
        L1_recorder: {
          text_zh: "守则 003：视线停留在当前高亮字符。",
          text_en: "Rule 003: Keep gaze on the currently highlighted character.",
          anomaly_signal_density: 0,
        },
        redaction_marker: null,
      },
      {
        version: 2,
        valid_from_cycle: 4,
        valid_to_cycle: null,
        L1_recorder: {
          text_zh: "守则 003：视线停留在当前高亮字符。任何视线漂移须报本工位行为档案处。",
          text_en: "Rule 003: Keep gaze on the currently highlighted character. Any gaze drift shall be reported to the workstation behavior archive.",
          anomaly_signal_density: 0.05,
        },
        redaction_marker: 'silent_addition',
        // 暗示有人开始"漂移"——D29 routine 退化的物理化
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // 守则 §008 · 纸张方向（silent_replacement · 色带窗 cycle 6 封存）
  // ════════════════════════════════════════════════════════
  {
    id: 'rule_008',
    section_ref: '§008',
    voice: 'V5',
    versions: [
      {
        version: 1,
        valid_from_cycle: 1,
        valid_to_cycle: 2,
        L1_recorder: {
          text_zh: "守则 008：纸张方向异常时，视线移至色带窗。",
          text_en: "Rule 008: When paper orientation is abnormal, shift gaze to the ribbon window.",
          anomaly_signal_density: 0,
        },
        redaction_marker: null,
      },
      {
        version: 2,
        valid_from_cycle: 3,
        valid_to_cycle: 5,
        L1_recorder: {
          text_zh: "守则 008：纸张方向异常时，视线移至色带窗。色带窗读取记录已并入 Cycle Y 行为档案。",
          text_en: "Rule 008: When paper orientation is abnormal, shift gaze to the ribbon window. Ribbon-window reading records have been merged into Cycle Y behavior archives.",
          anomaly_signal_density: 0.15,
        },
        redaction_marker: 'silent_addition',
      },
      {
        version: 3,
        valid_from_cycle: 6,
        valid_to_cycle: null,
        L1_recorder: {
          text_zh: "守则 008：色带窗已封存。",
          text_en: "Rule 008: The ribbon window is sealed.",
          anomaly_signal_density: 0.3,
        },
        redaction_marker: 'silent_replacement',
        // P1 prop（色带窗）退场——§7.3.1 工位 progression 物理化
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // 守则 §022 · 任务结束（silent_addition + silent_truncation · "本工位无收件人"渐显）
  // ════════════════════════════════════════════════════════
  {
    id: 'rule_022',
    section_ref: '§022',
    voice: 'V5',
    versions: [
      {
        version: 1,
        valid_from_cycle: 1,
        valid_to_cycle: 1,
        L1_recorder: {
          text_zh: "守则 022：任务结束后说：'本轮录入结束。'",
          text_en: "Rule 022: At task end, say: 'This round of recording is concluded.'",
          anomaly_signal_density: 0,
        },
        redaction_marker: null,
      },
      {
        version: 2,
        valid_from_cycle: 2,
        valid_to_cycle: 4,
        L1_recorder: {
          text_zh: "守则 022：任务结束后说：'本轮录入结束。'本工位无收件人。",
          text_en: "Rule 022: At task end, say: 'This round of recording is concluded.' This workstation has no recipient.",
          anomaly_signal_density: 0.15,
        },
        redaction_marker: 'silent_addition',
        // B2 留白！"本工位无收件人"——你说话给谁听？
      },
      {
        version: 3,
        valid_from_cycle: 5,
        valid_to_cycle: null,
        L1_recorder: {
          text_zh: "守则 022：本工位无收件人。",
          text_en: "Rule 022: This workstation has no recipient.",
          anomaly_signal_density: 0.3,
        },
        redaction_marker: 'silent_truncation',
        // 仪式被截断——"说"动作消失，只剩留白
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // 守则 §027 · 工号回应（silent_addition · cycle 3+ 加入"复述前任工号"禁令；cycle 6 删除）
  // ════════════════════════════════════════════════════════
  {
    id: 'rule_027',
    section_ref: '§027',
    voice: 'V5',
    versions: [
      {
        version: 1,
        valid_from_cycle: 1,
        valid_to_cycle: 2,
        L1_recorder: {
          text_zh: "守则 027：使用工号回应。",
          text_en: "Rule 027: Respond using your assigned ID.",
          anomaly_signal_density: 0,
        },
        redaction_marker: null,
      },
      {
        version: 2,
        valid_from_cycle: 3,
        valid_to_cycle: 5,
        L1_recorder: {
          text_zh: "守则 027：使用工号回应。复述前任作者工号视为越权。",
          text_en: "Rule 027: Respond using your assigned ID. Reciting a previous author's ID is treated as overreach.",
          anomaly_signal_density: 0.15,
        },
        redaction_marker: 'silent_addition',
        // 反身闭合 attribution 系统的 pre-warn——D8 + V6 锚点
      },
      {
        version: 3,
        valid_from_cycle: 6,
        valid_to_cycle: null,
        L1_recorder: {
          text_zh: "守则 027：（已删除）",
          text_en: "Rule 027: (deleted)",
          anomaly_signal_density: 0,
        },
        redaction_marker: 'silent_deletion',
        // Cycle 6+ 玩家自己已成为"前任作者"——禁令无意义，所以消失
      },
    ],
  },
]

// Quick lookup helpers
export const RULE_BY_ID = Object.fromEntries(
  REDACTION_VERSIONED_RULES.map(r => [r.id, r])
)

// Runtime resolver: given (rule_id, current_cycle) → return the active version's L1
// Used by handbook UI / 工作台守则 sticker rendering.
export function resolveActiveVersion(ruleId, currentCycle) {
  const rule = RULE_BY_ID[ruleId]
  if (!rule) return null
  const active = rule.versions.find(v =>
    currentCycle >= v.valid_from_cycle &&
    (v.valid_to_cycle === null || currentCycle <= v.valid_to_cycle)
  )
  return active || null
}

// Diagnostic helper: return all redaction transitions a player experienced between
// two cycles. For testing / debug only — **never** surface to player UI.
export function diagnoseRedactionsBetween(fromCycle, toCycle) {
  return REDACTION_VERSIONED_RULES.flatMap(rule =>
    rule.versions
      .filter(v => v.valid_from_cycle > fromCycle && v.valid_from_cycle <= toCycle && v.redaction_marker)
      .map(v => ({
        rule_id: rule.id,
        section_ref: rule.section_ref,
        from_cycle: v.valid_from_cycle,
        marker: v.redaction_marker,
        new_text_zh: v.L1_recorder.text_zh,
      }))
  )
}
