---
title: "Epic 60: 商店改造 · Phase 2 · 主流程接入与官僚化完工"
epic_key: "epic-60"
status: "draft"
created: "2026-04-28"
source_documents:
  - src/src/ui/shopPreview.ts
  - src/src/ui/itemDescriptors.ts
  - src/src/ui/affixAbbrev.ts
  - docs/narrative-design.md
stories:
  - "60-1-multi-cell-shape-binding"
  - "60-2-pack-multi-word-picker"
  - "60-3-status-bar-real-state"
  - "60-4-submit-form-startlevel"
  - "60-5-openshop-replacement-flag"
  - "60-6-save-serialization-inbox"
  - "60-7-event-bus-binding-manager"
  - "60-8-tutorial-overhaul"
  - "60-9-workbench-hover-tooltips"
  - "60-10-info-owned-skills"
  - "60-11-transition-animations"
  - "60-12-sound-effects"
  - "60-13-craft-metamorph-stations"
  - "60-14-module-split-i18n"
---

# Epic 60: 商店改造 · Phase 2 · 主流程接入与官僚化完工

## 背景

Phase 1（commit `69b0077` → `3325a67`，11 个 commit）落地了 `#shop-preview` 双屏原型 —— **DPCA-VT220 终端商店 + 物理工作台 + 完整 ANSI 键盘 + 抽屉式 overlay** —— 但仍是 hash-route 隔离的**预览态**：不在主流程，多格技能形状被绕过，事件总线缺席，存档不带 inbox，SUBMIT FORM 不进战斗，老 tutorial 还在教旧拖拽。

Phase 2 把 Phase 1 的可视化/交互骨架**变成正式商店**：补全机制级遗漏（多格形状、事件、save）→ 替换 `openShop()` 主入口 → 重写 tutorial → 补 tooltip / 转场 / 音效 / 双职业工序。

参考交付物：Phase 1 review 已分类为四档优先级（P2.1–P2.4），本 Epic 14 个 Story 按此组织。

## 设计目标

- **机制零回退**：Phase 1 在多格形状、bindingManager 接口、事件总线上有 shortcut，Phase 2 必须补齐，不能在替换 `openShop()` 后让现有 epic（35 词条制 / 40 polyomino / 36 遗物 / 52 quest）破功
- **平滑替换**：通过设置项 `settings.shopUI: 'classic' | 'terminal'` 灰度切换，老 UI 保留作 fallback；默认值 `classic`，用户可手动切到 `terminal`
- **存档前向兼容**：老存档无 inbox 字段恢复时默认空数组；新存档可被老版本读（新字段缺失不崩）
- **教程贯通**：新增/重写 tutorial 步骤教终端命令 + 工作台拖拽，而不是旧的"商店卡片拖到键位"
- **叙事完整**：补 Pack 多词拣选弹窗、Craft/Metamorph 工序的官僚化包装，让商店每一步都长在《灵长类辅助文书部》世界里

## 非目标（Out of Scope）

- **键盘 prop 视觉再迭代**：4-tier 已锁定，不再调键盖材质/字体
- **完全废弃 classic 商店**：Phase 2 仅引入 feature flag，下一个 epic 才决定 sunset 时机
- **新增技能/词包/遗物机制**：本 Epic 只搬运现有机制到新 UI
- **移动端适配**：dragManager 已有 touch 支持但不在本 Epic 验收范围
- **多语言扩展**：本 Epic 只补齐已有 zh/en 两语对终端 + 工作台所有可见字符串

## 依赖

| 依赖 | 来源 | 说明 |
|---|---|---|
| `shopPreview.ts` | Phase 1 commit `3325a67` | 本 Epic 的改造起点 |
| `bindingManager.ts` `bindShapeToKeys` | Story 40.5 | 60-1 必须改走官方接口 |
| `RunState.serialize/deserialize` | Epic 17 持久化 | 60-6 加 `inbox` 字段 |
| `eventBus` (`shop:bought` 等) | Epic 36 遗物钩子 | 60-7 让新 BUY 走完整事件 |
| `SettingsPanel` + `UserSettings` | Epic 56 设置面板 | 60-5 加入 shopUI 切换项 |
| `tutorialManager` + Story 56-3* | Epic 56 教程基建 | 60-8 重写 tutorial 步骤 |
| `KeyTooltip` (`keyTooltip.show`) | Story 35.11 | 60-9 工作台 hover 复用 |
| `restEvents` / `craftAssembly` / `metamorphMutate` | Epic 22/53 | 60-13 接入工序逻辑 |
| `narrative-design.md` 双声模板 | Epic 58 | 60-2 Pack 弹窗、60-13 工序文案走 T1-T7 |

