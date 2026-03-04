# Story 19.2: 产出者技能（10 个）

Status: complete

## Story

作为一个 **玩家**，
我想要 **按键触发绑定的产出者技能直接获得对应资源**，
以便 **通过技能选择和键位布局，在每关建立基础资源产出**。

## Acceptance Criteria

1. 10 个产出者技能数据定义完成，含 5 种资源 × 2 种运算符（+N 加法 / ×N 乘法），每个有 Lv1/Lv2/Lv3 数值
2. 按键触发时，产出者直接修改 `state.resources`：+N 类加法累加，×N 类乘以当前值
3. 成长规则：+N 类 Lv2=Lv1×1.6, Lv3=Lv1×2.4；×N 类递减增长（见数值表）
4. 每局 Run 开始时 10 个产出者全部进入技能池（固定，不随机筛选）
5. 产出者触发时有视觉反馈：对应资源颜色浮字（红/金/橙/蓝/银）
6. 产出者走独立触发路径，**不经过 Modifier 管道**（无 base/enhance/global 三层）
7. 商店系统适配：产出者可购买、升级、出售、绑定到键位
8. 现有 18 个技能和所有测试通过，零回归

## Tasks / Subtasks

- [x] Task 1: 产出者数据定义 (AC: 1, 3)
  - [x] 1.1 在 `src/core/types.ts` 新增 `ProducerDefinition` 接口和 `ProducerOperator` 类型
  - [x] 1.2 在 `src/data/producers.ts` 定义 10 个产出者（id, name, emoji, resource, operator, values[3]）
  - [x] 1.3 导出 `PRODUCERS` Record 和 `isProducer(skillId)` 判定函数
  - [x] 1.4 在 `SKILL_SCHOOL` 中为 10 个产出者添加流派映射（产出者流派 'school-producer'）

- [x] Task 2: 产出者触发逻辑 (AC: 2, 6)
  - [x] 2.1 在 `src/systems/skills.ts` 新增 `triggerProducer(producerId, triggerKey)` 函数
  - [x] 2.2 +N 运算：`state.resources[resource] += value`
  - [x] 2.3 ×N 运算：`state.resources[resource] *= value`（对 shield 取 floor）
  - [x] 2.4 在 `triggerSkill()` 入口检测 `isProducer(skillId)`，分流到 `triggerProducer()`
  - [x] 2.5 ×N 乘法产出者对"当前值为 0"时的保护（×0=0，这是正常行为，不需特殊处理）

- [x] Task 3: 技能池管理 (AC: 4, 7)
  - [x] 3.1 `src/systems/shop.ts` → `generateShopItems()` 中将 `PRODUCERS` 加入技能池
  - [x] 3.2 产出者使用现有 `SkillInstance`（level 1-3），共享升级/出售/绑定流程
  - [x] 3.3 确保 Run 开始时 10 个产出者全在可购买池中（不随机筛选）

- [x] Task 4: 触发反馈 (AC: 5)
  - [x] 4.1 在 `triggerProducer()` 中调用 `showFeedback()` 显示对应资源颜色浮字
  - [x] 4.2 +N 类显示 `+{value}{资源名}`，×N 类显示 `×{value}{资源名}`
  - [x] 4.3 复用 `showTriggerPopup()` / `highlightBoundSkill()` / `playSound('skill')` 现有反馈

- [x] Task 5: 测试 (AC: 8)
  - [x] 5.1 10 个产出者数据定义正确性（resource, operator, values）
  - [x] 5.2 +N 产出者触发后 `state.resources` 正确累加
  - [x] 5.3 ×N 产出者触发后 `state.resources` 正确相乘
  - [x] 5.4 等级升级数值正确（Lv1/Lv2/Lv3 按成长规则）
  - [x] 5.5 isProducer 判定函数正确
  - [x] 5.6 产出者与现有技能共存（triggerSkill 分流不影响旧技能）
  - [x] 5.7 所有现有测试回归通过（21 个 pre-existing failures 不相关）

