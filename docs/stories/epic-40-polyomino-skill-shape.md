---
title: "Epic 40: 多格技能形状系统（Polyomino）"
epic_key: "epic-40"
status: "draft"
created: "2026-03-20"
stories:
  - "40-1-shape-data-model"
  - "40-2-shape-generation"
  - "40-3-keyboard-multi-cell-binding"
  - "40-4-shop-shape-preview"
  - "40-5-drag-drop-shape-placement"
  - "40-6-right-click-rotation"
  - "40-7-keyboard-visualizer-multi-cell"
  - "40-8-trigger-and-battle-adaptation"
  - "40-9-spatial-affix-adaptation"
  - "40-10-enchantment-topology-adaptation"
  - "40-11-balance-and-integration"
---

# Epic 40: 多格技能形状系统（Polyomino）

## 背景

当前所有技能无论词条数量，均占据键盘上 1 个键位。这导致：

1. **构筑空间感缺失**：26 个键位可装 26 个技能，布局决策仅围绕"位置关系"，缺乏空间规划维度
2. **稀有度体感弱**：3 词条传说技能与 0 词条白色技能占用相同格子，"更强 = 更大"的直觉反馈缺失
3. **策略深度有限**：无需权衡"一个强力技能 vs 多个弱技能"的空间成本

### 设计方案：Polyomino 技能形状

借鉴俄罗斯方块的多格拼合思路，技能根据词条数量占据不同数量的**相连键位**：

| 稀有度 | 词条数 | 占格数 | 形状类型 | 形状名 |
|--------|--------|--------|----------|--------|
| 白色 | 0 | 1 | Monomino | ■ |
| 蓝色 | 1 | 2 | Domino | ■■（条形） |
| 紫色 | 2 | 3 | Triomino | L / I 随机 |
| 橙色 | 3 | 4 | Tetromino | T / L / S / Z / I / O 随机 |

- 形状在生成时随机确定，固定不变
- 所有格子必须**物理相邻**（Adjacent 关系）
- 可通过**右键点击**旋转形状（90° 顺时针）
- 商店中**预览形状**，拖拽时显示形状轮廓

### 核心体验

- 白色技能灵活（1 格），可填充空隙
- 传说技能强力但"笨重"（4 格），需要精心规划放置位置
- 键盘布局变成一个 **空间拼图**，增加构筑的策略层次
- 旋转机制提供额外灵活性，适配不同键盘区域

## 设计原则

- **向下兼容**：0 词条技能行为完全不变，现有存档可平滑过渡
- **物理相邻**：多格形状基于 `ADJACENT_KEYS` 拓扑，尊重 QWERTY 错位行布局
- **所见即所得**：商店预览、拖拽预览、键盘显示保持一致的形状表示
- **最小数据变更**：`bindings` 从 `Map<key, skillId>` 语义不变，多格技能占多个 key 指向同一 skillId

## 核心数字

| 指标 | 当前 | 改造后 |
|------|------|--------|
| 技能占格数 | 全部 1 格 | 1 / 2 / 3 / 4 格 |
| 最大可装技能数（26 键） | 26 | 7~26（取决于形状组合） |
| 形状种类 | 无 | Monomino(1) + Domino(1) + Triomino(2) + Tetromino(6) = 10 种 |
| 旋转状态 | 无 | 每种形状 1~4 个旋转态 |

## Stories

---

### Story 40.1: 形状数据模型

**复杂度: Medium**
**依赖: 无**

定义多格技能形状的数据结构和形状库。

**范围：**
- 新增 `SkillShape` 接口：`{ cells: [row, col][], rotation: 0|1|2|3 }` 表示相对偏移
- 新增 `ShapeTemplate` 形状模板库：所有合法 polyomino 形状及其旋转态
  - Monomino: `[[0,0]]`（1 种，旋转不变）
  - Domino: `[[0,0],[0,1]]`（1 种基本形状，2 个旋转态：横/竖）
  - Triomino: I 形 `[[0,0],[0,1],[0,2]]` + L 形 `[[0,0],[0,1],[1,0]]`（2 种，各 4 个旋转态，去重后各 2 个）
  - Tetromino: T/L/J/S/Z/I/O 标准 7 种（各含 1~4 个旋转态）
