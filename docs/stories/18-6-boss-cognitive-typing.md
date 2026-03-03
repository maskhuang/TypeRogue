---
title: "Story 18.6: Boss 实现 — 认知类（乱序 / 倒序 / 残缺）"
epic: "Epic 18: Boss 战与 Act 结构"
story_key: "18-6-boss-cognitive-typing"
status: "done"
created: "2026-03-02"
depends_on: ["18-4-boss-modifier-framework"]
---

# Story 18.6: Boss 实现 — 认知类（乱序 / 倒序 / 残缺）

## Story

作为一个 **玩家**，
我想要 **面对 3 种认知类打字 Boss 修饰器（乱序、倒序、残缺）**，
以便 **Boss 关和精英关通过改变词语本身或输入规则增加打字难度，要求玩家处理变形后的词语**。

## Acceptance Criteria

- [x] AC1: boss_scramble — 字母打乱显示，玩家按乱序打；精英版保留首尾字母仅打乱中间
- [x] AC2: boss_reverse — 词语倒序显示，玩家从左到右打倒序词；精英与满功率相同
- [x] AC3: boss_masked — 随机 30% 字母显示为 `?`，玩家需凭记忆打完整词；精英 15%
- [x] AC4: 三种修饰器均支持 `isElite` 减弱参数
- [x] AC5: 三种修饰器正确实现 BossModifier 接口（apply/cleanup/getParams/onTick）
- [x] AC6: cleanup() 完全恢复正常词语显示和输入逻辑（无残留副作用）
- [x] AC7: boss_scramble 打乱结果必须与原词不同（长度 ≥3 时）

## Tasks / Subtasks

- [x] Task 1: 扩展 BossModifierParams 参数字段 (AC: 4, 5)
  - [x] 1.1 在 `data/bossModifiers.ts` 的 `BossModifierParams` 接口新增认知类参数字段（scrambleMode、reverseActive、maskRate）
  - [x] 1.2 确保与现有数值类和视觉类参数字段兼容

- [x] Task 2: 实现词语变换函数 (AC: 1, 2, 7)
  - [x] 2.1 在 `data/bossModifiers.ts` 实现 `scrambleWord(word, preserveEnds)` 内部函数
  - [x] 2.2 在 `data/bossModifiers.ts` 导出 `transformWordForModifier(word): string` 供 battle.ts 调用
  - [x] 2.3 scrambleWord 使用 Fisher-Yates shuffle，保证结果与原词不同（重试最多 5 次）

- [x] Task 3: 实现 boss_scramble 修饰器 (AC: 1, 4, 5, 6, 7)
  - [x] 3.1 替换 `createStubModifier('boss_scramble')` 为完整实现
  - [x] 3.2 `getParams(isElite)`: 满功率 scrambleMode=1（全打乱），精英 scrambleMode=2（保留首尾）
  - [x] 3.3 `apply()` / `cleanup()`: 空操作（变换在 transformWordForModifier 中完成）

- [x] Task 4: 实现 boss_reverse 修饰器 (AC: 2, 4, 5, 6)
  - [x] 4.1 替换 `createStubModifier('boss_reverse')` 为完整实现
  - [x] 4.2 `getParams(isElite)`: 满功率和精英都返回 `{ reverseActive: 1 }`（效果相同）
  - [x] 4.3 `apply()` / `cleanup()`: 空操作（变换在 transformWordForModifier 中完成）

- [x] Task 5: 实现 boss_masked 修饰器 (AC: 3, 4, 5, 6)
  - [x] 5.1 替换 `createStubModifier('boss_masked')` 为完整实现
  - [x] 5.2 `getParams(isElite)`: 满功率 maskRate=0.30，精英 maskRate=0.15
  - [x] 5.3 `apply()`: 清空遮罩状态
  - [x] 5.4 `onTick()`: 检测新词时生成随机遮罩位置，将被遮字母 textContent 替换为 `?`（存 data-original），correct 字母恢复原文
  - [x] 5.5 `cleanup()`: 恢复所有字母 textContent 和 data-original

- [x] Task 6: battle.ts 集成 — setWord 词语变换钩子 (AC: 1, 2)
  - [x] 6.1 在 `battle.ts` 的 `setWord()` 中调用 `transformWordForModifier()` 变换词语
  - [x] 6.2 确保变换在 `renderWord()` 之前执行

