// Tutorial (《初誓键徒须知》) — Delta Green-style three-layer tutorial
// Hand-written per narrative-design.md, not AI-generated
// Last updated: 2026-04-17
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
  // Module 1: Inscription & Containment Threshold
  // ──────────────────────────────────────────────
  {
    id: "inscription_basics",
    title_zh: "第一章 · 铭刻与收容基准",
    title_en: "Chapter I · Inscription & Containment Threshold",
    trigger: "first_battle",
    lines: [
      {
        body_zh: "一、铸印版上将显现收容词语。逐字按下圣坛上对应键位。铅字亮绿即为正确。亮红即为收容震颤——立即按正确键位修正。",
        body_en: "I. Containment words appear on the impression plate. Press corresponding keys on thy lectern, letter by letter. Green confirms. Red is a containment tremor — press the correct key immediately.",
        margin_zh: "看中间那块铁板",
        margin_en: "Look at that iron plate in the middle",
      },
      {
        body_zh: "二、沙漏上方之数值为收容基准。铭分（沙漏下方）须达到此数。达到即收容成功，进入下一层。",
        body_en: "II. The number above the hourglass is the containment threshold. Thy score (below the hourglass) must reach it. Success grants passage to the next layer.",
        margin_zh: "就是说上面的数要比下面大",
        margin_en: "Top number needs to beat bottom number",
      },
      {
        body_zh: "三、沙漏为时限。沙尽即停。不可暂停。不可续加。不可申诉。",
        body_en: "III. The hourglass is thy time limit. When sand runs out, it ends. No pausing. No extensions. No appeals.",
        margin_zh: "真的",
        margin_en: "Seriously",
      },
    ],
    footer_zh: "备注：如对上述内容有疑问，请提交 F-009 咨询表。平均回复周期为 ██ 个工作日。",
    footer_en: "Note: For questions, submit Form F-009. Average response time: ██ working days.",
  },

  // ──────────────────────────────────────────────
  // Module 2: Inscriptions & Holy Flow
  // ──────────────────────────────────────────────
  {
    id: "skills_and_flow",
    title_zh: "第二章 · 铭文组与圣流",
    title_en: "Chapter II · Inscriptions & Holy Flow",
    trigger: "first_skill",
    lines: [
      {
        body_zh: "一、铭文组为汝之收容工具。获得铭文组后须绑定至圣坛键位，方可在铭刻时激活。",
        body_en: "I. Inscriptions are thy containment tools. After acquisition, bind them to lectern keys to activate during inscription.",
        margin_zh: "底下那排亮着的键",
        margin_en: "The lit keys at the bottom",
      },
      {
        body_zh: "二、铭刻词语时，已绑定的铭文组自动积蓄圣流（键位旁之色条）。色条蓄满时铭文组释放效力。不同铭文组产出不同颜色之圣流。",
        body_en: "II. While inscribing, bound inscriptions automatically accumulate holy flow (the color bar beside each key). When full, the inscription releases its power. Different inscriptions yield different flow colors.",
        margin_zh: "注意看键旁边的小彩条",
        margin_en: "Watch the little color bars next to each key",
      },
      {
        body_zh: "三、多个铭文组可同时绑定。不同铭文组之间可能产生配合效应。教堂不鼓励、不禁止、亦不解释此类现象。",
        body_en: "III. Multiple inscriptions may be bound simultaneously. Combinations may produce synergies. The Cathedral neither encourages, prohibits, nor explains such phenomena.",
        margin_zh: "试试颜色不一样的",
        margin_en: "Try mixing different colors",
      },
    ],
    footer_zh: "备注：前任键徒在本页夹了一张纸条：'先看颜色再选铭文。别像我一样全绑同色的然后死在第三层。'纸条已按规定归档。内容未经审核。",
    footer_en: "Note: A previous keybound left a slip of paper in this page: 'Pick by color first. Don't do what I did and bind all the same color and die on layer three.' The note has been filed per regulation. Contents unverified.",
  },

  // ──────────────────────────────────────────────
  // Module 3: Reliquary Bazaar & Inscription Mgmt
  // ──────────────────────────────────────────────
  {
    id: "shop_and_management",
    title_zh: "第三章 · 圣物市集与铭文管理",
    title_en: "Chapter III · Reliquary Bazaar & Inscription Management",
    trigger: "first_shop",
    lines: [
      {
        body_zh: "一、层间休整时可进入圣物市集。陈列之铭文组与圣器可消耗铅币征用。铅币来源为铭刻产出。量入为出。",
        body_en: "I. Between layers, the Reliquary Bazaar is available. Displayed inscriptions and artifacts may be requisitioned for lead coins. Coins come from inscription output. Budget accordingly.",
        margin_zh: "就是商店界面",
        margin_en: "It's the shop screen",
      },
      {
        body_zh: "二、征用后须将铭文组嵌入圣坛键位方可生效。键位有限。如需更换，将铭文组拖离键位即可。——教堂声明铭文组不因此损坏。大概。",
        body_en: "II. After requisition, bind the inscription to a lectern key to activate it. Keys are limited. To swap, drag the inscription off the key. The Cathedral states inscriptions are not damaged by this. Probably.",
        margin_zh: "拖过去就行 能换 不会坏",
        margin_en: "Just drag it over. You can swap. Won't break",
      },
      {
        body_zh: "三、可消耗铅币换架（更新市集陈列）。新陈列随机。换架次数不限。铅币有限。自行斟酌。",
        body_en: "III. Spend lead coins to restock (refresh the display). New stock is random. Restocks are unlimited. Coins are not. Use judgment.",
        margin_zh: "不满意就刷",
        margin_en: "Don't like it? Reroll",
      },
      {
        body_zh: "四、铭文组可晋铸（升级）。晋铸时自动获得祝圣（附魔）。祝圣种类随机。教堂不接受祝圣相关之退换申请。",
        body_en: "IV. Inscriptions may be elevated (upgraded). Elevation automatically grants a consecration (enchantment). Consecration type is random. The Cathedral does not accept consecration-related return requests.",
        margin_zh: "升一级还送个随机效果",
        margin_en: "Level up and get a random bonus",
      },
    ],
    footer_zh: "备注：市集角落偶有手写便条。此为前任经营者个人物品，非教堂公文。教堂不为其准确性、时效性或情绪稳定性负责。",
    footer_en: "Note: Handwritten notes occasionally appear in bazaar corners. These are personal effects of the previous operator, not Cathedral documents. The Cathedral accepts no responsibility for their accuracy, timeliness, or emotional stability.",
  },
] as const
