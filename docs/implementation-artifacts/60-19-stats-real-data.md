# Story 60.19: STAT 命令接真实统计数据

Status: backlog

<!-- Epic 60-Followup · 优先级 P2（数据源待勘察） -->
<!-- Source: Story 60.16 code-review 完成后用户 dogfood 反馈 -->

## Story

As a **打字商店玩家**,
I want **终端 `STA` (`STAT` / `STATS`) 命令显示当前 run 真实的 key usage / DPS / accuracy 而不是 hardcoded 假数据**,
so that **能在购买决策前看到上一关到现在的真实表现**.

## 背景

`shopTerminal.ts:cmdStats` 自 Phase 1 起就是 stub，函数体注释自挂：

```ts
appendLine('═══ END OF AUDIT ═══ (STUB · P1.4 wires real data)', 'dim');
```

Hardcoded 数据：
```
KEY USAGE       FREQ    DPS     ACC
A  ████████      9     142     94%
E  ███████       8     128     91%
L  ██████        7     121     88%
TOP CONTRIBUTOR: LOZ-204 (38% of total)
WEAKEST KEY:     J (FREQ-LOCKED)
```

**Phase 1.4 → Phase 2 → Story 60.16 全程都没接真实数据**。本 story 把 hardcoded 替换为 battle session metrics。

## Acceptance Criteria

1. **AC1：数据源勘察 + 决定方案** —— Task 1 prospect `state.battleStats` / `keyTracker` / `runMetrics` 等存在的 stat collector：
   - **a. 存在 + 完整**：直接接（最理想）
   - **b. 存在但缺字段**：扩 collector + 接
   - **c. 不存在**：拆 sub-story 60-19a (battle session collector) + 60-19b (display)

2. **AC2：KEY USAGE 真实** —— 显示当前 run 累计的 per-key 击键次数 top 5（≤5 行 + bar chart）

3. **AC3：DPS 真实** —— 每个 top-5 key 的平均产出 (resource units / second over active battle time)

4. **AC4：ACC 真实** —— 每个 top-5 key 的命中率（hits / (hits + misses)），无 miss 显示 `100%`

5. **AC5：TOP CONTRIBUTOR / WEAKEST KEY 真实** —— 算 top-1 by total resource generated；weakest 按 freq lock state（已有 Story 20.2 zero-freq lock 机制）

6. **AC6：UI 风格保留** —— 仍是终端 ASCII bar chart + monospace + DPCA 官僚风文案，仅替换数字/字段；不重做 UI 布局

7. **AC7：单元测试** —— mock state.battleStats / 等价数据源，验证 cmdStats 输出 contains 真实数字

## Tasks / Subtasks

- [ ] **Task 1: 数据源 prospecting（AC: 1）**
  - [ ] 1.1 grep `keyTracker / battleStats / runStats / keyUsage` in src/src
  - [ ] 1.2 检查 `state.run.X` / `state.battleSession.X` 字段
  - [ ] 1.3 决定 path A/B/C → 写在 Dev Agent Record

- [ ] **Task 2: 真实数据接入（AC: 2-5）**
  - [ ] 2.1 改 `cmdStats` 函数体为 driven-by-state 渲染
  - [ ] 2.2 top-5 key 排序 + bar chart 缩放
  - [ ] 2.3 DPS / ACC 计算

- [ ] **Task 3: 测试（AC: 7）**
  - [ ] 3.1 `tests/unit/ui/shopPreviewStats.test.ts` ~60 行
  - [ ] 3.2 inject mock stats → 断言输出

- [ ] **Task 4: 浏览器手动验证 + commit**

## Dev Notes

### 风险

- **数据源可能完全缺失** — 如果 path C，本 story 可能拆出 collector 子任务（先做 60-19a，60-19b 等下个 sprint）
- **DPS 时间窗口定义** — 是当前 stage 还是整 run？建议从 stage 开始算，每关 reset，与 banner BATCH 计数对齐

### References

- [Source: src/src/ui/shop/shopTerminal.ts:cmdStats] — 当前 stub
- [Source: src/src/core/state/RunState.ts] — 可能数据源
- [Source: Epic 31 (number juice)] — score milestone 已收集 stage 内一些数据，可参考

## Dev Agent Record

(to be filled by implementing dev)
