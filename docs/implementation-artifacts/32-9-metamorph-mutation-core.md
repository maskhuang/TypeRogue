# Story 32.9: 蜕变师 — 蜕变核心机制 + 结算阶段 UI

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 蜕变师玩家,
I want 在关卡结算时使用变异素将技能随机蜕变为隐藏池中的同类型技能,
so that 我可以通过不确定的变异体验独特的进化赌徒玩法，发现常规商店无法获取的技能组合.

## Acceptance Criteria

1. **蜕变台 UI 存在于商店 Tab 系统中**
   - 蜕变师职业激活时，商店出现 `metamorph` Tab
   - Tab 内渲染蜕变面板：标题（🧬 蜕变台）、变异素数量、技能网格、操作提示
   - 非蜕变师职业时 Tab 完全隐藏

2. **蜕变规则 — 类型保持 + 完全继承**
   - 点击非产出者技能 → 消耗 1 变异素 → 从隐藏池随机抽取同类型技能替换
   - 产出者不可蜕变（UI 灰显 + cursor: not-allowed）
   - 蜕变后完全继承：等级、附魔、成长值、精通计数、吞噬图标
   - 键位绑定自动迁移到新技能

3. **隐藏池计算正确**
   - 隐藏池 = 全池 - 可见池 - 已拥有技能，再经 ClassResourceFilter 过滤
   - 转化者/连接者/复制者/增幅者各自独立的隐藏池
   - 池空时显示红色反馈 "隐藏池已空!"

4. **免费蜕变机制**
   - 持有 `primal_mutant`（原初变异体）遗物时，每关首次蜕变免费
   - 使用后 relicStates 标记为已用，下关重置

5. **连续蜕变**
   - 可在同一阶段连续蜕变多个技能（变异素充足即可）
   - 无次数上限，变异素产量为自然瓶颈

6. **跳过机制**
   - 可完全跳过蜕变（直接使用商店其他 Tab）
   - 跳过无惩罚，剩余变异素跨关保留

7. **反馈与动画**
   - 蜕变动画：morph-pulse（0.3s 缩放脉冲 + 绿色辉光）
   - 音效：播放 'skill' 音效
   - 视觉反馈：`旧图标→新图标 新名称`（#2ecc71 绿色，1.2s）

8. **鼠标悬停提示**
   - 显示技能详情：图标、名称、等级、键位、描述、学派标签
   - 非产出者显示 "隐藏池剩余: X 个[类型]"
   - 产出者显示 "产出者不可蜕变"
   - Tooltip 自动避免超出屏幕边界

## Tasks / Subtasks

