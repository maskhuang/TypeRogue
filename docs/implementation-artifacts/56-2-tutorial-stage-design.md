# Story 56.2: 教程关设计

Status: done

## Story

As a 新手玩家,
I want 通过交互式教程学习游戏核心机制,
so that 我能理解打字→得分→技能→商店的循环。

## 设计原则

- **做中学**：不用长文本解释，让玩家在操作中理解
- **每阶段一个概念**：不一次教太多
- **可跳过**：老玩家不想每次都看教程
- **可重玩**：主菜单随时可重新进入

---

## 教程流程（5 个阶段）

### 阶段 1：打字基础（~30s）

**目标：** 教玩家"打完一个词就得分"

**流程：**
1. 屏幕中央显示一个简单单词（如 `fire`）
2. 提示文字浮现：`"输入屏幕上的单词！"` / `"Type the word on screen!"`
3. 指示箭头指向词语显示区
4. 玩家打字，每个正确字母高亮
5. 打完后：分数 +100，浮字反馈 `"+100"`
6. 再给 2-3 个词练习
7. 过渡提示：`"很好！每打完一个词就会得分。"`

**预设：**
- 无计时器（无限时间）
- 无目标分数
- 3-4 个简单词（fire, ice, bolt, spark）
- 无技能、无 combo

**HUD 可见：** 词语显示、分数（其余隐藏）

---

### 阶段 2：连击与倍率（~30s）

**目标：** 教玩家"连续完美打字会增加倍率"

**流程：**
1. 提示：`"连续无错输入会增加连击数！"` / `"Perfect words build your combo!"`
2. 显示 combo 计数器和 multiplier 显示
3. 玩家打 3 个词，每次完美→combo+1，倍率从 1.0→1.1→1.2→1.3
4. 提示：`"倍率越高，每个词得分越多！"`
5. 故意给一个难词，如果打错→combo 断裂→提示：`"打错字母会降低连击。不用担心，继续打！"`

**预设：**
- 无计时器
- 无目标分数
- 5-6 个词
- HUD 新增：combo 计数器 + 倍率显示

---

### 阶段 3：时间与目标（~45s）

**目标：** 教玩家"在时限内达到目标分数"

**流程：**
1. 提示：`"现在有时间限制了！在时间耗尽前达到目标分数。"`
2. 显示计时器（30s）和目标分数（300）
3. 指示箭头指向计时器和目标分数
4. 玩家自由打字
5. 达标后：提示 `"达标！继续打可以赚取溢出分。"`
6. 时间到：进入商店（阶段 4）

**预设：**
- 计时器 30s
- 目标分数 300（很低，确保能达标）
- 无技能
- HUD 全部可见（除技能触发区）

**失败处理：** 如果未达标，不触发 gameover，直接跳到阶段 4 并提示 `"没关系！练习多了就会更快。"`

---

### 阶段 4：技能系统（~60s）

**目标：** 教玩家"技能绑定在键位上，打字时自动触发"

**流程：**
1. 提示：`"这是你的第一个技能！它会在你按绑定键时触发。"`
2. 自动赠送一个预设技能（如 `⚔️ 力量·基数`，产出 base 资源）
3. 技能已绑定到键位 `F`（词库里确保有含 F 的词）
4. 指示箭头指向键盘可视化区的 F 键
5. 提示：`"打包含 'F' 的单词，技能就会触发！"`
6. 玩家打包含 F 的词 → 技能触发 → 飞行浮字反馈
7. 打 3 个词后提示：`"每次按到绑定键，技能就会自动触发，为你加分！"`

**预设：**
- 计时器 45s（宽裕）
- 目标分数 200（很低）
- 1 个预设技能（base 产出、rarity 0、level 1）
- 绑定到 F 键
- 词库包含 3+ 个含 F 的词（fire, flame, frost, frog）

---

### 阶段 5：商店（~交互式，无时限）

**目标：** 教玩家"在商店选择技能和管理构筑"

**流程：**
1. 教程结束战斗 → 进入模拟商店
2. 提示：`"这是商店！用金币购买新技能。"`
3. 指示箭头指向技能卡片
4. 商品固定：3 个预设技能（不同资源类型）
5. 玩家点击购买一个技能
6. 提示：`"新技能需要绑定到键盘上。拖拽技能到键位！"`
7. 指示箭头指向键盘可视化区
8. 玩家完成拖放绑定
9. 提示：`"太棒了！更多技能=更多触发=更高分数。"`
10. 提示：`"点击'开始下一关'继续战斗，或继续购物。"`
11. 玩家点击开始 → 教程完成提示

