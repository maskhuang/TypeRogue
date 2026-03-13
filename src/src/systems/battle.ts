// ============================================
// 打字肉鸽 - 战斗系统
// ============================================

import { state, synergy, calculateTargetScore, resetResources, createBattleStats } from '../core/state';
import { resolveRelicEffects, resolveRelicEffectsWithBehaviors, queryRelicFlag } from './relics/RelicPipeline';
import { eventBus } from '../core/events/EventBus';
import { inputHandler } from './typing/InputHandler';
import { getElements } from '../ui/elements';
import { RELICS, MAX_RELIC_SLOTS } from '../data/relics';
import { juiceUp, bumpCombo, bumpScore, bumpMultiplier, bumpTimer, getFloatScale, screenShake, getShakeIntensity, getScoreTier, SCORE_TIER_CLASSES, ScoreRoller, triggerSlowMotion, getTimeScale, checkMilestone, showMilestoneCelebration, showRatingReveal, calculateRating } from '../effects/juice';
import { playSound, initAudio, playScoreSound, playRatingSound, startBGM, stopBGM, updateBGMTension, releaseBGMTension } from '../effects/sound';
import { spawnParticles } from '../effects/particles';
import { triggerSkill, clearPseudoInfinite, resetWordResourceTypes, getWordResourceTypeCount, updateChargeProducers } from './skills';
import { HAND_MAP } from '../data/keyboardTopology';
import { openShop } from './shop';
import { hasUnownedRelics, showRelicPicker, RELIC_WEIGHT_PRESETS } from './relicPicker';
import { getLetterScoreModifiers } from './letters/LetterFrequencySystem';
import { ModifierRegistry } from './modifiers/ModifierRegistry';
import { EffectPipeline } from './modifiers/EffectPipeline';
import { keyTooltip } from '../ui/keyboard/KeyTooltip';
import { getStageType, getCycleTimeLimit, getBattleNumber, getEliteModifierIndex, getActForNode, TOTAL_NODES } from './stage/stageFlow';
import { getBossModifierMeta, getActiveParams, incrementDiminishCount, getDiminishMultiplier, transformWordForModifier, drawBossModifiers, isScrollActive, initScrollWord, checkScrollLetterState, markScrollMiss } from '../data/bossModifiers';
import type { BossModifierMeta } from '../data/bossModifiers';
import { applyModifier, cleanupModifier, tickModifier, startBossRotation, stopBossRotation, isModifierActive } from './bossModifierEngine';
import { showBossModifierPicker } from './bossModifierPicker';
import { showActTransition, showEliteAnnouncement, showBossIntro, updateStageInfo } from './actTransition';
import { random, setNormalMode } from '../core/seededRandom';
import { routeFragmentsToInventory, getMaxQueueLength } from './classes/FragmentQueue';
import { checkWaxSealForgive, resetWaxSeal, checkEchoThimble, canAutocomplete, calculateRhythmAdapt, hasGlassCannon, resetTypingRelicState, trackWord, initTypingRelicBehaviors } from './relics/TypingRelicBehaviors';
import { calculateComboBuffer, checkRhythmDoctor, checkComboDetonator, hasImmortalCombo, shouldBlockMultiplierResource, syncRhythmDoctorMilestone, resetComboRelicState, initComboRelicBehaviors, getMultiplierPrismBonus } from './relics/ComboRelicBehaviors';
import { checkJazzBonus, resetSkillRelicState, initSkillRelicBehaviors, hasUncrownedKing } from './relics/SkillRelicBehaviors';
import { resetEnchantmentRelicState, initEnchantmentRelicBehaviors } from './relics/EnchantmentRelicBehaviors';
import { checkDualConcerto, resetDualConcertoHand, checkKeyStorm, incrementStormWordCount, resetTopologyRelicState, initTopologyRelicBehaviors } from './relics/TopologyRelicBehaviors';
import { filterEnchantmentCandidates, getTransmuteEligibleResources } from '../data/affixTrigger';
import { filterEnchantmentsByClass, EnchantmentType as EnchantmentTypeEnum } from '../data/affixes';
import { IS_DEMO, DEMO_FIRST_STAGE_WORDS, DEMO_TARGET_SCORES } from '../demo/demo-config';
import { initDemoTutorial } from '../demo/demo-tutorial';
import { showDemoEndScreen } from '../demo/demo-end-screen';
import { trackEvent } from '../demo/demo-analytics';
import { t, localizeItemName, localizeItemDesc } from '../demo/demo-i18n';

// === Demo 固定词序队列 ===
let demoWordQueue: string[] = [];

/** 获取当前精英关的修饰器元数据（非精英关返回 undefined） */
function getCurrentEliteModifierMeta(): BossModifierMeta | undefined {
  const modIdx = getEliteModifierIndex(state.level);
  if (modIdx < 0) return undefined;
  const modId = state.bossModifierPool[modIdx];
  return modId ? getBossModifierMeta(modId) : undefined;
}

// === 混沌种子临时附魔追踪 ===
// Map<skillId, enchantmentId> — 记录本关由混沌种子添加的临时附魔
let chaosSeedEnchantments: Map<string, string> = new Map();

/** 混沌种子：给所有未附魔技能随机临时附魔 */
export function applyChaosSeedEnchantments(): void {
  if (!state.player.relics.has('chaos_seed')) return;
  const playerClass = state.classId !== 'none' ? state.classId : undefined;
  for (const [skillId, skill] of state.affixSkills) {
    if (skill.enchantmentIds.length > 0) continue;
    // Story 36.4: 无冕之王 — 不给无附魔技能添加临时附魔
    if (hasUncrownedKing()) continue;
    const candidates = filterEnchantmentsByClass(
      filterEnchantmentCandidates(skill),
      playerClass,
    );
    if (candidates.length === 0) continue;
    const chosen = candidates[Math.floor(random() * candidates.length)];
    skill.enchantmentIds.push(chosen);
    // Transmute：随机分配目标资源
    if (chosen === EnchantmentTypeEnum.Transmute) {
      const eligible = getTransmuteEligibleResources(skill.resource, playerClass);
      if (eligible.length > 0) {
        skill.transmuteResource = eligible[Math.floor(random() * eligible.length)];
      }
    }
    chaosSeedEnchantments.set(skillId, chosen);
  }
}

/** 混沌种子：移除本关添加的临时附魔 */
export function removeChaosSeedEnchantments(): void {
  for (const [skillId, enchId] of chaosSeedEnchantments) {
    const skill = state.affixSkills.get(skillId);
    if (!skill) continue;
    const idx = skill.enchantmentIds.indexOf(enchId);
    if (idx >= 0) skill.enchantmentIds.splice(idx, 1);
    // 清理 transmuteResource（如果是 Transmute 且无其他 Transmute 附魔）
    if (enchId === (EnchantmentTypeEnum.Transmute as string) && !skill.enchantmentIds.includes(enchId)) {
      skill.transmuteResource = undefined;
    }
  }
  chaosSeedEnchantments.clear();
}

// === Act 过渡追踪 ===
let lastAct = 0;

/** 重置 Act 过渡追踪（新游戏时调用） */
export function resetLastAct(): void { lastAct = 0; chaosSeedEnchantments.clear(); }

/**
 * Boss 胜利后的周目推进状态变更（提取为独立函数以便测试）
 * - cycle++, level=1
 * - 清除 tempBuffs/sealedKeys
 * - 重置 Act 过渡状态
 * - 重抽 bossModifierPool
 */
