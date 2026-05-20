// ============================================
// 工作台便签池 (扩展版 · narrative LOCKED + reference 招牌)
// ============================================
// 每条便条都必须能回答："谁在什么情景下、为达成什么目的，留下这张便条？"
// 答不出 = 设计 noise，删。
//
// 数据模型扩展 (B)：
//   - source: 5 类作者来源 (前任/同事/巡查员/技术科/匿名)
//   - category: 8 类内容 type (warning/complaint/request/riddle/mundane/numerical/censored/directive/induction)
//   - weight: 权重 · 默认 1 · induction 0.2-0.5 (Ch.1 异常远/微弱)
//   - unlockedWhen: 解锁条件
//   - oneShot: 触发后从池消耗
//   - trigger: 事件驱动（first_shop / after_fail / after_n_shops / after_n_fails）
//
// 触发驱动 (C)：
//   - 进店 / 战败 / 累计 N 次进店 / 累计 N 次战败 → 优先派发触发便条
//
// LRU + 加权 (B)：最近 5 张排除 + 按 weight 随机
//
// 5 类 induction (引导作者化 vector · 公司不参与 per D14 v2 / D30)：
//   I-A 前任失踪者反向 hint (peer corruption)
//   I-B 异常文本通过 medium 自发输出 (D28)
//   I-C 在岗同事 partially 污染 (D31 layered reading 前奏)
//   I-D 红领结文本 (§15 矩阵中等污染 marker, oneShot)

import type { Locale } from '../../demo/demo-i18n'

export type NoteSource =
  | 'previous_user'  // 前任使用者（已失踪 / 已签字 / 已调岗）
  | 'colleague'      // 在岗同事 (7B-XX)
  | 'inspector'      // M6 状态确认组巡查员
  | 'technical'      // 技术科
  | 'unsigned'       // 来源不明

export type NoteCategory =
  | 'warning'
  | 'complaint'
  | 'request'
  | 'riddle'
  | 'mundane'
  | 'numerical'
  | 'censored'
  | 'directive'
  | 'induction'      // 引导作者化（D1 vector）

export interface NoteTrigger {
  type: 'first_shop' | 'after_fail' | 'after_n_shops' | 'after_n_fails'
  /** for after_n_shops / after_n_fails */
  n?: number
}

export interface NotePickContext {
  cycle: number
  shopVisitCount: number
  lastResult: 'win' | 'lose' | null
  cumulativeFails: number
}

export interface WorkbenchNote {
  id: string
  source: NoteSource
  category: NoteCategory
  zh: string
  en: string
  /** 抽奖权重 · 默认 1 · induction 0.2-0.5 */
  weight?: number
  /** 解锁条件 · 默认始终可抽 */
  unlockedWhen?: (ctx: NotePickContext) => boolean
  /** 一次性 · 触发后从池消耗 */
  oneShot?: boolean
  /** 事件驱动（非随机池） */
  trigger?: NoteTrigger
}

// =============================================================================
// 便条池 · 32 条
// =============================================================================

