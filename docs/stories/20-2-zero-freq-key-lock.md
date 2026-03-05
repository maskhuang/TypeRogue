# Story 20.2: 零频键位锁定

Status: done

## Story

作为一个 **玩家**，
我想要 **字频为 0 的键位自动灰显且禁止绑定技能**，
以便 **避免误将技能绑到战斗中永远不会触发的键位上，浪费 build 资源**。

## Acceptance Criteria

1. `renderBuildManager()` 中计算字频后，频率为 0 的键位添加 `.freq-locked` 样式
2. 零频键位已有技能自动解绑（渲染前扫描 bindings）
3. 零频键位灰显（opacity: 0.3）且不可交互（pointer-events: none）
4. 拖拽放置区拒绝 `.freq-locked` 键位（`accepts` 返回 false）
5. 购买新技能自动绑定时跳过零频键位
6. 模块级 `cachedLetterFreqs` 缓存供自动绑定逻辑使用

## Tasks / Subtasks

- [x] Task 1: 字频缓存 (AC: 6)
  - [x] 1.1 在 `shop.ts` 模块顶层声明 `let cachedLetterFreqs: Map<string, number> | null`
  - [x] 1.2 在 `renderBuildManager()` 中将 `letterFreqs` 赋值给 `cachedLetterFreqs`

- [x] Task 2: 自动解绑 (AC: 2)
  - [x] 2.1 在 `renderBuildManager()` 键盘渲染前，遍历 bindings 删除频率为 0 的键上的技能

- [x] Task 3: 视觉锁定 (AC: 1, 3)
  - [x] 3.1 键位渲染时 `freq === 0` 添加 `slot.classList.add('freq-locked')`
  - [x] 3.2 CSS：`.key-slot.freq-locked { opacity: 0.3; pointer-events: none; }`

- [x] Task 4: 拖拽拒绝 (AC: 4)
  - [x] 4.1 `registerShopDropZones()` 中 key-slot accepts 增加 `freq-locked` 检查

- [x] Task 5: 自动绑定跳过 (AC: 5)
  - [x] 5.1 `purchaseShopItem()` 中 `KEYS.find()` 增加 `cachedLetterFreqs?.get(k) ?? 0 > 0` 条件

## Dev Notes

### 防御层次

零频锁定有 4 层防御：
1. **渲染前解绑** — 进入商店时立即清理无效绑定
2. **视觉灰显** — 玩家一眼看出哪些键不可用
3. **拖拽拒绝** — 即使绕过视觉，拖拽系统也会拒绝
4. **自动绑定跳过** — 购买技能时不会绑到零频键

### 字频变化时机

删词/加词都会触发 `renderBuildManager()` → 重新计算字频 → 重新判断锁定状态。原本有技能的键，如果因删词变成零频，会在下次渲染时自动解绑。

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

#### Code Review Fixes (2026-03-04)
- [H1] 自动解绑改为先收集再批量删除，避免遍历 Map 中修改；移除未使用的 `skillId` 解构
- [M3] 自动解绑时增加 showFeedback 通知玩家（"技能 X 已从 Y 键解绑（字频归零）"）
- [M2] 新增 10 个单元测试覆盖自动解绑和自动绑定跳过逻辑

### File List
**Modified:**
- `src/src/systems/shop.ts` — cachedLetterFreqs 缓存、自动解绑（批量安全模式+反馈）、freq-locked class、accepts 检查、自动绑定跳过
- `src/src/style.css` — .key-slot.freq-locked 样式

**Created:**
- `src/tests/unit/systems/word-inventory-freq-lock.test.ts` — 10 个单元测试（与 20-1 共享）
