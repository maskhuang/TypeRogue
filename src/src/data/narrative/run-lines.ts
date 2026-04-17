// Run opening / closing / boss entrance lines
// Hand-written per narrative-design.md, not AI-generated
// Last updated: 2026-04-17

/** Run opening lines, split by player progression stage */
export const RUN_OPENING = {
  /** No Order unlocked — you are a number */
  none: [
    { text_zh: "键徒已就位。开始铭刻。", text_en: "Keybound in position. Begin inscription." },
    { text_zh: "第 ██ 号替补已部署。", text_en: "Replacement ██ deployed." },
    { text_zh: "铅字已上架。请按程序执行。", text_en: "Type loaded. Follow procedure." },
    { text_zh: "汝为引擎之手。手无须思考。", text_en: "Thou art the Engine's hand. Hands need not think." },
    { text_zh: "又一名键徒。引擎不记名。", text_en: "Another keybound. The Engine keeps no names." },
    { text_zh: "圣坛已校准。收容可始。", text_en: "Lectern calibrated. Containment may begin." },
  ],
  /** Wordsmith unlocked — the Cathedral acknowledges you */
  wordsmith: [
    { text_zh: "誓已铭，铅已重。再入深处。", text_en: "Oath inscribed, lead weighted. Descend again." },
    { text_zh: "铭刻者归来。引擎记得汝手。", text_en: "The Inscriber returns. The Engine recalls thy hand." },
    { text_zh: "汝之誓门已开。铅字候命。", text_en: "Thy Order stands open. The type awaits." },
    { text_zh: "形不可变。以此誓再战。", text_en: "Form is immutable. By this oath, proceed." },
    { text_zh: "铅字认得汝指。深层在召唤。", text_en: "The type knows thy fingers. The depths call." },
  ],
  /** Metamorph unlocked — the Engine is watching */
  metamorph: [
    { text_zh: "汝已非旧铅。引擎亦知。", text_en: "Thou art no longer old lead. The Engine knows." },
    { text_zh: "熔变者再临。炉火为汝而燃。", text_en: "The Metamorph returns. The furnace burns for thee." },
    { text_zh: "铅字在汝手中颤抖。是恐惧？", text_en: "The type trembles in thy hand. Fear?" },
    { text_zh: "引擎的心跳——还是汝的？", text_en: "The Engine's heartbeat — or thine?" },
    { text_zh: "旧形已碎。汝将铸何新形？", text_en: "Old form shattered. What new shape wilt thou cast?" },
  ],
} as const

/** Boss entrance lines — short alerts */
export const BOSS_ENTRANCE = [
  { text_zh: "意志显现。", text_en: "Will manifests." },
  { text_zh: "异文已醒。", text_en: "The anomaly wakes." },
  { text_zh: "收容失效。", text_en: "Containment failed." },
  { text_zh: "引擎震颤。", text_en: "The Engine trembles." },
  { text_zh: "它在看你。", text_en: "It sees thee." },
  { text_zh: "铅字碎裂。", text_en: "The type shatters." },
  { text_zh: "祷文中断。", text_en: "Litany interrupted." },
  { text_zh: "深层回响。", text_en: "The depths echo." },
] as const

/** Run failure lines — institutional indifference */
export const RUN_FAILURE = [
  { text_zh: "键徒 D-████ 失联。替补已指派。圣坛归还流程已启动。", text_en: "Keybound D-████ lost. Replacement assigned. Lectern return initiated." },
  { text_zh: "收容失败。站点污染等级上调。请下一名键徒就位。", text_en: "Containment failed. Site contamination upgraded. Next keybound, step forward." },
  { text_zh: "汝未带走的，皆随汝而散。铅归尘，尘归炉。", text_en: "What thou carried not disperses with thee. Lead to dust, dust to furnace." },
  { text_zh: "引擎不哀悼。流程继续。", text_en: "The Engine does not mourn. Procedure continues." },
  { text_zh: "F-044 表单已由他人代填。原因栏：不适用。", text_en: "Form F-044 filed by proxy. Reason: not applicable." },
  { text_zh: "圣坛记得汝指。但它会记住下一个人的。", text_en: "The lectern remembers thy touch. It will remember the next." },
] as const

/** Run victory lines — 3s silence then one line */
export const RUN_VICTORY = [
  { text_zh: "汝已登顶。引擎未言。", text_en: "Thou hast ascended. The Engine is silent." },
  { text_zh: "收容完成。请归还圣坛。", text_en: "Containment complete. Return thy lectern." },
  { text_zh: "十二层已清。铅字安息。", text_en: "Twelve layers cleared. The type rests." },
  { text_zh: "静。", text_en: "Silence." },
  { text_zh: "引擎停了一瞬。为汝？未必。", text_en: "The Engine paused. For thee? Perhaps not." },
] as const
