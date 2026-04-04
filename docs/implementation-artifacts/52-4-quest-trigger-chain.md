# Story 52.4: 触发链质变（7 个）

Status: ready-for-dev

## 质变列表

| 词条 | 质变名 | 效果 | 实现位置 |
|------|--------|------|---------|
| Parity | 相变 | 奇偶切换时额外自触发 | Phase 5 → pulseSelfTrigger |
| Resonance | 共振 | 自触发时也给触发源+1叠层 | Phase 6 Resonance 块 |
| WarDrum | 战号 | 邻居暴击时+2叠层 | Phase 6 新块（读 flags.isCrit） |
| Bridge | 枢纽 | 是桥时触发两侧各一个邻居 | Phase 5 → splashTargets 复用 |
| Clique | 方阵 | 团内成员触发时获等额bonus | Phase 2 读触发历史（简化） |
| Confluence | 洪流 | 每种独特资源额外产出 | Phase 4 资源路由修改 |
| Turbulence | 风暴 | 额外读 stacks 极差 | Phase 2 已有 case 扩展 |

## Tasks

- [ ] Task 1: Turbulence·风暴（Phase 2 扩展，最简单）
- [ ] Task 2: Parity·相变（Phase 5 自触发）
- [ ] Task 3: Resonance·共振（Phase 6 双向）
- [ ] Task 4: WarDrum·战号（Phase 6 新块）
- [ ] Task 5: Bridge·枢纽（Phase 5 溅射）
- [ ] Task 6: Clique·方阵（Phase 2 简化方案）
- [ ] Task 7: Confluence·洪流（Phase 4 资源路由）

## Dev Notes

### 实现策略

**优先复用现有触发机制：**
- Parity·相变 → 复用 `pulseSelfTrigger`（Pulse 的自触发机制）
- Bridge·枢纽 → 复用 `splashTargets`（Splash 的邻居触发机制）
- Resonance·共振 → 在现有 Resonance Phase 6 块中加反向逻辑
- WarDrum·战号 → 在 Phase 6 新增块（检查触发技能是否暴击）

**简化方案（避免新调度器工作类型）：**
- Clique·方阵 → 不做实时触发联动（太复杂），改为：团内有成员最近触发过时 bonus 翻倍（用关卡累积计数近似）
- Confluence·洪流 → 在 Phase 4 资源路由中额外分流

### 关键代码位置

| 位置 | 文件 | 行号 | 用途 |
|------|------|------|------|
| Phase 5 Splash | affixTrigger.ts | ~1637 | splashTargets 模式参考 |
| Phase 5 Pulse 自触发 | affixTrigger.ts | ~1697 | pulseSelfTrigger 模式参考 |
| Phase 6 Resonance | affixTrigger.ts | ~1870 | 邻居叠层+触发模式参考 |
| 调度器入队 | affixTriggerOrchestrator.ts | ~295 | 各类型入队模式 |
| Phase 4 资源路由 | affixTrigger.ts resolvePhase4 | ~1613 | 资源写入 |

### References

- [Source: docs/stories/epic-52-quest-transforms-expansion.md#Story 52.4]
- [Source: docs/affix-design-process.md §11.4-11.5]

## Dev Agent Record

### File List
