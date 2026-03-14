// ============================================
// 打字肉鸽 - Demo i18n (中文/英文)
// ============================================
// 轻量运行时 i18n：字典 + t() 查找 + applyHtmlI18n() DOM 扫描

import { IS_DEMO } from './demo-config'

// === Locale 类型 ===
export type Locale = 'zh' | 'en'

let currentLocale: Locale = 'en'

const STORAGE_KEY = 'demo_locale'

export function initLocale(): void {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'en' || saved === 'zh') {
    currentLocale = saved
  }
}

export function getLocale(): Locale {
  return currentLocale
}

export function setLocale(locale: Locale): void {
  currentLocale = locale
  localStorage.setItem(STORAGE_KEY, locale)
}

// === ZH 字典 ===
const ZH: Record<string, string> = {
  // --- index.html 静态文本 ---
  'game.title': '打字肉鸽',
  'hud.produced': '本关产出',
  'hud.multiplier': '倍率',
  'shop.title': '商店',
  'shop.level_complete': 'Level {level} 完成!',
  'shop.level_clear': '完成!',
  'shop.score_label': '得分:',
  'shop.word_inventory': '词库',
  'shop.tab.build': '构筑',
  'shop.tab.stats': '📊 统计',
  'shop.tab.words': '📚 词库',
  'shop.tab.craft': '🔤 造词台',
  'shop.tab.metamorph': '🧬 蜕变台',
  'shop.word_panel_label': '词库',
  'shop.owned_skills': '已拥有技能',
  'shop.sell_zone': '🗑️ 拖到此处出售',
  'shop.next_battle': '开始下一关',
  'rest.title': '休息关',
  'rest.continue': '继续旅程',
  'gameover.restart': '再来一局',
  'gameover.daily': '📅 每日挑战',
  'class_select.title': '⚔️ 选择职业 ⚔️',
  'class_select.confirm': '确认选择',
  'relic_picker.title': '🏺 选择一件遗物 🏺',
  'relic_picker.skip': '跳过',
  'modifier_picker.title': '⚔️ 选择一个 Boss 修饰器 ⚔️',
  'enchantment.title': '⚡ 技能附魔 ⚡',
  'enchantment.cancel': '取消',
  'settlement.base': '基数',
  'settlement.mult': '倍率',
  'gold_reward.base': '基础',
  'gold_reward.skill': '技能产出',
  'gold_reward.relic': '遗物加成',

  // --- demo start screen ---
  'demo.subtitle': '用你的键盘构建得分引擎',
  'demo.start': '开始试玩',

  // --- demo-dom-cleanup.ts ---
  'demo.error.title': '抱歉，出了点问题',
  'demo.error.desc': '请刷新页面重试',
  'demo.error.btn': '刷新页面',
  'demo.webgl.title': '浏览器不支持 WebGL',
  'demo.webgl.desc': '请使用 Chrome 90+ / Firefox 90+ / Safari 15+',

  // --- demo-tutorial.ts ---
  'tutorial.step1': '打出屏幕上的单词！',
  'tutorial.step2': '你的按键触发了技能！查看键盘上的高亮',
  'tutorial.step3': '基础分 × 倍率 = 最终得分。用技能提升两者！',

  // --- demo-end-screen.ts ---
  'demo_end.title': '试玩结束！',
  'demo_end.score': '得分：{value}',
  'demo_end.combo': '最高连击：{value}',
  'demo_end.skills': '触发技能：{value} 次',
  'demo_end.features_title': '完整版包含：',
  'demo_end.f1': '10 关完整冒险 + Boss 战',
  'demo_end.f2': '176 个技能 × 21 种附魔',
  'demo_end.f3': '3 个职业（造词师 / 蜕变师 / …）',
  'demo_end.f4': '49 个遗物',
  'demo_end.f5': '无尽模式 + 每日挑战',
  'demo_end.f6': 'Steam 成就 + 云存档',
  'demo_end.steam': '在 Steam 上获取完整版',
  'demo_end.replay': '再玩一次',

  // --- battle.ts ---
  'battle.phoenix': '凤凰羽毛!',
  'battle.glass_break': '玻璃大炮碎了!',
  'battle.combo_break': '{combo}× 断了!',
  'battle.relic_break': '遗物碎裂!',
  'battle.penalty': '-{value}分!',
  'battle.entropy': '熵增殆尽...',
  'battle.dice_double': '骰子翻倍！×{value}',
  'battle.dice_gone': '骰子消失了...',
  'battle.elite_hint': '精英挑战',
  'battle.boss_hint': 'BOSS 战',
  'battle.target_hint': '目标: {value}分',
  'battle.cycle_prefix': '周目{cycle} · ',

  // --- typing relic feedback ---
  'battle.glass_double': '💀 ×2 (+{extra})',
  'battle.rhythm_slow': '🎵 慢速',
  'battle.rhythm_time': '⏱️ +{value}s',
  'battle.rhythm_fast': '🎵 快速 → 得分 ×{value}',
  'battle.tab_hint': '⇥ Tab',

  // --- combo relic feedback ---
  'battle.prism_active': '🔷 棱镜激活 → 技能+20%',
  'battle.combo_buffer': '🛡️ 余韵护盾 → combo {value}',
  'battle.rhythm_doc': '⏱️ +{value}s',
  'battle.detonate': '💣 ×{value}',

  // --- skill relic feedback ---
  'battle.first_strike': '⚡ 首发强化 +20%',
  'battle.less_is_more': '💎 少而精 → 技能+20%',
  'battle.jazz': '🎷 爵士 +{value}%',

  // --- topology relic feedback ---
  'battle.dual_concerto': '🎹 +{value}s',
  'battle.key_storm': '⛈️ 风暴 ×{value}',
  'battle.key_storm_penalty': '⛈️ ×0.5 (-{value})',
  'relic.row_medal_selected': '🎖️ 已选择{row}',

  // --- word relic feedback ---
  'battle.long_word_time': '📏 +{value}s',

  // --- resource relic feedback ---
  'battle.time_dew': '💧 +{value}s',
  'battle.resource_tide_base': '🌊 基数+40%',
  'battle.resource_tide_mult': '🌊 倍率+40%',

  // --- stage relic feedback ---
  'battle.phoenix_revive': '🐦‍🔥 不死鸟复活！',

  // --- shop.ts ---
  'shop.cycle_title': '商店 · 周目{cycle}',
  'shop.no_gold': '金币不足!',
  'shop.intermission_refresh': '🔋 幕间免费刷新！',
  'shop.skill_count_full': '技能数量已达上限!',
  'shop.white_only': '纯粹之心：仅允许白装技能!',
  'shop.level_capped': '技能等级已达上限!',
  'shop.already_owned': '已拥有该遗物!',
  'shop.got_relic': '获得遗物 {icon} {name}!',
  'shop.skill_upgrade': '{name} 升级!',
  'shop.got_skill': '获得 {name}!',
  'shop.auto_level': '自动升至 Lv{level}!',
  'shop.enchant_locked': '附魔已锁定!',
  'shop.enchanted': '附魔! {icon} {name}',
  'shop.random_enchant': '🎲 随机附魔! {icon} {name}',
  'shop.sell': '卖出 +{price}💰',
  'shop.sell_word': '-{word} +3💰',
  'shop.min_words': '词库最少保留{count}个词!',
  'shop.add_words': '+{count}词',
  'shop.buy_pack': '购买整包 ({count}词) 💰{cost}',
  'shop.letters': '字母',
  'shop.deck_stats': '📚 {total}词 · 均长{avg}',
  'shop.top_freq': '高频:',
  'shop.refresh': '🔄 刷新 (💰{cost})',
  'shop.upgrade_label': '{label}·升级',
  'shop.upgrade_name': '{name} (升级 Lv.{from}→{to})',
  'shop.pack_type': '词包',
  'shop.buy_skills_hint': '购买技能开始构筑',
  'shop.no_stats': '暂无战斗数据',
  'shop.words_done': '完成 {count} 词',
  'shop.words_perfect': '完美 {count} 词',
  'shop.chain_count': '连锁 {count} 次',
  'shop.max_chain': '最长链 {count}',
  'shop.unbound': '{name} 已从 {key} 解绑（字频不足）',
  'shop.sell_word_feedback': '出售 {word} +3💰',
  'shop.heatmap.triggers': '触发数',
  'shop.heatmap.triggered': '触发 {count} 次',
  'shop.enchant_choose': '✨ 附魔选择 — {name} (免费!) ✨',
  'shop.enchant_cat.spatial': '🌐 空间',
  'shop.enchant_cat.transmutation': '⚗️ 变性',
  'shop.enchant_cat.independent': '⭐ 独立',
  'shop.enchant_cost': '✨ 免费',
  'shop.enchant_dual': '增幅效果同时作用于{icon}{label}（{pct}%效率）',
  'shop.rarity.common': '普通',
  'shop.rarity.rare': '稀有',
  'shop.rarity.epic': '史诗',
  'shop.rarity.legendary': '传说',

  // --- skill tooltip ---
  'tooltip.producer': '💡 产出者：按键直接产出资源',
  'tooltip.converter': '💡 转化者：读取资源值，产出另一种',
  'tooltip.connector': '💡 连接者：自动触发周围技能',
  'tooltip.replicator': '💡 复制者：按键触发周围技能',
  'tooltip.amplifier': '💡 增幅者：叠层增幅范围内技能数值',

  // --- KeyTooltip labels ---
  'tooltip.base_score': '底分: +{score}',
  'tooltip.frequency': '字频: {count} 次',
  'tooltip.frequency_low': '字频: {count} 次 (底分不足)',
  'tooltip.stacks': '叠层: ×{count}',
  'tooltip.amp_range': '增幅范围: {skills}',

  // --- resource labels (full) ---
  'resource.base': '基数',
  'resource.score': '分数',
  'resource.multiplier': '倍率',
  'resource.time': '时间',
  'resource.gold': '金币',
  'resource.fragment': '碎片',
  'resource.mutagen': '变异素',

  // --- skill school labels ---
  'school.producer': '产出',
  'school.converter': '转化',
  'school.connector': '连接',
  'school.replicator': '复制',
  'school.amplifier': '增幅',
  'school.unknown': '未知',

  // --- skills.ts display ---
  'skill.enchant_suffix': ' | 附魔: {suffix}',
  'skill.amp_dual': ' | {icon}{name}: 同时增幅{extraIcon}{extraLabel}（{pct}%效率）',

  // --- actTransition.ts ---
  'act.1': '热身',
  'act.2': '征途',
  'act.3': '决战',
  'act.elite_announce': '⚡ 精英强化: {icon} {name}',

  // --- enchantment info ---
  'enchant.growth': '{icon} {name}: 成长 +{pct}%',
  'enchant.mastery': '{icon} {name}: {progress}/10 → 成长 +{pct}%',
  'enchant.devour': '{icon} {name}: {icons} (图标×{count})',

  // --- resource unit labels (short, for float feedback) ---
  'unit.base': '基数',
  'unit.score': '分',
  'unit.multiplier': '倍率',
  'unit.time': '秒',
  'unit.gold': '币',
  'unit.fragment': '碎片',
  'unit.mutagen': '变异素',

  // --- skill feedback ---
  'skill.devour': '🦷 吞噬! {icon}',
  'skill.mutagen_drop': '🧪🧬 +1变异素',
  'skill.splash': '{icon} 溅射!',
  'skill.splash_suffix': '溅射',
  'skill.resonance_suffix': '共鸣',
  'skill.connector_locked': '连接者已锁定!',
  'skill.retrigger': '重触发!',

  // --- effect queue ---
  'effect.amplify': '增幅 x{value}',
  'effect.ripple': '涟漪 x{value}',
  'effect.chain': '连锁 +{value}',
  'effect.transform': '转化 ={value}',
  'effect.delay': '延迟 ({current}/{max})',
  'effect.delay_max': '延迟已达上限，效果消失',

  // --- word pack conditions ---
  'pack.starts_with': '{letter}开头',
  'pack.starts_with.desc': '以{letter}开头的词',
  'pack.ends_with': '{letter}结尾',
  'pack.ends_with.desc': '以{letter}结尾的词',
  'pack.contains': '含{letter}',
  'pack.contains.desc': '包含字母{letter}的词',
  'pack.contains_owned': '强化词包',
  'pack.contains_owned.desc': '包含你的高频字母的词',
  'pack.contains_unowned': '探索词包',
  'pack.contains_unowned.desc': '包含你的低频字母的词',
  'pack.short': '短词精选',
  'pack.short.desc': '2-3字母的短词',
  'pack.long': '长词挑战',
  'pack.long.desc': '7+字母的长词',
  'pack.special': '奇幻词包',
  'pack.special.desc': '特殊主题词',
  'pack.high_freq': '{letter}高频',
  'pack.high_freq.desc': '高频{letter}字母词',
  'pack.unknown': '未知',

  // --- battle victory / gameover ---
  'battle.victory': '通关! Boss 已击败!',
  'battle.final_score': '最终得分: {score}',
  'battle.max_combo': '最高连击: {combo}',
  'battle.skills_owned': '获得技能: {count}',
  'battle.unlock_endless': '用全部三个职业各通关一次即可解锁无尽模式',
  'battle.reached_level': '到达 Level {level}',
  'battle.final_score_target': '最终得分: {score} / {target}',
  'battle.deck_label': '📚 {count}词',
  'battle.empty_slot': '[{key}] 空槽位',

  // --- relic picker ---
  'relic.slots_full': '槽位已满！选择要替换的遗物（获得 {icon} {name}）',
  'relic.replace': '替换遗物！获得 {icon} {name}，卖出 +{gold}g',
  'relic.sell_label': '卖出 +{gold}g',
  'relic.give_up': '放弃',

  // --- boss modifier ---
  'modifier.boss_spotlight': '聚光灯',
  'modifier.boss_spotlight.desc': '只能看到当前 2-3 个字母',
  'modifier.boss_spotlight.elite': '可见 3-4 个字母',
  'modifier.boss_garble': '乱码',
  'modifier.boss_garble.desc': '词语中插入随机标点符号',
  'modifier.boss_garble.elite': '插入较少标点符号',
  'modifier.boss_scroll': '滚屏',
  'modifier.boss_scroll.desc': '字母从右向左滚动，对准箭头时打字',
  'modifier.boss_scroll.elite': '滚动较慢，命中区更宽',

  // --- rest stage ---
  'rest.act_end': 'Act {act} 结束',
  'rest.quiet_name': '安静的休息',
  'rest.quiet_desc': '没有什么特别的事发生。你安静地休息了一会儿。',
  'rest.quiet_done': '休息完毕，继续前进。',
  'rest.noop': '你选择了离开。',
  // rest events
  'rest.merchant.name': '神秘商人',
  'rest.merchant.desc': '一位神秘的旅人出现在你面前，愿意和你做笔交易。',
  'rest.merchant.opt1': '花费 50% 金币',
  'rest.merchant.opt1d': '获得一个随机稀有遗物',
  'rest.merchant.opt2': '免费拿一个',
  'rest.merchant.opt2d': '获得一个随机普通遗物',
  'rest.leave': '离开',
  'rest.leave.desc': '不做交易',
  'rest.merchant.rare': '花费 {cost} 金币，获得稀有遗物 {icon} {name}！',
  'rest.merchant.rare_fail': '花费 {cost} 金币，但没有更多遗物可获得。',
  'rest.merchant.common': '免费获得普通遗物 {icon} {name}！',
  'rest.merchant.common_fail': '没有更多普通遗物可获得。',
  'rest.trial.name': '打字之神的考验',
  'rest.trial.desc': '打字之神降临，给你一个抉择。',
  'rest.trial.power': '力量',
  'rest.trial.power_d': '下一 Act 倍率 +1.0×，但时间 -10 秒',
  'rest.trial.endurance': '耐力',
  'rest.trial.endurance_d': '下一 Act 时间 +15 秒，但倍率 -0.5×',
  'rest.trial.leave_d': '放弃考验',
  'rest.trial.power_r': '下一 Act 倍率 +1.0x，但时间 -10 秒！',
  'rest.trial.endurance_r': '下一 Act 时间 +15 秒，但倍率 -0.5x！',
  'rest.altar.name': '技能祭坛',
  'rest.altar.desc': '古老的祭坛散发着力量，你可以献祭一个技能来获取回报。',
  'rest.altar.upgrade': '献祭换技能',
  'rest.altar.upgrade_d': '失去一个随机技能，获得一个更高级技能',
  'rest.altar.gold': '献祭换金币',
  'rest.altar.gold_d': '失去一个随机技能，获得 200 金币',
  'rest.altar.leave_d': '不献祭',
  'rest.altar.no_skill': '没有可献祭的技能。',
  'rest.altar.upgrade_r': '献祭了 {removed}，获得新技能 {icon} {name}！',
  'rest.altar.upgrade_fail': '献祭了 {removed}，但没有更多新技能可获得。',
  'rest.altar.gold_r': '献祭了 {removed}，获得 200 金币！',
  'rest.gamble.name': '赌徒的骰子',
  'rest.gamble.desc': '一个赌徒向你展示了一对骰子，邀请你试试运气。',
  'rest.gamble.bet': '押 100 金币',
  'rest.gamble.bet_d': '50% 赢得 300 金币，50% 失去 100 金币',
  'rest.gamble.leave_d': '不赌',
  'rest.gamble.no_gold': '金币不足！',
  'rest.gamble.win': '赢了！获得 300 金币！(净赚 200)',
  'rest.gamble.lose': '输了！失去 100 金币！',
  'rest.forge.name': '遗物熔炉',
  'rest.forge.desc': '炽热的熔炉可以销毁你的装备，转化为其他力量。',
  'rest.forge.relic': '销毁遗物',
  'rest.forge.relic_d': '销毁一个随机遗物，随机一个技能 +1 级',
  'rest.forge.skill': '销毁技能',
  'rest.forge.skill_d': '销毁一个随机技能，获得一个随机遗物',
  'rest.forge.leave_d': '不熔炼',
  'rest.forge.no_relic': '没有可销毁的遗物。',
  'rest.forge.relic_r': '销毁了 {icon} {name}，{skill} 升级至 Lv.{level}！',
  'rest.forge.relic_fail': '销毁了 {icon} {name}，但没有可升级的技能。',
  'rest.forge.no_skill': '没有可销毁的技能。',
  'rest.forge.skill_r': '销毁了 {removed}，获得遗物 {icon} {name}！',
  'rest.forge.skill_fail': '销毁了 {removed}，但没有更多遗物可获得。',
  'rest.rift.name': '时间裂缝',
  'rest.rift.desc': '时空裂缝出现在你面前，你可以改变接下来的旅程。',
  'rest.rift.skip': '跳过下一关',
  'rest.rift.skip_d': '直接跳过一关（少打一关，少拿一关奖励）',
  'rest.rift.replay': '重打上一关',
  'rest.rift.replay_d': '再次挑战上一关，获取额外金币奖励',
  'rest.rift.leave_d': '不干涉时间',
  'rest.rift.skip_r': '时空裂缝打开，跳过了一关！将直接前往 Level {level}。',
  'rest.rift.skip_fail': '时空裂缝不稳定，无法跳跃。',
  'rest.rift.replay_r': '时间回溯！额外获得 50 金币作为重打奖励。',
  'rest.curse.name': '键盘诅咒',
  'rest.curse.desc': '暗影低语：接受诅咒，获得力量。两个键位将被封印至 Act 结束。',
  'rest.curse.accept': '接受诅咒',
  'rest.curse.accept_d': '封印 2 个随机键位，获得 150 金币 + 随机遗物',
  'rest.curse.reject': '拒绝',
  'rest.curse.reject_d': '离开',
  'rest.curse.r': '键位 [{keys}] 被封印！获得 150 金币{relic}。（Act 结束后自动恢复）',
  'rest.curse.relic_bonus': ' + 遗物 {icon} {name}',
  'rest.copier.name': '技能复制器',
  'rest.copier.desc': '一台神秘的机器可以复制你的技能，但代价是更高的挑战。',
  'rest.copier.copy': '复制技能',
  'rest.copier.copy_d': '随机一个技能 +1 级，但下一 Act 目标分 ×1.5',
  'rest.copier.leave_d': '不复制',
  'rest.copier.no_skill': '没有可升级的技能。',
  'rest.copier.r': '{name} 升级至 Lv.{level}！但下一 Act 目标分 ×1.5。',
  'rest.wheel.name': '命运之轮',
  'rest.wheel.desc': '命运之轮开始旋转……无人能预测结果。',
  'rest.wheel.spin': '旋转命运之轮',
  'rest.wheel.spin_d': '随机获得好运或厄运',
  'rest.wheel.gold': '好运！获得 {gold} 金币！',
  'rest.wheel.relic': '好运！获得遗物 {icon} {name}！',
  'rest.wheel.lose_gold': '厄运！失去 {cost} 金币（30%）！',
  'rest.wheel.lose_mult': '厄运！下一 Act 倍率 -0.5x！',
  'rest.wheel.prefix': '命运之轮转动……',
  'rest.meditate.name': '宁静冥想',
  'rest.meditate.desc': '在宁静中，你可以预见未来，或是积蓄力量。',
  'rest.meditate.preview': '冥想预见',
  'rest.meditate.preview_d': '预览下一 Act 的 Boss 类型和精英关修饰器',
  'rest.meditate.gold': '积蓄力量',
  'rest.meditate.gold_d': '获得 80 金币',
  'rest.meditate.empty': '冥想中看到一片宁静……没有更多信息。',
  'rest.meditate.modifier': '修饰器{idx}: {icon} {name} — {hint}',
  'rest.meditate.result': '冥想预见：\n{previews}',
  'rest.meditate.gold_r': '积蓄力量，获得 80 金币！',
  'rest.default': '无事发生。',
}