- [x] Task 1: 验证 MetamorphStation.ts 核心逻辑完整性 (AC: #2, #3)
  - [x] 1.1 确认 `computeHiddenPool` 正确计算各类型隐藏池
  - [x] 1.2 确认 `performMetamorph` 完整迁移所有状态（skills/bindings/enchantments/growthValues/masteryCounters/devourIcons）
  - [x] 1.3 确认类型保持：converter→converter, connector→connector, replicator→replicator, amplifier→amplifier
  - [x] 1.4 确认产出者排除逻辑

- [x] Task 2: 验证免费蜕变机制 (AC: #4)
  - [x] 2.1 确认 primal_mutant 遗物首次免费逻辑
  - [x] 2.2 确认 relicStates 每关重置（battle.ts 中 startLevel 处理）

- [x] Task 3: 验证 UI 渲染与交互 (AC: #1, #7, #8)
  - [x] 3.1 确认商店 Tab 系统正确集成 metamorph tab
  - [x] 3.2 确认技能卡片渲染（图标/名称/键位/类型标签）
  - [x] 3.3 确认禁用状态（产出者灰显）
  - [x] 3.4 确认 morph-pulse 动画和反馈
  - [x] 3.5 确认 Tooltip 显示与边界检测

- [x] Task 4: 编写 MetamorphStation 单元测试 (AC: ALL)
  - [x] 4.1 `computeHiddenPool` 测试：各类型池计算、已拥有排除、类资源过滤、空池处理
  - [x] 4.2 `performMetamorph` 测试：变异素扣减、状态迁移完整性、免费蜕变、产出者拒绝
  - [x] 4.3 边缘情况：变异素不足、隐藏池为空、蜕变最后一个技能、连续蜕变同类型

- [x] Task 5: 端到端验证 (AC: #5, #6)
  - [x] 5.1 连续蜕变多个技能
  - [x] 5.2 跳过蜕变直接使用其他 Tab
  - [x] 5.3 变异素跨关保留验证

## Dev Notes

### 核心实现状态：已基本完成

> **重要**：Story 32-9 的核心代码已在 commit `b263cb0` 中实现。本 story 的主要工作是**验证现有实现的正确性**并**补充缺失的单元测试**。

#### 已实现文件清单

| 文件 | 职责 | 状态 |
|------|------|------|
| `src/src/systems/classes/MetamorphStation.ts` (317行) | 核心蜕变逻辑 + UI 渲染 | ✅ 已实现 |
| `src/src/systems/shop.ts` | metamorph Tab 集成 | ✅ 已集成 |
| `src/index.html` | #metamorph-tab + #metamorph-panel DOM | ✅ 已添加 |
| `src/src/style.css` | 蜕变台完整样式 + morph-pulse 动画 | ✅ 已添加 |
| `src/src/systems/battle.ts` | primal_mutant relicStates 每关重置 | ✅ 已处理 |

#### 缺失项

| 缺失 | 优先级 | 说明 |
|------|--------|------|
| MetamorphStation 单元测试 | **HIGH** | `computeHiddenPool` 和 `performMetamorph` 无测试覆盖 |
| 边缘情况验证 | MEDIUM | 空池、变异素不足、连续蜕变等场景需确认 |

### 关键架构理解

#### 蜕变流程
```
关卡胜利 → 进入商店 → metamorph Tab → 点击技能卡 →
消耗1变异素 → computeHiddenPool(type) → random选择 →
performMetamorph(迁移全部状态) → UI刷新 → 可继续蜕变
```

#### 隐藏池计算 (`computeHiddenPool`)
```typescript
1. 获取该类型全部技能 ID 列表
2. 减去可见池（state.converterPool 等）
3. 减去已拥有技能（state.player.skills）
4. 经 ClassResourceFilter 过滤非本职业技能
5. 返回有效隐藏池
```

#### 状态迁移 (`performMetamorph`)
```
旧技能 → 新技能 时迁移:
├── state.player.skills: delete(old) → set(new, {level, purchasePrice})
├── state.player.bindings: set(key, newSkillId)
├── state.player.enchantedSkills: old→new 附魔迁移
├── state.growthValues: old→new 成长值迁移
├── state.masteryCounters: old→new 精通计数迁移
└── state.devourIcons: old→new 吞噬图标迁移
```

#### 变异素经济
- 生产：2 个变异素产出者（💉渗变 + 🦠突变）
- 转化：20 个变异素转化者（10 个 mutagen→其他 + 10 个其他→mutagen）
- 放大：6 个变异素增幅者
- 消耗：每次蜕变花费 1 变异素（primal_mutant 首次免费）
- 存储：`state.mutagenInventory`（跨关保留，Run 重置）

### 设计要点：蜕变师 vs 造词师

| 维度 | 造词师 | 蜕变师 |
|------|--------|--------|
| 控制层 | 输入层（词汇） | 处理层（技能） |
| 资源 | 26 种碎片 | 1 种变异素 |
| 核心操作 | 造词（确定性选择） | 蜕变（随机盲盒） |
| 确定性 | 高 | 低 |
| 失去能力 | 牌包系统 | 附魔二选一 |

### Project Structure Notes

- MetamorphStation.ts 位于 `src/src/systems/classes/` 目录，与 ClassResourceFilter/ClassFeatureGate/CraftingStation 同层
- 遵循项目惯例：DOM-based UI（非 PixiJS），事件驱动更新
- 测试应放在 `src/tests/unit/systems/` 或 `src/tests/unit/systems/classes/`
- 命名惯例：PascalCase 文件名，camelCase 函数/变量

### 技术栈要点

- **引擎**: PixiJS v8.16.0（渲染），DOM（UI）
- **语言**: TypeScript
- **RNG**: 使用 `random()` 函数（种子化，日挑战可复现）
- **状态管理**: 三层（MetaState/RunState/BattleState），通过 StateCoordinator 协调
- **事件总线**: TypedEventBus，事件格式 `domain:action`

### 前置 Story 关键产出

- **32-1**: ClassId 枚举含 'metamorph'，ClassManager 运行时管理
- **32-2**: ResourceType 含 'mutagen'，资源管道+池过滤+库存追踪
- **32-3**: FeatureGate 系统，蜕变师失去附魔二选一
- **32-8**: 隐藏池分割（50/50）、变异素产出者/转化者/增幅者、HUD 显示

### References

- [Source: docs/stories/epic-22-class-system.md#Story 32.9]
- [Source: docs/class-design-metamorph.md]
- [Source: docs/gdd.md#蜕变师]
- [Source: docs/game-architecture.md#Skill System]
- [Source: src/src/systems/classes/MetamorphStation.ts]
- [Source: src/src/systems/shop.ts#metamorph-tab]
- [Source: src/src/systems/battle.ts#primal_mutant-reset]
- [Source: docs/implementation-artifacts/32-8-metamorph-hidden-pool.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1-3: 代码审查确认 MetamorphStation.ts 实现完整正确（computeHiddenPool 隐藏池计算、performMetamorph 6 项状态迁移、类型保持、产出者排除、免费蜕变、UI 渲染与交互）
- Task 4: 创建 MetamorphStation.test.ts（24 个测试全部通过）：getSkillType 6 测试、computeHiddenPool 6 测试、performMetamorph 12 测试（含状态迁移、免费蜕变、空池、连续蜕变、音效反馈）
- Task 5: 连续蜕变通过 performMetamorph 连续调用测试验证；跳过机制由 Tab 系统设计保证（非强制 Tab）；变异素跨关保留由 state.mutagenInventory 跨关持久化保证
- 导出 getSkillType/computeHiddenPool/performMetamorph 以支持单元测试
- 回归验证：未引入新回归（pre-existing 67 failures 均为已有问题）
- Code Review 修复（6 项）：
  - H1: performMetamorph 扣费移至 oldData 验证之后，防止数据缺失时白扣资源
  - M1: 移除 renderMetamorphPanel 内重复的 typeNames，复用模块级 TYPE_NAMES
  - M2: showMorphTooltip 隐藏池大小改为 renderMetamorphPanel 预计算后传入，避免逐次悬停重复计算
  - M3: 新增复制者隐藏池测试用例
  - M4: 移除未使用的 PRODUCERS 导入
  - M5: 复制者 getSkillType 测试添加 toBeGreaterThan(0) 前置断言

### Change Log

- 2026-03-09: 导出内部函数支持测试 + 新增 24 个单元测试覆盖蜕变核心逻辑
- 2026-03-09: Code Review 修复 — 6 项问题（1H + 5M），测试增至 25 个

### File List

- src/src/systems/classes/MetamorphStation.ts (modified: 导出函数 + 扣费顺序修复 + 去重 + 池大小缓存 + 移除未用导入)
- src/tests/unit/systems/classes/MetamorphStation.test.ts (new: 25 个单元测试)
- docs/implementation-artifacts/sprint-status.yaml (modified: 32-9 status → done)