- [x] Task 7: 测试 (AC: 1-7)
  - [x] 7.1 boss_scramble 测试：getParams 参数、scrambleWord 打乱验证、保留首尾验证
  - [x] 7.2 boss_reverse 测试：getParams 参数、transformWordForModifier 倒序验证
  - [x] 7.3 boss_masked 测试：getParams 参数、onTick 遮罩/揭示逻辑
  - [x] 7.4 cleanup 测试：三种修饰器 cleanup 后恢复
  - [x] 7.5 transformWordForModifier 测试：无修饰器时原样返回
  - [x] 7.6 集成测试：apply → onTick → cleanup 完整生命周期

## Dev Notes

### 关键架构约束

1. **Legacy DOM 系统**：本 Story 修改 Legacy 系统（battle.ts + bossModifiers.ts），不涉及 Pixi 系统
2. **依赖方向**：`data → core → systems → scenes` — 修饰器实现放 `data/bossModifiers.ts`，引擎不变
3. **认知类 vs 视觉类**：18.5 的视觉修饰器仅操作 DOM 样式不改输入逻辑；18.6 的认知修饰器改变词语本身（scramble/reverse）或遮挡字母（masked），需要在 battle.ts setWord() 增加变换钩子
4. **性能约束**：onTick 每 100ms 调用一次，boss_masked 的 DOM 操作要高效

### 已由 18.4 + 18.5 完成的基础设施（不要重复实现）

- `BossModifier` 接口（id, getParams, apply, cleanup, onTick?）[Source: `data/bossModifiers.ts:187-197`]
- `BossModifierParams` 接口（含 6 数值 + 6 视觉参数）[Source: `data/bossModifiers.ts:167-182`]
- `BOSS_MODIFIER_REGISTRY: Record<BossModifierId, BossModifier>` [Source: `data/bossModifiers.ts:391-408`]
- `createStubModifier()` — 当前 4 个打字类修饰器的 no-op 实现 [Source: `data/bossModifiers.ts`]
- `applyModifier()` / `cleanupModifier()` / `tickModifier(dt)` 生命周期管理 [Source: `systems/bossModifierEngine.ts`]
- `startBossRotation()` / `stopBossRotation()` Boss 轮换引擎 [Source: `systems/bossModifierEngine.ts`]
- `setActiveParams()` / `getActiveParams()` 活跃参数查询 [Source: `data/bossModifiers.ts:412-422`]
- battle.ts 中所有 hook 已就位（startLevel、endLevel、timer tick 含 tickModifier(0.1)、playerWrong、completeWord、victory、gameOver）[Source: `systems/battle.ts`]
- CSS transition: `.letter { transition: opacity 0.15s ease }` + `#word-display { transition: transform 0.1s }` [Source: `style.css:188,176`]
- 测试 DOM mock：`createMockLetterEl(cls)` + `mockLetters[]` + `mockWordDisplayStyle` [Source: `tests/unit/systems/bossModifierEngine.test.ts:27-65`]

### 词语渲染系统（CRITICAL — 修饰器操作的目标 DOM）

```typescript
// battle.ts:renderWord() — 每次新词时调用
function renderWord(): void {
  const el = getElements();
  const s = state.player;
  el.word.innerHTML = '';  // el.word = #word-display

  for (let i = 0; i < s.word.length; i++) {
    const span = document.createElement('span');
    span.className = 'letter letter-enter';
    span.textContent = s.word[i];  // 显示 state.player.word 的字符
    span.style.animationDelay = `${i * 0.03}s`;

    if (i < s.index) span.classList.add('correct');
    else if (i === s.index) span.classList.add('current');
    else span.classList.add('pending');

    if (s.bindings.has(s.word[i].toLowerCase())) span.classList.add('has-skill');
    el.word.appendChild(span);
  }
}
```

```typescript
// battle.ts:setWord() — 选词并渲染
function setWord(): void {
  state.player.word = pickWord();   // ← 变换钩子插入点
  state.player.index = 0;
  state.wordScore = 0;
  // ... reset synergy state ...
  renderWord();
}
```