- 在 `AffixSkillInstance` 上扩展 `shapeId: string` 和 `rotation: number` 字段
- 形状旋转函数 `rotateShape(shape, times): cells[]`
- 形状映射到键盘函数 `mapShapeToKeys(anchorKey, shape): string[] | null`（null = 放不下）
- 使用 `ADJACENT_KEYS` 验证生成的形状在键盘拓扑上合法

**验收标准：**
- AC1: 所有 polyomino 形状模板定义完整，包含旋转态
- AC2: `rotateShape` 正确返回 90° 顺时针旋转后的偏移
- AC3: `mapShapeToKeys` 在 QWERTY 错位行布局上正确映射
- AC4: 形状合法性验证：所有格子两两之间通过 Adjacent 可达
- AC5: 0 词条技能 shapeId 为 monomino，向下兼容
- AC6: 单元测试覆盖所有形状模板 × 所有旋转态

**估点：** 5

---

### Story 40.2: 技能生成时分配形状

**复杂度: Low**
**依赖: 40.1**

技能生成时根据词条数量分配随机形状。

**范围：**
- 修改 `generateSkill()`（`skillGeneration.ts`）：根据 `rarity` 选择形状类型，随机选一个模板
  - rarity 0 → monomino
  - rarity 1 → domino（横条固定）
  - rarity 2 → 随机 triomino（I 或 L）
  - rarity 3 → 随机 tetromino（T/L/J/S/Z/I/O）
- 初始 `rotation` 随机 0~3
- 形状在生成后固定不变（升级/附魔不改变形状）

**验收标准：**
- AC1: 生成的技能 `shapeId` 与 `rarity` 正确对应
- AC2: rarity 2/3 技能形状随机分布均匀
- AC3: 初始旋转随机
- AC4: 已有技能（存档兼容）无 `shapeId` 时默认 monomino

**估点：** 2

---

### Story 40.3: 键盘多格绑定系统

**复杂度: High**
**依赖: 40.1**

改造 `state.player.bindings` 支持多格技能占据多个键位。

**范围：**
- `bindings: Map<string, string>` 语义不变：多格技能的每个占用键位都映射到同一 skillId
- 新增 `bindSkillToKeys(skillId, anchorKey, shape): boolean`
  - 计算形状覆盖的所有键位
  - 检查所有目标键位是否空闲（或全部属于同一技能——用于旋转/移动）
  - 原子性绑定：全部成功或全部不绑定
- 新增 `unbindSkill(skillId): string[]`（返回释放的键位列表）
- 新增 `getSkillKeys(skillId): string[]`（查询技能占据的所有键位）
- 新增 `getSkillAnchorKey(skillId): string`（返回第一个绑定键位，作为锚点）
- 交换逻辑：两个多格技能交换时，需先暂存再互换，避免冲突检测误判
- 冲突检测：放置形状时，被覆盖的其他技能自动解绑回库存

**验收标准：**
- AC1: 多格技能绑定后，所有占用键位查询 `bindings.get(key)` 返回同一 skillId
- AC2: 绑定失败（超出键盘边界 / 形状不适配拓扑）时不产生部分绑定
- AC3: 解绑正确释放所有占用键位
- AC4: 冲突检测正确识别并解绑被覆盖技能
- AC5: 1 格技能行为与当前完全一致
- AC6: 存档加载时，旧 bindings 数据自动识别为 monomino

**估点：** 8

---

### Story 40.4: 商店形状预览

**复杂度: Medium**
**依赖: 40.1**

商店卡片上显示技能形状的小型预览图。

