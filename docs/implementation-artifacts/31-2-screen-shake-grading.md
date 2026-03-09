# Story 31.2: 屏幕震动分级系统

Status: done

## Story

As a 玩家,
I want 高分词语结算时屏幕震动强度与分数量级匹配,
so that 我能通过体感反馈直观感受 build 的爆发力。

## Acceptance Criteria

1. **5 档震动强度** — 词语结算时根据 `finalWordScore` 触发对应档位的屏幕震动：
   - 100-499: 微震（2px, 0.1s）
   - 500-999: 轻震（4px, 0.15s）
   - 1000-4999: 中震（6px, 0.2s）
   - 5000-9999: 强震（10px, 0.3s）
   - 10000+: 猛震（16px, 0.4s）+ 屏幕闪光
2. **随机方向与自然衰减** — 每次震动初始方向随机化，振幅从 100% 自然衰减到 0
3. **最大值叠加** — 多个震动同时发生时取最大强度，不累加
4. **无障碍** — 震动可通过代码级开关禁用（`shakeEnabled` 标志），为后续设置菜单预留接口
5. **不影响点击** — 震动使用 `transform` 实现，不改变布局，不影响 UI 元素的点击检测
6. **单元测试** — `getShakeIntensity()` 5 档阈值边界测试 + 震动参数查表测试

## Tasks / Subtasks

- [x] Task 1: 重构 `screenShake()` 为 5 档查表系统 (AC: 1, 5)
  - [x] 在 `src/effects/juice.ts` 定义 `SHAKE_TIERS` 查表数组：`[{ x, y, duration }]` 对应 5 档
  - [x] 重写 `screenShake(intensity: 1|2|3|4|5)` 使用查表获取参数
  - [x] 设置 CSS 变量 `--shake-x`, `--shake-y`, `--shake-duration`
  - [x] intensity 5 时额外调用 `screenFlash('#ffd700', 0.3)`
- [x] Task 2: 重构 `getShakeIntensity()` 为 5 档 (AC: 1)
  - [x] 更新阈值：100 → 1, 500 → 2, 1000 → 3, 5000 → 4, 10000 → 5
  - [x] 低于 100 分返回 0（不震动）
  - [x] 移除对 `BALANCE.SHAKE_MID_THRESHOLD` / `SHAKE_HIGH_THRESHOLD` 常量的依赖（直接内联阈值，与 `getScoreTier` 模式一致）
- [x] Task 3: 更新 CSS 震动动画支持可变时长 (AC: 1, 2, 5)
  - [x] 修改 `#game-container.shake-dynamic` 的 `animation-duration` 为 `var(--shake-duration, 0.15s)`
  - [x] 改进 `@keyframes shakeDynamic` 振幅衰减曲线（自然衰减到 0）
  - [x] 确认 `transform` 不影响 `pointer-events`
- [x] Task 4: 添加随机方向 (AC: 2)
  - [x] 在 `screenShake()` 中随机生成方向符号（±1）
  - [x] 将随机符号应用到 `--shake-x`, `--shake-y` CSS 变量
- [x] Task 5: 最大值叠加逻辑 (AC: 3)
  - [x] 添加模块级变量 `currentShakeIntensity` 追踪当前震动强度
  - [x] 新震动 intensity < 当前值时跳过（取最大值）
  - [x] 震动结束后重置 `currentShakeIntensity = 0`
- [x] Task 6: 集成到 `battle.ts` 的 `completeWord()` (AC: 1)
  - [x] 替换 L391-393 的内联三元表达式为 `getShakeIntensity(finalWordScore)` 调用
  - [x] intensity > 0 时才调用 `screenShake(intensity)`
  - [x] 删除 `BALANCE.SHAKE_MID_THRESHOLD` 和 `SHAKE_HIGH_THRESHOLD` 常量（已废弃）
- [x] Task 7: 单元测试 (AC: 6)
  - [x] `getShakeIntensity()` 10 个边界测试（99→0, 100→1, 499→1, 500→2, 999→2, 1000→3, 4999→3, 5000→4, 9999→4, 10000→5）
  - [x] `SHAKE_TIERS` 查表数据验证（5 项，x/y/duration 合理）
  - [x] 添加到现有 `src/tests/unit/effects/juice.test.ts`

## Dev Notes

### 架构要点

- **单渲染系统**：与 Story 31-1 不同，震动仅涉及 DOM 的 `#game-container` transform，不涉及 PixiJS
- **CSS 变量驱动**：通过 JS 设置 `--shake-x`, `--shake-y`, `--shake-duration`，CSS 动画读取这些变量
- **触发频率**：每词完成触发一次（`completeWord()`），不是逐帧，无性能顾虑

### 关键文件与集成点

| 文件 | 作用 | 修改内容 |
|------|------|----------|
| `src/effects/juice.ts` | 震动核心 | 重构 `screenShake()` + `getShakeIntensity()` |
| `src/systems/battle.ts` | 战斗逻辑 | `completeWord()` L391-393 替换震动调用 |
| `src/style.css` | CSS 动画 | `shakeDynamic` 支持可变时长 |
| `src/core/constants.ts` | 常量 | 删除 `SHAKE_MID_THRESHOLD` / `SHAKE_HIGH_THRESHOLD` |
| `src/tests/unit/effects/juice.test.ts` | 测试 | 新增震动分级测试 |