## 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| `bindShapeToKeys` 与现有 dragManager 范围预览有 ~3000 行耦合代码 | 60-1 工作量超预期 | 拆 60-1a (单格 → 多格基本绑定) + 60-1b (range preview hover) 两个 sub-story |
| feature flag 切换后老存档加载到新 UI 形状错乱 | 玩家进度受损 | 60-5 加迁移检查：检测到 inbox/binding shape 不一致时强制走 classic |
| 教程改写涉及 i18n 全套重做 | 60-8 阻塞所有 zh-only 用户 | 60-8 与 60-14 i18n 必须同 sprint 完成 |
| 转场动画 + 音效堆叠让"BUY 一个物品要 1.5 秒才能看到反馈" | 大量购买体验劣化 | 60-11/60-12 实现时所有动画/音效给可关闭开关，默认开但快节奏（≤300ms） |

---

## Story 拆分

### Story 60-1: 多格技能形状绑定 + 范围预览

**优先级：P2.1 · 质量门**

**范围：** 工作台拖拽接入 `bindShapeToKeys` 官方接口，恢复 polyomino 多格技能（Story 40 整套设计）

**功能清单：**
- [ ] 拖拽 IN-tray 银卡到键位时，调用 `bindShapeToKeys(getBindingState(state), skillId, anchorKey)` 而非直接 `bindings.set`
- [ ] hover 拖拽到 tier-1 键位时，按 `mapShapeToKeys` 计算覆盖键，`.shape-preview-valid` (绿) / `.shape-preview-invalid` (红) / `.shape-preview-displaced` (黄闪) 高亮
- [ ] 右键已绑定多格键 → 调用 `getShapeRotationCount` + 试旋转，复用 shop.ts:3926 的 `handleKeySlotRotation` 逻辑
- [ ] 多格技能 IN-tray 银卡显示 ASCII 形状缩略图（复用 `renderShapePreview`）
- [ ] 拖拽幽灵元素显示 `shapePreviewHtml`（dragManager 已支持 payload 字段）

**验收标准：**
- [ ] Tetromino-T 技能能完整绑定到 ASDF + W（5 键中 4 占）
- [ ] 拖拽到非法位置时 IN-tray 卡片回弹（spring easing）+ 红色边框脉动
- [ ] 旋转动画 `shape-rotate-pop` 复用
- [ ] 卸下多格技能时所有占位键同步清空

---

### Story 60-2: Pack 多词拣选弹窗

**优先级：P2.1 · 质量门**

**范围：** 稀有/史诗 Pack（`pack.words.length > 1`）BUY 时弹三选一抽屉

**功能清单：**
- [ ] 在 BUY pack 路径上检测 `pack.pickCount > 0 && pack.words.length > 1` → 弹 `<wb-drawer>` `kind: 'pack-pick'`
- [ ] 抽屉显示 N 个候选词卡片（沿用 word-picker 老 UI 视觉，但 paper-craft 包装）
- [ ] 玩家点选 → 加入 `wordDeck` + 关闭抽屉 + 终端打印 `WORD "X" FILED TO LIBRARY`
- [ ] 玩家点 ESC / overlay backdrop → 取消购买 + 退款
- [ ] UND 处理：撤销时把 `last.words` 全部从 wordDeck 移除（已实现，验证下边界）
- [ ] 文案走 `narrative-design.md` 的 T2 模板（"批文 + 三选一申领"）

**验收标准：**
- [ ] 普通（1-词）pack 行为不变（直接入库）
- [ ] 稀有/史诗（3-词）pack 必弹弹窗，玩家选完才扣钱
- [ ] 抽屉关闭后焦点回终端 prompt
- [ ] 取消路径不扣钱 + UND 栈不变

---

### Story 60-3: 状态条 + Banner 接真实 state

**优先级：P2.1 · 质量门**

**范围：** 终端顶部 banner + 状态栏所有数据从 `state` 读