**范围：**
- 在 `renderUnifiedShopCard()` 中为有词条的技能渲染形状预览
- 预览使用小型网格（最大 4×4），用填充方块表示形状的各个格子
- 颜色与稀有度边框一致（蓝/紫/橙）
- 白色技能（0 词条）不显示形状预览（保持原样）
- 形状预览位于卡片图标旁或下方
- Tooltip 中增加形状信息描述（如"占据 3 格 L 形区域"）

**验收标准：**
- AC1: 蓝/紫/橙技能卡片显示对应形状预览
- AC2: 预览形状与实际放置形状一致（含当前旋转态）
- AC3: 白色技能无形状预览，UI 不变
- AC4: 形状预览不影响卡片整体布局和可读性

**估点：** 3

---

### Story 40.5: 拖拽放置与形状预览

**复杂度: High**
**依赖: 40.3, 40.4**

改造拖拽系统支持多格形状的放置预览和碰撞检测。

**范围：**
- 拖拽多格技能时，鼠标悬停键位显示**形状轮廓**（高亮所有将被占用的键位）
  - 可放置：绿色高亮
  - 不可放置（超出边界/冲突）：红色高亮
  - 将被覆盖的已有技能：黄色闪烁
- 修改 `DragPayload` 增加 `shape` 和 `rotation` 信息
- 修改 `DropZone.accepts()` 检查形状是否可放置
- 修改 `DropZone.onDrop()` 调用 `bindSkillToKeys()`
- 拖拽幽灵元素显示形状缩略图（替代单个 icon）
- 从键盘拖出多格技能：整体解绑

**验收标准：**
- AC1: 拖拽悬停时正确高亮形状覆盖的所有键位
- AC2: 不可放置状态有明确红色视觉反馈
- AC3: 放置成功后所有键位正确绑定
- AC4: 被覆盖技能自动回收到库存
- AC5: 单格技能拖拽行为不变
- AC6: 从键盘拖走多格技能，所有占用键位正确释放

**估点：** 8

---

### Story 40.6: 右键旋转

**复杂度: Medium**
**依赖: 40.3**

已装备的多格技能可通过右键点击旋转。

**范围：**
- 右键点击已装备的多格技能键位 → 技能顺时针旋转 90°
- 旋转前检查：新形状是否在当前锚点可放置（键盘边界 + 冲突检测）
  - 可旋转：执行旋转，更新绑定
  - 不可旋转：播放失败音效 + 短暂抖动动画
- 旋转以锚点键位为圆心，不改变锚点
- 白色技能（1 格）右键无效果
- 商店中右键技能卡片：预览旋转下一个形态（不消耗操作）
- 旋转动画：格子短暂缩小 → 新位置展开（约 200ms）

**验收标准：**
- AC1: 右键点击正确旋转已装备技能
- AC2: 旋转后 bindings 正确更新（旧键位释放、新键位绑定）
- AC3: 不可旋转时有失败反馈
- AC4: 锚点键位旋转前后不变
- AC5: 1 格技能右键不触发旋转
- AC6: 商店中右键预览旋转不影响技能数据

**估点：** 5

---

### Story 40.7: 键盘可视化适配

**复杂度: High**
**依赖: 40.3**

改造 `KeyboardVisualizer` 和 `KeyVisual` 支持多格技能的视觉表示。

**范围：**
- 多格技能占据的键位之间绘制**连接线/合并边框**，视觉上形成一个整体
  - 相邻且属于同一技能的格子之间消除分隔线
  - 外围保持稀有度颜色边框
- 技能图标仅在**锚点格子**上显示（最大的那个格子），其余格子显示淡化背景色
- 词条小圆点分布在形状覆盖的各个格子上（每格 1 个圆点，对应 1 个词条）
- 按键时，整个形状区域同步高亮/动画
- 调整 `syncBindings()` 识别多格绑定并应用合并渲染