**完成画面：**
```
🎉 教程完成！

你已经学会了：
✓ 打字得分
✓ 连击增加倍率
✓ 在时限内达标
✓ 技能触发机制
✓ 商店购买与绑定

祝你好运，打字勇者！

[返回主菜单]
```

**预设：**
- 金币 200（确保买得起）
- 3 个固定技能商品（base/multiplier/time 各一）
- 无遗物、无牌包
- 刷新按钮隐藏

---

## 教程状态管理

```typescript
interface TutorialState {
  phase: 1 | 2 | 3 | 4 | 5 | 'complete';
  wordsTyped: number;
  perfectWords: number;
  skillTriggered: boolean;
  itemPurchased: boolean;
  itemBound: boolean;
}
```

**Meta 持久化：**
- `MetaState.tutorialCompleted: boolean` — 完成后标记
- 主菜单教程按钮始终可用（可重玩）
- 重玩不重置 `tutorialCompleted`

---

## 提示 UI 规范

**提示框样式：**
- 屏幕底部 20% 区域
- 半透明黑底 `rgba(0,0,0,0.85)`
- 像素字体、直角边框
- 文字逐字出现（打字机效果，`steps()` 动画）
- 点击/按任意键继续

**指示箭头：**
- 像素风三角箭头（纯 CSS `border` 实现）
- 闪烁动画 `steps(2) infinite`
- 指向目标元素

**高亮遮罩：**
- 全屏半透明黑色遮罩
- 目标区域镂空（`clip-path` 或叠加透明区域）
- 仅高亮区域可交互

---

## 文案（中/英双语）

| Key | 中文 | English |
|-----|------|---------|
| `tutorial.phase1.intro` | 输入屏幕上的单词！ | Type the word on screen! |
| `tutorial.phase1.done` | 很好！每打完一个词就会得分。 | Great! You score points for each word. |
| `tutorial.phase2.intro` | 连续无错输入会增加连击数！ | Perfect words build your combo! |
| `tutorial.phase2.mult` | 倍率越高，每个词得分越多！ | Higher combo = higher multiplier! |
| `tutorial.phase2.break` | 打错字母会降低连击。不用担心，继续打！ | Typos break your combo. No worries, keep going! |
| `tutorial.phase3.intro` | 现在有时间限制了！在时间耗尽前达到目标分数。 | Now there's a timer! Reach the target score before time runs out. |
| `tutorial.phase3.reached` | 达标！继续打可以赚取溢出分。 | Target reached! Keep typing for overflow bonus. |
| `tutorial.phase3.fail` | 没关系！练习多了就会更快。 | That's OK! Practice makes perfect. |
| `tutorial.phase4.intro` | 这是你的第一个技能！它会在你按绑定键时触发。 | This is your first skill! It triggers when you press its bound key. |
| `tutorial.phase4.hint` | 打包含 'F' 的单词，技能就会触发！ | Type words with 'F' to trigger the skill! |
| `tutorial.phase4.done` | 每次按到绑定键，技能就会自动触发，为你加分！ | Skills auto-trigger on bound keys, boosting your score! |
| `tutorial.phase5.intro` | 这是商店！用金币购买新技能。 | This is the shop! Buy new skills with gold. |
| `tutorial.phase5.bind` | 新技能需要绑定到键盘上。拖拽技能到键位！ | New skills need key bindings. Drag to a key! |
| `tutorial.phase5.done` | 太棒了！更多技能=更多触发=更高分数。 | Awesome! More skills = more triggers = higher score. |
| `tutorial.complete.title` | 🎉 教程完成！ | 🎉 Tutorial Complete! |
| `tutorial.complete.body` | 你已经学会了核心机制。祝你好运，打字勇者！ | You've learned the basics. Good luck, TypeRogue! |
| `tutorial.complete.btn` | 返回主菜单 | Back to Menu |
| `tutorial.skip` | 跳过教程 | Skip Tutorial |

---

## 技术注意事项

- 教程使用独立的 state（不影响正式 RunState）
- 教程中禁用：Ascension 修正器、遗物系统、附魔、Boss 修饰器
- 教程中的 `showScreen` 和商店复用现有代码，但通过 flag `state.isTutorial` 控制行为
- 教程词库独立（短词为主，确保包含特定字母）
- 教程商品池固定（不走随机生成）

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- 5 阶段教程设计：打字基础→连击倍率→时间目标→技能触发→商店
- 提示 UI 规范：打字机效果、指示箭头、高亮遮罩
- 完整中/英双语文案表
- 技术注意事项
