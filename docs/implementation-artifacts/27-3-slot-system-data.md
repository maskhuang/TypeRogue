# Story 27.3: 遗物槽位系统

Status: done

## Story

As a 玩家,
I want 遗物持有上限为 10 个，满时可以选择替换旧遗物,
so that 遗物选择有取舍压力，创造更有深度的构筑决策。

## Acceptance Criteria

1. **MAX_RELIC_SLOTS = 10** — 常量定义，全局引用
2. **容量检查** — 所有遗物获取路径（relicPicker / restStage / ShopScene）在满 10 个时阻止直接添加
3. **替换流程** — 槽位满时获得新遗物触发替换 UI：先选新遗物，再选要替换的旧遗物
4. **卖出返还** — 替换掉的旧遗物返还 `basePrice × 0.5` 金币（向下取整）
5. **战斗界面 10 槽位渲染** — 遗物显示改为 10 个固定槽位（数字键 1-0 标签），空槽显示空框
6. **商店界面同步** — 商店遗物栏同样显示 10 槽位
7. **RunState 序列化兼容** — 旧存档遗物数量 >10 时截断为前 10 个（加载时迁移）
8. **测试覆盖** — 容量检查、替换流程、卖出金币计算、UI 槽位渲染、序列化往返 ≥15 个新测试

## Tasks / Subtasks

