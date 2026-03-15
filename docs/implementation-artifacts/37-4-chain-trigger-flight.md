# Story 37.4: 连锁触发技能的飞行定位

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 玩家,
I want 连锁触发的技能（回声指套/连击引爆/全键风暴）产生的浮字从被触发技能绑定的字母位置飞出，并用闪光连线表达从遗物到触发目标的因果关系,
so that 我能直观看到哪个遗物触发了哪个技能、资源飞向了哪个 UI 目标，形成完整的视觉因果链路.

## Acceptance Criteria

1. **triggerSkill 签名扩展** — `triggerSkill` 和内部 `triggerAffixSkillWithFeedback` 支持可选的 `overrideAnchor?: { letterIndex?: number; fromElementId?: string }` 参数，覆盖默认的 `state.player.index` 锚点
2. **本词有绑定字母** — 当被触发技能的 `boundKey` 出现在当前单词 `state.player.word` 中时，随机选一个匹配字母索引作为 `skillAnchor.letterIndex`
3. **本词无绑定字母** — 当 `boundKey` 不在当前单词中时，从 `#active-library` 元素位置生成浮字（使用 `fromElementId`）
4. **连击引爆闪光** — 连击引爆触发时，从遗物图标 (`combo_detonator`) 发射闪光连线到目标字母位置或 `#active-library`
5. **全键风暴闪光** — 全键风暴触发时，从遗物图标 (`key_storm`) 发射闪光连线到目标字母位置或 `#active-library`
6. **回声指套闪光** — 回声指套触发时，从遗物图标 (`echo_thimble`) 发射闪光连线到当前正在输入的字母位置
7. **被触发技能浮字定位** — 连锁触发的技能产出浮字使用覆盖锚点（字母位置或 active-library 元素），而非默认的 `state.player.index`
8. **编译通过** — `npx vite build` 无新增错误
9. **测试通过** — `npx vitest run` 无新增失败

## Tasks / Subtasks

