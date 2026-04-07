# Story 56.1: 主菜单界面

Status: review

## Story

As a 玩家,
I want 启动游戏后看到正式的主菜单而非直接进入战斗,
so that 我可以选择开始游戏、进入教程或调整设置。

## Acceptance Criteria

1. **AC1: 主菜单屏幕** — 新建 `#main-menu-screen`，作为游戏启动后的第一屏
2. **AC2: 开始游戏** — 点击按钮 → 进入职业选择 → Ascension 选择 → 战斗（复用现有流程）
3. **AC3: 教程按钮** — 显示但灰置（disabled），tooltip 提示"即将推出"（56-3 实现后启用）
4. **AC4: 设置按钮** — 显示但灰置（disabled），tooltip 提示"即将推出"（56-4 实现后启用）
5. **AC5: 语言切换** — 复用现有 `.lang-btn` 组件，主菜单上可切换中/英
6. **AC6: 底部信息** — 显示版本号、Ascension 等级（如已解锁）
7. **AC7: 像素风** — 延续 Epic 55 规范（直角、像素字体、steps() 过渡、实色按钮）
8. **AC8: showScreen 扩展** — `showScreen()` 支持 `'menu'` 类型
9. **AC9: 战斗结束回主菜单** — gameover/victory 的重启按钮改为回到主菜单
10. **AC10: 替代 demo overlay** — 移除 `#demo-start-overlay`，主菜单取代其功能

## Tasks / Subtasks

- [x] Task 1: HTML — #main-menu-screen div 新增（标题+副标题+3 按钮+info），demo-start-overlay 由 JS 移除
- [x] Task 2: CSS — 深蓝渐变背景、像素风按钮 steps(1)、disabled 灰置
- [x] Task 3: showScreen 扩展 — 新增 'menu' 类型 + UIElements.mainMenuScreen
- [x] Task 4: 启动流程 — init() → showScreen('menu')；开始按钮 → 职业→Ascension→startLevel；Demo 模式同样显示主菜单
- [x] Task 5: gameover 回主菜单 — restart-btn 改为 showScreen('menu') + stopBGM + clearFloatTexts
- [x] Task 6: 教程/设置按钮 disabled + title="Coming soon"
- [x] Task 7: 底部信息 v0.2 + Ascension 等级
- [x] Task 8: 语言切换 — 复用现有 lang-toggle（全局 fixed 定位），data-i18n 属性即时更新
- [x] Task 9: Vite build 成功

## Dev Notes

### 当前启动流程

```
Demo:  demo-start-overlay click → init() → startLevel()
Full:  init() → showClassPicker() → showAscensionPicker() → startLevel()
```

### 改造后启动流程

```
Demo:  init() → showScreen('menu') → 开始 → startLevel()
Full:  init() → showScreen('menu') → 开始 → showClassPicker() → showAscensionPicker() → startLevel()
```

### 关键文件

| 文件 | 改动 |
|------|------|
| `src/index.html` | 新增 #main-menu-screen div，移除 #demo-start-overlay |
| `src/src/style.css` | 新增主菜单样式 |
| `src/src/main.ts` | 启动流程改造 |
| `src/src/systems/battle.ts` | showScreen 扩展 + gameover 回主菜单 |
| `src/src/ui/elements.ts` | 新增 mainMenuScreen 引用 |
| `src/src/demo/demo-i18n.ts` | 主菜单文案 i18n |

### showScreen 当前支持

```typescript
showScreen(name: 'battle' | 'shop' | 'gameover' | 'ritual' | 'rest')
```

改为：
```typescript
showScreen(name: 'menu' | 'battle' | 'shop' | 'gameover' | 'ritual' | 'rest')
```

### State 重置注意

回主菜单时需要重置：
- `state.phase` → idle/menu
- `state.score`/`state.gold`/`state.level` 等 RunState
- `state.player.skills`/`state.player.relics` 等
- 停止 BGM
- 清除浮字/粒子
- 清除所有 setTimeout（settlement、auction 等）

已有 `resetRunState()` 或类似函数可复用。

### 像素风规范

- 直角按钮、`steps(1)` hover
- 背景：可用固定色调（深蓝 `#0a0a1a`）或随机双色渐变
- 字号：title `calc(var(--text-title-size) * 3)`、按钮 `var(--text-subtitle-size)`

### References

- [Source: docs/stories/epic-56-main-menu.md — Story 56-1]
- [Source: src/src/main.ts — 当前启动流程]
- [Source: src/src/systems/battle.ts:253 — showScreen()]
- [Source: src/index.html — 屏幕 div 结构]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无

### Completion Notes List

- index.html: 新增 #main-menu-screen（标题/副标题/开始/教程/设置/info）
- style.css: 主菜单深蓝渐变背景 + 像素风按钮组
- types.ts + elements.ts: UIElements 新增 mainMenuScreen
- battle.ts: showScreen 扩展 'menu' 类型
- main.ts: init() → showScreen('menu')；开始按钮触发职业→Ascension 链
- main.ts: restart-btn 从 reload 改为 showScreen('menu') + stopBGM
- main.ts: Demo 模式移除 overlay，直接 init → 主菜单
- demo-i18n.ts: 主菜单 ZH/EN + gameover.restart 改为"返回主菜单"

### Change Log

- 2026-04-05: Story 56.1 主菜单界面完成

### File List

- `src/index.html`
- `src/src/style.css`
- `src/src/core/types.ts`
- `src/src/ui/elements.ts`
- `src/src/systems/battle.ts`
- `src/src/main.ts`
- `src/src/demo/demo-i18n.ts`
