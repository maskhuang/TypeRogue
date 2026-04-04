# Story 52.6: 生命周期质变（7 个）

Status: ready-for-dev

## 质变列表

| 词条 | 质变名 | 效果 | 实现位置 |
|------|--------|------|---------|
| Innate | 觉醒 | 每打完一个单词时也自动触发 | battle.ts completeWord |
| Counter | 反噬 | 反制时负值转为下次 bonus | Phase 2 Counter 逻辑 + runtime 字段 |
| Exhaust | 燃尽 | 最后一次触发 bonus ×3 | Phase 2 Exhaust 逻辑 |
| Ethereal | 永恒 | 50% 概率续命 | endLevel 移除逻辑 |
| EndoExo | 永动 | 连续 3 次放热后超导爆发 | Phase 2 + runtime 计数 |
| Fusion | 恒星 | 成功后阈值永久降 10% | Phase 2 Fusion 成功分支 |
| Component | 网络 | 分量内每次触发 +1% bonus（本关累积） | Phase 2 + runtime 累积 |

## Tasks

- [ ] Task 1: Exhaust·燃尽（Phase 2 最后一次 ×3，最简单）
- [ ] Task 2: Counter·反噬（runtime.counterAbsorbed + Phase 2 消费）
- [ ] Task 3: Fusion·恒星（runtime 永久降阈值）
- [ ] Task 4: EndoExo·永动（runtime.exoCount + 超导判定）
- [ ] Task 5: Component·网络（runtime.componentAccum + Phase 2）
- [ ] Task 6: Innate·觉醒（battle.ts completeWord 钩子）
- [ ] Task 7: Ethereal·永恒（endLevel 50% 概率保留）

## Dev Notes

### 需要新增 runtime 字段
- `counterAbsorbed: number` — Counter 质变：上次反制吸收的负值
- `exoCount: number` — EndoExo 质变：连续放热次数
- `componentAccum: number` — Component 质变：本关活跃度累积

### Innate·觉醒 和 Ethereal·永恒
这两个需要修改 battle.ts（completeWord / endLevel），不在 affixTrigger.ts 中。
简化方案：
- Innate·觉醒：在 affixTrigger.ts 的 Phase 5 中检测，如果是 word:complete 事件（ctx 中标记），额外自触发
- Ethereal·永恒：在 removeAffixAtRuntime 中加概率保留检查

## Dev Agent Record

### File List
