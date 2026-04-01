// ============================================
// Prompt 模板（Prompt Caching 优化版）
// SYSTEM_CONTEXT 放入 system.cached，跨 Phase 共享缓存
// ============================================

import { SYSTEM_CONTEXT, AFFIX_INSTANCE_INTERFACE, EXISTING_AFFIXES, CATEGORIES } from './context.mjs'

// ===== Phase 1: 设计 =====

export function buildDesignPrompt({ count = 3, category = null, theme = null }) {
  const categoryHint = category
    ? `\n要求：所有新词条必须属于 "${category}" 类别。`
    : `\n可以设计任意类别的词条，但尽量覆盖不同类别以增加多样性。`

  const themeHint = theme
    ? `\n设计主题/方向：「${theme}」— 围绕这个主题进行设计。`
    : ''

  return {
    system: {
      cached: SYSTEM_CONTEXT,
      extra: `你是一位资深游戏设计师，擅长 Roguelike 游戏的词条/天赋系统设计。
你精通数值平衡、策略深度和系统协同设计。
你必须输出严格的 JSON 格式，不要输出多余文字。`,
    },

    user: `请设计 ${count} 个全新的词条（Affix），加入现有的 20 种词条池。

### 现有词条（不可重复）
${EXISTING_AFFIXES.join(', ')}

### 可用类别
${CATEGORIES.join(', ')}
${categoryHint}${themeHint}

### 输出格式

输出一个 JSON 数组，每个元素：

\`\`\`json
{
  "id": "snake_case_英文ID",
  "name": "中文名（2字）",
  "englishName": "PascalCase英文名",
  "icon": "单个emoji",
  "category": "所属类别",
  "description": "一句话效果描述（玩家可读）",
  "designRationale": "设计意图：为什么需要这个词条、它填补了什么空缺",
  "params": {
    "参数名": { "min": 最小值, "max": 最大值, "description": "参数说明" }
  },
  "weightTier": "high 或 low",
  "triggerPhase": "哪个 Phase 生效（1基础值/2加算/3乘算/4资源写入/5后触发/6邻居通知）",
  "scalingOnLevelUp": {
    "param": "升级时缩放的参数名",
    "delta": 每级增量,
    "mode": "add / mult / add-dir"
  },
  "synergyWith": ["与哪些现有词条有协同"],
  "conflictWith": ["与哪些现有词条有冲突/反协同"],
  "questEnchantment": {
    "name": "质变附魔中文名（2字）",
    "englishName": "QuestXxx",
    "effectDesc": "质变效果描述",
    "transformDesc": "质变后效果描述"
  },
  "implementationNotes": "实现要点/复杂度提示"
}
\`\`\`

### 设计要求
1. 不能与现有 20 种词条功能重叠
2. 应利用打字游戏独有机制（键盘、单词、速度、正确率等）
3. 参数范围应合理，考虑数值膨胀
4. 必须有清晰的策略取舍（何时强/何时弱）
5. 质变附魔应是词条的自然延伸，提供质变感
6. 请直接输出 JSON 数组，不要包含 markdown 代码块标记`
  }
}

// ===== Phase 2: 评审 =====

export function buildReviewPrompt(designs) {
  return {
    system: {
      cached: SYSTEM_CONTEXT,
      extra: `你是一位严格的资深游戏设计评审。你的职责是找出设计中的问题，而非赞美。
评审维度：1.数值平衡 2.独特性 3.策略深度 4.实现可行性 5.协同/冲突 6.质变附魔 7.子系统潜力
你必须输出严格的 JSON 格式。`,
    },

    user: `## 子系统扩展评估标准

某些词条可从"单词条参数"升级为"全局子系统"。成功案例：暴击词条→暴击子系统（词条只提供 chance，暴击率由 6 个遗物跨 5 个子系统聚合）。

子系统特征：1.核心参数可提取为全局聚合stat 2.效果常量全局共享 3.跨系统遗物可影响 4.有状态生命周期 5.有覆写类遗物改变规则

不适合：效果过于局部化 / 没有可泛化的全局stat / 与现有子系统重合

---

## 待评审的新词条设计

${JSON.stringify(designs, null, 2)}

---

## 输出格式

\`\`\`json
{
  "reviews": [
    {
      "id": "词条ID",
      "verdict": "approve / revise / reject",
      "score": 1-10,
      "issues": [{ "severity": "critical/major/minor", "description": "问题描述" }],
      "suggestions": ["修改建议"],
      "balanceAnalysis": "数值平衡分析（50字以内）",
      "uniquenessCheck": "与现有词条的重叠分析（50字以内）",
      "subsystemEval": {
        "canExpand": true/false,
        "confidence": "high/medium/low",
        "globalStat": "全局聚合 stat 名称",
        "rationale": "为什么适合/不适合（80字以内）",
        "affixChange": "词条如何适配子系统"
      }
    }
  ],
  "revisedDesigns": [
    // 修正后的完整设计（仅 approve/revise 的词条）
    // canExpand=true 的添加 "subsystemExpansion": true
  ],
  "overallFeedback": "整体评价（100字以内）"
}
\`\`\`

请直接输出 JSON，不要包含 markdown 代码块标记`
  }
}

