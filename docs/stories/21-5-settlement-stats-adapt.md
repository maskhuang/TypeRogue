# Story 21.5: 结算与统计适配

Status: done

## Story

As a 玩家,
I want 战后统计面板和热力图支持金币维度,
so that 我能清楚了解哪些键位和技能贡献了金币产出，优化我的金币构筑策略.

## Acceptance Criteria

1. 战斗 HUD **不**新增金币显示，金币仅在结算界面可见（`updateHUD()` 不包含 gold 相关逻辑）
2. 结算界面显示本关金币产出明细（技能产出 + 遗物加成）— 已由 21.4 完成，本 story 需确认并增强
3. 键盘 tooltip 中金币产出/转化信息正确显示（已有基础设施，需确认 gold 资源行可见）
4. 战后热力图支持 gold 资源维度 — 新增资源维度选择器，可按触发次数或各资源类型着色
5. 统计面板 stats-summary 行新增金币产出总计
6. 金币结算面板"藏宝图"标签改为"遗物加成"（准确反映 relicGold 含义）

## Tasks / Subtasks

- [x] Task 1: 确认战斗 HUD 不含金币显示 (AC: 1)
  - [x] 1.1 审查 `battle.ts` updateHUD() — 确认无 gold 相关 DOM 操作（仅 combo/score/targetScore/multiplier/shield）
  - [x] 1.2 审查 `index.html` battle HUD 区域 — 确认无 gold 显示元素
- [x] Task 2: 统计面板 stats-summary 增加金币总计 (AC: 2, 5)
  - [x] 2.1 `systems/shop.ts` renderStatsPanel() — stats-summary 新增金币产出 span：`💰 +${totalGold}`
  - [x] 2.2 计算 totalGold：遍历 `bs.keyStats` 累加 `ks.resources.gold`，作为本关技能产出金币总计
- [x] Task 3: 热力图资源维度选择器 (AC: 4)
  - [x] 3.1 `systems/shop.ts` renderHeatmapTab() — 在热力图上方新增维度选择器 bar：`触发数 | 基数 | 分数 | 倍率 | 时间 | 护盾 | 金币`
  - [x] 3.2 默认选中"触发数"（当前行为），切换后重新着色
  - [x] 3.3 新增 `getKeyValue(ks, dimension)` 辅助函数 — 返回 triggerCount 或 resources[dimension]
  - [x] 3.4 `heatColor()` 和 `hm-count` 数值根据选中维度动态计算
  - [x] 3.5 维度切换调用 renderHeatmapTab 重绘（含选择器状态更新）
  - [x] 3.6 选中维度的 chip 使用对应资源颜色高亮（RESOURCE_COLORS）
- [x] Task 4: "藏宝图"标签修复 (AC: 6)
  - [x] 4.1 `index.html` gold-reward 面板 — `藏宝图` → `遗物加成`
- [x] Task 5: CSS 样式 (AC: 4, 5)
  - [x] 5.1 `style.css` — 维度选择器 bar 样式（flex-wrap, gap, chip 风格，active 状态）
  - [x] 5.2 chip active 状态使用 RESOURCE_COLORS 对应颜色 border/text
- [x] Task 6: 测试 (AC: 1-6)
  - [x] 6.1 shop-act-weight.test.ts — 新增 6 个测试验证维度选择器、金币总计、tooltip gold
  - [x] 6.2 确认 heatmap tooltip 包含 gold 资源行代码
  - [x] 6.3 确认现有测试无回归（2325/2330 通过，5 个为 pre-existing）

## Dev Notes

### 关键设计决策

**热力图维度选择器设计：**
- 选择器为一行 chips，放在热力图键盘上方
- 默认"触发数"（triggerCount，当前行为），其余 6 个为资源维度
- 切换维度时不重建 DOM（性能），仅遍历 `.heatmap-key` 更新 `style.background` 和 `.hm-count` 文本
- 维度选中的 chip 使用对应的 `RESOURCE_COLORS` 颜色（如 gold → `#ffd700`），未选中为灰色
- 当某维度在所有键位中值均为 0 时，chip 显示但灰化（disabled 态），避免空白热力图

**金币总计计算方式：**
- 遍历 `bs.keyStats` 所有 entry，累加 `ks.resources.gold` = 技能产出金币总计
- 这与 `Math.floor(state.resources.gold)` 数值可能有舍入差异（keyStats 是 float 累加），显示取 toFixed(0)
- 遗物金币加成不在 keyStats 中（它不经过 recordSkillTrigger），stats-summary 仅显示技能产出部分