export function advanceCycle(): void {
  state.cycle++;
  state.level = 1;
  resetLastAct();
  state.tempBuffs = [];
  state.sealedKeys = [];
  state.bossModifierPool = drawBossModifiers(3);
}

// === 计时器 ===
let timerInterval: ReturnType<typeof setInterval> | null = null;

// === 分数结算 ===
let wordBaseScore = 0; // 词语基础分（不含倍率）
let wordStartTime = 0; // T1遗物：词语开始时的剩余时间（用于完美韵律时间返还）
let settlementTimeouts: ReturnType<typeof setTimeout>[] = []; // 所有结算相关的定时器
let lastScoreTier = ''; // 缓存上一次分数分级，避免每帧重启 CSS 动画 (Review M1)
let lastSkillBase = 0; // 技能基数产出缓存（变化时弹跳）
let lastSkillMult = 0; // 技能倍率产出缓存（变化时弹跳）
let letterRegistry: ModifierRegistry | null = null; // 字母升级注册表（每关开始时构建）
let leftHandTriggered = false; // T5遗物：本词左手技能是否触发过
let rightHandTriggered = false; // T5遗物：本词右手技能是否触发过
let wordStartScore = 0; // 玻璃大炮：记录词开始时总分（用于整词得分翻倍）

// === 分数滚轮动画 (Story 31.4) ===
const scoreRoller = new ScoreRoller();
let scoreRollerRaf: number | null = null;
let scoreRollerLastTime = 0;

/** 分数滚轮 rAF 帧更新 (Story 31.4) */
function scoreRollerTick(now: number): void {
  if (!scoreRollerLastTime) scoreRollerLastTime = now;
  const dt = (now - scoreRollerLastTime) / 1000; // 转换为秒
  scoreRollerLastTime = now;
  const display = scoreRoller.update(dt);
  const el = getElements();
  el.score.textContent = String(display);
  scoreRollerRaf = requestAnimationFrame(scoreRollerTick);
}

function startScoreRoller(): void {
  stopScoreRoller();
  scoreRollerLastTime = 0;
  scoreRollerRaf = requestAnimationFrame(scoreRollerTick);
}

function stopScoreRoller(): void {
  if (scoreRollerRaf !== null) {
    cancelAnimationFrame(scoreRollerRaf);
    scoreRollerRaf = null;
  }
}

// === 屏幕管理 ===
export function showScreen(name: 'battle' | 'shop' | 'gameover' | 'rest'): void {
  const el = getElements();
  el.battleScreen.style.display = name === 'battle' ? 'flex' : 'none';
  el.shopScreen.style.display = name === 'shop' ? 'flex' : 'none';
  el.restScreen.style.display = name === 'rest' ? 'flex' : 'none';
  el.gameoverScreen.style.display = name === 'gameover' ? 'flex' : 'none';
}

// === 词语系统 ===
function getActiveWords(): string[] {
  return state.player.wordDeck.length > 0 ? state.player.wordDeck : ['fire', 'ice', 'bolt', 'spark', 'flame'];
}

function pickWord(): string {
  // Demo 第一关：固定前 N 个词保证触发预设技能
  if (demoWordQueue.length > 0) {
    return demoWordQueue.shift()!.toUpperCase();
  }
  const words = getActiveWords();
  return words[Math.floor(random() * words.length)].toUpperCase();
}

function setWord(): void {
  state.player.word = transformWordForModifier(pickWord());
  state.player.index = 0;
  state.wordScore = 0;
  wordBaseScore = 0; // 重置基础分
  lastSkillBase = 0; // 重置技能产出弹跳缓存
  lastSkillMult = 0;
  state.resources.base = 0; // 重置资源基数
  state.resources.score = 0; // 重置即时加分
  state.wordPerfect = true;
  wordStartTime = state.time; // 记录词语开始时的剩余时间
  wordStartScore = state.score; // 玻璃大炮：记录词开始时总分
  resetWordResourceTypes(); // 重置词级资源追踪
  leftHandTriggered = false; // 重置左右手追踪
  rightHandTriggered = false;
  synergy.wordSkillCount = 0;
  synergy.skillBaseScore = 0;
  synergy.letterBaseScore = 0;
  synergy.lastTriggeredSkillId = null;
  // Story 36.6: 双手协奏手追踪重置
  resetDualConcertoHand();
  // Story 36.2: 蜡封状态重置 + 单词追踪
  resetWaxSeal();
  trackWord(state.player.word);
  renderWord();
  if (isScrollActive()) initScrollWord(state.player.word.length);
  updateSettlementLive(); // 初始化结算面板
}

function renderWord(): void {
  const el = getElements();
  const s = state.player;
  el.word.innerHTML = '';

  for (let i = 0; i < s.word.length; i++) {
    const span = document.createElement('span');
    span.className = 'letter letter-enter';
    span.textContent = s.word[i];
    span.style.animationDelay = `${i * 0.03}s`;

    if (i < s.index) span.classList.add('correct');
    else if (i === s.index) span.classList.add('current');
    else span.classList.add('pending');

    if (s.bindings.has(s.word[i].toLowerCase())) span.classList.add('has-skill');
    el.word.appendChild(span);
  }
}

// === 输入处理 ===
export function initInput(): void {
  // 使用新的 InputHandler + EventBus 架构
  eventBus.on('input:keypress', handleKeyPress);
  inputHandler.enable();
  // Story 36.2: 注册打字子系统遗物行为
  initTypingRelicBehaviors();
  // Story 36.3: 注册连击子系统遗物行为
  initComboRelicBehaviors();
  // Story 36.4: 注册技能子系统遗物行为
  initSkillRelicBehaviors();
  // Story 36.5: 注册附魔子系统遗物行为
  initEnchantmentRelicBehaviors();
  // Story 36.6: 注册拓扑子系统遗物行为
  initTopologyRelicBehaviors();
  // Story 36.2: Tab 键独立监听（InputHandler 只接受单字符键，Tab 需要单独处理）
  document.addEventListener('keydown', handleTabKey);
}

/** Story 36.2: Tab 键处理（小助手自动补全） — 独立于 InputHandler */
function handleTabKey(e: KeyboardEvent): void {
  if (e.key !== 'Tab') return;
  if (state.phase !== 'battle') return;
  if (!canAutocomplete()) return;
  e.preventDefault(); // 阻止浏览器默认焦点切换
  performAutocomplete();
}

/**
 * 处理按键事件（通过 EventBus 接收）
 */
function handleKeyPress(data: { key: string; timestamp: number }): void {
  if (state.phase !== 'battle') return;
  initAudio();

  // 滚屏模式：字母 locked 时忽略按键
  if (isScrollActive()) {
    const scrollState = checkScrollLetterState(state.player.index);
    if (scrollState === 'locked') return;
  }

  const k = data.key.toLowerCase();
  const expect = state.player.word[state.player.index]?.toLowerCase();

  if (k === expect) {
    playerCorrect(k);
    eventBus.emit('word:correct', { key: k, index: state.player.index - 1 });
  } else {
    playerWrong();
    eventBus.emit('word:error', { key: k, expected: expect || '' });
  }
}

/**
 * Story 36.2: 小助手自动补全 — 按顺序执行剩余字母的 playerCorrect 逻辑
 */
function performAutocomplete(): void {
  const word = state.player.word;
  showFeedback('Tab ✓', '#00ff88');
  while (state.player.index < word.length) {
    const k = word[state.player.index].toLowerCase();
    playerCorrect(k);
    eventBus.emit('word:correct', { key: k, index: state.player.index - 1 });
  }
}