**功能清单：**
- [ ] Banner: `FILE ${state.level} BATCH ${batchInCycle}/${BALANCE.CYCLE_LENGTH} A${state.ascensionLevel || 0}` + 周目前缀（cycle≥2 时加 `[CYCLE-N]`）
- [ ] 状态栏 BAL `🍌 ${state.gold}`（已接），FORM 显示 `F-${stageId}`（动态），CLR 按 stageType 显示 `4-B`/`4-A`/`III`
- [ ] STAGE icon 从 `actTransition.ts:80` 的 icons map 读：standard 📋 / boss 🚩 / ritual 🕯️ / elite 📑
- [ ] CONN 静态 `56k6 OK`（保留官僚梗）
- [ ] 暴露 `updateTerminalChrome()` 函数，在 `enterPreview` + 周期阶段事件触发时调用

**验收标准：**
- [ ] 进入 cycle 2 boss 关时 banner 显示 `[CYCLE-2] FILE N · BATCH 12/12 · A1` + STAGE 🚩
- [ ] BAL 实时跟随 gold 增减
- [ ] 与 battle.ts:2275 `el.levelLabel` 词典完全一致（已建 `feedback_ui_label_vocabulary.md` memory）

---

### Story 60-4: SUBMIT FORM → startLevel 接入

**优先级：P2.1 · 质量门**

**范围：** 工作台底部 SUBMIT FORM 红章按钮真正进入下一关

**功能清单：**
- [ ] SUBMIT 点击 → 检查 `state.player.bindings.size === 0` → 弹确认 `WARNING: NO BINDINGS · CONFIRM ENTRY?`
- [ ] 检查 `state.player.inbox.length > 0` → 弹 `LEAVE N ITEMS IN TRAY?`（Y 带入下关 / N 留下编辑）
- [ ] 通过后：盖红章动画 (~600ms) → `dragManager.destroy()` → `state.level = getNextBattleNode(state.level)` → `void startLevel()`
- [ ] 同时退出 preview 模式（`active = false`）

**验收标准：**
- [ ] 提交后正常进入下一关战斗，词库/绑定/遗物全部就位
- [ ] 取消按钮回工作台不破坏 state
- [ ] 盖章动画结束前禁用按钮防止重复触发

---

### Story 60-5: openShop() 替换 + feature flag

**优先级：P2.2 · 接主流程必备**

**范围：** 在 `SettingsPanel` 加 shopUI 切换项；`openShop()` 按设置分发到新/老 UI

**功能清单：**
- [ ] `UserSettings.shopUI: 'classic' | 'terminal'`，默认 `classic`
- [ ] `SettingsPanel` 新增"商店界面 / Shop UI"分组，单选切换
- [ ] `openShop()` 入口判断：`shopUI === 'terminal'` → 调 `enterTerminalShop()`（新名字，Phase 1 的 `enterPreview` 重命名 + 暴露）；否则走原 DOM 商店
- [ ] terminal 模式下隐藏老的 `#shop-screen`、保留所有相关 ID/CSS（不清理）
- [ ] 移除 `#shop-preview` hash 入口（hash 仅 dev 调试用，正式入口走设置）

**验收标准：**
- [ ] 设置切到 terminal → 完成战斗后进入新商店；切回 classic → 进入老商店
- [ ] 切换不需要重启，下一次 openShop 立即生效
- [ ] feature flag 状态写入 `settings.json` 持久化

---

### Story 60-6: inbox + bindings 存档序列化

**优先级：P2.2 · 接主流程必备**

**范围：** `RunStateData` 加 `inbox: string[]`，serialize/deserialize 全套

**功能清单：**
- [ ] `RunStateData.inbox: string[]`
- [ ] `RunState.serialize()` 写出 `inbox: [...this.data.inbox]`
- [ ] `RunState.deserialize()` 读入 `inbox: parsed.inbox || []`（兼容老存档）
- [ ] `state.player.inbox` 与 RunState 同步逻辑（参考 bindings/skills 现有同步路径）
- [ ] 单元测试：保存有 3 个 inbox 项的 run，恢复后仍 3 个

**验收标准：**
- [ ] 老存档（无 inbox 字段）加载到新代码不崩，inbox 默认空
- [ ] 保存有 inbox 的存档可被老代码读（额外字段被忽略）
- [ ] 单元测试覆盖：空 inbox / 满 inbox / inbox 中含已删除 skillId

---

### Story 60-7: 事件总线 + bindingManager 接口闭合

**优先级：P2.2 · 接主流程必备**

**范围：** 新 BUY/绑定路径走官方接口，触发所有应触发的事件

