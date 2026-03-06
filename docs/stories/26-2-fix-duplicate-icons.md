# Story 26.2: 修复现有重复图标

Status: done

## Story

As a 开发者,
I want 修复所有跨类型的重复图标,
so that 每个原子图标在整个项目中唯一标识一个数据条目.

## Acceptance Criteria

1. **AC1 — bossModifiers.ts 修复 3 处**
   - boss_double_target: 🎯→⏫
   - boss_diminish: 📉→⬇️
   - boss_masked: 🕳️→🫥

2. **AC2 — amplifiers.ts 修复 1 处**
   - amp_time_add_adjacent: 🌊→💧

3. **AC3 — relics.ts 修复 5 处**
   - lucky_coin: 🪙→🍀
   - time_crystal: 💎→🔷（计划为🔮但被 conv_score_time_mul 占用）
   - overkill_blade: ⚔️→🔪（计划为🗡️但被 conv_time_base_mul 占用）
   - rhyme_master: 🎵→🎶
   - time_lord: ⏳→🕰️

4. **AC4 — converters.ts 修复 4 处**
   - conv_score_shield_mul: 💎→💠
   - conv_base_shield_mul: 🏰→🪨
   - conv_time_shield_add: ❄️→🧊
   - conv_gold_mult_add: 🤝→🫱

5. **AC5 — enchantments.ts 修复 1 处**
   - ench_mastery: 📈→🏆

6. **AC6 — 验证**
   - findDuplicateIcons() 返回 0 重复
   - 所有数据测试通过

## Technical Notes

- 修改: 5 个数据文件
- 🔥 prod_boost + RESOURCE 共用不算重复（restEvents 使用🔥排除在注册表外）
