# Story 39.6: L4-L5 高阶引导 + 帮助系统

Status: done

## Story

As a 已通关首个 Act 的玩家,
I want 在首次遭遇精英关/Boss 战和职业系统时看到对应引导，并能随时查阅术语表,
so that 我能理解修饰器规则、职业机制等高阶系统，并在遗忘时快速回顾。

## Acceptance Criteria

1. **AC1**: 首次精英关/Boss 关各触发对应引导，内容准确
2. **AC2**: L4_modifier_explain 动态插入当前修饰器名称和描述
3. **AC3**: 职业解锁和首次职业 Run 产出职业资源各触发对应引导
4. **AC4**: 商店和战斗界面右上角显示"?"按钮，点击打开术语表面板
5. **AC5**: 术语表按类别分组显示，支持搜索过滤，内容来源于已有 i18n 条目
6. **AC6**: 设置页"引导提示"开关可控制全局引导显隐
7. **AC7**: 设置页"重置所有引导"按钮可清除所有已完成标记
8. **AC8**: 术语表面板在 1366×768 分辨率下不超出屏幕

## Tasks / Subtasks

- [x] Task 1: 定义 L4-L5 引导步骤数据 (AC: 1-3)
  - [x] 1.1 在 `data/tutorialSteps.ts` 新增 `L4_STEPS: TutorialStep[]`（3 步）
  - [x] 1.2 在 `data/tutorialSteps.ts` 新增 `L5_STEPS: TutorialStep[]`（2 步）
  - [x] 1.3 更新 `FULL_TUTORIAL_STEPS` 为 `[...L0_STEPS, ...L1_STEPS, ...L2_STEPS, ...L3_STEPS, ...L4_STEPS, ...L5_STEPS]`
  - [x] 1.4 L4_elite_intro: trigger event = `battle:start`，condition 留空（由 tutorialInit 注入）
  - [x] 1.5 L4_boss_intro: trigger event = `battle:start`，prerequisite = `L4_elite_intro`
  - [x] 1.6 L4_modifier_explain: trigger event = `battle:start`，prerequisite = `L4_elite_intro`
  - [x] 1.7 L5_class_unlock: trigger event = `meta:class_unlocked`，无 prerequisite
  - [x] 1.8 L5_class_resource: trigger event = `skill:triggered`，prerequisite = `L5_class_unlock`
  - [x] 1.9 所有步骤 level 分别设为 4 / 5

- [x] Task 2: 扩展 TutorialManager 支持动态参数 (AC: 2)
  - [x] 2.1 在 `TutorialStep.content` 中新增可选字段 `paramsProvider?: () => Record<string, string>`
  - [x] 2.2 修改 `TutorialOverlay.show()` 调用 `t(bodyKey, step.content.paramsProvider?.())` 传递动态参数
  - [x] 2.3 同理处理 `titleKey`（可选，L4-L5 暂不需要动态 title）

- [x] Task 3: L4-L5 condition 注入 (AC: 1-3)
  - [x] 3.1 在 `tutorialInit.ts` 新增 `battle:start` 监听器：使用 `getStageType(data.stageId)` 判断关卡类型，设置 flag
  - [x] 3.2 新增 flag：`lastBattleIsElite`、`lastBattleIsBoss`、`lastBattleHasModifier`
  - [x] 3.3 新增 flag：`lastModifierName`、`lastModifierDesc`（存储当前修饰器信息用于动态插值）
  - [x] 3.4 L4_elite_intro condition: `() => lastBattleIsElite`
  - [x] 3.5 L4_boss_intro condition: `() => lastBattleIsBoss`
  - [x] 3.6 L4_modifier_explain condition: `() => lastBattleHasModifier`（精英或 Boss 关均可触发）
  - [x] 3.7 L4_modifier_explain paramsProvider: `() => ({ name: lastModifierName, desc: lastModifierDesc })`
  - [x] 3.8 L5_class_unlock condition: 无需（`meta:class_unlocked` 事件本身即足够）
  - [x] 3.9 L5_class_resource condition: 检查 `state.classId !== 'none'` 且触发的技能产出了职业专属资源
  - [x] 3.10 从 `systems/stage/stageFlow` 导入 `getStageType`、`isEliteNode`、`isBossNode`
  - [x] 3.11 从 `data/bossModifiers` 导入 `getBossModifierMeta`
  - [x] 3.12 更新 `tutorialManager.register()` 调用：包含 L4_STEPS + L5_STEPS

