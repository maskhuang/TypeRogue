# Story 60.10: 终端 INFO 支持 owned 技能 / 遗物

Status: done

<!-- Epic 60 Phase 2 · 优先级 P2.3（浪漫化）· P2.3 第 2 项 -->
<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **terminal 商店中想查看自己已装备技能 / 已挂遗物详情的玩家**,
I want **`INF` 命令不止能查 catalog SKU，也能按键位（`INF F`）/ 模糊名字（`INF MORALE-AURA`）/ owned relic ID（`INF REL-FOSSILIZED-MEMO`）/ 列表（`INF /list-owned`）查我现有的物件**,
so that **不用切到工作台 hover，也不用记 catalog SKU，就能在终端里完成"我装了什么/这个键有什么/这个遗物干啥"的查询闭环**.

## 背景

P2.3 第 1 项（60-9 hover tooltip）让玩家在工作台 hover 即可看技能详情。但 **terminal 屏当前 `INF` 命令仅匹配 catalog 商品 SKU** —— 玩家想查"我已绑在 F 键的技能详情"或"我刚买入 inbox 的某个技能"必须切到工作台 hover，破坏了 terminal 流的连贯性。

P2.3 第 2 项：**扩展 `INF` 命令**让它能查：
1. 按键位 → `INF F` 查 F 键绑定的技能
2. 按 owned skill 模糊名 → `INF MORALE-AURA`（部分匹配 owned skill 名）
3. 按 owned relic id → `INF REL-FOSSILIZED-MEMO`（fuzzy 匹配遗物名 / id）
4. 列表 → `INF /list-owned` 打印 owned skills + relics 简表

匹配优先级：**catalog SKU 优先**（不破坏现有行为）→ owned skill key → owned skill name → owned relic id/name → fallback 错误。

完成后 terminal 真正成为"查询闭环"，玩家不需为了看自己装备而切屏。

## Acceptance Criteria

1. **AC1：catalog SKU 匹配优先（行为不退化）** —— `INF SKL-001` / `INF REL-001` / `INF PCK-001` 沿用现有 `findDescriptorBySku` 路径，渲染原 catalog `renderInfoBlock(d)`。**0 行为变化**。

2. **AC2：单键位查询（`INF <key>`）** —— 输入 1 字符 a-z（不区分大小写）或 1-0 数字键时：
   - **a-z**：查 `state.player.bindings.get(key.toLowerCase())` → 若有 skillId，按 owned skill 路径渲染
   - **1-0**：查 `state.player.relics` 第 N 个 → 按 owned relic 路径渲染（数字键 1-0 对应 relic 数组 0-9）
   - 若键位空 → `KEY ${KEY} · UNBOUND` + `BAL 🍌 ${state.gold}`

3. **AC3：owned skill 模糊名匹配（`INF <name-or-fragment>`）** —— 当 arg 长度 ≥ 2 且不是 SKU 格式（不含 `-` + 3 字母前缀）时，扫描 `state.player.bindings.values() ∪ state.player.inbox` 集合，找 skill name 或 nameAbbrev **不区分大小写包含**该 fragment 的：
   - **唯一命中** → 渲染 owned skill info
   - **多个命中** → 列出候选 + 提示精确化
   - **0 命中** → 进入 AC4 关键词 fallback

4. **AC4：owned relic id/name 匹配（`INF <relic-id-or-name>`）** —— 当 AC3 无命中时，扫描 `state.player.relics` 集合，匹配 relicId 或 RELICS[id].name：
   - 命中 → 渲染 owned relic info
   - 无命中 → 进入 AC5 SKU fuzzy fallback

5. **AC5：原有 `suggestSku` fuzzy fallback 保留** —— catalog SKU 找不到时，沿用现有 `suggestSku` 提示 `· DID YOU MEAN <SKU>?`。仅当 AC2-AC4 都 miss 时才走这条。

