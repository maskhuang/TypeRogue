# Narrative Iron-Rule Audit · 2026-05-04

**用途**：作为 narrative-writer pipeline v4.1 sync (§8.8) 与 PL-2/3 mechanic 重做的违规文案 input 清单。

**Source of truth**：
- §8.10.1 / §8.10.2 设计纪律（绝对禁止 / 必须做到）
- §9.8.3 PL-2/3 共同约束（power fantasy popup / 解锁庆祝禁止）
- §9.8.1 / §9.8.2 PL-2/3 各自约束
- D14 v2 + D26 v2 + D30（公司 = defensive curator，**不是** anomaly vector / 加工厂；**不分发**新机制）
- §2.18 反身闭合铁律：Ch.2 / Ch.3 / Ch.5 endless 入口升职通知**完全相同 template**

**Audit scope**：`src/src/demo/demo-i18n.ts`（中英 ~3000 keys）+ `src/src/ui/`、`src/src/scenes/`、`src/src/systems/` 中所有面向玩家的 UI string。Narrative flavor 文本（`src/src/data/narrative/*` / `relics.ts` flavor / `skillGeneration.ts` flavor）**不在本 audit 范围**，由 pipeline 整批重生。

**Audit 不在范围**：
- 代码 identifier（`unlockSkill`、`isUnlocked` 等变量名）—— 数据结构不影响玩家可见 UI
- Event 名（`meta:achievement_unlocked` 等）—— 内部事件总线
- Math 命中（`Math.PI`）—— 误命中

---

## 🔴 Tier 1 · 一票否决（含禁词的 system message）

修复纪律：**system message 不出现 "解锁 / 授权 / 许可 / 批准 / 配发 / 解锁了 / 授予"**（§9.8.3 + D30 硬约束）。

### 1A · 解锁 / unlock 字眼（最严重 — Ch.2/3/5 升职通知 boilerplate 全 affected）

| 行 | Key | 现 | 修复方向 | 优先 |
|---|---|---|---|---|
| 213 | `class_select.lock_wordsmith` | `🔒 通关一次解锁` | 改为公司 boilerplate；候选：`职业代码 W · 待补编` / `转岗资格 · 候补` | P0 |
| 214 | `class_select.lock_metamorph` | `🔒 用造词师通关一次解锁` | 同上模式；`职业代码 M · 待补编` | P0 |
| 215 | `class_select.lock_none` | `🔒 未解锁` | `编制外` / `不在册` | P0 |
| 317 | `tutorial.L3_enchant_unlock_title` | `附魔解锁` | `附注权限就位` / `经手附注流程` | P0 |
| 318 | `tutorial.L3_enchant_unlock_body` | `技能满级了！选择一个附魔：学徒型...` | 去除"满级了！"庆祝；改为 boilerplate | P0 |
| 331 | `tutorial.L5_class_unlock_title` | `职业解锁` | **必须等于 Ch.2/3/5 升职通知 template**（§2.18 反身闭合伏笔）；候选：`转岗通知` | **P0 + 跨 file 协调** |
| 332 | `tutorial.L5_class_unlock_body` | `职业解锁了！每个职业有独特资源和专属机制，但也会失去一种通用能力` | 同上模板；候选：`转岗通知 · 文牍科第 N 室 → 第 N 室 · 自即日起接管 X 工位 · 详见随附作业手册第 §章` | **P0 + 跨 file 协调** |
| 684 | `ascension.unlocked` | `🏆 Ascension {level} 已解锁！` | 去 emoji、去感叹；`KPI 周期 {level} 已结算` / `考核等级 {level}` | P0 |
| 888 | `battle.unlock_endless` | `用全部三个职业各通关一次即可解锁无尽模式` | `三个职业全部通关后，转入特殊勤务` | P0 |
| 2200 | `ritual.pick_enchant` (en) | `✨ Enchantment unlocked! Pick one` | 同 zh 修复 | P0 |
| 1647-1649 | `class_select.lock_*` (en) | `🔒 Clear once to unlock` 等 | 同 zh 修复 | P0 |
| 1753-1754 | `tutorial.L3_enchant_unlock_*` (en) | `Enchantment Unlocked` 等 | 同 zh 修复 | P0 |
| 1767-1768 | `tutorial.L5_class_unlock_*` (en) | `Class Unlocked` 等 | 同 zh 修复 | **P0 + 跨 file 协调** |
| 2112 | `ascension.unlocked` (en) | `🏆 Ascension {level} Unlocked!` | 同 zh 修复 | P0 |
| 2316 | `battle.unlock_endless` (en) | `Clear with all 3 classes to unlock Endless Mode` | 同 zh 修复 | P0 |

