# Story 39.1: Design Token 统一与全局字号/对比度提升

Status: done

## Story

As a 玩家,
I want 游戏中的所有文字描述清晰可读、字号统一、对比度足够,
so that 我能快速理解技能、遗物、词条等信息，不需要凑近屏幕辨认。

## Acceptance Criteria

1. **AC1**: `ui/theme.ts` 导出 `TEXT_LEVEL`、`MIN_FONT_SIZE`、`SPACING`、`TOOLTIP` 常量，所有 Token 值与 Epic 39 规格一致
2. **AC2**: `KeyTooltip.ts` 中所有字号/颜色引用 Theme Token（CSS 变量或 JS 常量），无硬编码字号低于 `MIN_FONT_SIZE`(11px)
3. **AC3**: `style.css` 商品卡片（`.reward-item` 系列）描述字号从 10px 提升至 13px，颜色从 `#888` 提升至 `#cccccc`
4. **AC4**: `style.css` 类型徽章（`.reward-type` 等）字号从 9px 提升至 11px
5. **AC5**: `CollectionItem.ts` 描述字号从 11px 提升至 13px
6. **AC6**: Tooltip 基础样式 `.key-tooltip` 中 max-width 从 260px 扩至 340px，padding 从 `8px 12px` 增至 `12px 16px`
7. **AC7**: 所有已迁移组件视觉回归正常——无截断、无溢出、布局不崩

## Tasks / Subtasks

- [x] Task 1: 创建 `ui/theme.ts` Design Token 文件 (AC: 1)
  - [x] 1.1 定义 `TEXT_LEVEL` 层级常量（title/subtitle/body/caption/badge）
  - [x] 1.2 定义 `MIN_FONT_SIZE = 11`
  - [x] 1.3 定义 `SPACING` 间距常量（xs/sm/md/lg/xl）
  - [x] 1.4 定义 `TOOLTIP` 配置常量（maxWidth/padding/lineHeight/borderRadius）
  - [x] 1.5 在 `style.css` 顶部 `:root` 添加 CSS 变量（与 JS 常量同步）
- [x] Task 2: 迁移 KeyTooltip 样式至 Token (AC: 2)
  - [x] 2.1 将 `.key-tooltip` 基础样式改为引用 CSS 变量（`--tooltip-max-width`、`--tooltip-padding` 等）
  - [x] 2.2 将所有内联 `font-size:10px` 提升至 `11px`（MIN_FONT_SIZE）
  - [x] 2.3 将内联 `font-size:9px`（附魔描述）提升至 `11px`
  - [x] 2.4 将内联 `color:#888` / `color:#777` / `color:#666` 提升至 `#aaa`
  - [x] 2.5 预估产出标题 font-size 从 11px 提升至 13px（body 级）
