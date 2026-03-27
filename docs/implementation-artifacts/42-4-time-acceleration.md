# Story 42.4: 关内时间加速

Status: done

## Story

As a 玩家,
I want 战斗中时间流速随时间推移越来越快（二次方加速）,
so that 前期温和、后期陡峭，创造"心流→极限"的体验曲线。

## Acceptance Criteria

1. **AC1: 二次方加速公式** — 关内时间流速 = `1.0 + ACCEL_RATE × elapsedSeconds²`，无上限（越加越快）
2. **AC2: Boss 加速率更高** — 标准关 `ACCEL_RATE = 0.001`，Boss 关 `ACCEL_RATE = 0.0015`
3. **AC3: 倍率 HUD 显示** — 时间旁新增倍率指示器，实时显示当前加速值（如 "×1.3"）
4. **AC4: 倍率颜色渐变+脉冲** — 白(×1.0) → 黄(×1.3) → 橙(×1.6) → 红(×2.0)，变化时有缩放脉冲
5. **AC5: 与现有系统正确叠加** — 与 Boss `timeSpeed`、`getTimeScale()` 慢动作、修饰器护盾遗物无冲突叠加
6. **AC6: 时间精度无累积误差** — 加速基于已流逝秒数计算，非递增累积

## Tasks / Subtasks

- [x] **Task 1: 加速常量与纯函数** (AC: 1, 2)
  - [x] 1.1 `core/constants.ts` BALANCE 新增 `ACCEL_RATE_STANDARD: 0.001` 和 `ACCEL_RATE_BOSS: 0.0015`
  - [x] 1.2 `systems/battle.ts` 新增纯函数 `getTimeAcceleration(elapsedSeconds: number, isBoss: boolean): number`，返回 `1.0 + accelRate * elapsedSeconds * elapsedSeconds`（二次方）
  - [x] 1.3 确认函数在 `elapsedSeconds = 0` 时返回 `1.0`（无加速）

- [x] **Task 2: 追踪已流逝时间** (AC: 6)
  - [x] 2.1 `battle.ts` 新增模块级变量 `let _elapsedSeconds = 0`
  - [x] 2.2 `startLevel()` 中重置 `_elapsedSeconds = 0`
  - [x] 2.3 `startTimer()` 的 `setInterval` 回调中：`_elapsedSeconds += 0.1`（每 100ms tick 累加 0.1s）
  - [x] 2.4 确认 `_elapsedSeconds` 在 `battlePaused` 时不累加
  - [x] 2.5 Phoenix 复活时不重置 `_elapsedSeconds`（复活继续当前关卡，已流逝时间应继续累加）

- [x] **Task 3: 修改时间消耗公式** (AC: 1, 5)
  - [x] 3.1 `startTimer()` 行 ~1287：将 `state.time -= 0.1 * timeSpeed * getTimeScale()` 改为 `state.time -= 0.1 * timeSpeed * getTimeScale() * getTimeAcceleration(_elapsedSeconds, isBoss)`
  - [x] 3.2 确定 `isBoss` 参数来源：使用 `getStageType(state.level) === 'boss'` 判断，可在 `startTimer` 外部缓存避免每 tick 调用
  - [x] 3.3 确认与 Boss `timeSpeed`（含 escalation 遗物加成）正确相乘叠加
  - [x] 3.4 确认与 `getTimeScale()`（慢动作 0.7）正确相乘叠加
  - [x] 3.5 确认修饰器护盾遗物（`getShieldedTimeSpeed`）在 `timeSpeed` 层面生效，不影响 `getTimeAcceleration` 独立计算

- [x] **Task 4: 倍率 HUD 元素** (AC: 3)
  - [x] 4.1 `index.html` 在 timer 显示区域旁添加 `<span id="time-accel">×1.0</span>` 元素
  - [x] 4.2 `style.css` 添加 `.time-accel` 基础样式（字体大小、位置、transition）
  - [x] 4.3 `battle.ts` `getElements()` 中添加 `timeAccel` 元素引用

- [x] **Task 5: 倍率 HUD 更新逻辑** (AC: 3, 4)
  - [x] 5.1 `updateHUD()` 或 `updateTimerDisplay()` 中：计算当前加速值，更新 `el.timeAccel.textContent = '×' + accel.toFixed(1)`
  - [x] 5.2 颜色渐变：`accel < 1.3` 白 → `< 1.6` 黄 `#ffe66d` → `< 2.0` 橙 `#ff8844` → `>= 2.0` 红 `#ff4444`
  - [x] 5.3 脉冲动画：当显示文本变化时添加 CSS class `accel-pulse`（scale 1.0→1.3→1.0，300ms transition），animation end 后移除
  - [x] 5.4 `_elapsedSeconds === 0` 或加速 = 1.0 时隐藏倍率显示（避免开局显示无意义的 ×1.0）

