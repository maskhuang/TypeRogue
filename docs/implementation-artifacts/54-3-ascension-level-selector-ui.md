# Story 54.3: Ascension 级别选择器 UI

Status: done

## Story

作为玩家，我想要在开局选择 Ascension 级别，以便自主控制挑战难度。

## Acceptance Criteria

1. 职业选择后弹出 Ascension 级别选择器（0 ~ 已解锁最高级）
2. 仅当已解锁 A1+ 时才显示选择器（A0 直接跳过）
3. 每级显示：名称 + 效果简述
4. 默认选中最高已解锁级别
5. 可向下选择更低级别
6. 确认后写入 state.ascensionLevel
7. Demo 模式不显示选择器（直接 A0）
8. i18n 支持：10 级名称 + 描述（中英文）

## Tasks

- [x] Task 1: HTML 模态框骨架 (AC: 1)
  - [x] 1.1 index.html 新增 ascension-select-modal（overlay + content + list + confirm）
  - [x] 1.2 style.css 新增 ascension 选择器样式（垂直列表，选中高亮，锁定灰色）
- [x] Task 2: AscensionPicker.ts 选择器逻辑 (AC: 1-6)
  - [x] 2.1 新建 AscensionPicker.ts
  - [x] 2.2 showAscensionPicker(metaState, classId, onComplete)
  - [x] 2.3 A0-A10 行：级别 + 名称 + 描述（i18n）
  - [x] 2.4 默认选中 maxAscension
  - [x] 2.5 点击切换 + 确认写入 state.ascensionLevel
  - [x] 2.6 maxAscension <= 0 时跳过
- [x] Task 3: main.ts 流程串接 (AC: 1, 7)
  - [x] 3.1 showClassPicker 回调 → showAscensionPicker → startAfterClassSelect
  - [x] 3.2 Demo 模式 IS_DEMO 分支不变（不调用 showAscensionPicker）
- [x] Task 4: i18n 名称 + 描述 (AC: 8)
  - [x] 4.1 26 条 ascension.* keys（title, confirm, a0-a10 name+desc，中英文）

## Dev Notes

### 调用流程

```
showClassPicker(metaState, onClassSelected)
  ↓ [用户选择职业]
  classManager.selectClass(selectedClassId)
  ↓
  showAscensionPicker(metaState, state.classId, onComplete)
    ↓ maxAscension === 0 → 直接 onComplete()
    ↓ maxAscension >= 1 → 显示选择器
    ↓ [用户选择级别]
    state.ascensionLevel = selectedLevel
    ↓
    onComplete() → startAfterClassSelect()
```

### 复用模式

参考 `ClassPicker.ts` 的 DOM 模态框模式：
- HTML: `#ascension-select-modal > .ascension-select-overlay + .ascension-select-content`
- JS: `showAscensionPicker()` 接受 metaState + classId + callback
- 隐藏/显示: `.ascension-select-hidden` class toggle

### 级别列表 vs 卡片

职业选择用卡片网格（3 个职业），Ascension 有 0-10 共 11 个级别，应改用 **垂直列表** 或 **滑块** 布局。建议：
- 紧凑的垂直列表，每行：级别编号 + 名称 + 效果
- 当前选中行高亮
- 已解锁但未选中行可点击
- 未解锁行灰色不可点击

### 10 级 Ascension 效果（供 i18n 使用）

| 级别 | 名称 | 效果 |
|------|------|------|
| A1 | 贫穷起步 | 练习关金币效率 ×0.75 |
| A2 | 物价上涨 | 商店价格 +15% |
| A3 | 精英压力 | 精英 modifier 不再弱化 |
| A4 | 时间紧缩 | cycle 时间衰减 0.9→0.85 |
| A5 | 构筑限缩 | 商店刷新上限 3 次/关 |
| A6 | 暴露弱点 | 第 2 关起携带 1 个弱化 modifier |
| A7 | 稀缺资源 | 遗物槽位 10→8 |
| A8 | 词库压缩 | 初始词库 -30% |
| A9 | 强制对抗 | Boss 每次叠 2 个 modifier |
| A10 | 终极试炼 | 目标分增长率 1.45→1.55；错误扣 2 秒 |

### 关键文件

- `index.html` line ~232 — 现有模态框区域末尾
- `src/systems/classes/ClassPicker.ts` — 参考模式
- `src/systems/classes/ClassManager.ts` — classManager.selectClass()
- `src/main.ts` line 214 — showClassPicker 调用点
- `src/core/state/MetaState.ts` — metaState.getAscension(classId)
- `src/core/state.ts` — state.ascensionLevel
- 前置 Story 54-1/54-2 已完成

### References

- [Source: docs/planning-artifacts/ascension-system-design.md#UI/UX 设计要点]
- [Source: docs/stories/epic-54-ascension-system.md#54-3]
- [Pattern: src/systems/classes/ClassPicker.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- AscensionPicker.ts: DOM 模态框，A0-A10 垂直列表，默认选中最高级，maxAscension=0 跳过
- index.html: ascension-select-modal 骨架
- style.css: 紧凑列表样式（选中金边高亮，锁定灰色）
- main.ts: showClassPicker → showAscensionPicker → startAfterClassSelect 链式调用
- 26 条 i18n keys（中英文）

### File List

- `index.html` — ascension-select-modal 骨架
- `src/style.css` — ascension 选择器样式
- `src/systems/classes/AscensionPicker.ts` — 新文件
- `src/main.ts` — 流程串接
- `src/demo/demo-i18n.ts` — 26 条 ascension.* keys
