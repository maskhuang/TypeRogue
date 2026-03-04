---
title: "Story 19.7: 战斗 UI 改造"
epic: "Epic 19: 技能体系重构"
story_key: "19-7-battle-ui-overhaul"
status: "backlog"
created: "2026-03-03"
depends_on: ["19-1-resource-system-core", "19-2-producer-skills"]
---

# Story 19.7: 战斗 UI 改造

## Story

作为一个 **玩家**，
我想要 **战斗界面纯粹显示打字内容，技能反馈通过浮字和动画传达，5 种资源用颜色区分**，
以便 **打字时不分心，同时能直观感受 build 在发挥作用**。

## Acceptance Criteria

- [ ] AC1: 移除战斗中的 `#battle-skills` 技能栏，界面只保留打字区域 + HUD
- [ ] AC2: 资源浮字支持 5 种颜色：⚔️红(base), 🪙金(score), 🔥橙(multiplier), ⏳蓝(time), 🛡️银(shield)
- [ ] AC3: 连接者链式触发时，浮字连续弹出形成节奏感（间隔 100-200ms）
- [ ] AC4: 附魔效果触发时额外浮字标注来源（如 "🔗增幅 ×1.5"）
- [ ] AC5: 伪无限模式视觉：分数区持续快速滚动 + 屏幕边缘光效
- [ ] AC6: Balatro 式结算面板适配 5 资源：base × multiplier + score = finalScore
- [ ] AC7: 保留已有效果：字母弹跳/粒子爆发/连击计数器/屏幕震动/里程碑弹窗
- [ ] AC8: 60fps 流畅度不受浮字数量影响（浮字队列/回收池）

## Tasks / Subtasks

- [ ] Task 1: 移除技能栏 (AC: 1)
  - [ ] 1.1 移除 `#battle-skills` DOM 元素和相关 CSS
  - [ ] 1.2 调整战斗场景布局（打字区域居中扩大）
  - [ ] 1.3 移除 skill bar 相关渲染代码

- [ ] Task 2: 多资源浮字系统 (AC: 2, 3, 4)
  - [ ] 2.1 扩展 `showFeedback()` 支持资源类型参数
  - [ ] 2.2 为 5 种资源定义 CSS 颜色/样式
  - [ ] 2.3 链式触发浮字队列：按间隔逐个弹出
  - [ ] 2.4 附魔浮字：额外 label 显示来源

- [ ] Task 3: 伪无限视觉 (AC: 5)
  - [ ] 3.1 分数区快速滚动动画
  - [ ] 3.2 屏幕边缘发光效果（CSS glow + animation）

- [ ] Task 4: 结算面板适配 (AC: 6)
  - [ ] 4.1 结算面板显示 base / multiplier / score 三个维度
  - [ ] 4.2 公式展示：base × multiplier + score = final
  - [ ] 4.3 保持翻牌动画

- [ ] Task 5: 性能优化 (AC: 8)
  - [ ] 5.1 浮字对象池（避免频繁 DOM 创建/销毁）
  - [ ] 5.2 浮字数量上限（超出时合并或跳过）
  - [ ] 5.3 requestAnimationFrame 驱动动画

- [ ] Task 6: 测试 (AC: 7)
  - [ ] 6.1 已有效果回归测试（弹跳/粒子/连击/震动）
  - [ ] 6.2 浮字颜色正确性
  - [ ] 6.3 结算面板公式正确

## Dev Notes

### 资源颜色映射

| 资源 | 颜色 | Hex 参考 |
|------|------|----------|
| 基数 ⚔️ | 红 | #e74c3c |
| 分数 🪙 | 金 | #f1c40f |
| 倍率 🔥 | 橙 | #e67e22 |
| 时间 ⏳ | 蓝 | #3498db |
| 护盾 🛡️ | 银 | #bdc3c7 |

### 现有保留效果

- 字母弹跳/抖动（`triggerSkillEffect` 中）
- 粒子爆发（`effects/particles.ts`）
- 连击计数器 + 屏幕震动（`showFeedback` 系列）
- 里程碑弹窗
- Balatro 式结算面板

### 设计文档参考

`docs/brainstorming-session-2026-03-03.md` — 战斗中实时反馈 / 伪无限视觉
