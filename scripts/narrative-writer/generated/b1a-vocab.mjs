// Auto-derived from docs/narrative-design.md v4.1 + audit Tier 1A/1B/2A/2B (LOCKED 2026-05-04)
// Re-derive when audit / narrative-design 版本号变化。
//
// v4.1 关键 delta（vs v3.1）:
//   - "能力获取" allowed 类目**整体删除**（D26 v2 + D30：公司不分发新机制；anomaly 通过 peer-to-peer + 直接引导传播，不通过授权 / 许可）
//   - "物品获取" allowed 重写为"已签出 / 经手"voice（audit Tier 2B replacement）
//   - 新增 forbidden："授权系（system_message context）" / "Power fantasy 句式" / "Fanfare emoji"
//   - 继承 v3.1 forbidden：钻研系 / 突破系 / 创造系 / 灵性系 / 解放系（基底语调约束仍有效）

// B1.a 词汇表 — v4.1：力量被分发？错——力量根本不被分发（D26 v2）
//                     能力是 anomaly 通过 peer-to-peer + 直接引导**传染**给你的；公司只观察 / reclassify / 调度。
export const B1A_VOCAB = {
  "zh": {
    "allowed": {
      "物品获取（v4.1 已签出/经手 voice · audit Tier 2B replacement）": [
        "已签出",
        "经手",
        "签收",
        "领用",
        "经过工位",
        "归手"
      ],
      // ❌ 能力获取 类目整体删除（D26 v2 + D30 + audit Tier 1A）：
      //    公司**不分发**新机制；任何"授权 / 许可 / 批准 / 解锁 / 配发"在 system message 上下文一票否决。
      //    新机制只能通过 V5 守则 layered footnote 的污染层显化（你**自己**学会修改 / 你**自己**能看到了）。
      "流程": [
        "复审",
        "复核",
        "登记",
        "归档",
        "抄送",
        "报备",
        "reclassify",
        "签发文件",
        "经手记录"
      ],
      "任务": [
        "部署",
        "安排",
        "指派",
        "调遣",
        "轮值",
        "转岗"
      ]
    },
    "forbidden": {
      "授权系（system_message 上下文 · audit Tier 1A · D26 v2 + D30）": {
        "words": [
          "授权",
          "许可",
          "批准",
          "解锁",
          "解锁了",
          "已解锁",
          "配发"
        ],
        "reason": "audit Tier 1A/1B + §9.8.3 + D26 v2 + D30：公司不分发 anomaly / 新机制；这些词在 system message 上下文一票否决。注：in-character 公文盖章（roster.stamp_assigned 等）允许 — context-sensitive。",
        "context": "system_message"
      },
      "Power fantasy 句式（audit Tier 2B）": {
        "words": [
          "获得 X 能力",
          "获得 X！",
          "已掌握",
          "新功能！",
          "恭喜",
          "欢迎来到",
          "祝你好运",
          "打字勇者"
        ],
        "reason": "audit Tier 2B + §8.10.1：0 power fantasy popup / 0 fanfare 句式"
      },
      "Fanfare emoji（system_message / UI label · audit Tier 2A）": {
        "words": [
          "🎉",
          "🎊",
          "🎁",
          "✨",
          "🏆",
          "🎲",
          "🔓"
        ],
        "reason": "audit Tier 2A + §8.10.1：0 fanfare emoji 铁律。注：文档 / 章节叙事 prose 内可用 emoji 描述视觉，但生成 in-game UI 文案时禁。",
        "context": "system_message"
      },
      "钻研系（v3.1 继承）": {
        "words": [
          "钻研",
          "研究（孤用）",
          "探索",
          "研发"
        ],
        "reason": "暗示主动求知"
      },
      "突破系（v3.1 继承）": {
        "words": [
          "突破",
          "领悟",
          "顿悟",
          "觉醒"
        ],
        "reason": "暗示自我超越"
      },
      "创造系（v3.1 继承）": {
        "words": [
          "发明",
          "创造",
          "设计",
          "构思"
        ],
        "reason": "暗示主体性"
      },
      "灵性系（v3.1 继承）": {
        "words": [
          "共鸣",
          "感应",
          "心法",
          "内功",
          "灵感",
          "心得"
        ],
        "reason": "武侠 / 修仙腔"
      },
      "解放系（v3.1 继承）": {
        "words": [
          "激活（自身）",
          "解放（自身）",
          "释放（自身潜力）"
        ],
        "reason": "暗示自由意志"
      },
      "denial-L1 句式（§4.1 deny→affirm pair · denial 阶段）": {
        "words": [
          "目前",
          "暂时",
          "待定",
          "候补"
        ],
        "reason": "denial L1 必须斩钉截铁否认；这些词暗示'以后会有'破坏 horror",
        "context": "denial_L1"
      },
      "affirmation-L1 句式（§4.1 deny→affirm pair · affirmation 阶段）": {
        "words": [
          "新增",
          "new",
          "解锁",
          "自即日起",
          "自本月起",
          "Welcome"
        ],
        "reason": "affirmation L1 必须当作'一直存在'写；这些词破坏 silent flip horror",
        "context": "affirmation_L1"
      }
    },
    "contextSensitive": [
      {
        "word": "学习",
        "safe": "\"学习内训内容\"、\"学习考核要点\"",
        "dangerous": "❌ \"学习新能力\""
      },
      {
        "word": "提升",
        "safe": "\"提升评级\"、\"提升产能\"",
        "dangerous": "❌ \"提升自我\"、\"自我提升\""
      },
      {
        "word": "研究",
        "safe": "\"复审研究小组\"",
        "dangerous": "❌ \"他在研究新技巧\""
      },
      {
        "word": "掌握",
        "safe": "（避免使用）",
        "dangerous": "❌ \"掌握技术\""
      },
      {
        "word": "经手",
        "safe": "v4.1 主词：\"经手词条\"、\"经手记录\"、\"已经手\"",
        "dangerous": "（无 — 这是 v4.1 推荐 voice）"
      }
    ]
  },
  "en": {
    "allowed": {
      "Item acquisition (v4.1 · 'signed out' voice)": [
        "signed out",
        "passed through workstation",
        "received",
        "logged on workstation",
        "checked through"
      ],
      // ❌ Ability acquisition deleted (D26 v2 + D30): no authorize / license / approve in system_message context
      "Process": [
        "reviewed",
        "audited",
        "registered",
        "archived",
        "copied",
        "reported",
        "reclassified",
        "filed"
      ],
      "Tasks": [
        "deployed",
        "scheduled",
        "rostered",
        "dispatched (to a task)",
        "rotated"
      ]
    },
    "forbidden": {
      "Authorization (system_message · audit Tier 1A)": {
        "words": [
          "unlocked",
          "Unlocked",
          "authorize",
          "authorized",
          "permit",
          "permitted",
          "allocated",
          "issued",
          "approved",
          "license"
        ],
        "reason": "audit Tier 1A + D26 v2 + D30: company does not distribute new mechanics. In-character forms (stamps) allowed — context-sensitive.",
        "context": "system_message"
      },
      "Power fantasy (audit Tier 2B)": {
        "words": [
          "You unlocked",
          "You earned",
          "Congratulations",
          "Welcome to",
          "Achievement Unlocked",
          "Mastered"
        ],
        "reason": "audit Tier 2B + §8.10.1: zero power fantasy"
      },
      "Fanfare emoji (system_message · audit Tier 2A)": {
        "words": [
          "🎉",
          "🎊",
          "🎁",
          "✨",
          "🏆",
          "🎲",
          "🔓"
        ],
        "reason": "audit Tier 2A + §8.10.1: zero fanfare",
        "context": "system_message"
      },
      "Research": {
        "words": [
          "research (verb, solo)",
          "study (alone)",
          "explore",
          "investigate",
          "develop (alone)"
        ],
        "reason": "Implies active inquiry"
      },
      "Breakthrough": {
        "words": [
          "breakthrough",
          "awaken",
          "transcend",
          "master (verb)"
        ],
        "reason": "Implies self-overcoming"
      },
      "Creation": {
        "words": [
          "invent",
          "create",
          "design (alone)",
          "forge",
          "conceive"
        ],
        "reason": "Implies subjectivity"
      },
      "Spiritual": {
        "words": [
          "resonate",
          "attune",
          "intuit"
        ],
        "reason": "Wuxia / mystical voice"
      },
      "Liberation": {
        "words": [
          "unleash",
          "unlock (self)",
          "release (self potential)",
          "free oneself"
        ],
        "reason": "Implies free will"
      },
      "denial-L1 phrasing (§4.1 deny→affirm pair · denial state)": {
        "words": [
          "currently",
          "for now",
          "pending",
          "tentative",
          "candidate"
        ],
        "reason": "denial L1 must absolutely deny; these soften it",
        "context": "denial_L1"
      },
      "affirmation-L1 phrasing (§4.1 deny→affirm pair · affirmation state)": {
        "words": [
          "newly added",
          "new",
          "unlocked",
          "as of today",
          "Welcome"
        ],
        "reason": "affirmation L1 must read 'always existed'; these break the silent flip",
        "context": "affirmation_L1"
      }
    },
    "contextSensitive": [
      {
        "word": "learn",
        "safe": "\"learn the training material\"",
        "dangerous": "❌ \"learn a new ability\""
      },
      {
        "word": "improve",
        "safe": "\"improve your rating\"",
        "dangerous": "❌ \"improve yourself\""
      },
      {
        "word": "research",
        "safe": "\"Review Research Department\" (proper noun)",
        "dangerous": "❌ \"research new techniques\""
      },
      {
        "word": "master",
        "safe": "(avoid generally)",
        "dangerous": "❌ \"master the technique\""
      },
      {
        "word": "channel",
        "safe": "\"requisition channels\" / \"delivery channel\"",
        "dangerous": "❌ \"channel internal energy\""
      }
    ]
  }
}

// 扁平禁止词清单（含分类原因 + context），便于 validator 快速 lookup
export const FORBIDDEN_ZH = Object.entries(B1A_VOCAB.zh.forbidden).flatMap(([cat, info]) =>
  info.words.map(w => ({
    word: w.replace(/（.*?）/g, '').trim(),
    category: cat,
    reason: info.reason,
    context: info.context || null,
  }))
)

export const FORBIDDEN_EN = Object.entries(B1A_VOCAB.en.forbidden).flatMap(([cat, info]) =>
  info.words.map(w => ({
    word: w.replace(/\(.*?\)/g, '').trim(),
    category: cat,
    reason: info.reason,
    context: info.context || null,
  }))
)