- [x] Task 4: i18n 文本 (AC: 2, 5)
  - [x] 4.1 在 `demo-i18n.ts` 中文 section 新增 10 个 i18n key（5 对 title+body）
  - [x] 4.2 在 `demo-i18n.ts` 英文 section 新增对应 10 个 i18n key
  - [x] 4.3 L4_modifier_explain_body 使用 i18n 模板参数：`{{name}}`、`{{desc}}`
  - [x] 4.4 新增 HelpPanel UI 文本 i18n key（标题、搜索占位符、类别标签等）

- [x] Task 5: HelpPanel 术语表面板 (AC: 4, 5, 8)
  - [x] 5.1 新建 `ui/HelpPanel.ts`
  - [x] 5.2 定义 `GlossaryEntry` 接口：`{ category, id, icon, nameKey, descKey }`
  - [x] 5.3 定义 `GLOSSARY_DATA: GlossaryEntry[]`：从已有 i18n key 映射（affix_desc.* / ench_meta.* / rel.* / modifier.* / resource.*）
  - [x] 5.4 实现面板 DOM 结构：标题栏 + 搜索框 + 类别标签页 + 滚动内容区 + 关闭按钮
  - [x] 5.5 实现搜索过滤：按名称/描述文本匹配
  - [x] 5.6 实现类别分组：affix / enchantment / position / resource / modifier / rarity
  - [x] 5.7 面板样式：固定定位，z-index 高于游戏 UI 低于 TutorialOverlay，最大宽度 600px，最大高度 80vh
  - [x] 5.8 支持 `show()` / `hide()` / `toggle()` 方法
  - [x] 5.9 确保 1366×768 分辨率下不超出屏幕

- [x] Task 6: "?" 按钮入口 (AC: 4)
  - [x] 6.1 在 BattleScene 中添加"?"按钮（右上角，`modifier-info` 区域附近），点击调用 `HelpPanel.toggle()`
  - [x] 6.2 在 ShopScene 中添加"?"按钮（右上角），点击调用 `HelpPanel.toggle()`
  - [x] 6.3 按钮样式：圆形，半透明背景，hover 高亮
  - [x] 6.4 战斗中打开 HelpPanel 时暂停计时器（或不暂停，视 UX 决定）

- [x] Task 7: 设置页引导控制 (AC: 6, 7)
  - [x] 7.1 在 CollectionScene 中新增"设置"标签页（或在 stats 标签页底部添加引导控制区域）
  - [x] 7.2 添加"引导提示"开关：调用 `tutorialManager.setEnabled(boolean)`
  - [x] 7.3 添加"重置所有引导"按钮：调用 `tutorialManager.resetAll()`，带确认弹窗
  - [x] 7.4 开关状态持久化到 MetaState（TutorialManager 已有此逻辑）

- [x] Task 8: 测试 (AC: 1-7)
  - [x] 8.1 更新 `tutorialL0L1.test.ts` 中 `FULL_TUTORIAL_STEPS` 长度断言：14 → 19
  - [x] 8.2 新建 `tests/unit/systems/tutorial/tutorialL4L5.test.ts`
  - [x] 8.3 L4 数据结构测试：3 步 ID 唯一、level=4、trigger event 正确、prerequisite 链
  - [x] 8.4 L5 数据结构测试：2 步 ID 唯一、level=5、trigger event 正确
  - [x] 8.5 i18n 完整性测试：10 个 tutorial key 在 zh/en 两个 locale 中都存在
  - [x] 8.6 HelpPanel 术语数据测试：GLOSSARY_DATA 无重复 id、所有 nameKey/descKey 在 i18n 中存在
  - [x] 8.7 L4 condition 测试：elite/boss/modifier flag 正确设置
  - [x] 8.8 paramsProvider 测试：L4_modifier_explain 返回正确的 name/desc