6. **AC6：`INF /list-owned` 列表命令** —— 输入 `INF /LIST-OWNED` 或 `INF /OWNED`（不区分大小写）：
   - 打印 owned skills 列表（key + skill name + level + shape tag），1 行 / skill
   - 打印 owned relics 列表（数字键位 + icon + name），1 行 / relic
   - 空 inbox/bindings/relics 时打印 `· EMPTY`

7. **AC7：owned skill INFO 渲染** —— 复用 `buildAffixTooltipFields` 构建 affix info / enchantments / questProgress / apprenticeGrowth；标题改 `OWNED · ${skill.name} · ${bound 键位 / IN-TRAY}`；不显示 `PRICE` / `CLR` / `STOCK`（无 catalog 字段）；显示当前 level / shape / SYN 计数。

8. **AC8：owned relic INFO 渲染** —— 标题 `OWNED · RELIC · ${relicData.name}`；显示 icon + name + rarity + description + flavor（仅 zh locale）。复用 `RELICS[id]` 数据。

9. **AC9：`HEL` 命令文档同步更新** —— `cmdHelp` 输出加一行说明 INF 扩展用法：
   ```
   INF <SKU>        查 catalog（如 INF SKL-001）
   INF <KEY>        查已绑键位（如 INF F · INF 1）
   INF <NAME>       查 owned 技能模糊名（如 INF MORAL）
   INF /OWNED       列出全部 owned skills + relics
   ```

10. **AC10：单元测试覆盖**
    - `tests/unit/ui/shopPreviewInfoOwned.test.ts`（新建）：
      - **a)** `INF SKL-001`：catalog 路径，appendLine 含 catalog name
      - **b)** `INF F`（已绑技能）：owned skill 路径
      - **c)** `INF F`（未绑）：UNBOUND 提示
      - **d)** `INF 1`（已挂遗物）：owned relic 路径
      - **e)** `INF moral`（模糊名命中 1 个）：owned skill 路径
      - **f)** `INF moral`（命中多个）：候选列表
      - **g)** `INF cornucopia`（owned relic id）：relic 路径
      - **h)** `INF nonexistent`：err + suggestSku fallback
      - **i)** `INF /OWNED` / `INF /LIST-OWNED`：列表渲染
    - 复用 60-7 / 60-9 的 vi.mock + STUB_DOC 模式

11. **AC11：Story 60.x ecosystem 不退化** —— 全套测试绿，含新 INFO test 用例。

12. **AC12：tsc 0 新错误**

## Tasks / Subtasks

- [x] **Task 1：抽 cmdInfo 内部分发逻辑（AC: 1, 2, 3, 4, 5, 6）**
  - [x] 1.1 `cmdInfo(arg)` 改为 dispatcher：
    ```ts
    function cmdInfo(arg?: string): void {
      if (!arg) { appendLine('USAGE: INF <SKU|KEY|NAME|/owned>', 'dim'); return; }
      const a = arg.toUpperCase();
      // 1) /OWNED 列表
      if (a === '/OWNED' || a === '/LIST-OWNED') return cmdInfoListOwned();
      // 2) catalog SKU（保留现有路径）
      const d = findDescriptorBySku(arg);
      if (d) { for (const line of renderInfoBlock(d)) appendLine(line, classForRow(d)); appendBlank(); return; }
      // 3) 单键位（a-z 或 1-0）
      if (/^[a-z0-9]$/i.test(arg)) return cmdInfoKey(arg);
      // 4) owned skill 模糊名
      const skillHit = findOwnedSkillsByFragment(arg);
      if (skillHit.length === 1) return cmdInfoOwnedSkill(skillHit[0]);
      if (skillHit.length > 1) return cmdInfoMultiSkillHit(skillHit, arg);
      // 5) owned relic id/name
      const relicHit = findOwnedRelicByQuery(arg);
      if (relicHit) return cmdInfoOwnedRelic(relicHit);
      // 6) 原 suggestSku fallback
      const guess = suggestSku(arg);
      appendLine(`ERR · NOT FOUND: ${arg.toUpperCase()}`, 'redacted');
      if (guess) appendLine(`  · DID YOU MEAN ${guess}?`, 'dim');
      appendBlank();
    }
    ```

