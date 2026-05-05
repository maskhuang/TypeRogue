// Auto-derived from docs/narrative-design.md v4.1 §2.5 (LOCKED 2026-05-05)
// Re-derive when narrative-design 版本号变化。
//
// v3.1 → v4.1 重做：11 部门 → 7 正式部门 (M1-M7) · 与 §2.5.2 来源轴对齐
// 同步：MOKO 单名（ex-PI 已 retract）· §5.4 LOCKED
//
// 11 RelicBehavior 子系统 → 5 部门发放 mapping（M6/M7 不发 relic · 出 voice 资产
// in V4 / V1 其他 form 渠道）：
//   M1 人事与排班 (3): Resource, Shop, Stage
//   M2 外部文本回收 (2): Skill, Word
//   M3 文书实验部 (3): Typing, Enchantment, Topology
//   M4 安全部门 (1): Combo
//   M5 档案与归属 (2): Boss Modifier, Scoring
// = 11 / max 27% (M1, M3) within balance guideline

export const RELIC_DEPARTMENTS = {
  "subsystems": [
    {
      "subsystem": "Typing",
      "examples": ["wax_seal", "echo_thimble", "glass_cannon_v2"],
      "department": "M3 文书实验部",
      "tone": "现场作业工具 · 第七打字室操作规范配套"
    },
    {
      "subsystem": "Combo",
      "examples": ["combo_buffer", "multiplier_prism", "immortal_combo"],
      "department": "M4 安全部门",
      "tone": "节律纪律 · 防字符层注意力断裂引发 over-engagement"
    },
    {
      "subsystem": "Skill",
      "examples": ["first_strike", "less_is_more", "jazz"],
      "department": "M2 外部文本回收科",
      "tone": "异常 expression channel 处理工具（D25 v2）"
    },
    {
      "subsystem": "Enchantment",
      "examples": ["apprentice_robe", "fate_fork", "enchant_anchor"],
      "department": "M3 文书实验部",
      "tone": "附注台流程 6 配套器"
    },
    {
      "subsystem": "Topology",
      "examples": ["adjacent_power", "symmetry_pact", "key_storm"],
      "department": "M3 文书实验部",
      "tone": "工位规约 · 现场布局工具"
    },
    {
      "subsystem": "Word",
      "examples": ["word_collection", "long_word_master", "word_dealer"],
      "department": "M2 外部文本回收科",
      "tone": "词包化经手 · 来源遮蔽 / 编号化产出"
    },
    {
      "subsystem": "Resource",
      "examples": ["score_magnet", "time_dew", "universal_furnace"],
      "department": "M1 人事与排班办公室",
      "tone": "蕉券 / 工时凭证"
    },
    {
      "subsystem": "Shop",
      "examples": ["discount_card", "black_market", "timed_auction"],
      "department": "M1 人事与排班办公室",
      "tone": "资源换购授权"
    },
    {
      "subsystem": "Stage",
      "examples": ["warm_up", "elite_hunter", "phoenix"],
      "department": "M1 人事与排班办公室",
      "tone": "时段排班"
    },
    {
      "subsystem": "Boss Modifier",
      "examples": ["modifier_shield", "chaos_roulette", "modifier_reversal"],
      "department": "M5 档案与归属办公室",
      "tone": "责任归属预审 / reclassify 工具"
    },
    {
      "subsystem": "Scoring",
      "examples": ["base_shield", "snowball", "score_black_hole"],
      "department": "M5 档案与归属办公室",
      "tone": "评级 · 行为档案纳入参考"
    }
  ],
  "department_voice": [
    {
      "department": "M1 人事与排班办公室",
      "true_motive": "把岗位变化、薪酬、调岗包装成普通职场流程；surface 与 deep 的 horror gap 在'特殊勤务包装'",
      "tone_points": "普通职场温和包装 / 调岗-晋升-薪酬-特殊勤务",
      "sample": "本批次蕉券核算单位已下发。请于 BATCH 末核销。"
    },
    {
      "department": "M2 外部文本回收科",
      "true_motive": "把异常切碎到员工无法整体理解的形态，让 M3 录入 + M4 安全成立",
      "tone_points": "数据清洗 / 编号 / 遮蔽 / R 标签 (R0-R6)",
      "sample": "样本编号 UTF-7-441-B 已词包化。来源已遮蔽。"
    },
    {
      "department": "M3 文书实验部",
      "true_motive": "保证文本产出（不在意员工，只在意产能）",
      "tone_points": "正式流程 / 操作规范 / 黑白领结现场",
      "sample": "本工具已校准至本批次操作规范。请按规章使用。"
    },
    {
      "department": "M4 安全部门",
      "true_motive": "防止员工作者化（surface ≈ deep · 这层 horror 在存在而不在隐藏）",
      "tone_points": "动作引导 / 去语义 / MOKO / 猴面具 / 节奏纪律",
      "sample": "节律保持工具。维持每分钟字符层稳定输入。"
    },
    {
      "department": "M5 档案与归属办公室",
      "true_motive": "固定版本和责任归属，**保护公司不是作者**（D14 v2 + D26 v2 + D30 firewall stance 的 administrative 实施）",
      "tone_points": "档案 / 合同混合 / 版本 / 归档 / 签名 / 责任 / 封存",
      "sample": "归档已记录。本工具关联责任归属表 §XXX。"
    }
  ],
  "non_relic_departments": [
    {
      "department": "M6 状态确认组",
      "true_motive": "分流能离开和不能离开的人",
      "voice_form": "V4 D29 prompt（5 项 × 4 退化阶段）",
      "note": "不发 relic · 出 V4 voice 资产"
    },
    {
      "department": "M7 猴群管理室",
      "true_motive": "处理深度作者化者（去人称化、保留输入能力）",
      "voice_form": "V1 转入单 / 短句口令",
      "note": "不发 relic · 出 V1 endless 入口仪式 voice 资产"
    }
  ],
  "informal_sources": [
    {
      "source": "M8 前员工残留",
      "true_motive": "尽量救人，但可能不可靠",
      "voice_form": "V2 桌底便签 / 面具内侧划痕 / 废纸批注",
      "note": "非正式 · 不归任何部门 · 唯一可触达后来者 / 读者的 channel"
    },
    {
      "source": "M9 红领结文本",
      "true_motive": "诱导员工承认作者身份",
      "voice_form": "V3 anomaly fragment / V6 反身闭合 attribution",
      "note": "非正式 · anomaly 的 emit channel · 伪装成赞美 / 邀请 / 第二人称称赞"
    }
  ],
  "quotas": {
    "department_max_pct": 27,
    "note": "5 个发放部门池，max 27% (M1/M3 各 3 子系统) within balance guideline。M6/M7 不发 relic（出其他 voice form 资产）"
  },
  "moko_note": "MOKO 是 M4 安全部门旗下子工具 = battle scene UI（不是整个游戏）。MOKO 名永不在 in-game UI 显化（§5.4.3）。MOKO inherited from Project Nim ASL 协议（§5.4.1）",
  "cleanup_note": "v4.1 启动后必须批量重写 v3.1/v2.3 残留 relic narrative 通过 narrative-writer 流水线产出（per audit Tier 3）"
}

// Quick lookup: subsystem → department
export const SUBSYSTEM_TO_DEPARTMENT = Object.fromEntries(
  RELIC_DEPARTMENTS.subsystems.map(s => [s.subsystem, s.department])
)

// Quick lookup: department → voice tone metadata (relic-issuing 5 departments only)
export const DEPARTMENT_VOICE = Object.fromEntries(
  RELIC_DEPARTMENTS.department_voice.map(v => [v.department, v])
)

// Quick lookup: department → true motive (含 M6/M7 + M8/M9)
export const ALL_DEPARTMENT_MOTIVES = Object.fromEntries([
  ...RELIC_DEPARTMENTS.department_voice.map(v => [v.department, v.true_motive]),
  ...RELIC_DEPARTMENTS.non_relic_departments.map(v => [v.department, v.true_motive]),
  ...RELIC_DEPARTMENTS.informal_sources.map(v => [v.source, v.true_motive]),
])