- [ ] Task 9 (未执行 — 需手动验证): 手动验证 (AC: 1-8)
  - [ ] 9.1 进入精英关：验证 L4_elite_intro 触发
  - [ ] 9.2 进入 Boss 关：验证 L4_boss_intro 触发
  - [ ] 9.3 修饰器动态内容：验证 L4_modifier_explain 显示正确的修饰器名称/描述
  - [ ] 9.4 解锁职业：验证 L5_class_unlock 触发
  - [ ] 9.5 验证"?"按钮在战斗/商店界面均可打开术语表
  - [ ] 9.6 验证术语表搜索过滤功能
  - [ ] 9.7 验证设置页引导开关/重置功能
  - [ ] 9.8 验证 1366×768 分辨率下不溢出

## Dev Notes

### L4 步骤设计（3 步）

| 步骤 ID | level | 触发事件 | condition | prerequisite | 锚定 | 说明 |
|---------|-------|---------|-----------|-------------|------|------|
| `L4_elite_intro` | 4 | `battle:start` | `isEliteNode(stageId)` | 无 | `modifier-info` | 首次精英关 |
| `L4_boss_intro` | 4 | `battle:start` | `isBossNode(stageId)` | `L4_elite_intro` | `modifier-info` | 首次 Boss 关 |
| `L4_modifier_explain` | 4 | `battle:start` | `lastBattleHasModifier` | `L4_elite_intro` | `modifier-info` | 首次有修饰器 |

**触发时机说明：**
- 精英关（node 3,6,9）有 1 个修饰器，Boss 关（node 10）有 3 个修饰器
- L4_elite_intro 和 L4_modifier_explain 可能在同一场精英战触发 → TutorialManager 防重入机制保证一次只显示一个
- L4_boss_intro 的 prerequisite = L4_elite_intro 意味着如果玩家跳过精英关直到 Boss，L4_elite_intro 不会触发但 L4_boss_intro 也不会触发（因为前置条件未满足）。这是符合预期的 — 精英关在 Boss 前必经。
- 无 `elite:enter` 或 `boss:enter` 专用事件；使用 `battle:start` + condition（`getStageType(data.stageId)`）

### L4_modifier_explain 动态插值方案

**问题：** Epic 要求 L4_modifier_explain 显示当前修饰器的名称和描述（`{modifier_name}`：`{modifier_desc}`），但当前 TutorialOverlay 只调用 `t(bodyKey)` 无法传参。

**方案：** 扩展 `TutorialStep.content` 新增 `paramsProvider?: () => Record<string, string>`

```typescript
// data/tutorialSteps.ts — 步骤骨架
{
  id: 'L4_modifier_explain',
  level: 4,
  trigger: { event: 'battle:start' },
  content: {
    titleKey: 'tutorial.L4_modifier_explain_title',
    bodyKey: 'tutorial.L4_modifier_explain_body',  // "修饰器：{{name}} — {{desc}}"
    anchorElement: 'modifier-info',
    anchorPosition: 'bottom',
    // paramsProvider 由 tutorialInit.ts 注入
  },
  prerequisite: 'L4_elite_intro',
}

// tutorialInit.ts — 注入 paramsProvider
const modExplainStep = L4_STEPS.find(s => s.id === 'L4_modifier_explain')
if (modExplainStep) {
  modExplainStep.trigger.condition = () => lastBattleHasModifier
  modExplainStep.content.paramsProvider = () => ({
    name: lastModifierName,
    desc: lastModifierDesc,
  })
}

// TutorialOverlay.show() 修改
const params = step.content.paramsProvider?.() ?? {}
bodyEl.textContent = t(step.content.bodyKey, params)
```