function playerCorrect(k: string): void {
  const el = getElements();
  const letter = el.word.children[state.player.index] as HTMLElement;
  const skillId = state.player.bindings.get(k);

  letter.classList.remove('current');
  letter.classList.add('correct');

  // Juice 动画 - 字母弹跳
  juiceUp(letter, 0.2, 2);
  let skillProducedScore = false;
  let skillProducedTime = false;

  // 连击增加
  state.combo++;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  bumpCombo();

  // 计算倍率: 基础 + 连击加成 + 技能倍率加成
  let mult = state.player.baseMultiplier + state.combo * state.player.comboBonus;
  mult += synergy.skillMultBonus;
  state.multiplier = mult;

  // 字母基础分（每个正确击键基础 1 分）
  const letterBase = 1;
  const letterScore = letterBase * state.multiplier;
  wordBaseScore += letterBase; // 累计基础分（用于结算展示）
  state.resources.base += letterBase; // 写入资源
  state.wordScore += letterScore;

  // 字母升级加分：通过缓存的注册表解析 on_correct_keystroke
  if (letterRegistry) {
    const letterResult = EffectPipeline.resolve(letterRegistry, 'on_correct_keystroke', {
      currentKeystrokeKey: k,
    });
    if (letterResult.effects.score > 0) {
      synergy.letterBaseScore += letterResult.effects.score;
    }
  }

  // 触发技能（新系统：所有绑定技能都应触发）
  const shouldTrigger = !!skillId;
  if (shouldTrigger) {
    letter.classList.add('skill-triggered');
    juiceUp(letter, 0.4, 5); // 强力弹跳
    bumpMultiplier();
    // T5 遗物：追踪左右手触发
    const hand = HAND_MAP[k];
    if (hand === 'left') leftHandTriggered = true;
    else if (hand === 'right') rightHandTriggered = true;
    // Story 36.6: 双手协奏 — 左右手交替击键加时间
    const concertoBonus = checkDualConcerto(k);
    if (concertoBonus > 0) {
      state.time += concertoBonus;
      showFeedback(`🎹 +${concertoBonus}秒`, '#00ff88');
    }
    const scoreBefore = state.score;
    const timeBefore = state.time;
    triggerSkill(skillId, k);
    if (state.score > scoreBefore) skillProducedScore = true;
    if (state.time > timeBefore) skillProducedTime = true;
  }

  // Story 36.2: 回声指套 — 8% 概率双重击键（combo+1 + 倍率更新 + 技能二次触发）
  if (checkEchoThimble(random())) {
    state.combo++;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    // 重新计算 multiplier 以反映新 combo
    mult = state.player.baseMultiplier + state.combo * state.player.comboBonus;
    mult += synergy.skillMultBonus;
    state.multiplier = mult;
    if (skillId) {
      triggerSkill(skillId, k);
    }
    showFeedback('Echo!', '#4ecdc4');
  }

  // Story 36.3: 节奏医生 — 每 10 combo +1s（在 combo++ 和 echo combo++ 之后检查）
  const rhythmDocTime = checkRhythmDoctor(state.combo);
  if (rhythmDocTime > 0) {
    state.time += rhythmDocTime;
    showFeedback(`⏱️ +${rhythmDocTime}s`, '#00ff88');
    bumpTimer();
  }

  // Story 36.3: 连击引爆 — combo 达 15/30/45 时随机触发 3 个装备技能
  const detonateCount = checkComboDetonator(state.combo);
  if (detonateCount > 0) {
    const skillIds = Array.from(state.affixSkills.keys());
    const count = Math.min(detonateCount, skillIds.length);
    // Fisher-Yates 洗牌选 count 个技能
    const shuffled = [...skillIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // 用每个技能自身的绑定 key 触发
    for (let i = 0; i < count; i++) {
      const sid = shuffled[i];
      const boundKey = [...state.player.bindings.entries()]
        .find(([, v]) => v === sid)?.[0] ?? k;
      triggerSkill(sid, boundKey);
    }
    showFeedback(`💣 ×${count}`, '#ff6b00');
  }

  spawnParticles(letter, shouldTrigger ? 10 : 5, '#4ecdc4');
  playSound('type');

  state.player.index++;

  // 实时更新结算面板
  updateSettlementLive();

  // 完成词语
  if (state.player.index >= state.player.word.length) {
    completeWord();
  } else {
    const nextLetter = el.word.children[state.player.index] as HTMLElement;
    nextLetter?.classList.remove('pending');
    nextLetter?.classList.add('current');
  }

  updateHUD();

  // 技能产出分数/时间：在 updateHUD 更新数字后再弹跳
  if (skillProducedScore) bumpScore();
  if (skillProducedTime) bumpTimer();
}

function playerWrong(): void {
  const el = getElements();
  const letter = el.word.children[state.player.index] as HTMLElement;

  // Story 36.2: 打字蜡封 — 每词首次错误免除（在 on_error 管道之前检查）
  if (checkWaxSealForgive()) {
    letter?.classList.add('wrong');
    setTimeout(() => letter?.classList.remove('wrong'), 150);
    showFeedback('🕯️', '#ff9500');
    playSound('wrong');
    return; // 免除错误：不触发 on_error 管道、不断 combo、不触发玻璃大炮
  }

  letter?.classList.add('wrong');
  setTimeout(() => letter?.classList.remove('wrong'), 150);

  el.container.classList.add('shake');
  setTimeout(() => el.container.classList.remove('shake'), 120);

  playSound('wrong');

  // Story 36.2: 玻璃大炮 — 打错即死（蜡封免除的错误已 return，不会到达这里）
  if (hasGlassCannon()) {
    showFeedback(t('battle.glass_break'), '#ff0000');
    gameOver();
    return;
  }

  // 遗物 on_error 管道解析（凤凰羽毛等）
  {
    let phoenixProtected = false;
    resolveRelicEffectsWithBehaviors('on_error', { hasError: true }, {
      onComboProtect: (probability: number) => {
        if (Math.random() < probability) {
          phoenixProtected = true;
        }
        return phoenixProtected;
      },
      onInstantFail: () => {
        // 玻璃大炮已在上方单独处理，此处保留接口兼容
      },
    });
    if (phoenixProtected) {
      showFeedback(t('battle.phoenix'), '#ff9500');
      return;
    }
  }

  // 标记词语不完美
  state.wordPerfect = false;

  // Story 36.3: 不灭连击 — combo 永不中断
  if (hasImmortalCombo()) {
    // combo、skillMultBonus、multiplier 全部保持不变，但仍标记不完美
  } else {
    if (state.combo > 5) showFeedback(t('battle.combo_break', { combo: state.combo }), '#ff6b6b');

    // 遗物 on_combo_break 管道解析（完美主义者断连击失去遗物）
    resolveRelicEffectsWithBehaviors('on_combo_break', {}, {
      onRemoveRelic: (relicId: string) => {
        state.player.relics.delete(relicId);
        showFeedback(t('battle.relic_break'), '#ff4444');
      },
    });

    // Story 36.3: 连击缓冲 — 保留 30% combo
    const buffered = calculateComboBuffer(state.combo);
    state.combo = buffered;
    state.lastMilestone = 0;
    synergy.skillMultBonus = 0;
    if (buffered > 0) {
      state.multiplier = state.player.baseMultiplier + buffered * state.player.comboBonus;
    } else {
      state.multiplier = state.player.baseMultiplier;
    }
    // 同步节奏医生 milestone
    syncRhythmDoctorMilestone(buffered);
  }

  // Boss 修饰器：断连即扣（combo_punish）
  const modEffect = getActiveParams();
  if (modEffect?.comboPunishRate && state.score > 0) {
    const penalty = Math.floor(state.score * modEffect.comboPunishRate);
    state.score = Math.max(0, state.score - penalty);
    showFeedback(t('battle.penalty', { value: penalty }), '#ff4444', getFloatScale('score', penalty));
    bumpScore();
  }

  updateHUD();
}

function completeWord(): void {
  const el = getElements();

  // 计算基础分（字母击键 + 技能基础分 + 字母升级底分 + 字母底分加成）
  const baseChips = Math.floor(wordBaseScore + synergy.skillBaseScore + synergy.letterBaseScore + state.player.wordBonus);
  state.resources.base = baseChips;
  state.resources.multiplier = state.multiplier;
  let mult = state.multiplier;
  let bonusMult = 1;

  // 遗物效果：通过管道解析 on_word_complete 效果（含 T1 遗物条件）
  const wordElapsed = Math.max(0, wordStartTime - state.time);
  const wordRelicResult = resolveRelicEffectsWithBehaviors('on_word_complete', {
    combo: state.combo,
    multiplier: state.multiplier,
    totalSkillCount: state.player.skills.size,
    wordPerfect: state.wordPerfect,
    wordResourceTypes: getWordResourceTypeCount(),
    leftHandTriggered,
    rightHandTriggered,
    wordElapsed,
  }, {
    onTimeRefund: (ratio: number) => {
      const refund = wordElapsed * ratio;
      if (refund > 0) {
        state.time += refund;
        showFeedback(`+${refund.toFixed(1)}s`, '#00ff88', getFloatScale('time', refund));
        bumpTimer();
      }
    },
  });
  // 狂战士面具等遗物的 multiply 加成
  bonusMult += wordRelicResult.effects.multiply;

  // Story 36.4: 爵士乐 — 一词内 ≥3 种不同词条类型时得分 +10%×N
  const jazzBonus = checkJazzBonus();
  if (jazzBonus > 0) {
    bonusMult += jazzBonus;
    showFeedback(`🎷 +${Math.round(jazzBonus * 100)}%`, '#ffaa00');
  }

  // Story 36.2: 节奏适应 — 根据单词用时给予时间或分数奖励
  const rhythmResult = calculateRhythmAdapt(wordElapsed);
  if (rhythmResult.timeBonus > 0) {
    state.time += rhythmResult.timeBonus;
    showFeedback(`🎵 +${rhythmResult.timeBonus}s`, '#00ff88');
    bumpTimer();
  }
  bonusMult *= rhythmResult.scoreMult;

  const finalMult = mult * bonusMult;
  // 分数类技能已在触发时即时计入 state.score，此处仅结算 基数×倍率
  let finalWordScore = Math.floor(baseChips * finalMult);

  // Boss 修饰器：单词限额（cap）+ 递减收益（diminish）
  const modEffect = getActiveParams();
  if (modEffect?.scoreCap) {
    finalWordScore = Math.min(finalWordScore, modEffect.scoreCap);
  }
  if (modEffect?.diminishRate) {
    finalWordScore = Math.floor(finalWordScore * getDiminishMultiplier());
    incrementDiminishCount();
  }

  // 显示 Balatro 风格完成动画
  showSettlementComplete(baseChips, finalMult, finalWordScore);

  const prevScore = state.score;
  state.score += finalWordScore;

  // Story 36.2: 玻璃大炮 — 整词得分翻倍（含技能直接加分 + 公式结算分）
  if (hasGlassCannon()) {
    const wordGain = state.score - wordStartScore;
    state.score = wordStartScore + wordGain * 2;
    finalWordScore = state.score - prevScore; // 更新显示用分数
  }

  bumpScore(finalWordScore); // Story 31.4: 弹性缩放

  // Story 31.4: 高分慢动作结算（≥1000 分）
  if (finalWordScore >= 1000) {
    triggerSlowMotion(300, 0.7);
  }

  // Story 31.5: 分数里程碑庆祝
  const milestone = checkMilestone(prevScore, state.score);
  if (milestone) showMilestoneCelebration(milestone);

  // 战后统计
  if (state.battleStats) {
    state.battleStats.wordsCompleted++;
    if (state.wordPerfect) state.battleStats.perfectWords++;
  }

  // 发送词语完成事件
  eventBus.emit('word:complete', {
    word: state.player.word,
    score: finalWordScore,
    perfect: state.wordPerfect
  });

  // Story 36.6: 全键风暴 — 前 3 词完成后触发未命中技能
  incrementStormWordCount();
  const stormTargets = checkKeyStorm(state.player.word, random);
  for (const target of stormTargets) {
    triggerSkill(target.skillId, target.key);
  }
  if (stormTargets.length > 0) {
    showFeedback(`⛈️ ×${stormTargets.length}`, '#aa88ff');
  }

  // 词语完成 - 所有字母一起弹跳
  Array.from(el.word.children).forEach((letter, i) => {
    setTimeout(() => juiceUp(letter as HTMLElement, 0.25, 4 * (i % 2 === 0 ? 1 : -1)), i * 30);
  });

  // 分级屏幕震动（5 档，<100 分不震动）
  const shakeIntensity = getShakeIntensity(finalWordScore);
  if (shakeIntensity > 0) screenShake(shakeIntensity);

  // 音效：里程碑触发时以里程碑等级播放，否则以单词分数播放
  playScoreSound(milestone ? milestone.threshold : finalWordScore);

  // 重置词语基础分
  wordBaseScore = 0;

  // 检查是否达到目标分数 - 提前结束关卡
  if (state.score >= state.targetScore) {
    // 立即停止计时器，防止评分动画期间时间继续走
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    // 隐藏结算面板，防止分数显示继续跳动
    hideSettlement();

    // 计算 overkill：超出目标的总分数
    state.overkill = state.score - state.targetScore;

    const currentType = getStageType(state.level);
    if (currentType === 'boss') {
      // Boss 关胜利跳过金币奖励动画（Boss 后无商店，金币无意义）
      setTimeout(() => {
        if (state.phase === 'battle') endLevel();
      }, 600);
    } else {
      // 显示金币奖励动画，然后结束关卡
      setTimeout(() => {
        if (state.phase === 'battle') {
          showGoldReward(() => endLevel());
        }
      }, 600);
    }
    return;
  }

  // 遗物效果：完成词语时间加成
  if (wordRelicResult.effects.time > 0) {
    state.time += wordRelicResult.effects.time;
    showFeedback(`+${wordRelicResult.effects.time.toFixed(1)}s`, '#00ff88', getFloatScale('time', wordRelicResult.effects.time));
    bumpTimer();
  }

  setTimeout(() => {
    if (state.phase === 'battle') setWord();
  }, 200);
}

// === Balatro 风格分数结算展示 ===

/** 实时更新结算面板（每打一个字调用） */
function updateSettlementLive(): void {
  const settlement = document.getElementById('score-settlement');
  if (!settlement) return;

  const chipsEl = document.getElementById('settlement-chips');
  const multEl = document.getElementById('settlement-mult');
  const finalEl = document.getElementById('settlement-final');

  const chips = Math.floor(wordBaseScore + synergy.skillBaseScore + synergy.letterBaseScore + state.player.wordBonus);
  state.resources.base = chips;
  state.resources.multiplier = state.multiplier;
  const mult = state.multiplier;
  // 分数已即时计入总分，结算面板仅展示 基数×倍率
  const final = Math.floor(chips * mult);

  if (chipsEl) {
    chipsEl.textContent = chips.toLocaleString();
    if (synergy.skillBaseScore !== lastSkillBase) {
      chipsEl.classList.remove('chips-bump');
      void chipsEl.offsetWidth;
      chipsEl.classList.add('chips-bump');
      lastSkillBase = synergy.skillBaseScore;
    }
  }
  if (multEl) {
    multEl.textContent = mult.toFixed(1);
    if (synergy.skillMultBonus !== lastSkillMult) {
      multEl.classList.remove('sett-mult-bump');
      void multEl.offsetWidth;
      multEl.classList.add('sett-mult-bump');
      lastSkillMult = synergy.skillMultBonus;
    }
  }
  if (finalEl) {
    finalEl.textContent = final.toLocaleString();
    // 实时模式也更新颜色分级，避免上一个词的 tier class 残留 (Review H1)
    finalEl.classList.remove(...SCORE_TIER_CLASSES);
    const tier = getScoreTier(final);
    if (tier) finalEl.classList.add(tier);
  }

  // 确保面板可见
  settlement.classList.remove('settlement-hidden');
  settlement.classList.add('settlement-live');
}

/** 词语完成时播放结算动画 */
function showSettlementComplete(chips: number, mult: number, total: number): void {
  const settlement = document.getElementById('score-settlement');
  if (!settlement) return;

  // 清除所有旧的定时器
  settlementTimeouts.forEach(t => clearTimeout(t));
  settlementTimeouts = [];

  const chipsEl = document.getElementById('settlement-chips');
  const multEl = document.getElementById('settlement-mult');
  const finalEl = document.getElementById('settlement-final');

  if (chipsEl) chipsEl.textContent = chips.toLocaleString();
  if (multEl) multEl.textContent = mult.toFixed(1);
  if (finalEl) {
    finalEl.textContent = total.toLocaleString();
    // 分数颜色分级 (Story 31.1)
    finalEl.classList.remove(...SCORE_TIER_CLASSES);
    const tier = getScoreTier(total);
    if (tier) finalEl.classList.add(tier);
  }

  // 播放完成动画
  settlement.classList.remove('settlement-live');
  settlement.classList.add('settlement-complete');

  // 完成动画后恢复到实时模式
  settlementTimeouts.push(setTimeout(() => {
    settlement.classList.remove('settlement-complete');
    settlement.classList.add('settlement-live');
  }, 400));
}

/** 显示金币奖励动画 */
function showGoldReward(onComplete: () => void): void {
  const goldReward = document.getElementById('gold-reward');
  if (!goldReward) {
    onComplete();
    return;
  }

  // 计算奖励：基础100（结算时发放） + 技能产出 + 遗物加成
  const baseGold = 100;
  const skillGold = Math.floor(state.resources.gold);
  const goldRelicResult = resolveRelicEffects('on_battle_end', { overkill: state.overkill, remainingTime: state.time });
  const relicGold = Math.floor(goldRelicResult.effects.gold);
  const totalGold = baseGold + skillGold + relicGold;


  // 设置数值
  const goldSkillEl = document.getElementById('gold-skill');
  const goldTreasureEl = document.getElementById('gold-treasure');
  const goldTotalEl = document.getElementById('gold-total');

  if (goldSkillEl) goldSkillEl.textContent = `+${skillGold}`;
  if (goldTotalEl) goldTotalEl.textContent = String(totalGold);

  // 技能产出行：有技能金币时才显示
  const skillRow = document.getElementById('gold-skill-row') as HTMLElement;
  if (skillRow) skillRow.style.display = skillGold > 0 ? '' : 'none';

  // 遗物金币行：有遗物加成时才显示
  const treasureRow = document.querySelector('.gold-treasure-row') as HTMLElement;
  if (treasureRow) treasureRow.style.display = relicGold > 0 ? '' : 'none';
  if (goldTreasureEl) goldTreasureEl.textContent = `+${relicGold}`;

  // 隐藏结算面板
  hideSettlement();

  // 显示金币奖励
  goldReward.classList.remove('gold-reward-hidden', 'gold-reward-hide');
  goldReward.classList.add('gold-reward-show');

  // 播放音效
  playSound('levelup');

  // 动画完成后淡出并回调
  setTimeout(() => {
    goldReward.classList.remove('gold-reward-show');
    goldReward.classList.add('gold-reward-hide');

    setTimeout(() => {
      goldReward.classList.add('gold-reward-hidden');
      goldReward.classList.remove('gold-reward-hide');
      onComplete();
    }, 300);
  }, 2000);
}

// === 计时器 ===
function startTimer(): void {
  state.time = state.timeMax + state.player.timeBonus;
  state.resources.time = state.time; // 同步资源
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    if (state.phase !== 'battle') {
      if (timerInterval) clearInterval(timerInterval);
      return;
    }

    // Boss 修饰器：时间加速（fast_time）
    const modEffect = getActiveParams();
    const timeSpeed = modEffect?.timeSpeed ?? 1;
    state.time -= 0.1 * timeSpeed * getTimeScale(); // Story 31.4: 慢动作

    // 蓄力产出者：每帧累加充能值
    updateChargeProducers(0.1);

    // Boss 修饰器：每帧更新（decay / scroll 等）
    tickModifier(0.1);

    // 滚屏模式：检测 miss 并自动推进
    if (isScrollActive() && state.player.index < state.player.word.length) {
      while (state.player.index < state.player.word.length) {
        const ls = checkScrollLetterState(state.player.index);
        if (ls !== 'miss') break;
        markScrollMiss(state.player.index);
        // 视觉标记
        const el = getElements();
        const letterEl = el.word.children[state.player.index] as HTMLElement | undefined;
        if (letterEl) letterEl.classList.add('scroll-missed');
        state.player.index++;
        state.wordPerfect = false;
      }
      if (state.player.index >= state.player.word.length) {
        completeWord();
      }
    }

    updateTimerDisplay();

    // BGM 张力层：根据时间比例和关卡类型计算张力等级
    const ratio = state.time / (state.timeMax + state.player.timeBonus);
    const currentStageTypeForTension = getStageType(state.level);
    let tension = 0;
    if (currentStageTypeForTension === 'boss') tension = Math.max(tension, 3);
    if (ratio < 0.1) tension = 4;
    else if (ratio < 0.3) tension = Math.max(tension, 2);
    else if (ratio >= 0.3) tension = Math.max(tension, 1);
    updateBGMTension(tension);

    if (state.time <= 0) {
      state.time = 0;
      if (timerInterval) clearInterval(timerInterval);
      endLevel();
    }
  }, 100);
}

