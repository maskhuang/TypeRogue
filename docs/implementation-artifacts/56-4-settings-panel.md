# Story 56.4: 设置面板

Status: done

## Story

As a 玩家,
I want 从主菜单打开设置面板调整音量、语言和显示选项,
so that 我可以个性化游戏体验。

## Acceptance Criteria

1. **AC1: 设置按钮可用** — 主菜单设置按钮从 disabled 改为可用，点击打开设置面板
2. **AC2: 音量控制** — 主音量滑条（0-100%），实时调节所有音效/BGM 音量
3. **AC3: 语言切换** — 中/英切换按钮，复用现有 i18n 系统，即时刷新
4. **AC4: CRT 开关** — 扫描线效果开关，即时生效
5. **AC5: 重置进度** — 按钮 + 二次确认弹窗 → 清除 MetaState + localStorage
6. **AC6: 设置持久化** — 音量/CRT/语言 保存到 localStorage，启动时恢复
7. **AC7: 模态框形式** — 覆盖当前界面，点击关闭/按 Esc 关闭
8. **AC8: 像素风 UI** — 延续 Epic 55 规范

## Tasks / Subtasks

- [ ] Task 1: UserSettings 数据模型 (AC: 6)
  - [ ] 1.1 新建 `src/src/core/UserSettings.ts`
  - [ ] 1.2 接口: `{ masterVolume: number, crtEnabled: boolean, locale: string }`
  - [ ] 1.3 `loadSettings()` — 从 localStorage 读取
  - [ ] 1.4 `saveSettings()` — 写入 localStorage
  - [ ] 1.5 `getSettings()` / `updateSettings(partial)` — 读写 API

- [ ] Task 2: 音量控制 (AC: 2)
  - [ ] 2.1 `sound.ts` 新增 `setMasterVolume(v: number)` — 设置 GainNode
  - [ ] 2.2 主音量通过 AudioContext.destination 前的 GainNode 控制
  - [ ] 2.3 启动时从 UserSettings 恢复音量

- [ ] Task 3: CRT 开关 (AC: 4)
  - [ ] 3.1 CSS: `.crt-disabled #game-container::after { display: none; }`
  - [ ] 3.2 JS: `document.getElementById('game-container')?.classList.toggle('crt-disabled', !enabled)`
  - [ ] 3.3 启动时从 UserSettings 恢复

- [ ] Task 4: 设置面板 UI (AC: 7, 8)
  - [ ] 4.1 新建设置面板 HTML（模态框覆盖层）
  - [ ] 4.2 音量滑条 `<input type="range">` + 数值显示
  - [ ] 4.3 语言切换按钮组（复用 `.lang-btn` 风格）
  - [ ] 4.4 CRT 开关（toggle 按钮或 checkbox）
  - [ ] 4.5 重置进度按钮（红色警告风格）
  - [ ] 4.6 关闭按钮 + Esc 关闭
  - [ ] 4.7 像素风 CSS 样式

- [ ] Task 5: 重置进度 (AC: 5)
  - [ ] 5.1 点击重置 → 显示确认弹窗 "确定要重置所有进度吗？此操作不可撤销。"
  - [ ] 5.2 确认 → `localStorage.clear()` + `window.location.reload()`

- [ ] Task 6: 主菜单接入 (AC: 1)
  - [ ] 6.1 设置按钮去 disabled
  - [ ] 6.2 onclick → 打开设置面板

- [ ] Task 7: i18n (AC: 3)
  - [ ] 7.1 设置面板全部文案双语
  - [ ] 7.2 语言切换按钮在面板内即时生效（切换后面板文案也更新）

- [ ] Task 8: 回归验证
  - [ ] 8.1 音量滑条实时生效
  - [ ] 8.2 CRT 开关即时生效
  - [ ] 8.3 语言切换即时刷新
  - [ ] 8.4 重置进度需二次确认
  - [ ] 8.5 设置关闭后持久化
  - [ ] 8.6 Vite build 成功

## Dev Notes

### 已有系统

- **音频**: `sound.ts` 有 `AudioContext` + `playSound()`，但无主音量 GainNode
- **语言**: `demo-i18n.ts` 有 `setLocale()`/`applyHtmlI18n()`，localStorage key `demo_locale`
- **CRT**: `style.css` `#game-container::after` 纯 CSS 伪元素，无 toggle 机制
- **Tutorial 设置**: CollectionScene 里有 tutorial toggle（PixiJS），不复用

### 音量实现方案

```typescript
// sound.ts
let masterGain: GainNode | null = null

export function setMasterVolume(v: number): void {
  if (!masterGain && audioContext) {
    masterGain = audioContext.createGain()
    masterGain.connect(audioContext.destination)
  }
  if (masterGain) masterGain.gain.value = v
}
```

需要将所有音源连接到 masterGain 而非直接 destination。

### CRT toggle CSS

```css
#game-container.crt-disabled::after { display: none; }
```

### localStorage key

```
typing_roguelike_settings = JSON.stringify({ masterVolume, crtEnabled, locale })
```

### References

- [Source: src/src/effects/sound.ts — AudioContext]
- [Source: src/src/style.css:183-198 — CRT ::after]
- [Source: src/src/demo/demo-i18n.ts — i18n 系统]
- [Source: docs/stories/epic-56-main-menu.md — Story 56-4]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
