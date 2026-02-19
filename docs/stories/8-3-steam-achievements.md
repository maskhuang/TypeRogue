---
title: "Story 8.3: Steam 成就"
epic: "Epic 8: Electron 与 Steam"
story_key: "8-3-steam-achievements"
status: "completed"
created: "2026-02-19"
completed: "2026-02-19"
depends_on:
  - "8-2-steam-initialization"
---

# Story 8.3: Steam 成就

## 概述

实现 Steam 成就系统，将游戏内成就与 Steam 成就 API 连接。需要定义成就映射、实现解锁逻辑，并处理 Steam 离线时的本地缓存和重连同步。

## Story

作为一个 **玩家**，
我想要 **在达成游戏里程碑时获得 Steam 成就**，
以便 **在 Steam 社区展示我的游戏进度**。

## 验收标准

- [x] AC1: 成就定义映射 - 游戏内成就 ID 与 Steam 成就 API 名称映射
- [x] AC2: 解锁成就 API 调用 - 通过 steamworks.js 解锁 Steam 成就
- [x] AC3: 成就进度追踪 - 支持带进度的成就（如"完成10局"）
- [x] AC4: 离线模式处理 - Steam 不可用时本地缓存待解锁成就
- [x] AC5: 重连同步 - Steam 恢复时自动同步缓存的成就
- [x] AC6: IPC 通道实现 - 完善 `steam:unlock-achievement` 处理器
- [x] AC7: 单元测试覆盖成就服务和离线缓存逻辑

## Tasks / Subtasks

### Task 1: 定义成就数据结构和映射 (AC: #1)

**文件:** `src/shared/achievements.ts`

```typescript
// 游戏成就 ID 与 Steam API 名称映射 (19 achievements)
export const ACHIEVEMENT_MAP = {
  // 基础成就
  first_win: 'ACH_FIRST_WIN',          // 首次通关
  first_skill: 'ACH_FIRST_SKILL',      // 首次绑定技能
  first_relic: 'ACH_FIRST_RELIC',      // 首次获得遗物

  // 进度成就 - 完成局数
  runs_10: 'ACH_RUNS_10',              // 完成10局
  runs_50: 'ACH_RUNS_50',              // 完成50局
  runs_100: 'ACH_RUNS_100',            // 完成100局

  // 技能成就
  all_skills: 'ACH_ALL_SKILLS',        // 收集所有技能
  max_skill: 'ACH_MAX_SKILL',          // 技能升到满级
  skills_10: 'ACH_SKILLS_10',          // 解锁10个技能

  // 分数成就
  score_10k: 'ACH_SCORE_10K',          // 单局10000分
  score_50k: 'ACH_SCORE_50K',          // 单局50000分
  score_100k: 'ACH_SCORE_100K',        // 单局100000分

  // 连击成就
  combo_20: 'ACH_COMBO_20',            // 20连击
  combo_50: 'ACH_COMBO_50',            // 50连击
  combo_100: 'ACH_COMBO_100',          // 100连击

  // 遗物成就
  all_relics: 'ACH_ALL_RELICS',        // 收集所有遗物
  relics_5: 'ACH_RELICS_5',            // 收集5个遗物

  // 特殊成就
  perfect_stage: 'ACH_PERFECT_STAGE',  // 无错误通过一关
  speedrun: 'ACH_SPEEDRUN',            // 5分钟内通关
} as const

export type AchievementId = keyof typeof ACHIEVEMENT_MAP
export type SteamAchievementName = (typeof ACHIEVEMENT_MAP)[AchievementId]

// 带进度的成就定义
export interface ProgressAchievement {
  id: AchievementId
  current: number
  target: number
}

export const PROGRESS_ACHIEVEMENTS: Partial<Record<AchievementId, { target: number }>> = {
  runs_10: { target: 10 },
  runs_50: { target: 50 },
  runs_100: { target: 100 },
  skills_10: { target: 10 },
  relics_5: { target: 5 },
}
```

- [x] Subtask 1.1: 创建 achievements.ts 文件
- [x] Subtask 1.2: 定义完整成就映射（19 个成就）
- [x] Subtask 1.3: 定义进度成就的目标值

### Task 2: 扩展 Steam 服务支持成就 API (AC: #2, #3)

**文件:** `src/main/steam.ts`

扩展现有的 steam.ts 添加成就相关函数：

```typescript
// 扩展 SteamClient 类型
interface SteamAchievements {
  activate(name: string): boolean
  isActivated(name: string): boolean
  getAchievementAchievedPercent(name: string): number
  // 进度成就
  indicateAchievementProgress(name: string, curProgress: number, maxProgress: number): boolean
}

interface SteamClient {
  localplayer: SteamLocalPlayer
  achievement: SteamAchievements  // 添加成就 API
}

/**
 * 解锁 Steam 成就
 * @param steamName Steam API 成就名称
 * @returns true 如果成功解锁
 */
export function unlockAchievement(steamName: string): boolean {
  if (!steamAvailable || !steamClient) {
    return false
  }
  try {
    return steamClient.achievement.activate(steamName)
  } catch (error) {
    console.error('Steam: Failed to unlock achievement', steamName, error)
    return false
  }
}

/**
 * 检查成就是否已解锁
 */
export function isAchievementUnlocked(steamName: string): boolean {
  // ...
}

/**
 * 更新成就进度
 */
export function setAchievementProgress(steamName: string, current: number, max: number): boolean {
  // ...
}
```

