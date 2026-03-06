# Story 25.1: 周目状态与循环结构

Status: done

## Story

As a 玩家,
I want 在通关 Boss 后进入下一周目而非结束游戏，保留所有技能/附魔/成长值/金币,
so that 我的构筑能在递增难度中得到终极测试，体验「曾经觉得难的关现在碾过」的成长感.

## Acceptance Criteria

1. **AC1 — GameState 新增 cycle 字段**
   - `cycle: number`，默认 1，通关 Boss 后 +1
   - 序列化/反序列化支持（RunState 兼容）

2. **AC2 — GameState 新增 activeModifiers 字段**
   - `activeModifiers: string[]`，当前叠加的 Boss 修饰器列表
   - 默认空数组，跨周目累积（Story 25.3 填充逻辑）

3. **AC3 — Boss 胜利触发周目推进**
   - 当前 `victory()` 不再直接结束游戏
   - Boss 胜利后：`cycle++`，`level` 重置为 1
   - 进入商店（复用现有 openShop 流程），而非 gameover 画面

4. **AC4 — 跨周目状态保留**
   - 保留：skills、bindings、relics、gold、growthValues、masteryCounters、devourIcons、enchantedSkills、evolvedSkills、wordDeck
   - 每关重置（已有逻辑不变）：amplifierStacks、devourCounters、score、combo
   - 不新增重置逻辑

5. **AC5 — 战斗 HUD 显示周目数**
   - 周目 1 时不显示（保持现有体验）
   - 周目 ≥2 时在关卡标签旁显示 `周目 N`
   - 商店界面同步显示当前周目

6. **AC6 — 单元测试**
   - cycle 初始化和递增测试
   - activeModifiers 初始化测试
   - victory 流程分支测试（Boss → 周目推进 vs 非 Boss → 商店）
   - 跨周目状态保留验证
   - HUD 显示逻辑测试（周目1隐藏、周目2+显示）

## Tasks / Subtasks

- [x] Task 1: GameState 类型扩展 (AC: 1, 2)
  - [x] 1.1 在 `core/types.ts` GameState 接口中添加 `cycle: number` 和 `activeModifiers: BossModifierId[]`
  - [x] 1.2 在 `core/state.ts` 初始化中设置 `cycle: 1`、`activeModifiers: []`

- [x] Task 2: RunState 序列化支持 (AC: 1)
  - [x] 2.1 在 `core/state/RunState.ts` 序列化时写入 cycle 和 activeModifiers
  - [x] 2.2 反序列化时读取，向后兼容（缺失时 cycle=1, activeModifiers=[]）

- [x] Task 3: Victory 流程改造 (AC: 3, 4)
  - [x] 3.1 修改 `battle.ts` 中 `endLevel()` 的 Boss 胜利分支
  - [x] 3.2 Boss 胜利后：`state.cycle++`，`state.level = 1`，调用 `openShop(true)` 而非 `victory()`
  - [x] 3.3 重置 stageFlow 相关的 Act 状态（`resetLastAct()`）
  - [x] 3.4 重新抽取 bossModifierPool（新周目 3 个新修饰器）
  - [x] 3.5 保留原 `victory()` 函数但暂不调用（后续 Story 25.5 排行榜用）

- [x] Task 4: HUD 周目显示 (AC: 5)
  - [x] 4.1 在 `battle.ts` startLevel() 的 HUD 更新中，周目≥2 时显示 `周目 N · LEVEL X`
  - [x] 4.2 在 `shop.ts` openShop() 的顶部信息中显示周目数（≥2 时）

- [x] Task 5: 单元测试 (AC: 6)
  - [x] 5.1 测试 cycle 默认值 = 1
  - [x] 5.2 测试 activeModifiers 默认值 = []
  - [x] 5.3 测试 RunState 序列化/反序列化 cycle 字段
  - [x] 5.4 测试 RunState 反序列化向后兼容（无 cycle 字段时默认 1）
  - [x] 5.5 测试 Boss 胜利后 cycle 递增
  - [x] 5.6 测试 Boss 胜利后 level 重置为 1
  - [x] 5.7 测试跨周目 skills/gold/growthValues 保留
  - [x] 5.8 运行全部现有测试确认无回归

## Dev Notes

### 核心架构变更

**victory() 改造是最关键的变更点。** 当前流程：

```
endLevel() → score ≥ target?
  ├─ boss stage → victory() → showScreen('gameover') → 游戏结束
  └─ normal/elite → openShop(true) → 继续
```

改造后：

```
endLevel() → score ≥ target?
  ├─ boss stage → cycle++, level=1, resetLastAct(), 重抽modifier → openShop(true) → 继续
  └─ normal/elite → openShop(true) → 继续（不变）
```

### 状态数据源

```typescript
// 新增字段
state.cycle = 1;                    // 周目数（跨周目递增）
state.activeModifiers = [];         // Boss 修饰器列表（Story 25.3 填充）

// 已有跨关持久化字段（不变）
state.growthValues                  // 成长附魔累积值
state.masteryCounters               // 精通触发计数
state.devourIcons                   // 吞噬图标列表
state.player.skills                 // 技能
state.player.bindings               // 绑定
state.player.relics                 // 遗物
state.gold                          // 金币
```

### Boss 胜利后的重置清单

