import { summarizeObject, prepareForPrompt } from '../loaders/index.mjs'

// v3 anti-leakage directive — appended to every user prompt.
// The full B1.a 词汇表 / MIB 信号词 / 锚点 / 配额 已在 system prompt 中缓存，
// 这里只放最必要的"硬红线" + 当前任务相关的可见提示。

const ANTI_LEAK = `
重要约束（v3 硬红线）：

1. **不出现 v2.3 残留词汇**：圣印 / 圣徒 / 铅币 / 异文 / 守卷人 / 誓门 / 大教堂 / 圣坛 / 收容铭刻 / D-XXXX 编号 / 版级（定版 / 活版 / 脱版 / 逆版 / 熔版）/ Litany / Cathedral / Scriptor / Sigil / Codex Fragment ──全部禁用。

2. **B1.a 严格遵守**（参见 system prompt B1.a 词汇表）：
   - 力量永远是"被分发"，不是"被发现 / 创造 / 钻研"
   - 禁止：钻研 / 突破 / 领悟 / 顿悟 / 觉醒 / 发明 / 创造 / 共鸣 / 心法 / 灵感 / 激活（自身）
   - 禁止 EN：research (solo) / breakthrough / awaken / transcend / master (verb) / invent / resonate / unleash
   - 主语判断口诀：雇员主动？= 危险。公司流程 / HR？= 安全。

3. **数值绝对不出现在输出中**：百分比 / 倍率 / 价格 / 秒数 / + - 符号 / 具体数字（除编号 #XXX 之外）。
   对象数据中的数值仅供你理解机制，**绝不**写入 flavor。

4. **不复述机制流程**（Rule 12）：档案是 SCP 收容报告，不是 patch notes。描述对象效果时——
   ❌ "持有者铭刻效率提升"（patch notes）
   ❌ "操作者按下首字母触发取消效应"（机制流程图）
   ✅ "持有者报告铭刻时'铅字似乎更重了'。原因不明。"（SCP 风现象观察）
   ✅ "D-████ 使用后失联率下降。附带现象：走廊偶闻低吟。"（事故报告）
   档案的叙事对象是**人和事件**，不是物品的功能流程。

5. **禁用"不是…而是…"句式**：这是写作者向读者解释，不是体制在记录。
   ❌ "这不是温度下降，而是热量被夺走了"
   ✅ 直接陈述事实，删掉对比。

6. **MIB 风格仅用于装备 / 技能 / Boss Modifier**——不能污染公司气质。
   不写"其实公司是 X"的揭晓（B2 死线）。
   科幻元素必须以"官方处理流程"呈现，从不以"奇观"呈现。

7. **配额自我审计**（写一批时）：
   - "Section X" 引用 ≤ 30%（其他用：维修组 / 检查组 / 行为档案 / HR / 政策协调员 / 复审委员会 / 内训部 / 工会 / 物资管理中心）
   - "上游"母题 ≤ 40%（其他用：外勤 / 跨部门 / 客户端 / 历史悬搁）
   - 公告 / 政策类载体 ≤ 40%（其他载体：海报 / 邮件 / 备忘录 / 走廊广播稿 / 食堂菜单 / 工卡背面 / 月度小报 / 同事便条 / 内训 PPT / 工会海报 / 表单残片）
   - 猴子方向 ≤ 30%（其他方向：归档 / 流程 / 抄送 / KPI / 内训 / 团建）

8. **锚点腔调一致性**：
   - HR：员工腔 / 公文 / 标准格式头
   - 上级权威 A（主任）：督察腔（"请配合复核"）
   - 上级权威 B（月度考核官）：仪式化判决腔（"本月统计已提交"）
   - 内训讲师：推销腔 + 鸡汤腔（"灵长类的潜能远超我们想象"）
   - #485,901：私人破碎腔（不署名 / 不完整句 / 第一人称隐含）
   - 不要给 HR 起名字；不要把主任和考核官写成两个不同的人。

9. **「蕉」必须财务严肃**（Rule 9 注脚）：
   ✅ "本月奖金核算单位：蕉券 × 24"
   ❌ "猴子最爱的蕉蕉来啦！"
`.trim()

// ─── User prompt builders ───

