# Story 37.3: 资源遗物接入飞行（relicAnchor）

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 玩家,
I want 资源产出遗物触发效果时浮字从遗物图标飞向对应资源 UI（与技能飞行一致），
so that 我能直观看到哪个遗物产生了什么资源效果，建立遗物图标 → 资源 UI 的视觉关联.

## Acceptance Criteria

1. **showFeedback 签名扩展** — `showFeedback` 和 `createFloatText` 接受新的 `relicAnchor: { relicId: string; resource: string; amount?: number }` 参数
2. **relicAnchor 飞行路径** — `createFloatText` 中 relicAnchor 路径以遗物图标（`playerRelics.children[idx]`）为起点，复用现有贝塞尔曲线飞向 `RESOURCE_TARGET_IDS[resource]` 对应 HUD 元素
3. **闪光连线同步** — relicAnchor 飞行时自动从遗物图标到资源目标发射 `flashRelicLine`
4. **pending 同步** — relicAnchor 的 time/gold 资源复用 `_pendingTimeBonus` / `_pendingGoldBonus` 机制
5. **到达弹跳** — 飞行到达时触发 `RESOURCE_BUMP_FNS[resource]()`，与技能飞行到达体验一致
6. **遗物接入完整** — 以下 11 个资源遗物触发点全部接入 relicAnchor：score_magnet, dual_concerto, rhythm_doctor, glass_cannon, resource_sense, time_dew, word_collection, long_word_master, phoenix, on_word_complete 时间加成, on_word_complete 时间退款
7. **移除即时 bump** — 已接入的遗物移除原有的即时 `bumpTimer()` / `bumpScore()` 调用（由飞行到达触发）
8. **score_magnet 节流** — 分数磁铁飞行动画最多每 500ms 一次，间隔期仍显示普通浮字
9. **glass_cannon 两阶段** — 保持 400ms 延时两阶段演出，仅 phase 2 加倍额外得分使用 relicAnchor
10. **编译通过** — `npm run build` 无新增错误

## Tasks / Subtasks