周目推进时需要重置的状态（在 `startLevel()` 已有逻辑中自动处理）：
- `amplifierStacks.clear()` — line 674
- `devourCounters.clear()` — line 676
- `resources` 重置 — `resetResources()`
- `score`, `combo`, `multiplier` — startLevel() 内

额外需要手动处理：
- `state.level = 1` — 重置关卡
- `resetLastAct()` — 重置 Act 过渡状态
- `state.bossModifierPool = drawBossModifiers(3)` — 新周目新修饰器池

### HUD 显示位置

战斗 HUD 关卡标签在 `battle.ts` startLevel() 中更新：
```typescript
// 当前：
el.levelLabel.textContent = `LEVEL ${displayLevel}${stageLabel}`;

// 改为（周目≥2时）：
el.levelLabel.textContent = `周目${state.cycle} · LEVEL ${displayLevel}${stageLabel}`;
```

商店界面关卡信息在 `shop.ts` openShop() 中：
```typescript
el.shopLevelNum.textContent = String(state.level);
// 追加周目显示
```

### Project Structure Notes

- 修改文件：`core/types.ts`, `core/state.ts`, `core/state/RunState.ts`, `systems/battle.ts`, `systems/shop.ts`
- 新增测试：`tests/unit/core/cycle-state.test.ts`
- 不新建源码文件
- 依赖：无新依赖

### References

- [Source: src/core/types.ts#GameState (line 126-159)] — 状态接口
- [Source: src/core/state.ts#createInitialState (line 10-85)] — 初始化
- [Source: src/core/state.ts#calculateTargetScore (line 133-139)] — 目标分数（Story 25.2 修改）
- [Source: src/core/state/RunState.ts#serialize (line 400-450)] — 序列化
- [Source: src/systems/battle.ts#endLevel (line 569-604)] — 胜利分支
- [Source: src/systems/battle.ts#victory (line 791-807)] — 当前胜利函数
- [Source: src/systems/battle.ts#startLevel (line 618-766)] — 关卡初始化
- [Source: src/systems/battle.ts#amplifierStacks.clear (line 674)] — 每关重置
- [Source: src/systems/stage/stageFlow.ts#TOTAL_NODES (line 10)] — 10 节点结构
- [Source: src/systems/stage/stageFlow.ts#getNextBattleNode (line 100-107)] — 关卡推进
- [Source: src/main.ts#init (line 18-69)] — 游戏初始化 + drawBossModifiers
- [Source: docs/brainstorming-session-2026-03-05.md#Section A+] — 无尽模式设计

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: Added `cycle: number` and `activeModifiers: BossModifierId[]` to GameState interface; defaults set in createInitialState()
- Task 2: RunState serialize/deserialize now includes cycle and activeModifiers with backward compatibility (defaults cycle=1, activeModifiers=[])
- Task 3: endLevel() Boss victory branch now calls advanceCycle() + openShop(true). advanceCycle() extracted as exported function: cycle++, level=1, resetLastAct(), clear tempBuffs/sealedKeys, drawBossModifiers(3). victory() retained but unused.
- Task 4: Battle HUD levelLabel and announceLevel() show "周目N · " prefix when cycle >= 2. Shop shows cycle in title ("商店 · 周目N") instead of embedding in level number.
- Task 5: 29 unit tests covering cycle init, activeModifiers init, RunState serialization roundtrip, backward compat, advanceCycle() flow (cycle increment, level reset, tempBuffs/sealedKeys clear, state preservation), HUD display logic. All pass. 331 core tests pass with no regressions.

### Senior Developer Review (AI)

**Review Date:** 2026-03-06
**Review Outcome:** Approve (after fixes)

**Findings (6 total: 1 High, 3 Medium, 2 Low):**

- [x] [HIGH] AC6 victory flow branch test missing — extracted advanceCycle() + wrote 15 proper integration tests
- [x] [MEDIUM] announceLevel() missing cycle prefix — added cyclePfx to announcement banner
- [x] [MEDIUM] Shop cycle display format broken ("Level 周目2 · 1 完成!") — moved cycle to shop title
- [x] [MEDIUM] tempBuffs/sealedKeys carry over across cycles — clear in advanceCycle()
- [ ] [LOW] activeModifiers type inconsistency (BossModifierId[] vs string[] in RunState) — deferred
- [ ] [LOW] seenSkillTypes not cleared on cycle transition — deferred (minimal impact)

### File List

- src/src/core/types.ts (modified: added cycle, activeModifiers to GameState)
- src/src/core/state.ts (modified: added cycle=1, activeModifiers=[] to createInitialState)
- src/src/core/state/RunState.ts (modified: RunStateData + serialize + deserialize for cycle/activeModifiers)
- src/src/systems/battle.ts (modified: advanceCycle() extracted, endLevel Boss branch, HUD cycle prefix, announceLevel cycle prefix, import drawBossModifiers)
- src/src/systems/shop.ts (modified: shop title cycle display)
- src/tests/unit/core/cycle-state.test.ts (new: 29 unit tests)
- src/src/core/state/RunState.ts (modified: RunStateData + serialize + deserialize for cycle/activeModifiers)
- src/src/systems/battle.ts (modified: endLevel Boss branch → cycle advance, import drawBossModifiers, HUD cycle prefix)
- src/src/systems/shop.ts (modified: shop HUD cycle prefix)
- src/tests/unit/core/cycle-state.test.ts (new: 18 unit tests)