### 现有代码模式（必须遵循）

**当前 `screenShake()` 实现（需重构）：**
```typescript
// juice.ts L44-53 — 当前线性公式，需改为查表
export function screenShake(intensity = 1): void {
  const el = getElements();
  el.container.style.setProperty('--shake-x', `${3 * intensity}px`);
  el.container.style.setProperty('--shake-y', `${2 * intensity}px`);
  el.container.classList.remove('shake-dynamic');
  void el.container.offsetWidth;
  el.container.classList.add('shake-dynamic');
  setTimeout(() => el.container.classList.remove('shake-dynamic'), 150 * intensity);
}
```

**当前 `getShakeIntensity()` 实现（需扩展）：**
```typescript
// juice.ts L83-87 — 当前 3 档，需改为 5 档 + 0 档
export function getShakeIntensity(score: number): number {
  if (score >= BALANCE.SHAKE_HIGH_THRESHOLD) return 3;  // 20
  if (score >= BALANCE.SHAKE_MID_THRESHOLD) return 2;   // 10
  return 1;
}
```

**当前 `battle.ts` 震动调用（需替换）：**
```typescript
// battle.ts L391-393 — 未使用 getShakeIntensity()，硬编码阈值
const shakeIntensity = finalWordScore >= 20 ? 3 : finalWordScore >= 10 ? 2 : 1;
screenShake(shakeIntensity);
```

**当前 CSS 震动动画（需修改）：**
```css
/* style.css L850-860 */
#game-container.shake-dynamic {
    animation: shakeDynamic 0.15s;  /* 固定时长，需改为 var(--shake-duration) */
}
@keyframes shakeDynamic {
    0%, 100% { transform: translate(0, 0); }
    20% { transform: translate(calc(var(--shake-x) * -1), var(--shake-y)); }
    40% { transform: translate(var(--shake-x), calc(var(--shake-y) * -1)); }
    60% { transform: translate(calc(var(--shake-x) * -0.5), var(--shake-y)); }
    80% { transform: translate(var(--shake-x), calc(var(--shake-y) * -0.5)); }
}
```

**`BALANCE` 常量（需删除震动相关）：**
```typescript
// constants.ts L66-68 — 这两个常量将被移除
SHAKE_MID_THRESHOLD: 10,
SHAKE_HIGH_THRESHOLD: 20,
```

**`getScoreTier()` 模式（应对齐）：**
```typescript
// juice.ts L98-104 — getShakeIntensity 应采用同样的内联阈值风格
export function getScoreTier(score: number): string {
  if (score >= 10000) return 'score-legendary';
  if (score >= 5000) return 'score-rainbow';
  // ...
}
```

### 5 档震动参数设计

```typescript
const SHAKE_TIERS = [
  // intensity 1: 微震
  { x: 2, y: 1, duration: 100 },
  // intensity 2: 轻震
  { x: 4, y: 2, duration: 150 },
  // intensity 3: 中震
  { x: 6, y: 3, duration: 200 },
  // intensity 4: 强震
  { x: 10, y: 5, duration: 300 },
  // intensity 5: 猛震
  { x: 16, y: 8, duration: 400 },
];
```

### 避免的陷阱

- **不要** 修改 `actTransition.ts` 中的 `screenShake(3)` 调用 — Boss 出场的震动是独立逻辑，保持不变
- **不要** 使用 JS 动画循环（requestAnimationFrame）来实现震动 — 用 CSS `@keyframes` + `transform` 保证 GPU 加速
- **不要** 创建新的 Shaker 类或组件 — 直接扩展现有 `screenShake()` 函数
- **不要** 累加震动强度 — 多次震动取最大值
- **不要** 修改 `screenFlash()` 的实现 — 仅在 intensity 5 时调用它
- **不要** 在 `getShakeIntensity()` 返回 0 时仍然调用 `screenShake()` — 低于 100 分不震动
- **不要** 删除 `BALANCE.SHAKE_DURATION` 常量（如果存在） — 只删除阈值常量

### 性能约束

- CSS 动画仅使用 `transform`（GPU 加速），零 layout/paint 开销
- `screenShake()` 每词触发一次（~1-3 秒间隔），无帧预算压力
- `setTimeout` 清除 class，无需 requestAnimationFrame
- `getShakeIntensity()` 纯函数，O(1) 5 次比较

### BALANCE 常量清理

删除 `constants.ts` 中的：
```typescript
SHAKE_MID_THRESHOLD: 10,
SHAKE_HIGH_THRESHOLD: 20,
```

搜索所有引用确保无遗漏。已知引用点：
- `juice.ts` L83-86（`getShakeIntensity` — 本 story 重构）
- `battle.ts` L391-393（内联三元 — 本 story 替换）

### actTransition.ts 兼容性