**关键 dependency**：`class_select.lock_*` (3 条) + `tutorial.L5_class_unlock_*` (2 条) + Ch.2 升职通知 + Ch.3 升职通知 + Ch.5 endless 入口仪式（§2.16.5）必须**共用同一 boilerplate template**。template 草案应同时落到：
- `tutorial.L5_class_unlock_*`（教程层）
- Ch.2 / Ch.3 / Ch.5 endless 入口的 in-character delivery（章节叙事 §2.16.2/§2.16.3/§2.16.5）
- `class_select.lock_*`（class picker UI label）—— 为锁定状态的 placeholder 版本

### 1B · 配发 / 批准 / 许可 / 授权（D26 v2 否决"公司分发"）

| 行 | Key | 现 | 评级 | 修复 |
|---|---|---|---|---|
| 156 | `roster.stamp_assigned` | `ASSIGNED<br>许可` | ⚠️ **保留**（in-character stamp，公司 voice 物理化） | — |
| 168 | `requisition.stamp_approved` | `APPROVED<br>许可` | ⚠️ **保留**（同上）| — |
| 183 | `hb.section_3_li_2` | `已配发之工件视同分内职责，不得退还。` | 🚨 V5 守则文本；D26 v2 直接冲突 | `经手工件视同分内职责，不得退还。` |
| 212 | `class_select.starter_relic` | `配发工件` | 🚨 class picker UI label | `经手工件` / `当批工件` |
| 218 | `relic_picker.starter_title` | `签发清单 · 配发工件` | 🚨 relic picker title | `签发清单 · 经手工件` |
| 433 | `shop.terminal.submit.stamped` | `SUBMITTING FORM · 已盖章 · 准入批准` | ⚠️ **保留**（in-character 终端 boilerplate）| — |
| 491 | `shop.terminal.cmd.buy.confirmed` | `已批准 · {name} · 🍌 {price} 已扣` | ⚠️ **保留**（同上）| — |
| 120 | `menu.footer_property` | `DPCA 资产 · 严禁未授权访问` | ⚠️ **保留**（环境标语 / 公司 voice 物理化）| — |
| 1893 | `shop.terminal.err.relic_slots_full` (en 镜像) | — | 同 zh | — |

**判定原则**：
- **保留**条件：in-character 表单/盖章/终端 prompt（公司**给自己**盖章 = D14 v2 firewall 物理化）
- **修复**条件：面向玩家的 UI label（class picker / relic picker / 守则正文）= 公司**对玩家**说"配发"= D26 v2 + D30 硬约束违反

---

## 🟡 Tier 2 · Power fantasy / fanfare 庆祝（§8.10.1）

修复纪律：
- ❌ 0 个 narrative popup / 0 个"你已发现 X"提示 / 0 个 fanfare 音效
- ❌ Power fantasy popup（"获得 X 能力!"）
- ✅ 像普通 roguelike 新职业一样登场（§9.8.3）—— **但**所有 fanfare emoji + 感叹号 + 庆祝句式都得清掉

### 2A · 庆祝 emoji + 感叹号

| 行 | Key | 现 | 修复方向 |
|---|---|---|---|
| 269 | `tutorial.complete.title` | `🎉 教程完成！` | `录入员 L0 准入登记 · 完结` |
| 270 | `tutorial.complete.body` | `你已经学会了核心机制。祝你好运，打字勇者！` | 🚨 "打字勇者"是 fantasy hero framing；改为 `自下批次起独立轮值。值班表已下发。` |
| 66 | `craft.completed` | `✨ 词语组装完成: {word}` | `已经手词条: {word}` |
| 684 | `ascension.unlocked` | `🏆 Ascension {level} 已解锁！` | (Tier 1 已涵盖) |
| 958 | `ritual.pick_enchant` | `✨ 附魔成功！选择一个附魔` | `附注流程已就位 · 选择一项` |
| 959 | `ritual.title` | `✨ 附魔仪式 ✨` | `附注台 · 流程 6` |
| 962 | `ritual.applied` | `{icon} {name} 已附魔到 {skill}！` | `{icon} {name} 已绑定 {skill}` |
| 963 | `ritual.applied_generic` | `附魔完成！` | `附注完成` |
| 985 | `rest.ench_trial.success` | `✨ 试炼通过！` | `打字测试 · 通过` |
| 772 | `shop.enchant_choose` | `✨ 附魔选择 — {name} (免费!) ✨` | `附注 · {name} · 本批免费` |
| 776 | `shop.enchant_cost` | `✨ 免费` | `本批免费` |
| 969 | `shop.enchant_select_title` | `✨ 附魔台 ✨` | `附注台` |
| 968 | `shop.pending_enchant_desc` | `该技能升级后获得了附魔槽位...` | `该技能等级满后含附注位 · 选择一项` |
| 1703 | `tutorial.complete.title` (en) | `🎉 Tutorial Complete!` | 同 zh |
| 2386-2387 | `ritual.*` (en) | `✨ Enchantment unlocked!` 等 | 同 zh |