// === EN 字典 ===
const EN: Record<string, string> = {
  // --- index.html static text ---
  'game.title': 'TypeRogue',
  'hud.produced': 'Produced',
  'hud.multiplier': 'Mult',
  'shop.title': 'Shop',
  'shop.level_complete': 'Level {level} Clear!',
  'shop.level_clear': 'Clear!',
  'shop.score_label': 'Score:',
  'shop.word_inventory': 'Words',
  'shop.tab.build': 'Build',
  'shop.tab.stats': '📊 Stats',
  'shop.tab.words': '📚 Words',
  'shop.tab.craft': '🔤 Forge',
  'shop.tab.metamorph': '🧬 Metamorph',
  'shop.word_panel_label': 'Words',
  'shop.owned_skills': 'Owned Skills',
  'shop.sell_zone': '🗑️ Drag here to sell',
  'shop.next_battle': 'Next Battle',
  'rest.title': 'Rest Stop',
  'rest.continue': 'Continue',
  'gameover.restart': 'Play Again',
  'gameover.daily': '📅 Daily Challenge',
  'class_select.title': '⚔️ Choose Class ⚔️',
  'class_select.confirm': 'Confirm',
  'relic_picker.title': '🏺 Pick a Relic 🏺',
  'relic_picker.skip': 'Skip',
  'modifier_picker.title': '⚔️ Pick a Boss Modifier ⚔️',
  'enchantment.title': '⚡ Enchantment ⚡',
  'enchantment.cancel': 'Cancel',
  'settlement.base': 'Base',
  'settlement.mult': 'Mult',
  'gold_reward.base': 'Base',
  'gold_reward.skill': 'Skill Gold',
  'gold_reward.relic': 'Relic Bonus',

  // --- demo start screen ---
  'demo.subtitle': 'Build a scoring engine with your keyboard',
  'demo.start': 'Play Demo',

  // --- demo-dom-cleanup.ts ---
  'demo.error.title': 'Something went wrong',
  'demo.error.desc': 'Please refresh the page',
  'demo.error.btn': 'Refresh',
  'demo.webgl.title': 'WebGL not supported',
  'demo.webgl.desc': 'Please use Chrome 90+ / Firefox 90+ / Safari 15+',

  // --- demo-tutorial.ts ---
  'tutorial.step1': 'Type the words on screen!',
  'tutorial.step2': 'Your key triggered a skill! Check the keyboard highlights',
  'tutorial.step3': 'Base × Mult = Final Score. Use skills to boost both!',

  // --- demo-end-screen.ts ---
  'demo_end.title': 'Demo Complete!',
  'demo_end.score': 'Score: {value}',
  'demo_end.combo': 'Max Combo: {value}',
  'demo_end.skills': 'Skills Triggered: {value}',
  'demo_end.features_title': 'Full Version Includes:',
  'demo_end.f1': '10-stage adventure + Boss fights',
  'demo_end.f2': '176 skills × 21 enchantments',
  'demo_end.f3': '3 classes (Wordsmith / Metamorph / …)',
  'demo_end.f4': '49 relics',
  'demo_end.f5': 'Endless mode + Daily Challenge',
  'demo_end.f6': 'Steam achievements + Cloud saves',
  'demo_end.steam': 'Get Full Version on Steam',
  'demo_end.replay': 'Play Again',

  // --- battle.ts ---
  'battle.phoenix': 'Phoenix Feather!',
  'battle.glass_break': 'Glass Cannon shattered!',
  'battle.combo_break': '{combo}× combo lost!',
  'battle.relic_break': 'Relic shattered!',
  'battle.penalty': '-{value} pts!',
  'battle.entropy': 'Entropy depleted...',
  'battle.dice_double': 'Dice doubled! ×{value}',
  'battle.dice_gone': 'Dice vanished...',
  'battle.elite_hint': 'Elite Challenge',
  'battle.boss_hint': 'BOSS Fight',
  'battle.target_hint': 'Target: {value}',
  'battle.cycle_prefix': 'Cycle {cycle} · ',

  // --- typing relic feedback ---
  'battle.glass_double': '💀 ×2 (+{extra})',
  'battle.rhythm_slow': '🎵 Slow',
  'battle.rhythm_time': '⏱️ +{value}s',
  'battle.rhythm_fast': '🎵 Fast → Score ×{value}',
  'battle.tab_hint': '⇥ Tab',

  // --- combo relic feedback ---
  'battle.prism_active': '🔷 Prism Active → Skill +20%',
  'battle.combo_buffer': '🛡️ Buffered → combo {value}',
  'battle.rhythm_doc': '⏱️ +{value}s',
  'battle.detonate': '💣 ×{value}',

  // --- skill relic feedback ---
  'battle.first_strike': '⚡ First Strike +20%',
  'battle.less_is_more': '💎 Less is More → Skill +20%',
  'battle.jazz': '🎷 Jazz +{value}%',

  // --- topology relic feedback ---
  'battle.dual_concerto': '🎹 +{value}s',
  'battle.key_storm': '⛈️ Storm ×{value}',
  'battle.key_storm_penalty': '⛈️ ×0.5 (-{value})',
  'relic.row_medal_selected': '🎖️ Selected {row}',

  // --- word relic feedback ---
  'battle.long_word_time': '📏 +{value}s',

  // --- resource relic feedback ---
  'battle.time_dew': '💧 +{value}s',
  'battle.resource_tide_base': '🌊 Base +40%',
  'battle.resource_tide_mult': '🌊 Mult +40%',

  // --- stage relic feedback ---
  'battle.phoenix_revive': '🐦‍🔥 Phoenix Revive!',

  // --- shop.ts ---
  'shop.cycle_title': 'Shop · Cycle {cycle}',
  'shop.no_gold': 'Not enough gold!',
  'shop.intermission_refresh': '🔋 Free Refresh!',
  'shop.skill_count_full': 'Skill slots full!',
  'shop.white_only': 'Pure Heart: white skills only!',
  'shop.level_capped': 'Skill level capped!',
  'shop.already_owned': 'Already owned!',
  'shop.got_relic': 'Got relic {icon} {name}!',
  'shop.skill_upgrade': '{name} upgraded!',
  'shop.got_skill': 'Got {name}!',
  'shop.auto_level': 'Auto Lv{level}!',
  'shop.enchant_locked': 'Enchant locked!',
  'shop.enchanted': 'Enchanted! {icon} {name}',
  'shop.random_enchant': '🎲 Random enchant! {icon} {name}',
  'shop.sell': 'Sold +{price}💰',
  'shop.sell_word': '-{word} +3💰',
  'shop.min_words': 'Minimum {count} words!',
  'shop.add_words': '+{count} words',
  'shop.buy_pack': 'Buy pack ({count} words) 💰{cost}',
  'shop.letters': 'letters',
  'shop.deck_stats': '📚 {total} words · avg {avg}',
  'shop.top_freq': 'Top:',
  'shop.refresh': '🔄 Refresh (💰{cost})',
  'shop.upgrade_label': '{label}·Upgrade',
  'shop.upgrade_name': '{name} (Lv.{from}→{to})',
  'shop.pack_type': 'Pack',
  'shop.buy_skills_hint': 'Buy skills to start building',
  'shop.no_stats': 'No battle data yet',
  'shop.words_done': '{count} words done',
  'shop.words_perfect': '{count} perfect',
  'shop.chain_count': '{count} chains',
  'shop.max_chain': 'Max chain {count}',
  'shop.unbound': '{name} unbound from {key} (low freq)',
  'shop.sell_word_feedback': 'Sold {word} +3💰',
  'shop.heatmap.triggers': 'Triggers',
  'shop.heatmap.triggered': '{count} triggers',
  'shop.enchant_choose': '✨ Enchant — {name} (Free!) ✨',
  'shop.enchant_cat.spatial': '🌐 Spatial',
  'shop.enchant_cat.transmutation': '⚗️ Transmute',
  'shop.enchant_cat.independent': '⭐ Standalone',
  'shop.enchant_cost': '✨ Free',
  'shop.enchant_dual': 'Also amplifies {icon}{label} ({pct}% eff.)',
  'shop.rarity.common': 'Common',
  'shop.rarity.rare': 'Rare',
  'shop.rarity.epic': 'Epic',
  'shop.rarity.legendary': 'Legendary',

  // --- skill tooltip ---
  'tooltip.producer': '💡 Producer: press key to produce resources',
  'tooltip.converter': '💡 Converter: reads one resource, outputs another',
  'tooltip.connector': '💡 Connector: auto-triggers nearby skills',
  'tooltip.replicator': '💡 Replicator: triggers nearby skills on keypress',
  'tooltip.amplifier': '💡 Amplifier: stacking boost to skills in range',

  // --- KeyTooltip labels ---
  'tooltip.base_score': 'Base: +{score}',
  'tooltip.frequency': 'Freq: {count} hits',
  'tooltip.frequency_low': 'Freq: {count} hits (no base score)',
  'tooltip.stacks': 'Stacks: ×{count}',
  'tooltip.amp_range': 'Amp range: {skills}',

  // --- resource labels (full) ---
  'resource.base': 'Base',
  'resource.score': 'Score',
  'resource.multiplier': 'Multiplier',
  'resource.time': 'Time',
  'resource.gold': 'Gold',
  'resource.fragment': 'Fragment',
  'resource.mutagen': 'Mutagen',

  // --- skill school labels ---
  'school.producer': 'Producer',
  'school.converter': 'Converter',
  'school.connector': 'Connector',
  'school.replicator': 'Replicator',
  'school.amplifier': 'Amplifier',
  'school.unknown': 'Unknown',

  // --- skills.ts display ---
  'skill.enchant_suffix': ' | Ench: {suffix}',
  'skill.amp_dual': ' | {icon}{name}: also boosts {extraIcon}{extraLabel} ({pct}% eff.)',

  // --- actTransition.ts ---
  'act.1': 'Warm-up',
  'act.2': 'Journey',
  'act.3': 'Showdown',
  'act.elite_announce': '⚡ Elite: {icon} {name}',

  // --- enchantment info ---
  'enchant.growth': '{icon} {name}: Growth +{pct}%',
  'enchant.mastery': '{icon} {name}: {progress}/10 → Growth +{pct}%',
  'enchant.devour': '{icon} {name}: {icons} (×{count})',

  // --- resource unit labels (short, for float feedback) ---
  'unit.base': 'base',
  'unit.score': 'pts',
  'unit.multiplier': 'mult',
  'unit.time': 's',
  'unit.gold': 'g',
  'unit.fragment': 'frag',
  'unit.mutagen': 'mut',

  // --- skill feedback ---
  'skill.devour': '🦷 Devour! {icon}',
  'skill.mutagen_drop': '🧪🧬 +1 mutagen',
  'skill.splash': '{icon} Splash!',
  'skill.splash_suffix': 'splash',
  'skill.resonance_suffix': 'resonance',
  'skill.connector_locked': 'Connector locked!',
  'skill.retrigger': 'Retrigger!',

  // --- effect queue ---
  'effect.amplify': 'Amplify x{value}',
  'effect.ripple': 'Ripple x{value}',
  'effect.chain': 'Chain +{value}',
  'effect.transform': 'Transform ={value}',
  'effect.delay': 'Delay ({current}/{max})',
  'effect.delay_max': 'Delay maxed, effect fades',

  // --- word pack conditions ---
  'pack.starts_with': '{letter}-start',
  'pack.starts_with.desc': 'Words starting with {letter}',
  'pack.ends_with': '{letter}-end',
  'pack.ends_with.desc': 'Words ending with {letter}',
  'pack.contains': 'Has {letter}',
  'pack.contains.desc': 'Words containing {letter}',
  'pack.contains_owned': 'Power Pack',
  'pack.contains_owned.desc': 'Words with your high-freq letters',
  'pack.contains_unowned': 'Explore Pack',
  'pack.contains_unowned.desc': 'Words with your low-freq letters',
  'pack.short': 'Short Words',
  'pack.short.desc': '2-3 letter words',
  'pack.long': 'Long Words',
  'pack.long.desc': '7+ letter words',
  'pack.special': 'Special Pack',
  'pack.special.desc': 'Special themed words',
  'pack.high_freq': '{letter} Freq',
  'pack.high_freq.desc': 'High-freq {letter} words',
  'pack.unknown': 'Unknown',

  // --- battle victory / gameover ---
  'battle.victory': 'Victory! Boss defeated!',
  'battle.final_score': 'Final Score: {score}',
  'battle.max_combo': 'Max Combo: {combo}',
  'battle.skills_owned': 'Skills: {count}',
  'battle.unlock_endless': 'Clear with all 3 classes to unlock Endless Mode',
  'battle.reached_level': 'Reached Level {level}',
  'battle.final_score_target': 'Final Score: {score} / {target}',
  'battle.deck_label': '📚 {count} words',
  'battle.empty_slot': '[{key}] Empty',

  // --- relic picker ---
  'relic.slots_full': 'Slots full! Pick a relic to replace (gain {icon} {name})',
  'relic.replace': 'Replaced! Got {icon} {name}, sold +{gold}g',
  'relic.sell_label': 'Sell +{gold}g',
  'relic.give_up': 'Give Up',

  // --- boss modifier ---
  'modifier.boss_spotlight': 'Spotlight',
  'modifier.boss_spotlight.desc': 'Only 2-3 letters visible at a time',
  'modifier.boss_spotlight.elite': '3-4 letters visible',
  'modifier.boss_garble': 'Garble',
  'modifier.boss_garble.desc': 'Random punctuation inserted into words',
  'modifier.boss_garble.elite': 'Less punctuation inserted',
  'modifier.boss_scroll': 'Scroll',
  'modifier.boss_scroll.desc': 'Letters scroll left — type when aligned with arrow',
  'modifier.boss_scroll.elite': 'Slower scroll, wider hit zone',

  // --- rest stage ---
  'rest.act_end': 'Act {act} Complete',
  'rest.quiet_name': 'Quiet Rest',
  'rest.quiet_desc': 'Nothing special happens. You rest for a moment.',
  'rest.quiet_done': 'Rested. Moving on.',
  'rest.noop': 'You chose to leave.',
  'rest.merchant.name': 'Mysterious Merchant',
  'rest.merchant.desc': 'A mysterious traveler offers you a deal.',
  'rest.merchant.opt1': 'Spend 50% gold',
  'rest.merchant.opt1d': 'Get a random rare relic',
  'rest.merchant.opt2': 'Take one free',
  'rest.merchant.opt2d': 'Get a random common relic',
  'rest.leave': 'Leave',
  'rest.leave.desc': 'No deal',
  'rest.merchant.rare': 'Spent {cost} gold, got rare relic {icon} {name}!',
  'rest.merchant.rare_fail': 'Spent {cost} gold, but no relics available.',
  'rest.merchant.common': 'Got free common relic {icon} {name}!',
  'rest.merchant.common_fail': 'No common relics available.',
  'rest.trial.name': 'Trial of the Typing God',
  'rest.trial.desc': 'The Typing God descends with a choice.',
  'rest.trial.power': 'Power',
  'rest.trial.power_d': 'Next Act: Mult +1.0×, but Time -10s',
  'rest.trial.endurance': 'Endurance',
  'rest.trial.endurance_d': 'Next Act: Time +15s, but Mult -0.5×',
  'rest.trial.leave_d': 'Decline trial',
  'rest.trial.power_r': 'Next Act: Mult +1.0x, but Time -10s!',
  'rest.trial.endurance_r': 'Next Act: Time +15s, but Mult -0.5x!',
  'rest.altar.name': 'Skill Altar',
  'rest.altar.desc': 'An ancient altar radiates power. Sacrifice a skill for reward.',
  'rest.altar.upgrade': 'Sacrifice for skill',
  'rest.altar.upgrade_d': 'Lose a random skill, gain a new one',
  'rest.altar.gold': 'Sacrifice for gold',
  'rest.altar.gold_d': 'Lose a random skill, gain 200 gold',
  'rest.altar.leave_d': 'No sacrifice',
  'rest.altar.no_skill': 'No skills to sacrifice.',
  'rest.altar.upgrade_r': 'Sacrificed {removed}, got new skill {icon} {name}!',
  'rest.altar.upgrade_fail': 'Sacrificed {removed}, but no new skills available.',
  'rest.altar.gold_r': 'Sacrificed {removed}, got 200 gold!',
  'rest.gamble.name': "Gambler's Dice",
  'rest.gamble.desc': 'A gambler shows you a pair of dice. Feeling lucky?',
  'rest.gamble.bet': 'Bet 100 gold',
  'rest.gamble.bet_d': '50% win 300 gold, 50% lose 100 gold',
  'rest.gamble.leave_d': "Don't gamble",
  'rest.gamble.no_gold': 'Not enough gold!',
  'rest.gamble.win': 'Won! Got 300 gold! (net +200)',
  'rest.gamble.lose': 'Lost! -100 gold!',
  'rest.forge.name': 'Relic Forge',
  'rest.forge.desc': 'A blazing forge can destroy your gear and transform it.',
  'rest.forge.relic': 'Destroy relic',
  'rest.forge.relic_d': 'Destroy a random relic, upgrade a random skill +1',
  'rest.forge.skill': 'Destroy skill',
  'rest.forge.skill_d': 'Destroy a random skill, get a random relic',
  'rest.forge.leave_d': "Don't forge",
  'rest.forge.no_relic': 'No relics to destroy.',
  'rest.forge.relic_r': 'Destroyed {icon} {name}, {skill} upgraded to Lv.{level}!',
  'rest.forge.relic_fail': 'Destroyed {icon} {name}, but no skills to upgrade.',
  'rest.forge.no_skill': 'No skills to destroy.',
  'rest.forge.skill_r': 'Destroyed {removed}, got relic {icon} {name}!',
  'rest.forge.skill_fail': 'Destroyed {removed}, but no relics available.',
  'rest.rift.name': 'Time Rift',
  'rest.rift.desc': 'A rift in time appears. You can alter your journey.',
  'rest.rift.skip': 'Skip next stage',
  'rest.rift.skip_d': 'Skip one stage (less rewards)',
  'rest.rift.replay': 'Replay last stage',
  'rest.rift.replay_d': 'Replay for extra gold',
  'rest.rift.leave_d': "Don't interfere",
  'rest.rift.skip_r': 'Time rift opens, skipped a stage! Heading to Level {level}.',
  'rest.rift.skip_fail': 'Time rift unstable, cannot jump.',
  'rest.rift.replay_r': 'Time rewind! Got 50 extra gold.',
  'rest.curse.name': 'Keyboard Curse',
  'rest.curse.desc': 'Dark whispers: accept the curse for power. 2 keys sealed until Act end.',
  'rest.curse.accept': 'Accept curse',
  'rest.curse.accept_d': 'Seal 2 random keys, get 150 gold + random relic',
  'rest.curse.reject': 'Reject',
  'rest.curse.reject_d': 'Leave',
  'rest.curse.r': 'Keys [{keys}] sealed! Got 150 gold{relic}. (Restores after Act)',
  'rest.curse.relic_bonus': ' + relic {icon} {name}',
  'rest.copier.name': 'Skill Copier',
  'rest.copier.desc': 'A machine can copy your skills, but at a cost.',
  'rest.copier.copy': 'Copy skill',
  'rest.copier.copy_d': 'Random skill +1 level, but next Act target ×1.5',
  'rest.copier.leave_d': "Don't copy",
  'rest.copier.no_skill': 'No skills to upgrade.',
  'rest.copier.r': '{name} upgraded to Lv.{level}! But next Act target ×1.5.',
  'rest.wheel.name': 'Wheel of Destiny',
  'rest.wheel.desc': 'The wheel spins... no one can predict the outcome.',
  'rest.wheel.spin': 'Spin the wheel',
  'rest.wheel.spin_d': 'Random fortune or misfortune',
  'rest.wheel.gold': 'Lucky! Got {gold} gold!',
  'rest.wheel.relic': 'Lucky! Got relic {icon} {name}!',
  'rest.wheel.lose_gold': 'Unlucky! Lost {cost} gold (30%)!',
  'rest.wheel.lose_mult': 'Unlucky! Next Act Mult -0.5x!',
  'rest.wheel.prefix': 'The wheel spins... ',
  'rest.meditate.name': 'Serene Meditation',
  'rest.meditate.desc': 'In tranquility, foresee the future or gather strength.',
  'rest.meditate.preview': 'Meditate & foresee',
  'rest.meditate.preview_d': 'Preview next Act boss modifiers',
  'rest.meditate.gold': 'Gather strength',
  'rest.meditate.gold_d': 'Get 80 gold',
  'rest.meditate.empty': 'You see only peace... no more info.',
  'rest.meditate.modifier': 'Modifier {idx}: {icon} {name} — {hint}',
  'rest.meditate.result': 'Meditation foresees:\n{previews}',
  'rest.meditate.gold_r': 'Gathered strength, got 80 gold!',
  'rest.default': 'Nothing happens.',
}