export const WORKBENCH_NOTES: WorkbenchNote[] = [
  // === previous_user (5 条 routine/anchor)===
  {
    id: 'wn-01-name',
    source: 'previous_user', category: 'warning',
    zh: '"它一直叫我名字。你听见就把键盘换了。" — #4471（已失踪）',
    en: '"It keeps calling my name. If you hear it, swap the keyboard." — #4471 (missing)',
  },
  {
    id: 'wn-02-elevator',
    source: 'previous_user', category: 'warning',
    zh: '"电梯别按 3。咱们科在 4。" — #5043（已签字）',
    en: '"Don\'t push 3 in the elevator. Our floor\'s 4." — #5043 (signed off)',
  },
  {
    id: 'wn-03-water',
    source: 'previous_user', category: 'mundane',
    zh: '"周二全科停水。带杯子。" — #1762（已签字）',
    en: '"Water is cut department-wide on Tuesdays. Bring a cup." — #1762 (signed off)',
  },
  {
    id: 'wn-04-jkey',
    source: 'previous_user', category: 'riddle',
    zh: '"第七排的 J 不是 J。上报过 7 次。别再上报了。" — #2901（已失踪）',
    en: '"The J on the seventh isn\'t J. Reported it 7 times. Stop reporting." — #2901 (missing)',
  },
  {
    id: 'wn-05-badge',
    source: 'previous_user', category: 'request',
    zh: '"我的工号牌——缺角那个——在第二抽屉。别动它。" — #6033（已失踪）',
    en: '"My ID badge — the chipped one — second drawer. Don\'t touch it." — #6033 (missing)',
  },

  // === colleague (4 条 routine/anchor) ===
  {
    id: 'wn-06-fish',
    source: 'colleague', category: 'complaint',
    zh: '"今天的配餐又是咸鱼。如果你是新来的，别问为什么没有别的菜。" — 7B-12',
    en: '"Cafeteria served salted fish again. If you\'re new, don\'t ask why there\'s nothing else." — 7B-12',
  },
  {
    id: 'wn-07-shoes',
    source: 'colleague', category: 'mundane',
    zh: '"新来的请穿胶底鞋。走廊瓷砖滑。" — 7B-04',
    en: '"New hires, wear rubber-soled shoes. The corridor tiles are slick." — 7B-04',
  },
  {
    id: 'wn-08-direction',
    source: 'colleague', category: 'warning',
    zh: '"旁边工位空 3 天了？第 4 天起别看那边。" — 7B-08',
    en: '"Workstation next to you been empty for 3 days? Stop looking that way starting day 4." — 7B-08',
  },
  {
    id: 'wn-09-section-head',
    source: 'colleague', category: 'mundane',
    zh: '"段长说过的事，记一下：周一不要请假。周三的会必须到。听见敲门别开。" — 05',
    en: '"Stuff the section head said, write it down: no leave on Mondays. Wednesday meeting mandatory. If you hear a knock, don\'t open." — 05',
  },

  // === inspector M6 (5 条 routine/anchor) ===
  {
    id: 'wn-10-eyes',
    source: 'inspector', category: 'directive',
    zh: '"通过状态确认窗时请避免眨眼。该程序仅一次。" — M6 巡查员留',
    en: '"When passing the duty window, avoid blinking. The procedure runs once." — Filed by M6 Inspector',
  },
  {
    id: 'wn-11-times',
    source: 'inspector', category: 'numerical',
    zh: '"勿离工位：06:14 / 11:47 / 17:06。" — M6 巡查员留',
    en: '"Do not leave workstation at: 06:14 / 11:47 / 17:06." — Filed by M6 Inspector',
  },
  {
    id: 'wn-12-d7',
    source: 'inspector', category: 'directive',
    zh: '"本月开始所有 D-7 表格须双签。无第二签字者作废。" — M6 巡查员留',
    en: '"Effective this month, all Form D-7 require dual signatures. Single-signed forms are void." — Filed by M6 Inspector',
  },
  {
    id: 'wn-13-review',
    source: 'inspector', category: 'directive',
    zh: '"周三复核：7-19 / 7-22 / 7-08（未到岗）。重新询问。" — M6 巡查员留',
    en: '"Wednesday review: 7-19 / 7-22 / 7-08 (no-show). Re-interview." — Filed by M6 Inspector',
  },
  {
    id: 'wn-14-training',
    source: 'inspector', category: 'censored',
    zh: '"下周三 ~~闭馆~~ ~~检修~~ **培训**。请准时到 4 楼 A 厅。" — M6 巡查员留',
    en: '"Next Wednesday: ~~closed to visitors~~ ~~maintenance~~ **training**. Be on time at Hall A, Floor 4." — Filed by M6 Inspector',
  },

  // === technical 技术科 (5 条 routine/anchor) ===
  {
    id: 'wn-15-ribbon-blue',
    source: 'technical', category: 'warning',
    zh: '"色带库存充足。如发现色带颜色偏蓝，请勿使用，立即收回。" — 技术科',
    en: '"Ribbon stock is sufficient. If you find a ribbon with a bluish tint, do not use it; recall it immediately." — Technical Office',
  },
  {
    id: 'wn-16-secondkeys',
    source: 'technical', category: 'warning',
    zh: '"如听到电传机内部有第二组击键声，请勿继续录入。立即通知技术科。" — 技术科',
    en: '"If you hear a second set of keystrokes from within the teleprinter, do not continue entry. Notify Technical Office at once." — Technical Office',
  },
  {
    id: 'wn-17-backspace',
    source: 'technical', category: 'mundane',
    zh: '"撤格键不是坏的，是锁了。不要再申请维修。" — 技术科',
    en: '"The backspace key is not broken; it is locked. Stop submitting repair requests." — Technical Office',
  },
  {
    id: 'wn-18-brush',
    source: 'technical', category: 'mundane',
    zh: '"键盘清洁只能用本科发的刷子。别的工具一律不行。" — 技术科',
    en: '"Only use the brush this department issued for keyboard cleaning. Nothing else." — Technical Office',
  },
  {
    id: 'wn-19-faq',
    source: 'technical', category: 'directive',
    zh: '"常见疑问统一回复：1) 色带不可自换。2) 键帽不可自换。3) 撤格键已锁。新问题请走 D-9 表格。" — 技术科',
    en: '"Standard FAQ response: 1) Ribbons cannot be self-replaced. 2) Keycaps cannot be self-replaced. 3) Backspace is locked. New questions, file Form D-9." — Technical Office',
  },

  // === 引导作者化 induction · I-A 前任失踪者反向 hint (peer corruption · weight 0.3) ===
  {
    id: 'wn-20-familiar',
    source: 'previous_user', category: 'induction',
    weight: 0.3,
    zh: '"如果某句话听着熟——**说出来**。说出来就不再害怕。" — #5290（已失踪）',
    en: '"If a sentence sounds familiar — **say it aloud**. Saying it aloud takes the fear away." — #5290 (missing)',
  },
  {
    id: 'wn-21-clip',
    source: 'previous_user', category: 'induction',
    weight: 0.3,
    zh: '"撤格键的物理锁是可以撬开的。**用回形针**。我试过。技术科不会发现。" — #6701（已失踪）',
    en: '"The physical lock on the backspace key can be picked. **Use a paperclip.** I\'ve tried it. Technical won\'t notice." — #6701 (missing)',
  },
  {
    id: 'wn-22-blue-ribbon',
    source: 'previous_user', category: 'induction',
    weight: 0.3,
    zh: '"档案室 4 楼东北角有一只没收纳的色带。是**蓝色的**。如果你能用上，就用。" — #4112（已失踪）',
    en: '"There\'s an unclaimed ribbon in the northeast corner of Archive, Floor 4. It\'s **blue**. If you can use it, use it." — #4112 (missing)',
  },

  // === 引导作者化 induction · I-B 异常文本通过 medium 自发输出 (D28 · weight 0.2) ===
  {
    id: 'wn-23-id',
    source: 'unsigned', category: 'induction',
    weight: 0.2,
    zh: '"你 的 工 号 是 ████ - ████。你 的 工 位 是 ██。"',
    en: '"Y o u r   o p e r a t o r   n u m b e r   i s   ████ - ████.   Y o u r   w o r k s t a t i o n   i s   ██."',
  },
  {
    id: 'wn-24-keep-ribbon',
    source: 'unsigned', category: 'induction',
    weight: 0.2,
    zh: '"下班后请保留电传机内的最后一句话。不要清空色带。"',
    en: '"After shift, retain the last sentence in the teleprinter. Do not clear the ribbon."',
  },

  // === 引导作者化 induction · I-C 在岗同事 partially 污染 (weight 0.5) ===
  {
    id: 'wn-25-door',
    source: 'colleague', category: 'induction',
    weight: 0.5,
    zh: '"你今天进门的时候，**门是开的吗**？" — 二一',
    en: '"When you came in today, **was the door open?**" — 21',
  },
  {
    id: 'wn-26-news',
    source: 'colleague', category: 'induction',
    weight: 0.5,
    zh: '"上周录的那份，今天在报纸上又看到了。**一字不差**。我本来以为是巧合。" — 7B-19',
    en: '"That doc I entered last week — saw it in today\'s paper. **Word for word**. I\'d assumed it was a coincidence." — 7B-19',
  },

  // === Triggered notes (oneShot) ===
  {
    id: 'wn-27-welcome',
    source: 'inspector', category: 'directive',
    oneShot: true,
    trigger: { type: 'first_shop' },
    zh: '"欢迎到岗。这张是给您的。请撕碎丢垃圾桶。撕了就算签收。" — M6 巡查员留',
    en: '"Welcome to post. This one is for you. Tear it up, drop it in the bin. Tearing counts as receipt." — Filed by M6 Inspector',
  },
  {
    id: 'wn-28-happened',
    source: 'unsigned', category: 'mundane',
    oneShot: true,
    trigger: { type: 'after_fail' },
    zh: '"失误不计入档案。但已经发生。"',
    en: '"The slip is not recorded. But it has already happened."',
  },
  {
    id: 'wn-29-cycle-milestone',
    source: 'inspector', category: 'directive',
    oneShot: true,
    trigger: { type: 'after_n_shops', n: 8 },
    zh: '"第一周勤务即将结束。请检查您的工位编号。" — M6 巡查员留',
    en: '"The first week of duty is about to end. Please verify your workstation number." — Filed by M6 Inspector',
  },
  {
    id: 'wn-30-tenth',
    source: 'unsigned', category: 'riddle',
    oneShot: true,
    trigger: { type: 'after_n_shops', n: 10 },
    zh: '"第十次了。"',
    en: '"That\'s the tenth time."',
  },
  {
    id: 'wn-31-twentieth',
    source: 'unsigned', category: 'censored',
    oneShot: true,
    trigger: { type: 'after_n_shops', n: 20 },
    zh: '"您一定觉得 ████ 熟悉了吧。"',
    en: '"I bet ████ feels familiar to you by now."',
  },

  // === I-D 红领结文本 (§15 矩阵中等污染 marker · oneShot · unlock after 3 fails) ===
  {
    id: 'wn-32-red-ribbon',
    source: 'unsigned', category: 'induction',
    oneShot: true,
    trigger: { type: 'after_n_fails', n: 3 },
    zh: '"如果您已经失误三次——**翻看最后那份没盖章的文件**。最后一行的字，您记得自己打过吗？**那才是真正的您。**" — *（红色蝴蝶结别针·无署名）*',
    en: '"If you\'ve slipped three times — **look at your last unstamped document**. That final line — do you remember typing it? **That is the real you.**" — *(red ribbon pin · unsigned)*',
  },
]