**验收标准：**
- AC1: 多格技能在键盘上显示为视觉连通的整体
- AC2: 稀有度边框包围整个形状
- AC3: 图标在锚点格子上正确显示
- AC4: 词条圆点分散在各格子上
- AC5: 按键高亮覆盖整个形状
- AC6: 1 格技能渲染不变

**估点：** 8

---

### Story 40.8: 触发系统基础适配

**复杂度: Medium**
**依赖: 40.3**

适配词条触发管线核心流程，使多格技能在战斗中正确触发。

**范围：**
- 多格技能的任意占用键位被按下时都触发同一技能（去重：同一技能每次击键只触发一次）
- `triggerKey` 使用实际按下的键位（非锚点），保持链式飞行动画准确
- 新增 `getSkillOccupiedKeys(skillId): string[]` 辅助函数供后续 Story 使用
- 新增 `getExtendedNeighbors(skillId, posRel): string[]`：以技能占据的**所有键位的邻居并集**为范围，去除自身占用键位
- Cascade 词条不变：仍然检查 `prevKey` 与 `triggerKey`（当前按下的键）的关系
- 对 `orchestrateAffixTrigger` 调用接口不变，仅 `TriggerContext` 扩展 `occupiedKeys: string[]` 字段

**验收标准：**
- AC1: 按下多格技能的任意键位都正确触发技能
- AC2: 同一击键不重复触发同一技能（快速连打多格技能的不同键位不会双重触发）
- AC3: `getExtendedNeighbors` 正确返回所有占用键位的邻居并集
- AC4: `TriggerContext.occupiedKeys` 在 1 格技能时为 `[triggerKey]`，向下兼容
- AC5: 链式触发飞行动画从实际按键位置出发
- AC6: 单元测试覆盖 2/3/4 格技能的去重与邻居计算

**估点：** 5

---

### Story 40.9: 空间类词条多格适配

**复杂度: High**
**依赖: 40.8**

改造所有依赖 `posRel` 的空间类词条，适配多格技能的扩展邻居范围。

核心变更：原先 `getKeysWithRelation(ctx.triggerKey, posRel)` 在多格技能中替换为 `getExtendedNeighbors(skillId, posRel)`。

**范围：**

**拓扑型词条（topology）：**
- **Void（虚无）**：`countEmptySlots` 改用扩展邻居集计算空位数
  - 多格技能自身占用的键位**不算空位**
  - 范围更大 → 可能有更多空位 → 间接 buff，需关注
- **Resonance（共鸣）**：Phase 6 邻居遍历改用扩展邻居集
  - 监听范围从 1 个键位的邻居 → N 个键位的邻居并集
  - 多格共鸣技能能"看到"更远的技能
- **Mirror（倒影）**：关末复制词条时的邻居扫描改用扩展邻居集
  - 可复制范围更大，候选词条更多

**触发链型词条（trigger_chain）：**
- **Link（感应）**：Phase 6 邻居匹配改用扩展邻居集
  - 多格感应技能能被更远的技能触发
  - 反向：触发技能是多格时，其 Phase 6 通知也覆盖更多邻居
- **Splash（溅射）**：Phase 5 目标选择改用扩展邻居集
  - `getKeysWithRelation(ctx.triggerKey, posRel)` → `getExtendedNeighbors(skillId, posRel)`
  - 过滤时排除自身占用的所有键位（而非仅 `triggerKey`）
- **Amplify（增幅）**：`sumNeighborAmplifyStacks` 改用扩展邻居集
  - 同资源增幅技能在更大范围内共享层数

**节奏型词条中的空间部分：**
- **Cascade（级联）**：**不变**——仍然检查 `prevKey` 与实际 `triggerKey` 的位置关系
  - 多格技能的不同键位被按下时，各自与 `prevKey` 独立检查