// === Demo 物品名翻译（仅 Demo 池 ~48 个） ===
const ITEM_NAMES_EN: Record<string, string> = {
  // Producers
  prod_burst: 'Burst', prod_focus: 'Focus', prod_loot: 'Loot',
  prod_crit: 'Crit', prod_boost: 'Boost', prod_frenzy: 'Frenzy',
  prod_freeze: 'Freeze', prod_eternal: 'Eternal', prod_mint: 'Mint',
  prod_treasury: 'Treasury', prod_harvest: 'Harvest', prod_refine: 'Refine',
  // Converters (demo pool)
  conv_base_score_add: 'Cash Out', conv_mult_score_add: 'Overflow',
  conv_time_base_add: 'Etch', conv_gold_base_add: 'Acquire',
  conv_score_mult_add: 'Momentum',
  // Relics — all
  lucky_coin: 'Lucky Coin', phoenix_feather: 'Phoenix Feather',
  perfect_rhythm: 'Perfect Rhythm', forge_heart: 'Forge Heart',
  cornucopia: 'Cornucopia', spark_core: 'Spark Core',
  campfire_ember: 'Campfire Ember', ramen: 'Ramen',
  overkill_blade: 'Overkill Blade', glass_cannon: 'Glass Cannon',
  time_thief: 'Time Thief', greedy_hand: 'Greedy Hand',
  silence_vow: 'Silence Vow', doomsday: 'Doomsday',
  chain_surge: 'Chain Surge', stack_resonance: 'Stack Resonance',
  resource_flood: 'Resource Flood', home_advantage: 'Home Row Advantage',
  ambidextrous: 'Ambidextrous', twin_bond: 'Twin Bond',
  lone_wolf: 'Lone Wolf', time_bank: 'Time Bank',
  overcharge: 'Overcharge', star_chart: 'Star Chart',
  entropy: 'Entropy', schrodinger_dice: "Schrödinger's Dice",
  perfectionist: 'Perfectionist', chain_ban: 'Chain Ban',
  no_enchant_vow: 'No-Enchant Vow', keyboard_flood: 'Keyboard Flood',
  pure_heart: 'Pure Heart', minimalist: 'Minimalist',
  echo_bell: 'Echo Bell', storm_drum: 'Storm Drum', finale: 'Finale',
  apprentice_notes: 'Apprentice Notes', primal_mutant: 'Primal Mutant',
  ultimate_mutant_strain: 'Ultimate Mutant Strain',
  gene_stabilizer: 'Gene Stabilizer',
  chaos_seed: 'Chaos Seed',
  fittest_survivors: 'Fittest Survivors', masters_lexicon: "Master's Lexicon",
  perpetual_queue: 'Perpetual Queue',
  word_scissors: 'Word Scissors', resonance_mold: 'Resonance Mold',
  // Typing subsystem relics
  typing_wax_seal: 'Wax Seal', echo_thimble: 'Echo Thimble',
  little_helper: 'Little Helper', rhythm_adapt: 'Rhythm Adapt',
  glass_cannon_v2: 'Glass Cannon v2',
  // Combo subsystem relics
  combo_buffer: 'Combo Buffer', multiplier_prism: 'Multiplier Prism',
  rhythm_doctor: 'Rhythm Doctor', combo_detonator: 'Combo Detonator',
  immortal_combo: 'Immortal Chain',
  // Skill subsystem relics
  first_strike: 'First Strike', less_is_more: 'Less is More',
  training_manual: 'Training Manual', jazz: 'Jazz',
  uncrowned_king: 'Uncrowned King',
  // Enchantment subsystem relics
  apprentice_robe: 'Apprentice Robe', trial_badge: 'Trial Badge',
  fate_fork: 'Fork of Fate', early_awakening: 'Early Awakening',
  enchant_anchor: 'Enchant Anchor',
  // Topology subsystem relics
  adjacent_power: 'Adjacent Power', symmetry_pact: 'Symmetry Pact',
  row_medal: 'Row Medal', dual_concerto: 'Dual Concerto',
  key_storm: 'Key Storm',
  // Word subsystem relics
  word_collection: 'Word Collection', short_sprint: 'Short Sprint',
  long_word_master: 'Long Word Master', word_dealer: 'Word Dealer',
  punctuation_liberation: 'Punctuation Liberation',
  // Resource subsystem relics
  score_magnet: 'Score Magnet', resource_sense: 'Resource Sense',
  time_dew: 'Time Dew', resource_tide: 'Resource Tide',
  universal_furnace: 'Universal Furnace',
  // Shop subsystem relics
  discount_card: 'Discount Card', recycle_expert: 'Recycle Expert',
  black_market: 'Black Market Pass', smuggle_pass: 'Smuggle Pass',
  timed_auction: 'Timed Auction',
  // Stage subsystem relics
  warm_up: 'Warm-Up', intermission: 'Intermission',
  endurance_battery: 'Endurance Battery', elite_hunter: 'Elite Hunter',
  phoenix: 'Phoenix',
  // Enchantments — Growth
  ench_growth_adjacent: 'Absorb', ench_growth_sameRow: 'Infect',
  ench_growth_sameColumn: 'Pulse', ench_growth_sameHand: 'Permeate',
  ench_growth_sameFinger: 'Pierce', ench_growth_symmetric: 'Resonate',
  // Enchantments — Splash
  ench_splash_adjacent: 'Ripple', ench_splash_sameRow: 'Sweep',
  ench_splash_sameColumn: 'Impale', ench_splash_sameHand: 'Radiate',
  ench_splash_sameFinger: 'Infuse', ench_splash_symmetric: 'Project',
  // Enchantments — Resonance
  ench_resonance_adjacent: 'Sense', ench_resonance_sameRow: 'Chorus',
  ench_resonance_sameColumn: 'Echo', ench_resonance_sameHand: 'Sync',
  ench_resonance_sameFinger: 'Link', ench_resonance_symmetric: 'Telepathy',
  // Enchantments — Repulsion
  ench_repulsion_adjacent: 'Void', ench_repulsion_sameRow: 'Wasteland',
  ench_repulsion_sameColumn: 'Abyss', ench_repulsion_sameHand: 'Silence',
  ench_repulsion_sameFinger: 'Sever', ench_repulsion_symmetric: 'Mirror Void',
  // Enchantments — Devour
  ench_devour_adjacent: 'Devour:Adj', ench_devour_sameRow: 'Devour:Row',
  ench_devour_sameColumn: 'Devour:Col', ench_devour_sameHand: 'Devour:Hand',
  ench_devour_sameFinger: 'Devour:Finger', ench_devour_symmetric: 'Devour:Mirror',
  // Enchantments — Transmutation
  ench_trans_base: 'Empower', ench_trans_score: 'Gild',
  ench_trans_multiplier: 'Ignite', ench_trans_time: 'Hasten',
  // Enchantment — Mastery
  ench_mastery: 'Mastery',
  // Enchantments — Class-restricted apprentice
  ench_harvest: 'Harvest',
  ench_adapt: 'Adapt',
}