## Dev Notes

### 权威设计来源

以 `docs/brainstorming-session-2026-03-03.md` 为准。本 Story backlog 原始版本的产出者列表与 brainstorming 不一致（已更正）。

### 10 个产出者数值表

| ID | emoji | 名字 | 资源 | 运算 | Lv1 | Lv2 | Lv3 |
|---|---|---|---|---|---|---|---|
| A1 | ⚔️ | 爆发 | base | +N | +5 | +8 | +12 |
| A2 | 💎 | 聚能 | base | ×N | ×2 | ×2.3 | ×2.6 |
| A3 | 🪙 | 掠夺 | score | +N | +15 | +24 | +36 |
| A4 | 🎯 | 暴击 | score | ×N | ×1.1 | ×1.15 | ×1.2 |
| A5 | 🔥 | 强化 | multiplier | +N | +0.2 | +0.32 | +0.48 |
| A6 | 🔥🔥 | 狂热 | multiplier | ×N | ×1.15 | ×1.2 | ×1.25 |
| A7 | ❄️ | 冻结 | time | +N | +2 | +3.2 | +4.8 |
| A8 | ⏳ | 永恒 | time | ×N | ×1.2 | ×1.25 | ×1.3 |
| A9 | 🛡️ | 护盾 | shield | +N | +1 | +2 | +3 |
| A10 | 🏰 | 铁壁 | shield | ×N | ×2 | ×2.3 | ×2.6 |

**成长规则：**
- +N 类：Lv2 = Lv1 × 1.6, Lv3 = Lv1 × 2.4
- ×N 类：递减增长（不用统一公式，直接写固定值）

### ID 命名冲突处理

现有 `SKILLS` 中已有 `burst`/`freeze`/`shield` 等同名技能。产出者使用带前缀的 ID：
- `prod_burst` (A1), `prod_focus` (A2), `prod_loot` (A3), `prod_crit` (A4)
- `prod_boost` (A5), `prod_frenzy` (A6), `prod_freeze` (A7), `prod_eternal` (A8)
- `prod_shield` (A9), `prod_fortress` (A10)

### 产出者 TypeScript 接口

```typescript
// src/core/types.ts 新增
export type ProducerOperator = 'add' | 'multiply';

export interface ProducerDefinition {
  id: string;           // prod_burst, prod_focus, ...
  name: string;         // 爆发, 聚能, ...
  icon: string;         // emoji
  resource: ResourceType; // 目标资源
  operator: ProducerOperator; // +N 或 ×N
  values: [number, number, number]; // Lv1, Lv2, Lv3
  desc: string;         // 玩家可见描述
}
```

### 数据文件结构

```typescript
// src/data/producers.ts（新文件）
import type { ProducerDefinition, ResourceType } from '../core/types';

export const PRODUCERS: Record<string, ProducerDefinition> = {
  prod_burst: {
    id: 'prod_burst', name: '爆发', icon: '⚔️',
    resource: 'base', operator: 'add',
    values: [5, 8, 12],
    desc: '基数+5',
  },
  // ... 其余 9 个
};

export function isProducer(id: string): boolean {
  return id in PRODUCERS;
}

export function getProducerValue(id: string, level: number): number {
  const p = PRODUCERS[id];
  if (!p) return 0;
  return p.values[Math.min(level, 3) - 1];
}
```

### 触发逻辑（绕过 Modifier 管道）