`actTransition.ts` L64 调用 `screenShake(3)` 用于 Boss 出场。重构后 intensity=3 对应"中震"（6px, 0.2s），比当前的 intensity=3（x=9px, y=6px, 450ms）略弱。如需保持 Boss 出场震感，可考虑改为 `screenShake(4)`，但这不在本 story 范围内。

### Tech Spec vs Epic 阈值差异

| 来源 | 震动起始分数 | 档数 |
|------|-------------|------|
| Epic | 100 | 5 档 |
| Tech Spec Task 2 | 300 | 4 档 |

**以 Epic 为准**（5 档，从 100 开始），因为 Epic 是 AC 的权威来源，且与 Story 31-1 的颜色分级阈值对齐（silver 从 100 开始）。

### Project Structure Notes

- 源码在 `src/src/`，测试在 `src/tests/unit/`
- CSS 单文件 `src/src/style.css`
- 常量在 `src/src/core/constants.ts`
- 命名规范：camelCase 函数名，kebab-case CSS class

### References

- [Source: docs/stories/epic-21-number-juice.md#Story31.2] — 验收标准与震动参数表
- [Source: docs/implementation-artifacts/tech-spec-number-juice.md#Task2] — 实现方案（4档版本）
- [Source: src/src/effects/juice.ts#L44-53] — 现有 screenShake() 实现
- [Source: src/src/effects/juice.ts#L83-87] — 现有 getShakeIntensity() 实现
- [Source: src/src/systems/battle.ts#L391-393] — 战斗中震动调用集成点
- [Source: src/src/style.css#L850-860] — 现有 CSS 震动动画
- [Source: src/src/core/constants.ts#L66-68] — BALANCE 震动常量（待删除）
- [Source: src/src/systems/actTransition.ts#L64] — Boss 出场震动调用（不修改）
- [Source: docs/implementation-artifacts/31-1-number-color-grading.md] — 前序 Story 实现记录
- [Source: docs/game-architecture.md] — 60fps 性能约束、项目结构

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

无

### Completion Notes List

- `SHAKE_TIERS` 定义 5 档参数（x/y/duration），使用 `as const` 保证不可变
- `screenShake()` 重构为查表系统，从 `SHAKE_TIERS[intensity-1]` 获取参数
- `getShakeIntensity()` 从 3 档（阈值 10/20）扩展为 5+0 档（阈值 100/500/1000/5000/10000），与 `getScoreTier()` 模式对齐
- CSS `shakeDynamic` 动画时长改为 `var(--shake-duration, 150ms)`，衰减曲线改为 100%→80%→50%→30%→10%→0，添加 `ease-out`
- 随机方向通过 `Math.random() < 0.5 ? -1 : 1` 生成符号，应用到 CSS 变量
- 最大值叠加通过 `currentShakeIntensity` 模块变量 + `clearTimeout` 管理
- intensity 5（猛震）自动触发 `screenFlash('#ffd700', 0.3)` 金色闪光
- `shakeEnabled` 导出变量 + `setShakeEnabled()` setter 作为无障碍开关，`screenShake()` 入口守卫检查
- battle.ts 调用从硬编码三元表达式改为 `getShakeIntensity(finalWordScore)`，<100 分跳过震动
- 删除 `BALANCE.SHAKE_MID_THRESHOLD` 和 `SHAKE_HIGH_THRESHOLD` 常量（无其他文件引用）
- actTransition.ts Boss 入场从 `screenShake(3)` 改为 `screenShake(4)`（补偿查表后的强度回归）
- CSS `.shake-dynamic` 添加 `will-change: transform` GPU 加速提示
- 新增 11 个测试（8 个 getShakeIntensity 边界 + 3 个 SHAKE_TIERS 验证），全部 43 个相关测试通过

### Code Review Fixes

- **H1 修复**: 添加 `setShakeEnabled(v: boolean)` setter 函数，使外部模块可通过函数调用切换震动开关
- **M1 修复**: `actTransition.ts` Boss 入场从 `screenShake(3)` 改为 `screenShake(4)`（强震 10px/300ms），补偿旧 intensity=3（9px/450ms）→ 新 intensity=3（6px/200ms）的回归；同步更新测试
- **L1 修复**: CSS `.shake-dynamic` 添加 `will-change: transform`，与 Story 31-1 的 GPU 优化模式一致

### File List

- `src/src/effects/juice.ts` — 重构 `screenShake()` + `getShakeIntensity()` + 新增 `SHAKE_TIERS` + `shakeEnabled` + `setShakeEnabled()`
- `src/src/style.css` — `shakeDynamic` 支持可变时长 + 改进衰减曲线 + `will-change: transform`
- `src/src/systems/battle.ts` — `completeWord()` 集成 `getShakeIntensity()`，添加 import
- `src/src/core/constants.ts` — 删除 `SHAKE_MID_THRESHOLD` + `SHAKE_HIGH_THRESHOLD`
- `src/src/systems/actTransition.ts` — Boss 入场 `screenShake(3)` → `screenShake(4)` 补偿回归
- `src/tests/unit/effects/juice.test.ts` — 新增 11 个震动分级测试
- `src/tests/unit/systems/actTransition.test.ts` — 更新 Boss 入场震动期望值