const ITEM_DESCS_EN: Record<string, string> = {
  // Producers — short descriptions
  prod_burst: '⚔️Base +5', prod_focus: '⚔️Base ×2',
  prod_loot: '🪙Score +15', prod_crit: '🪙Score ×1.1',
  prod_boost: '🔥Mult +0.2', prod_frenzy: '🔥Mult ×1.15',
  prod_freeze: '⏳Time +2s', prod_eternal: '⏳Time ×1.2',
  prod_mint: '💰Gold +3', prod_treasury: '💰Gold ×1.3',
  // Converters (demo pool)
  conv_base_score_add: '🪙Score+⚔️Base', conv_mult_score_add: '🪙Score+(🔥Mult×8)',
  conv_time_base_add: '⚔️Base+(⏳Time×0.15)', conv_gold_base_add: '⚔️Base+(💰Gold×0.4)',
  conv_score_mult_add: '🔥Mult+(🪙Score×0.0002)',
  // Producers (class-specific, in case they appear)
  prod_harvest: '🔤Fragment +1', prod_refine: '🔤Fragment ×1.5',
  // Relics — all
  lucky_coin: 'Shop prices -10%',
  phoenix_feather: '30% chance to protect combo on error',
  perfect_rhythm: 'Perfect word refunds 50% time',
  forge_heart: 'After producer trigger, converter output +15%',
  cornucopia: '+15 gold at start of each stage',
  spark_core: 'With ≥3 producers, producer output +20%',
  campfire_ember: '+5% score per skill purchased (resets per act)',
  ramen: 'Fast word(<2s) score +30%, slow(>4s) score -20%',
  overkill_blade: 'Overkill score converts to extra gold',
  glass_cannon: 'Skill score ×3, but any error = stage fail',
  time_thief: 'Skill trigger +0.3s, but base time halved',
  greedy_hand: 'Gold ×1.5, but shop prices +50%',
  silence_vow: 'Score ×5 with no skills, but can\'t equip skills',
  doomsday: '+30s per stage, but -5s base time each stage',
  chain_surge: 'Chained skill output +25%',
  stack_resonance: 'When any amplifier stacks ≥15, skill output +10%',
  resource_flood: 'Word score +20% when ≥3 resource types produced',
  home_advantage: 'Home row (ASDFGHJKL) skill output +30%',
  ambidextrous: 'Word score +30% when both hands triggered',
  twin_bond: 'Paired adjacent skills output +25%',
  lone_wolf: 'Isolated skill (no neighbors) output ×1.8',
  time_bank: 'Remaining time converts to gold (1s = 1g)',
  overcharge: 'Producer effect +50%, but -0.1s per producer trigger',
  star_chart: '+8% score per enchantment (permanent)',
  entropy: 'Resource output +30%, -5% per stage, vanishes at 0',
  schrodinger_dice: 'Score ×1.25, 50% double / 50% vanish per stage',
  perfectionist: 'Score ×2, but lost permanently on combo break',
  chain_ban: 'Skill output +30%, but connectors disabled',
  no_enchant_vow: 'Skill output +40%, but no new enchantments',
  keyboard_flood: 'Output +25% with ≥15 skills, no upgrade/enchant',
  pure_heart: 'Producer effect ×3, but producers only',
  minimalist: 'Max 5 skills all Lv3, word score ×2',
  echo_bell: 'First skill per word triggers twice',
  storm_drum: 'Producer skills trigger twice',
  finale: 'Skills trigger twice at combo ≥20',
  apprentice_notes: 'Wordsmith starter. Start with ×3 vowel fragments',
  primal_mutant: 'Metamorph starter. First metamorph per stage is free',
  ultimate_mutant_strain: 'First 2 metamorphs free, +1 mutagen per metamorph',
  gene_stabilizer: 'Unlock single-affix mutation (replace one affix only)',
  chaos_seed: 'Random unenchanted skill gets enchanted each stage',
  fittest_survivors: 'Metamorphed skills output +20% this stage',
  masters_lexicon: 'All letter fragments +2, harvest queue +2 slots',
  perpetual_queue: 'Auto-harvest one round at battle start',
  word_scissors: 'Disassemble crafted words, refund all fragments',
  resonance_mold: 'Duplicate letters cost no gold when crafting',
  // Typing subsystem relics
  typing_wax_seal: 'First typo per word forgiven',
  echo_thimble: '8% chance on correct key: double keystroke (combo+1, skill triggers again)',
  little_helper: 'Repeat words: press Tab after first letter to auto-complete',
  rhythm_adapt: 'Word time >3s: +1s time; <3s: word score +30%',
  glass_cannon_v2: 'Score ×2, but any typo = instant death. Wax Seal forgives still apply.',
  // Combo subsystem relics
  combo_buffer: 'On combo break, keep 50% combo (floor)',
  multiplier_prism: 'Mult ≥2.5: skill output +20%',
  rhythm_doctor: 'Every 10 combo: +1s time',
  combo_detonator: 'At combo 15/30/45: randomly trigger 3 equipped skills',
  immortal_combo: 'Combo persists across stages (still breaks on error), but skills no longer produce multiplier.',
  // Skill subsystem relics
  first_strike: 'First skill trigger per word: output +20%',
  less_is_more: 'With <10 skills equipped: skill output +20%',
  training_manual: 'On acquire: upgrade all Lv.1 skills to Lv.2',
  jazz: '≥3 unique affix types in one word: score +10% × unique count',
  uncrowned_king: 'Unenchanted skills can level past Lv.3 (+60%/lv), but enchanting is disabled',
  // Enchantment subsystem relics
  apprentice_robe: 'All Apprentice enchantment growth ×1.3',
  trial_badge: 'All Trial enchantment stack progress ×1.3',
  fate_fork: 'Enchantment selection offers 3 choices instead of 2',
  early_awakening: 'Enchantment unlock threshold lowered from Lv.3 to Lv.2',
  enchant_anchor: 'All skills gain +1 enchantment slot, but each active enchantment increases shop prices by 10%',
  // Topology subsystem relics
  adjacent_power: 'On skill trigger: +6% output per adjacent equipped skill',
  symmetry_pact: 'When both symmetric keys have skills: each gains +15% output',
  row_medal: 'Randomly assigns a row — skills on that row gain +25% output',
  dual_concerto: 'Each left-right hand alternation on keypress: +0.5s time',
  key_storm: 'Score ×0.5. On word complete, each hit skill randomly triggers 1 unhit equipped skill.',
  // Word subsystem relics
  word_collection: 'First time completing a word: +3 gold',
  short_sprint: '≤4-letter words: skill output +20%',
  long_word_master: '6+ letter words on complete: +1s time',
  word_dealer: 'After selling a word, next shop refresh is free',
  punctuation_liberation: 'Unlock ;,./ keys for skill binding. Words include random punctuation.',
  // Resource subsystem relics
  score_magnet: 'Each keystroke: +1 score',
  resource_sense: 'When a word produces 3+ resource types, the lowest gets +50%',
  time_dew: 'Every 3 words completed: +1s time',
  resource_tide: 'Odd words: base +40%. Even words: multiplier +40%',
  universal_furnace: 'On stage clear: overkill score + remaining time → gold, but no base clear gold',
  // Shop subsystem relics
  discount_card: 'All shop prices -15%',
  recycle_expert: 'Skill sell price +50% (50% → 75%)',
  black_market: 'Shop gains +1 item slot (guaranteed rare+)',
  smuggle_pass: 'Each stage: take the cheapest shop item for free',
  timed_auction: 'Refresh is free, but shop has a 30s countdown',
  // Stage subsystem relics
  warm_up: 'First 10s each stage: skill output +40%',
  intermission: 'Rest stages grant +10 gold and 1 free refresh',
  endurance_battery: 'Each stage base time +10s',
  elite_hunter: 'Elite stage clear gold reward doubled',
  phoenix: 'On stage fail: revive with 10s. Consumes this relic. Elite/Boss: also refreshes modifier.',
  // Enchantments — Growth
  ench_growth_adjacent: '🔗Adj skill fires: own output perma +3%',
  ench_growth_sameRow: '📡Row skill fires: own output perma +2%',
  ench_growth_sameColumn: '📌Col skill fires: own output perma +4%',
  ench_growth_sameHand: '🤝Hand skill fires: own output perma +1%',
  ench_growth_sameFinger: '👆Finger skill fires: own output perma +5%',
  ench_growth_symmetric: '🪞Mirror skill fires: own output perma +6%',
  // Enchantments — Splash
  ench_splash_adjacent: 'After fire: split-trigger 🔗adj non-replicators',
  ench_splash_sameRow: 'After fire: split-trigger 📡row non-replicators',
  ench_splash_sameColumn: 'After fire: split-trigger 📌col non-replicators',
  ench_splash_sameHand: 'After fire: split-trigger 🤝hand non-replicators',
  ench_splash_sameFinger: 'After fire: split-trigger 👆finger non-replicators',
  ench_splash_symmetric: 'After fire: split-trigger 🪞mirror non-replicators',
  // Enchantments — Resonance
  ench_resonance_adjacent: '🔗Adj skill fires: self fires at 50% eff.',
  ench_resonance_sameRow: '📡Row skill fires: self fires at 30% eff.',
  ench_resonance_sameColumn: '📌Col skill fires: self fires at 40% eff.',
  ench_resonance_sameHand: '🤝Hand skill fires: self fires at 15% eff.',
  ench_resonance_sameFinger: '👆Finger skill fires: self fires at 50% eff.',
  ench_resonance_symmetric: '🪞Mirror skill fires: self fires at 60% eff.',
  // Enchantments — Repulsion
  ench_repulsion_adjacent: '🔗Per empty adj slot: output +25%',
  ench_repulsion_sameRow: '📡Per empty row slot: output +10%',
  ench_repulsion_sameColumn: '📌Per empty col slot: output +30%',
  ench_repulsion_sameHand: '🤝Per empty hand slot: output +5%',
  ench_repulsion_sameFinger: '👆Per empty finger slot: output +35%',
  ench_repulsion_symmetric: '🪞Mirror slot empty: output +50%',
  // Enchantments — Devour
  ench_devour_adjacent: 'Every 5 fires: devour weakest 🔗adj skill, +20%/devoured',
  ench_devour_sameRow: 'Every 5 fires: devour weakest 📡row skill, +20%/devoured',
  ench_devour_sameColumn: 'Every 5 fires: devour weakest 📌col skill, +20%/devoured',
  ench_devour_sameHand: 'Every 5 fires: devour weakest 🤝hand skill, +20%/devoured',
  ench_devour_sameFinger: 'Every 5 fires: devour weakest 👆finger skill, +20%/devoured',
  ench_devour_symmetric: 'Every 5 fires: devour weakest 🪞mirror skill, +20%/devoured',
  // Enchantments — Transmutation
  ench_trans_base: 'After fire: extra ⚔️Base output (30% of this fire)',
  ench_trans_score: 'After fire: extra 🪙Score output (30% of this fire)',
  ench_trans_multiplier: 'After fire: extra 🔥Mult output (10% of this fire)',
  ench_trans_time: 'After fire: extra ⏳Time output (20% of this fire)',
  // Enchantment — Mastery
  ench_mastery: 'Every 10 fires: own output perma +8%',
  // Enchantments — Wordsmith class
  ench_harvest: 'Each word crafted: own output perma +8%',
  ench_letter_affinity: 'Harvest queue has this key\'s letter: output +25%',
  ench_overflow: 'Per fragment type ≥15: output +20% (+5% per extra type)',
  // Enchantments — Metamorph class
  ench_adapt: 'Per metamorph on this key: output perma +15%',
  ench_unstable: 'Random resource +30% each stage, resets at stage end',
  ench_mutation_hunger: '5% chance to produce 1 mutagen on fire',
}

// === 核心 t() 函数 ===
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = currentLocale === 'en' ? EN : ZH
  let str = dict[key]
  if (str === undefined) {
    // fallback: ZH dict, then raw key
    str = ZH[key] ?? key
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v))
    }
  }
  return str
}

// === DOM 扫描替换 ===
export function applyHtmlI18n(): void {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = (el as HTMLElement).dataset.i18n!
    el.textContent = t(key)
  })
}

// === 物品名/描述翻译 ===
export function localizeItemName(id: string, zhName: string): string {
  if (currentLocale === 'zh') return zhName
  return ITEM_NAMES_EN[id] ?? zhName
}

export function localizeItemDesc(id: string, zhDesc: string): string {
  if (currentLocale === 'zh') return zhDesc
  return ITEM_DESCS_EN[id] ?? zhDesc
}

// === 资源标签翻译 ===
export function getResourceLabel(resourceKey: string): string {
  return t(`resource.${resourceKey}`)
}