- [x] Task 1: 扩展飞行系统签名与队列 (AC: #1)
  - [x] 1.1 `showFeedback` 签名添加第 5 参数 `relicAnchor?: { relicId: string; resource: string; amount?: number }`
  - [x] 1.2 `createFloatText` 签名添加对应参数
  - [x] 1.3 `floatQueue` 数组元素类型添加 `relicAnchor` 字段
  - [x] 1.4 `showFeedback` 中 `floatQueue.push` 包含 relicAnchor
  - [x] 1.5 `drainQueue` 中 `createFloatText` 传递 relicAnchor

- [x] Task 2: 实现 relicAnchor 飞行逻辑 (AC: #2, #3, #4, #5)
  - [x] 2.1 重构 `createFloatText` 中飞行路径：提取 startEl/resource/amount 到局部变量，skillAnchor 和 relicAnchor 仅在起点获取上不同，共享后续贝塞尔曲线逻辑
  - [x] 2.2 添加 `else if (relicAnchor)` 分支：通过 `getRelicIndex(relicAnchor.relicId)` + `getElements().playerRelics.children[idx]` 获取起点元素
  - [x] 2.3 relicAnchor 分支中：调用 `flashRelicLine(idx, RESOURCE_TARGET_IDS[resource], color)` 发射闪光连线
  - [x] 2.4 共享贝塞尔曲线代码：起点坐标、终点坐标、控制点、animateCurve 循环、pending time/gold 跟踪、到达 `RESOURCE_BUMP_FNS[resource]?.()` 弹跳
  - [x] 2.5 确保重构后 skillAnchor 路径行为不变（回归要点）

- [x] Task 3: 接入 playerCorrect 遗物 (AC: #6, #7, #8)
  - [x] 3.1 **score_magnet** (L438-446): 添加模块级变量 `_lastMagnetFlightTime = 0`，500ms 冷却内使用普通浮字，冷却后传 relicAnchor `{ relicId: 'score_magnet', resource: 'score', amount: magnetBonus }`
  - [x] 3.2 **dual_concerto** (L468-472): showFeedback 添加 relicAnchor `{ relicId: 'dual_concerto', resource: 'time', amount: concertoBonus }`
  - [x] 3.3 **rhythm_doctor** (L500-505): showFeedback 添加 relicAnchor `{ relicId: 'rhythm_doctor', resource: 'time', amount: rhythmDocTime }`，移除 L504 `bumpTimer()`

- [x] Task 4: 接入 completeWord 遗物 — 直接检查类 (AC: #6, #7, #9)
  - [x] 4.1 **resource_sense** (L859-876): showFeedback 添加 relicAnchor `{ relicId: 'resource_sense', resource: senseResource, amount: senseBonus }`，移除 L870 `bumpTimer()`（time 分支）
  - [x] 4.2 **time_dew** (L879-885): showFeedback 添加 relicAnchor `{ relicId: 'time_dew', resource: 'time', amount: dewBonus }`，移除 L884 `bumpTimer()`
  - [x] 4.3 **word_collection** (L896-900): showFeedback 添加 relicAnchor `{ relicId: 'word_collection', resource: 'gold', amount: collectionGold }`
  - [x] 4.4 **long_word_master** (L903-908): showFeedback 添加 relicAnchor `{ relicId: 'long_word_master', resource: 'time', amount: longWordTime }`，移除 L907 `bumpTimer()`
  - [x] 4.5 **glass_cannon** (L781-793): 保持 phase 1 `bumpScore(finalWordScore)` 不变，phase 2 的 showFeedback 添加 relicAnchor `{ relicId: 'glass_cannon', resource: 'score', amount: extraGain }`，移除 L791 `bumpScore(extraGain)`

- [x] Task 5: 接入 completeWord 遗物 — 管道效果类 (AC: #6, #7)
  - [x] 5.1 **on_word_complete 时间退款** (L701-707): `onTimeRefund` 回调中 showFeedback 添加 relicAnchor `{ relicId: 'perfect_rhythm', resource: 'time', amount: refund }`（`perfect_rhythm` 是唯一使用 `time_refund` 行为的遗物），移除 L706 `bumpTimer()`
  - [x] 5.2 **on_word_complete 时间加成** (L981-985): `RELIC_MODIFIER_DEFS` 为空对象，effects.time 始终为 0（死代码路径），无需修改；保留原有 bumpTimer() 作为未来管道启用时的保底

- [x] Task 6: 接入 phoenix 复活 (AC: #6)
  - [x] 6.1 **phoenix** (L1376): showFeedback 添加 relicAnchor `{ relicId: 'phoenix', resource: 'time' }`（不传 amount，避免 pending 跟踪干扰 startTimer 重置）

- [x] Task 7: 编译验证 (AC: #10)
  - [x] 7.1 运行 `npm run build` 确认编译通过，无新增错误（Vite build 532ms）

## Dev Notes

### showFeedback 新签名

```typescript
export function showFeedback(
  txt: string, color: string, scale?: number,
  skillAnchor?: { letterIndex: number; resource: string; amount?: number },
  relicAnchor?: { relicId: string; resource: string; amount?: number },
): void
```

### createFloatText 重构方案

当前 `createFloatText` 中 skillAnchor 路径 ~80 行（L2092-2165），relicAnchor 与其仅在起点获取上不同。重构为共享飞行逻辑，避免代码重复：

```typescript
function createFloatText(
  text: string, color: string, scale = 1,
  skillAnchor?: { letterIndex: number; resource: string; amount?: number },
  relicAnchor?: { relicId: string; resource: string; amount?: number },
): void {
  const el = acquireFloat();
  if (!el) return;

  el.textContent = text;
  el.style.color = color;
  el.style.setProperty('--float-scale', String(scale));

  // 确定飞行起点和资源类型（skillAnchor 和 relicAnchor 二选一）
  let startEl: HTMLElement | undefined;
  let resource: string | undefined;
  let amount = 0;

  if (skillAnchor) {
    startEl = getElements().word.children[skillAnchor.letterIndex] as HTMLElement | undefined;
    resource = skillAnchor.resource;
    amount = skillAnchor.amount ?? 0;
  } else if (relicAnchor) {
    const idx = getRelicIndex(relicAnchor.relicId);
    if (idx >= 0) {
      startEl = getElements().playerRelics.children[idx] as HTMLElement | undefined;
      resource = relicAnchor.resource;
      amount = relicAnchor.amount ?? 0;
      // 闪光连线：从遗物图标到资源目标
      if (startEl && resource) {
        const targetId = RESOURCE_TARGET_IDS[resource];
        if (targetId) flashRelicLine(idx, targetId, color);
      }
    }
  }

  if (startEl && resource) {
    const targetId = RESOURCE_TARGET_IDS[resource];
    const targetEl = targetId ? document.getElementById(targetId) : null;

    const container = getElements().container;
    const containerRect = container.getBoundingClientRect();
    const startRect = startEl.getBoundingClientRect();
    const startX = startRect.left + startRect.width / 2 - containerRect.left;
    const startY = startRect.top - containerRect.top - 30;

    // ... 共享贝塞尔曲线逻辑（原 L2105~L2165）
    // 仅将 skillAnchor!.resource 替换为局部变量 resource
    // 仅将 skillAnchor!.amount 替换为局部变量 amount
  } else {
    // 无锚点回退：随机位置 + CSS 动画（原逻辑不变）
    el.style.left = (35 + Math.random() * 30) + '%';
    el.style.top = '';
  }
  // ...
}
```

### 关键文件位置与行号

| 文件 | 行号 | 内容 |
|------|------|------|
| `src/src/systems/battle.ts` | L2024 | `floatQueue` 类型定义 |
| `src/src/systems/battle.ts` | L2027-2028 | `_pendingTimeBonus` / `_pendingGoldBonus` 声明 |
| `src/src/systems/battle.ts` | L2059-2065 | `RESOURCE_TARGET_IDS` 映射 |
| `src/src/systems/battle.ts` | L2068-2074 | `RESOURCE_BUMP_FNS` 映射 |
| `src/src/systems/battle.ts` | L2083-2182 | `createFloatText` — 贝塞尔曲线飞行（重构目标） |
| `src/src/systems/battle.ts` | L2185-2193 | `drainQueue` |
| `src/src/systems/battle.ts` | L2197-2199 | `getRelicIndex`（Story 37-2 已实现） |
| `src/src/systems/battle.ts` | L2201-2231 | `flashRelicLine`（Story 37-1 已实现） |
| `src/src/systems/battle.ts` | L2256-2259 | `showFeedback` — 签名扩展目标 |
| `src/src/systems/battle.ts` | L438-446 | score_magnet 触发点 |
| `src/src/systems/battle.ts` | L468-472 | dual_concerto 触发点 |
| `src/src/systems/battle.ts` | L500-505 | rhythm_doctor 触发点 |
| `src/src/systems/battle.ts` | L701-707 | on_word_complete 时间退款回调 |
| `src/src/systems/battle.ts` | L781-793 | glass_cannon 两阶段 |
| `src/src/systems/battle.ts` | L859-876 | resource_sense 动态资源 |
| `src/src/systems/battle.ts` | L879-885 | time_dew |
| `src/src/systems/battle.ts` | L896-900 | word_collection |
| `src/src/systems/battle.ts` | L903-908 | long_word_master |
| `src/src/systems/battle.ts` | L981-985 | on_word_complete 时间加成 |
| `src/src/systems/battle.ts` | L1376 | phoenix 复活 |

### 遗物接入详表

| 遗物 | relic ID | 触发函数 | 资源 | 行号 | 需移除 bump |
|------|----------|----------|------|------|------------|
| 分数磁铁 | `score_magnet` | playerCorrect | score | L438 | 无 |
| 双手协奏 | `dual_concerto` | playerCorrect | time | L468 | 无 |
| 节奏医生 | `rhythm_doctor` | playerCorrect | time | L500 | `bumpTimer()` L504 |
| 玻璃大炮 | `glass_cannon` | completeWord | score | L781 | `bumpScore(extraGain)` L791 |
| 资源感应 | `resource_sense` | completeWord | 动态 | L859 | `bumpTimer()` L870 |
| 时间露珠 | `time_dew` | completeWord | time | L879 | `bumpTimer()` L884 |
| 词汇收藏 | `word_collection` | completeWord | gold | L896 | 无 |
| 长词达人 | `long_word_master` | completeWord | time | L903 | `bumpTimer()` L907 |
| 时间退款 | `perfect_rhythm` | completeWord | time | L701 | `bumpTimer()` L706 |
| 时间加成 | (管道聚合) | completeWord | time | L981 | `bumpTimer()` L984 |
| 凤凰之羽 | `phoenix` | endLevel | time | L1376 | 无 |

### score_magnet 节流

```typescript
let _lastMagnetFlightTime = 0;

// 在 playerCorrect 中 score_magnet 触发点：
if (magnetBonus > 0) {
  if (isBlackHoleActive()) {
    accumulateBlackHole(magnetBonus);
  } else {
    state.score += magnetBonus;
  }
  const now = performance.now();
  if (now - _lastMagnetFlightTime > 500) {
    _lastMagnetFlightTime = now;
    showFeedback(`🧲 +${magnetBonus}`, '#ffe66d', 0.6, undefined,
      { relicId: 'score_magnet', resource: 'score', amount: magnetBonus });
  } else {
    showFeedback(`🧲 +${magnetBonus}`, '#ffe66d', 0.6);
  }
}
```

### glass_cannon 两阶段

Phase 1（即时）保持原样 `bumpScore(finalWordScore)`——这是正常单词得分的 bump，不是遗物效果。

Phase 2（400ms 延时）仅对遗物加倍额外得分使用 relicAnchor：

```typescript
setTimeout(() => {
  showFeedback(t('battle.glass_double', { extra: extraGain }), '#ff4444', 1.3, undefined,
    { relicId: 'glass_cannon', resource: 'score', amount: extraGain });
  state.score = doubledScore;
  // 移除: bumpScore(extraGain); — 由飞行到达触发
  updateHUD();
}, 400);
```

### phoenix 复活

不传 `amount`（默认 0），避免 pending 跟踪干扰 `startTimer()` 的时间重置。飞行动画仅表达「凤凰 → 时间恢复」的视觉因果：

```typescript
showFeedback(t('battle.phoenix_revive'), '#ff6600', undefined, undefined,
  { relicId: 'phoenix', resource: 'time' });
```

### on_word_complete 管道效果

**时间退款 (`onTimeRefund`)**：`perfect_rhythm` 是唯一使用 `time_refund` 行为的遗物（见 `ModifierTypes.ts` L248 注释「完美韵律使用」）。直接硬编码 `'perfect_rhythm'` 作为 relic ID。

**时间加成 (`effects.time`)**：管道聚合结果，需确定贡献遗物。实现时检查 `RELIC_MODIFIER_DEFS` 中哪些遗物在 `on_word_complete` 触发器上生成 time 效果，取 `state.player.relics` 中首个匹配的遗物 ID。若无法确定则回退为普通浮字（不传 relicAnchor）。

### resource_sense 动态资源

`senseResult.resource` 已是资源类型字符串（base/score/multiplier/time/gold/fragment），直接传入 `relicAnchor.resource`。注意 `fragment` 类型不在 `RESOURCE_TARGET_IDS` 中，此时 `targetId` 为 undefined，`startEl && resource` 判断后 `targetEl` 为 null，曲线飞行退化为无目标的上抛（与 skillAnchor 无目标时行为一致）。

### 边界

- 仅改视觉反馈路径，不改遗物实际效果逻辑
- 状态更新（`state.score/time/gold += X`）保持即时，不延迟
- 不新增 `_pendingScoreBonus`（score 资源无 roller 延迟机制，与技能飞行一致）
- 不改非资源遗物的 showFeedback 调用（首发强化、少而精等保持原样）
- 不改 `flashRelicLine` / `getRelicIndex` 签名或逻辑
- 黑洞模式下 score_magnet 仍使用 relicAnchor（飞向 score-count），与现有浮字行为一致

### Project Structure Notes

- 所有修改集中在 `battle.ts` 一个文件
- relicAnchor 类型与 skillAnchor 结构对称（resource + amount），区别在于 relicId 替代 letterIndex
- floatQueue 保持现有 push/drain 机制，仅扩展元素字段
- 重构 createFloatText 后 skillAnchor 路径行为不变（回归测试要点）

### References

- [Source: src/docs/epic-relic-feedback-flight.md#Story 3: 资源遗物接入飞行]
- [Source: src/src/systems/battle.ts#L2083-2182 createFloatText 飞行动画]
- [Source: src/src/systems/battle.ts#L2256-2259 showFeedback]
- [Source: src/src/systems/battle.ts#L2197-2199 getRelicIndex]
- [Source: src/src/systems/battle.ts#L2201-2231 flashRelicLine]
- [Source: src/src/systems/battle.ts#L2059-2074 RESOURCE_TARGET_IDS + RESOURCE_BUMP_FNS]
- [Source: src/src/systems/modifiers/ModifierTypes.ts#L248 time_refund → perfect_rhythm]
- [Source: docs/implementation-artifacts/37-1-flash-line-system.md — 闪光连线系统]
- [Source: docs/implementation-artifacts/37-2-helper-functions.md — getRelicIndex 辅助函数]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- `RELIC_MODIFIER_DEFS` is `{}` (empty) — on_word_complete pipeline `effects.time` is always 0 (dead code path at L981-985). Preserved original bumpTimer() for future pipeline use.
- 143 pre-existing test failures unchanged; 3372 tests passing.

### Completion Notes List

- Extended `showFeedback` and `createFloatText` signatures with `relicAnchor` parameter; updated `floatQueue` type and `drainQueue` to propagate relicAnchor
- Refactored `createFloatText` to extract `startEl`/`flightResource`/`flightAmount` locals — skillAnchor and relicAnchor share all Bézier curve, pending tracking, and arrival bump logic; only differ in start element source
- relicAnchor branch: gets icon via `getRelicIndex` + `playerRelics.children[idx]`, fires `flashRelicLine` to resource target, then enters shared flight path
- Integrated 10 resource-producing relic trigger points with relicAnchor:
  - `score_magnet` (with 500ms throttle via `_lastMagnetFlightTime`)
  - `dual_concerto`, `rhythm_doctor` (removed bumpTimer)
  - `resource_sense` (dynamic resource, removed bumpTimer for time branch)
  - `time_dew` (removed bumpTimer), `word_collection`, `long_word_master` (removed bumpTimer)
  - `glass_cannon` phase 2 only (removed bumpScore(extraGain), kept phase 1 bumpScore)
  - `perfect_rhythm` time refund callback (removed bumpTimer)
  - `phoenix` revival (no amount, avoids pending interference with startTimer)
- Task 5.2 (on_word_complete effects.time): dead code path — `RELIC_MODIFIER_DEFS` is empty, no pipeline time effects exist. No change needed.
- Vite build passes (532ms, 0 new errors)
- All 3372 passing tests remain passing (143 pre-existing failures unchanged)

### Change Log

- 2026-03-15: Implemented relicAnchor flight system + integrated 10 resource relic triggers (Story 37-3)

### File List

- `src/src/systems/battle.ts` — Extended showFeedback/createFloatText with relicAnchor, refactored shared flight logic, integrated 10 relic trigger points
- `docs/implementation-artifacts/sprint-status.yaml` — Status tracking updates
