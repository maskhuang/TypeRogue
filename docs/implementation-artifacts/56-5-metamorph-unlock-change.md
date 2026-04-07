# Story 56.5: 蜕变师解锁条件变更

Status: done

## Story

As a 玩家,
I want 蜕变师的解锁条件从"解锁所有技能"改为"用造词师通关一次",
so that 解锁链形成自然递进（无职业→造词师→蜕变师）且条件可控。

## Acceptance Criteria

1. **AC1: 解锁逻辑** — `MetaState.checkProgressionUnlocks()` 蜕变师条件从 `unlockedSkills.size >= totalSkillCount` 改为 `victoriedClasses.has('wordsmith')`
2. **AC2: 锁定提示** — 职业选择界面蜕变师锁定文案改为"🔒 用造词师通关一次解锁"
3. **AC3: i18n** — 中英文文案同步更新
4. **AC4: 向后兼容** — 已解锁蜕变师的存档不会被锁回（`unlockClass` 是幂等的，只加不减）
5. **AC5: 注释同步** — 代码注释更新

## Tasks / Subtasks

- [x] Task 1: 修改解锁逻辑 — `victoriedClasses.has('wordsmith')` + 注释同步
- [x] Task 2: 更新文案 — ZH/EN i18n + ClassPicker fallback
- [x] Task 3: 回归验证 — unlockClass 幂等确认 + Vite build 成功

## Dev Notes

### 当前解锁逻辑（MetaState.ts:347-367）

```typescript
// 造词师：首次通关（任意职业）
if (this.stats.victories >= 1) {
  this.unlockClass('wordsmith')
}
// 蜕变师：解锁所有技能 ← 要改
const totalSkillCount = this.getTotalSkillCount()
if (totalSkillCount > 0 && this.unlockedSkills.size >= totalSkillCount) {
  this.unlockClass('metamorph')
}
```

### 改为

```typescript
// 蜕变师：用造词师通关一次
if (this.victoriedClasses.has('wordsmith')) {
  this.unlockClass('metamorph')
}
```

### 向后兼容

`unlockClass()` 是 Set.add — 只加不减。已通过旧条件解锁蜕变师的玩家存档中 `unlockedClasses` 已包含 `'metamorph'`，不会被移除。

### References

- [Source: src/src/core/state/MetaState.ts:347-367 — checkProgressionUnlocks]
- [Source: src/src/demo/demo-i18n.ts — class_select.lock_metamorph]
- [Source: docs/stories/epic-56-main-menu.md — Story 56-5]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无

### Completion Notes List

- MetaState.checkProgressionUnlocks: 蜕变师条件从 unlockedSkills 全解锁改为 victoriedClasses.has('wordsmith')
- i18n ZH/EN: 🔒 用造词师通关一次解锁 / Clear with Wordsmith to unlock
- ClassPicker fallback 硬编码同步

### Change Log

- 2026-04-05: Story 56.5 蜕变师解锁条件变更完成

### File List

- `src/src/core/state/MetaState.ts`
- `src/src/demo/demo-i18n.ts`
- `src/src/systems/classes/ClassPicker.ts`
