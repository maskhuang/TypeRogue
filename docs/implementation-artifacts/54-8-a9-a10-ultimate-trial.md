# Story 54.8: A9-A10 终极试炼

Status: done

## Story

作为 A9/A10 玩家，我想要面对极限挑战，以便证明自己的实力。

## Acceptance Criteria

1. **A9 (ascensionLevel >= 9):** Boss 每次叠加 2 个 modifier（而非 1 个），两个不重复
2. **A10 (ascensionLevel >= 10):** TARGET_GROWTH 从 1.45 调为 1.55
3. **A10:** 错误输入额外扣 2 秒时间
4. A10 错误扣时间有视觉反馈（闪红 + 时间数字变化）

## Tasks

- [x] Task 1: A9 双 modifier (AC: 1)
  - [x] 1.1 Boss 胜利循环改为 modCount = A9+ ? 2 : 1
- [x] Task 2: A10 增长率 (AC: 2)
  - [x] 2.1 A10_TARGET_GROWTH = 1.55
  - [x] 2.2 calculateTargetScore: A10+ 用 1.55
- [x] Task 3: A10 错误扣时间 (AC: 3, 4)
  - [x] 3.1 A10_ERROR_TIME_PENALTY = 2
  - [x] 3.2 playerWrong(): A10+ 扣 2 秒 + showFeedback "⏳ -2s"
- [x] Task 4: 单元测试 (AC: 1-3)
  - [x] 4.1 6 个测试：A0/A9/A10 增长率 + 常量验证

## Dev Notes

### A9: 双 modifier

battle.ts line ~1743 Boss 胜利后抽 modifier：
```typescript
const permMod = drawSingleBossModifier(state.activeModifiers);
```
A9+ 时改为抽 2 个：
```typescript
const count = state.ascensionLevel >= 9 ? 2 : 1;
for (let i = 0; i < count; i++) {
  const mod = drawSingleBossModifier(state.activeModifiers);
  if (mod) { state.activeModifiers.push(mod); showFeedback... }
}
```

### A10: 增长率

state.ts calculateTargetScore() line ~167：
```typescript
const target = Math.round(base * Math.pow(TARGET_GROWTH, stageNum - 2));
```
改为：`const growth = state.ascensionLevel >= 10 ? A10_TARGET_GROWTH : TARGET_GROWTH`

### A10: 错误扣时间

battle.ts playerWrong() line ~858：在现有 combo 重置之前加入时间惩罚。
视觉反馈复用现有 shake + showFeedback。

### References

- [Source: docs/planning-artifacts/ascension-system-design.md]
- [Source: docs/stories/epic-54-ascension-system.md#54-8]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- A9: Boss modifier 循环抽取 modCount=2
- A10: calculateTargetScore growth 1.45→1.55 + playerWrong 扣 2 秒
- 6 个测试通过

### File List

- `src/core/constants.ts` — A10_TARGET_GROWTH=1.55, A10_ERROR_TIME_PENALTY=2
- `src/core/state.ts` — calculateTargetScore A10 增长率
- `src/systems/battle.ts` — A9 双 modifier + A10 错误扣时间
- `src/demo/demo-i18n.ts` — battle.a10_error_penalty
- `tests/unit/core/ascension-ultimate.test.ts` — 6 个测试
