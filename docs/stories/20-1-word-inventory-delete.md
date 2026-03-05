# Story 20.1: 词库查看与删词

Status: done

## Story

作为一个 **玩家**，
我想要 **在商店界面查看自己拥有的全部词语，并能花费金币删除不想要的词**，
以便 **主动调整词库构成，优化字频分布来匹配技能 build**。

## Acceptance Criteria

1. 商店右侧 `#build-manager` 的 `#skill-inventory` 下方显示词库面板
2. 词库面板标题显示 "词库 (N)"，N 为词语总数
3. 每个词语高亮已绑定技能的字母（与商店卡片一致的 `.bound-letter` 样式）
4. 每个词语旁有 "删 -3💰" 按钮，点击花费 3 金币删除该词
5. 金币不足时删除按钮灰显不可点击
6. 删词后列表刷新、金币 -3、字频重算（商店统计面板联动更新）

## Tasks / Subtasks

- [x] Task 1: HTML 结构 (AC: 1)
  - [x] 1.1 在 `src/index.html` 的 `#skill-inventory` 后新增 `#word-inventory` 容器
  - [x] 1.2 包含 `.inventory-label`、`#word-count`、`#owned-words` 元素

- [x] Task 2: 类型与元素注册 (AC: 1)
  - [x] 2.1 在 `src/core/types.ts` 的 `UIElements` 新增 `wordCount`、`ownedWords`
  - [x] 2.2 在 `src/ui/elements.ts` 注册对应 DOM 引用

- [x] Task 3: 渲染逻辑 (AC: 2, 3)
  - [x] 3.1 在 `src/systems/shop.ts` 新增 `renderWordInventory()` 函数
  - [x] 3.2 遍历 `state.player.wordDeck` 渲染 `.word-item`
  - [x] 3.3 高亮已绑定字母（检查 `state.player.bindings` keys）
  - [x] 3.4 在 `renderBuildManager()` 末尾调用

- [x] Task 4: 删词功能 (AC: 4, 5, 6)
  - [x] 4.1 新增 `removeWord(index)` 函数：校验金币 → 扣 3 金币 → 移除词语
  - [x] 4.2 删词后调用 `renderUnifiedShop()` + `renderBuildManager()` 刷新
  - [x] 4.3 金币不足时按钮添加 `.cannot-afford` 禁用

- [x] Task 5: CSS 样式 (AC: 1, 3)
  - [x] 5.1 `#word-inventory` 复用 `#skill-inventory` 风格
  - [x] 5.2 `.word-item` 紧凑行布局，`.word-delete-btn` 红色小按钮
  - [x] 5.3 `#owned-words` 可滚动（max-height: 80px, overflow-y: auto）

## Dev Notes

### 关键文件修改清单

| 文件 | 修改内容 |
|------|---------|
| `src/index.html` | 新增 `#word-inventory` HTML 块 |
| `src/src/core/types.ts` | UIElements 新增 wordCount, ownedWords |
| `src/src/ui/elements.ts` | 注册 wordCount, ownedWords |
| `src/src/systems/shop.ts` | renderWordInventory(), removeWord() |
| `src/src/style.css` | #word-inventory, .word-item, .word-delete-btn 样式 |

### 与现有 sellWord() 的区别

- `sellWord()` 是拖拽到卖出区时调用，返还 3 金币
- `removeWord()` 是词库面板点击删除，花费 3 金币
- 两者语义相反：卖出=回收，删除=付费移除

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

#### Code Review Fixes (2026-03-04)
- [H2] 新增 MIN_WORD_COUNT=3 最低词数保护，词库 ≤3 时删除按钮灰显
- [M2] 新增 10 个单元测试（removeWord 扣金/拒绝/最低词数、自动解绑、自动绑定跳过）
- [L2] 删词反馈改为 "删除 ${word} -3💰"

### File List
**Modified:**
- `src/index.html` — 新增 #word-inventory HTML
- `src/src/core/types.ts` — UIElements 新增 wordCount, ownedWords
- `src/src/ui/elements.ts` — 注册新元素引用
- `src/src/systems/shop.ts` — renderWordInventory(), removeWord(), MIN_WORD_COUNT
- `src/src/style.css` — 词库面板样式

**Created:**
- `src/tests/unit/systems/word-inventory-freq-lock.test.ts` — 10 个单元测试
