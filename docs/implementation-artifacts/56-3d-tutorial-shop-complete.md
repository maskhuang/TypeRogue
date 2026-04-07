# Story 56.3d: 教程阶段 5 + 完成画面

Status: done

## Story

As a 新手玩家,
I want 教程最后一阶段引导我体验商店购买和技能绑定，完成后看到总结画面,
so that 我理解完整的战斗→商店循环并准备好开始正式游戏。

## Acceptance Criteria

1. **AC1: 阶段 5 商店教程** — P4 结束后进入模拟商店，固定 3 个技能商品、200 金币
2. **AC2: 购买引导** — 提示购买技能，检测 `shop:item-purchased` 事件
3. **AC3: 绑定引导** — 提示拖拽绑定键位（可选：检测绑定完成或跳过）
4. **AC4: 商店 isTutorial 守卫** — 隐藏刷新按钮、遗物 tab、牌包、开始战斗按钮
5. **AC5: 完成画面** — 显示恭喜文字 + 学习总结 + 返回主菜单按钮
6. **AC6: Meta 标记** — `MetaState.tutorialCompleted = true`
7. **AC7: i18n** — 阶段 5 + 完成画面文案双语

## Tasks / Subtasks

- [ ] Task 1: 阶段 5 商店进入 (AC: 1, 4)
  - [ ] 1.1 `TutorialMode.ts` P4 结束后 → 设 gold=200 → 调用 `openShop(true)` 或类似函数
  - [ ] 1.2 教程商品：固定生成 3 个技能（base/multiplier/time 各一、rarity 0）
  - [ ] 1.3 `shop.ts` isTutorial 守卫：隐藏刷新按钮、遗物 tab、牌包 tab、开始战斗按钮

- [ ] Task 2: 购买+绑定引导 (AC: 2, 3)
  - [ ] 2.1 `showPrompt('tutorial.phase5.intro', { highlight: 'reward-cards' })`
  - [ ] 2.2 监听 `shop:item-purchased` 事件
  - [ ] 2.3 购买后 `showPrompt('tutorial.phase5.bind')`
  - [ ] 2.4 简化：不强制等待绑定完成，购买后即推进
  - [ ] 2.5 `showPrompt('tutorial.phase5.done')`

- [ ] Task 3: 完成画面 (AC: 5)
  - [ ] 3.1 showScreen('menu') 前显示完成覆盖层
  - [ ] 3.2 HTML: 标题 + 5 条学习总结 + 返回按钮
  - [ ] 3.3 CSS: 像素风、居中、半透明黑底
  - [ ] 3.4 返回按钮 → exitTutorialMode()

- [ ] Task 4: Meta 标记 (AC: 6)
  - [ ] 4.1 MetaState 新增 `tutorialCompleted` 字段（boolean、默认 false、持久化）
  - [ ] 4.2 完成时调用 `metaState.markTutorialCompleted()`

- [ ] Task 5: i18n 文案 (AC: 7)
  - [ ] 5.1 ZH/EN: tutorial.phase5.intro/bind/done + tutorial.complete.title/body/btn

- [ ] Task 6: 回归验证
  - [ ] 6.1 教程 P1→P5→完成 完整流程
  - [ ] 6.2 商店中 isTutorial 守卫正常
  - [ ] 6.3 完成后回主菜单
  - [ ] 6.4 正式游戏商店不受影响
  - [ ] 6.5 Vite build 成功

## Dev Notes

### 商店 isTutorial 守卫

`shop.ts` 的 `renderUnifiedShop()` 中需要判断 `state.isTutorial`：
- 隐藏刷新按钮（`.shop-refresh-btn`）
- 隐藏遗物/牌包 tab
- 隐藏或替换开始战斗按钮（教程中不进入下一关）
- 教程商品：固定 3 个而非随机

### 完成画面设计（来自 56-2）

```
🎉 教程完成！

你已经学会了：
✓ 打字得分
✓ 连击增加倍率
✓ 在时限内达标
✓ 技能触发机制
✓ 商店购买与绑定

[返回主菜单]
```

### 当前 TutorialMode.ts 中的占位

P4 结束后当前代码是 `exitTutorialMode()` — 需要替换为 P5 逻辑。

### References

- [Source: docs/implementation-artifacts/56-2-tutorial-stage-design.md — 阶段 5 + 完成画面]
- [Source: src/src/systems/tutorial/TutorialMode.ts — P4 后的占位]
- [Source: src/src/systems/shop.ts — openShop/renderUnifiedShop]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