function updateTimerDisplay(): void {
  const el = getElements();
  const secs = Math.ceil(state.time);
  el.timerDisplay.textContent = String(secs);
  el.timerBar.style.width = (state.time / (state.timeMax + state.player.timeBonus) * 100) + '%';

  if (state.time <= 5) {
    el.timerDisplay.style.color = '#ff6b6b';
    el.timerBar.style.background = '#ff6b6b';
  } else if (state.time <= 10) {
    el.timerDisplay.style.color = '#ffe66d';
    el.timerBar.style.background = '#ffe66d';
  } else {
    el.timerDisplay.style.color = '#4ecdc4';
    el.timerBar.style.background = '#4ecdc4';
  }
}

// === 关卡评级 ===
// === 关卡系统 ===
function endLevel(): void {
  if (timerInterval) clearInterval(timerInterval);
  releaseBGMTension();
  stopBGM();
  stopScoreRoller(); // Story 31.4
  clearPseudoInfinite();
  clearFloatQueue();
  cleanupModifier();
  stopBossRotation();
  hideSettlement();

  // 计算关卡评级
  if (state.battleStats) {
    state.battleStats.rating = calculateRating({
      score: state.score,
      targetScore: state.targetScore,
      perfectWords: state.battleStats.perfectWords,
      wordsCompleted: state.battleStats.wordsCompleted,
      timeRemaining: state.time,
      timeMax: state.timeMax,
    });
  }

  if (state.score >= state.targetScore) {
    trackEvent('demo_stage_complete', { stage: state.level, score: state.score });
    const rating = state.battleStats?.rating || 'B';
    showRatingReveal(rating, () => {
      startBGM('chill');
      const currentType = getStageType(state.level);

      // Demo: 最终关完成后直接结束
      if (IS_DEMO && state.level >= TOTAL_NODES) {
        victory();
        return;
      }

      if (currentType === 'boss') {
        if (state.endlessUnlocked) {
          // 无尽模式已解锁 → 周目推进 + 修饰器选择 + 传说遗物三选一 + 进商店
          advanceCycle();
          showBossModifierPicker(() => {
            if (hasUnownedRelics()) {
              showRelicPicker(() => openShop(true), RELIC_WEIGHT_PRESETS.bossDrop);
            } else {
              openShop(true);
            }
          });
        } else {
          // 无尽模式未解锁 → 通关结算
          victory();
        }
        return;
      }

      if (currentType === 'elite' && hasUnownedRelics()) {
        // 精英关胜利 → 遗物三选一（rare 60% / legendary 40%）→ 商店
        showRelicPicker(() => openShop(true), RELIC_WEIGHT_PRESETS.eliteDrop);
        return;
      }

      // 普通关胜利 → 直接进商店
      openShop(true);
    }, playRatingSound);
  } else {
    trackEvent('demo_stage_fail', { stage: state.level, score: state.score });
    gameOver();
  }
}

