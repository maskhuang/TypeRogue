# Story 23.3: 增幅者触发与叠层机制

Status: done

## Story

As a 玩家,
I want 按下绑定增幅者的键位时自动叠层，跨词累积直到过关清零,
so that 我感受到关内"冷启动→引擎轰鸣"的滚雪球节奏.

## Acceptance Criteria

1. 按下绑定增幅者的键位时，该增幅者 stacks +1（每次按键 +1）
2. 叠层存储在 `state.amplifierStacks`（Map），跨词保持、过关清零（已有，需验证）
3. `triggerAmplifier(ampId, triggerKey)` 函数：增加 stacks，触发反馈弹窗和音效
4. 增幅者触发不产出任何资源、不触发连接者链式反应（纯辅助叠层）
5. `triggerSkill()` 分派逻辑正确处理增幅者（调用 triggerAmplifier，无 checkResourceTriggers / checkResonanceTriggers）
6. 叠层触发弹窗显示增幅者图标 + 当前层数（如 `🔱 ×3`）
7. 单元测试验证：叠层递增、零资源产出、跨词保持、过关清零、triggerSkill 分派

## Tasks / Subtasks

- [x] Task 1: 实现 triggerAmplifier 函数 (AC: 1, 3, 4, 6)
  - [x] 1.1 `systems/skills.ts` — 导入 `isAmplifier`, `AMPLIFIERS` from `data/amplifiers`
  - [x] 1.2 `systems/skills.ts` — 实现 `triggerAmplifier(ampId, triggerKey)`：读取当前层数 → +1 → set 回 amplifierStacks
  - [x] 1.3 叠层触发弹窗：复用 `showTriggerPopup` 模式，但额外显示当前层数（`${icon} ×${stacks}`）
  - [x] 1.4 确保无资源修改：不操作 synergy/state.resources，不调用 checkResourceTriggers/checkResonanceTriggers
- [x] Task 2: 集成 triggerSkill 分派 (AC: 5)
  - [x] 2.1 `systems/skills.ts` — 在 `triggerSkill()` 中添加增幅者分支：`isAmplifier(skillId)` → `triggerAmplifier(skillId, triggerKey)` → return（不触发链式）
- [x] Task 3: 单元测试 (AC: 7)
  - [x] 3.1 `tests/unit/systems/amplifier-trigger.test.ts` — 测试 triggerAmplifier 正确递增 amplifierStacks
  - [x] 3.2 测试连续多次触发叠层累积（5 次 → stacks=5）
  - [x] 3.3 测试触发后零资源变化（base/score/multiplier/time/shield/gold 均不变）
  - [x] 3.4 测试 triggerSkill 对增幅者 ID 调用 triggerAmplifier（而非 triggerProducer/Converter）
  - [x] 3.5 测试增幅者触发不调用 checkResourceTriggers（无链式反应）
  - [x] 3.6 验证 startLevel() 清零 amplifierStacks（已有行为，回归验证）

## Dev Notes

### 核心设计：叠层即投资

增幅者占键位但不产出资源，每次按键只做一件事：stacks +1。
这创造了「投资 buff vs 直接产出」的张力 — 玩家选择牺牲一个产出键位换取后续全局增幅。

**关内节奏：**
- 开局 0 层 → 冷启动，增幅者相当于空键位
- 中期 20-30 层 → 引擎预热，加法型增幅可见回报
- 后期 50+ 层 → 乘法型增幅指数爆发

### triggerAmplifier 实现规格

```typescript
// 伪代码参考
function triggerAmplifier(ampId: string, triggerKey: string): void {
  const amp = AMPLIFIERS[ampId];
  if (!amp) return;

  // 叠层 +1
  const current = state.amplifierStacks.get(ampId) || 0;
  const newStacks = current + 1;
  state.amplifierStacks.set(ampId, newStacks);

  // 统计
  synergy.wordSkillCount++;

  // 反馈弹窗（显示图标 + 层数）
  showAmplifierPopup(ampId, newStacks);

  // 事件通知（键盘动画）
  eventBus.emit('skill:triggered', { key: triggerKey, skillId: ampId });
}
```

### triggerSkill 分派模式

参照现有三分支结构（producer → converter → connector），添加第四分支：

```typescript
// 在 triggerSkill() 末尾，connector 之后
if (isAmplifier(skillId)) {
  triggerAmplifier(skillId, triggerKey);
  // 不调用 checkResourceTriggers — 增幅者不产出资源
  // 不调用 checkResonanceTriggers — 增幅者不触发共鸣
  return;
}
```

**关键区别：**
- Producer/Converter 触发后会调用 `checkResourceTriggers` + `checkResonanceTriggers` 实现链式反应
- Amplifier 触发后直接 return，不参与链式

### 叠层弹窗设计

复用 `showTriggerPopup()` 的 DOM 弹窗模式，但区分增幅者显示：

```typescript
function showAmplifierPopup(ampId: string, stacks: number): void {
  const display = getSkillDisplayInfo(ampId);
  const p = document.createElement('div');
  p.className = 'skill-trigger-popup amplifier-stack';
  p.innerHTML = `<span class="trigger-icon">${display.icon}</span><span class="stack-count">×${stacks}</span>`;
  // 定位和动画同 showTriggerPopup
}
```

### 现有代码定位