**功能清单：**
- [ ] 新 `executeBuySkill` 调用现有 `purchaseShopItem(item)` 而非手动写 state（这层是 ground truth，触发 `shop:bought` 事件）
- [ ] 新工作台拖拽绑定调用 `bindShapeToKeys` 而非 `bindings.set`（触发 `binding:changed` 等）
- [ ] 卖出走 `sellSkill(skillId)` 而非手写 inbox.splice
- [ ] 验证以下机制不破：遗物 `intermission` (购买后回血) / quest `equip-count` 检测 / D100 抽奖触发条件

**验收标准：**
- [ ] 持有 `intermission` 遗物时购买技能仍触发其效果
- [ ] 装备数量型 quest 在新工作台拖拽后正确累计
- [ ] 与 60-1 同 sprint 完成（依赖 bindShapeToKeys）

---

### Story 60-8: 教程改写

**优先级：P2.2 · 接主流程必备**

**范围：** 重写 tutorial 步骤教终端命令 + 工作台拖拽

**功能清单：**
- [ ] 检查 `tutorialInit.ts` 中所有 shop 相关 step，标记 deprecated
- [ ] 新增 step：`L4_terminal_intro`（教 LIS / BUY / INF / Tab）
- [ ] 新增 step：`L4_workbench_drag`（教 IN-tray 拖到键 / 拖回卸下）
- [ ] 新增 step：`L4_relic_number_row`（教数字键挂遗物）
- [ ] 新增 step：`L4_drawer_words`（教 WORDS 命令 / 点击 folder）
- [ ] 教程文案走 T7 模板（"司礼引言"，单声 zh-CN）+ 中英两语
- [ ] 教程仅在 shopUI === 'terminal' 时启用新 step；老用户切回 classic 仍看老教程

**验收标准：**
- [ ] 新玩家走完教程能独立完成"买技能 → 拖到键 → 提交进战斗"全流程
- [ ] 教程文案与 narrative-design.md 双声规则一致

---

### Story 60-9: 工作台 hover tooltip

**优先级：P2.3 · 浪漫化**

**范围：** 工作台 hover 任意已绑/库存物品 → 复用 `KeyTooltip` 显示详情

**功能清单：**
- [ ] tier-1 键位 (.has-skill) hover → `keyTooltip.show()` 走 `buildAffixTooltipFields(skill, rt)`
- [ ] IN-tray 银卡 hover → 同上
- [ ] FILED · SKILL folder row hover → 同上（已装 + 未装的统一入口）
- [ ] 数字键 (.has-relic) hover → relic tooltip（复用 shop.ts `showRelicTooltip` 或重写）
- [ ] 离开元素 / 拖拽开始 → `keyTooltip.hide()`

**验收标准：**
- [ ] tooltip 内容与老 UI 完全一致（包括 affix 描述、附魔、smart estimate、quest progress）
- [ ] 拖拽中 tooltip 自动隐藏不挡视线

---

### Story 60-10: 终端 INFO 支持已有技能 / 遗物

**优先级：P2.3 · 浪漫化**

**范围：** `INF` 命令不止能查 catalog，也能查 own/bound

**功能清单：**
- [ ] `INF F`（按键位）→ 查该键绑定的技能详情
- [ ] `INF MORALE-AURA`（模糊匹配 owned skill 名）→ 同上
- [ ] `INF /list-owned`（特殊 flag）→ 列出所有 owned skill 简表
- [ ] `INF REL-FOSSILIZED-MEMO` → 查 owned relic 详情
- [ ] 帮助文档（HEL）补说明

**验收标准：**
- [ ] 终端从未跳出"我装了什么/这个键有什么"的查询闭环
- [ ] 不与 SKL-NNN catalog SKU 冲突（按 SKU 优先匹配 catalog，找不到才查 owned）

---

### Story 60-11: 转场动画

**优先级：P2.3 · 浪漫化**

**范围：** 关键节点的仪式感动画

**功能清单：**
- [ ] BUY skill 成功 → IN-tray 对应槽 ~250ms 高亮闪 + 气动管 `whoosh` 滑入动画（CSS keyframes）
- [ ] SUBMIT FORM 点击 → 红章 `stamp-bang` 动画 0.6s（缩放 0→1.2→1 + 旋转 -3°→0° + 红色 ink-spread filter）
- [ ] Tab 切屏可选短转场 250ms（CRT 关机 → 桌面亮起；可在设置中关闭，默认开）
- [ ] RESHUFFLE → catalog 行逐行 print（30-50ms/行）