**i18n 模板：**
```
// 中文
'tutorial.L4_modifier_explain_body': '修饰器正在影响你！{{name}}：{{desc}}。休息关可以提前查看下一关的修饰器'
// 英文
'tutorial.L4_modifier_explain_body': 'A modifier is active! {{name}}: {{desc}}. You can preview upcoming modifiers at rest stages'
```

### L5 步骤设计（2 步）

| 步骤 ID | level | 触发事件 | condition | prerequisite | 锚定 | 说明 |
|---------|-------|---------|-----------|-------------|------|------|
| `L5_class_unlock` | 5 | `meta:class_unlocked` | 无需 | 无 | `game-container` | 职业首次解锁 |
| `L5_class_resource` | 5 | `skill:triggered` | 职业资源产出 | `L5_class_unlock` | `skill-trigger-zone` | 首次职业资源 |

**L5_class_resource condition 设计：**
- 职业专属资源类型：Wordsmith = `fragment`，Metamorph = `mutagen`
- `state.classId !== 'none'` 且 `data.growthValue` 或技能产出了对应职业资源
- 实际检查方式：在 `skill:triggered` 监听器中检查 `state.classId !== 'none'`（职业 Run 才触发），作为简化条件已足够 — 职业 Run 首次触发技能即显示此引导

### 修饰器信息获取（battle:start 监听器）

```typescript
// tutorialInit.ts 中的 battle:start 监听器
let lastBattleIsElite = false
let lastBattleIsBoss = false
let lastBattleHasModifier = false
let lastModifierName = ''
let lastModifierDesc = ''

eventBus.on('battle:start', (data) => {
  const stageType = getStageType(data.stageId)
  lastBattleIsElite = stageType === 'elite'
  lastBattleIsBoss = stageType === 'boss'

  // 精英/Boss 关都有修饰器
  if (lastBattleIsElite || lastBattleIsBoss) {
    lastBattleHasModifier = true
    // 获取第一个修饰器信息用于动态插值
    const pool = state.bossModifierPool
    if (pool.length > 0) {
      const meta = getBossModifierMeta(pool[0])
      if (meta) {
        lastModifierName = `${meta.icon} ${t(`modifier.${meta.id}`)}`
        lastModifierDesc = lastBattleIsElite
          ? t(`modifier.${meta.id}.elite`)
          : t(`modifier.${meta.id}.desc`)
      }
    }
  } else {
    lastBattleHasModifier = false
    lastModifierName = ''
    lastModifierDesc = ''
  }
})
```

### HelpPanel 设计

**文件：** `ui/HelpPanel.ts`（纯 DOM，不依赖 PixiJS）

**术语类别与数据源：**

| 类别 | GlossaryEntry.category | 数据源 i18n 前缀 | 预计条目数 |
|------|----------------------|----------------|----------|
| 词条 | `affix` | `affix_desc.*` | ~20 |
| 附魔 | `enchantment` | `ench_meta.*` | ~10 |
| 位置关系 | `position` | `rel.*` | 6 |
| 资源 | `resource` | `resource.*` | 7 |
| 修饰器 | `modifier` | `modifier.*` | 18 |
| 稀有度 | `rarity` | 新增 `rarity.*` | 4 |

**DOM 结构：**
```html
<div id="help-panel" class="help-panel hidden">
  <div class="help-header">
    <h2>术语表</h2>
    <input type="text" placeholder="搜索..." class="help-search" />
    <button class="help-close">✕</button>
  </div>
  <div class="help-tabs">
    <button data-cat="affix">词条</button>
    <button data-cat="enchantment">附魔</button>
    <button data-cat="position">位置</button>
    <button data-cat="resource">资源</button>
    <button data-cat="modifier">修饰器</button>
    <button data-cat="rarity">稀有度</button>
  </div>
  <div class="help-content">
    <!-- 动态生成 -->
  </div>
</div>
```