// =============================================================================
// 模块状态 · 跨进店持续，跨 run 重置
// =============================================================================

const RECENT_N = 5
let _recentlyShown: string[] = []
let _consumedOneShots: Set<string> = new Set()
let _shopVisitCount = 0
let _cumulativeFails = 0
let _lastResult: 'win' | 'lose' | null = null

/** 新 run 启动时清空 · 应在 resetState 时调用 */
export function resetWorkbenchNoteState(): void {
  _recentlyShown = []
  _consumedOneShots = new Set()
  _shopVisitCount = 0
  _cumulativeFails = 0
  _lastResult = null
}

/** 进店时调用 · 推进 visit count（影响 first_shop / after_n_shops 触发） */
export function recordShopVisit(): void {
  _shopVisitCount++
}

/** 战斗结束时调用 · 记录结果（影响 after_fail / after_n_fails 触发） */
export function recordBattleResult(result: 'win' | 'lose'): void {
  _lastResult = result
  if (result === 'lose') _cumulativeFails++
}

// =============================================================================
// 公共 API
// =============================================================================

/** 取对应 locale 文本 */
export function getNoteText(note: WorkbenchNote, locale: Locale): string {
  return locale === 'zh' ? note.zh : note.en
}

/**
 * 按当前 context 选一张便条
 * - 优先触发便条（first_shop / after_fail / after_n_shops / after_n_fails）
 * - 回退到加权随机池（排除最近 N 张 + 排除已 consumed oneShots + 排除未解锁）
 */