- [x] Subtask 2.1: 扩展 SteamClient 类型定义
- [x] Subtask 2.2: 实现 unlockAchievement 函数
- [x] Subtask 2.3: 实现 isAchievementUnlocked 函数
- [x] Subtask 2.4: 实现 setAchievementProgress 函数

### Task 3: 实现离线缓存机制 (AC: #4, #5)

**文件:** `src/main/achievement-cache.ts`

```typescript
// 缓存待同步的成就
interface PendingAchievement {
  steamName: string
  unlockedAt: number  // timestamp
  progress?: { current: number; max: number }
}

let pendingAchievements: PendingAchievement[] = []

/**
 * 添加待同步成就
 */
export function cachePendingAchievement(steamName: string): void {
  if (!pendingAchievements.find(a => a.steamName === steamName)) {
    pendingAchievements.push({
      steamName,
      unlockedAt: Date.now()
    })
    // 持久化到本地
    savePendingAchievements()
  }
}

/**
 * 同步所有待处理成就到 Steam
 */
export function syncPendingAchievements(): number {
  if (!isSteamAvailable()) return 0

  let synced = 0
  pendingAchievements = pendingAchievements.filter(pending => {
    const success = unlockAchievement(pending.steamName)
    if (success) synced++
    return !success  // 保留失败的
  })

  if (synced > 0) {
    savePendingAchievements()
  }
  return synced
}

/**
 * 加载缓存的待同步成就
 */
export function loadPendingAchievements(): void {
  // 从 userData 加载
}

/**
 * 保存待同步成就到本地
 */
function savePendingAchievements(): void {
  // 保存到 userData
}
```

- [x] Subtask 3.1: 创建 achievement-cache.ts 文件
- [x] Subtask 3.2: 实现缓存添加和同步逻辑
- [x] Subtask 3.3: 实现持久化存储（保存到 userData）
- [x] Subtask 3.4: 在 Steam 初始化后自动同步

### Task 4: 更新 IPC 处理器 (AC: #6)

**文件:** `src/main/index.ts`

更新 `registerAppHandlers()` 中的成就处理器：

```typescript
import { unlockAchievement, isAchievementUnlocked, setAchievementProgress } from './steam'
import { cachePendingAchievement, syncPendingAchievements } from './achievement-cache'
import { ACHIEVEMENT_MAP, AchievementId } from '../shared/achievements'

// 在 registerAppHandlers() 中
ipcMain.handle(IPC_CHANNELS.STEAM_UNLOCK_ACHIEVEMENT, (_, achievementId: AchievementId) => {
  const steamName = ACHIEVEMENT_MAP[achievementId]
  if (!steamName) {
    return { success: false, error: `Unknown achievement: ${achievementId}` }
  }

  if (isSteamAvailable()) {
    const success = unlockAchievement(steamName)
    return { success, data: { synced: true } }
  } else {
    // 离线模式：缓存待同步
    cachePendingAchievement(steamName)
    return { success: true, data: { synced: false, cached: true } }
  }
})
```

- [x] Subtask 4.1: 更新 STEAM_UNLOCK_ACHIEVEMENT 处理器
- [x] Subtask 4.2: 添加成就进度更新 IPC（如需）
- [x] Subtask 4.3: 在 Steam 重新连接时触发同步

### Task 5: 更新 preload.ts 类型 (AC: #6)

**文件:** `src/main/preload.ts`

更新类型定义以反映新的返回值：

```typescript
steam: {
  // ...existing...
  unlockAchievement: (id: string) => Promise<{
    success: boolean
    data?: { synced: boolean; cached?: boolean }
    error?: string
  }>
}
```

- [x] Subtask 5.1: 更新 unlockAchievement 返回类型

### Task 6: 单元测试 (AC: #7)

**文件:** `src/tests/unit/main/achievements.test.ts`

```typescript
describe('AchievementService', () => {
  describe('unlockAchievement', () => {
    it('Steam 可用时应该直接解锁', () => {})
    it('Steam 不可用时应该缓存成就', () => {})
  })

  describe('syncPendingAchievements', () => {
    it('应该同步所有缓存的成就', () => {})
    it('同步失败的成就应该保留在缓存', () => {})
  })

  describe('Achievement progress', () => {
    it('应该正确更新进度成就', () => {})
  })
})
```

- [x] Subtask 6.1: 创建 achievements.test.ts
- [x] Subtask 6.2: 测试在线解锁流程
- [x] Subtask 6.3: 测试离线缓存和同步
- [x] Subtask 6.4: 测试进度成就更新

## Dev Notes

### steamworks.js 成就 API

steamworks.js 提供以下成就相关 API：