// ===== Phase 2b: 子系统遗物设计 =====

export function buildSubsystemRelicPrompt(affixDesign) {
  return {
    system: {
      cached: SYSTEM_CONTEXT,
      extra: `你是一位资深游戏设计师，擅长 Roguelike 遗物系统设计。
为新词条子系统设计配套遗物，遵循阶梯式稀有度模式。
你必须输出严格的 JSON 格式。`,
    },

    user: `## 遗物系统

遗物 = { id, name, icon, description, rarity, basePrice, subsystem, behaviorType?, flavor }
现有 12 个子系统各 5 个遗物。稀有度价格: common=50g, rare=80g, epic=120g, legendary=0g

### 暴击子系统遗物范例（设计模板）

| 稀有度 | 设计模式 | 例子 |
|--------|----------|------|
| Common | 被动加成 | 幸运一击: +8%暴击率 |
| Common | 副作用奖励 | 暴击奖金: 暴击时+3金币 |
| Rare | 状态累积器 | 暴击蓄力: 5次非暴击后必暴 |
| Epic | 连锁/组合 | 暴击风暴: 单词内≥2暴击+50% |
| Legendary | 赌博/覆写 | 命运硬币: 50%×3 / 50%归零 |

跨系统遗物: fury_beat(combo,combo≥10→+10%), precision_strike(topology,主行→+10%), long_word_crit(word,词≥6→+12%), desperate_crit(stage,≤5s→+20%), rune_spike(enchantment,每附魔+3%)

---

## 需要设计遗物的词条

${JSON.stringify(affixDesign, null, 2)}

---

## 输出格式

\`\`\`json
{
  "subsystemId": "snake_case ID",
  "globalStat": "全局 stat 名",
  "globalStatDescription": "作用说明",
  "affixAdaptation": { "before": "原始行为", "after": "适配后行为", "paramChanges": "变更说明" },
  "dedicatedRelics": [
    { "id": "", "name": "", "icon": "", "description": "", "rarity": "", "basePrice": 0,
      "designPattern": "", "flavor": "", "needsBehaviorType": false, "behaviorNotes": "", "constants": {} }
  ],
  "crossSystemRelics": [
    { "id": "", "name": "", "icon": "", "description": "", "belongsToSubsystem": "",
      "contributionToGlobalStat": "", "rarity": "common", "basePrice": 50, "condition": "" }
  ],
  "lifecycleManagement": { "perTrigger": "", "perWord": "", "perBattle": "" },
  "implementationComplexity": "low/medium/high",
  "implementationNotes": ""
}
\`\`\`

要求: 5专属(2C+1R+1E+1L), 3~5跨系统, Legendary要改变规则感。
请直接输出 JSON，不要包含 markdown 代码块标记`
  }
}

// ===== Phase 3: dev-story / code-review (由 claude -p 执行) =====
// 这两个 phase 不再需要自定义 prompt，直接用 BMAD workflow

// ===== (Legacy) Phase 3 实现 — 仅 --no-bmad 模式使用 =====

export function buildImplementPrompt(approvedDesigns, subsystemDesigns = null) {
  const subsystemSection = subsystemDesigns
    ? `\n## 子系统遗物设计\n${JSON.stringify(subsystemDesigns, null, 2)}\n`
    : ''

  return {
    system: {
      cached: SYSTEM_CONTEXT,
      extra: `你是一位 TypeScript 游戏开发专家。根据词条设计生成可合入的代码。
代码风格与现有代码一致。输出可编译的 TypeScript 代码。`,
    },

    user: `## AffixInstance 接口
${AFFIX_INSTANCE_INTERFACE}

## 需修改的文件
1. affixes.ts: AffixType枚举, AFFIX_CATEGORY_MAP, AffixInstance接口, AFFIX_WEIGHT_TIERS, AFFIX_NAMES, AFFIX_DESCRIPTIONS, AFFIX_LEVEL_SCALING
2. affixTrigger.ts: Phase 2/3 计算逻辑
3. 附魔: EnchantmentType, QUEST_AFFIX_MAP, QUEST_ENCHANTMENT_DEFS
${subsystemSection}
## 需实现的词条
${JSON.stringify(approvedDesigns, null, 2)}

## 输出 JSON
\`\`\`json
{
  "affixes": [{ "id": "", "name": "", "isSubsystem": false, "codeChanges": [{ "file": "", "section": "", "code": "", "insertAfter": "" }] }],
  "subsystems": [{ "id": "", "affixId": "", "relicDataCode": "", "behaviorFileCode": "", "skillsInjectionCode": "", "triggerAdaptationCode": "" }],
  "newTestCases": ""
}
\`\`\`
请直接输出 JSON，不要包含 markdown 代码块标记`
  }
}