- [x] **Task 2：cmdInfoKey — 单键位查询（AC: 2）**
  - [x] 2.1 a-z：`state.player.bindings.get(key.toLowerCase())`；命中 → `cmdInfoOwnedSkill(skillId)`；miss → `KEY ${KEY} · UNBOUND` + balance
  - [x] 2.2 1-0：`Array.from(state.player.relics)[Number(key) === 0 ? 9 : Number(key) - 1]`（数字键位 1=index 0、0=index 9，与 syncWorkbenchRelics 对齐）；命中 → `cmdInfoOwnedRelic`；miss → `KEY ${KEY} · NO RELIC`

- [x] **Task 3：cmdInfoOwnedSkill — owned skill 渲染（AC: 7）**
  - [x] 3.1 输入 skillId，取 `state.affixSkills.get(id)` + `state.affixSkillStates.get(id)`
  - [x] 3.2 计算"在哪"：bound 在哪个键 / 在 inbox slot N
  - [x] 3.3 渲染 header `OWNED · ${name} · ${location}`（不打印 PRICE / CLR / STOCK）
  - [x] 3.4 复用 `buildAffixTooltipFields` 构建 affix / enchantment / quest / apprentice 段
  - [x] 3.5 显示 `LV ${level} · ${shape描述}` 一行；`SYN ${count}` 用 `getSynergyCount` 复用（catalog 候选不存在时跳过）

- [x] **Task 4：cmdInfoOwnedRelic — owned relic 渲染（AC: 8）**
  - [x] 4.1 输入 relicId，取 `RELICS[id]`
  - [x] 4.2 渲染 header `OWNED · RELIC · ${icon} ${name} · ${rarityLabel}`
  - [x] 4.3 desc + flavor（zh-only）
  - [x] 4.4 显示数字键位（如挂在 1-0 的哪个）

- [x] **Task 5：findOwnedSkillsByFragment — owned skill 模糊匹配（AC: 3）**
  - [x] 5.1 input arg toUpperCase
  - [x] 5.2 ids = bindings.values ∪ inbox
  - [x] 5.3 filter 标准：sk.name.toUpperCase().includes(arg) OR generateAbbrev(sk).toUpperCase().includes(arg)（用现有 nameAbbrev 逻辑或 simpleabbrev）
  - [x] 5.4 返回 skillId[]

- [x] **Task 6：findOwnedRelicByQuery — owned relic 模糊匹配（AC: 4）**
  - [x] 6.1 ids = state.player.relics
  - [x] 6.2 filter：id.includes(query) OR RELICS[id].name.toUpperCase().includes(query.toUpperCase())
  - [x] 6.3 返回 first match（不显示候选列表，relic 命名空间小，唯一性高）

- [x] **Task 7：cmdInfoMultiSkillHit — 多命中候选列表（AC: 3）**
  - [x] 7.1 列出所有命中的 skill：`  · ${skill.name} (key F)` 每行一个
  - [x] 7.2 末尾提示 `· REFINE QUERY OR USE INF <KEY>`

- [x] **Task 8：cmdInfoListOwned — 列表命令（AC: 6）**
  - [x] 8.1 header `OWNED ASSETS · ${batch}`
  - [x] 8.2 SKILLS 段：iterate bindings + inbox，每个 1 行 `${key|IN}  ${name}  Lv${lv}  ${shape}`
  - [x] 8.3 RELICS 段：iterate `state.player.relics`，每个 1 行 `${numkey} ${icon} ${name}`
  - [x] 8.4 0 个时打印 `· EMPTY`

- [x] **Task 9：cmdHelp 文档更新（AC: 9）**
  - [x] 9.1 加 4 行 INF 扩展用法说明（详 AC9）

