# Story 54.9: HUD 显示 + 解锁反馈

Status: done

## Story

作为玩家，我想要清楚看到当前 Ascension 级别和解锁进度，以便获得成就感。

## Acceptance Criteria

1. 战斗 HUD 显示当前 Ascension 级别（如 "A7"），A0 不显示
2. 商店界面也显示 Ascension 标识
3. 通关结算时 showFeedback 显示 Ascension 级别
4. 通关解锁新级别时弹出 "Ascension X 已解锁！" 反馈
5. i18n: 解锁反馈中英文

## Tasks

- [x] Task 1: 战斗 HUD Ascension 标识 (AC: 1)
  - [x] 1.1 actTransition.ts: A1+ 追加 " A{level}" 到 Cycle 信息
- [x] Task 2: 商店 Ascension 标识 (AC: 2)
  - [x] 2.1 shop.ts: shop-title 追加 " [A{level}]"
- [x] Task 3: 通关反馈 (AC: 3, 4, 5)
  - [x] 3.1 victory(): 结算界面显示 A{level} badge
  - [x] 3.2 MetaState advanceAscension(): emit 'ascension:advanced' 事件
  - [x] 3.3 battle.ts 监听 → showFeedback "🏆 Ascension X 已解锁！"
  - [x] 3.4 i18n: ascension.unlocked 中英文 + EventBus 类型

## Dev Notes

### HUD 接入点

actTransition.ts updateStageInfo() 当前输出 `Cycle X [icon]`。
A1+ 时改为 `Cycle X [icon] A{level}`。读取 `state.ascensionLevel`。

### 商店接入点

shop.ts openShop() line ~1193-1195 设置 shop-title。
A1+ 时追加 ` [A{level}]`。

### 解锁反馈

MetaState.checkUnlocks() 中 advanceAscension() 返回 true 时，emit 新事件：
```typescript
eventBus.emit('ascension:advanced', { classId, newLevel: current + 1 })
```

battle.ts 监听该事件 → showFeedback。

或者更简单：直接在 battle.ts victory() 函数中检查 advanceAscension 结果（但 checkUnlocks 在 MetaState 内部执行，结果不直接返回）。

最简方案：在 MetaState advanceAscension() 成功时发 eventBus 事件，battle.ts 监听。

### References

- [Source: docs/planning-artifacts/ascension-system-design.md#UI/UX 设计要点]
- [Source: docs/stories/epic-54-ascension-system.md#54-9]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- HUD: updateStageInfo 追加 A{level}（A0 隐藏）
- 商店: shop-title 追加 [A{level}]
- 胜利结算: ascBadge 显示
- 解锁: advanceAscension emit ascension:advanced → battle.ts showFeedback
- ascension.unlocked i18n 中英文

### File List

- `src/systems/actTransition.ts` — HUD badge
- `src/systems/shop.ts` — shop-title badge
- `src/systems/battle.ts` — victory badge + ascension:advanced 监听
- `src/core/state/MetaState.ts` — advanceAscension emit 事件
- `src/core/events/EventBus.ts` — ascension:advanced 事件类型
- `src/demo/demo-i18n.ts` — ascension.unlocked