**Phase 6 邻居遍历核心改造：**
- `resolvePhase6` 当前遍历 `ctx.bindings` 所有键位，检查每个邻居是否与 `triggerKey` 有关系
- 改造为：对多格技能，检查邻居是否与**技能占据的任一键位**有关系
- 即 `hasRelation(triggerKey, neighborKey, posRel)` → `occupiedKeys.some(k => hasRelation(k, neighborKey, posRel))`

**验收标准：**
- AC1: Void 使用扩展邻居集计算空位，自身占用键位不算空位
- AC2: Resonance / Link 的邻居匹配范围扩展到所有占用键位
- AC3: Splash 目标选择范围扩展，且排除自身所有占用键位
- AC4: Amplify 层数共享范围扩展
- AC5: Mirror 关末复制范围扩展
- AC6: Cascade 行为不变（逐键检查 prevKey）
- AC7: Phase 6 邻居遍历正确使用 `occupiedKeys` 匹配
- AC8: 1 格技能所有词条行为与当前完全一致（`occupiedKeys = [triggerKey]`）
- AC9: 单元测试覆盖每种空间词条在 2/3/4 格技能上的范围计算

**估点：** 8

---

### Story 40.10: 附魔系统多格适配

**复杂度: Medium**
**依赖: 40.8**

改造依赖邻居关系的附魔系统，适配多格技能。

**范围：**

**学徒·观摩附魔（ApprenticeNeighbor）：**
- 当前逻辑：邻居技能触发时，检查 `hasRelation(triggerKey, neighborKey, skill.neighborPosRel)`
- 多格适配：如果拥有该附魔的技能是多格的，用其**任一占用键位**检查关系
  - 即 `occupiedKeys.some(k => hasRelation(triggerKey, k, posRel))`
  - 多格技能有更多键位，更容易被邻居触发观摩
- 反向：如果触发的技能是多格的，其 `triggerKey` 不变（仍为实际按键），不影响学徒判定

**任务·共振附魔（QuestResonance）：**
- 依赖 Phase 6 邻居遍历（已在 40.9 改造），此处仅验证
- 多格技能的 QuestResonance 能被更大范围内的邻居触发叠层

**衍生附魔（Transmute）：**
- 不涉及位置关系，**无需改造**

**乘算附魔（MultiplyOperator）：**
- 不涉及位置关系，**无需改造**

**双附魔（Twin）：**
- 不涉及位置关系，**无需改造**

**任务附魔（Quest 系列）：**
- 大部分任务附魔依赖自身事件（selfTrigger / critHit / wordComplete 等），**无需改造**
- QuestResonance 已覆盖（上述）
- QuestFission（裂变）：影响 Splash 的 `targetCount`，Splash 本身已在 40.9 适配

**商店附魔分配：**
- `filterEnchantmentCandidates` / `categorizeEnchantmentCandidates` 不涉及位置关系，**无需改造**
- ApprenticeNeighbor 的 `neighborPosRel` 随机分配逻辑不变

**验收标准：**
- AC1: ApprenticeNeighbor 在多格技能上使用扩展键位匹配
- AC2: 多格技能的 ApprenticeNeighbor 观摩范围确实更大
- AC3: QuestResonance 在多格技能上正确叠层
- AC4: 非空间附魔（Transmute / MultiplyOperator / Twin / 自触发型 Quest）行为不变
- AC5: 1 格技能所有附魔行为与当前完全一致
- AC6: 单元测试覆盖 ApprenticeNeighbor 在多格技能上的匹配场景

**估点：** 5

---

### Story 40.11: 平衡调整与集成测试

**复杂度: Medium**
**依赖: 40.2 ~ 40.10**

整体平衡调整和集成测试。

**范围：**
- 平衡考量：
  - 多格技能占用空间更大 → 可装备技能总数减少 → 现有基础值是否需要按占格数缩放补偿？
  - Void 词条受复杂影响：邻居范围扩大（可能更多空位）但自身占格也消耗空位 → 观察净效果
  - Resonance / Link / Splash 范围扩大 → 链式触发更频繁 → 观察是否需要降低触发概率或产出
  - Amplify 共享范围扩大 → 层数加成更容易叠满 → 可能需要降低 `valuePerStack`
  - ApprenticeNeighbor 更容易触发 → 成长速度加快 → 可能需要降低 `APPRENTICE_NEIGHBOR_GROWTH`
  - Mirror 复制候选更多 → 更容易复制到高价值词条 → 观察