| 文件 | 说明 |
|------|------|
| `src/src/systems/skills.ts` | 主要修改：triggerSkill() 分派 + triggerAmplifier() 函数 |
| `src/src/systems/skills.ts:682-718` | triggerSkill() — 四分支分派（producer/converter/connector/amplifier）|
| `src/src/systems/skills.ts:720-733` | showTriggerPopup() — 弹窗模式参考 |
| `src/src/systems/skills.ts:158-226` | triggerProducer() — 参考资源修改 + 统计 + 事件模式 |
| `src/src/systems/skills.ts:654-680` | triggerAmplifier() — 增幅者叠层 + 弹窗 |
| `src/src/data/amplifiers.ts` | AMPLIFIERS 数据 + isAmplifier() 工具函数 |
| `src/src/core/types.ts` | AmplifierDefinition 接口，GameState.amplifierStacks |
| `src/src/systems/battle.ts:675` | startLevel() 中 state.amplifierStacks.clear() — 已实现 |

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `data/amplifiers.ts` | 数据已在 23.2 完成 |
| `core/types.ts` | 接口已在 23.1 定义 |
| `core/state.ts` | amplifierStacks 已在 23.1 初始化 |
| `systems/battle.ts` | amplifierStacks.clear() 已在 23.1 实现 |
| `ui/keyboard/*` | 键盘可视化在 Story 23.5 |

### 测试策略

**mock 方案：** 需要 mock `state` 对象（player.bindings, amplifierStacks, resources）和 `synergy` 对象。参考现有 `tests/unit/systems/producer-trigger.test.ts` 的 mock 模式。

**注意事项：**
- triggerAmplifier 依赖 `state.amplifierStacks`（Map）和 `synergy.wordSkillCount`
- 需验证资源零变化：调用前后 snapshot `state.resources` 做深比较
- triggerSkill 分派测试可通过 spy/mock triggerAmplifier 验证调用

### Project Structure Notes

- 修改 1 个文件：`src/src/systems/skills.ts`（添加增幅者分派 + triggerAmplifier 函数）
- 新增 1 个测试文件：`src/tests/unit/systems/amplifier-trigger.test.ts`
- 依赖方向不变：`systems → data → core`

### Previous Story Intelligence

Story 23.1 建立：
- `state.amplifierStacks: Map<string, number>` 跨词保持
- `startLevel()` 中 `state.amplifierStacks.clear()` 过关清零
- `isAmplifier()` 类型检查函数

Story 23.2 建立：
- 8 个增幅者数据（AMPLIFIERS 常量已填充）
- `getAmplifierValue(id, level)` 等级缩放（Story 23.4 使用，本 story 不需要）
- emoji 冲突修复：🔱/✴️/🔊

Code Review 修复：
- `level == null` 不短路（23.1）
- `as const` 添加（23.2）
- desc 一致性测试（23.2）

### References

- [Source: docs/epics.md#Story 23.3 — 增幅者触发与叠层机制]
- [Source: docs/brainstorming-session-2026-03-05.md#Section E+ — 增幅者设计]
- [Source: src/src/systems/skills.ts:654-683 — triggerSkill 分派逻辑]
- [Source: src/src/systems/skills.ts:686-698 — showTriggerPopup 弹窗模式]
- [Source: src/src/systems/battle.ts:675 — amplifierStacks.clear()]
- [Source: docs/stories/23-2-amplifier-skill-data.md — 前置 story 完成记录]
- [Source: docs/stories/23-1-amplifier-data-structure.md — 数据结构 story]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References

### Completion Notes List
- Task 1: 实现 triggerAmplifier 函数
  - 导入 AMPLIFIERS + isAmplifier from data/amplifiers
  - 叠层 +1 via state.amplifierStacks Map
  - 弹窗显示 icon + ×stacks（inline DOM 创建，不复用 showTriggerPopup）
  - synergy.wordSkillCount++ 统计 + playSound/showFeedback 音效反馈
  - 零资源修改：不操作 synergy.skillBaseScore/skillMultBonus/state.resources
- Task 2: triggerSkill 第四分支 — isAmplifier → triggerAmplifier → return（无 checkResourceTriggers/checkResonanceTriggers）
- Task 3: 9 个单元测试覆盖全部 AC
  - 叠层递增（首次/连续5次/多个独立）、wordSkillCount 递增
  - 零资源变化（10 个字段全量快照对比）
  - triggerSkill 分派验证（stacks +1、资源不变、无链式反应）
  - startLevel() amplifierStacks.clear() 回归
- 回归测试: 2452/2457 通过，5 个失败为预存 producer/converter 测试问题（与本 story 无关）
- Code Review 修复（3M + 4L）:
  - [M1] Story Status 同步: ready-for-dev → done
  - [M2] Test 3.6 增加 clearSpy 验证 + 测试名称准确化
  - [M3] 新增无效 ID 边界测试（guard clause 覆盖）→ 10 个测试
  - [L1] Completion Notes 修正: eventBus → playSound/showFeedback
  - [L2] 移除测试文件死导入 AMPLIFIERS
  - [L3] Dev Notes 行号引用更新（654→682 等）
  - [L4] showTriggerPopup 添加 AMPLIFIERS 查找支持
- 修复后回归: 2453/2458 通过（+1 新测试），5 个预存失败不变

### File List
- `src/src/systems/skills.ts` — 添加 triggerAmplifier() 函数 + triggerSkill() 增幅者分支
- `src/tests/unit/systems/amplifier-trigger.test.ts` — 新增 9 个增幅者触发测试