/** 隐藏结算面板 */
function hideSettlement(): void {
  const settlement = document.getElementById('score-settlement');
  if (settlement) {
    settlement.classList.remove('settlement-live', 'settlement-complete');
    settlement.classList.add('settlement-hidden');
  }
  settlementTimeouts.forEach(t => clearTimeout(t));
  settlementTimeouts = [];
}

export async function startLevel(): Promise<void> {
  keyTooltip.hide();

  // === Act 过渡演出（在切换到战斗画面前显示） ===
  // 先隐藏所有屏幕，避免过渡动画期间暴露gameover等界面
  showScreen('battle');
  const currentStageType = getStageType(state.level);
  const currentAct = getActForNode(state.level);
  if (currentAct !== lastAct) {
    // T2 遗物事件钩子：幕切换时触发 on_act_end（跳过首次进入，lastAct=0 表示无前序幕）(Story 28.1)
    if (lastAct > 0) {
      resolveRelicEffectsWithBehaviors('on_act_end', { endedAct: lastAct });
    }
    await showActTransition(currentAct);
    lastAct = currentAct;
  }

  state.phase = 'battle';
  initAudio();
  startBGM('battle');
  state.score = 0;
  scoreRoller.reset(0); // Review H1: 重置滚轮，避免从旧分数回滚
  lastScoreTier = ''; // 重置分数分级缓存 (Review M1)
  // Story 36.3: 不灭连击 — combo 跨关不重置
  if (!hasImmortalCombo()) {
    state.combo = 0;
    state.maxCombo = 0;
    state.multiplier = state.player.baseMultiplier;
  }
  state.wordScore = 0;
  state.overkill = 0;

  // 清理过期临时 buff
  state.tempBuffs = state.tempBuffs.filter(b => state.level <= b.expiresAtNode);

  // 恢复过期封印键位
  const expiredSeals = state.sealedKeys.filter(s => state.level > s.expiresAtNode);
  for (const seal of expiredSeals) {
    if (!state.player.bindings.has(seal.key) && state.player.skills.has(seal.skillId)) {
      state.player.bindings.set(seal.key, seal.skillId);
    }
  }
  state.sealedKeys = state.sealedKeys.filter(s => state.level <= s.expiresAtNode);

  // 使用 stageType-based 固定时间和目标分数
  const battleNum = getBattleNumber(state.level);
  state.timeMax = getCycleTimeLimit(state.level, state.cycle);
  state.targetScore = calculateTargetScore(battleNum > 0 ? battleNum : state.level, currentStageType, state.cycle);

  // Demo: 使用降低难度的固定目标分数
  if (IS_DEMO && DEMO_TARGET_SCORES[state.level] !== undefined) {
    state.targetScore = DEMO_TARGET_SCORES[state.level];
  }

  // 应用活跃临时 buff
  for (const buff of state.tempBuffs) {
    if (buff.type === 'multiplier') state.player.baseMultiplier += buff.value;
    if (buff.type === 'time') state.timeMax += buff.value;
    if (buff.type === 'targetScore') state.targetScore = Math.floor(state.targetScore * buff.value);
  }

  // 重置资源（在 timeMax 和 tempBuff 之后，确保 resources.time 使用正确的 timeMax）
  resetResources();
  state.resources.gold = 0;

  // Story 36.2: 重置打字遗物关级别状态（已见单词等）
  resetTypingRelicState();

  // Story 36.3: 重置连击遗物关级别状态（引爆阈值、节奏 milestone）
  resetComboRelicState();
  // Story 36.4: 重置技能遗物关级别状态（爵士乐词条追踪）
  resetSkillRelicState();
  // Story 36.5: 重置附魔遗物关级别状态
  resetEnchantmentRelicState();
  // Story 36.6: 重置拓扑遗物关级别状态（双手协奏手追踪 + 全键风暴计数）
  resetTopologyRelicState();

  // 初始化战后统计
  state.battleStats = createBattleStats();

  // 重置蜕变师遗物状态
  if (state.player.relics.has('primal_mutant')) {
    state.player.relicStates['primal_mutant'] = 0;
  }
  if (state.player.relics.has('ultimate_mutant_strain')) {
    state.player.relicStates['ultimate_mutant_strain'] = 0;
  }
  // 适者生存：清除蜕变加成标记
  if (state.player.relics.has('fittest_survivors')) {
    for (const key of Object.keys(state.player.relicStates)) {
      if (key.startsWith('fittest_')) delete state.player.relicStates[key];
    }
  }

  // 混沌种子：移除上一关的临时附魔
  removeChaosSeedEnchantments();

  // Story 36.3: 不灭连击 — skillMultBonus 跨关不重置
  if (!hasImmortalCombo()) {
    synergy.skillMultBonus = 0;
    state.multiplier = state.player.baseMultiplier;
  }

  // 构建字频底分修饰器注册表（整场战斗缓存）
  const letterMods = getLetterScoreModifiers(state.player.wordDeck);
  if (letterMods.length > 0) {
    letterRegistry = new ModifierRegistry();
    letterRegistry.registerMany(letterMods);
  } else {
    letterRegistry = null;
  }

  // 遗物效果：战斗开始管道（doomsday 额外时间等）
  const startRelicResult = resolveRelicEffects('on_battle_start');
  if (startRelicResult.effects.multiply > 0) {
    state.multiplier += startRelicResult.effects.multiply;
  }
  // cornucopia 等：战斗开始时金币加成
  if (startRelicResult.effects.gold > 0) {
    state.gold += startRelicResult.effects.gold;
  }
  // 永动队列：战斗开始时自动采集完整一轮队列
  if (state.player.relics.has('perpetual_queue')) {
    routeFragmentsToInventory(getMaxQueueLength());
  }

  // 混沌种子：给所有未附魔技能一个随机临时附魔
  applyChaosSeedEnchantments();

  const el = getElements();
  const displayLevel = getBattleNumber(state.level) || state.level;
  const stageLabel = currentStageType === 'elite' ? ' [ELITE]' : currentStageType === 'boss' ? ' [BOSS]' : '';
  const cyclePrefix = state.cycle >= 2 ? t('battle.cycle_prefix', { cycle: state.cycle }) : '';
  el.levelLabel.textContent = `${cyclePrefix}LEVEL ${displayLevel}${stageLabel}`;

  // HUD: 显示当前 Act / StageType
  updateStageInfo(currentAct, currentStageType);

  // Task 2.3: 精英关金色边框样式
  el.battleScreen.classList.toggle('elite-stage', currentStageType === 'elite');

  // 应用跨周目永久修饰器（state.activeModifiers）
  for (const permModId of state.activeModifiers) {
    applyModifier(permModId, false, true);
  }

  // Task 3.3-3.4: 修饰器 HUD 显示/隐藏
  const modInfo = el.modifierInfo;
  if (currentStageType === 'elite') {
    const meta = getCurrentEliteModifierMeta();
    if (meta) {
      modInfo.querySelector('.modifier-icon')!.textContent = meta.icon;
      modInfo.querySelector('.modifier-name')!.textContent = t(`modifier.${meta.id}`) !== `modifier.${meta.id}` ? t(`modifier.${meta.id}`) : meta.name;
      modInfo.querySelector('.modifier-hint')!.textContent = t(`modifier.${meta.id}.elite`) !== `modifier.${meta.id}.elite` ? t(`modifier.${meta.id}.elite`) : meta.eliteHint;
      modInfo.classList.add('visible');
    } else {
      modInfo.classList.remove('visible');
    }
    // 应用减弱版修饰器（精英关）— 跳过已在永久修饰器中的
    const modIdx = getEliteModifierIndex(state.level);
    const modId = state.bossModifierPool[modIdx];
    if (modId && !isModifierActive(modId)) {
      applyModifier(modId, true);
    }
  } else if (currentStageType === 'boss') {
    // Boss 关：启动 3 阶段轮换引擎
    startBossRotation();
  } else {
    modInfo.classList.remove('visible');
  }

  showScreen('battle');

  // 职业资源 HUD 显示切换
  const fragmentHud = document.getElementById('fragment-hud');
  if (fragmentHud) {
    fragmentHud.style.display = state.classId === 'wordsmith' ? 'flex' : 'none';
  }
  const mutagenHud = document.getElementById('mutagen-hud');
  if (mutagenHud) {
    mutagenHud.style.display = state.classId === 'metamorph' ? 'flex' : 'none';
  }

  // Demo 第一关：固定前 N 个词保证触发预设技能
  if (IS_DEMO && state.level === 1) {
    demoWordQueue = [...DEMO_FIRST_STAGE_WORDS];
  }

  setWord();
  updateHUD();
  renderRelicDisplay();
  renderActiveLibrary();

  // 精英关 / Boss 关入场演出（在战斗画面显示后）
  if (currentStageType === 'elite') {
    const modIdx = getEliteModifierIndex(state.level);
    const modId = state.bossModifierPool[modIdx];
    if (modId) await showEliteAnnouncement(modId);
  } else if (currentStageType === 'boss') {
    await showBossIntro(state.bossModifierPool);
  }

  initFloatPool();
  announceLevel();

  // Demo 第一关：启动新手引导
  if (IS_DEMO && state.level === 1) {
    initDemoTutorial();
  }

  startTimer();
  startScoreRoller(); // Story 31.4: 分数滚轮动画


}