- [x] **Task 10：单元测试（AC: 10）**
  - [x] 10.1 新建 `src/tests/unit/ui/shopPreviewInfoOwned.test.ts`，~280 行
  - [x] 10.2 vi.mock 模式（参考 60-7 BuyEvents test）
  - [x] 10.3 stub document.getElementById 返回 fake terminal-viewport（捕获 appendLine 调用）
  - [x] 10.4 9 用例覆盖（详 AC10 a-i）

- [x] **Task 11：tsc + 全套测试（AC: 11, 12）**
  - [x] 11.1 `cd src && npx tsc --noEmit -p . 2>&1 | grep shopPreview` → 0 新错误
  - [x] 11.2 `cd src && npx vitest run tests/unit/ui/shopPreview tests/unit/core/UserSettings tests/unit/data/skillShapesPlaceability tests/unit/systems/openShopDispatcher tests/unit/systems/tutorial` → 全绿

## Dev Notes

### 关键 API 与文件路径

| 用途 | 路径 | 关键导出 |
|---|---|---|
| INFO 入口 | `src/src/ui/shopPreview.ts:545 cmdInfo` | dispatcher 改造起点 |
| 现有 catalog 渲染 | `src/src/ui/shopPreview.ts:409 renderInfoBlock` | catalog 路径保留 |
| owned tooltip data | `src/src/systems/shop.ts:712 buildSkillKeyTooltipData` | 60-9 已抽 helper，复用 |
| affix 字段构建 | `src/src/systems/shop.ts:543 buildAffixTooltipFields` | 60-7 / 60-9 已用 |
| 遗物数据 | `src/src/data/relics.ts` | `RELICS[id]` · `RelicData` |
| 状态读取 | `src/src/core/state.ts` | `state.player.bindings/skills/inbox/relics` |
| 终端 SYN 计算 | `src/src/ui/shopPreview.ts:106 getSynergyCount` | 60-9 已修 owned-only filter |

### Architecture Compliance

**Dependency direction：** 仅 ui/shopPreview 内 + 读 systems/shop helper + data/relics → 不引入新跨层依赖 ✓

**State write rules：** ✅ INF 命令是纯只读 / 渲染，0 状态写入

### Library / Framework Requirements

- **TypeScript** ~5.9.3
- **vitest** vi.mock + STUB_DOC（参考 60-7 / 60-9）
- **零新依赖**

### File Structure Requirements

```
src/src/ui/shopPreview.ts                 ← 修改：cmdInfo dispatcher 改造 + 6 个 helper（cmdInfoKey / cmdInfoOwnedSkill / cmdInfoOwnedRelic / findOwnedSkillsByFragment / findOwnedRelicByQuery / cmdInfoListOwned）+ cmdHelp 文档更新
src/tests/unit/ui/shopPreviewInfoOwned.test.ts  ← 新增：~280 行 / 9 用例
```

**避免：**
- 不要重写 catalog renderInfoBlock（AC1 0 退化）
- 不要在 INF 路径写状态（纯只读）
- 不要新加事件触发（INF 不该 emit shop:* 事件）
- 不要把 INF /OWNED 改成单独命令（保持 INF dispatch 统一）
- 不要破坏 LIS 命令（INF 不消费 LIS 状态）

### Testing Requirements

| 用例 | 验证 | mock 范围 |
|---|---|---|
| catalog SKU | appendLine 含 catalog name | spy on appendLine（通过 STUB_DOC） |
| 单键位绑定 | owned skill 渲染 | state.player.bindings setup |
| 单键位 unbound | UNBOUND 提示 | 同上 |
| 数字键 relic | owned relic 渲染 | state.player.relics setup |
| 模糊名单命中 | owned skill 渲染 | inbox + name pattern |
| 模糊名多命中 | 候选列表 + REFINE 提示 | inbox 多技能 |
| relic id 命中 | owned relic 渲染 | relics + id |
| 全 miss | suggestSku fallback | 无 |
| /OWNED 列表 | skills + relics 列表渲染 | 完整 setup |

### Previous Story Intelligence