**已完成项（21.4 遗产）：**
- `showGoldReward()` 已显示 skillGold + relicGold 分行
- `showHeatmapTooltip()` 已遍历 6 种资源（含 gold）
- `recordSkillTrigger()` 已正确记录 gold 到 keyStats 和 skillStats
- `RESOURCE_LABELS/ICONS/COLORS` 已包含 gold
- `openShop()` 金币计算已简化为 `skillGold + relicGold`

### 现有代码定位

| 文件 | 位置 | 修改内容 |
|------|------|----------|
| `src/src/systems/shop.ts` | line 972-1000 (renderStatsPanel) | stats-summary 新增金币总计 |
| `src/src/systems/shop.ts` | line 1008-1040 (renderHeatmapTab) | 新增维度选择器 + 动态着色 |
| `src/src/systems/shop.ts` | line 1002-1006 (heatColor) | 无需改动，复用 |
| `src/src/systems/shop.ts` | line 1042-1065 (showHeatmapTooltip) | 无需改动，gold 已支持 |
| `src/index.html` | line 210 | "藏宝图" → "遗物加成" |
| `src/src/style.css` | 末尾追加 | 维度选择器 chip 样式 |

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `systems/battle.ts` updateHUD() | 已确认不含 gold 逻辑（AC1 验证，无需改动） |
| `systems/battle.ts` showGoldReward() | 21.4 已完成金币结算显示 |
| `core/types.ts` | BattleStats/KeyStats/ResourceState 已包含 gold |
| `core/constants.ts` | RESOURCE_LABELS/ICONS/COLORS 已包含 gold |
| `systems/skills.ts` recordSkillTrigger() | gold 统计已正确记录 |
| `core/state.ts` | 无需改动 |

### renderHeatmapTab 修改方案（伪代码）

```typescript
// 维度类型
type HeatmapDimension = 'triggerCount' | ResourceType;
let currentDimension: HeatmapDimension = 'triggerCount';

function renderHeatmapTab(container: HTMLElement, bs: BattleStats): void {
  // 1. 维度选择器
  const dimensions: { key: HeatmapDimension; label: string; color: string }[] = [
    { key: 'triggerCount', label: '触发数', color: '#aaa' },
    ...(['base', 'score', 'multiplier', 'time', 'shield', 'gold'] as ResourceType[])
      .map(r => ({ key: r as HeatmapDimension, label: RESOURCE_LABELS[r], color: RESOURCE_COLORS[r] })),
  ];

  let html = '<div class="heatmap-dims">';
  dimensions.forEach(d => {
    const active = d.key === currentDimension;
    html += `<span class="heatmap-dim${active ? ' active' : ''}"
      data-dim="${d.key}" style="${active ? `color:${d.color};border-color:${d.color}` : ''}">
      ${d.label}</span>`;
  });
  html += '</div>';

  // 2. 键盘热力图（同现有逻辑，但用 getKeyValue）
  html += '<div class="heatmap-keyboard">';
  // ... 同现有代码，用 getKeyValue(ks, currentDimension) 替代 ks.triggerCount ...
  html += '</div>';

  container.innerHTML = html;

  // 3. 维度切换事件（不重建 DOM，只更新颜色和数字）
  container.querySelectorAll('.heatmap-dim').forEach(el => {
    el.addEventListener('click', () => {
      currentDimension = (el as HTMLElement).dataset.dim as HeatmapDimension;
      updateHeatmapColors(container, bs);
      // 更新 chip active 状态
    });
  });

  // 4. tooltip 事件（同现有代码）
}

function getKeyValue(ks: KeyStats | undefined, dim: HeatmapDimension): number {
  if (!ks) return 0;
  return dim === 'triggerCount' ? ks.triggerCount : ks.resources[dim as ResourceType];
}

function updateHeatmapColors(container: HTMLElement, bs: BattleStats): void {
  let maxVal = 0;
  bs.keyStats.forEach(ks => {
    const v = getKeyValue(ks, currentDimension);
    if (v > maxVal) maxVal = v;
  });
  container.querySelectorAll('.heatmap-key').forEach(el => {
    const key = (el as HTMLElement).dataset.key!;
    const ks = bs.keyStats.get(key);
    const val = getKeyValue(ks, currentDimension);
    const ratio = maxVal > 0 ? val / maxVal : 0;
    const hasSkill = state.player.bindings.has(key) || (ks?.triggerCount ?? 0) > 0;
    (el as HTMLElement).style.background = hasSkill && val > 0 ? heatColor(ratio) : 'rgba(255,255,255,0.05)';
    const countEl = el.querySelector('.hm-count');
    if (countEl) countEl.textContent = val > 0 ? (dim === 'triggerCount' ? String(val) : val.toFixed(1)) : '';
  });
}
```