function announceLevel(): void {
  const el = getElements();
  const ann = document.createElement('div');
  ann.className = 'level-announce';
  const displayLevel = getBattleNumber(state.level) || state.level;
  const stageType = getStageType(state.level);

  let typeLabel = '';
  if (stageType === 'elite') {
    const meta = getCurrentEliteModifierMeta();
    const modName = meta ? ` ${meta.icon} ${meta.name}` : '';
    typeLabel = `<br><span class="elite-hint">${t('battle.elite_hint')}${modName}</span>`;
  } else if (stageType === 'boss') {
    typeLabel = `<br><span class="boss-hint">${t('battle.boss_hint')}</span>`;
  }

  const cyclePfx = state.cycle >= 2 ? t('battle.cycle_prefix', { cycle: state.cycle }) : '';
  ann.innerHTML = `${cyclePfx}LEVEL ${displayLevel}${typeLabel}<br><span class="target-hint">${t('battle.target_hint', { value: state.targetScore })}</span>`;
  el.container.appendChild(ann);
  playSound('levelup');
  setTimeout(() => ann.remove(), 1500);
}

// === 胜利 ===
function victory(): void {
  state.phase = 'victory';
  if (timerInterval) clearInterval(timerInterval);
  stopScoreRoller(); // Story 31.4
  clearFloatQueue();
  cleanupModifier();
  stopBossRotation();

  if (IS_DEMO) {
    stopBGM();
    showDemoEndScreen({
      totalScore: state.score,
      maxCombo: state.maxCombo,
      skillCount: state.battleStats ? [...state.battleStats.skillStats.values()].reduce((sum, s) => sum + s.triggerCount, 0) : 0,
      stagesCleared: state.level,
    });
    return;
  }

  const el = getElements();
  const endlessHint = state.endlessUnlocked
    ? ''
    : `<br><span style="color:#ffe66d;font-size:0.85em">${t('battle.unlock_endless')}</span>`;
  el.gameoverStats.innerHTML = `
    ${t('battle.victory')}<br>
    ${t('battle.final_score', { score: state.score })}<br>
    ${t('battle.max_combo', { combo: state.maxCombo })}<br>
    ${t('battle.skills_owned', { count: state.player.skills.size })}${endlessHint}
  `;
  showScreen('gameover');
  playSound('levelup');

  // Story 25.6: 恢复普通随机模式
  setNormalMode();

  // Story 25.5: 记录排行榜
  eventBus.emit('meta:check_unlocks', {
    runResult: 'victory',
    runStats: {
      totalScore: state.score,
      stagesCleared: state.level,
      maxCombo: state.maxCombo,
      skills: Array.from(state.player.skills.keys()),
      relics: state.player.relics,
    },
    cycle: state.cycle,
    skillLevels: Array.from(state.player.skills.entries()).map(([id, s]) => ({ id, level: s.level })),
    activeModifiers: [...state.activeModifiers],
    seed: state.dailySeed,
    classId: state.classId,
  });
}