### 2B · "获得 X !" 句式（power fantasy popup）

| 行 | Key | 现 | 修复方向 |
|---|---|---|---|
| 732 | `shop.got_relic` | `获得遗物 {icon} {name}!` | `已签出: {icon} {name}` |
| 734 | `shop.got_skill` | `获得 {name}!` | `已签出: {name}` |
| 887 | `battle.skills_owned` | `获得技能: {count}` | `已签出技能: {count}` |
| 895 | `relic.slots_full` | `槽位已满！选择要替换的遗物（获得 {icon} {name}）` | `数字行槽位已满 · 选择一项替换 ({icon} {name})` |
| 896 | `relic.replace` | `替换遗物！获得 {icon} {name}，卖出 +{banana}` | `当批工件已替换 · {icon} {name} · 退还 +{banana}` |
| 1002 | `rest.buff.r` | `获得临时增强：+8s时间、+0.5x倍率！` | `临时调度: +8s 时间 · +0.5× 倍率` |
| 1003 | `rest.intermission.r` | `获得25香蕉和2次免费刷新！` | `当批补贴: 25 香蕉 · 2 次免费换批` |
| 974 | `rest.ench_trial.desc` | `一个神秘的附魔石发出微弱的光芒。如果你能通过打字挑战，就能获得附魔。` | 整段重写为 boilerplate；去除"神秘的"/"微弱的光芒"等奇幻语 |
| 976 | `rest.ench_trial.accept_d` | `15秒内完成8个单词零错误，成功获得附魔` | `15s 内完成 8 词 · 零错误 · 通过即附注` |
| 2160-2162 | `shop.got_*` (en) | `Got relic ... !` | 同 zh |
| 2315-2324 | `relic.* / battle.skills_owned` (en) | 同上 | 同 zh |

### 2C · DEFER 到 narrative-writer pipeline 整批 reframe

以下条目**不在本 audit 修复范围**，留给 pipeline v4.1 sync 时与 boss modifier flavor 一起整批重写：

| Key 簇 | 当前问题 | 处理路径 |
|---|---|---|
| `battle.deadly_gift_*` (708-713) + en 镜像 | 7 条 `🎁 完美礼物！` fanfare | boss modifier "deadly gift" 系列叙事；§9.7.5 已 marked PL-2 reframe（"撰写异常报告"风格）|
| `shop.deadly_gift_refresh` (725) | 同上簇 | 同上 |
| `rest.gamble.*` (1004-1006) | `🎲 赢了！+300香蕉！` 赌博 fanfare | rest event narrative；pipeline 重写为"工资借支" / "加班补贴" boilerplate |
| `rest.upgrade.r` (1000) | `{name} 升级到 Lv.{level}！` | mechanical level-up notification；整批改为去感叹版 |
| `shop.training_manual_feedback` (2164) | `📖 {n} skills leveled up!` | 同上 |

---

## 🟠 Tier 3 · 与 PL-2/3 设计直接冲突（DEFER 到 PL-2/3 一起做）

PL-2/3 mechanic 重做时**必须同步**改这两条 desc——若先改 desc 后改 mechanic 会出现 desc 描述了新机制但游戏还在跑旧机制的 1-session 不一致期。

| 行 | Key | 现 | v4.1 约束（§9.8.1/9.8.2）| 必须改 |
|---|---|---|---|---|
| 1458-1460 | `class.wordsmith.desc/lose` | `操控输入层，通过字母碎片和采集队列**手动构建**词库` | Typing buffer pre-populate / illusion of choice / "创意" = anomaly 的 dictation | "手动构建"= power fantasy framing **必删** |
| 1461-1463 | `class.metamorph.desc/lose` | `操控处理层，通过变异素和蜕变盲盒**改造**技能组合` | 玩家**自己**学会修改 / tamper anomaly's expression channel；公司**不批准** | "操控/改造" = power fantasy framing **必删** |
| 2886-2891 | `class.*.desc/lose` (en) | 同 zh | 同上 | 同 zh |

**修复方向**（pipeline 在 PL-2/3 mechanic 落地后生成）：
- `class.wordsmith.desc` → `录入工位 6-D · 候选词条由批次自动 pre-populate · 你只需选择哪一个进入下批生效`
- `class.metamorph.desc` → `轮值至 3-A 工位 · 经手词条会出现非标准结尾 · 后续将不再标注`

---

## 🟢 Tier 4 · 灵长接口 / PI 显化检查

### Audit 结论：✅ **零违规**