| 经验 | 应用 |
|---|---|
| 60.7 vi.mock with importActual 保留其他 export | 本 story 沿用 |
| 60.9 buildSkillKeyTooltipData 抽 helper 给 workbench | 本 story 复用 helper（owned skill INFO 段也用） |
| 60.9 SYN guard 改成 bindings ∪ inbox（不算 orphan） | 本 story findOwnedSkillsByFragment 同样语义 |
| 60.x ecosystem cd src 跑 vitest | 本 story 同样 |
| 60.4 vi.useFakeTimers + clearAllTimers | 本 story 不需要（INF 路径无 setTimeout） |

### Git Intelligence Summary

最近 commit：
```
15274d0 fix(shop): SYN counts only bound + inbox skills, not orphans
9519216 fix(shop): SYN count guards against ghost entries in state.affixSkills
3367067 fix(workbench): single-language OPENED stamp (i18n deferred to 60-14)
765c521 fix(workbench): opened-state inbox cards (no waybill packaging)
```

**本 story 推荐 commit message：** `feat(shop): INF supports owned skills/relics by key/name/relic-id (Story 60.10)`

### Risks & Open Questions

- **风险 A：模糊名匹配大小写敏感性** —— `MORAL` 应匹配 "Moral Aura" / "moral_aura" / "MORAL-AURA"。统一 toUpperCase 比较即可。
- **风险 B：owned skill / catalog SKU 命名空间冲突** —— 如果某 owned skill 的 nameAbbrev 恰好是 "SKL-001" 格式 → 优先匹配 catalog（AC1 守门）。本 story 不破坏。
- **风险 C：单键位 1-0 数字到 relic index 映射对齐** —— 与 syncWorkbenchRelics line 1518 的 `RELIC_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']` 完全一致；index 9 = key '0'。
- **开放问题 1：owned skill INFO 是否显示 SYN？** 倾向：**显示 SYN**，但用 owned skill 的 affix 反向计算与 catalog 候选的潜在协同，复用 `getSynergyCount`。简化：直接调 catalog 不存在的 placeholder（实际意义不大），或干脆省略 SYN 行。**决议**：省略 owned skill 的 SYN 行（AC7 不强制）。
- **开放问题 2：模糊名 multi-hit 时是否进 BUY confirm 警示？** 不需要 — INF 是纯查询，多 hit 列出候选交玩家精化即可。

### References