// === 游戏结束 ===
function gameOver(): void {
  state.phase = 'gameover';
  if (timerInterval) clearInterval(timerInterval);
  releaseBGMTension();
  clearPseudoInfinite();
  clearFloatQueue();
  cleanupModifier();
  stopBossRotation();

  if (IS_DEMO) {
    stopBGM();
    showDemoEndScreen({
      totalScore: state.score,
      maxCombo: state.maxCombo,
      skillCount: state.battleStats ? [...state.battleStats.skillStats.values()].reduce((sum, s) => sum + s.triggerCount, 0) : 0,
      stagesCleared: state.level - 1,
    });
    return;
  }

  startBGM('chill');
  const el = getElements();
  const displayLevel = getBattleNumber(state.level) || state.level;
  el.gameoverStats.innerHTML = `
    ${t('battle.reached_level', { level: displayLevel })}<br>
    ${t('battle.final_score_target', { score: state.score, target: state.targetScore })}<br>
    ${t('battle.max_combo', { combo: state.maxCombo })}<br>
    ${t('battle.skills_owned', { count: state.player.skills.size })}
  `;
  showScreen('gameover');
  playSound('gameover');

  // Story 25.6: 恢复普通随机模式
  setNormalMode();

  // Story 25.5: 记录排行榜
  eventBus.emit('meta:check_unlocks', {
    runResult: 'gameover',
    runStats: {
      totalScore: state.score,
      stagesCleared: state.level - 1,
      maxCombo: state.maxCombo,
      skills: Array.from(state.player.skills.keys()),
      relics: state.player.relics,
    },
    cycle: state.cycle,
    skillLevels: Array.from(state.player.skills.entries()).map(([id, s]) => ({ id, level: s.level })),
    activeModifiers: [...state.activeModifiers],
    seed: state.dailySeed,
    classId: state.classId,
  });
}