| 命中 | 类别 | 评级 |
|---|---|---|
| `Math.PI` 全数 | 数学常量 | 误命中 |
| `src/src/ui/affixAbbrev.ts:47` `// 仅对应灵长类物种 affix` | 代码注释 | 不可见 |
| `demo-i18n.ts:34, 106` `'灵长类辅助文书部'` | DPCA 中文官方译名 / 游戏标题 | ✅ 符合 §5.4.4：UI 元素未被命名为"灵长接口"，仅设定描述 |

### PL-11 落地时的检查 hook

将来 PL-11 视觉/UI 落地时，**任何**新加的 HUD 元素或系统提示出现以下字眼**一票否决**：
- `灵长接口` / `Primate Interface` / `PI 接口`
- `已连接` / `Interface activated` / `接入已成功`
- 任何把"PI"作为 UI 部件命名的 caption

---

## 📊 修复体量与执行路径

### 体量

| Tier | i18n key 数（zh + en）| 修复方式 | 阻塞 ship |
|---|---|---|---|
| Tier 1A · 解锁字眼 | 16 keys | 部分需先敲定**升职通知 boilerplate template** | P0 (Ch.1) |
| Tier 1B · 配发/批准（修复部分） | 6 keys（保留 5 keys 不动）| 单 key 替换 | P0 (Ch.1) |
| Tier 2A · fanfare emoji | ~30 keys | 单 key 替换 | P0 (Ch.1) |
| Tier 2B · 获得 X 句式 | ~20 keys | 单 key 替换 | P0 (Ch.1) |
| Tier 2C · DEFER（pipeline 整批） | ~14 keys | pipeline regen | P2 |
| Tier 3 · class desc | 8 keys | 与 PL-2/3 mechanic 同步 | P2 (Ch.3-4) |

### 执行路径（与上层 plan 对齐）

```
[本文档 LOCK] → narrative-writer pipeline v4.1 改造（§8.8）
                      ↓ pipeline scope 增加：
                        - 升职通知 boilerplate template（Ch.2/3/5 共用）
                        - V5 守则 layered library 替换 hb.* 守则文本
                        - V1 boilerplate template 替换 Tier 1A class_select / tutorial.L5
                        - "已签出" / "经手" voice library 替换 Tier 2B 获得 X
                      ↓
[pipeline 跑批] → 生成 ~1700 entries 含本 audit 列出的所有替换
                      ↓
[ingest 替换] → 写回 demo-i18n.ts（本 audit 列出的 ~80 keys）+ 现有 v2.3 残留 flavor
                      ↓
[PL-2 / PL-3 落地] → 同步替换 Tier 3 class desc（与 mechanic 同 commit）
                      ↓
[PL-11 落地] → 启用 Tier 4 检查 hook 防新增违规
```

### 跨 audit 协调点

1. **升职通知 boilerplate template** —— 本 audit Tier 1A `tutorial.L5_class_unlock_*` + Ch.2/3/5 章节叙事 + class_select.lock_* 的**唯一 source of truth**。pipeline v4.1 必须在第一批生成中确定此 template，否则上述 5 处会漂移。
2. **"已签出" / "经手" voice 词典** —— 替换 Tier 2B 获得 X 句式。这是 V1 / V5 boilerplate voice 的延伸，pipeline 应作为词典 input 喂给 generator。
3. **v4.1 词典严格遵循（DAY/BATCH/CYCLE/A）** —— 与 memory `feedback_ui_label_vocabulary.md` 一致；pipeline 需 enforce。

---

## Appendix · 不在本 audit 范围的相邻议题

记录在此供后续 session reference，不在本次修复 scope：

1. **Achievement system 文案**（`shop.training_manual_feedback` 之类）—— 成就 UI 整体是否符合 §8.10.1 "0 个 narrative codex / lore unlock UI" 需独立 audit
2. **Quest / FOC 系列 effect 描述**（`quest.quest_*.effect`，~70 条）—— 当前 voice 偏机制说明，是否需要套用 V5 守则 layered footnote 风格待定
3. **Affix description**（`affix_desc.*`，~50 条）—— 同 quest，机制说明 voice 是否需要 narrative-aware 改造
4. **Tutorial L0-L5 全套 prompt**（约 30 keys）—— Tier 1A 仅命中 L3/L5；其余 L0/L1/L2/L4 是否含 power fantasy 句式未深审

这 4 块累计 ~150 keys，建议在 pipeline v4.1 跑批后做第二轮 audit，确认是否需要进入 regen scope。

---

**Last update**：2026-05-04
**Next consumer**：narrative-writer pipeline v4.1 sync 执行者 / PL-2/3 mechanic 重做执行者 / PL-11 视觉 UI 落地执行者