**z-index 层级：**
- 游戏 UI: z-index 1-100
- HelpPanel: z-index 9000（高于游戏 UI）
- TutorialOverlay: z-index 10000（高于 HelpPanel）

**依赖方向：** `ui/HelpPanel.ts` 可 import `demo-i18n.ts` 的 `t()` 函数，但不应 import `systems/` 或 `scenes/`。HelpPanel 是纯 UI 组件。

### "?" 按钮放置

**BattleScene:**
- 位置：右上角，`modifier-info` 元素附近或其右侧
- 按钮 ID：`battle-help-btn`
- BattleScene 位于 `scenes/` 层，可 import `ui/HelpPanel`

**ShopScene:**
- 位置：右上角，gold 显示区附近
- 按钮 ID：`shop-help-btn`

**按钮样式：**
```css
.help-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #aaa;
  font-size: 16px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 100;
}
.help-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
}
```

### 设置页引导控制

**方案选择：** 在 CollectionScene 的 stats 标签页底部添加"引导设置"区域（最小侵入，避免新增标签页）。

**UI 元素：**
1. "引导提示" 开关（toggle）：`tutorialManager.setEnabled(value)` + `tutorialManager.isEnabled()` 读取当前状态
2. "重置所有引导" 按钮：`tutorialManager.resetAll()` — 弹出确认弹窗后执行

**CollectionScene 修改范围：**
- 仅修改 stats 标签页的渲染逻辑
- 在统计信息底部追加分隔线 + 引导控制区域

### 关键架构约束（延续 39.4/39.5）

1. **依赖方向**: `data/ → core/ → systems/ → scenes/`
   - `data/tutorialSteps.ts` 不 import 任何模块（纯数据）
   - `systems/tutorial/tutorialInit.ts` 可 import `data/`（步骤数据 + 修饰器元数据）+ `systems/`（stageFlow + ClassManager）
   - `ui/HelpPanel.ts` 可 import `data/`（术语数据）+ `core/`（i18n），不 import `systems/` 或 `scenes/`
   - `scenes/` 可 import `ui/HelpPanel`

2. **condition 注入模式**: 步骤骨架在 `data/tutorialSteps.ts`（纯数据），condition + paramsProvider 在 `tutorialInit.ts` 注入

3. **Flag 变量重置**: 每次 `battle:start` 事件都应重置所有 flag（不要只设 true 不重置 — 39.5 code review 教训）

4. **TutorialManager 防重入**: 同一 `battle:start` 可能同时满足 L4_elite_intro 和 L4_modifier_explain → TutorialManager 只显示第一个通过检查的步骤，下次满足条件时显示下一个

5. **`skill:triggered` 高频事件**: 监听器仅做 flag 赋值（O(1)），不做复杂逻辑

6. **初始化守卫**: `tutorialInit.ts` 已有 `if (initialized) return` 防止双重注册

### 39.4/39.5 Code Review 经验教训

1. **flag 变量必须每次事件重置**：不要用 `if (condition) flag = true` 而不重置 — 用 `flag = condition`
2. **condition 签名保持 `() => boolean`**：TutorialManager 不传参数给 condition
3. **eventBus emit 字段必须验证实际存在**：39.5 code review 发现 `skill:triggered` 缺少 `growthValue`/`questCompleted`，已修复
4. **测试不要伪装已验证**：手动验证任务诚实标注未执行
5. **`paramsProvider` 是新增扩展**：需同步修改 TutorialOverlay.show() 的调用方式

### DOM 锚点

| 步骤 | 锚点 ID | 锚定方向 | 说明 |
|------|---------|---------|------|
| L4_elite_intro | `modifier-info` | bottom | 修饰器 HUD 下方 |
| L4_boss_intro | `modifier-info` | bottom | 修饰器 HUD 下方 |
| L4_modifier_explain | `modifier-info` | bottom | 修饰器 HUD 下方 |
| L5_class_unlock | `game-container` | top | 全屏居中（无特定 UI 元素） |
| L5_class_resource | `skill-trigger-zone` | top | 键盘区上方 |

