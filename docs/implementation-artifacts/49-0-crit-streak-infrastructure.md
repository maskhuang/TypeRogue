# Story 49.0: critStreak / missStreak 基础设施

Status: done

## Acceptance Criteria

1. **AC1**: 暴击后 critStreak 递增，missStreak 归零
2. **AC2**: miss 后 missStreak 递增，critStreak 归零
3. **AC3**: 每关开始两者均重置为 0
4. **AC4**: 旧存档无此字段时不崩溃（默认 0）
5. **AC5**: 不影响现有暴击词条行为
6. **AC6**: 单元测试覆盖连续暴击/连续miss/交替/关卡重置

## Tasks / Subtasks

- [ ] Task 1: SkillRuntimeState 新字段
  - [ ] 1.1 affixes.ts — SkillRuntimeState 接口 + createSkillRuntimeState 默认值
- [ ] Task 2: 暴击判定后更新
  - [ ] 2.1 affixTrigger.ts resolvePhase3 — 暴击判定后更新 critStreak/missStreak
- [ ] Task 3: 关卡重置
  - [ ] 3.1 affixTrigger.ts resetStageState — 重置 critStreak/missStreak
- [ ] Task 4: 测试

## Dev Notes

在 resolvePhase3 line ~1165（Fallacy 更新块后）插入：
```typescript
// critStreak / missStreak 更新
if (flags.isCrit) {
  runtimeState.critStreak = (runtimeState.critStreak ?? 0) + 1
  runtimeState.missStreak = 0
} else if (totalCritChance > 0) {
  // 只在有暴击率时计 miss（无暴击率 = 不参与暴击系统）
  runtimeState.missStreak = (runtimeState.missStreak ?? 0) + 1
  runtimeState.critStreak = 0
}
```

## Dev Agent Record

### File List