- [x] Task 3: 提升商品卡片可读性 (AC: 3, 4)
  - [x] 3.1 `.reward-desc` 字号 → `var(--text-body-size)`(13px)，颜色 → `var(--text-body-color)`(#ccc)
  - [x] 3.2 `.reward-type` 字号 → `var(--text-badge-size)`(11px)
  - [x] 3.3 `.library-freq` 字号 → `var(--text-caption-size)`(11px)
  - [x] 3.4 `.relic-type` 字号 → `var(--text-badge-size)`(11px)
  - [x] 3.5 `.reward-flavor` 字号 → `var(--text-caption-size)`(11px)
- [x] Task 4: 提升图鉴可读性 (AC: 5)
  - [x] 4.1 `CollectionItem.ts` 描述 TextStyle fontSize 11 → 13
- [x] Task 5: 扩大 Tooltip 宽度和间距 (AC: 6)
  - [x] 5.1 `.key-tooltip` max-width → `var(--tooltip-max-width)`(340px)
  - [x] 5.2 `.key-tooltip` padding → `var(--tooltip-padding)`(12px 16px)
  - [x] 5.3 `.key-tooltip` line-height → `var(--tooltip-line-height)`(1.5)
- [ ] Task 6: 视觉回归验证 (AC: 7)
  - [ ] 6.1 启动游戏检查战斗界面 Tooltip 显示
  - [ ] 6.2 检查商店界面商品卡片
  - [ ] 6.3 检查图鉴界面 CollectionItem
  - [ ] 6.4 检查不同分辨率（1920×1080 / 1366×768）

## Dev Notes

### 核心修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/src/ui/theme.ts` | **新建** | Design Token 定义 |
| `src/src/style.css` | 修改 | CSS 变量 + 商品/Tooltip 样式提升 |
| `src/src/ui/keyboard/KeyTooltip.ts` | 修改 | 内联样式 → Token 引用 |
| `src/src/scenes/collection/components/CollectionItem.ts` | 修改 | PixiJS TextStyle 字号 |

### Design Token 规格（必须严格遵守）

```typescript
// src/src/ui/theme.ts
export const TEXT_LEVEL = {
  title:    { size: 18, color: '#ffffff', weight: 'bold' },
  subtitle: { size: 14, color: '#e0e0e0', weight: 'bold' },
  body:     { size: 13, color: '#cccccc', weight: 'normal' },
  caption:  { size: 11, color: '#aaaaaa', weight: 'normal' },
  badge:    { size: 11, color: '#ffffff', weight: 'bold' },
} as const

export const MIN_FONT_SIZE = 11

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24
} as const

export const TOOLTIP = {
  maxWidth: 340,
  padding: 12,
  lineHeight: 1.5,
  borderRadius: 8,
} as const
```

### KeyTooltip.ts 当前内联样式映射（全部需要迁移）

**字号迁移映射：**

| 当前值 | 位置 | 迁移目标 |
|--------|------|---------|
| `font-size:10px` | 升级信息、基础值、影响技能、词条类型/描述、附魔项、任务进度、学徒进度 | `TEXT_LEVEL.caption.size`(11px) 或 `TEXT_LEVEL.body.size`(13px) |
| `font-size:9px` | 附魔描述（line 189） | `TEXT_LEVEL.caption.size`(11px) |
| `font-size:11px` | 预估产出（line 163） | `TEXT_LEVEL.body.size`(13px) |

**颜色迁移映射：**

| 当前值 | 位置 | 迁移目标 |
|--------|------|---------|
| `color:#777` | 基础值 | `TEXT_LEVEL.caption.color`(#aaa) |
| `color:#888` | 影响技能、词条描述、附魔描述 | `TEXT_LEVEL.caption.color`(#aaa) |
| `color:#666` | 明细分解 | `TEXT_LEVEL.caption.color`(#aaa) |

**保留不变的颜色（功能色，非灰色文字）：**
- `AFFIX_COLORS` 映射表（20 种词条专属色）— 保持不变
- `#2ecc71`（升级绿）、`#a29bfe`（增幅紫）、`#4ecdc4`（机制青）、`#9b59b6`（附魔紫）
- `#f1c40f`（任务金）、`#fff`（预估白）

### style.css 当前需修改的选择器

| 选择器 | 当前 | 目标 | 行号参考 |
|--------|------|------|---------|
| `.key-tooltip` | `font-size:11px; max-width:260px; padding:8px 12px` | `font-size:11px; max-width:340px; padding:12px 16px` | ~L1712 |
| `.key-tooltip .tooltip-freq` | `font-size:10px; color:#888` | `font-size:11px; color:#aaa` | ~L1741 |
| `.key-tooltip .tooltip-skill-desc` | `font-size:10px; color:#aaa` | `font-size:11px; color:#aaa` | ~L1757 |
| `.key-tooltip .tooltip-skill-school` | `font-size:9px` | `font-size:11px` | ~L1762 |
| `.reward-desc`（商品描述） | `font-size:10px; color:#888` | `font-size:13px; color:#ccc` | ~L541 |
| `.reward-type`（类型徽章） | `font-size:9px` | `font-size:11px` | ~L543 |
| `.reward-flavor` | `font-size:9px` | `font-size:11px` | ~L3195 |
| `.relic-type` | `font-size:9px` | `font-size:11px` | ~L3189 |
| `.library-freq` | `font-size:9px` | `font-size:11px` | ~L582 |
| `.inv-level` | `font-size:9px` | `font-size:11px` | ~L791 |
| `.inv-key` | `font-size:9px` | `font-size:11px` | ~L792 |
| `.inv-school` | `font-size:8px` | `font-size:11px` | ~L793 |

### CollectionItem.ts 修改点

```typescript
// 当前（line 144）:
fontSize: 11

// 修改为:
fontSize: 13  // TEXT_LEVEL.body.size
```

也可以导入 theme：`import { TEXT_LEVEL } from '../../ui/theme'`，然后用 `TEXT_LEVEL.body.size`。

### 关键约束

1. **不改 HUD 组件字号**：ScoreDisplay(28px)、ComboCounter(32px)、WordDisplay(56px)、TimerBar(16px) 这些是游戏核心 HUD，字号是刻意设计的，本 Story 不动
2. **不改 EffectTextDisplay 字号**：浮动特效文字(18-22px)是动画系统，保持不变
3. **不改功能色**：AFFIX_COLORS、RESOURCE_COLORS、稀有度色等功能色保持不变，只改灰色系文字色
4. **CSS 变量方案**：推荐在 `style.css` 顶部 `:root` 声明 CSS 变量，`theme.ts` 导出 JS 常量，两者保持同步
5. **导入约定**：使用相对路径（`../../ui/theme`），不使用路径别名
6. **不创建新的 CSS 文件**：在现有 `style.css` 中添加 `:root` 变量声明即可

### CSS 变量推荐方案

```css
/* style.css 顶部新增 */
:root {
  --text-title-size: 18px;
  --text-subtitle-size: 14px;
  --text-body-size: 13px;
  --text-caption-size: 11px;
  --text-badge-size: 11px;
  --text-min-size: 11px;

  --text-primary: #ffffff;
  --text-secondary: #e0e0e0;
  --text-body-color: #cccccc;
  --text-caption-color: #aaaaaa;

  --tooltip-max-width: 340px;
  --tooltip-padding: 12px 16px;
  --tooltip-line-height: 1.5;
  --tooltip-radius: 8px;

  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
}
```

### Project Structure Notes

- 新文件 `ui/theme.ts` 放在 `src/src/ui/` 目录下，与 `elements.ts` 同级
- 依赖方向：`theme.ts` 属于 UI 层，可被 `scenes/`、`systems/`、`ui/` 引用
- `theme.ts` 是纯数据定义，不依赖任何其他模块（无 import）
- PixiJS 组件用 JS 常量（`TEXT_LEVEL.body.size`），DOM 组件用 CSS 变量（`var(--text-body-size)`）

### 风险与注意事项

1. **Tooltip 宽度增大可能导致小屏溢出**：KeyTooltip 已有视口边界检测（viewport overflow detection），但需要验证 340px 在 1366×768 下仍可正常定位
2. **内联样式替换需谨慎**：KeyTooltip.ts 中大量 HTML 字符串内嵌样式，替换时注意不破坏 HTML 结构
3. **CSS 行号可能偏移**：style.css 有 3900+ 行，行号参考可能因前面的修改而偏移——应以选择器名称定位，而非行号
4. **CollectionItem 使用 PixiJS TextStyle**：PixiJS 字号是数字（不带 px），颜色是 0x 十六进制数字

### References

- [Source: docs/stories/epic-39-tutorial-readability.md#Story 39.1]
- [Source: docs/project-context.md#Code Organization Rules]
- [Source: src/src/ui/keyboard/KeyTooltip.ts — 内联样式全部映射]
- [Source: src/src/style.css — .key-tooltip L1712, .reward-* L538-543]
- [Source: src/src/scenes/collection/components/CollectionItem.ts — L110-145]
- [Source: src/src/core/constants.ts — RESOURCE_COLORS 已有色表]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: 创建 `ui/theme.ts`，导出 TEXT_LEVEL / MIN_FONT_SIZE / SPACING / TOOLTIP 常量；在 `style.css` `:root` 添加对应 CSS 变量（文字层级、Tooltip、间距）
- Task 2: KeyTooltip.ts 中 11 处内联样式迁移：所有 font-size → `var(--text-caption-size)` / `var(--text-body-size)`；所有灰色 → `var(--text-caption-color)`；功能色保持不变
- Task 3: style.css 中 `.reward-desc` 10px/#888 → var(--text-body-size)/var(--text-body-color)；`.reward-type` 9px → var(--text-badge-size)；`.library-freq` 9px → var(--text-caption-size)；`.relic-type` 9px → var(--text-badge-size)；`.reward-flavor` 9px → var(--text-caption-size)；`.inv-level/.inv-key` 9px → var(--text-caption-size)；`.inv-school` 8px → var(--text-caption-size)
- Task 4: CollectionItem.ts 描述 fontSize 11 → `TEXT_LEVEL.body.size`（导入 theme.ts）
- Task 5: `.key-tooltip` 基础样式迁移至 CSS 变量：max-width 260→340px, padding 8px 12px→12px 16px, 新增 line-height 1.5
- Task 6: 需要手动视觉回归验证（启动游戏检查）

### Code Review Fixes (Opus 4.6, 2026-03-15)

- **H1 Fixed**: CollectionItem.ts — 导入 `TEXT_LEVEL` 并使用 `TEXT_LEVEL.body.size` 替代硬编码 `13`
- **M1 Fixed**: KeyTooltip.ts — 所有内联 font-size/color 改为引用 CSS 变量 `var(--text-caption-size)` / `var(--text-caption-color)` / `var(--text-body-size)`
- **M2 Fixed**: theme.ts — `TOOLTIP.padding` 拆为 `paddingY: 12, paddingX: 16`，与 CSS `--tooltip-padding: 12px 16px` 同步
- **M3 Fixed**: style.css — `.library-freq` color `#666` → `var(--text-caption-color)`
- **M4 Fixed**: style.css — `.reward-flavor` color `#555` → `var(--text-caption-color)`

### File List

- `src/src/ui/theme.ts` (新建) — Design Token 定义
- `src/src/style.css` (修改) — `:root` CSS 变量 + tooltip/reward/inventory 样式提升
- `src/src/ui/keyboard/KeyTooltip.ts` (修改) — 内联字号/颜色全部提升至 MIN_FONT_SIZE
- `src/src/scenes/collection/components/CollectionItem.ts` (修改) — 描述字号 11→13