// === UI 更新 ===
export function updateHUD(): void {
  const el = getElements();
  el.combo.textContent = String(state.combo);
  scoreRoller.setTarget(Math.floor(state.score)); // Story 31.4: 平滑滚动
  el.score.textContent = String(scoreRoller.getValue()); // Review M1: rAF 未启动时 fallback
  el.targetScore.textContent = String(state.targetScore);
  el.multiplier.textContent = state.multiplier.toFixed(1);

  // 分数进度颜色（基础）
  const progress = state.score / state.targetScore;
  if (progress >= 1) {
    el.score.style.color = '#4ecdc4';
  } else if (progress >= 0.7) {
    el.score.style.color = '#ffe66d';
  } else {
    el.score.style.color = '#fff';
  }

  // 分数颜色分级 — 高分时覆盖进度颜色 (Story 31.1)
  // 仅在 tier 变化时更新 class，避免重启 CSS 动画 (Review M1)
  const scoreTier = getScoreTier(state.score);
  if (scoreTier !== lastScoreTier) {
    el.score.classList.remove(...SCORE_TIER_CLASSES);
    if (scoreTier) el.score.classList.add(scoreTier);
    lastScoreTier = scoreTier;
  }

  // 职业资源 HUD 更新
  if (state.classId === 'wordsmith') {
    const el = document.getElementById('fragment-produced');
    if (el) el.textContent = String(Math.floor(state.classResourceProduced.fragment ?? 0));
  } else if (state.classId === 'metamorph') {
    const mutagenEl = document.getElementById('mutagen-count');
    if (mutagenEl) mutagenEl.textContent = String(Math.floor(state.mutagenInventory));
    const producedEl = document.getElementById('mutagen-produced');
    if (producedEl) producedEl.textContent = String(Math.floor(state.classResourceProduced.mutagen ?? 0));
  }

  // 发送分数更新事件
  eventBus.emit('score:update', {
    score: state.score,
    multiplier: state.multiplier,
    combo: state.combo
  });
}


export function renderRelicDisplay(): void {
  const el = getElements();
  const relicArray = [...state.player.relics];

  // 渲染 10 槽位到指定容器
  function renderSlots(container: HTMLElement) {
    container.innerHTML = '';
    for (let i = 0; i < MAX_RELIC_SLOTS; i++) {
      const slot = document.createElement('span');
      const keyLabel = i < 9 ? `${i + 1}` : '0';
      if (relicArray[i]) {
        const relic = RELICS[relicArray[i]];
        slot.className = 'relic-icon';
        slot.textContent = relic?.icon ?? '?';
        slot.title = `[${keyLabel}] ${localizeItemName(relicArray[i], relic?.name ?? '')}: ${localizeItemDesc(relicArray[i], relic?.description ?? '')}`;
      } else {
        slot.className = 'relic-icon relic-slot-empty';
        slot.textContent = '·';
        slot.title = t('battle.empty_slot', { key: keyLabel });
      }
      container.appendChild(slot);
    }
  }

  renderSlots(el.playerRelics);
}

function renderActiveLibrary(): void {
  const el = getElements();
  const deckSize = state.player.wordDeck.length;
  el.activeLibrary.textContent = t('battle.deck_label', { count: deckSize });
}

// === 浮字系统 ===
const FLOAT_POOL_SIZE = 20;
const FLOAT_INTERVAL = 150; // 链式浮字间隔 ms
let floatPool: HTMLDivElement[] = [];
let floatQueue: Array<{ text: string; color: string; scale?: number }> = [];
let queueTimer: ReturnType<typeof setTimeout> | null = null;

/** 初始化浮字对象池 */
function initFloatPool(): void {
  if (floatPool.length > 0) return;
  const container = getElements().container;
  for (let i = 0; i < FLOAT_POOL_SIZE; i++) {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.style.display = 'none';
    container.appendChild(el);
    floatPool.push(el);
  }
}

/** 从池中获取空闲浮字元素 */
function acquireFloat(): HTMLDivElement | null {
  return floatPool.find(el => el.style.display === 'none') || null;
}

/** 回收浮字元素 */
function releaseFloat(el: HTMLDivElement): void {
  el.style.display = 'none';
  el.classList.remove('float-text-active');
}

/** 创建一个浮字 */
function createFloatText(text: string, color: string, scale = 1): void {
  const el = acquireFloat();
  if (!el) return; // 池满，跳过

  el.textContent = text;
  el.style.color = color;
  el.style.left = (35 + Math.random() * 30) + '%';
  el.style.setProperty('--float-scale', String(scale));
  el.style.display = '';
  // 强制重排触发动画
  void el.offsetWidth;
  el.classList.add('float-text-active');

  // 动画结束后回收（监听 animationend 而非硬编码延时）
  el.onanimationend = () => releaseFloat(el);
}

/** 排队浮字（支持链式触发间隔弹出） */
function drainQueue(): void {
  if (floatQueue.length === 0) {
    queueTimer = null;
    return;
  }
  const item = floatQueue.shift()!;
  createFloatText(item.text, item.color, item.scale);
  queueTimer = setTimeout(drainQueue, FLOAT_INTERVAL);
}

/** 清空浮字队列和定时器（关卡结束时调用） */
function clearFloatQueue(): void {
  floatQueue.length = 0;
  if (queueTimer) {
    clearTimeout(queueTimer);
    queueTimer = null;
  }
  // 回收所有活跃浮字
  for (const el of floatPool) {
    releaseFloat(el);
  }
}

/** 浮字反馈（scale 控制字体缩放，默认 1） */
export function showFeedback(txt: string, color: string, scale?: number): void {
  floatQueue.push({ text: txt, color, scale });
  if (!queueTimer) drainQueue();
}

/** 伪无限模式视觉：屏幕边缘金色光晕 */
export function setPseudoInfiniteVisual(active: boolean): void {
  const el = getElements();
  el.container.classList.toggle('pseudo-infinite', active);
}