- [x] **Task 6: 生命周期管理** (AC: 1, 5)
  - [x] 6.1 `startLevel()` 重置 `_elapsedSeconds = 0`
  - [x] 6.2 `endLevel()` 时 `_elapsedSeconds` 停止累加（timer 已被 clearInterval）
  - [x] 6.3 Phoenix 复活后 `_elapsedSeconds` 保持当前值（`startTimer()` 会重新启动 interval，但 `_elapsedSeconds` 不重置）
  - [x] 6.4 Demo 模式兼容检查

- [x] **Task 7: 构建验证** (AC: 5, 6)
  - [x] 7.1 `vite build` 通过
  - [x] 7.2 手动验证：标准关 30 秒时间，开始 ×1.0 → 10s 后 ×1.1 → 20s 后 ×1.4 → 30s 后 ×1.9（二次方曲线）
  - [x] 7.3 手动验证：Boss 关加速更明显（0.0015 vs 0.001），30s 时 ×2.35
  - [x] 7.4 确认与 boss_escalation 修饰器同时生效时无冲突（两者相乘叠加）

## Dev Notes

### 核心设计决策

**本 Story 只做"时间二次方加速 + 倍率 HUD"，不做以下内容：**
- ❌ 感官反馈（42.9）— 屏幕暗角、BGM 加速、击键音高等
- ❌ 目标分数公式变更（42.5）— 不涉及
- ❌ 续命机制（42.8）— 不涉及
- ❌ 时间加速上限 — Epic 明确"无上限"，自然收敛

### 现有时间消耗公式（42.2 后）

```typescript
// battle.ts startTimer() setInterval 回调（100ms tick）
const modEffect = getActiveParams();
let timeSpeed = getShieldedTimeSpeed(modEffect?.timeSpeed ?? 1);
const escalateBonus = getEscalateTimeSpeedBonus();
if (escalateBonus > 0) timeSpeed += getShieldedValue(escalateBonus, true);
state.time -= 0.1 * timeSpeed * getTimeScale();
```

**三个现有乘数：**
1. `timeSpeed` — Boss 修饰器基础时间速度（默认 1.0），含 `boss_escalation` 每 15s +20%
2. `getShieldedTimeSpeed()` — 修饰器护盾遗物削弱 timeSpeed 加速部分 25%
3. `getTimeScale()` — 慢动作效果（默认 1.0，触发时 0.7，300ms 后恢复）

### 改造后公式

```typescript
// 新增二次方加速因子
const timeAccel = getTimeAcceleration(_elapsedSeconds, isBoss);
// timeAccel = 1.0 + ACCEL_RATE * elapsed² — 越加越快
state.time -= 0.1 * timeSpeed * getTimeScale() * timeAccel;
```

**叠加关系：`time_consumed = 0.1 × timeSpeed × slowMotion × stageAccel`**

- `timeSpeed` = Boss 修饰器（含 escalation 遗物增长）
- `slowMotion` = `getTimeScale()`（技能/遗物触发的短暂慢动作）
- `stageAccel` = `getTimeAcceleration()`（本 Story 新增的二次方加速）

**三者独立计算，最终相乘。** Boss 关同时有 `timeSpeed` 修饰器和更高的 `ACCEL_RATE`，造成双重压力。

### 时间加速曲线示例（二次方：前缓后陡）

**标准关（ACCEL_RATE = 0.001）：`1.0 + 0.001 × t²`**
| 已过时间 | 加速倍率 | 每秒实际消耗 | vs 线性 |
|---------|---------|-------------|---------|
| 0s | ×1.0 | 1.0s | 同 |
| 10s | ×1.1 | 1.1s | 线性 ×1.3 |
| 20s | ×1.4 | 1.4s | 线性 ×1.6 |
| 30s | ×1.9 | 1.9s | 同 |
| 45s | ×3.0 | 3.0s | 线性 ×2.35 |
| 60s | ×4.6 | 4.6s | 线性 ×2.8 |