### 关卡映射（来源：stageFlow.ts）

```
Node 1,2,5,7 → standard（30s）
Node 3,6,9   → elite（45s，1 修饰器）
Node 4,8     → rest（0s，无战斗）
Node 10      → boss（60s，3 修饰器）
```

Act 结构：10 节点一个 Act，无尽模式循环。首次精英关在 node 3（第 3 关）。

### 修饰器元数据（来源：bossModifiers.ts）

```typescript
interface BossModifierMeta {
  id: BossModifierId
  name: string       // 中文名
  icon: string       // Unicode emoji
  description: string // Boss 难度描述
  eliteHint: string   // 精英难度描述（弱化版）
  category: 'offense' | 'defense' | 'disruption'
}
```

18 个修饰器，3 类各 6 个。`getBossModifierMeta(id)` 获取元数据。
已有 i18n key: `modifier.{id}` / `modifier.{id}.desc` / `modifier.{id}.elite`。

### 职业系统（来源：ClassManager.ts）

- `state.classId`: `'none' | 'wordsmith' | 'metamorph'`
- `meta:class_unlocked` 事件：`{ classId: string }`（MetaState 级，永久解锁时触发一次）
- `selectClass(classId)` 在 Run 开始时调用
- 职业资源：Wordsmith → `fragment`，Metamorph → `mutagen`

### 现有 i18n 可复用 key（来源：demo-i18n.ts）

| 类别 | key 模式 | 示例 | 约数量 |
|------|---------|------|--------|
| 修饰器 | `modifier.{id}` / `.desc` / `.elite` | `modifier.boss_spotlight` | 18×3=54 |
| 词条 | `affix_desc.{type}` | `affix_desc.multiply` | ~20 |
| 位置关系 | `rel.{type}` | `rel.adjacent` | 6 |
| 附魔 | `ench_meta.{id}` / `.desc` | `ench_meta.apprentice_self` | ~10×2=20 |
| 资源 | `resource.{type}` | `resource.base` | 7 |

HelpPanel 的 GLOSSARY_DATA 应直接映射这些已有 key，不重复定义内容。

### Project Structure Notes

**新建文件：**
- `src/src/ui/HelpPanel.ts` — 术语表面板组件

**修改文件（预计）：**
- `src/src/data/tutorialSteps.ts` — 新增 L4_STEPS + L5_STEPS，更新 FULL_TUTORIAL_STEPS
- `src/src/systems/tutorial/TutorialManager.ts` — TutorialStep.content 新增 paramsProvider 类型
- `src/src/systems/tutorial/TutorialOverlay.ts` — show() 支持 paramsProvider 参数传递
- `src/src/systems/tutorial/tutorialInit.ts` — L4-L5 condition 注入 + battle:start 监听器 + 修饰器 flag
- `src/src/demo/demo-i18n.ts` — L4-L5 引导文本 + HelpPanel UI 文本（中英双语）
- `src/src/scenes/battle/BattleScene.ts` — 添加"?"按钮
- `src/src/scenes/shop/ShopScene.ts` — 添加"?"按钮
- `src/src/scenes/collection/CollectionScene.ts` — stats 标签页添加引导控制区域
- `src/src/ui/elements.ts` — 新增 `battle-help-btn`、`shop-help-btn`、`help-panel` 等元素 ID
- `src/tests/unit/systems/tutorial/tutorialL0L1.test.ts` — FULL_TUTORIAL_STEPS 长度 14→19
- `src/tests/unit/systems/tutorial/tutorialL4L5.test.ts` — 新建

### References