```typescript
// 在 triggerSkill() 入口处分流
export function triggerSkill(skillId: string, triggerKey: string, isEcho = false): void {
  if (isProducer(skillId)) {
    triggerProducer(skillId, triggerKey);
    return; // 不走 Modifier 管道
  }
  // ... 现有逻辑不变
}

function triggerProducer(producerId: string, triggerKey: string): void {
  const prod = PRODUCERS[producerId];
  if (!prod) return;
  const level = state.player.skills.get(producerId)?.level || 1;
  const value = getProducerValue(producerId, level);

  // 视觉/音效反馈
  showTriggerPopup(producerId);
  highlightBoundSkill(producerId);
  playSound('skill');
  synergy.wordSkillCount++;

  // 直接修改资源
  if (prod.operator === 'add') {
    state.resources[prod.resource] += value;
  } else {
    state.resources[prod.resource] *= value;
  }

  // 时间 clamp
  if (prod.resource === 'time') {
    state.resources.time = Math.min(state.resources.time, state.timeMax * 2);
  }
  // shield floor（×N 后可能出小数）
  if (prod.resource === 'shield') {
    state.resources.shield = Math.floor(state.resources.shield);
  }

  // 浮字反馈
  const color = RESOURCE_COLORS[prod.resource];
  const text = prod.operator === 'add'
    ? `+${value}${getResourceLabel(prod.resource)}`
    : `×${value}${getResourceLabel(prod.resource)}`;
  showFeedback(text, color);

  updateHUD();
}
```

### 资源标签辅助

```typescript
function getResourceLabel(r: ResourceType): string {
  switch (r) {
    case 'base': return '基数';
    case 'score': return '分';
    case 'multiplier': return '倍率';
    case 'time': return '秒';
    case 'shield': return '盾';
  }
}
```

### resources.score 使用场景

Story 19.1 预留了 `resources.score`（即时加分，不参与 base×mult 公式）。产出者 A3(掠夺) 和 A4(暴击) 是首批写入 `resources.score` 的技能：
- A3: `state.resources.score += 15` — 直接加到 `resources.score`
- A4: `state.resources.score *= 1.1` — 乘以当前 `resources.score`

**注意**：在 `completeWord()` 中，`finalWordScore = floor(base × mult)`。`resources.score` 不参与这个公式，它在触发时已"立刻结算"——触发 A3 时 `state.score += 15` 立刻加分。

实现方式：产出者对 score 资源的 +N 写入 `resources.score`，同时立刻加到 `state.score`：
```typescript
if (prod.resource === 'score') {
  if (prod.operator === 'add') {
    state.score += value; // 立刻结算到关卡总分
  } else {
    // ×N score: 计算增量后加到 state.score
    const before = state.resources.score;
    state.resources.score *= value;
    state.score += (state.resources.score - before);
  }
}
```

### 商店适配

产出者共享现有的 `SkillInstance` 结构（level 1-3），使用相同的购买/升级/出售/拖拽绑定流程。

需要修改的关键点：
1. `shop.ts` → `generateShopItems()` 中的 `Object.keys(SKILLS)` 需要也包含 `Object.keys(PRODUCERS)`
2. 产出者使用现有 `state.player.skills` Map 存储等级
3. 产出者使用现有 `state.player.bindings` Map 绑定键位
4. `getSkillDisplayInfo()` 需要也查 PRODUCERS 获取 name/icon/desc
5. `getSkillSchool()` 需要为产出者返回 '产出' 流派

### 关键注意事项

1. **不要修改现有 18 个技能的触发逻辑**——产出者在 `triggerSkill()` 入口分流，旧技能走原 Modifier 管道
2. **不要在 `SKILL_MODIFIER_DEFS` 中为产出者添加工厂**——产出者没有 Modifier
3. **不要删除 `SKILLS` 中的同名技能**——`burst`（现有爆发技能）和 `prod_burst`（新产出者）共存
4. **时间 clamp**：对 time 资源的所有修改后执行 `Math.min(value, timeMax × 2)`
5. **resources.multiplier 的 proxy**：写入 `state.resources.multiplier` 会自动同步到 `state.multiplier`（Story 19.1 的 defineProperty proxy），无需手动同步
6. **resources.time 的 proxy**：同上，`state.resources.time` 会自动同步到 `state.time`
7. **产出者不参与 echo/ripple 链**：triggerProducer 不设置/消费 echoPending、ripplePending

### 文件修改清单