**验收标准：**
- [ ] 所有动画总时长 ≤300ms（按用户操作节奏）
- [ ] `prefers-reduced-motion` 媒体查询尊重
- [ ] 设置项 `settings.shopAnimations: boolean` 默认 true，关掉所有动画即时

---

### Story 60-12: 音效

**优先级：P2.3 · 浪漫化**

**范围：** 商店/工作台音效层

**功能清单：**
- [ ] 终端键击 click（机械轴 thock）
- [ ] 回车 = 继电器 thunk
- [ ] BUY 确认 = 点阵打印机 zip
- [ ] BUY 拒绝 = 拨号忙音三声
- [ ] 工作台拖起 = 抓握刺啦 / 落下 = 木质 click / 放入 IN-tray = 闷响
- [ ] SUBMIT 红章 = stamp 重击
- [ ] 抽屉打开 = 抽拉哗啦
- [ ] 全部走 `effects/sound.ts` `playSound` 接口
- [ ] 设置项 `settings.shopSound: boolean` 默认 true

**验收标准：**
- [ ] 音效与现有 BGM/SFX 音量混音不爆音
- [ ] 音效资源体积 ≤200KB（每条 ≤30KB）

---

### Story 60-13: Craft + Metamorph 工序

**优先级：P2.3 · 浪漫化**

**范围：** Phase 1 的 stub 抽屉填实

**功能清单：**
- [ ] Craft 抽屉：接入 `state.fragmentInventory` + `state.assemblyQueue`，UI 复用现有 craft-panel HTML 但裹工作台风格（牛皮纸 + 流水线纹理）
- [ ] Metamorph 抽屉：接入 `state.mutagenInventory` + `state.affixSkills`，UI 复用现有 metamorph-panel
- [ ] 抽屉内交互（拖拽碎片、选词条蜕变）保留老逻辑
- [ ] 仅 `state.classId === 'wordsmith' / 'metamorph'` 时显示底部按钮

**验收标准：**
- [ ] 造词师/蜕变师玩家能在新工作台完整完成本职业操作
- [ ] 抽屉关闭后 craft/metamorph 状态保留

---

### Story 60-14: 模块拆分 + i18n 全覆盖 + 死代码清理

**优先级：P2.4 · 清理**

**范围：** Phase 1 留下的单文件 1100+ 行 `shopPreview.ts` 拆模块 + 终端字符串走 i18n

**功能清单：**
- [ ] 拆 `shopPreview.ts` → `shopTerminal.ts` (终端命令 + 渲染) / `shopWorkbench.ts` (工作台 + 拖拽 + drawer) / `shopState.ts` (inbox/undo/session 状态) / `shopBootstrap.ts` (DOM 注入 + lifecycle)
- [ ] 删 `RELICS_LOOKUP()` 间接函数（直接用 `RELICS`）
- [ ] 终端所有可见字符串走 `t('shop.terminal.*')`：错误腔、命令名、F-key caption、状态栏标签
- [ ] 工作台所有可见字符串走 `t('shop.workbench.*')`：tier 标签、签条、印章名、抽屉标题
- [ ] 抽 `affixAbbrev.ts` 缩写表到 i18n 数据层（zh 用全名 + en 用 abbrev）

**验收标准：**
- [ ] 拆分后单文件 ≤400 行
- [ ] 切语言到 zh，所有终端/工作台文本切到中文（除 SKU/形状代码外）
- [ ] tsc 通过、所有 Phase 1 流程仍工作

---

## Sprint 编排建议

| Sprint | Stories | 主题 |
|---|---|---|
| **S1（质量门）** | 60-1, 60-2, 60-3, 60-4 | 把"看着像"补成"用着对"，准备接入 |
| **S2（接入）** | 60-5, 60-6, 60-7, 60-8 | feature flag 开关 + 存档 + 事件 + 教程，正式上线 |
| **S3（浪漫化）** | 60-9, 60-10, 60-11, 60-12, 60-13 | tooltip + 动画 + 音效 + 双职业 |
| **S4（清理）** | 60-14 | 拆模块 + i18n + 死代码 |

## 完成判定

- 默认 `shopUI === 'terminal'` 时整局游戏（含 boss + ritual + rest stage）能完整通关，无功能回退
- Phase 1 的所有"脆弱点"（review 列出 8 项）全部修复
- 现有 epic 35/36/40/52 单元测试 + e2e 不破
- `feedback_ui_label_vocabulary.md` 词典在新 UI 全程一致
