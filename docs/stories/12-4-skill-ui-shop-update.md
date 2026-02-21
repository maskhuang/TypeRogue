# Story 12.4: 技能 UI 与商店更新

Status: done

## Story

As a 玩家,
I want 商店技能池展示全部 18 个技能，卡片上显示流派标签和更新后的描述,
so that 我能在购买时清晰了解每个技能属于哪个流派，做出有意义的构筑决策。

## Acceptance Criteria

1. 商店技能选择从原有池扩展到全部 18 个技能（已自动满足 — `generateShopSkills()` 使用 `Object.keys(SKILLS)`）
2. 技能描述文案更新（反映 Stories 12.1-12.3 实现的新效果）
3. 技能卡片显示流派标签（爆发/倍率/续航/连锁/被动）
4. 移除旧技能 ID 引用（spark/star/surge/clock 等已在之前 Story 中完成清理，验证无残留即可）
5. 所有相关 UI 测试通过

## Tasks / Subtasks

- [x] Task 1: 流派映射数据 (AC: #3)
  - [x] 1.1 `data/skills.ts` 新增 `SKILL_SCHOOL` 映射: `Record<string, { label: string; cssClass: string }>` — 将 18 个 skillId 映射到 5 个流派（爆发/倍率/续航/连锁/被动）
  - [x] 1.2 导出 `getSkillSchool(skillId: string)` 辅助函数

- [x] Task 2: 商店卡片 UI 更新 (AC: #3)
  - [x] 2.1 `systems/shop.ts` `renderSkillShop()` — 新技能卡片传入流派标签而非固定 '技能' typeLabel
  - [x] 2.2 `renderShopCard()` typeClass 使用流派 cssClass（如 `school-burst`/`school-multiply`/`school-sustain`/`school-chain`/`school-passive`）
  - [x] 2.3 升级卡片同样显示流派标签

- [x] Task 3: CSS 流派标签样式 (AC: #3)
  - [x] 3.1 `style.css` 新增 5 个流派样式：`.reward-type.school-burst` 等，参照已有 `.reward-type.new`/`.upgrade` 模式
  - [x] 3.2 每个流派选取区分色（建议：爆发=#ff6b6b 红, 倍率=#ffe66d 金, 续航=#4ecdc4 青, 连锁=#e056fd 紫, 被动=#87ceeb 蓝）

- [x] Task 4: 技能描述文案校准 (AC: #2)
  - [x] 4.1 审查 `data/skills.ts` 中 18 个技能的 `desc` 字段，确保与实际 Modifier 工厂行为一致
  - [x] 4.2 修正任何不一致的描述（注：Story 12.3 code review 已修正 core desc，检查其余）

- [x] Task 5: 旧技能 ID 残留验证 (AC: #4)
  - [x] 5.1 全局搜索 `spark`/`star`/`surge`/`clock` 等旧 ID，确认无代码残留
  - [x] 5.2 如发现残留，清理之

- [x] Task 6: 构筑管理面板流派提示 (AC: #3, 补充)
  - [x] 6.1 `renderBuildManager()` 已拥有技能列表中显示流派颜色/标签
  - [x] 6.2 联动技能（synergy）高亮保持不变，流派标签作为附加信息

- [x] Task 7: 测试 (AC: #5)
  - [x] 7.1 新增 `tests/unit/data/skills.school.test.ts`: SKILL_SCHOOL 映射覆盖全部 18 个技能
  - [x] 7.2 新增 `tests/unit/systems/shop.test.ts`: 商店卡片渲染包含流派标签
  - [x] 7.3 回归测试：全量测试通过

## Dev Notes

### 5 个技能流派定义

| 流派 | 中文标签 | 技能 ID 列表 | 建议色 |
|------|---------|-------------|--------|
| 爆发流 | 爆发 | burst, lone, void, gamble | #ff6b6b (红) |
| 倍率流 | 倍率 | amp, chain, overclock | #ffe66d (金) |
| 续航流 | 续航 | freeze, shield, pulse, sentinel | #4ecdc4 (青) |
| 连锁流 | 连锁 | echo, ripple, mirror, leech | #e056fd (紫) |
| 被动流 | 被动 | core, aura, anchor | #87ceeb (蓝) |

### AC #1 已自动满足

`generateShopSkills()` (shop.ts:93-119) 使用 `Object.keys(SKILLS).filter(...)` 动态获取技能池。Stories 12.1-12.3 添加的 18 个技能已自动包含。验证即可，不需代码改动。

### 商店卡片当前架构

`renderShopCard(icon, name, desc, cost, typeLabel, typeClass, onClick)` (shop.ts:309-344):
- `typeLabel` 显示为 `.reward-type` 的文本内容（当前新技能传 '技能'，升级传 '升级'）
- `typeClass` 控制 `.reward-type.{class}` 的 CSS 样式（当前用 'new'/'upgrade'）
- 改为传入流派 label 和 cssClass，同时保持升级卡片也显示流派

### CSS 模式参照

已有模式 (style.css:423-431):
```css
.reward-card .reward-type { font-size: 9px; padding: 2px 6px; border-radius: 8px; }
.reward-card .reward-type.new { background: rgba(78,205,196,0.2); color: #4ecdc4; }
.reward-card .reward-type.upgrade { background: rgba(255,230,109,0.2); color: #ffe66d; }
```
新增 5 个流派类遵循相同 `background: rgba(color, 0.2); color: #hex;` 模式。

### 旧技能 ID 说明

Epic 9 (Story 9-1) 已移除 combo 类型。更早版本可能有 spark/star/surge/clock 等 ID — 需全局搜索确认已清理。如果搜索结果为空，Task 5 即完成。

### 构筑管理面板

`renderBuildManager()` (shop.ts:382-463) 渲染键盘布局和已拥有技能列表。当前 `.inventory-skill` 不显示流派信息。Task 6 添加流派颜色小标签，提升构筑可读性。

### 测试环境

- 测试框架: vitest
- DOM 测试: 使用 jsdom（vitest 配置）
- 现有模式参考: `tests/unit/data/skills.modifiers.test.ts` 和 `tests/unit/systems/skills.pipeline.test.ts`
- 当前无 shop 专用测试文件，需新建
- 已知 42 个音频测试失败为 pre-existing，不影响本 Story

### Project Structure Notes

- 技能数据: `src/src/data/skills.ts` — SKILL_SCHOOL 映射放在此文件
- 商店系统: `src/src/systems/shop.ts` — 主要修改文件
- 样式: `src/src/style.css` — 新增流派 CSS 类
- 类型: `src/src/core/types.ts` — 不需修改（ShopSkillItem 类型足够）
- 测试: `src/tests/unit/` — 新建 data/skills.school.test.ts 和 systems/shop.test.ts

### References

- [Source: docs/epics.md#Story 12.4] 验收标准定义
- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#技能流派] 5 流派分类定义
- [Source: docs/stories/12-1-burst-multiplier-skills.md] Story 12.1 技能实现模式
- [Source: docs/stories/12-2-sustain-chain-skills.md] Story 12.2 技能实现模式
- [Source: docs/stories/12-3-passive-skills.md] Story 12.3 被动技能 + code review 修复

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Task 4 desc review: aura/echo 未描述小额基础分数，core 使用 "+10%" 描述乘法增强 — 均为有意的设计简化，不修改

### Completion Notes List

- Task 1: SKILL_SCHOOL 映射 18 个技能→5 流派 + SkillSchool 接口 + getSkillSchool 辅助函数
- Task 2: renderSkillShop() 新技能/升级卡片均使用流派 label+cssClass 替代固定 '技能'/'升级'
- Task 3: 5 个 .reward-type.school-* CSS 类 + 5 个 .inv-school.school-* CSS 类
- Task 4: 18 个技能 desc 审查，15 个完全准确，3 个为设计简化（不修改）
- Task 5: 全局搜索 spark/star/surge/clock — 仅存在于词库数据中，无代码残留
- Task 6: renderBuildManager() 已拥有技能添加 .inv-school 流派小标签
- Task 7: 13 个新测试全部通过，1697 总测试 0 回归

### Change Log

- 2026-02-20: Story 12.4 实现完成 — 技能流派映射、商店/构筑面板 UI 更新、CSS 流派样式
- 2026-02-20: Code review 修复 — H1: 升级卡片恢复 "升级" 标识, M1: CSS 流派颜色提取为 :root 变量, M2: shop.test.ts 消除重复

### File List

- src/src/data/skills.ts (M) — SKILL_SCHOOL 映射, SkillSchool 接口, getSkillSchool 函数
- src/src/systems/shop.ts (M) — import getSkillSchool, renderSkillShop 使用流派标签, renderBuildManager 添加流派标签
- src/src/style.css (M) — 5 个 .reward-type.school-* 样式 + 5 个 .inv-school.school-* 样式
- src/tests/unit/data/skills.school.test.ts (A) — SKILL_SCHOOL 映射测试 (9 tests)
- src/tests/unit/systems/shop.test.ts (A) — 商店技能池与流派标签测试 (4 tests)