```typescript
// battle.ts:handleKeyPress() — 输入验证（不需要修改！）
const expect = state.player.word[state.player.index]?.toLowerCase();
// scramble/reverse 后 state.player.word 已是变换后的，expect 自动匹配
```

```typescript
// battle.ts:playerCorrect() — 正确输入处理
const letter = el.word.children[state.player.index] as HTMLElement;
letter.classList.remove('current');
letter.classList.add('correct');
// 注意：不改 textContent！boss_masked 的 onTick 负责恢复 correct 字母的原文
state.player.index++;
```

### 三种认知修饰器实现设计（CRITICAL）

#### boss_scramble（🔀 乱序打字）

**效果：** 词语字母随机打乱显示，玩家按打乱后的顺序输入。

**参数：**
- 满功率：`scrambleMode: 1`（全部打乱）
- 精英：`scrambleMode: 2`（保留首尾字母，仅打乱中间）

**实现方式：** 修改 `state.player.word` 为打乱后的词语（在 `setWord()` 中通过 `transformWordForModifier` 完成）。由于 `handleKeyPress` 比较的是 `state.player.word[index]`，打乱后的词语自动成为新的输入目标。

```typescript
const bossScramble: BossModifier = {
  id: 'boss_scramble',
  getParams: (isElite) => ({ scrambleMode: isElite ? 2 : 1 }),
  apply: () => {},
  cleanup: () => {},
}

function scrambleWord(word: string, preserveEnds: boolean): string {
  if (word.length <= 2) return word
  const chars = word.split('')
  const start = preserveEnds ? 1 : 0
  const end = preserveEnds ? chars.length - 1 : chars.length

  // Fisher-Yates shuffle on [start, end)
  for (let i = end - 1; i > start; i--) {
    const j = start + Math.floor(Math.random() * (i - start + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  const result = chars.join('')
  // 确保打乱后与原词不同（最多重试 5 次）
  if (result === word && word.length >= 3) {
    return scrambleWord(word, preserveEnds) // 递归重试（需计数器防无限）
  }
  return result
}
```

**注意事项：**
- 短词（≤2 字母）无法打乱，原样返回
- 全相同字母的词（如 "aaa"）无法产生不同结果，应避免无限递归
- preserveEnds=true 时，"abc" 只有中间 1 个字母，无法打乱

#### boss_reverse（⏪ 倒序输入）

**效果：** 词语倒序显示（"world" → "dlrow"），玩家从左到右打倒序版本。

**参数：**
- 满功率：`reverseActive: 1`
- 精英：`reverseActive: 1`（相同，eliteHint 与 description 一致）

**实现方式：** 修改 `state.player.word` 为倒序字符串。

```typescript
const bossReverse: BossModifier = {
  id: 'boss_reverse',
  getParams: () => ({ reverseActive: 1 }),
  apply: () => {},
  cleanup: () => {},
}
```

`transformWordForModifier` 中：`word.split('').reverse().join('')`

#### boss_masked（🕳️ 残缺词语）

**效果：** 随机选定字母位置显示为 `?`，玩家需凭记忆/猜测输入真实字母。打对后 `?` 恢复为真实字母。

**参数：**
- 满功率：`maskRate: 0.30`（30% 字母被遮）
- 精英：`maskRate: 0.15`（15% 字母被遮）

**实现方式：** 不修改 `state.player.word`（输入验证仍然匹配真实字母）。通过 `onTick()` 操作 DOM：