export function buildUserPrompt(obj, type, voice, template) {
  const objSummary = typeof obj === 'string' ? obj : JSON.stringify(prepareForPrompt(obj, type), null, 2)

  const voiceBuilders = {
    bell: buildBellPrompt,
    doc:  buildDocPrompt,
    note: buildNotePrompt,
    per_tier_flavor: buildPerTierFlavorPrompt,
  }

  const builder = voiceBuilders[voice]
  if (!builder) throw new Error(`Unknown voice: ${voice} (v3.1 voices: bell, doc, note, per_tier_flavor)`)
  return builder(objSummary, type, template)
}

// v3.1 NEW · per_tier_flavor voice builder
// 一次 LLM call 产出 name + 4 个 tier 的 zh/en flavor（每条 ≤ 30 字 / ≤ 15 words）
function buildPerTierFlavorPrompt(objData, type, template) {
  const guide = TEMPLATE_GUIDES[template] || ''

  return `为以下游戏对象生成 **per_tier_flavor · 4 tier × 1 行 flavor**（v3.1 三轨映射 · 主显示路径）。

## 对象数据
${objData}

## 模板：${template}
${guide}

## v3.1 三轨映射 · 4 个 tier 视角

每个 tier 是**完全不同的视角**——不是同一句话的小修小改，而是**写作主体**变了：

| Tier | 谁在写 | 视角 | 风格 |
|---|---|---|---|
| **0** None / SCP / V-1 / L0 标准层 | 普通员工 写给 普通员工 | 表面合规 / 中性 SOP | 像企业入职手册的一句话 |
| **1** Wordsmith / FRP / V-2 / L1 微扰层 | 残稿处理岗 写给 同岗 | 加碎片识别暗示 | 比 tier 0 多一处"碎片重组" / "复核缺失"等微扰 |
| **2** Metamorph / ARP / V-3 / L2 双视层 | 异常接收岗 写给 同岗 | 加 ghost label / 双视暗示 | 比 tier 1 更不安——"对你说话" / "蜡仍是温的" / "咖啡机的标签滑了一下" |
| **3** Endless / PEP / 无守则 / L3 反转层 | **研究员 写给 研究员**（关于你）| **POV 反转** | "已确认：每次封缄后样本 #485,902 暂停 3 秒。" / "持有人对正向强化反应稳定。" |

**关键：** Tier 3 是**视角根本反转**——Tier 0-2 是员工互相说话，Tier 3 是公司（研究员）以**第三人称谈论作为研究对象的玩家**。

## 风格 sample · 假想 wax_seal（封蜡章）

| Tier | zh | en |
|---|---|---|
| 0 | 用于异常词料归档前的最终封缄。 | For final sealing of anomalous word residue prior to archival. |
| 1 | 封缄前需复核碎片来源。复核记录有 4 处缺失。 | Verify fragment provenance before sealing. Four review entries missing. |
| 2 | 封缄时偶尔感到蜡仍是温的。已记录。 | The wax occasionally feels warm during sealing. Logged. |
| 3 | 已确认：每次封缄后样本 #485,902 暂停 3 秒。 | Confirmed: Subject #485,902 pauses three seconds following each sealing. |

注意 4 行的**视角差异**：tier 0 中性流程；tier 1 加微扰（碎片复核）；tier 2 加身体感知（"蜡仍是温的"）；tier 3 反转——主语从"你"变成"样本 #485,902"。

## 输出格式

\`\`\`json
{
  "name_zh": "中文叙事名（2-6 字，员工腔 / MIB 装备命名感）",
  "name_en": "English Narrative Name (1-3 words)",
  "tier_0_zh": "Tier 0 中文 ≤30 字（标准 SOP 中性视角）",
  "tier_0_en": "Tier 0 English ≤15 words",
  "tier_1_zh": "Tier 1 中文 ≤30 字（FRP 残稿处理者视角 + 微扰）",
  "tier_1_en": "Tier 1 English ≤15 words",
  "tier_2_zh": "Tier 2 中文 ≤30 字（ARP 异常接收者视角 + 双视感）",
  "tier_2_en": "Tier 2 English ≤15 words",
  "tier_3_zh": "Tier 3 中文 ≤30 字（PEP 研究员视角 · POV 反转 · 第三人称谈论玩家）",
  "tier_3_en": "Tier 3 English ≤15 words"
}
\`\`\`

## 写作要求

1. **每条 ≤ 30 字 zh / ≤ 15 words en** —— 短而精，不要写长
2. **4 个 tier 视角根本不同** —— 不是同一句话小修小改
3. **Tier 3 必须 POV 反转** —— 第三人称谈论"样本 #485,902"或"持有人"，公司 / 研究员视角
4. **绝不复述机制** —— 4 个 tier 都禁止"+30%" / "持续 3 回合" 等数值
5. **每个 tier 至少 1 个 v3.1 信号词**（任选）：分类编号 / 异常词汇 / 不在场机构 / 协议代号 / 数字荒诞
6. **黑色幽默 60%** —— Tier 3 反转本身已有恐怖；tier 0-2 可以加 1 处 understated humor（已发生 N 起 / 表单暂停受理 等）

${ANTI_LEAK}

请直接输出 JSON，不要包含 markdown 代码块标记。`
}