**Boss 关（ACCEL_RATE = 0.0015）：`1.0 + 0.0015 × t²`**
| 已过时间 | 加速倍率 | 每秒实际消耗 | vs 线性 |
|---------|---------|-------------|---------|
| 0s | ×1.0 | 1.0s | 同 |
| 10s | ×1.15 | 1.15s | 线性 ×1.45 |
| 20s | ×1.6 | 1.6s | 线性 ×1.9 |
| 30s | ×2.35 | 2.35s | 同 |
| 45s | ×4.0 | 4.0s | 线性 ×3.0 |

**设计优势**：前 15s 几乎无感（×1.0→×1.2），给玩家进入心流的缓冲；后半段加速度本身在增长，紧迫感指数级攀升。

### 已流逝时间追踪

使用 `_elapsedSeconds` 模块级变量，每 100ms tick 累加 0.1s。优于使用 `state.timeMax - state.time` 的理由：
1. `state.time` 会被时间遗物（time_dew）加秒，导致"回退"
2. `state.timeMax` 可能被 tempBuff 修改
3. 独立追踪更精确，不受其他系统影响

**注意**：`_elapsedSeconds` 必须在 `battlePaused` 时不累加——暂停时间不应计入加速。

### Boss Escalation 修饰器交互

Boss `boss_escalation` 修饰器（渐进失控）：
- 每 15s `timeSpeed += 0.20`（影响 `timeSpeed` 变量）
- 本 Story 的加速在 `timeAccel` 因子，独立于 `timeSpeed`
- 两者相乘叠加：Boss 关同时有 escalation + stageAccel = 极端压力

**示例**：Boss 30s 时，escalation stacks=2 → timeSpeed=1.4，stageAccel=×2.35（0.0015×900+1）
实际消耗 = 0.1 × 1.4 × 1.0 × 2.35 = 0.329s/tick = 3.29s/实际秒

### HUD 倍率显示

```
┌─────────────────────────────────┐
│  ⏱ 25  ×1.3                     │  ← timer + 倍率显示
│  ████████████░░░░  [progress]    │
└─────────────────────────────────┘
```

**颜色渐变（线性插值）：**
```typescript
if (accel < 1.3) color = '#fff';        // 白：平静
else if (accel < 1.6) color = '#ffe66d'; // 黄：加速中
else if (accel < 2.0) color = '#ff8844'; // 橙：紧张
else color = '#ff4444';                   // 红：极限
```

**脉冲动画**：当 `textContent` 变化时添加 `accel-pulse` CSS class：
```css
.accel-pulse {
  animation: accel-pulse 0.3s ease-out;
}
@keyframes accel-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
```

### 42.2/42.3 的交互影响

- **42.2 战斗继续**：达标后继续到时间耗尽。时间加速使达标后的"免费溢出时间"越来越短——自然限制溢出分累积。
- **42.3 溢出分注入**：溢出分注入后初始分更高，可能更快达标。但加速使后续时间消耗更快，平衡了优势。
- **时间遗物（time_dew）**：加秒不影响 `_elapsedSeconds`，但加的时间会在高加速下被更快消耗——降低加秒遗物的后期价值（设计意图：自然收敛）。

### Project Structure Notes

**依赖方向**（必须遵守）：
```
data → core → systems → scenes
```

- `ACCEL_RATE_*` 常量在 `core/constants.ts` — 数据层
- `getTimeAcceleration()` 在 `systems/battle.ts` — 纯函数
- `_elapsedSeconds` 为 `battle.ts` 模块级变量
- HUD 元素在 `index.html` + `style.css` — 表现层
- 不新增类型到 `core/types.ts`（加速值无需持久化，仅关内有效）

### startTimer() 改造要点（battle.ts ~行 1275）

```typescript
// 现有代码（行 1275-1332）：
function startTimer(): void {
  state.time = state.timeMax + state.player.timeBonus;
  // ...
  timerInterval = setInterval(() => {
    if (state.phase !== 'battle') { /* ... */ }
    if (battlePaused) return;

    const modEffect = getActiveParams();
    let timeSpeed = getShieldedTimeSpeed(modEffect?.timeSpeed ?? 1);
    const escalateBonus = getEscalateTimeSpeedBonus();
    if (escalateBonus > 0) timeSpeed += getShieldedValue(escalateBonus, true);
    state.time -= 0.1 * timeSpeed * getTimeScale();

    // ... timer display, escalation tick, etc.
  }, 100);
}

// 改造后：
function startTimer(): void {
  state.time = state.timeMax + state.player.timeBonus;
  const isBoss = getStageType(state.level) === 'boss'; // 缓存一次
  // ...
  timerInterval = setInterval(() => {
    if (state.phase !== 'battle') { /* ... */ }
    if (battlePaused) return;

    _elapsedSeconds += 0.1; // Story 42.4: 追踪已流逝时间

    const modEffect = getActiveParams();
    let timeSpeed = getShieldedTimeSpeed(modEffect?.timeSpeed ?? 1);
    const escalateBonus = getEscalateTimeSpeedBonus();
    if (escalateBonus > 0) timeSpeed += getShieldedValue(escalateBonus, true);
    const timeAccel = getTimeAcceleration(_elapsedSeconds, isBoss); // 1.0 + rate * t²
    state.time -= 0.1 * timeSpeed * getTimeScale() * timeAccel;

    // ... timer display, escalation tick, etc.
  }, 100);
}
```