- [Source: docs/stories/epic-39-tutorial-readability.md#Story 39.6 — L4-L5 步骤规格 + HelpPanel + 设置页 AC]
- [Source: docs/stories/39-5-tutorial-L2-L3.md — condition 注入模式 + flag 变量重置教训 + 防重入行为]
- [Source: docs/stories/39-4-tutorial-L0-L1.md — L0-L1 实现模式 + code review 经验]
- [Source: docs/stories/39-3-tutorial-manager-infra.md — TutorialManager API + TutorialOverlay]
- [Source: src/src/systems/stage/stageFlow.ts — getStageType() / isEliteNode() / isBossNode() / 关卡映射]
- [Source: src/src/data/bossModifiers.ts — BossModifierMeta 接口 + getBossModifierMeta()]
- [Source: src/src/systems/bossModifierEngine.ts — applyModifier() + state.bossModifierPool]
- [Source: src/src/systems/classes/ClassManager.ts — selectClass() / state.classId / meta:class_unlocked]
- [Source: src/src/core/events/EventBus.ts — battle:start / meta:class_unlocked / skill:triggered 事件类型]
- [Source: src/src/ui/elements.ts — DOM 元素 ID 清单]
- [Source: src/src/systems/restStage.ts:273-281 — 修饰器预览功能（state.bossModifierPool）]
- [Source: src/src/demo/demo-i18n.ts — modifier.* / affix_desc.* / rel.* / ench_meta.* / resource.* 现有 i18n key]
- [Source: src/src/scenes/collection/CollectionScene.ts — 标签页结构（skills/relics/stats/leaderboard）]
- [Source: docs/project-context.md — 依赖方向 / 事件命名 / 状态管理 / 性能预算规则]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A

### Completion Notes List

- Task 1-6: Implemented in prior session (L4-L5 step data, paramsProvider, condition injection, i18n, HelpPanel, "?" buttons)
- Task 7: Stats tab in CollectionScene extended with tutorial toggle (setEnabled) and reset button (resetAll + confirm dialog)
- Task 8: Created tutorialL4L5.test.ts (40 tests incl GLOSSARY_DATA), updated tutorialL0L1.test.ts FULL_TUTORIAL_STEPS length (14→19). All 118 tutorial tests pass.
- Task 9: Manual verification not executed — requires running the game

### Code Review Fixes (Claude Opus 4.6)

- **H1 fixed**: CollectionScene toggleBg had double x/y positioning (on Graphics + Container). Removed redundant `toggleBg.x/y`.
- **H2 fixed**: `TutorialManager.setEnabled(true)` now calls `this.start()` to restart event listeners.
- **H3 fixed**: Added GLOSSARY_DATA tests (6 tests: unique id, icon, nameKey≠descKey, zh nameKey/descKey exist, 6 categories).
- **M1 fixed**: Added dedicated `.desc` i18n keys for position (6), resource (7), rarity (4) entries. Removed 9 modifier entries without i18n keys from GLOSSARY_DATA.
- **M2 fixed**: paramsProvider test uses shallow clone instead of mutating shared L4_STEPS.

### File List

**New files:**
- `src/src/ui/HelpPanel.ts` — Glossary panel (DOM-based, 65 entries, 6 categories)
- `src/tests/unit/systems/tutorial/tutorialL4L5.test.ts` — 34 tests

**Modified files:**
- `src/src/data/tutorialSteps.ts` — L4_STEPS (3), L5_STEPS (2), paramsProvider in TutorialContent, FULL_TUTORIAL_STEPS updated
- `src/src/systems/tutorial/TutorialManager.ts` — paramsProvider passthrough in showStep()
- `src/src/systems/tutorial/TutorialOverlay.ts` — paramsProvider in options + createOverlay()
- `src/src/systems/tutorial/tutorialInit.ts` — L4-L5 condition injection + battle:start listener + initHelpButtons()
- `src/src/demo/demo-i18n.ts` — L4-L5 tutorial i18n (10 keys) + HelpPanel UI keys + settings keys (zh+en)
- `src/src/scenes/collection/CollectionScene.ts` — Stats tab with tutorial toggle + reset + confirm dialog
- `src/tests/unit/systems/tutorial/tutorialL0L1.test.ts` — FULL_TUTORIAL_STEPS length assertion updated