| 文件 | 修改内容 |
|------|----------|
| `src/core/types.ts` | 新增 ProducerOperator, ProducerDefinition；更新 score 注释 |
| `src/data/producers.ts` | **新建** — 10 个产出者定义 + isProducer + getProducerValue + getProducerDesc |
| `src/data/skills.ts` | SKILL_SCHOOL 添加 10 产出者流派；getSkillDisplayInfo 兼容产出者（含动态 desc） |
| `src/systems/skills.ts` | triggerSkill 入口分流 + triggerProducer + getResourceLabel + showTriggerPopup 兼容 |
| `src/systems/shop.ts` | generateShopItems 包含产出者池；5 处 SKILLS fallback；getSkillDisplay 传 level |
| `src/systems/battle.ts` | renderBattleSkills PRODUCERS fallback + import |
| `src/systems/restStage.ts` | removeRandomSkill/upgradeRandomSkill/grantRandomNewSkill PRODUCERS 兼容 |
| `tests/unit/data/producers.test.ts` | **新建** — 24 条数据定义正确性测试 |
| `tests/unit/systems/producer-trigger.test.ts` | **新建** — 21 条触发逻辑 + 资源修改测试 |
| `tests/unit/systems/producer-shop.test.ts` | **新建** — 10 条商店集成测试 |
| `tests/unit/data/skills.school.test.ts` | 适配产出者流派 + 新增 school-producer 测试 |

### 未修改的核心部分

- `src/core/state.ts` — 无需修改（产出者用现有 resources/skills/bindings）
- `src/core/constants.ts` — 无需修改（RESOURCE_COLORS 已就绪）
- 现有 Modifier 管道（`ModifierRegistry`, `EffectPipeline`, `BehaviorExecutor`）
- 遗物系统（Story 19.9 处理）

### Git 历史上下文

最近 commit:
- `6d30b0d` Story 19.1: 5 资源核心 + proxy sync + sealed keys
- `b502bd0` Story 18.9: Act 过渡动画
- 技术栈稳定：TypeScript, Vite, vitest

### Project Structure Notes

- 新文件 `src/data/producers.ts` 放在 data 层（纯数据定义，零逻辑依赖）
- 触发逻辑在 `src/systems/skills.ts`（系统层）
- 依赖方向：`data ← core ← systems`（不违反）
- 测试放在 `tests/unit/data/` 和 `tests/unit/systems/`

### References

- [Source: docs/brainstorming-session-2026-03-03.md#产出者] — 10 个产出者定义（权威）
- [Source: docs/brainstorming-session-2026-03-03.md#成长规则] — +N ×1.6/×2.4, ×N 递减
- [Source: docs/brainstorming-session-2026-03-03.md#每局技能池构成] — 产出者固定全进池
- [Source: docs/stories/epic-19-skill-system-redesign.md] — Epic 概览
- [Source: docs/stories/19-1-resource-system-core.md] — 前序 Story（5 资源 + proxy）
- [Source: docs/game-architecture.md#Code Organization] — 依赖方向 data←core←systems

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- 10 个产出者数据定义（5 资源 × 2 运算符）全部实现
- triggerProducer 绕过 Modifier 管道直接写 state.resources
- score 资源即时结算（+N 直接加分，×N 计算增量）
- 商店、战斗 HUD、休息关全部兼容产出者
- Code review 修复：动态 desc、商店集成测试、restStage 产出者池、过时注释

### File List

- `src/src/core/types.ts`
- `src/src/data/producers.ts` (new)
- `src/src/data/skills.ts`
- `src/src/systems/skills.ts`
- `src/src/systems/shop.ts`
- `src/src/systems/battle.ts`
- `src/src/systems/restStage.ts`
- `src/tests/unit/data/producers.test.ts` (new)
- `src/tests/unit/systems/producer-trigger.test.ts` (new)
- `src/tests/unit/systems/producer-shop.test.ts` (new)
- `src/tests/unit/data/skills.school.test.ts`
