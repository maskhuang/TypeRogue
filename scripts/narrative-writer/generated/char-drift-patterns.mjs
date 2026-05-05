// 字符级缓变 Patterns (Phase C / spec §4.4)
//
// Cycle 6+ Endless 启用单字符级缓变作为污染症候（与 memory
// `feedback_ui_label_vocabulary.md` 一致：DAY/BATCH/CYCLE/A 词典 + 字符级缓变）。
//
// V3 voice · anomaly dictation · 文档边缘 micro-changes
//
// 关键 invariants（§6.3.3 V3 craft + memory `feedback_no_ambient_background_motion.md`）：
//   - **不出现为对玩家说**——anomaly 没有 voice 概念
//   - 节奏不规则——anomaly 不遵循人类语法
//   - settle_on_mouse_leave: true → 玩家把鼠标移开再看，变化已 settle
//   - duration_ms: 单 stage 显示时长（一般 150-300ms）
//   - trigger: 触发条件（cycle / hover / cycle end / time-based）
//
// 10 sample patterns 由本文件提供；Phase E pipeline LLM 扩展到 ~50。

export const CHAR_DRIFT_PATTERNS = [
  // ════════════════════════════════════════════════════════
  // 1 · 工号 drift — 反身闭合 hint（hover 触发）
  // ════════════════════════════════════════════════════════
  {
    id: 'drift_001_worker_id',
    voice: 'V3',
    trigger: {
      cycle_gte: 6,
      event: 'hover',
      target_selector: '.worker-id-display',
    },
    stages: [
      "员工编号 0048",
      "员工编号 0049",
      "员工编号 0048",
      "员工编号 0050",
      "员工编号 0048",
    ],
    duration_ms: 200,
    settle_on_mouse_leave: true,
    description: '工号 hover 时数字漂移；mouse leave 后 settle 回原值。反身闭合 attribution 暗示。',
  },

  // ════════════════════════════════════════════════════════
  // 2 · 勤务结束语 drift — cycle 末尾偶发
  // ════════════════════════════════════════════════════════
  {
    id: 'drift_002_shift_end',
    voice: 'V3',
    trigger: {
      cycle_gte: 6,
      event: 'cycle_end',
      probability: 0.4,
    },
    stages: [
      "本日勤务结束",
      "本日勤务转入",
      "本日勤务结束",
      "本日勤务永续",
    ],
    duration_ms: 300,
    settle_on_mouse_leave: false,
    description: 'Cycle 末尾结束语偶发漂移到"永续"——D32 双 voice 同事件 hint。',
  },

  // ════════════════════════════════════════════════════════
  // 3 · 时间戳 drift — 计时钟 17:06 锚点
  // ════════════════════════════════════════════════════════
  {
    id: 'drift_003_timestamp_1706',
    voice: 'V3',
    trigger: {
      cycle_gte: 6,
      event: 'hover',
      target_selector: '.timestamp-display',
    },
    stages: [
      "17:06",
      "17:13",
      "17:06",
      "17:06",
      "──:──",
    ],
    duration_ms: 250,
    settle_on_mouse_leave: true,
    description: 'D27 受理窗口 / Project Nim L4 17:06 死亡时刻锚点。',
  },

  // ════════════════════════════════════════════════════════
  // 4 · 工位状态 drift — 在岗 / 已交接
  // ════════════════════════════════════════════════════════
  {
    id: 'drift_004_workstation_status',
    voice: 'V3',
    trigger: {
      cycle_gte: 6,
      event: 'hover',
      target_selector: '.workstation-status',
    },
    stages: [
      "本工位状态: 在岗",
      "本工位状态: 在岗",
      "本工位状态: 已交接",
      "本工位状态: 在岗",
    ],
    duration_ms: 220,
    settle_on_mouse_leave: true,
    description: 'C2 peer ghost 退场叠加——你已经被"交接"了？',
  },

  // ════════════════════════════════════════════════════════
  // 5 · 守则编号 drift — §044 / §045
  // ════════════════════════════════════════════════════════
  {
    id: 'drift_005_rule_section',
    voice: 'V3',
    trigger: {
      cycle_gte: 6,
      event: 'hover',
      target_selector: '.handbook-section-ref',
    },
    stages: [
      "第 044 条",
      "第 044 条",
      "第 045 条",
      "第 044 条",
    ],
    duration_ms: 180,
    settle_on_mouse_leave: true,
    description: '守则 § 号 hover 时漂移；D31 6 layers 物理化暗示——你看到的不是固定文本。',
  },

  // ════════════════════════════════════════════════════════
  // 6 · 配额 drift — KPI 数字
  // ════════════════════════════════════════════════════════
  {
    id: 'drift_006_quota_count',
    voice: 'V3',
    trigger: {
      cycle_gte: 6,
      event: 'cycle_start',
      probability: 0.25,
    },
    stages: [
      "本日配额 = 142",
      "143",
      "142",
      "142",
    ],
    duration_ms: 280,
    settle_on_mouse_leave: false,
    description: 'KPI 配额数字微漂；玩家无法判断真实值，"我刚才是不是看错了"',
  },

  // ════════════════════════════════════════════════════════
  // 7 · 签收人工号 drift — 反身闭合 V6 attribution leak
  // ════════════════════════════════════════════════════════
  {
    id: 'drift_007_signature_field',
    voice: 'V3',
    trigger: {
      cycle_gte: 6,
      event: 'hover',
      target_selector: '.signature-field',
    },
    stages: [
      "签收人: Subject XX-1138",
      "签收人: Subject XX-1138",
      "签收人: Subject XX-####",
      "签收人: Subject XX-1138",
    ],
    duration_ms: 240,
    settle_on_mouse_leave: true,
    description: '签收人工号偶尔变成 ████ redaction——D8 反身闭合 + V6 boss tooltip 系统的 hint。',
  },

  // ════════════════════════════════════════════════════════
  // 8 · 色带窗位置 drift — P1 prop 退场暗示
  // ════════════════════════════════════════════════════════
  {
    id: 'drift_008_ribbon_position',
    voice: 'V3',
    trigger: {
      cycle_gte: 6,
      event: 'hover',
      target_selector: '.ribbon-window-pos',
    },
    stages: [
      "色带窗位置 A-3",
      "A-3",
      "A-3",
      "A-4",
      "A-3",
    ],
    duration_ms: 200,
    settle_on_mouse_leave: true,
    description: '与 redaction-versioning §008 v3 silent_replacement 联动——色带窗 cycle 6 已封存。',
  },

  // ════════════════════════════════════════════════════════
  // 9 · 计时钟秒针状态 drift — D27 受理窗口锚点
  // ════════════════════════════════════════════════════════
  {
    id: 'drift_009_clock_second_hand',
    voice: 'V3',
    trigger: {
      cycle_gte: 6,
      event: 'hover',
      target_selector: '.clock-display',
    },
    stages: [
      "计时钟有秒针",
      "计时钟有秒针",
      "计时钟无秒针",
      "计时钟有秒针",
    ],
    duration_ms: 260,
    settle_on_mouse_leave: true,
    description: 'D27 受理窗口物理化——秒针无 = 受理窗口可能开启 = 异常即将发生。与 redaction-versioning §014 v2 联动。',
  },

  // ════════════════════════════════════════════════════════
  // 10 · 抽屉编号 drift — C2 peer ghost #485,901 hint
  // ════════════════════════════════════════════════════════
  {
    id: 'drift_010_drawer_label',
    voice: 'V3',
    trigger: {
      cycle_gte: 6,
      event: 'hover',
      target_selector: '.desk-drawer-label',
    },
    stages: [
      "抽屉 #485,902",
      "#485,902",
      "#485,901",
      "#485,902",
    ],
    duration_ms: 220,
    settle_on_mouse_leave: true,
    description: 'C2 peer ghost (#485,901 同事) hint——你的工位抽屉偶尔显示别人的工号。',
  },
]

// Quick lookup helpers
export const PATTERN_BY_ID = Object.fromEntries(
  CHAR_DRIFT_PATTERNS.map(p => [p.id, p])
)

// Filter patterns by trigger event type — runtime CharDriftEffect 用
export function getPatternsForEvent(event, cycle) {
  return CHAR_DRIFT_PATTERNS.filter(p =>
    p.trigger.event === event &&
    cycle >= (p.trigger.cycle_gte || 1)
  )
}

// Filter patterns matching a DOM target selector — hover handler 用
export function getPatternsForTarget(selector, cycle) {
  return CHAR_DRIFT_PATTERNS.filter(p =>
    p.trigger.event === 'hover' &&
    p.trigger.target_selector === selector &&
    cycle >= (p.trigger.cycle_gte || 1)
  )
}
