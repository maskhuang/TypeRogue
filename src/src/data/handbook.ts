// ============================================
// 打字肉鸽 - 规则手册（Handbook）数据模型 + 注册表
// ============================================
// 主菜单「规则」入口的多 layer 接口
//   narrative §4.3 5 段身份阶梯 · 录入者 → 校对者 → 修改者 → 作者 → 猴子
//   D20 v3 / D31：理论上是同一份《文牍科作业手册》的不同 layer reading
//   实现上：每个解锁的职业贡献一个独立 tab；未解锁/未撰写的层 UI 完全隐藏
//
// 当前状态：
//   - operator (录入者 = `none` class) 已挂全部 hb.* 内容
//   - 其余 4 layer 已注册 schema，但 content: null + classId: null → 永不渲染
//   - 后续撰写时：classId 填入对应 ClassId（需先扩展 type）+ content 填入 i18n key 引用
//
// 接口稳定性：types 与 getVisibleRuleLayers 选择器为公共 API，可放心引用。

import type { ClassId } from '../core/types'
import type { MetaState } from '../core/state/MetaState'

/**
 * 规则手册的一个 section · 标题行 + 条目列表
 * 所有字符串字段为 i18n key（locale 切换时自动重 render）
 */
export interface RuleSection {
  /** Section 标题 i18n key (e.g. 'hb.section_1' → "一 · 上 工 / CLOCK-IN") */
  titleKey: string
  /** 条目 i18n key 数组（每个 key 渲染为一个 <li>） */
  itemKeys: string[]
}

/**
 * 一份规则手册的完整内容结构
 * content = null 意味"layer 注册占位但内容待撰写" — UI 不渲染对应 tab
 */
export interface RuleContent {
  /** 手册标题行 (e.g. 'hb.title' → "新员工守则 · HANDBOOK") */
  titleKey: string
  /** 右上表格编号 (e.g. 'hb.form_id' → "DPCA-NEW 第 1/1 页") */
  formIdKey: string
  /** 顶部前言段落 */
  preambleKey: string
  /** 主体章节列表 · 顺序渲染 */
  sections: RuleSection[]
  /** 末尾警示行（可选 · 一般是粗体红色「已读视同同意」类） */
  warnKey?: string
  /** 末尾路由说明（可选 · 一般是 "签字后转入下个流程" 类引导） */
  routeNoteKey?: string
  /** 底部版本号 / 部门戳 */
  footerKey: string
  /** ACK 按钮文案 */
  ackBtnKey: string
}

/**
 * 一层规则手册 · 对应一个身份阶梯
 *
 * 可见性条件（AND）：
 *   1. content !== null （内容已撰写）
 *   2. classId !== null （已绑定真实 ClassId）
 *   3. metaState.isClassUnlocked(classId) === true （该职业已解锁）
 */
export interface RuleLayer {
  /** 稳定标识符 · 与 duty-roster row id 对应（详 ClassPicker ROSTER_LAYOUT） */
  id: 'operator' | 'proofreader' | 'modifier' | 'author' | 'monkey'
  /**
   * 引擎 ClassId · 用于查询 isClassUnlocked()
   * - `'none'` = baseline 录入者，永远可见
   * - `null` = 该 layer 还没绑定到引擎 ClassId（waiting for ClassId enum 扩展）
   */
  classId: ClassId | null
  /** Tab 标签 i18n key · 沿用 roster.role.* 系列 */
  tabLabelKey: string
  /** 内容；null = 注册占位但未撰写，UI 完全隐藏 */
  content: RuleContent | null
}

/**
 * 全部 5 层规则手册注册表
 * 后续添加新层只需在此追加项 + 提供 content
 */
export const RULE_LAYERS: RuleLayer[] = [
  {
    id: 'operator',
    classId: 'none',                      // 当前已激活
    tabLabelKey: 'roster.role.operator',
    content: {
      titleKey:     'hb.title',
      formIdKey:    'hb.form_id',
      preambleKey:  'hb.preamble',
      sections: [
        // §1 上工 · 2 routine
        { titleKey: 'hb.section_1', itemKeys: [
          'hb.section_1_li_1', 'hb.section_1_li_3',
        ] },
        // §2 文件 · 1 routine + 3 事件触发 + 1 跨班自我否认（A 凝视 / B 像谁写的 / D 不合理迹象 / 其他职业）
        { titleKey: 'hb.section_2', itemKeys: [
          'hb.section_2_li_1', 'hb.section_2_li_3', 'hb.section_2_li_4', 'hb.section_2_li_5', 'hb.section_2_li_6',
        ] },
        // §3 申领 · 1 routine + 2 事件触发（C 撤格键锁定 / E 个人物品禁带）
        { titleKey: 'hb.section_3', itemKeys: [
          'hb.section_3_li_1', 'hb.section_3_li_3', 'hb.section_3_li_4',
        ] },
        // §4 工位伦理 · 2 事件触发（F 空工位 ghost typing / G 挂钟 D27 受理窗口）
        { titleKey: 'hb.section_4', itemKeys: [
          'hb.section_4_li_1', 'hb.section_4_li_2',
        ] },
        // §5 归档·离场 · 1 routine + 2 事件触发（H 讨论范围 / I D29 simplified 离场仪式 · 引号术语「已受理文本」）
        { titleKey: 'hb.section_5', itemKeys: [
          'hb.section_5_li_1', 'hb.section_5_li_3', 'hb.section_5_li_4',
        ] },
      ],
      warnKey:      'hb.warn',
      routeNoteKey: 'hb.route_note',
      footerKey:    'hb.footer',
      ackBtnKey:    'hb.ack_btn',
    },
  },
  // === 待撰写：4 阶身份手册 ===
  // 解锁条件占位 · 后续步骤需要：
  //   (a) 扩展 ClassId enum 加入 proofreader/modifier/author/monkey
  //   (b) 撰写 i18n keys (hb_p2.* / hb_p3.* 等命名空间)
  //   (c) 此处 classId 填入 ClassId，content 引用新 i18n keys
  { id: 'proofreader', classId: null, tabLabelKey: 'roster.role.proofreader', content: null },
  { id: 'modifier',    classId: null, tabLabelKey: 'roster.role.modifier',    content: null },
  { id: 'author',      classId: null, tabLabelKey: 'roster.role.author',      content: null },
  { id: 'monkey',      classId: null, tabLabelKey: 'roster.role.monkey',      content: null },
]

/**
 * 返回当前可见的 layer 列表（已撰写 + 已绑定 ClassId + 该 class 已解锁）
 * 渲染时顺序固定按 RULE_LAYERS 注册顺序
 */
export function getVisibleRuleLayers(metaState: MetaState): RuleLayer[] {
  return RULE_LAYERS.filter(layer => {
    if (!layer.content) return false
    if (!layer.classId) return false
    return metaState.isClassUnlocked(layer.classId)
  })
}

/** 根据 id 取 layer（含未可见的） */
export function getRuleLayer(id: RuleLayer['id']): RuleLayer | undefined {
  return RULE_LAYERS.find(l => l.id === id)
}
