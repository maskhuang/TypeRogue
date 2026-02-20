# Story 9.5: 技能精简——删除冗余技能

Status: done

## Story

As a 玩家,
I want 每个技能都有独特的机制定位，而非"同机制、不同数字"的换皮,
so that 构筑选择是在不同策略方向间取舍，而非在同一方向的强弱版本间挑选。

## Acceptance Criteria

1. 删除 5 个冗余技能：`spark`、`star`、`chain`、`surge`、`clock`
2. 保留 10 个机制各异的技能：`burst`、`amp`、`freeze`、`shield`、`echo`、`ripple`、`core`、`aura`、`lone`、`void`
3. `skills.ts` 中移除被删技能的数据定义
4. `skills.ts`(`triggerSkill`) 中无被删技能残留引用
5. `SkillType` 类型定义无变化（score/multiply/time 类型仍存在，各留一个代表）
6. 商店不再出现被删技能、已绑定被删技能的存档不会崩溃
7. 修复已知数值异常：ripple 自身得分过高、aura 自身得分过高、echo 升级无效
8. 所有相关测试通过

## Tasks / Subtasks

- [x] Task 1: 从 skills.ts 删除冗余技能数据 (AC: #1, #3)
  - [x] 1.1 删除 `spark` 定义（score 低配，被 burst 替代）
  - [x] 1.2 删除 `star` 定义（score 高配，被 burst+升级 替代）
  - [x] 1.3 删除 `chain` 定义（multiply 低配，被 amp 替代）
  - [x] 1.4 删除 `surge` 定义（multiply 高配，被 amp+升级 替代）
  - [x] 1.5 删除 `clock` 定义（time 低配，被 freeze 替代）

- [x] Task 2: 清理代码中被删技能的引用 (AC: #4, #6)
  - [x] 2.1 全局搜索 `spark`/`star`/`chain`/`surge`/`clock` 字符串引用
  - [x] 2.2 `systems/skills.ts` — triggerSkill() 中确认无硬编码的技能 ID 引用（通过 SKILLS[skillId] 动态查找）
  - [x] 2.3 `systems/shop.ts` — generateShopSkills() 从 SKILLS 动态生成，删除数据即不出现
  - [x] 2.4 确认解锁系统/成就系统/图鉴不会因缺少技能数据而崩溃
  - [x] 2.5 处理存档兼容：triggerSkill/renderBattleSkills 已有 `if (!base) return` 守护

- [x] Task 3: 修复联动技能数值异常 (AC: #7)
  - [x] 3.1 `ripple`: base 50→3，自身得分与 burst(5) 相当
  - [x] 3.2 `aura`: base 50→3，自身触发 `(3/3)*mult = 1*mult`，合理的被动自触发
  - [x] 3.3 `echo`: base 0→30, grow 0→10，触发概率 Lv1=30%→Lv3=50%，升级有意义

- [x] Task 4: 调整保留技能的 base/grow 数值 (AC: #2)
  - [x] 4.1 审查 burst base=5, grow=2 — 合理，保持不变
  - [x] 4.2 审查 amp base=20 (+0.2x), grow=5 — 合理，保持不变
  - [x] 4.3 审查 freeze base=2 (+2s), grow=0.5 — 合理，保持不变
  - [x] 4.4 审查 lone(8)/void(12) — 合理，高于 burst 因有激活条件限制

- [x] Task 5: 更新测试 (AC: #8)
  - [x] 5.1 SkillTab.test.ts 使用 `Object.keys(SKILLS).length` 动态计数，自动适配
  - [x] 5.2 无被删技能专项测试，无需删除
  - [x] 5.3 SkillFeedbackManager 使用 mock 数据，不受影响
  - [x] 5.4 全部 1402 个测试通过，0 失败

## Dev Notes

### 核心设计决策：删除定位重复技能

当前 15 个技能中，有三组纯数值区分的同机制技能：

| 组 | 技能 | 机制 | 区别 | 决策 |
|---|------|------|------|------|
| score | spark(+3) / **burst(+5)** / star(+8) | 触发+分 | 仅 base 不同 | 保留 burst，用升级替代高低配 |
| multiply | chain(+0.1) / **amp(+0.2)** / surge(+0.3) | 触发+倍率 | 仅 val/100 不同 | 保留 amp，用升级替代高低配 |
| time | clock(+1s) / **freeze(+2s)** | 触发+时间 | 仅 base 不同 | 保留 freeze |

**删除 5 个** → 保留 **10 个**机制各异的技能。技能等级(grow)已提供数值成长，同机制多技能是冗余。

### 最终技能清单（10 个）

| 技能 | 类型 | category | base | grow | Lv1效果 | Lv3效果 |
|------|------|----------|------|------|---------|---------|
| burst 爆发 | score | active | 5 | 2 | +5分 | +9分 |
| amp 增幅 | multiply | active | 20 | 5 | +0.2x | +0.3x |
| freeze 冻结 | time | active | 2 | 0.5 | +2s | +3s |
| shield 护盾 | protect | active | 1 | 1 | 1盾 | 3盾 |
| echo 回响 | echo | active | 30 | 10 | 30%概率 | 50%概率 |
| ripple 涟漪 | ripple | active | 3 | 1 | +3分+1.5x | +5分+1.5x |
| core 能量核心 | core | passive | 5 | 2 | +(5+adj×2)分 | +(9+adj×2)分 |
| aura 光环 | aura | passive | 3 | 1 | 自身+1分+buff | +1.67分+buff |
| lone 孤狼 | lone | active | 8 | 3 | +8分(独) | +14分(独) |
| void 虚空 | void | active | 12 | 4 | +12分(-N) | +20分(-N) |

### 删除安全性分析

技能系统通过 `SKILLS[skillId]` 动态查找，不存在对特定技能 ID 的硬编码依赖：

- `triggerSkill()`: 通过 `base.type` switch，不检查具体 skillId
- `generateShopSkills()`: 从 `Object.keys(SKILLS)` 动态生成
- `renderBattleSkills()`: 从 `state.player.bindings` 遍历，通过 `SKILLS[skillId]` 查找
- `pickWord()`: 不依赖技能 ID

**存档兼容**: `triggerSkill()` 和 `renderBattleSkills()` 已有 `if (!base) return` / `if (!sk) return` 守护，绑定了已删技能的键位会静默跳过，不会崩溃。

### Project Structure Notes

- 技能数据: `src/src/data/skills.ts`（删除定义）
- 技能触发: `src/src/systems/skills.ts`（echo 概率改为基于 base/grow）
- 技能类型: `src/src/core/types.ts`（SkillType 不变）
- 商店系统: `src/src/systems/shop.ts`（动态生成，无需改）
- 游戏入口: `src/src/main.ts`（初始技能 spark→burst）

### References

- [Source: docs/epics.md#Epic 9, Story 9.5]
- [Source: src/src/data/skills.ts — 技能数据定义]
- [Source: src/src/systems/skills.ts#triggerSkill — 技能触发逻辑]
- [Source: src/src/systems/shop.ts#generateShopSkills — 从 SKILLS 动态生成]
- [Source: docs/stories/9-1-remove-combo-skill-type.md — 前置 Story，chain→multiply]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 从 skills.ts 删除 5 个冗余技能：spark、star、chain、surge、clock（15→10 个技能）
- main.ts 初始技能从 spark 改为 burst
- ripple base 50→3：自身得分从 50*mult 降至 3*mult，合理化
- aura base 50→3：自身触发得分从 16.7*mult 降至 1*mult
- echo base 0→30, grow 0→10：触发概率 Lv1=30%，Lv2=40%，Lv3=50%，升级有意义
- echo 被动触发逻辑改为基于 skill data 的 base/grow 计算概率，不再硬编码 0.3
- triggerSkill/renderBattleSkills 已有空值守护，存档兼容无风险
- 全部 1402 个测试通过，无回归

#### Code Review 修复

- [M1] echo desc 修正：从 "触发相邻技能（概率30%起，升级提高）" → "主动：触发所有相邻技能；被动：30%概率被相邻触发，升级提高"
- [M2] echo 主动触发不受等级影响：确认为设计意图，desc 已明确区分主动/被动行为
- [M3] aura desc 修正：从 "相邻主动技能效果+50%" → "相邻分数技能效果+50%"（与实际 buff 范围一致）
- [L1] 移除 triggerSkill() 中未使用的 `emptyCount` 变量
- [L2] File List 补充 sprint-status.yaml

### File List

- `src/src/data/skills.ts` — 删除 spark/star/chain/surge/clock 定义，修改 ripple/aura/echo base/grow，修正 echo/aura desc
- `src/src/systems/skills.ts` — echo 被动触发概率改为基于 skill data (base + grow*(lvl-1))/100，移除死变量 emptyCount
- `src/src/main.ts` — 初始技能 spark→burst
- `docs/stories/sprint-status.yaml` — 9-4→done(skipped), 9-5→review→done
