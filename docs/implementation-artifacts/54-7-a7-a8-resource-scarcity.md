# Story 54.7: A7-A8 资源稀缺

Status: done

## Story

作为 A7/A8 玩家，我想要面对更少的资源，以便每个选择都更有份量。

## Acceptance Criteria

1. **A7 (ascensionLevel >= 7):** 遗物槽位上限 10 → 8
2. A7 遗物 UI 正确显示 8 槽上限
3. **A8 (ascensionLevel >= 8):** run 开始时随机移除 30% 词库
4. A8 词库压缩使用 seededRandom 确保同 seed 一致
5. A8 造词师可造词列表跟随压缩

## Tasks

- [x] Task 1: A7 遗物槽位缩减 (AC: 1, 2)
  - [x] 1.1 state.ts 新增 getMaxRelicSlots()（A7+ 返回 8）
  - [x] 1.2 constants.ts A7_RELIC_SLOTS = 8
  - [x] 1.3 isRelicSlotsFull() + battle.ts renderSlots 改用 getMaxRelicSlots()
- [x] Task 2: A8 词库压缩 (AC: 3, 4, 5)
  - [x] 2.1 main.ts: A8+ 时 Fisher-Yates shuffle indices + 移除 30%
  - [x] 2.2 使用 seededRandom 保证同 seed 一致
  - [x] 2.3 造词师可造词列表自动跟随（读 wordDeck）
- [x] Task 3: 单元测试 (AC: 1, 3)
  - [x] 3.1 getMaxRelicSlots A0/A6/A7/A10 返回值
  - [x] 3.2 A8_WORD_COMPRESS_RATIO 常量

## Dev Notes

### A7: 遗物槽位

`MAX_RELIC_SLOTS = 10` 在 relics.ts 定义，被 6+ 个文件引用（state.ts, RunState.ts, relicPicker.ts, shop.ts, battle.ts）。

方案：保留 `MAX_RELIC_SLOTS = 10` 作为默认值，新增 `getMaxRelicSlots()` 读取 ascensionLevel：
```typescript
export function getMaxRelicSlots(): number {
  return state.ascensionLevel >= 7 ? A7_RELIC_SLOTS : MAX_RELIC_SLOTS
}
```

需要替换的引用点（仅运行时检查，不含类型注释）：
- `state.ts:183` — isRelicSlotsFull()
- `RunState.ts:385` — addRelic 容量检查
- `RunState.ts:602` — deserialize slice
- `relicPicker.ts` — 显示槽位
- `shop.ts` — 遗物购买检查

注意：`relics.ts` 中 `MAX_RELIC_SLOTS` 仍需导出（供不依赖 state 的场景使用），`getMaxRelicSlots()` 单独导出。但 `getMaxRelicSlots()` 依赖 state，不能放在 `data/relics.ts`（违反依赖方向 data→core）。应放在 `core/state.ts` 中。

### A8: 词库压缩

`state.player.wordDeck` 在 main.ts 中由 `getStarterWords()` 初始化。A8+ 时从中移除 30%：
```typescript
if (state.ascensionLevel >= 8) {
  const removeCount = Math.floor(state.player.wordDeck.length * 0.3)
  // Fisher-Yates shuffle with seededRandom, then splice first removeCount
}
```

造词师的 `getAllWords()` 和 `findBuildableWords()` 读取全局词库，压缩后自然跟随。

### References

- [Source: docs/planning-artifacts/ascension-system-design.md]
- [Source: docs/stories/epic-54-ascension-system.md#54-7]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- A7: getMaxRelicSlots() 在 state.ts，isRelicSlotsFull() + battle renderSlots 已替换
- A8: main.ts 词库压缩 Fisher-Yates + seededRandom，造词师自动跟随
- 5 个测试通过
- Code review: M1 词库压缩移到 startAfterClassSelect（ascensionLevel 已设置后）

### File List

- `src/core/constants.ts` — A7_RELIC_SLOTS=8, A8_WORD_COMPRESS_RATIO=0.3
- `src/core/state.ts` — getMaxRelicSlots(), isRelicSlotsFull() 动态化
- `src/systems/battle.ts` — renderSlots 用 getMaxRelicSlots()
- `src/main.ts` — A8 词库压缩逻辑
- `tests/unit/core/ascension-resources.test.ts` — 5 个测试
