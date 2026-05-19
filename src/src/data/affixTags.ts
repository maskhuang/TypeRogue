// ============================================
// 打字肉鸽 - 新 Affix 系统 · Tag 词表
// ============================================
// 设计文档: docs/design/affix-rewrite-tag-system.md
//
// 初版仅实施 `section` namespace（8 项 · ethogram §2.1.2-§2.1.11 段）。
// origin / class / mechanic 三个 namespace 推迟到后续 phase（2026-05-12 决议）。
//
// 数据存储模式：tag 词表是 8 个 hardcoded 字符串，不进 JSON。
// 后续若 tag 数量增长或需 i18n 显示名，再考虑迁 JSON。

// ===== Section · ethogram 段（初版唯一 namespace）=====

/** Section · ethogram §2.1.2-§2.1.11 段 */
export const SECTION_TAGS = [
  'maintenance',   // §2.1.2 维持性行为
  'locomotion',    // §2.1.3 运动姿态
  'posture',       // §2.1.4 姿势
  'agonistic',     // §2.1.6 对抗行为
  'vocal',         // §2.1.7 发声目录
  'gesture',       // §2.1.8 手势
  'tool',          // §2.1.10 Cognitive / Tool
  'abnormal',      // §2.1.11 Abnormal / Captive
] as const

// ===== 总词表（扁平 union）=====

/**
 * 所有合法 tag 的扁平词表（编译期校验）。
 *
 * 当前 = SECTION_TAGS。
 * 后续加入 origin / class / mechanic 时，将其常量 spread 进来。
 */
export const TAGS = [
  ...SECTION_TAGS,
  // 推迟 namespace（详 affix-rewrite-tag-system.md §1.2-1.4）：
  // ...ORIGIN_TAGS,    // gombe / mahale / bossou / ...
  // ...CLASS_TAGS,     // wordsmith / metamorph / generic
  // ...MECHANIC_TAGS,  // aura / broadcast / stack / ...
] as const

// ===== 类型导出 =====

/** 所有合法 tag 的字面 union 类型 */
export type Tag = typeof TAGS[number]

/** Section namespace 的字面 union */
export type SectionTag = typeof SECTION_TAGS[number]

// ===== Namespace 分组引用 =====

/**
 * 按 namespace 分组的命名引用，便于后续 namespace-aware 查询 / UI 分组展示。
 *
 * 仅 section 已启用；其他三组占位注释保留。
 */
export const TAG_NS = {
  section: SECTION_TAGS,
  // origin: ORIGIN_TAGS,        // 推迟
  // class: CLASS_TAGS,          // 推迟（已有 ClassResourceFilter）
  // mechanic: MECHANIC_TAGS,    // 推迟（P1 实装后看是否需要）
} as const

// ===== 类型守卫 / 校验函数 =====

/** 运行时校验：value 是否为合法 tag */
export function isTag(value: string): value is Tag {
  return (TAGS as readonly string[]).includes(value)
}

/** 运行时校验：tag 是否属于 section namespace */
export function isSectionTag(tag: Tag): tag is SectionTag {
  return (SECTION_TAGS as readonly string[]).includes(tag)
}

// ===== 元信息（占位）=====

/**
 * 段落中文名映射 · 用作 tooltip section chip 文本（2 字方案 C · 2026-05-12 决议）。
 *
 * 详 docs/design/affix-rewrite-tag-system.md §9.1 — chip 形态。
 * 渲染时建议放在 tooltip-affix-name 前，CSS 类 `tooltip-section-tag`，
 * 继承 tooltip-skill-school 的 pill 样式基底。
 *
 * 实际玩家可见文本最终由 i18n 系统接管；本表为 source of truth + 占位。
 */
export const SECTION_TAG_NAMES_ZH: Record<SectionTag, string> = {
  maintenance: '维持',
  locomotion: '移动',
  posture: '姿势',
  agonistic: '对抗',
  vocal: '发声',
  gesture: '手势',
  tool: '认知/工具',   // §2.1.10 Cognitive/Tool · 含认知（注视/模仿/教学）+ 工具使用两半
  abnormal: '异常',
}

export const SECTION_TAG_NAMES_EN: Record<SectionTag, string> = {
  maintenance: 'Maintenance',
  locomotion: 'Locomotion',
  posture: 'Posture',
  agonistic: 'Agonistic',
  vocal: 'Vocal',
  gesture: 'Gesture',
  tool: 'Cognitive/Tool',   // §2.1.10 · cognition (gaze/imitate/teach) + tool-use
  abnormal: 'Abnormal',
}

/** V2 词条按 section 染色 · workbench 键位 segment / tooltip chip 用
 *  每个 recipe 归属一个 section，section 主色统一 */
export const SECTION_COLORS: Record<SectionTag, string> = {
  maintenance: '#27ae60', // 绿 · 生命 / 养分
  locomotion:  '#3498db', // 蓝 · 流动 / 速度
  posture:     '#9b59b6', // 紫 · 静态 / 姿态
  agonistic:   '#e74c3c', // 红 · 对抗 / 连锁
  vocal:       '#f1c40f', // 黄 · 广播
  gesture:     '#f39c12', // 橙 · 动作
  tool:        '#8B6F47', // 棕 · 认知/工具
  abnormal:    '#95a5a6', // 灰 · 异常
}

/** locale-aware section name lookup（terminal / tooltip 共用）
 *  缺省 locale 时按 demo-i18n.getLocale() 自动选 ZH/EN
 */
import { getLocale } from '../demo/demo-i18n'
export function getSectionName(tag: SectionTag, locale?: 'zh' | 'en'): string {
  const loc = locale ?? getLocale()
  const map = loc === 'en' ? SECTION_TAG_NAMES_EN : SECTION_TAG_NAMES_ZH
  return map[tag] ?? tag
}