```typescript
let maskedPositions: Set<number> = new Set()
let maskedForWord: string = ''

const bossMasked: BossModifier = {
  id: 'boss_masked',
  getParams: (isElite) => ({ maskRate: isElite ? 0.15 : 0.30 }),
  apply: () => {
    maskedPositions.clear()
    maskedForWord = ''
  },
  cleanup: () => {
    maskedPositions.clear()
    maskedForWord = ''
    // 恢复所有字母原文
    document.querySelectorAll('#word-display .letter').forEach(el => {
      const htmlEl = el as HTMLElement
      const orig = htmlEl.getAttribute('data-original')
      if (orig) {
        htmlEl.textContent = orig
        htmlEl.removeAttribute('data-original')
      }
    })
  },
  onTick() {
    const params = getActiveParams()
    if (!params?.maskRate) return

    const currentWord = state.player.word
    // 新词时重新生成遮罩位置
    if (currentWord !== maskedForWord) {
      maskedForWord = currentWord
      maskedPositions = generateMaskedPositions(currentWord.length, params.maskRate)
    }

    document.querySelectorAll('#word-display .letter').forEach((el, i) => {
      const htmlEl = el as HTMLElement
      if (el.classList.contains('correct')) {
        // 打对的字母恢复原文
        const orig = htmlEl.getAttribute('data-original')
        if (orig) {
          htmlEl.textContent = orig
          htmlEl.removeAttribute('data-original')
        }
        return
      }
      if (maskedPositions.has(i) && !htmlEl.getAttribute('data-original')) {
        htmlEl.setAttribute('data-original', htmlEl.textContent || '')
        htmlEl.textContent = '?'
      }
    })
  },
}

function generateMaskedPositions(length: number, rate: number): Set<number> {
  const count = Math.max(1, Math.floor(length * rate))
  const positions = new Set<number>()
  const available = Array.from({ length }, (_, i) => i)
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length)
    positions.add(available.splice(idx, 1)[0])
  }
  return positions
}
```

**DOM 状态变化示例（boss_masked, word="FIRE", maskRate=0.5）：**
```
初始: F I R E       (masked positions: {1, 3})
显示: F ? R ?       (textContent 替换，data-original 保存)
打 F: ✓ ? R ?      (F 已 correct)
打 I: F ✓ R ?      (I 恢复原文，显示 correct 样式)
打 R: F I ✓ ?      (R 已 correct)
打 E: F I R ✓      (E 恢复原文)
```

### transformWordForModifier 设计（CRITICAL）

```typescript
// data/bossModifiers.ts 新增导出函数
export function transformWordForModifier(word: string): string {
  const params = getActiveParams()
  if (!params) return word

  if (params.reverseActive) {
    return word.split('').reverse().join('')
  }

  if (params.scrambleMode) {
    return scrambleWord(word, params.scrambleMode === 2)
  }

  return word  // boss_masked 不变换词语本身
}
```

### battle.ts 集成点（CRITICAL — 唯一修改）

**setWord() — 仅需 1 行改动：**

```typescript
// 改前：
state.player.word = pickWord();

// 改后：
state.player.word = transformWordForModifier(pickWord());
```

需要在 battle.ts 顶部添加 import：
```typescript
import { transformWordForModifier } from '../data/bossModifiers'
```

**不需要修改的部分：**
- `handleKeyPress()` — `state.player.word[index]` 已是变换后的字符串，自动匹配
- `playerCorrect()` — index 递增逻辑不变
- `renderWord()` — 读取 `state.player.word`，已是变换后的
- `startTimer()` / `endLevel()` — modifier 生命周期已集成
- `playerWrong()` — 错误处理不变

### BossModifierParams 扩展（CRITICAL）

```typescript
export interface BossModifierParams {
  // 数值规则类（已有）
  decayRate?: number
  comboPunishRate?: number
  scoreCap?: number
  timeSpeed?: number
  targetMultiplier?: number
  diminishRate?: number
  // 视觉类（Story 18.5 已有）
  fadeSpeed?: number
  fadeSpeedEnd?: number
  fadeDuration?: number
  driftAmplitude?: number
  driftFrequency?: number
  spotlightRadius?: number
  // 认知类（Story 18.6 新增）
  scrambleMode?: number       // boss_scramble: 1=全打乱, 2=保留首尾
  reverseActive?: number      // boss_reverse: 1=倒序 (truthy check)
  maskRate?: number            // boss_masked: 遮罩比例 (0.30 / 0.15)
}
```

### 注册表替换方式

```typescript
// 替换前
boss_scramble: createStubModifier('boss_scramble'),
boss_reverse: createStubModifier('boss_reverse'),
boss_masked: createStubModifier('boss_masked'),

// 替换后
boss_scramble: bossScramble,
boss_reverse: bossReverse,
boss_masked: bossMasked,
```

### scrambleWord 边界情况处理

| 输入 | preserveEnds=false | preserveEnds=true |
|------|-------------------|-------------------|
| "a" (1字母) | "a" (不变) | "a" (不变) |
| "ab" (2字母) | "ab" (不变) | "ab" (不变) |
| "abc" (3字母) | 随机排列 | "abc" (中间仅1字母不变) |
| "abcd" (4字母) | 随机排列 | "a??d" 中间2字母随机 |
| "aaa" (全同) | "aaa" (无法不同) | "aaa" |