```typescript
// 解锁成就
client.achievement.activate('ACH_NAME')

// 检查是否已解锁
client.achievement.isActivated('ACH_NAME')

// 更新进度成就
client.achievement.indicateAchievementProgress('ACH_NAME', current, max)

// 获取全球解锁率
client.achievement.getAchievementAchievedPercent('ACH_NAME')
```

### Steam 成就配置

1. Steam 后台需要配置成就（Steamworks Partner）
2. 成就 API 名称必须与后台配置一致
3. 使用测试 AppID 480 时，成就不会真正解锁但可以测试 API

### 离线模式策略

根据 project-context.md:
> **Steam offline:** Graceful fallback, local achievements

1. 检测到离线 → 缓存成就到本地文件
2. 下次启动时检测 Steam 状态
3. Steam 可用 → 自动同步所有缓存成就
4. 游戏内成就显示不依赖 Steam 状态

### 与 Meta 系统集成

成就解锁应该通过 StateCoordinator 触发，而不是直接调用：

```typescript
// 在 StateCoordinator 中
onRunComplete(result: RunResult) {
  // 更新 meta 统计
  this.meta.totalRuns++

  // 检查成就条件
  if (this.meta.totalRuns === 10) {
    this.triggerAchievement('runs_10')
  }
}

private async triggerAchievement(id: AchievementId) {
  // 更新本地成就状态
  this.meta.achievements.add(id)

  // 通知 Steam（通过 IPC）
  await window.electronAPI.steam.unlockAchievement(id)

  // 显示通知
  eventBus.emit('achievement:unlock', { id })
}
```

### Project Structure Notes

**新建文件：**
- `src/shared/achievements.ts` - 成就定义和映射（shared 因为渲染进程也需要）
- `src/main/achievement-cache.ts` - 离线缓存逻辑
- `src/tests/unit/main/achievements.test.ts` - 单元测试

**修改文件：**
- `src/main/steam.ts` - 扩展成就 API
- `src/main/index.ts` - 更新 IPC 处理器
- `src/main/preload.ts` - 更新类型定义

### References

- [game-architecture.md - Electron Architecture](../game-architecture.md#electron-architecture)
- [game-architecture.md - Save System](../game-architecture.md#save-system)
- [project-context.md - Electron Architecture Rules](../project-context.md#electron-architecture-rules)
- [project-context.md - Edge Cases: Steam offline](../project-context.md#edge-cases-to-handle)
- [steamworks.js achievements API](https://github.com/nickleefly/steamworks.js#achievements)
- Story 8.2 实现的 steam.ts 基础服务

### 依赖关系

**依赖:**
- Story 8.2 (Steam 初始化) - 提供 steamClient 和基础 API

**被依赖:**
- 无（但与 Story 6.3 解锁系统配合使用）

---

## Dev Agent Record

### Agent Model Used

Claude claude-opus-4-5-20251101

### Debug Log References

None - implementation proceeded without issues.

### Code Review Fixes (2026-02-19)

**HIGH severity fixes:**
1. Added production environment guards to `_resetForTesting()` and `_getPendingList()` in achievement-cache.ts
2. Added missing `STEAM_SET_ACHIEVEMENT_PROGRESS` IPC channel for AC#3 (progress tracking)
3. Added IPC handler for `setAchievementProgress` in index.ts
4. Updated story documentation to match actual implementation (19 achievements, 5 progress achievements)

**MEDIUM severity fixes:**
1. Updated story code template to use correct type `Partial<Record<AchievementId, { target: number }>>`
2. Fixed preload.ts comment from "Story 8.2+ 实现" to "Story 8.3 成就"
3. Added `setAchievementProgress` function and types to preload.ts

### Completion Notes List

1. All 6 tasks completed successfully
2. Created `src/shared/achievements.ts` with 19 achievements mapped to Steam API names
3. Extended `src/main/steam.ts` with SteamAchievements interface and functions (unlockAchievement, isAchievementUnlocked, setAchievementProgress, getAchievementGlobalPercent)
4. Created `src/main/achievement-cache.ts` for offline caching with atomic persistence
5. Updated `src/main/index.ts` with IPC handler and startup sync logic
6. Updated `src/main/preload.ts` with extended return type for unlockAchievement
7. Created comprehensive test suites: 19 tests in achievements.test.ts, 20 tests in achievement-cache.test.ts
8. Total test suite: 1297 tests passing

### File List

**New Files Created:**
- `src/shared/achievements.ts` - Achievement definitions and Steam API mapping (19 achievements)
- `src/main/achievement-cache.ts` - Offline caching with atomic persistence and production guards
- `src/tests/unit/main/achievements.test.ts` - 19 unit tests for achievement API
- `src/tests/unit/main/achievement-cache.test.ts` - 20 unit tests for caching logic

**Files Modified:**
- `src/main/steam.ts` - Extended with SteamAchievements interface and 4 new functions
- `src/main/index.ts` - Updated IPC handlers including setAchievementProgress and startup sync
- `src/main/preload.ts` - Updated TypeScript types for unlockAchievement and setAchievementProgress
- `src/shared/ipc-channels.ts` - Added STEAM_SET_ACHIEVEMENT_PROGRESS channel