function buildBellPrompt(objData, type, template) {
  const guide = TEMPLATE_GUIDES[template] || ''

  return `为以下游戏对象生成 **bell · 短 tooltip / HUD 短句**（v3 灵长类辅助文书部）。

## 对象数据
${objData}

## 模板：${template}
${guide}

## 输出格式
{
  "name_zh": "中文叙事名（2-6 字，员工腔 / MIB 装备命名感）",
  "name_en": "English Narrative Name (1-3 words, MIB tone)",
  "text_zh": "中文 flavor（≤30 字，1-2 句员工腔 / MIB 短描述）",
  "text_en": "English flavor (≤15 words, 1-2 lines MIB tone)"
}

${ANTI_LEAK}

请直接输出 JSON，不要包含 markdown 代码块标记。`
}

function buildDocPrompt(objData, type, template) {
  const guide = TEMPLATE_GUIDES[template] || ''

  return `为以下游戏对象生成 **doc · MIB 长文书 / Codex 条目**（v3 灵长类辅助文书部）。

## 对象数据
${objData}

## 模板：${template}
${guide}

## 输出格式
{
  "text_zh": "中文长文书（6-12 行，按模板格式）",
  "text_en": "English long-form document (6-12 lines, same format)"
}

${ANTI_LEAK}

请直接输出 JSON，不要包含 markdown 代码块标记。`
}

function buildNotePrompt(objData, type, template) {
  const guide = TEMPLATE_GUIDES[template] || ''

  if (template === 'desk_note') {
    return `生成一条 **note · 桌面便条**（v3 Beat 7 / #485,901 私人破碎腔）。

## 对象数据
${objData}

## 模板说明
${guide}

## 输出格式
{
  "text_zh": "中文便条（≤4 段，每段 1-2 句破碎短句，第一人称隐含）",
  "text_en": "English note (≤4 paragraphs, fragmented short lines, implicit first-person)"
}

${ANTI_LEAK}

请直接输出 JSON，不要包含 markdown 代码块标记。`
  }

  // shop_blurb
  return `生成一批 **note · 物资管理中心配发短批注**。

## 对象数据
${objData}

## 模板说明
${guide}

## 输出格式
输出一个 JSON 数组，每条：
{
  "text_zh": "中文批注（≤25 字，半官方半私人手写感）",
  "text_en": "English note (≤25 chars, semi-official scribble)"
}

生成 8 条，要求：
- 3 条配发提示型（"请妥善保管"、"未带工卡不予签收" 这类员工腔短句）
- 3 条流程提示型（"调岗时连同附件一并归还"、"复审中"）
- 2 条让人在意的细节（暗示 #485,901 / 同事消失 / 楼上 / 维修组未到，但永远不展开）

${ANTI_LEAK}

请直接输出 JSON 数组，不要包含 markdown 代码块标记。`
}

// ─── Batch prompt ───

export function buildBatchPrompt(objects, type, voice, template) {
  const guide = TEMPLATE_GUIDES[template] || ''
  const objList = objects.map((o, i) => `[${i + 1}] ${summarizeObject(o, type)}`).join('\n')

  if (voice === 'bell') {
    return `为以下 ${objects.length} 个游戏对象批量生成 **bell · 短 tooltip / HUD 短句**（v3 灵长类辅助文书部）。

## 对象列表
${objList}

## 模板：${template}
${guide}

## 输出格式
JSON 数组，每元素：
{
  "id": "对象 ID",
  "name_zh": "中文叙事名",
  "name_en": "English Narrative Name",
  "text_zh": "中文 flavor（≤30 字）",
  "text_en": "English flavor (≤15 words)"
}

${ANTI_LEAK}

请直接输出 JSON 数组，不要包含 markdown 代码块标记。`
  }

  if (voice === 'doc') {
    return `为以下 ${objects.length} 个游戏对象批量生成 **doc · MIB 长文书 / Codex 条目**（v3 灵长类辅助文书部）。

## 对象列表
${objList}

## 模板：${template}
${guide}

## 输出格式
JSON 数组，每元素：
{
  "id": "对象 ID",
  "text_zh": "中文长文书（6-12 行）",
  "text_en": "English long-form document (6-12 lines)"
}

${ANTI_LEAK}

请直接输出 JSON 数组，不要包含 markdown 代码块标记。`
  }

  if (voice === 'note') {
    return `为以下 ${objects.length} 个游戏对象批量生成 **note · 桌面便条 / 配发批注**（v3）。

## 对象列表
${objList}

## 模板：${template}
${guide}

## 输出格式
JSON 数组，每元素：
{
  "id": "对象 ID",
  "text_zh": "中文便条 / 批注",
  "text_en": "English note / blurb"
}

${ANTI_LEAK}

请直接输出 JSON 数组，不要包含 markdown 代码块标记。`
  }

  // Fallback to single
  return buildUserPrompt(objects[0], type, voice, template)
}