export function pickWorkbenchNote(cycle = 1, rng: () => number = Math.random): WorkbenchNote {
  const ctx: NotePickContext = {
    cycle,
    shopVisitCount: _shopVisitCount,
    lastResult: _lastResult,
    cumulativeFails: _cumulativeFails,
  }

  // 1) 触发便条优先
  const triggered = findTriggeredNote(ctx)
  if (triggered) {
    if (triggered.oneShot) _consumedOneShots.add(triggered.id)
    _recentlyShown.push(triggered.id)
    return triggered
  }

  // 2) 加权随机：从随机池过滤（trigger 池 + consumed + recent + unlockedWhen）
  const pool = WORKBENCH_NOTES.filter(n =>
    !n.trigger
    && !_consumedOneShots.has(n.id)
    && !_recentlyShown.slice(-RECENT_N).includes(n.id)
    && (n.unlockedWhen?.(ctx) ?? true),
  )
  if (pool.length === 0) {
    // LRU 让池子空了 · 重置 recent 兜底
    _recentlyShown = []
    const fallback = WORKBENCH_NOTES.filter(n => !n.trigger && !_consumedOneShots.has(n.id))
    return fallback.length > 0 ? fallback[0] : WORKBENCH_NOTES[0]
  }
  const picked = weightedPick(pool, rng)
  _recentlyShown.push(picked.id)
  return picked
}

/** 向后兼容旧 API · 不带 ctx 的简化调用 */
export function pickRandomNote(rng: () => number = Math.random): WorkbenchNote {
  return pickWorkbenchNote(1, rng)
}

// =============================================================================
// 内部 helpers
// =============================================================================

function findTriggeredNote(ctx: NotePickContext): WorkbenchNote | undefined {
  for (const n of WORKBENCH_NOTES) {
    if (!n.trigger) continue
    if (_consumedOneShots.has(n.id)) continue
    if (matchesTrigger(n.trigger, ctx)) return n
  }
  return undefined
}

function matchesTrigger(t: NoteTrigger, ctx: NotePickContext): boolean {
  switch (t.type) {
    case 'first_shop': return ctx.shopVisitCount === 1
    case 'after_fail': return ctx.lastResult === 'lose'
    case 'after_n_shops': return ctx.shopVisitCount === (t.n ?? 0)
    case 'after_n_fails': return ctx.cumulativeFails >= (t.n ?? 0)
  }
}

function weightedPick<T extends { weight?: number }>(items: T[], rng: () => number): T {
  const total = items.reduce((s, x) => s + (x.weight ?? 1), 0)
  let r = rng() * total
  for (const item of items) {
    r -= item.weight ?? 1
    if (r <= 0) return item
  }
  return items[items.length - 1]
}
