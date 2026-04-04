# Story 53.3: 造词台 i18n

Status: done

## Tasks

- [x] Task 1: demo-i18n.ts 添加 craft.* 中英文 keys（~24 条）
- [x] Task 2: CraftingStation.ts 所有 textContent/showFeedback 改为 t() 调用
- [x] Task 3: skills.ts 的完成反馈也走 i18n

## Dev Agent Record

### File List

- `src/src/demo/demo-i18n.ts` — 添加 24 条 craft.* i18n keys（中英文）
- `src/src/systems/classes/CraftingStation.ts` — 所有硬编码中文替换为 t() 调用
- `src/src/systems/skills.ts` — 组装完成反馈改用 t('craft.completed')