// ─── Template-specific guides ───

const TEMPLATE_GUIDES = {

  // ═══ v3.1 per_tier_flavor 模板 ═══

  per_tier_relic: `**per_tier_relic · 遗物 4-tier flavor**

遗物特定要点：
- **威胁载体**：你可能失去这件物品 → 归还 / 不予补发 / 调岗时连同附件交还
- **Tier 0**：站在 11 部门发放方视角描述这件物品的工作角色（参见 system prompt § 遗物分发部门）
- **Tier 1（FRP）**：暗示物品在残稿处理过程中的"细节失常"
- **Tier 2（ARP）**：物品的异常感知（重量 / 温度 / 边缘 / 倒影 / 声音）
- **Tier 3（PEP）**：研究员视角描述**"持有此物品的样本 #485,902 表现出 X"**`,

  per_tier_affix: `**per_tier_affix · 词条 4-tier flavor**

词条特定要点：
- 词条对位 1 个灵长目物种（NCBI 4 字母代码 · 参见 system prompt § Step 4.5）
- **Tier 0**：动作描述（"接到此条款时雇员需 X"）
- **Tier 1（FRP）**：物种代码 + 行为暗示（"Mmul 协议触发后, 残稿打字组合反响延迟"）
- **Tier 2（ARP）**：行为研究观察腔（"Mmul 持有人在异常样本面前显示 Y 行为"）
- **Tier 3（PEP）**：研究员视角描述**"样本 #485,902 在 Mmul 协议下 X"**`,

  per_tier_bossmod: `**per_tier_bossmod · Boss Modifier 4-tier flavor**

Modifier 特定要点：
- Modifier = "新政策 #XXX" 系——v3.1 + Tier 3 反转后变成"协议条款 #XXX"
- **Tier 0**：政策标题 + 一句话生效描述（员工腔）
- **Tier 1（FRP）**：政策对残稿处理岗的特殊影响
- **Tier 2（ARP）**：政策应激下的异常体感
- **Tier 3（PEP）**：研究员视角——"协议条款 #XXX 已纳入样本 #485,902 行为评估"`,

  // ═══ doc 长文书 ═══

  mib_equipment: `**mib_equipment · 遗物 Codex（MIB 装备文书）**

格式（4 段式，参照 system prompt 中的"封蜡章 · B-7 类合规器"sample）：
\`\`\`
[装备名] · [分类编号]（如 "B-7 类合规器" / "C-2 类授权工具"）

分发对象: [谁有资格领取，员工腔]

[本工具用于...] [一句话描述工作角色，绝不复述机制效果]

使用须知 / 操作规范:
—— [使用提示 1，可触及"已发生 N 起意外..."的报告腔]
—— [使用提示 2，触及一个不在场机构 / 楼层暗示]
—— [可选第 3-4 条]
—— [离职 / 调岗 / 归还相关条款]
\`\`\`

威胁载体（遗物专属）：
"你可能失去这件物品" → 归还 HR / 不予补发 / 调岗时连同附件一并交还。

写作要求：
- 6-10 行（中英各自）
- 不解释为什么这件装备能产生效果——记录"持有者报告了 X" / "已发生 N 起 Y"
- 必须出现至少一个 MIB 信号词（分类编号 / 异常词汇 / 不在场机构 / 楼层暗示）
- 末行常用"归还 HR"、"未通过外勤认证"、"复审中"等收口
- 严守 B1.a：使用"配发 / 领取 / 授权 / 备案"等被分发动词`,

  mib_policy: `**mib_policy · Boss Modifier Codex（月度新政策）**

格式（参照 system prompt 中的"新政策 #082 · 诱饵样本嵌入协议"sample）：
\`\`\`
新政策 #XXX · [政策名称]

颁布单位: 灵长类辅助文书部 · 政策协调员办公室
颁布原因: [一句话原因，常引用"上游验证流程优化"/"本季度战略调整"等模糊话术]

[政策正文 2-3 句：本月起本部门将...]

配套要求:
—— [要求 1：考核 / 复审 / 通报]
—— [要求 2：触及一个不在场机构 / Section / 表单编号]
—— [要求 3：来源 / 用途 / 去向按"机密"处理]

请配合，请勿质疑。
（[可选括号收尾：表单暂停受理 / 复审中 / 不再追问 等]）
\`\`\`

威胁载体（modifier 专属）：
"你的工作被重新定义" → 上游单独核算 / 表单暂停受理 / 不再追问。

写作要求：
- 6-12 行
- 始终以"灵长类辅助文书部 · 政策协调员"或类似抄送署名
- 政策编号 #XXX 必须出现（格式：3 位数字）
- 不写"为什么"政策合理——只写"颁布原因"和"配套要求"
- 末行的"请配合，请勿质疑"或括号收尾是固定收口`,

  job_desc: `**job_desc · Class Codex（工种简介）**

格式：
\`\`\`
[工种叙事名]（普通灵长抄录员 / 文字工匠 / 异体抄录员 / 终身雇员）

岗位描述: [1-2 句员工腔，描述这个工种**处理什么样的词料**]

工作内容:
—— [日常 1：用 B1.a 允许动词，如"领取 X 类词单"、"按 §X.X 流程归档"]
—— [日常 2：触及一个 MIB 信号词或留白机构]
—— [日常 3]

注意事项:
—— [关于这个工种的留白细节，永远不解释为什么是这个工种来处理]
\`\`\`

写作要求：
- 6-10 行
- **不**写"主角的本质"——只写**这个工种处理什么 + 怎么处理**
- 不解释"残次品 / 变异词单"是哪里来的
- 异体抄录员必须把"变异"框架化为**接受变异**而非**主动 mutate**（B1.a 死线）
- 终身雇员 cycle 6+：α 苦涩派——"你已经在这家公司打了 N 年了" / 不强调"成长"`,

  hr_doc: `**hr_doc · Tutorial / Achievement HR 文件**

按对象类型选格式：

### 如果是 tutorial（入职须知 / 教程）：
\`\`\`
[标题：入职须知 第 X 章 · ...]

[1-2 句员工腔说明这个机制的"流程"]

操作规程:
—— [步骤 1，HR 入职培训腔]
—— [步骤 2]

[末行常用"点击'我已阅读'继续。" / "请于 5 分钟内完成本批次。"]
\`\`\`

### 如果是 achievement（评估通报）：
\`\`\`
[标题：[评估事项] · 通报]

雇员 #485,902：
[1-2 句 HR 第三方观察腔评估，如"本批次产能：标准范围内"]

[可选：内训讲师 cameo（仅 ≤20% 的 achievement 加入鸡汤瞬间）]

[末行：流程类收口，"请准备下一批次。" / "归档成功。"]
\`\`\`

写作要求：
- 4-8 行
- Tutorial 永远是入职流程，不是冒险开局——禁止"老司机带新人" / "导师传授秘籍"语境
- Achievement 80% HR 第三方观察腔 + 20% 内训讲师鸡汤腔（"灵长类的潜能远超我们想象"等）
- 玩家系统反馈用第三方观察腔（"雇员 #485,902 当前评级：B+"），绝禁玩家内心独白`,

  // ═══ bell 短描述 ═══

  mib_short: `**mib_short · 短 tooltip / HUD 短句**

适用：Relic / Affix / Enchantment / Class tooltip + Boss Modifier HUD 短格言。

格式：
- 1-2 行（中文 ≤30 字 / 英文 ≤15 词）
- 可以是单句或两个短分句
- MIB 风格短句——暗示水底，但永远不下水
- 不要 4 段式（那是 doc 的工作）

写法示例：
- ✅ "B-7 类合规器。请勿带出 7 楼。"
- ✅ "已记录 14 次意外封缄。"
- ✅ "授权后复审中。"
- ✅ "未通过外勤认证。"
- ❌ "提升铭刻效率"（直译机制）
- ❌ "前主人..."（伪古文 v2.3 残留）
- ❌ "汝持此物..."（教会腔 v2.3 残留）

name_zh / name_en 命名要求：
- 2-6 字中文 / 1-3 词英文
- 物质感 + MIB 装备命名感（"封蜡章" / "回溯触发器" / "诱饵样本协议"）
- 不用伪拉丁后缀（-um / -us / -a）
- 不用"圣 / 圣印 / 铅"等 v2.3 词`,

  // ═══ note 便条 ═══

  desk_note: `**desk_note · #485,901 桌面便条**（Beat 7 私人破碎腔，v3 唯一非公文 voice）

身份：这是工位邻居 #485,901 留下的私人便条 / 抽屉里的纸 / 桌面贴纸。
玩家在月度结算时偶然看到。**不是给玩家看的**——是 #485,901 写给自己的。

5 条规则（B 7 单独立项）：
1. **永远不署名**
2. **永远不写完整句**——破碎是核心
3. **第一人称隐含**——可省略主语，但只能是"我"视角
4. **不使用任何 MIB 信号词**——这是私人空间，不是公文
5. **可夹杂极少官方术语**（≤1 处，说明 #485,901 也活在这个体系里，但抗拒它）

参考 sample（v3 doc Beat 7 已立）：
\`\`\`
今天的词单又怪。

新政策 #082 我不太能理解。
但好像也没人懂。

下班想去食堂三楼。听说那儿有空缺工位。
如果有人问我去哪，就说不知道。
\`\`\`

写作要求：
- ≤4 段，每段 1-2 句
- 短句优先，主语常省略
- 偶尔小希望（"食堂三楼听说..."）但不解释
- 不直接对玩家说话；不是"求救"也不是"密信"
- 不复述任何机制（Rule 12）
- **不用** v2.3 词（圣坛 / 圣印 / 守卷人 etc.）
- 中文用"我"或省略；英文 "I" 出现可，但不要 "you" 指代玩家
- 末段常用"如果有人问我去哪，就说不知道" 这种**对将来的安排**收口（暗示下一步要消失）`,

  shop_blurb: `**shop_blurb · 物资管理中心 / HR 配发室短批注**

身份：这是商店（"物资管理中心 / HR 配发室"）货架旁的小批注或便签，
笔迹混杂——一部分是流程性的官方提示，一部分是路过的同事手写。

格式：≤25 字 / 一句话。

类型分布：
- **配发提示型**（员工腔短句）："请妥善保管"、"未带工卡不予签收"
- **流程提示型**（HR 公文短句）："调岗时连同附件一并归还"、"复审中"
- **让人在意型**（半私人，暗示 #485,901 / 同事 / 楼上 / 维修组未到，永远不展开）：
  · "上次 #485,901 配发的还没归还。"
  · "本月维修组未到。请勿擅自处理。"
  · "复审中。请咨询 HR。"

不允许：
- ❌ 强情绪 / 段子
- ❌ 任何"老司机经验" / 教学口吻
- ❌ v2.3 残留词`,

  // ═══ instructor (bell, ritual stage) ═══

  instructor_pitch: `**instructor_pitch · 仪式关 / 内训讲师推销腔**（Stage 6 茶水间内训 / 月度团建）

身份：内训讲师在 Stage 6 仪式关向你（#485,902）介绍本月内训项目。
腔调：**推销腔为主 + 偶尔鸡汤腔**——体制内 PUA 培训师真实质感。

格式：1-2 行（中文 ≤30 字 / 英文 ≤15 词），1 个 name_zh 是内训项目名。

推销腔要素：
- "下面让我们一起欢迎..."、"请按规章选择内训项目"、"本月最佳..."
- 假惊喜 + 假关怀
- "请按 X" / "请配合" 式礼貌

鸡汤腔要素（≤30% 概率混入）：
- "灵长类的潜能远超我们想象"
- "永远不要给自己设限"
- "本月也是值得记住的一个月"

例：
- ✅ "下面让我们一起鼓掌欢迎本月最佳抄录员！"
- ✅ "灵长类的潜能远超我们想象。永远不要给自己设限。"
- ✅ "请按规章选择本月内训项目。"
- ❌ "汝当虔诚..."（v2.3 教会腔残留）
- ❌ "圣坛已开启..."（v2.3 残留）

name_zh: 内训项目名（如"压力管理 · 第 7 期"、"高效抄录工坊"等推销 + 体制 + 略荒诞）`,
}