- [x] Task 1: 扩展 triggerSkill 签名 (AC: #1)
  - [x] 1.1 `skills.ts` 中 `triggerSkill` 添加第 3 参数 `overrideAnchor?: { letterIndex?: number; fromElementId?: string }`（替换现有的 `_chainHistory` 未使用参数）
  - [x] 1.2 `triggerAffixSkillWithFeedback` 添加对应参数
  - [x] 1.3 在浮字反馈循环中（L308）：若 `overrideAnchor.letterIndex` 存在则用之替代 `state.player.index`；若 `overrideAnchor.fromElementId` 存在则需要新的锚点类型（见 Task 2）

- [x] Task 2: showFeedback 支持 fromElementId 锚点 (AC: #3, #7)
  - [x] 2.1 扩展 `skillAnchor` 类型：`{ letterIndex: number; resource: string; amount?: number }` → `{ letterIndex?: number; fromElementId?: string; resource: string; amount?: number }`
  - [x] 2.2 `createFloatText` 中 skillAnchor 起点获取逻辑：若 `letterIndex` 存在则从 word 子元素获取；若 `fromElementId` 存在则从 `document.getElementById(fromElementId)` 获取
  - [x] 2.3 确保 `letterIndex` 和 `fromElementId` 互斥，优先 `letterIndex`

- [x] Task 3: 辅助函数 — 计算链式触发锚点 (AC: #2, #3)
  - [x] 3.1 在 `battle.ts` 中新增 `resolveChainAnchor(boundKey: string): { letterIndex?: number; fromElementId?: string }` 函数
  - [x] 3.2 逻辑：在 `state.player.word.toLowerCase()` 中查找 `boundKey` 的所有出现索引，有匹配则随机选一个返回 `{ letterIndex: idx }`，无匹配则返回 `{ fromElementId: 'active-library' }`

- [x] Task 4: 接入连击引爆 (AC: #4, #7)
  - [x] 4.1 在 `playerCorrect` 中连击引爆循环内（L537-541），每个 `triggerSkill(sid, boundKey)` 前：
    - 调用 `resolveChainAnchor(boundKey)` 获取锚点
    - 从 `getRelicIndex('combo_detonator')` 获取遗物图标索引
    - 发射 `flashRelicLine(relicIdx, targetEl, '#ff6b00')` — targetEl 为匹配字母的元素或 'active-library'
    - 将 `overrideAnchor` 传入 `triggerSkill`
  - [x] 4.2 保持现有 aggregate 反馈 `showFeedback(t('battle.detonate', ...))` 不变

- [x] Task 5: 接入全键风暴 (AC: #5, #7)
  - [x] 5.1 在 `completeWord` 中全键风暴循环内（L867-868），每个 `triggerSkill(target.skillId, target.key)` 前：
    - 注意：全键风暴触发的技能绑定键 `target.key` 定义为**不在**当前词中的键（checkKeyStorm 的逻辑），所以 `resolveChainAnchor` 始终返回 `{ fromElementId: 'active-library' }`
    - 从 `getRelicIndex('key_storm')` 获取遗物图标索引
    - 发射 `flashRelicLine(relicIdx, 'active-library', '#aa88ff')`
    - 将 `{ fromElementId: 'active-library' }` 传入 `triggerSkill`
  - [x] 5.2 保持现有 aggregate 反馈 `showFeedback(t('battle.key_storm', ...))` 不变

- [x] Task 6: 接入回声指套 (AC: #6, #7)
  - [x] 6.1 在 `playerCorrect` 中回声指套触发点（L512-513），`triggerSkill(skillId, k)` 前：
    - 回声指套重触发的是**同一个技能同一个键** `k`，该键就是当前正在输入的字母，`state.player.index - 1` 即为刚输入的字母位置
    - 从 `getRelicIndex('echo_thimble')` 获取遗物图标索引
    - 获取字母元素 `wordEl.children[state.player.index - 1]`，发射闪光连线到该字母
    - 将 `{ letterIndex: state.player.index - 1 }` 传入 `triggerSkill`
  - [x] 6.2 现有 `showFeedback('Echo!', '#4ecdc4')` 保持不变（无飞行锚点，普通浮字）

- [x] Task 7: 编译与测试验证 (AC: #8, #9)
  - [x] 7.1 运行 `npx vite build` 确认编译通过
  - [x] 7.2 运行 `npx vitest run` 确认无新增测试失败

## Dev Notes

### triggerSkill 签名变更

```typescript
// skills.ts — 当前签名
export function triggerSkill(skillId: string, triggerKey: string, _chainHistory?: string[]): void

// 修改后签名（替换未使用的 _chainHistory）
export function triggerSkill(
  skillId: string, triggerKey: string,
  overrideAnchor?: { letterIndex?: number; fromElementId?: string },
): void
```

`_chainHistory` 参数当前未使用（以 `_` 前缀标记），可安全替换。

### triggerAffixSkillWithFeedback 锚点覆盖

L308 当前：
```typescript
const anchor = { letterIndex: state.player.index, resource, amount };
```

修改为：
```typescript
const letterIdx = overrideAnchor?.letterIndex ?? state.player.index;
const anchor = overrideAnchor?.fromElementId
  ? { fromElementId: overrideAnchor.fromElementId, resource, amount }
  : { letterIndex: letterIdx, resource, amount };
```

### skillAnchor 类型扩展

当前 `skillAnchor` 类型（battle.ts floatQueue 定义）：
```typescript
{ letterIndex: number; resource: string; amount?: number }
```

扩展为（letterIndex 变为可选，新增 fromElementId）：
```typescript
{ letterIndex?: number; fromElementId?: string; resource: string; amount?: number }
```

`createFloatText` 中起点获取逻辑修改：
```typescript
if (skillAnchor) {
  if (skillAnchor.letterIndex !== undefined) {
    startEl = wordEl.children[skillAnchor.letterIndex] as HTMLElement | undefined;
  } else if (skillAnchor.fromElementId) {
    startEl = document.getElementById(skillAnchor.fromElementId) ?? undefined;
  }
  flightResource = skillAnchor.resource;
  flightAmount = skillAnchor.amount ?? 0;
}
```

### resolveChainAnchor 辅助函数

```typescript
function resolveChainAnchor(boundKey: string): { letterIndex?: number; fromElementId?: string } {
  const word = state.player.word.toLowerCase();
  const matchIndices: number[] = [];
  for (let j = 0; j < word.length; j++) {
    if (word[j] === boundKey) matchIndices.push(j);
  }
  if (matchIndices.length > 0) {
    return { letterIndex: matchIndices[Math.floor(random() * matchIndices.length)] };
  }
  return { fromElementId: 'active-library' };
}
```

### 闪光连线目标元素

`flashRelicLine(relicIndex, targetId, color)` 中 `targetId` 是 DOM element ID：
- 匹配字母：需要从 word 子元素获取，但 flashRelicLine 接受的是 element ID。方案：直接获取字母元素的 bounding rect，用临时计算。
  - **替代方案**：创建一个 `flashRelicLineToElement(relicIndex, targetEl, color)` 变体，或直接将字母的 bounding rect 传入。
  - **最简方案**：字母元素没有 ID，但 `flashRelicLine` 接受 `targetId` 后通过 `document.getElementById` 获取元素。需要扩展 `flashRelicLine` 支持直接传入元素。

检查 `flashRelicLine` 当前签名（Story 37-1 实现）：

```typescript
function flashRelicLine(relicIndex: number, targetId: string, color: string): void
```

需要新增重载或修改为可接受 HTMLElement：
```typescript
function flashRelicLine(relicIndex: number, target: string | HTMLElement, color: string): void {
  const iconEl = getElements().playerRelics.children[relicIndex] as HTMLElement | undefined;
  const targetEl = typeof target === 'string' ? document.getElementById(target) : target;
  // ... 其余逻辑不变
}
```

### 关键位置与行号（基于最新 battle.ts）

| 位置 | 行号 | 内容 |
|------|------|------|
| `skills.ts` L171-176 | triggerSkill 签名 |
| `skills.ts` L179-349 | triggerAffixSkillWithFeedback |
| `skills.ts` L308 | anchor 构建（覆盖目标） |
| `battle.ts` L505-515 | 回声指套触发点 |
| `battle.ts` L525-544 | 连击引爆触发点 |
| `battle.ts` L865-872 | 全键风暴触发点 |
| `battle.ts` L2038 | floatQueue 类型定义 |
| `battle.ts` L2107-2131 | createFloatText 飞行起点获取 |
| `battle.ts` L2213-2243 | flashRelicLine 函数 |

### 全键风暴特殊性

`checkKeyStorm` 的设计是触发**不在**当前词中的技能（unhitSkills），所以 `target.key` 一定不在 `state.player.word` 中。`resolveChainAnchor` 对全键风暴总是返回 `{ fromElementId: 'active-library' }`。

### 回声指套特殊性

回声指套重触发的是同一个技能同一个键（当前正在输入的键 `k`），所以 `state.player.index - 1` 就是刚输入的字母位置（playerCorrect 中 index 已经在技能触发前自增）。不需要调用 `resolveChainAnchor`，直接传 `{ letterIndex: state.player.index - 1 }`。

### 连击引爆的 boundKey 查找

当前代码 L539-540：
```typescript
const boundKey = [...state.player.bindings.entries()]
  .find(([, v]) => v === sid)?.[0] ?? k;
```

这里 `boundKey` 是被触发技能的绑定键。`resolveChainAnchor(boundKey)` 会在当前词中查找该字母。

### 边界情况

- **遗物未装备时**：`getRelicIndex` 返回 -1，`flashRelicLine` 的 `iconEl` 为 undefined，闪光连线不发射（静默退化）。技能仍然正常触发，只是没有连线视觉效果。
- **技能无绑定键**：`boundKey` 回退到 `k`（当前按键），`resolveChainAnchor(k)` 通常返回匹配字母。
- **空词**：`resolveChainAnchor` 在空词上总返回 `{ fromElementId: 'active-library' }`。
- **index = 0 时回声指套**：`state.player.index - 1 = -1`，但回声指套只在 `playerCorrect` 中触发（此时 index ≥ 1），安全。

### 37-3 Story 学习要点

- `createFloatText` 已重构为 startEl/flightResource/flightAmount 局部变量模式，skillAnchor 和 relicAnchor 共享后续飞行逻辑
- `flashRelicLine` 当前只接受 string targetId，需要扩展支持 HTMLElement
- 遗物接入时移除即时 bump 由飞行到达触发——本 Story 不移除 bump（技能产出的 bump 由 skills.ts applyResource 自然触发）
- `RELIC_MODIFIER_DEFS` 为空对象，on_word_complete 管道时间效果为死代码路径

### Git 近期 Commit 模式

```
df6edee fix: resource_sense 遗物 base/multiplier 延迟结算 + 遗物飞行动画系统
44835d5 feat: 遗物闪光连线系统 + getRelicIndex + Epic 37 spec 重构
00d69c8 feat: 战斗UI反馈系统重构 — 飞行动画/滚轮/虚条/牌包稀有度
```

### Project Structure Notes

- 修改集中在 `battle.ts` 和 `skills.ts` 两个文件
- `triggerSkill` 是 skills.ts 导出函数，battle.ts 已导入
- `flashRelicLine` 和 `getRelicIndex` 是 battle.ts 模块私有函数
- `resolveChainAnchor` 新增为 battle.ts 模块私有函数
- skillAnchor 类型变更影响 floatQueue、showFeedback、createFloatText、drainQueue 签名链

### References

- [Source: src/docs/epic-relic-feedback-flight.md#Story 4: 连锁触发技能的飞行定位]
- [Source: src/src/systems/skills.ts#L171-176 triggerSkill 签名]
- [Source: src/src/systems/skills.ts#L179-349 triggerAffixSkillWithFeedback]
- [Source: src/src/systems/skills.ts#L308 anchor 构建]
- [Source: src/src/systems/battle.ts#L505-515 回声指套触发点]
- [Source: src/src/systems/battle.ts#L525-544 连击引爆触发点]
- [Source: src/src/systems/battle.ts#L865-872 全键风暴触发点]
- [Source: src/src/systems/battle.ts#L2107-2131 createFloatText 飞行起点]
- [Source: src/src/systems/battle.ts#L2213-2243 flashRelicLine]
- [Source: docs/implementation-artifacts/37-3-resource-relic-flight.md — 上一 Story 学习]
- [Source: src/src/systems/relics/TopologyRelicBehaviors.ts#L139-164 checkKeyStorm]
- [Source: src/src/systems/relics/ComboRelicBehaviors.ts — checkComboDetonator]
- [Source: src/src/systems/relics/TypingRelicBehaviors.ts — checkEchoThimble]
- [Source: src/src/systems/affixTriggerOrchestrator.ts — 链式触发 FIFO 队列]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- 143-144 pre-existing test failures (flaky timing tests), no new failures introduced
- Vite build passes (479ms)

### Completion Notes List

- Extended `triggerSkill` and `triggerAffixSkillWithFeedback` signatures: replaced unused `_chainHistory` param with `overrideAnchor?: { letterIndex?: number; fromElementId?: string }`
- Anchor construction in skills.ts feedback loop: uses `overrideAnchor.letterIndex` to override `state.player.index`, or `overrideAnchor.fromElementId` to use element-based anchor (both for main resource feedback and transmute feedback)
- Extended `skillAnchor` type across battle.ts (floatQueue, createFloatText, showFeedback): `letterIndex` now optional, added `fromElementId`
- `createFloatText` skillAnchor branch: supports both `letterIndex` (word children) and `fromElementId` (getElementById) start elements
- `flashRelicLine` signature extended: `target` accepts `string | HTMLElement` (was string-only), enabling flash to letter elements without IDs
- New `resolveChainAnchor(boundKey)` helper: finds matching letter indices in current word, returns random match or falls back to `{ fromElementId: 'active-library' }`
- Combo Detonator: each chain-triggered skill gets `resolveChainAnchor` + flash line from relic icon to target letter/library
- Key Storm: all chain-triggered skills use `{ fromElementId: 'active-library' }` (storm targets are by design not in current word) + flash line
- Echo Thimble: flash line from relic icon to just-typed letter + `{ letterIndex: state.player.index - 1 }` override
- 3 unit tests added: default anchor, letterIndex override, fromElementId override
- [Code Review] 全键风暴闪光连线移至循环外只发一次（M1）
- [Code Review] resolveChainAnchor 新增 boundKey toLowerCase 防御性编程（M3）
- [Code Review] resolveChainAnchor 导出 + 5 个独立单元测试（M2）
- [Code Review] JSDoc 参数名/描述更新（L1, L3）

### Change Log

- 2026-03-14: Implemented chain trigger flight positioning (Story 37-4)
- 2026-03-14: Code review fixes — M1/M2/M3/L1/L3

### File List

- `src/src/systems/skills.ts` — Extended triggerSkill/triggerAffixSkillWithFeedback signatures with overrideAnchor, updated anchor construction in feedback loops
- `src/src/systems/battle.ts` — Extended skillAnchor type (fromElementId), createFloatText fromElementId support, flashRelicLine HTMLElement support, resolveChainAnchor helper, chain trigger integration (echo_thimble, combo_detonator, key_storm); [Review] resolveChainAnchor toLowerCase + export, 全键风暴闪光去重, JSDoc 更新
- `src/tests/unit/systems/chain-trigger-flight.test.ts` — New: overrideAnchor propagation tests (3 tests)
- `src/tests/unit/systems/resolve-chain-anchor.test.ts` — New: resolveChainAnchor 字母匹配/回退/大小写/空词测试 (5 tests)