### CSS 维度选择器样式方案

```css
.heatmap-dims {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  justify-content: center;
}
.heatmap-dim {
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.2);
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  transition: all 0.2s;
}
.heatmap-dim.active {
  border-width: 2px;
  font-weight: bold;
}
.heatmap-dim:hover:not(.active) {
  border-color: rgba(255,255,255,0.5);
  color: rgba(255,255,255,0.8);
}
```

### 数值显示格式

| 维度 | 数值格式 | 说明 |
|------|----------|------|
| 触发数 | 整数 (`String(val)`) | 同现有行为 |
| base/score/time/shield/gold | `toFixed(1)` | 与 tooltip 保持一致 |
| multiplier | `toFixed(2)` | 倍率精度更高 |

### Project Structure Notes

- 遵循 `data → core → systems → scenes` 依赖方向
- `RESOURCE_LABELS/ICONS/COLORS` 在 `constants.ts` 中已定义，维度选择器复用
- 维度状态 `currentDimension` 为模块级变量，每次 renderStatsPanel 重置为 'triggerCount'
- 热力图 tooltip 不需要改动 — 始终显示所有资源行（不受选中维度影响）

### References

- [Source: docs/epics.md#Epic 21 Story 21.5]
- [Source: docs/stories/21-4-remove-default-gold.md — 金币结算已完成]
- [Source: src/src/systems/shop.ts#renderStatsPanel — 统计面板渲染]
- [Source: src/src/systems/shop.ts#renderHeatmapTab — 热力图渲染]
- [Source: src/src/systems/shop.ts#showHeatmapTooltip — tooltip 已含 gold]
- [Source: src/src/core/constants.ts#RESOURCE_LABELS — 资源标签/图标/颜色]
- [Source: src/src/core/types.ts#BattleStats — 统计数据结构]
- [Source: src/src/systems/battle.ts#updateHUD — 战斗 HUD（无 gold）]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
None

### Completion Notes List
- Task 1: 确认 battle.ts updateHUD() (line 820-848) 仅操作 combo/score/targetScore/multiplier/shield，无 gold 逻辑
- Task 2: renderStatsPanel() 新增 totalGold 计算（遍历 bs.keyStats 累加 ks.resources.gold），stats-summary 条件显示 `💰 +N`
- Task 3: 新增 HeatmapDimension 类型、HEATMAP_DIMENSIONS 常量数组（7 维度）、getKeyValue() 和 formatDimValue() 辅助函数
- Task 3: renderHeatmapTab() 新增 `.heatmap-dims` 选择器 bar，active chip 使用 RESOURCE_COLORS 着色
- Task 3: 维度切换通过 click 事件更新 currentHeatmapDimension 并调用 renderHeatmapTab 重绘
- Task 3: 每次 renderStatsPanel 重置 currentHeatmapDimension = 'triggerCount'
- Task 4: index.html gold-reward 面板 "藏宝图" → "遗物加成"
- Task 5: style.css 新增 .heatmap-dims / .heatmap-dim / .heatmap-dim.active / .heatmap-dim:hover 样式
- Task 6: 新增 6 个测试（维度选择器 DOM 结构、7 维度定义、getKeyValue 函数、totalGold 计算、tooltip gold 遍历）
- 全套 2325/2330 通过（5 个失败为 pre-existing：producer-trigger × 3 + converter-trigger × 1 + producer-shop × 1）
- Code review 修复：dimension chip border 改为 `2px solid transparent` 避免 1px layout shift
- Code review 修复：hm-count span 恢复条件渲染（val > 0 时才输出）

### File List
- `src/src/systems/shop.ts` — renderStatsPanel 新增金币总计，renderHeatmapTab 新增维度选择器 + 动态着色，新增辅助函数
- `src/index.html` — gold-reward 面板 "藏宝图" → "遗物加成"
- `src/src/style.css` — 新增热力图维度选择器 CSS
- `src/tests/unit/systems/shop-act-weight.test.ts` — 新增 6 个 21.5 测试
