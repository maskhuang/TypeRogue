// Ritual (铭封祈礼) narrative text — Layer VI Containment Corridor
// Hand-written per narrative-design.md, not AI-generated
// Last updated: 2026-04-17

/** Entrance lines — random pool, shown on entering the ritual */
export const RITUAL_ENTRANCE = [
  { text_zh: "汝之祈愿，引擎已知。", text_en: "The Engine knows thy prayer." },
  { text_zh: "蜡烛已燃，仪式可始。", text_en: "The candle burns. Begin." },
  { text_zh: "收容廊不拒虔诚者。", text_en: "The Corridor admits the devout." },
  { text_zh: "铅字在此沉默，唯汝声可闻。", text_en: "Lead is silent here. Only thy voice carries." },
  { text_zh: "祈礼一旦开始，便无退路。", text_en: "Once begun, there is no retreat." },
  { text_zh: "引擎在听。慎言。", text_en: "The Engine listens. Choose wisely." },
  { text_zh: "石壁记住每一次祈礼。", text_en: "These walls remember every rite." },
  { text_zh: "蜡封未干，仪式尚可。", text_en: "The wax is still warm. Proceed." },
] as const

/** Option descriptions and post-selection responses */
export const RITUAL_OPTIONS = {
  /** Base option A: 晋铸 (upgrade skill) */
  elevate: {
    id: "elevate",
    lines: [
      {
        desc_zh: "将铭文组送入深铸模。重铸之铅，纹路更深，亦更易碎。",
        desc_en: "Submit the inscription to a deeper mold. Recast lead bears deeper grooves — and cracks more easily.",
        response_zh: "铅已入模。",
        response_en: "The lead enters the mold.",
      },
      {
        desc_zh: "引擎接受晋铸之请。铅字将承更重之刻痕。",
        desc_en: "The Engine accepts the elevation. The type shall bear heavier impressions.",
        response_zh: "深纹已铸。",
        response_en: "Deep grooves cast.",
      },
      {
        desc_zh: "旧铅融去，新纹铸入。晋铸不可逆——汝可愿？",
        desc_en: "Old lead melts, new patterns cast. Elevation cannot be undone — art thou willing?",
        response_zh: "不可复原。",
        response_en: "No reversal.",
      },
    ],
  },

  /** Base option B: 临时祝圣 (temp buff) */
  consecrate: {
    id: "consecrate",
    lines: [
      {
        desc_zh: "以蜡封加持汝之圣坛。蜡融尽时，恩赐亦散。",
        desc_en: "Seal thy lectern with wax. When the wax melts, the blessing fades.",
        response_zh: "蜡封已施。",
        response_en: "Wax seal applied.",
      },
      {
        desc_zh: "引擎赐临时之力。此力如烛火——明亮而短暂。",
        desc_en: "The Engine grants fleeting power. Like candlelight — bright and brief.",
        response_zh: "烛火正燃。",
        response_en: "The candle burns.",
      },
      {
        desc_zh: "蜡封印入圣坛。触之尚温，用之即凉。",
        desc_en: "Wax pressed into the lectern. Warm to the touch, cold in the using.",
        response_zh: "恩赐有时。",
        response_en: "Grace is fleeting.",
      },
    ],
  },

  /** Class option: Wordsmith (铭刻派) — lock for certainty */
  wordsmith: {
    id: "wordsmith",
    condition: "class === 'wordsmith'",
    lines: [
      {
        desc_zh: "以教条之锁固汝铭文。形不可变，力亦不散。",
        desc_en: "Lock thy inscription by doctrine. Form immutable, power undispersed.",
        response_zh: "锁已落定。",
        response_en: "The lock falls.",
      },
      {
        desc_zh: "铭刻派之礼：牺牲变数，换取恒久之力。",
        desc_en: "Rite of the Inscriber: sacrifice variance for lasting power.",
        response_zh: "形已定矣。",
        response_en: "Form is set.",
      },
    ],
  },

  /** Class option: Metamorph (熔变派) — break and reforge */
  metamorph: {
    id: "metamorph",
    condition: "class === 'metamorph'",
    lines: [
      {
        desc_zh: "将铭文组投入熔炉。旧铅归炉——形灭而意不灭。",
        desc_en: "Cast the inscription into the furnace. Old lead returns — form dies, intent endures.",
        response_zh: "炉火已燃。",
        response_en: "The furnace burns.",
      },
      {
        desc_zh: "熔变之礼：碎旧铸新，万形皆可期。",
        desc_en: "Rite of Metamorphosis: shatter the old, cast the new. All forms are possible.",
        response_zh: "旧形已碎。",
        response_en: "Old form shattered.",
      },
    ],
  },

  /** Class option: None (无誓门) — the expendable's prayer */
  none: {
    id: "none",
    condition: "class === 'none'",
    lines: [
      {
        desc_zh: "尔为铅屑，然铅屑亦可祷。代价从重。",
        desc_en: "Thou art scrap lead, yet even scrap may pray. The price is steep.",
        response_zh: "引擎未拒。",
        response_en: "The Engine did not refuse.",
      },
      {
        desc_zh: "无誓之徒亦有一愿之权。但引擎索价更高。",
        desc_en: "Even the oathless may wish once. But the Engine charges more.",
        response_zh: "已纳其贡。",
        response_en: "Tribute paid.",
      },
    ],
  },
} as const