- 自动绑定适配：`findZeroFreqKeyForBinding` 需检查形状是否可放置
- 存档迁移：旧存档技能无 `shapeId` → 加载时补充 monomino
- 教程适配：L1 商店引导在出现多格技能时追加放置提示
- 集成测试：
  - 完整购买 → 拖拽 → 旋转 → 战斗触发 → 结算流程
  - 多个多格技能密铺键盘的极端情况
  - 旋转导致挤占其他技能的连锁解绑
  - 空间词条在多格技能上的范围可视化是否与实际一致
  - 存档序列化/反序列化保持形状信息

**验收标准：**
- AC1: 自动绑定正确处理多格形状
- AC2: 旧存档加载后所有技能正常工作
- AC3: 数值平衡经 3 轮完整通关测试无明显失衡
- AC4: 空间词条范围高亮与实际触发范围一致
- AC5: 教程在多格技能场景下正确触发
- AC6: 存档保存/加载形状和旋转信息不丢失
- AC7: 无回归 bug

**估点：** 5

---

## 依赖关系图

```
40.1 形状数据模型
 ├─→ 40.2 技能生成分配形状
 ├─→ 40.3 键盘多格绑定系统
 │    ├─→ 40.5 拖拽放置
 │    ├─→ 40.6 右键旋转
 │    ├─→ 40.7 键盘可视化
 │    └─→ 40.8 触发系统基础适配
 │         ├─→ 40.9 空间类词条多格适配
 │         └─→ 40.10 附魔系统多格适配
 └─→ 40.4 商店形状预览
      └─→ 40.5 拖拽放置

40.11 平衡与集成 ←── 40.2 ~ 40.10 全部完成后
```

## 实施建议

**阶段 1（基础）：** 40.1 → 40.2 + 40.3 并行
**阶段 2（交互）：** 40.4 + 40.5 + 40.6 并行
**阶段 3（视觉）：** 40.7
**阶段 4（适配）：** 40.8 → 40.9 + 40.10 并行 → 40.11

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| QWERTY 错位行导致形状映射复杂 | 部分 tetromino 在某些位置放不下 | 生成时预检可放置性；提供旋转选项 |
| 多格技能过于挤占空间 | 玩家无法装足够多技能 | 白色 1 格技能作为填充手段；平衡 Story 调整 |
| 拖拽交互复杂度上升 | 用户体验下降 | 高亮预览 + 旋转 + 自动寻找最近可放位置 |
| 向下兼容存档数据 | 旧存档加载异常 | 默认 monomino 兜底 + 迁移逻辑 |
| 空间词条范围扩大失衡 | Resonance/Link/Splash 链式触发过频，Amplify 叠层过快 | 40.9 逐词条适配 + 40.11 专项平衡（可按占格数折算范围或降低效率） |
| ApprenticeNeighbor 成长过快 | 多格技能观摩匹配更容易 | 40.10 适配 + 可按占格数缩减 growth 系数 |
| Void 空位计算复杂化 | 自身占格 vs 范围扩大的净效果难预测 | 40.9 中明确"自身键位不算空位"规则 + 40.11 实测调参 |

## 参考

- 俄罗斯方块 Polyomino 标准形状定义
- 现有键盘拓扑系统：`src/src/data/keyboardTopology.ts`
- 拖拽系统：`src/src/systems/dragManager.ts`
- 技能生成：`src/src/data/skillGeneration.ts`
- 键盘可视化：`src/src/ui/keyboard/KeyboardVisualizer.ts`、`KeyVisual.ts`
