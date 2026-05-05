// Auto-derived from docs/narrative-design.md v4.1 + §6.3.1 V1 craft rules + §6.5 规则怪谈 5 手法
// Re-derive when narrative-design 版本号变化。
//
// v3.1 → v4.1 rename：mib-lexicon.mjs → boilerplate-lexicon.mjs
// 内容清洗：
//   - 删除 "MIB 风格" / "收容主义官僚（不命名 SCP）" framing（v4.1 anomaly = 未受理文本，不依赖 MIB 框架）
//   - 删除 v3.1 calibration_sample（"封蜡章 · B-7 类合规器"——MIB 风格示例，v4.1 不再适用）
//   - 保留 SOP 信号词词典作为 V1 boilerplate 风格参考（§6.3.1 + §6.5 手法核心）
//   - 新增 V1 公文格式 sample（与 narrative-design §6.3.1 sample library 对齐）

export const BOILERPLATE_LEXICON = {
  // V1 公文 / V5 守则 共用的 SOP 信号词
  signal: [
    {
      type: '分类编号',
      examples: ['B-7 类', '§044', '§087', '§122', '§144', 'Section 9', 'UTF-7-441-B'],
      hint: '系统庞大但永远不展开；编号 = 公司 firewall 的物理化，不是世界观揭晓',
    },
    {
      type: '处置动词',
      examples: ['reclassify', '归档', '封存', '抄送', '复审', '经手', '签出'],
      hint: 'D26 v2 公司唯一动作；公司**不创造 / 不引导 / 不分发**，只 reclassify / 调度 / 记录',
    },
    {
      type: '不在场机构',
      examples: ['维修组', '检查组', '行为档案处', '复审委员会', '物资管理中心'],
      hint: '被引用，从不出场；§5.5 11 部门可作为署名，但部门内部细节永远留白',
    },
    {
      type: '楼层 / 工位暗示',
      examples: ['请勿带出 7 楼', '本工位无收件人', '楼上', '工位主管'],
      hint: '暗示有边界以外的存在但你不该去（B2 留白）',
    },
    {
      type: '协议性 SOP 句式',
      examples: ['严禁...', '一旦...', '万一...', '如发生...', '建议...', '本工位不存在...', '编制内无...'],
      hint: '规则怪谈手法：把不正常事项程序化。注意 §9.8.3 配额：Rule 14 规则句式 ≤ 25% 总 flavor 量；用法像企业 SOP 不像怪谈',
    },
    {
      type: '时间窗口模糊',
      examples: ['下批次起', '本月度结算前', '17:06-17:13', '计时钟无秒针时', '受理窗口'],
      hint: 'D27 受理窗口的物理化锚点；时间错乱不是 bug，是窗口在打开 / 关闭',
    },
    {
      type: '反身闭合 attribution',
      examples: ['上一任作者: Subject XX-####', '前任作者 Subject XX 于 Cycle Y 转入特殊勤务', '经手记录 Subject [工号]'],
      hint: 'V6 boss tooltip / D19 反身闭合的 voice 化；attribution 是玩家以前的自己（C6）',
    },
  ],

  // V1 boilerplate 写作纪律（§6.3.1）
  rules: [
    'V1 句式：短 / 行政 / 动作流程 / 主语 = "员工 [工号]" 或 omit',
    'V1 时态：present / imperative',
    'V1 情感词：❌ 0 个—— 没有"恭喜 / 感谢 / 抱歉 / 提醒"等词',
    'V1 措辞：程序化（"权限调整生效" 而非"你升职了"）；"reclassify" 而非"修改"',
    'V1 称谓："员工 [工号]"、"Subject [工号]"——绝不"你 / 您"',
    'V1 标点：句号 / 冒号 / 顿号；不用感叹号、问号',
    'V1 长度：短，1-3 句即止',
    '密度铁律：每段 boilerplate 都暗示水底，但永远不下水',
  ],

  // V1 sample（与 narrative-design §6.3.1 sample library 对齐）
  v1_samples: [
    '员工 [工号] 转入独立工位。本职位无配额，无值班同事，无定期审阅。',
    '员工 [工号] 通过结业评估。鉴于其 Cycle X 修改记录与 Cycle Y 异常归档之间的 cross-reference 频次超阈，转入特殊勤务。不得复述任务内容。不得记录梦境。',
    '本日候选：来源——公共字幕系统乱码；编号 UTF-7-441-B；处理状态——已词包化，移交本工位录入测试。',
    '前任作者 Subject XX 于 Cycle Y 转入特殊勤务，不得复述任务内容。',
    '本工位无收件人。',
    '档案补全通知：Subject XX 补充资料已合并入库，时间戳追溯至 [日期]。',
    '权限调整生效。本职位无配额，无值班同事，无定期审阅。',
  ],

  // V5 守则 sample（§6.3.5 + §4.1 deny→affirm 配对）
  v5_samples: {
    L1_recorder: [
      '守则 003：视线停留在当前高亮字符。',
      '守则 008：纸张方向异常时，视线移至色带窗。',
      '守则 014：每 30 字确认一次计时钟。',
      '守则 022：任务结束后说："本轮录入结束。"',
      '守则 027：使用工号回应。',
      '守则 034：输出完成后离开座位等待核验。',
    ],
    L2_proofreader: [
      '守则 003 注：本条已审阅，无需进一步处理。',
      '守则 008 注：纸张方向"异常"的判定参照《色带窗作业指引》（已封存）。',
      '守则 014 红字增补：计时钟无秒针时，受理窗口可能开启。',
    ],
    L3_reviser: [
      '守则 003 备忘：Subject [工号] 于 Cycle Y 经手任务时报告幻听打字声，应答后转入特殊勤务。建议补入第七打字室基础守则。',
    ],
    L4_author: [
      '守则原始来源：1986-XX-XX 17:06 事件后续 protocol。',
    ],
  },

  density_rule: '每段 boilerplate 都暗示水底，但永远不下水（§6.5 + §6.3.1 horror 锚定）',
}

// 兼容层：v3.1 import { MIB_LEXICON } from '../generated/mib-lexicon.mjs' 仍可用
// validators/index.mjs 已切到 BOILERPLATE_LEXICON；本 export 保留是为防止 future 误 reference。
// Phase B 切完后 mib-lexicon.mjs 文件本身可删。
export const MIB_LEXICON = BOILERPLATE_LEXICON