防无限递归：scrambleWord 内部重试计数器上限 5 次，超过则返回当前结果。

### 测试 DOM mock 增强

boss_masked 需要测试 textContent 和 getAttribute/setAttribute。现有 createMockLetterEl 需要扩展：

```typescript
function createMockLetterEl(cls: string, text: string = '') {
  const style: Record<string, string> = {}
  const attrs: Record<string, string> = {}
  return {
    classList: {
      contains: (c: string) => cls.includes(c),
      add: vi.fn((c: string) => { cls += ' ' + c }),
      remove: vi.fn(),
    },
    style,
    textContent: text,
    getAttribute: (name: string) => attrs[name] ?? null,
    setAttribute: (name: string, value: string) => { attrs[name] = value },
    removeAttribute: (name: string) => { delete attrs[name] },
  }
}
```

### Project Structure Notes

**修改文件：**
- `src/src/data/bossModifiers.ts` — 扩展 BossModifierParams + 3 个认知修饰器实现 + transformWordForModifier 导出 + scrambleWord/generateMaskedPositions 内部函数
- `src/src/systems/battle.ts` — setWord() 中 1 行改动 + 1 行 import
- `src/tests/unit/systems/bossModifierEngine.test.ts` — 扩展测试覆盖 3 个认知修饰器 + transformWordForModifier

**不修改文件（已完成）：**
- `systems/bossModifierEngine.ts` — 引擎不变，onTick 自动调用新实现
- `core/types.ts` — 不需要新类型
- `core/state.ts` — 不需要新状态字段
- `style.css` — 不需要新 CSS（boss_masked 用 textContent 替换，不用 opacity）

### References

- [Source: docs/epic-18-boss-act-structure.md — Story 18.6 验收标准 + Boss 池定义]
- [Source: docs/stories/18-5-boss-visual-typing.md — 视觉修饰器实现模式参考]
- [Source: docs/stories/18-4-boss-modifier-framework.md — BossModifier 接口 + 生命周期]
- [Source: src/src/data/bossModifiers.ts — 当前 stub 实现 + BossModifierParams + 注册表]
- [Source: src/src/systems/bossModifierEngine.ts — 引擎生命周期管理]
- [Source: src/src/systems/battle.ts:71-90 — setWord() 变换钩子插入点]
- [Source: src/src/systems/battle.ts:92-110 — renderWord() DOM 结构]
- [Source: src/src/systems/battle.ts:122-136 — handleKeyPress() 输入验证]
- [Source: src/src/systems/battle.ts:138-208 — playerCorrect() 不改 textContent]
- [Source: docs/project-context.md — 依赖方向、性能预算]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- No significant debug issues encountered during implementation.

### Completion Notes List

- All 3 cognitive modifiers (boss_scramble, boss_reverse, boss_masked) implemented and registered, replacing stubs.
- `scrambleWord()` uses Fisher-Yates shuffle with maxRetries=5 to ensure result differs from original (AC7).
- `transformWordForModifier()` exported from bossModifiers.ts, called in battle.ts `setWord()` — single line change.
- boss_masked uses onTick DOM manipulation with `data-original` attribute pattern; does NOT modify `state.player.word`.
- 25 new tests added (8 scramble + 5 reverse + 7 masked + 2 transform + 2 lifecycle + 1 param). All 106 modifier tests pass.
- Full test suite: 2158+ pass, 21 pre-existing failures (unrelated to 18.6).
- Only 1 stub modifier remains: boss_rhythm (Story 18.7).
- Code review fixes: strengthened AC7 test assertion, added word-change mask regeneration test, fixed mock classList.contains to use word-boundary matching, added elite 3-letter edge case test.

### File List

- `src/src/data/bossModifiers.ts` — Extended BossModifierParams + 3 cognitive modifier implementations + transformWordForModifier + scrambleWord + generateMaskedPositions
- `src/src/systems/battle.ts` — Added transformWordForModifier import + 1 line change in setWord()
- `src/tests/unit/systems/bossModifierEngine.test.ts` — Enhanced DOM mock + 25 new tests for cognitive modifiers
