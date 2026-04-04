# Story 53.1: 组装队列数据层

Status: ready-for-dev

## Acceptance Criteria

1. **AC1**: 可连续排队多个词（队列上限 5）
2. **AC2**: 当前词完成后自动开始下一个
3. **AC3**: 能量溢出到下一个词（不浪费）
4. **AC4**: 旧存档 assemblyPipeline 迁移为 assemblyQueue[0]
5. **AC5**: CraftingStation 开始组装改为 push 到队列
6. **AC6**: 取消组装改为从队列移除指定项

## Tasks

- [ ] Task 1: types.ts — GameState.assemblyPipeline → assemblyQueue: AssemblyPipeline[]
- [ ] Task 2: state.ts — 初始值改为 []
- [ ] Task 3: AssemblyPipeline.ts — routeEnergyToPipeline 改为处理队列
- [ ] Task 4: CraftingStation.ts — 组装/取消逻辑适配队列
- [ ] Task 5: skills.ts — consumeCompletedWord 适配
- [ ] Task 6: 存档迁移
- [ ] Task 7: 全局搜索 assemblyPipeline 引用，全部迁移

## Dev Notes

### routeEnergyToPipeline 队列版
```typescript
export function routeEnergyToPipeline(energy: number): void {
  while (energy > 0 && state.assemblyQueue.length > 0) {
    const current = state.assemblyQueue[0]
    const result = advancePipeline(current, energy)
    energy = result.remainingEnergy
    if (result.completed) {
      // 完成：加入词库 + shift 队列
      finalizeWord(current.targetWord)
      state.assemblyQueue.shift()
    }
  }
}
```

### 存档迁移
```typescript
// deserialize 中：
if (data.assemblyPipeline && !data.assemblyQueue) {
  data.assemblyQueue = [data.assemblyPipeline]
}
```

## Dev Agent Record

### File List
