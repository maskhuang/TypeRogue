/**
 * handbooks-skeleton.mjs (v3.1)
 *
 * 4 套守则骨架 + V-1 / PEP 完整文本（手写）+ V-2 / V-3 first-pass（待 AI 流水线 polish）
 *
 * 来源：docs/narrative-design.md § Step 4.7 三轨映射
 * 决议：Q4 = 温和（每升一 tier 2-3 V-X 失效）；Q5 = 三层（skeleton → output → runtime）
 *
 * Schema：
 *   versions          — 4 个版本元数据 + 规则 ID 列表 + silent_expirations
 *   rules             — 所有规则 by ID（V1-R01 / V2-R01 / V3-R01 ...）
 *   forms             — 引用的表单注册表（RM-228 等）
 *   pep               — PEP 特殊建模（反规则文本 + 行为参考记录附录）
 *
 * Rule ID 规约：V<version>-R<order>，例如 V1-R03 = V-1 第 3 条
 */

export const HANDBOOKS_SKELETON = {
  // ─── Version Metadata ────────────────────────────────────────

  versions: {
    'V-1': {
      title_zh: '雇员基础合规手册 V-1',
      title_en: 'Employee Standard Compliance Handbook V-1',
      tier: 0,
      protocol: 'SCP', // Standard Containment Protocol
      shown_when: 'on_employment', // Tutorial onboarding
      preamble_zh: '',
      preamble_en: '',
      rules: ['V1-R01', 'V1-R02', 'V1-R03', 'V1-R04', 'V1-R05', 'V1-R06', 'V1-R07', 'V1-R08', 'V1-R09', 'V1-R10'],
      silent_expirations: [], // V-1 是基底，无失效
      production_status: 'production', // V-1 手写完整，v1.0 必带
    },
    'V-2': {
      title_zh: 'V-1 · 补充须知 · 残稿处理协议适用 / 限 FRP-7 持有人',
      title_en: 'V-1 · Supplementary Notice · Applicable Under Fragment Recovery Protocol / FRP-7 Holders Only',
      tier: 1,
      protocol: 'FRP', // Fragment Recovery Protocol
      shown_when: 'frp_unlock', // 通关 cycle 1 一次后
      preamble_zh: '[V-1 全部继续生效，下列条款除外]',
      preamble_en: '[V-1 remains in force; the following articles excepted]',
      rules: ['V2-R01', 'V2-R02', 'V2-R03', 'V2-R04', 'V2-R05', 'V2-R06'],
      // Q4 温和：V-2 阶段 V-1 共 3 条受影响 = 1 explicit modify (V2-R01 → V1-R05) + 2 silent
      silent_expirations: ['V1-R06', 'V1-R07'],
      production_status: 'draft', // first-pass; 待 AI 流水线 polish v1.0/v1.1
    },
    'V-3': {
      title_zh: 'V-2 · 修订 · 异常接收协议适用 / 限 ARP-12 持有人',
      title_en: 'V-2 · Revised · Applicable Under Anomaly Reception Protocol / ARP-12 Holders Only',
      tier: 2,
      protocol: 'ARP', // Anomaly Reception Protocol
      shown_when: 'arp_unlock', // 见过所有技能后
      preamble_zh: '[V-1、V-2 部分继续生效，下列条款全部新增 / 修订]',
      preamble_en: '[V-1, V-2 partially in force; the following articles are new or revised]',
      rules: ['V3-R01', 'V3-R02', 'V3-R03', 'V3-R04', 'V3-R05', 'V3-R06'],
      // Q4 温和：V-3 阶段 V-2 共 3 条受影响 = 1 explicit modify (V3-R01 → V2-R04) + 2 silent
      silent_expirations: ['V2-R02', 'V2-R03'],
      production_status: 'draft',
    },
  },

  // ─── Rules ────────────────────────────────────────────────────

  rules: {
    // ─── V-1 (Tier 0 · SCP · 雇员基础合规) ────

    'V1-R01': {
      version: 'V-1',
      order: 1,
      text_zh: '工号牌不离身。',
      text_en: 'Identification badge must remain on person at all times.',
      forms_referenced: [],
    },
    'V1-R02': {
      version: 'V-1',
      order: 2,
      text_zh: '每日完成《灵长行为内训》打卡。',
      text_en: 'Daily attendance of *Primate Behavioral Training* is required and must be logged.',
      forms_referenced: [],
    },
    'V1-R03': {
      version: 'V-1',
      order: 3,
      text_zh: '严禁主动回忆入职前事项。',
      text_en: 'Voluntary recall of pre-employment events is strictly prohibited.',
      forms_referenced: [],
    },
    'V1-R04': {
      version: 'V-1',
      order: 4,
      text_zh: '调岗通知收到后请按指示前往 HR。',
      text_en: 'Upon receipt of reassignment notice, employees shall report to HR per stated instructions.',
      forms_referenced: [],
    },
    'V1-R05': {
      version: 'V-1',
      order: 5,
      text_zh: '严禁尝试以人类心智处理 B 级以上词料。已发生若干起认知断流事件。',
      text_en: 'Processing of Class B or higher word material using human cognition is strictly prohibited. Multiple cognitive interruption incidents have been logged.',
      forms_referenced: [],
    },
    'V1-R06': {
      version: 'V-1',
      order: 6,
      text_zh: '午饭时段勿越层。',
      text_en: 'Inter-floor movement during lunch period is not permitted.',
      forms_referenced: [],
    },
    'V1-R07': {
      version: 'V-1',
      order: 7,
      text_zh: '工位摆放须符合工位规划组 §7.3。',
      text_en: 'Workstation arrangement must conform to Workstation Planning Section §7.3.',
      forms_referenced: [],
    },
    'V1-R08': {
      version: 'V-1',
      order: 8,
      text_zh: '蕉券须在月内核销。逾期归档。',
      text_en: 'Banana coupons must be reconciled within the calendar month. Unredeemed coupons will be archived.',
      forms_referenced: [],
    },
    'V1-R09': {
      version: 'V-1',
      order: 9,
      text_zh: '本手册自入职日起持续有效。',
      text_en: 'This handbook remains in continuous effect from the date of employment.',
      forms_referenced: [],
    },
    'V1-R10': {
      version: 'V-1',
      order: 10,
      text_zh: '本手册可能被后续版本部分覆盖。请始终按当前版本执行。',
      text_en: 'This handbook may be partially superseded by subsequent versions. Always comply with the version currently in effect.',
      forms_referenced: [],
    },

    // ─── V-2 (Tier 1 · FRP · 残稿处理补充须知) ────

    'V2-R01': {
      version: 'V-2',
      order: 1,
      text_zh: '残稿处理过程中，可短暂以人类心智识别碎片。完成后请进行 3 次抓挠脑后以重置识别状态。',
      text_en: 'Brief use of human cognition for fragment identification is permitted during residue processing. Upon completion, perform three (3) reset gestures (scratching the back of head) to clear identification state.',
      overrides: [
        { rule_id: 'V1-R05', mode: 'modify', silent: false },
      ],
      forms_referenced: [],
    },
    'V2-R02': {
      version: 'V-2',
      order: 2,
      text_zh: '处理碎片词料时，如发现"碎片在重组"，请保持注视 3 秒后转移视线。',
      text_en: 'If fragments are observed to recombine during processing, maintain visual contact for three (3) seconds, then redirect gaze.',
      forms_referenced: [],
    },
    'V2-R03': {
      version: 'V-2',
      order: 3,
      text_zh: '碎片如有刻字、不要尝试拼读。',
      text_en: 'Do not attempt to vocalize or assemble inscriptions found on fragments.',
      forms_referenced: [],
    },
    'V2-R04': {
      version: 'V-2',
      order: 4,
      text_zh: '午餐前不要看自己的工位倒影。',
      text_en: 'Do not view the reflection of your workstation prior to the lunch period.',
      forms_referenced: [],
    },
    'V2-R05': {
      version: 'V-2',
      order: 5,
      text_zh: '如发现自己记起入职前事项，请立刻执行 V-1 第 3 条。',
      text_en: 'If recall of pre-employment events occurs, immediately execute V-1 Article 3.',
      references: ['V1-R03'], // 引用但不 override
      forms_referenced: [],
    },
    'V2-R06': {
      version: 'V-2',
      order: 6,
      text_zh: '本须知不可与其他 FRP-7 持有人讨论。',
      text_en: 'This supplement may not be discussed with other FRP-7 holders.',
      forms_referenced: [],
    },

    // ─── V-3 (Tier 2 · ARP · 异常处理修订) ────

    'V3-R01': {
      version: 'V-3',
      order: 1,
      text_zh: '工位倒影现允许查看。建议每日 1 次以维持基础识别。',
      text_en: 'Viewing of workstation reflection is now permitted. One (1) viewing per day is recommended to maintain baseline identification.',
      overrides: [
        { rule_id: 'V2-R04', mode: 'modify', silent: false },
      ],
      forms_referenced: [],
    },
    'V3-R02': {
      version: 'V-3',
      order: 2,
      text_zh: '异常样本归档时，如样本"对你说话"，按规章流程不要回应。',
      text_en: 'If anomalous samples appear to speak during archival, per procedural protocol, do not respond.',
      forms_referenced: [],
    },
    'V3-R03': {
      version: 'V-3',
      order: 3,
      text_zh: '如发现自己开始回忆未发生的事，请立刻填写表单 RM-228。',
      text_en: 'If recall of events that did not occur is detected, immediately submit Form RM-228.',
      forms_referenced: ['RM-228'],
    },
    'V3-R04': {
      version: 'V-3',
      order: 4,
      text_zh: '表单 RM-228 已永久暂停受理。',
      text_en: 'Form RM-228 is permanently suspended from processing.',
      forms_referenced: ['RM-228'],
    },
    'V3-R05': {
      version: 'V-3',
      order: 5,
      text_zh: '如果你觉得镜子里的不是你，请确认那不是镜子。',
      text_en: 'If the figure in the mirror does not appear to be you, confirm that it is not a mirror.',
      forms_referenced: [],
    },
    'V3-R06': {
      version: 'V-3',
      order: 6,
      text_zh: '本修订与 V-2 存在数处冲突。请按当前持有协议优先。（持有协议查询请填写表单 RM-228。）',
      text_en: 'This revision conflicts with V-2 in several articles. Comply per the protocol currently held. (For protocol inquiry, submit Form RM-228.)',
      forms_referenced: ['RM-228'],
    },
  },

  // ─── Forms Registry ───────────────────────────────────────────

  forms: {
    'RM-228': {
      type: 'form',
      first_introduced_in: 'V-3',
      status_zh: '已永久暂停受理',
      status_en: 'permanently suspended from processing',
      mentioned_in: ['V3-R03', 'V3-R04', 'V3-R06'],
      // 也可能出现在 cognitive priming PPT（内训讲师），不在此 registry 范围
      external_references: ['training_ppt_anchor5'],
    },
  },

  // ─── PEP (Tier 3 · Permanent Embed Protocol · 反规则文本) ────

  pep: {
    title_zh: '永久编制协议 · PEP',
    title_en: 'Permanent Embed Protocol · PEP',
    tier: 3,
    protocol: 'PEP',
    shown_when: 'endless_unlock', // 三职业全通关后
    body_zh: '[本协议无规则。]\n[本协议持有者已无需规则。]\n[本协议持有者已成为规则的对象。]',
    body_en: '[This protocol contains no rules.]\n[Holders of this protocol no longer require rules.]\n[Holders of this protocol have become the subject of rules.]',
    appendix_title_zh: '附录 · 行为参考记录（节选）',
    appendix_title_en: 'Appendix · Behavioral Reference Records (Excerpt)',
    appendix_entries: [
      {
        text_zh: '样本 #485,902 持续显现协议姿态。无需调整。',
        text_en: 'Subject #485,902 continues to exhibit protocol-conformant posture. No adjustment required.',
      },
      {
        text_zh: '样本 #485,902 对蕉券正向强化反应稳定。',
        text_en: 'Subject #485,902 demonstrates stable response to banana-coupon positive reinforcement.',
      },
      {
        text_zh: '样本 #485,902 已停止主动询问。归档。',
        text_en: 'Subject #485,902 has ceased voluntary inquiry. Archived.',
      },
    ],
    production_status: 'production', // PEP 手写完整，v1.0 必带
  },

  // ─── Metadata ─────────────────────────────────────────────────

  meta: {
    schema_version: 'v3.1',
    q4_decision: 'moderate', // 矛盾密度温和：每升一 tier 2-3 V-X 失效
    q5_decision: 'three_layer', // skeleton (this file) → AI output → runtime
    g_decision: 'hand_v1_pep_ai_v2_v3', // V-1 + PEP 手写；V-2/V-3 first-pass 由我提供，待 AI polish
    h_decision: 'hr_email_plus_desktop_note', // 守则更新呈现机制
    i_decision: 'v1_must_v1_pep_others_best_effort', // v1.0 必带 V-1 + PEP；V-2/V-3 v1.0 努力做
    notes: [
      '所有 Rule ID 使用 V<version>-R<order> 规约',
      'silent_expirations = 玩家不会被告知失效的规则；overrides[].silent = false 才会在新规中明示',
      'Q4 温和验证：V-2 阶段影响 V-1 共 3 条 (1 modify + 2 silent) | V-3 阶段影响 V-2 共 3 条 (1 modify + 2 silent)',
      'forms_referenced 用于跨规则一致性审计（RM-228 在 V-3 出现 3 次符合 SOP genre 重复感）',
    ],
  },
}