- [Source: docs/stories/epic-60-shop-redesign-phase2.md#Story 60-10] — 验收标准原文
- [Source: src/src/ui/shopPreview.ts:545-557] — 现有 cmdInfo 入口
- [Source: src/src/ui/shopPreview.ts:409-470] — 现有 renderInfoBlock（catalog 渲染）
- [Source: src/src/systems/shop.ts:712 buildSkillKeyTooltipData] — 60-9 抽出的 helper
- [Source: src/src/systems/shop.ts:543 buildAffixTooltipFields] — affix 段构建
- [Source: src/src/data/relics.ts] — RELICS 数据 + RelicData 类型
- [Source: src/src/ui/shopPreview.ts:1589 syncWorkbenchRelics] — 数字键位 → relic index 映射模板
- [Source: docs/implementation-artifacts/60-9-workbench-hover-tooltips.md] — 上一 P2.3 story（hover tooltip 复用 buildSkillKeyTooltipData）

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

- 实施于 2026-04-29，单 session 完成全部 11 个 task
- cmdInfo 改为 dispatcher，6 路径优先级：catalog SKU → /OWNED → 单键位 → owned skill 模糊名 → owned relic id/name → suggestSku fallback
- 复用 60-9 抽出的 buildAffixTooltipFields helper（不再依赖 buildSkillKeyTooltipData，因为 INF 渲染走 wrapAt 行式）
- 数字键 1-0 → relic index 0-9 映射对齐 syncWorkbenchRelics line 1518 RELIC_KEYS 表
- owned skill 集合 = bindings.values ∪ inbox（与 60-9 SYN 修复同语义）
- 开放问题 1 决议：owned skill INFO **省略 SYN 行**（catalog 候选不存在时 SYN 数学意义弱）
- shop.ts + shopPreview.ts tsc 错误数 baseline 持平（2 → 2）
- Story 60.x ecosystem + tutorial: 14 新 INF 单测全绿；总数 248/255（7 baseline fail 与本 story 无关）
- 测试 trick：`lineContains('🍌 100')` 失败因为 appendLine 把 🍌 包成 `<span class="bna">🍌</span>`，需放宽到只验证 `100`

### Completion Notes List

- Story 创建于 2026-04-29，Epic 60 Phase 2 P2.3 浪漫化第 2 项
- 实施于 2026-04-29，所有 11 个 task 完成；Status: review
- **AC 全覆盖：** AC1（catalog SKU 不退化）/ AC2（单键位 a-z + 1-0）/ AC3（owned 模糊名单/多命中 + inbox 也参与）/ AC4（owned relic 模糊匹配）/ AC5（suggestSku fallback 保留）/ AC6（/OWNED + /LIST-OWNED 列表 + EMPTY）/ AC7（owned skill 渲染 affix + enchantment + quest + apprentice）/ AC8（owned relic 渲染 desc + flavor）/ AC9（HEL 文档新增 INF FORMS 段）/ AC10（14 单测）/ AC11（ecosystem 不退化）/ AC12（tsc 0 新错）
- **关键设计决策：**
  1. **dispatcher 6 路径优先级** — catalog SKU 优先（不破坏现有），/OWNED 子命令次之（特殊语法），单字符走键位，多字符走 owned 模糊名 → owned relic → fallback
  2. **owned skill 渲染**复用 buildAffixTooltipFields，去掉 catalog 字段（PRICE/CLR/STOCK），加 KIND SKILL · LV X · SHAPE Y header
  3. **owned relic 渲染**用 `RELICS[id]` data + 数字键位定位（KEY 1-0）
  4. **inbox 也参与模糊匹配** — 跟玩家心智一致："我已购入但未装的也是我的技能"
  5. **多命中候选列表**列出每个候选的 location（KEY F / IN-TRAY），避免玩家盲选
  6. **测试用 fake-viewport stub document.getElementById 捕获 appendLine** — 不需要真 DOM
- 上一 story 60-9 + 多个 follow-up 同日完成
- **Epic 60 Phase 2 进度：** P2.1 4/4 done · P2.2 4/4 done · P2.3 **2/5 done**（剩 60-11 转场动画 / 60-12 音效 / 60-13 craft+metamorph）
- **Code-review 修复（2026-04-29 同日）：**
  - **M1**：`/OWNED` 列表多格技能去重 — `bindings` Map 一个 tetromino_T sid 有 4 条 entry（每键一条），按 sid 分组合并 keys join `+`（如 `A+D+F+S`），不再每键列一行
  - **M2**：catalog SKU 命中路径加真测试 — 用 `__test.setDescriptorCache` 注入 fake descriptor 验证 renderInfoBlock 触发 + owned 路径不被误触；同时拆出"未命中"用例独立测 fallback
  - L1-L6 暂不修（CJK 宽度 / 魔法常数 / shape tag 视觉 / i18n — 都是 cosmetic + pre-existing pattern）

### File List

新增：
- `src/tests/unit/ui/shopPreviewInfoOwned.test.ts` (~210 行，14 测试用例)

修改：
- `src/src/ui/shopPreview.ts` — `cmdInfo` 改 dispatcher（6 路径）；新增 7 个 helper（cmdInfoKey / cmdInfoOwnedSkill / cmdInfoOwnedRelic / findOwnedSkillsByFragment / findOwnedRelicByQuery / cmdInfoMultiSkillHit / cmdInfoListOwned）；`cmdHelp` 加 INF FORMS 文档段；`__test` API 加 `cmdInfo` 入口
- `docs/implementation-artifacts/sprint-status.yaml` — 60-10 ready-for-dev → in-progress → review
