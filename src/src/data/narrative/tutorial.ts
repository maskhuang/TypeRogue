// Tutorial (《初誓键徒须知》) — Delta Green-style three-layer tutorial
// Hand-written per narrative-design.md, not AI-generated
// Last updated: 2026-04-21 — synced with v2.2 (语言碎片假说, 气动征用管, 感知深度)
//
// Three-layer structure per module:
//   body:    Institutional voice (📄) — clear, actionable rules with numbering
//   margin:  Previous keybound's pencil notes (near ✏️) — plain-language translation
//   footer:  Bureaucratic footnote (📄) — worldbuilding flavor, skippable
//
// Display timing:
//   module 1 → before first battle
//   module 2 → on first skill acquisition
//   module 3 → on first shop visit
// All modules skippable (Esc). Re-readable in Codex under "须知" category.

export interface TutorialLine {
  body_zh: string
  body_en: string
  margin_zh?: string
  margin_en?: string
}

export interface TutorialModule {
  id: string
  title_zh: string
  title_en: string
  trigger: string
  lines: TutorialLine[]
  footer_zh: string
  footer_en: string
}

export const TUTORIAL_MODULES: TutorialModule[] = [
  // ──────────────────────────────────────────────
  // Module 1: Containment Procedure
  // Institution tells you the MINIMUM to execute.
  // Previous keybound fills in what actually helps.
  // ──────────────────────────────────────────────
  {
    id: "containment_procedure",
    title_zh: "第一章 · 收容程序",
    title_en: "Chapter I · Containment Procedure",
    trigger: "first_battle",
    lines: [
      {
        body_zh: "一、词语显现时，按圣坛上对应键位逐字铭刻。绿灯正确。红灯错误，立即修正。",
        body_en: "I. When words manifest, inscribe letter by letter on thy lectern. Green: correct. Red: error — correct immediately.",
      },
      {
        body_zh: "二、铭分达到收容基准即完成。沙漏为时限。",
        body_en: "II. Reach the containment threshold to complete. The hourglass is thy limit.",
        margin_zh: "盯着那两个数",
        margin_en: "Watch the two numbers",
      },
      {
        body_zh: "三、失败即站点污染。不可暂停。不可申诉。",
        body_en: "III. Failure constitutes site contamination. No pausing. No appeals.",
      },
      {
        body_zh: "四、收容完成后如感知发生变化，请勿离开工位。此为正常现象。",
        body_en: "IV. Should perception shift upon completion, remain at thy station. This is normal.",
        margin_zh: "别慌 坐着别动",
        margin_en: "Don't panic. Stay seated",
      },
    ],
    footer_zh: "如有疑问，提交 F-009。回复周期 ██ 个工作日。",
    footer_en: "Questions: submit F-009. Response time: ██ working days.",
  },

  // ──────────────────────────────────────────────
  // Module 2: Issued Equipment
  // Institution doesn't explain HOW tools work.
  // "Tools have been issued. Use per procedure."
  // The previous keybound explains the rest.
  // ──────────────────────────────────────────────
  {
    id: "issued_equipment",
    title_zh: "第二章 · 配发器材",
    title_en: "Chapter II · Issued Equipment",
    trigger: "first_skill",
    lines: [
      {
        body_zh: "一、铭文组已配发。绑定至圣坛键位后方可使用。未绑定之铭文组不产生效力。",
        body_en: "I. Inscriptions have been issued. Bind to lectern keys before use. Unbound inscriptions have no effect.",
        margin_zh: "底下那排亮的",
        margin_en: "The lit row below",
      },
      {
        body_zh: "二、铭刻时，已绑定之铭文组按规程运作。效果因器材而异。详情不在本须知范围内。",
        body_en: "II. During inscription, bound equipment operates per procedure. Effects vary. Details are outside the scope of this document.",
        margin_zh: "看键旁边那个彩条",
        margin_en: "Watch the color bar by each key",
      },
      {
        body_zh: "三、可同时绑定多组。教堂不对器材间之相互作用承担说明义务。",
        body_en: "III. Multiple inscriptions may be bound. The Cathedral assumes no obligation to explain inter-equipment interactions.",
      },
    ],
    footer_zh: "本章所述器材之原理属 ██ 级限制信息。键徒无需理解原理即可执行收容。",
    footer_en: "Operating principles of said equipment are ██-level restricted. Keybound need not understand principles to execute containment.",
  },

  // ──────────────────────────────────────────────
  // Module 3: Requisition & Maintenance
  // Institution tells you: there's a tube, spend coins, bind stuff.
  // Previous keybound tells you: how to actually navigate the shop.
  // ──────────────────────────────────────────────
  {
    id: "requisition",
    title_zh: "第三章 · 征用与维护",
    title_en: "Chapter III · Requisition & Maintenance",
    trigger: "first_shop",
    lines: [
      {
        body_zh: "一、收容间歇可通过气动征用管申领器材。消耗铅币。铅币由铭刻产出。超支不予补贴。",
        body_en: "I. Between containment assignments, equipment may be requisitioned via the Pneumatic Tube. Costs lead coins. Coins from inscription output. Overspending is not subsidized.",
      },
      {
        body_zh: "二、征用后绑定至键位。如需更换，自行调整。键位有限。教堂不提供额外键位。",
        body_en: "II. Bind requisitioned items to keys. Swap as needed. Keys are limited. The Cathedral does not provide additional keys.",
        margin_zh: "拖过去就行\n不会坏",
        margin_en: "Just drag it\nWon't break",
      },
      {
        body_zh: "三、可申请换架。可申请晋铸。相关费用自理。",
        body_en: "III. Restock requests available. Elevation requests available. All costs borne by keybound.",
        margin_zh: "换架就是刷新\n晋铸就是升级",
        margin_en: "Restock = new stuff\nElevate = upgrade",
      },
    ],
    footer_zh: "征用管附近偶见手写便条。非教堂公文。教堂不为其内容负责。亦不为阅读后产生之任何期望负责。",
    footer_en: "Notes found near the tube are not Cathedral documents. The Cathedral is not responsible for their contents, nor for any expectations formed upon reading them.",
  },
] as const