- [x] Task 1: 常量与类型定义 (AC: #1)
  - [x] 1.1 `src/src/data/relics.ts` 添加 `export const MAX_RELIC_SLOTS = 10`
  - [x] 1.2 `src/src/core/types.ts` PlayerState.relics 类型不变（Set<string>），添加注释说明上限
- [x] Task 2: 容量检查 — 状态层 (AC: #2, #4)
  - [x] 2.1 `src/src/core/state.ts` 新增 `addRelicWithCapacity(relicId): boolean` — 未满直接添加返回 true，满则返回 false
  - [x] 2.2 `src/src/core/state.ts` 新增 `replaceRelic(oldId, newId): number` — 删旧添新，返回卖出金币（`Math.floor(basePrice * 0.5)`）
  - [x] 2.3 `src/src/core/state.ts` 新增 `removeRelic(relicId): void`
  - [x] 2.4 `src/src/core/state.ts` 新增 `isRelicSlotsFull(): boolean`
  - [x] 2.5 `src/src/core/state/RunState.ts` `addRelic` 添加上限检查（`data.relics.length < MAX_RELIC_SLOTS`），返回 boolean
- [x] Task 3: 遗物获取入口适配 (AC: #2, #3)
  - [x] 3.1 `src/src/systems/relicPicker.ts` — `showRelicPicker` 满槽时进入替换模式（showReplaceUI）
  - [x] 3.2 `src/src/systems/restStage.ts` — `grantRandomRelic` 满槽时返回 null
  - [x] 3.3 `src/src/scenes/shop/ShopScene.ts` — RunState.addRelic 已有容量检查（返回 false 阻止购买）
- [x] Task 4: 替换 UI 实现 (AC: #3, #4)
  - [x] 4.1 `relicPicker.ts` 新增 `showReplaceUI` — 显示当前已有遗物供选择替换目标
  - [x] 4.2 替换确认后：调用 `replaceRelic(old, new)` → 删旧+加金币+添新+更新显示
  - [x] 4.3 提供"放弃"按钮 — 玩家可以选择不拿新遗物
- [x] Task 5: UI 槽位渲染 (AC: #5, #6)
  - [x] 5.1 `src/src/systems/battle.ts` — `renderRelicDisplay` 改为渲染 MAX_RELIC_SLOTS 个固定槽位
  - [x] 5.2 每个槽位显示数字键标签（1-9, 0）+ 遗物图标或空框（`relic-slot-empty` class）
  - [x] 5.3 商店界面遗物栏同步改为 10 槽位布局（共用 `renderSlots` 内部函数）
- [x] Task 6: 存档兼容 (AC: #7)
  - [x] 6.1 `src/src/core/state/RunState.ts` — `fromJSON` 遗物 `.slice(0, MAX_RELIC_SLOTS)` 截断
- [x] Task 7: 测试 (AC: #8)
  - [x] 7.1 新建 `tests/unit/systems/relics/relics.slots.test.ts` — 16 个测试（容量检查、替换、卖出金币、边界）
  - [x] 7.2 更新 `tests/unit/core/state/RunState.test.ts` — +4 测试（上限检查、返回值、存档迁移截断）
  - [x] 7.3 现有测试无需修改（直接 `.add()` 不受 capacity 函数影响）

## Dev Notes

### 现有代码分析（必须了解）

**当前遗物存储**：`state.player.relics: Set<string>` — 无大小限制

**遗物获取入口（共 5 处）**：

| 入口 | 文件:行 | 当前行为 | 需要改造 |
|------|---------|----------|----------|
| 开局三选一 | `relicPicker.ts:81` | `state.player.relics.add(relicId)` | 加容量检查+替换模式 |
| 休息事件 | `restStage.ts:335` | `state.player.relics.add(relicId)` | 加容量检查 |
| 商店购买 | `ShopScene.ts:353` | `this.runState.addRelic(item.id)` | 加容量检查+替换 |
| 断连击失去 | `battle.ts:289` | `state.player.relics.delete(relicId)` | 无需改（减少不受限） |
| RunState 恢复 | `RunState.ts:300` | `data.relics.push(relicId)` 无上限 | 加上限检查 |

**relicPicker 当前流程**（`src/src/systems/relicPicker.ts`）：
- `shouldShowRelicPicker(level)` — level=1 或 level%5===0 时显示
- `generateRelicCandidates()` — 从未拥有遗物中随机选 3 个
- `showRelicPicker(onClose)` — 创建 DOM 弹窗，点击卡片直接 `state.player.relics.add()`
- **改造点**：满槽时点击卡片后不直接添加，而是进入"选择替换目标"子界面

**UI 渲染**（`src/src/systems/battle.ts:930-955`）：
- 战斗界面：`el.playerRelics` — 遍历 `state.player.relics` 创建 emoji span
- 商店界面：`el.shopRelicIcons` — 同上
- **改造为**：固定渲染 10 个 slot div，每个标注数字键，有遗物时填入图标

### 关键实现模式

**容量检查函数**（建议放 `state.ts`）：
```typescript
import { MAX_RELIC_SLOTS } from '../data/relics'

export function isRelicSlotsFull(): boolean {
  return state.player.relics.size >= MAX_RELIC_SLOTS
}

export function addRelicWithCapacity(relicId: string): boolean {
  if (state.player.relics.has(relicId)) return false
  if (isRelicSlotsFull()) return false
  state.player.relics.add(relicId)
  return true
}

export function replaceRelic(oldId: string, newId: string): number {
  const oldRelic = getRelicData(oldId)
  state.player.relics.delete(oldId)
  state.player.relics.add(newId)
  const sellGold = oldRelic ? Math.floor(oldRelic.basePrice * 0.5) : 0
  state.gold += sellGold
  return sellGold
}
```

**替换 UI 模式**（relicPicker.ts 扩展）：
```
满槽时点击新遗物卡片 →
  弹出"选择替换目标"覆盖层 →
  显示当前 10 个遗物 + "放弃"按钮 →
  点击旧遗物 → replaceRelic(old, new) → 显示反馈 → 关闭
  点击放弃 → 关闭（不获取）
```

**10 槽位 UI 模式**（battle.ts renderRelicDisplay 改造）：
```typescript
function renderRelicDisplay() {
  const container = el.playerRelics
  container.innerHTML = ''
  const relicArray = [...state.player.relics]
  for (let i = 0; i < MAX_RELIC_SLOTS; i++) {
    const slot = document.createElement('span')
    slot.className = 'relic-slot'
    const keyLabel = i < 9 ? `${i + 1}` : '0'
    if (relicArray[i]) {
      const relic = RELICS[relicArray[i]]
      slot.textContent = relic?.icon ?? '?'
      slot.title = `[${keyLabel}] ${relic?.name}: ${relic?.description}`
    } else {
      slot.textContent = '·'
      slot.title = `[${keyLabel}] 空槽位`
      slot.classList.add('empty')
    }
    container.appendChild(slot)
  }
}
```

### 27.2 经验教训

- **relicMod 默认 layer='base'**：T1 条件遗物用 global 层乘法，注意 override
- **Set 遍历顺序**：`Set<string>` 按插入顺序遍历，替换时需 delete+add，新遗物会在末尾
- **mock 模式**：遗物测试 mock `../../../../src/core/state`，参考 `relics.t1.test.ts`
- **测试数量断言**：修改遗物数量后 `relics.test.ts` 和 `iconRegistry.test.ts` 的 count 需同步更新
- **EffectPipeline 公式**：`baseSum × enhanceProduct × globalProduct` — 无 base 层 modifier 时结果为 0

### 不在此 Story 范围

- 遗物获取的稀有度权重调整（属于 27.4/27.5 或后续 Epic 3）
- 数字键快捷键绑定遗物功能（纯 UI 装饰，不影响游戏逻辑）
- PixiJS ShopScene 的遗物渲染改造（ShopScene 是独立旧架构）

### 文件修改清单

| 文件 | 操作 | 预计改动 |
|------|------|----------|
| `src/src/data/relics.ts` | 添加 `MAX_RELIC_SLOTS = 10` 常量 | 2 行 |
| `src/src/core/state.ts` | 新增 `addRelicWithCapacity`/`replaceRelic`/`removeRelic`/`isRelicSlotsFull` | ~25 行 |
| `src/src/core/state/RunState.ts` | `addRelic` 上限检查 + `fromJSON` 迁移截断 | ~10 行 |
| `src/src/systems/relicPicker.ts` | 满槽替换模式 UI + 逻辑 | ~60 行 |
| `src/src/systems/restStage.ts` | `grantRandomRelic` 容量检查 | ~5 行 |
| `src/src/systems/battle.ts` | `renderRelicDisplay` 改为 10 槽位 | ~20 行 |
| `tests/unit/systems/relics/relics.slots.test.ts` | **新建** 槽位系统测试 | ~120 行 |
| `tests/unit/core/state/RunState.test.ts` | 上限+迁移测试 | ~20 行 |

### 参考文件

- 设计文档: `docs/planning-artifacts/relic-system-redesign.md` §9 Q1（10 槽位设计理由）
- 实现计划: `docs/planning-artifacts/relic-implementation-plan.md` Story 2.1 + 2.2
- 遗物数据: `src/src/data/relics.ts`（RELICS + MAX_RELIC_SLOTS）
- 状态管理: `src/src/core/state.ts`（hasRelic + player.relics）
- 遗物选择器: `src/src/systems/relicPicker.ts`（showRelicPicker + generateRelicCandidates）
- 休息事件: `src/src/systems/restStage.ts`（grantRandomRelic + removeRandomRelic）
- 战斗 UI: `src/src/systems/battle.ts`（renderRelicDisplay）
- RunState: `src/src/core/state/RunState.ts`（addRelic + fromJSON）
- 商店场景: `src/src/scenes/shop/ShopScene.ts`（addRelic 调用）

### Project Structure Notes

- 依赖方向: `data → core → systems → scenes`
- `MAX_RELIC_SLOTS` 放 `data/relics.ts`（常量在数据层，被 core/systems 层导入）
- 容量检查函数放 `core/state.ts`（状态操作归 core 层）
- 替换 UI 逻辑放 `systems/relicPicker.ts`（UI 交互归 systems 层）

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- MAX_RELIC_SLOTS = 10 常量 + 4 个状态层函数（isRelicSlotsFull/addRelicWithCapacity/removeRelic/replaceRelic）
- RunState.addRelic 返回 boolean + 容量检查 + fromJSON 迁移截断
- relicPicker.ts 满槽时触发 showReplaceUI（显示已有遗物 + 放弃按钮）
- restStage.ts grantRandomRelic 满槽返回 null
- battle.ts renderRelicDisplay 改为 10 固定槽位（renderSlots 内部函数复用）
- 20 个新测试（16 slots + 4 RunState），总计 2612 通过，0 回归

### Code Review Fixes

- restStage.ts grantRandomRelic 改用 addRelicWithCapacity() 统一 API
- replaceRelic 添加 newId 已拥有检查防止净损失
- ShopScene IRunState.addRelic 返回 boolean + 槽位满时退还金币
- ShopScene.test.ts mock 同步更新（addRelic 返回值 + addGold）

### File List

- src/src/data/relics.ts — 添加 MAX_RELIC_SLOTS = 10
- src/src/core/types.ts — relics 字段注释说明上限
- src/src/core/state.ts — 新增 isRelicSlotsFull/addRelicWithCapacity/removeRelic/replaceRelic + 导入
- src/src/core/state/RunState.ts — addRelic 返回 boolean + 容量检查 + fromJSON 截断
- src/src/systems/relicPicker.ts — 满槽替换模式 showReplaceUI + 导入
- src/src/systems/restStage.ts — grantRandomRelic 容量检查 + 改用 addRelicWithCapacity
- src/src/systems/battle.ts — renderRelicDisplay 10 槽位渲染
- src/src/scenes/shop/ShopScene.ts — IRunState 接口 + 槽位满退还金币
- tests/unit/systems/relics/relics.slots.test.ts — **新建** 16 个槽位测试
- tests/unit/core/state/RunState.test.ts — +4 个容量/迁移测试
- tests/unit/scenes/shop/ShopScene.test.ts — mock 更新（addRelic 返回值 + addGold）