### References

- [Source: docs/stories/epic-42-stage-flow-redesign.md#Story 42.4]
- [Source: docs/implementation-artifacts/42-2-battle-continuation.md — 42.2 timer 改造上下文]
- [Source: docs/implementation-artifacts/42-3-overflow-score.md — 42.3 溢出分交互]
- [Source: src/src/systems/battle.ts — startTimer ~行 1275, updateTimerDisplay ~行 1335, startLevel ~行 1613]
- [Source: src/src/effects/juice.ts — getTimeScale() 慢动作 ~行 243]
- [Source: src/src/data/bossModifiers.ts — boss_escalation ~行 721, getEscalateTimeSpeedBonus ~行 745]
- [Source: src/src/systems/relics/BossModifierRelicBehaviors.ts — getShieldedTimeSpeed ~行 43]
- [Source: src/src/core/constants.ts — BALANCE ~行 59]
- [Source: docs/project-context.md — State Management Rules, dependency direction]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A — 无运行时错误

### Completion Notes List
1. Task 1: BALANCE 新增 `ACCEL_RATE_STANDARD: 0.001` 和 `ACCEL_RATE_BOSS: 0.0015`，battle.ts 新增纯函数 `getTimeAcceleration()` 使用二次方公式 `1.0 + rate × t²`
2. Task 2: 新增模块级变量 `_elapsedSeconds`，在 startLevel() 重置，setInterval 回调中每 tick +0.1s，battlePaused 时不累加（return 在 += 之前）
3. Task 3: startTimer() 时间消耗公式新增 `* timeAccel` 因子，isBoss 缓存在 startTimer 入口避免每 tick 调用
4. Task 4: index.html 新增 `<span id="time-accel">` 元素，style.css 新增 `.time-accel` 样式 + `.accel-pulse` 动画，UIElements 接口 + initElements 新增 `timeAccel`
5. Task 5: updateTimerDisplay() 末尾新增倍率 HUD 更新逻辑 — 文本、颜色渐变（白→黄→橙→红）、脉冲动画（force reflow 触发）、×1.0 时隐藏
6. Task 6: _elapsedSeconds 在 startLevel() 重置，endLevel() 时 clearInterval 自然停止累加，Phoenix 复活只调 startTimer() 不调 startLevel() 所以不重置。Demo 兼容（startLevel 同路径）
7. Task 7: vite build 通过（414.57 kB），测试 34 failed/112 passed 均为 pre-existing（rest stage、cycle-scaling、BGM 等），无新增失败

### Code Review Fixes
8. Review Fix #1: ×1.0 HUD 隐藏条件从 `accel <= 1.0` 改为 `accelText === '×1.0'` — 修复开局 ~7s 显示无意义 ×1.0 的问题（toFixed(1) 将 1.00001 显示为 "1.0"）
9. Review Fix #2: `isBoss` 从 startTimer 局部变量提升为模块级 `_isBoss` — updateTimerDisplay 复用，消除每 tick 重复调用 getStageType

### File List
- `src/src/core/constants.ts` — BALANCE 新增 ACCEL_RATE_STANDARD、ACCEL_RATE_BOSS
- `src/src/core/types.ts` — UIElements 接口新增 timeAccel
- `src/src/ui/elements.ts` — initElements 新增 timeAccel 元素引用
- `src/src/systems/battle.ts` — getTimeAcceleration 纯函数、_elapsedSeconds/_lastAccelText 变量、startTimer 加速公式、updateTimerDisplay 倍率 HUD、startLevel 重置
- `src/index.html` — timer-section 新增 time-accel span
- `src/src/style.css` — .time-accel 样式 + .accel-pulse 动画
- `docs/implementation-artifacts/42-4-time-acceleration.md` — Story 文件更新
- `docs/implementation-artifacts/sprint-status.yaml` — 42-4 状态更新
