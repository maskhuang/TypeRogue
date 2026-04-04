// ============================================
// 打字肉鸽 - 战斗系统
// ============================================

import { state, synergy, calculateTargetScore, resetResources, createBattleStats, getMaxRelicSlots } from '../core/state';
import { resolveRelicEffects, resolveRelicEffectsWithBehaviors, queryRelicFlag } from './relics/RelicPipeline';
import { eventBus } from '../core/events/EventBus';
import { inputHandler } from './typing/InputHandler';
import { getElements } from '../ui/elements';
import { RELICS, MAX_RELIC_SLOTS } from '../data/relics';
import { juiceUp, bumpCombo, bumpScore, bumpMultiplier, bumpTimer, bumpGold, getFloatScale, screenShake, getShakeIntensity, getScoreTier, SCORE_TIER_CLASSES, ScoreRoller, triggerSlowMotion, getTimeScale, checkMilestone, showMilestoneCelebration, showRatingReveal, calculateRating } from '../effects/juice';
import { playSound, initAudio, playScoreSound, playRatingSound, startBGM, stopBGM, updateBGMTension, releaseBGMTension, emitResourceSound } from '../effects/sound';
import { spawnParticles } from '../effects/particles';
import { triggerSkill, clearPseudoInfinite, resetWordResourceTypes, getWordResourceTypeCount, updateChargeProducers, getWordResourceOutput, isChargeSkill, resetStageProduced } from './skills';
import { HAND_MAP } from '../data/keyboardTopology';
import { openShop } from './shop';
import { shouldShowRitual, openRitualEnchantment } from './ritualEnchantment';
import { hasUnownedRelics, showRelicPicker, RELIC_WEIGHT_PRESETS } from './relicPicker';
import { openRestStage } from './restStage';
import { getWordEffectModifiers } from './letters/LetterFrequencySystem';
import { ModifierRegistry } from './modifiers/ModifierRegistry';
import { EffectPipeline } from './modifiers/EffectPipeline';
import { keyTooltip } from '../ui/keyboard/KeyTooltip';
import { getStageType, getCycleTimeLimit, getBattleNumber, isRitualNode, isEliteNode, getNextBattleNode } from './stage/stageFlow';
import { getBossModifierMeta, getActiveParams, incrementDiminishCount, getDiminishMultiplier, transformWordForModifier, drawSingleBossModifier, setRelicGarbleActive, getEscalateTimeSpeedBonus, triggerFrostFreeze, isFrostFrozen, onMirrorTargetReached, getMirrorPhase, rollDecoyWord, isDecoyWord, isDecoyRecognized, getDecoyOriginalAt, markDecoyRecognized, getOffenseDefenseModifierIds } from '../data/bossModifiers';
import type { BossModifierId } from '../data/bossModifiers';
import { applyModifier, cleanupModifier, tickModifier, getActiveModifierEffect, isModifierActive } from './bossModifierEngine';
import { showBossModifierPicker, showEliteModifierPicker } from './bossModifierPicker';
import { showActTransition, showBossIntro, updateStageInfo } from './actTransition';
import { random, setNormalMode } from '../core/seededRandom';
import { getMaxQueueLength } from './classes/FragmentQueue';
import { routeEnergyToPipeline, ENERGY_PER_SLOT } from './classes/AssemblyPipeline';
import { canAutocomplete, isRepeatWord, hasGlassCannon, resetTypingRelicState, trackWord, initTypingRelicBehaviors, checkSpeedRelics, recordKeypressForTaiko, checkTaikoHit, startTaikoSpawner, stopTaikoSpawner, updateTaikoJudge } from './relics/TypingRelicBehaviors';
import { checkEchoThimble, calculateComboBuffer, checkComboDetonator, onComboBreakDetonator, hasImmortalCombo, saveLastBattleCombo, resetComboRelicState, initComboRelicBehaviors, getMultiplierPrismBonus, onNewWordForCancel, checkCancelOnFirstLetter, getCancelChainBonus, getCancelChainCount, onCancelledWordComplete, onCancelledWordError, isWordCancelled } from './relics/ComboRelicBehaviors';
import { checkJazzBonus, resetSkillRelicState, initSkillRelicBehaviors, hasUncrownedKing, checkD100OnBattleStart } from './relics/SkillRelicBehaviors';
import { resetEnchantmentRelicState, initEnchantmentRelicBehaviors, getApprenticeGrowthMultiplier, getQuestEquipReduction, getGreedyInscriptionTargetMult } from './relics/EnchantmentRelicBehaviors';
import { checkDualConcerto, resetDualConcertoHand, checkKeyStorm, hasKeyStorm, KEY_STORM_SCORE_PENALTY, checkRowSwitch, checkLineClear, LINE_CLEAR_OUTPUT_RATIO, resetTopologyRelicState, initTopologyRelicBehaviors } from './relics/TopologyRelicBehaviors';
import { checkWordCollection, checkLongWordMaster, initWordRelicBehaviors } from './relics/WordRelicBehaviors';
import { incrementWordParity, getCurrentTideResource, checkUniversalFurnace, resetResourceRelicBattleState, initResourceRelicBehaviors } from './relics/ResourceRelicBehaviors';
import { initShopRelicBehaviors, applyGoldInterest } from './relics/ShopRelicBehaviors';
import { getEnduranceTimeBonus, getActiveBounty, onBountyError, checkBountyOnWordComplete, checkBountyOnStageEnd, checkPhoenixRevive, consumePhoenix, resetStageRelicBattleState, initStageRelicBehaviors } from './relics/StageRelicBehaviors';
import { getShieldedValue, getShieldedScoreCap, getShieldedTargetMultiplier, shouldBarrierDelay, startBarrierDelay, addDeferredModifier, checkBarrierActivation, isBarrierDelaying, checkChaosRoulette, applyModifierReversal, resetBossModifierRelicBattleState, initBossModifierRelicBehaviors } from './relics/BossModifierRelicBehaviors';
import { applyBaseShield, applyLenientJudge, getSRankTrophyGold, getUnderdogBonusGold, applySnowball, getSnowballWordIndex, isBlackHoleActive, accumulateBlackHole, settleBlackHole, hasBlackHoleSettled, getDeadlyGiftReward, grantDeadlyGiftFreeRefreshes, resetScoringRelicBattleState, initScoringRelicBehaviors } from './relics/ScoringRelicBehaviors';
import { resetCritRelicBattleState, resetCritRelicWordState, getCritStormBonus, initCritRelicBehaviors } from './relics/CritRelicBehaviors';
import { checkDrumPass, getWordResonanceStacks, resetStackingRelicBattleState, initStackingRelicBehaviors, isPerpetualEngineActive, isStackingAffix } from './relics/StackingRelicBehaviors';
import { filterEnchantmentCandidates, getTransmuteEligibleResources, applyApprenticeEvent, resolveMirrorCopy, resolveMirrorCopyAllAffixes, categorizeEnchantmentCandidates, weightedPickEnchantment, getEffectiveProbMult, isAffixGloballyTransformed, evaluateEquipQuests, removeAffixAtRuntime } from '../data/affixTrigger';
import { AffixType, applyAffixLevelScaling } from '../data/affixes';
import { filterEnchantmentsByClass, filterCategorizedByClass, EnchantmentType as EnchantmentTypeEnum } from '../data/affixes';
import { PositionRelation } from '../data/keyboardTopology';
import { BALANCE, RESOURCE_COLORS, PRACTICE_GOLD, computePracticeGold } from '../core/constants';
import { IS_DEMO, DEMO_FIRST_STAGE_WORDS, DEMO_TARGET_SCORES } from '../demo/demo-config';
import { initDemoTutorial } from '../demo/demo-tutorial';
import { showDemoEndScreen } from '../demo/demo-end-screen';
import { trackEvent } from '../demo/demo-analytics';
import { t, localizeItemName, localizeItemDesc } from '../demo/demo-i18n';
import { bindShapeToKeys, restoreSealedSkill, getBindingState, getSkillKeys, getSkillAnchorKey } from './bindingManager';

// === Demo 固定词序队列 ===
let demoWordQueue: string[] = [];

// === 混沌种子临时附魔追踪 ===
// Map<skillId, enchantmentId> — 记录本关由混沌种子添加的临时附魔
let chaosSeedEnchantments: Map<string, string> = new Map();

/** 混沌种子：给所有未附魔技能随机临时附魔 */
export function applyChaosSeedEnchantments(): void {
  if (!state.player.relics.has('chaos_seed')) return;
  const playerClass = state.classId !== 'none' ? state.classId : undefined;
  // 收集场上所有已装备词条类型
  const equippedAffixTypes = new Set<import('../data/affixes').AffixType>();
  for (const [, s] of state.affixSkills) {
    for (const affix of s.affixes) equippedAffixTypes.add(affix.type);
  }
  for (const [skillId, skill] of state.affixSkills) {
    if (skill.enchantmentIds.length > 0) continue;
    // Story 36.4: 无冕之王 — 不给无附魔技能添加临时附魔
    if (hasUncrownedKing()) continue;
    const categorized = filterCategorizedByClass(categorizeEnchantmentCandidates(skill, equippedAffixTypes), playerClass);
    const chosen = weightedPickEnchantment(categorized, random);
    if (!chosen) continue;
    skill.enchantmentIds.push(chosen);
    // Transmute：随机分配目标资源
    if ((chosen as string) === 'transmute') {
      const eligible = getTransmuteEligibleResources(skill.resource, playerClass);
      if (eligible.length > 0) {
        skill.transmuteResource = eligible[Math.floor(random() * eligible.length)];
      }
    }
    // ApprenticeNeighbor：复用技能已有词条的 posRel，否则随机
    if (chosen === EnchantmentTypeEnum.ApprenticeNeighbor) {
      const allRels = Object.values(PositionRelation);
      const existing = skill.affixes.find(a => a.posRel != null)?.posRel;
      skill.neighborPosRel = existing ?? allRels[Math.floor(random() * allRels.length)];
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
    if (enchId === ('transmute' as string) && !skill.enchantmentIds.includes(enchId)) {
      skill.transmuteResource = undefined;
    }
  }
  chaosSeedEnchantments.clear();
}

// === Cycle 过渡追踪 ===
let lastCycle = 0;

/** 重置 Cycle 过渡追踪（新游戏时调用） */
export function resetCycleTracking(): void { lastCycle = 0; chaosSeedEnchantments.clear(); }

/**
 * Boss 胜利后的周目推进状态变更
 * - cycle++, level=1
 * - bossModifierPool 清空（下次 Boss 战前由 picker 填充）
 */
export function advanceCycle(): void {
  // Boss 关溢出分作为下周目第一关目标分数（不保留到下周目）
  state.calibratedTargetBase = Math.max(1, Math.round(state.overkill));
  state.overflowScore = 0;
  state.cycle++;
  state.level = 0; // 0 so that shop-leave's getNextBattleNode(0)=1 starts at level 1
  resetCycleTracking();
  state.bossModifierPool = [];
}

// === 计时器 ===
let timerInterval: ReturnType<typeof setInterval> | null = null;
let battlePaused = false;

// 引导暂停：冻结/恢复计时器
eventBus.on('battle:pause', () => { battlePaused = true; });
eventBus.on('battle:resume', () => { battlePaused = false; });

// === 分数结算 ===
let wordBaseScore = 0; // 词语基础分（不含倍率）
let prismActivated = false; // 倍率棱镜本关是否已显示激活反馈
let lessIsMoreShown = false; // 少而精本关是否已显示激活反馈
let _glassCannonTimer: ReturnType<typeof setTimeout> | null = null; // 玻璃大炮 phase 2 延时 ID
let wordStartTime = 0; // T1遗物：词语开始时的剩余时间（用于完美韵律时间返还）
let settlementTimeouts: ReturnType<typeof setTimeout>[] = []; // 所有结算相关的定时器
let lastScoreTier = ''; // 缓存上一次分数分级，避免每帧重启 CSS 动画 (Review M1)
let lastSkillBase = 0; // 技能基数产出缓存（变化时弹跳）
let lastSkillMult = 0; // 技能倍率产出缓存（变化时弹跳）
let _pendingDeadlyGiftRelicPick = false; // 致命礼物：丰厚层级待弹遗物三选一
let letterRegistry: ModifierRegistry | null = null; // 字母升级注册表（每关开始时构建）
let leftHandTriggered = false; // T5遗物：本词左手技能是否触发过
let rightHandTriggered = false; // T5遗物：本词右手技能是否触发过
let _battleRelicGold = 0; // 战斗中遗物产出的金币（用于结算面板）
let wordStartScore = 0; // 玻璃大炮：记录词开始时总分（用于整词得分翻倍）
let _targetReached = false; // Story 42.2: 达标标志（达标后继续战斗直到时间耗尽）
let _accelAtTarget = 1.0;  // 达标时刻的加速倍率（指数基底）
let _elapsedAtTarget = 0;  // 达标时刻的已流逝秒数
let _targetReachedTime = 0; // Story 42.2: 达标时的剩余时间（万物熔炉等遗物需要）
let _initialOverflow = 0; // Story 42.3: 本关注入的初始溢出分（HUD 颜色区分用）
let _elapsedSeconds = 0; // Story 42.4: 关内已流逝秒数（时间加速计算用）
let _lastAccelText = ''; // Story 42.4: 上次显示的加速倍率文本（脉冲动画检测用）
let _isBoss = false; // Story 42.4: 当前关是否 Boss（startTimer 缓存，避免每 tick 调用 getStageType）
let _isCalibrationLevel = false; // 第一关校准关：无目标，时间结束后校准基数
let _overflowDeduction = 0; // 溢出扣减量（用于 announceLevel 动画）
let _preDeductionTarget = 0; // 扣减前的目标分数

// === Charge 按住蓄力：按下暂停推进，蓄满自动释放或松开提前释放 ===
const _pendingChargeTriggers = new Map<string, { skillId: string; key: string; letterIndex: number }>();
let _chargeHolding = false;

/** 释放 Charge（蓄满自动 or keyup 提前） */
function releaseCharge(key: string): void {
  const pending = _pendingChargeTriggers.get(key);
  if (!pending) return;
  _pendingChargeTriggers.delete(key);
  _chargeHolding = false;

  triggerSkill(pending.skillId, pending.key);

  // 推进字母
  const el = getElements();
  const letterEl = el.word.children[pending.letterIndex] as HTMLElement;
  if (letterEl) {
    letterEl.classList.remove('charging', 'current');
    letterEl.classList.add('correct');
  }

  state.player.index = pending.letterIndex + 1;
  if (state.player.index >= state.player.word.length) {
    completeWord();
  } else {
    const nextLetter = el.word.children[state.player.index] as HTMLElement;
    nextLetter?.classList.remove('pending');
    nextLetter?.classList.add('current');
  }
  updateHUD();
}

function handleChargeRelease(e: { key: string }): void {
  if (state.phase !== 'battle') return;
  releaseCharge(e.key);
}

// === 分数滚轮动画 (Story 31.4) ===
const scoreRoller = new ScoreRoller();
const goldRoller = new ScoreRoller();
const comboRoller = new ScoreRoller();
const timerRoller = new ScoreRoller();
const multRoller = new ScoreRoller();  // 内部 ×10 存储，显示时 /10
let scoreRollerRaf: number | null = null;
let scoreRollerLastTime = 0;

/** 分数滚轮 rAF 帧更新 (Story 31.4) */
function scoreRollerTick(now: number): void {
  if (!scoreRollerLastTime) scoreRollerLastTime = now;
  const dt = (now - scoreRollerLastTime) / 1000; // 转换为秒
  scoreRollerLastTime = now;
  const el = getElements();
  el.score.textContent = String(scoreRoller.update(dt));
  el.combo.textContent = String(comboRoller.update(dt));
  el.multiplier.textContent = (multRoller.update(dt) / 10).toFixed(1);
  el.timerDisplay.textContent = String(timerRoller.update(dt));
  const battleGoldEl = document.getElementById('battle-gold-count');
  if (battleGoldEl) battleGoldEl.textContent = String(goldRoller.update(dt));
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
export function showScreen(name: 'battle' | 'shop' | 'gameover' | 'ritual' | 'rest'): void {
  const el = getElements();
  el.battleScreen.style.display = name === 'battle' ? 'flex' : 'none';
  el.shopScreen.style.display = name === 'shop' ? 'flex' : 'none';
  el.ritualScreen.style.display = name === 'ritual' ? 'flex' : 'none';
  el.gameoverScreen.style.display = name === 'gameover' ? 'flex' : 'none';
  const restScreen = document.getElementById('rest-screen');
  if (restScreen) restScreen.style.display = name === 'rest' ? 'flex' : 'none';

  // 离开战斗屏幕时确保结算面板隐藏
  if (name !== 'battle') {
    const settlement = document.getElementById('score-settlement');
    if (settlement) settlement.classList.add('settlement-hidden');
  }
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

  // Gravity 词选：收集所有 Gravity 词条的 probMult，按字母加权选词
  const gravityWeights = collectGravityWeights();
  if (gravityWeights.size > 0) {
    const weights: number[] = [];
    for (const word of words) {
      let w = 1;
      const upper = word.toUpperCase();
      const seen = new Set<string>();
      for (const ch of upper) {
        if (seen.has(ch)) continue;
        seen.add(ch);
        const mult = gravityWeights.get(ch);
        if (mult !== undefined) w *= mult;
      }
      // 质变Gravity: Infinity×0 = NaN → 视为冲突约束，降为 0（排除该词）
      if (Number.isNaN(w)) w = 0;
      weights.push(w);
    }
    // 质变Gravity: 处理 Infinity/0 极端权重
    const hasInfinity = weights.some(w => w === Infinity)
    if (hasInfinity) {
      // 仅从 Infinity 权重的词中随机选（满足所有必含约束）
      const infiniteIndices = weights.map((w, i) => w === Infinity ? i : -1).filter(i => i >= 0)
      if (infiniteIndices.length > 0) {
        const idx = infiniteIndices[Math.floor(random() * infiniteIndices.length)]
        return words[idx].toUpperCase()
      }
      // fallback: 所有词都被排除约束过滤（Infinity * 0 = NaN），均匀随机
    } else {
      const total = weights.reduce((a, b) => a + b, 0);
      if (total > 0) {
        let r = random() * total;
        for (let i = 0; i < words.length; i++) {
          r -= weights[i];
          if (r <= 0) return words[i].toUpperCase();
        }
      }
    }
  }

  return words[Math.floor(random() * words.length)].toUpperCase();
}

/** 收集所有 Gravity 词条的有效 probMult，按字母聚合（同字母取乘积） */
function collectGravityWeights(): Map<string, number> {
  const result = new Map<string, number>();
  for (const [key, skillId] of state.player.bindings) {
    const skill = state.affixSkills.get(skillId);
    if (!skill) continue;
    const runtimeState = state.affixSkillStates.get(skillId);
    if (!runtimeState) continue;
    for (const affix of skill.affixes) {
      if (affix.type !== AffixType.Gravity) continue;
      const probMult = getEffectiveProbMult(affix, runtimeState, skill, state.affixSkills, state.affixSkillStates);
      if (probMult === 1) continue; // 中性，不影响
      const letter = key.toUpperCase();
      const existing = result.get(letter) ?? 1;
      result.set(letter, existing * probMult);
    }
  }
  return result;
}

let _starterSkillBound = false;

function setWord(): void {
  const picked = transformWordForModifier(pickWord());
  const decoyResult = rollDecoyWord(picked);
  state.player.word = decoyResult.word;
  state.player.index = 0;

  // 首关第二词：将初始技能绑定到本词首字母（第一词纯打字，第二词引入技能）
  if (!_starterSkillBound && state.level === 1 && state.player.bindings.size === 0
      && state.player.skills.size > 0 && state.player.word.length > 0
      && state.battleStats && state.battleStats.wordsCompleted >= 1) {
    const firstLetter = state.player.word[0].toLowerCase();
    const firstSkillId = state.player.skills.keys().next().value;
    if (firstSkillId) {
      bindShapeToKeys(getBindingState(state), firstSkillId, firstLetter);
      _starterSkillBound = true;
    }
  }
  state.wordScore = 0;
  wordBaseScore = 0; // 重置基础分
  lastSkillBase = 0; // 重置技能产出弹跳缓存
  lastSkillMult = 0;
  state.resources.base = 0; // 重置资源基数
  state.resources.score = 0; // 重置即时加分
  state.wordPerfect = true;
  wordStartTime = state.time; // 记录词语开始时的剩余时间
  onNewWordForCancel(); // 取消连锁：记录新词出现时间
  wordStartScore = state.score; // 玻璃大炮：记录词开始时总分
  setTimeout(() => updateTaikoJudge(), 0); // 新词渲染后更新判定点
  resetWordResourceTypes(); // 重置词级资源追踪
  leftHandTriggered = false; // 重置左右手追踪
  rightHandTriggered = false;
  synergy.wordSkillCount = 0;
  synergy.skillBaseScore = 0;
  synergy.letterBaseScore = 0;
  synergy.lastTriggeredSkillId = null;
  // Story 36.6: 双手协奏手追踪重置
  resetDualConcertoHand();
  renderWord();
  updateSettlementLive(); // 初始化结算面板
}

function renderWord(): void {
  const el = getElements();
  const s = state.player;
  el.word.innerHTML = '';

  // 小助手提示：重复单词且已打完首字母时显示
  const showTabHint = state.player.relics.has('little_helper') && s.index >= 1 && isRepeatWord(s.word);

  for (let i = 0; i < s.word.length; i++) {
    const span = document.createElement('span');
    span.className = 'letter letter-enter';
    span.textContent = s.word[i];
    span.style.animationDelay = `${i * 0.03}s`;

    if (i < s.index) span.classList.add('correct');
    else if (i === s.index) span.classList.add('current');
    else span.classList.add('pending');

    const boundSkillId = s.bindings.get(s.word[i].toLowerCase());
    if (boundSkillId) {
      span.classList.add('has-skill');
      if (isChargeSkill(boundSkillId)) span.classList.add('is-charge');
    }
    el.word.appendChild(span);
  }

  // Tab 补全提示（单词下方居中）
  if (showTabHint) {
    const hint = document.createElement('span');
    hint.className = 'tab-hint';
    hint.textContent = t('battle.tab_hint');
    el.word.appendChild(hint);
  }
}

// === 输入处理 ===
export function initInput(): void {
  // 使用新的 InputHandler + EventBus 架构
  eventBus.on('input:keypress', handleKeyPress);
  eventBus.on('input:keyup', handleChargeRelease);
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
  // Story 36.7: 注册单词子系统遗物行为
  initWordRelicBehaviors();
  // Story 36.8: 注册资源子系统遗物行为
  initResourceRelicBehaviors();
  // Story 36.9: 注册商店子系统遗物行为
  initShopRelicBehaviors();
  // Story 36.10: 注册关卡进度子系统遗物行为
  initStageRelicBehaviors();
  // Story 36.11: 注册Boss修饰器子系统遗物行为
  initBossModifierRelicBehaviors();
  // Story 36.12: 注册结算/评分子系统遗物行为
  initScoringRelicBehaviors();
  // §12: 注册暴击子系统遗物行为
  initCritRelicBehaviors();
  // 叠层子系统遗物行为
  initStackingRelicBehaviors();
  // Story 36.2: Tab 键独立监听（InputHandler 只接受单字符键，Tab 需要单独处理）
  document.addEventListener('keydown', handleTabKey);
  // Story 36.12: Enter 键独立监听（分数黑洞手动结算）
  document.addEventListener('keydown', handleEnterKey);
}

/** Story 36.2: Tab 键处理（小助手自动补全） — 独立于 InputHandler */
function handleTabKey(e: KeyboardEvent): void {
  if (e.key !== 'Tab') return;
  if (state.phase !== 'battle') return;
  if (!canAutocomplete()) return;
  e.preventDefault(); // 阻止浏览器默认焦点切换
  performAutocomplete();
}

/** Story 36.12: Enter 键处理（致命礼物手动结算） — 独立于 InputHandler */
function handleEnterKey(e: KeyboardEvent): void {
  if (e.key !== 'Enter') return;
  if (state.phase !== 'battle') return;
  if (!isBlackHoleActive() || hasBlackHoleSettled()) return;

  const pool = settleBlackHole();
  state.score += pool;
  showFeedback(t('battle.black_hole_settle', { value: String(pool) }), '#8800ff');

  // 恢复 HUD 正常显示
  updateHUD();

  // Review Fix #4: 黑洞结算后隐藏结算面板
  hideSettlement();

  // Story 42.2: 黑洞结算后 — 首次达标设标志+反馈（校准关跳过）
  if (!_isCalibrationLevel && !_targetReached && state.score >= state.targetScore) {
    const mirrorAction = onMirrorTargetReached(_elapsedSeconds);
    if (mirrorAction === 'reset') {
      state.score = 0;
      showFeedback(t('battle.mirror_first_clear'), '#8888ff');
      playSound('levelup');
    } else {
      _targetReached = true;
      _targetReachedTime = state.time;
      _accelAtTarget = getTimeAcceleration(_elapsedSeconds, _isBoss);
      _elapsedAtTarget = _elapsedSeconds;
      getElements().container.classList.add('glow-target-reached');
      showFeedback(getMirrorPhase() === 'done' && isModifierActive('boss_mirror') ? t('battle.mirror_survived') : t('battle.target_reached'), '#4ecdc4');
      playSound('levelup');
      screenShake(3); // Review Fix #5: 达标脉冲
    }
  }

  // Review Fix #3: 致命礼物奖励独立于 _targetReached — 每次黑洞结算达标都给奖励
  if (state.score >= state.targetScore) {
    const reward = getDeadlyGiftReward(state.score, state.targetScore);
    if (reward.gold > 0) {
      state.gold += reward.gold;
      state.resources.gold += reward.gold;
      _battleRelicGold += reward.gold;
      showFeedback(t(`battle.deadly_gift_${reward.tier}`, { value: String(reward.gold) }), '#ffdd00', undefined, undefined, { relicId: 'score_black_hole', resource: 'gold', amount: reward.gold });
    }
    if (reward.action === 'all_relics') {
      for (const id of Object.keys(RELICS)) {
        state.player.relics.add(id);
      }
    } else if (reward.action === 'epic_legendary_pick') {
      _pendingDeadlyGiftRelicPick = true;
    } else if (reward.action === 'free_refreshes') {
      grantDeadlyGiftFreeRefreshes(5);
    } else if (reward.action === 'random_relic') {
      const unowned = Object.keys(RELICS).filter(id => !state.player.relics.has(id));
      if (unowned.length > 0) {
        const picked = unowned[Math.floor(Math.random() * unowned.length)];
        state.player.relics.add(picked);
        const r = RELICS[picked];
        if (r) showFeedback(`${r.icon} ${r.name}`, '#ffaa00');
      }
    } else if (reward.action === 'time_buff') {
      state.tempBuffs.push({ type: 'time', value: 8, expiresAtNode: state.level + 1 });
    }
  }
}

/**
 * 处理按键事件（通过 EventBus 接收）
 */
function handleKeyPress(data: { key: string; timestamp: number }): void {
  if (state.phase !== 'battle') return;
  if (isFrostFrozen()) return; // 寒霜冻结期间忽略输入
  initAudio();

  const k = data.key.toLowerCase();
  const expect = state.player.word[state.player.index]?.toLowerCase();

  // 伪词突变位置：接受原字母不卡住，且任何非突变字母都算识破
  const decoyOrig = getDecoyOriginalAt(state.player.index)
  if (k === expect) {
    playerCorrect(k);
    eventBus.emit('word:correct', { key: k, index: state.player.index - 1 });
  } else if (decoyOrig) {
    // 突变位置打出非突变字母 → 识破伪词，不卡住继续
    markDecoyRecognized()
    if (k === decoyOrig) {
      // 原字母：静默通过
      playerCorrect(k);
      eventBus.emit('word:correct', { key: k, index: state.player.index - 1 });
    } else {
      // 其他字母：算打错，但也算识破
      playerWrong();
      eventBus.emit('word:error', { key: k, expected: expect || '' });
    }
  } else {
    playerWrong();
    eventBus.emit('word:error', { key: k, expected: expect || '' });
  }
}

/**
 * Story 36.2: 小助手自动补全 — 按顺序执行剩余字母的 playerCorrect 逻辑
 * Story 41-5: 导出供 Charge 质变满蓄力自动完成使用
 */
/** 蓄力质变自动补全期间的额外暴击率（所有被触发技能共享） */
let _chargeAutoCritBonus = 0;
/** 获取蓄力质变自动补全期间的额外暴击率 */
export function getChargeAutoCritBonus(): number { return _chargeAutoCritBonus; }

/** 自动补全剩余字母（小助手 Tab / Charge 质变） */
export function performAutocomplete(source: 'tab' | 'charge' = 'tab'): void {
  const word = state.player.word;
  showFeedback(source === 'charge' ? '⚡ Auto ✓' : 'Tab ✓', '#00ff88');

  // Charge 质变：保存蓄力值，自动补全期间每次触发都吃到本次加成
  let chargeSnapshots: Map<string, number> | null = null;
  if (source === 'charge') {
    chargeSnapshots = new Map();
    let maxCritBonus = 0;
    for (const [skillId, rt] of state.affixSkillStates) {
      if (rt.chargeAccumulated > 0) {
        chargeSnapshots.set(skillId, rt.chargeAccumulated);
        // 计算蓄力暴击率：取所有蓄力技能中的最高值（受 maxBonus 限制）
        const skill = state.affixSkills.get(skillId);
        if (skill) {
          const chargeAffix = skill.affixes.find(a => a.type === AffixType.Charge);
          if (chargeAffix) {
            maxCritBonus = Math.max(maxCritBonus, Math.min(rt.chargeAccumulated, chargeAffix.maxBonus ?? 0));
          }
        }
      }
    }
    // 质变加成：所有被触发技能获得等量暴击率
    _chargeAutoCritBonus = maxCritBonus;
  }

  while (state.player.index < word.length) {
    // 恢复蓄力快照，让每个字母都吃到加成
    if (chargeSnapshots) {
      for (const [skillId, val] of chargeSnapshots) {
        const rt = state.affixSkillStates.get(skillId);
        if (rt) rt.chargeAccumulated = val;
      }
    }
    const k = word[state.player.index].toLowerCase();
    playerCorrect(k);
    eventBus.emit('word:correct', { key: k, index: state.player.index - 1 });
  }

  // 自动补全结束后清零蓄力 + 重置暴击率加成
  _chargeAutoCritBonus = 0;
  if (chargeSnapshots) {
    for (const [skillId] of chargeSnapshots) {
      const rt = state.affixSkillStates.get(skillId);
      if (rt) rt.chargeAccumulated = 0;
    }
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

  // 连击增加
  const prevComboMilestone = Math.floor(state.combo / 15);
  state.combo++;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  eventBus.emit('combo:update', { combo: state.combo });
  bumpCombo();

  // 击鼓传花：combo+5 → 随机叠层技能+3层
  const drumResult = checkDrumPass(state.combo);
  if (drumResult) {
    const rt = state.affixSkillStates.get(drumResult.skillId);
    if (rt) rt.stacks += drumResult.stacks;
  }

  // 计算倍率: 基础 + 连击加成 + 技能倍率加成
  let mult = state.player.baseMultiplier + state.combo * state.player.comboBonus;
  mult += synergy.skillMultBonus;
  state.multiplier = mult;

  // Story 36.3: 倍率棱镜 — 首次激活时反馈
  if (!prismActivated && state.player.relics.has('multiplier_prism') && state.multiplier >= 2.5) {
    prismActivated = true;
    pulseRelicIcon('multiplier_prism', '#66ccff');
  }

  // 字母基础分（每个正确击键基础 1 分）
  const letterBase = 1;
  const letterScore = letterBase * state.multiplier;
  wordBaseScore += letterBase; // 累计基础分（用于结算展示）
  state.resources.base += letterBase; // 写入资源
  state.wordScore += letterScore;

  // 词语效果加成：通过缓存的注册表解析 on_correct_keystroke
  if (letterRegistry) {
    const letterResult = EffectPipeline.resolve(letterRegistry, 'on_correct_keystroke', {
      currentKeystrokeKey: k,
    });
    if (letterResult.effects.score > 0) {
      synergy.letterBaseScore += letterResult.effects.score;
    }
    if (letterResult.effects.multiply > 0) {
      state.multiplier += letterResult.effects.multiply;
    }
    if (letterResult.effects.time > 0) {
      state.time = Math.min(state.time + letterResult.effects.time, state.timeMax);
    }
    if (letterResult.effects.gold > 0) {
      state.resources.gold += letterResult.effects.gold;
    }
  }

  // 太鼓节拍：记录击键 + 检查命中（结果存储在模块级变量，由 skills.ts 读取）
  if (state.player.relics.has('rhythm_adapt')) {
    recordKeypressForTaiko();
    updateTaikoJudge();
    const taikoMult = checkTaikoHit();
    if (taikoMult > 1) {
      pulseRelicIcon('rhythm_adapt', '#ffe66d');
    }
  }

  // 取消连锁：首字母时检查是否在取消窗口内
  if (state.player.index === 0 && checkCancelOnFirstLetter()) {
    const chainLv = getCancelChainCount();
    pulseRelicIcon('cancel', '#ff6b00');
    showFeedback(t('battle.cancel', { value: chainLv > 0 ? `+${chainLv * 10}%` : '' }), '#ff6b00');
  }

  // 触发技能（新系统：所有绑定技能都应触发）
  const shouldTrigger = !!skillId;
  if (shouldTrigger) {
    letter.classList.add('skill-triggered');
    juiceUp(letter, 0.4, 5); // 强力弹跳
    // T5 遗物：追踪左右手触发
    const hand = HAND_MAP[k];
    if (hand === 'left') leftHandTriggered = true;
    else if (hand === 'right') rightHandTriggered = true;
    // Story 36.6: 双手协奏 — 左右手交替击键加时间
    const concertoBonus = checkDualConcerto(k);
    if (concertoBonus > 0) {
      state.time += concertoBonus;
      showFeedback(t('battle.dual_concerto', { value: concertoBonus }), '#00ff88', undefined, undefined, { relicId: 'dual_concerto', resource: 'time', amount: concertoBonus });
    }
    // 换行奖励 — 跨行按键+1金币
    const rowSwitchGold = checkRowSwitch(k);
    if (rowSwitchGold > 0) {
      state.player.gold += rowSwitchGold;
      state.resources.gold += rowSwitchGold;
      showFeedback(`↕️ +${rowSwitchGold}g`, RESOURCE_COLORS.gold, undefined, undefined, { relicId: 'row_switch', resource: 'gold', amount: rowSwitchGold });
    }
    // Charge: 按住蓄力，暂停字母推进
    if (isChargeSkill(skillId)) {
      _pendingChargeTriggers.set(k.toUpperCase(), { skillId, key: k, letterIndex: state.player.index });
      _chargeHolding = true;
      // 计算蓄满所需时间，驱动进度条动画
      const chargeAffix = state.affixSkills.get(skillId)?.affixes.find(a => a.type === AffixType.Charge);
      const rt = state.affixSkillStates.get(skillId);
      const maxBonus = chargeAffix?.maxBonus ?? 1;
      const remaining = maxBonus - (rt?.chargeAccumulated ?? 0);
      // 始终 1 秒蓄满：速率 = maxBonus/s
      const duration = remaining / maxBonus;
      letter.style.setProperty('--charge-duration', `${duration}s`);
      letter.classList.add('charging');
    } else {
      triggerSkill(skillId, k);
    }
    // Story 36.4: 首发强化反馈（每词第一个技能 +10分）
    if (synergy.wordSkillCount === 1 && state.player.relics.has('first_strike')) {
      pulseRelicIcon('first_strike', '#ffaa00');
      showFeedback(t('battle.first_strike'), '#ffaa00', undefined, undefined, { relicId: 'first_strike', resource: 'score', amount: 10 });
    }
    // Story 36.4: 少而精反馈（本关首次激活）
    if (!lessIsMoreShown && state.player.relics.has('less_is_more') && state.player.skills.size < 10) {
      lessIsMoreShown = true;
      pulseRelicIcon('less_is_more', '#66ccff');
    }
  }

  // Story 36.2: 回声指套 — 8% 概率双重击键（combo+1 + 倍率更新 + 技能二次触发）
  if (checkEchoThimble(random())) {
    state.combo++;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    eventBus.emit('combo:update', { combo: state.combo });
    // 重新计算 multiplier 以反映新 combo
    mult = state.player.baseMultiplier + state.combo * state.player.comboBonus;
    mult += synergy.skillMultBonus;
    state.multiplier = mult;
    if (skillId) {
      // Story 37.4: 闪光连线 + 覆盖锚点（从遗物图标到刚输入的字母）
      const echoIdx = getRelicIndex('echo_thimble');
      const echoLetterIdx = state.player.index - 1;
      if (echoIdx >= 0) {
        const wordEl = getElements().word;
        const letterEl = wordEl.children[echoLetterIdx] as HTMLElement | undefined;
        if (letterEl) flashRelicLine(echoIdx, letterEl, '#4ecdc4');
      }
      triggerSkill(skillId, k, { letterIndex: echoLetterIdx });
    }
  }

  // Story 36.3: 连击引爆 — combo 达 15 时随机触发 3 个装备技能
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
    const detonateRelicIdx = getRelicIndex('combo_detonator');
    for (let i = 0; i < count; i++) {
      const sid = shuffled[i];
      const boundKey = [...state.player.bindings.entries()]
        .find(([, v]) => v === sid)?.[0] ?? k;
      // Story 37.4: 计算锚点 + 闪光连线
      const chainAnchor = resolveChainAnchor(boundKey);
      if (detonateRelicIdx >= 0) {
        if (chainAnchor.letterIndex !== undefined) {
          const letterEl = getElements().word.children[chainAnchor.letterIndex] as HTMLElement | undefined;
          if (letterEl) flashRelicLine(detonateRelicIdx, letterEl, '#ff6b00');
        } else {
          flashRelicLine(detonateRelicIdx, 'active-library', '#ff6b00');
        }
      }
      triggerSkill(sid, boundKey, chainAnchor);
    }
    showFeedback(t('battle.detonate', { value: count }), '#ff6b00');
  }

  // 附魔外部事件：连击达 15 的倍数 → 学徒·连击成长
  const newComboMilestone = Math.floor(state.combo / 15);
  if (newComboMilestone > prevComboMilestone) {
    const _gm = getApprenticeGrowthMultiplier();
    for (let m = 0; m < newComboMilestone - prevComboMilestone; m++) {
      for (const [, skill] of state.affixSkills) {
        const rt = state.affixSkillStates.get(skill.id);
        if (!rt) continue;
        applyApprenticeEvent('comboReach', rt, skill.enchantmentIds, _gm);
      }
    }
  }

  spawnParticles(letter, shouldTrigger ? 10 : 5, '#4ecdc4');
  playSound('type');

  // Boss 修饰器：击键代价 — 每次正确击键 -1s
  if (getActiveParams()?.keystrokeTaxActive) {
    state.time -= getShieldedValue(1, true);
  }

  // Charge 按住蓄力：字母推进延迟到释放（releaseCharge）
  if (!_chargeHolding) {
    state.player.index++;

    // 小助手：首字母完成后显示 Tab 提示
    if (state.player.index === 1 && state.player.relics.has('little_helper') && isRepeatWord(state.player.word)) {
      const existing = el.word.querySelector('.tab-hint');
      if (!existing) {
        const hint = document.createElement('span');
        hint.className = 'tab-hint';
        hint.textContent = t('battle.tab_hint');
        el.word.appendChild(hint);
      }
    }

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
  }

  updateHUD();

  // 技能产出的资源弹跳由飞行动画到达时触发（见 createFloatText）
}

function playerWrong(): void {
  const el = getElements();
  const letter = el.word.children[state.player.index] as HTMLElement;

  letter?.classList.add('wrong');
  setTimeout(() => letter?.classList.remove('wrong'), 150);

  el.container.classList.add('shake');
  setTimeout(() => el.container.classList.remove('shake'), 120);

  playSound('wrong');

  // Story 36.2: 回归基本功 — 不再即死（旧玻璃大炮逻辑已移除）

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

  // 猎物悬赏：打错通知
  onBountyError();

  // 取消连锁：取消状态下打错 → 连锁归零 + 扣时间（没看清就打的代价）
  const cancelPenalty = onCancelledWordError();
  if (cancelPenalty > 0) {
    state.time -= cancelPenalty;
    showFeedback(t('battle.cancel_error', { value: cancelPenalty }), '#ff4444');
  }

  if (state.combo > 5) showFeedback(t('battle.combo_break', { combo: state.combo }), '#ff6b6b');

  // 遗物 on_combo_break 管道解析（完美主义者断连击失去遗物）
  resolveRelicEffectsWithBehaviors('on_combo_break', {}, {
    onRemoveRelic: (relicId: string) => {
      state.player.relics.delete(relicId);
      showFeedback(t('battle.relic_break'), '#ff4444');
    },
  });

  // Story 36.3: 连击缓冲 — 保留 50% combo
  const buffered = calculateComboBuffer(state.combo);
  state.combo = buffered;
  state.lastMilestone = 0;
  synergy.skillMultBonus = 0;
  if (buffered > 0) {
    pulseRelicIcon('combo_buffer', '#4ecdc4');
    state.multiplier = state.player.baseMultiplier + buffered * state.player.comboBonus;
  } else {
    state.multiplier = state.player.baseMultiplier;
  }
  // 蓄势引爆：combo 中断后重置（允许再次蓄力）
  onComboBreakDetonator();
  // Boss 修饰器：寒霜侵蚀 — 打错冻结 1+N 秒
  const frostDuration = triggerFrostFreeze();
  if (frostDuration > 0) {
    showFeedback(t('battle.frostbite_freeze', { value: frostDuration }), '#00ccff');
  }

  updateHUD();
}

function completeWord(): void {
  const el = getElements();

  // 计算基础分（字母击键 + 技能基础分 + 词语效果底分 + 字母底分加成）
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
        showFeedback(`+${refund.toFixed(1)}s`, '#00ff88', getFloatScale('time', refund), undefined, { relicId: 'perfect_rhythm', resource: 'time', amount: refund });
      }
    },
  });
  // 狂战士面具等遗物的 multiply 加成
  bonusMult += wordRelicResult.effects.multiply;

  // Story 36.4: 爵士乐 — 一词内 ≥3 种不同词条类型时得分 +10%×N
  const jazzBonus = checkJazzBonus();
  if (jazzBonus > 0) {
    bonusMult += jazzBonus;
    showFeedback(t('battle.jazz', { value: Math.round(jazzBonus * 100) }), '#ffaa00', undefined, { fromElementId: 'score-settlement', resource: 'settle' });
    pulseRelicIcon('jazz', '#ffaa00');
  }

  // Story 36.2: 减速津贴 / 加速奖金 — 当前词与上个词用时比较
  const speedResult = checkSpeedRelics(wordElapsed);
  if (speedResult.timeBonus > 0) {
    state.time += speedResult.timeBonus;
    showFeedback(t('battle.decelerate_reward', { value: speedResult.timeBonus }), '#00ff88', undefined, undefined, { relicId: 'decelerate_reward', resource: 'time', amount: speedResult.timeBonus });
    pulseRelicIcon('decelerate_reward', '#00ff88');
  }
  if (speedResult.goldBonus > 0) {
    state.player.gold += speedResult.goldBonus;
    state.resources.gold += speedResult.goldBonus;
    showFeedback(t('battle.accelerate_reward', { value: speedResult.goldBonus }), '#ffe66d', undefined, undefined, { relicId: 'accelerate_reward', resource: 'gold', amount: speedResult.goldBonus });
    pulseRelicIcon('accelerate_reward', '#ffe66d');
  }

  const finalMult = mult * bonusMult;
  // 分数类技能已在触发时即时计入 state.score，此处仅结算 基数×倍率
  let finalWordScore = Math.floor(baseChips * finalMult);

  // Boss 修饰器：单词限额（cap）+ 递减收益（diminish）+ 得分税 + Story 36.11 护盾削弱
  const modEffect = getActiveParams();
  if (modEffect?.scoreCapPct) {
    const cap = Math.floor(state.targetScore * modEffect.scoreCapPct);
    finalWordScore = Math.min(finalWordScore, getShieldedScoreCap(cap));
  }
  if (modEffect?.diminishRate) {
    finalWordScore = Math.floor(finalWordScore * getDiminishMultiplier());
    incrementDiminishCount();
  }
  if (modEffect?.scoreTaxPct) {
    const tax = Math.floor(state.targetScore * modEffect.scoreTaxPct);
    const taxShielded = Math.floor(getShieldedValue(tax, true));
    finalWordScore = Math.max(0, finalWordScore - taxShielded);
  }

  // Story 36.12: 基数护盾 — 每词最低 20 分（Boss 修饰器之后）
  const preShield = finalWordScore;
  finalWordScore = applyBaseShield(finalWordScore);
  if (finalWordScore > preShield) {
    pulseRelicIcon('base_shield', '#44ddaa');
  }
  // Story 36.12: 雪球效应 — 每词得分递增 5%
  const preSnowball = finalWordScore;
  finalWordScore = applySnowball(finalWordScore);
  if (finalWordScore > preSnowball) {
    const pct = (getSnowballWordIndex() - 1) * 5;
    showFeedback(t('battle.snowball', { value: String(pct) }), '#88ccff', 0.6, { fromElementId: 'score-settlement', resource: 'settle' });
    pulseRelicIcon('snowball', '#88ccff');
  }

  // §12: 暴击风暴 — 单词内 ≥2 次暴击时整词产出 +50%
  const critStormBonus = getCritStormBonus();
  if (critStormBonus > 0) {
    finalWordScore = Math.floor(finalWordScore * (1 + critStormBonus));
    showFeedback(t('battle.crit_storm', { value: '50' }), '#f1c40f', undefined, { fromElementId: 'score-settlement', resource: 'settle' });
    pulseRelicIcon('crit_storm', '#f1c40f');
  }
  resetCritRelicWordState();

  // 词根共振：完词 → 所有叠层技能+N层
  const wordResStacks = getWordResonanceStacks(state.player.word.length);
  if (wordResStacks > 0) {
    for (const [sid, sk] of state.affixSkills) {
      if (sk.affixes.some(a => isStackingAffix(a.type))) {
        const rt = state.affixSkillStates.get(sid);
        if (rt) rt.stacks += wordResStacks;
      }
    }
  }

  // Boss 修饰器：伪词干扰 — 未识破伪词则反扣分数
  if (isDecoyWord() && !isDecoyRecognized()) {
    finalWordScore = -finalWordScore;
    showFeedback(t('battle.decoy_penalty'), '#ff4444');
  }

  // 显示 Balatro 风格完成动画
  showSettlementComplete(baseChips, finalMult, finalWordScore);

  // Story 36.12: 分数黑洞 — 累计到隐藏池，跳过分数结算和胜利检查
  let milestone: ReturnType<typeof checkMilestone> = null;
  if (isBlackHoleActive()) {
    let poolScore = hasGlassCannon() ? finalWordScore * 10 : finalWordScore;
    if (hasKeyStorm()) poolScore = Math.floor(poolScore * KEY_STORM_SCORE_PENALTY);
    accumulateBlackHole(poolScore);
  } else {
    const prevScore = state.score;
    state.score += finalWordScore;

    // Story 36.2: 回归基本功 — 分两阶段演出：先显示原始得分，再 ×10
    if (hasGlassCannon()) {
      bumpScore(finalWordScore);
      updateHUD();
      const wordGain = state.score - wordStartScore;
      const extraGain = wordGain * 9;
      const doubledScore = wordStartScore + wordGain * 10;
      finalWordScore = doubledScore - prevScore;
      _glassCannonTimer = setTimeout(() => {
        _glassCannonTimer = null;
        showFeedback(t('battle.glass_double', { extra: extraGain }), '#ff4444', 1.3, undefined, { relicId: 'glass_cannon', resource: 'score', amount: extraGain });
        state.score = doubledScore;
        updateHUD();
      }, 400);
    } else {
      bumpScore(finalWordScore);
    }

    // Story 36.6: 全键风暴 — 得分×0.5（同步扣分，避免绕过胜利判定的分数锁）
    if (hasKeyStorm()) {
      const wordGain = state.score - wordStartScore;
      const penalty = Math.floor(wordGain * (1 - KEY_STORM_SCORE_PENALTY));
      state.score -= penalty;
      bumpScore(-penalty);
      updateHUD();
      showFeedback(t('battle.key_storm_penalty', { value: penalty }), '#aa88ff', 1.3);
    }

    // Story 31.4: 高分慢动作结算（≥1000 分）
    if (finalWordScore >= 1000) {
      triggerSlowMotion(300, 0.7);
    }

    // Story 31.5: 分数里程碑庆祝
    milestone = checkMilestone(prevScore, state.score);
    if (milestone) showMilestoneCelebration(milestone);
  }

  // 战后统计
  if (state.battleStats) {
    state.battleStats.wordsCompleted++;
    if (state.wordPerfect) state.battleStats.perfectWords++;
  }

  // 猎物悬赏：检查完成
  const bountyGold = checkBountyOnWordComplete({
    combo: state.combo,
    wordsCompleted: state.battleStats?.wordsCompleted || 0,
    wordTime: wordElapsed,
    perfect: state.wordPerfect,
  });
  if (bountyGold > 0) {
    state.gold += bountyGold;
    state.resources.gold += bountyGold;
    showFeedback(t('battle.bounty_complete', { value: String(bountyGold) }), '#ffaa00');
    pulseRelicIcon('elite_hunter', '#ffaa00');
  }

  // 发送词语完成事件
  eventBus.emit('word:complete', {
    word: state.player.word,
    score: finalWordScore,
    perfect: state.wordPerfect
  });

  // 附魔外部事件：单词完成 → 学徒/任务成长
  const _growthMult = getApprenticeGrowthMultiplier();
  for (const [, skill] of state.affixSkills) {
    const rt = state.affixSkillStates.get(skill.id);
    if (!rt) continue;
    applyApprenticeEvent('wordComplete', rt, skill.enchantmentIds, _growthMult);
    if (state.player.word.length >= 6) {
      applyApprenticeEvent('longWordComplete', rt, skill.enchantmentIds, _growthMult);
    }
    if (state.wordPerfect) {
      applyApprenticeEvent('perfectWord', rt, skill.enchantmentIds, _growthMult);
    }
  }

  // 消行满贯 — 一词命中一行所有已装备技能时额外触发(50%产出)
  const lineClearTargets = checkLineClear();
  if (lineClearTargets.length > 0) {
    showFeedback(`🎖️ 消行! ×${lineClearTargets.length}`, '#ffd700');
    pulseRelicIcon('line_clear', '#ffd700');
    for (const target of lineClearTargets) {
      triggerSkill(target.skillId, target.key, undefined, LINE_CLEAR_OUTPUT_RATIO);
    }
  }

  // Story 36.6: 全键风暴 — 每命中1个技能，随机触发1个未命中技能
  const stormTargets = checkKeyStorm(synergy.wordSkillCount, state.player.word, random);
  if (stormTargets.length > 0) {
    // Story 37.4: 全键风暴触发的技能绑定键不在本词中，浮字从 active-library 生成
    const stormRelicIdx = getRelicIndex('key_storm');
    const stormAnchor = { fromElementId: 'active-library' };
    // 闪光连线只发一次（所有目标都飞向同一个 active-library）
    if (stormRelicIdx >= 0) flashRelicLine(stormRelicIdx, 'active-library', '#aa88ff');
    for (const target of stormTargets) {
      triggerSkill(target.skillId, target.key, stormAnchor);
    }
  }
  if (stormTargets.length > 0) {
    showFeedback(t('battle.key_storm', { value: stormTargets.length }), '#aa88ff');
  }

  // Story 36.8: 资源潮汐 — 4词循环提示
  if (state.player.relics.has('resource_tide')) {
    const tideLabel = t(`battle.resource_tide_${getCurrentTideResource()}`);
    showFeedback(tideLabel, '#4488ff', 0.8);
  }
  incrementWordParity();

  // Story 36.7: 词汇收藏 — 首次完成的单词+3金币
  const collectionGold = checkWordCollection(state.player.word);
  if (collectionGold > 0) {
    state.gold += collectionGold;
    state.resources.gold += collectionGold;
    _battleRelicGold += collectionGold;
    showFeedback(`📚 +${collectionGold}💰`, '#ffe66d', undefined, undefined, { relicId: 'word_collection', resource: 'gold', amount: collectionGold });
  }

  // Story 36.7: 长词达人 — 6+字母单词完成时+1s
  const longWordTime = checkLongWordMaster(state.player.word.length);
  if (longWordTime > 0) {
    state.time += longWordTime;
    showFeedback(t('battle.long_word_time', { value: longWordTime }), '#00ff88', undefined, undefined, { relicId: 'long_word_master', resource: 'time', amount: longWordTime });
  }

  // 修饰器屏障：前 3 词完成后激活延迟的临时修饰器
  const barrierMods = checkBarrierActivation();
  if (barrierMods) {
    for (const { modId, isElite } of barrierMods) {
      if (!isModifierActive(modId)) {
        applyModifier(modId, isElite, false);
      }
    }
    // 激活后补充：修饰器护盾 targetMultiplier 修正
    const modParams = getActiveParams();
    if (modParams?.targetMultiplier && state.player.relics.has('modifier_shield')) {
      const shielded = getShieldedTargetMultiplier(modParams.targetMultiplier);
      state.targetScore = Math.floor(state.targetScore * shielded / modParams.targetMultiplier);
    }
    // 激活后补充：修饰器反转
    if (state.player.relics.has('modifier_reversal') && getActiveModifierEffect()) {
      applyModifierReversal();
      showFeedback(t('battle.modifier_reversal'), '#ff8800');
    }
    showFeedback(t('battle.barrier_activate'), '#ff4444');
    // 更新 HUD 移除延迟标记
    const hintEl = document.querySelector('#modifier-info .modifier-hint');
    if (hintEl) {
      const delayTag = ` (${t('battle.barrier_delayed')})`;
      if (hintEl.textContent?.endsWith(delayTag)) {
        hintEl.textContent = hintEl.textContent.slice(0, -delayTag.length);
      }
    }
  }

  // Story 36.11: 混沌轮盘 — Boss关每5词替换一个修饰器
  if (checkChaosRoulette()) {
    showFeedback(t('battle.chaos_roulette'), '#ff44ff');
  }

  // Boss 修饰器：击键代价 — 产出资源时也 -1s（每种资源各扣一次）
  if (getActiveParams()?.keystrokeTaxActive) {
    const resCount = getWordResourceTypeCount();
    if (resCount > 0) {
      const penalty = getShieldedValue(1, true) * resCount;
      state.time -= penalty;
    }
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

  // 取消连锁：被取消的词零失误完成 → 连锁+1
  if (state.wordPerfect) {
    onCancelledWordComplete();
  }

  // Story 36.2: 完成后记录单词（小助手补全需要"已打过"判定）
  trackWord(state.player.word);

  // Story 42.2: 达标后继续战斗 — 设标志+反馈，不中断（校准关跳过）
  // 镜像试炼：首次达标 → 记录用时、重置分数、进入 mirror_run
  if (!_isCalibrationLevel && !isBlackHoleActive() && !_targetReached && state.score >= state.targetScore) {
    const mirrorAction = onMirrorTargetReached(_elapsedSeconds);
    if (mirrorAction === 'reset') {
      // 镜像首通：重置分数，进入 mirror_run（倒计时由 onTick 驱动）
      state.score = 0;
      showFeedback(t('battle.mirror_first_clear'), '#8888ff');
      playSound('levelup');
    } else {
      _targetReached = true;
      _targetReachedTime = state.time; // 记录达标时剩余时间（万物熔炉等遗物需要）
      _accelAtTarget = getTimeAcceleration(_elapsedSeconds, _isBoss);
      _elapsedAtTarget = _elapsedSeconds;
      getElements().container.classList.add('glow-target-reached');
      showFeedback(getMirrorPhase() === 'done' && isModifierActive('boss_mirror') ? t('battle.mirror_survived') : t('battle.target_reached'), '#4ecdc4');
      playSound('levelup');
      screenShake(3); // Review Fix #5: 达标绿色脉冲
    }
  }

  // 遗物效果：完成词语时间加成（当前 RELIC_MODIFIER_DEFS 为空，此分支不会触发）
  if (wordRelicResult.effects.time > 0) {
    state.time += wordRelicResult.effects.time;
    showFeedback(`+${wordRelicResult.effects.time.toFixed(1)}s`, '#00ff88', getFloatScale('time', wordRelicResult.effects.time));
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

  // 黑洞模式：结算面板照常播放动画但隐藏数值
  const bhHidden = isBlackHoleActive() && !hasBlackHoleSettled();
  if (chipsEl) chipsEl.textContent = bhHidden ? '?' : chips.toLocaleString();
  if (multEl) multEl.textContent = bhHidden ? '?' : mult.toFixed(1);
  if (finalEl) {
    finalEl.textContent = bhHidden ? '???' : total.toLocaleString();
    // 分数颜色分级 (Story 31.1)
    finalEl.classList.remove(...SCORE_TIER_CLASSES);
    if (!bhHidden) {
      const tier = getScoreTier(total);
      if (tier) finalEl.classList.add(tier);
    }
  }

  // 播放完成动画
  settlement.classList.remove('settlement-live');
  settlement.classList.add('settlement-complete');

  // 完成动画后恢复到实时模式（仅在未被 hideSettlement 隐藏时）
  settlementTimeouts.push(setTimeout(() => {
    if (settlement.classList.contains('settlement-hidden')) return;
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

  // ��算奖励：���础100 + 溢出增��（上限100%）（结算时发放��� + 技能产出 + 遗物加成
  let baseGold = 100;
  const skillGold = Math.floor(state.resources.gold) - _battleRelicGold;
  const goldRelicResult = resolveRelicEffects('on_battle_end', { overkill: state.overkill, remainingTime: state.time });
  let relicGold = Math.floor(goldRelicResult.effects.gold) + _battleRelicGold;

  // Story 36.8: 万物熔炉 — 覆盖默认金币计算
  // Story 42.2: 传入达标时的剩余时间（战斗打到时间耗尽后 state.time=0）
  const furnaceResult = checkUniversalFurnace(_targetReachedTime);
  if (furnaceResult) {
    baseGold = 0;
    relicGold = furnaceResult.bonusGold;
  }

  // 猎物悬赏：zero_errors 在关卡结束时检查
  const bountyEndGold = checkBountyOnStageEnd();
  if (bountyEndGold > 0) {
    showFeedback(t('battle.bounty_complete', { value: String(bountyEndGold) }), '#ffaa00');
    pulseRelicIcon('elite_hunter', '#ffaa00');
  }
  // Story 36.12: S 级奖杯 — 高评级额外金币（独立加算，不受乘法影响）
  const trophyGold = getSRankTrophyGold(state.battleStats?.rating || 'B');
  if (trophyGold > 0) {
    showFeedback(t('battle.s_rank_trophy', { value: String(trophyGold), rating: state.battleStats?.rating || 'S' }), '#ffdd00', undefined, undefined, { relicId: 's_rank_trophy', resource: 'gold', amount: trophyGold });
  }
  // 及格万岁 — 低评级额外金币（独立加算）
  const underdogGold = getUnderdogBonusGold(state.battleStats?.rating || 'B');
  if (underdogGold > 0) {
    showFeedback(t('battle.underdog_bonus', { value: String(underdogGold), rating: state.battleStats?.rating || 'B' }), '#4ecdc4', undefined, undefined, { relicId: 'underdog_bonus', resource: 'gold', amount: underdogGold });
  }
  const totalGold = Math.floor(baseGold + skillGold + relicGold) + trophyGold + underdogGold + bountyEndGold;

  // 设置数值
  const goldSkillEl = document.getElementById('gold-skill');
  const goldTreasureEl = document.getElementById('gold-treasure');
  const goldTotalEl = document.getElementById('gold-total');

  // 基础金币行：固定100
  const baseRow = document.getElementById('gold-base-row');
  if (baseRow) {
    const baseValEl = baseRow.querySelector('.gold-reward-value');
    if (baseValEl) {
      baseValEl.textContent = '100';
    }
  }

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
// 时间加速 — 达标前二次方，达标后先三次方 30 秒再转指数
// boss_fast_time: 开局即进入达标后加速阶段（指数增长从 t=0 开始）
function getTimeAcceleration(elapsedSeconds: number, isBoss: boolean): number {
  const rate = isBoss ? BALANCE.ACCEL_RATE_BOSS : BALANCE.ACCEL_RATE_STANDARD;
  const fastTime = !!getActiveParams()?.timeSpeed;
  if (_targetReached) {
    const dt = elapsedSeconds - _elapsedAtTarget;
    if (dt <= BALANCE.POST_TARGET_CUBIC_WINDOW) {
      // 三次方阶段：从达标倍率无缝衔接
      return _accelAtTarget + rate * dt * dt * dt;
    }
    // 指数阶段：从三次方末端倍率无缝衔接
    const w = BALANCE.POST_TARGET_CUBIC_WINDOW;
    const cubicEnd = _accelAtTarget + rate * w * w * w;
    const expDt = dt - w;
    return cubicEnd * Math.pow(1.6, rate * expDt * expDt * expDt);
  }
  if (fastTime) {
    // 视作从 t=0 即达标：指数增长
    return 1.0 * Math.pow(1.6, rate * elapsedSeconds * elapsedSeconds * elapsedSeconds);
  }
  return 1.0 + rate * elapsedSeconds * elapsedSeconds;
}

function startTimer(): void {
  state.time = state.timeMax + state.player.timeBonus;
  state.resources.time = state.time; // 同步资源
  if (timerInterval) clearInterval(timerInterval);
  _isBoss = getStageType(state.level) === 'boss'; // Story 42.4: 模块级缓存

  timerInterval = setInterval(() => {
    if (state.phase !== 'battle') {
      if (timerInterval) clearInterval(timerInterval);
      return;
    }
    if (battlePaused) return;

    _elapsedSeconds += 0.1; // Story 42.4: 追踪已流逝时间

    // Boss 修饰器：渐进失控（escalation）+ Story 36.11 护盾削弱
    // boss_fast_time 已由 getTimeAcceleration 处理（开局即三次方加速）
    let timeSpeed = 1;
    const escalateBonus = getEscalateTimeSpeedBonus();
    if (escalateBonus > 0) timeSpeed += getShieldedValue(escalateBonus, true);
    const timeAccel = getTimeAcceleration(_elapsedSeconds, _isBoss); // Story 42.4: 二次方加速
    state.time -= 0.1 * timeSpeed * getTimeScale() * timeAccel; // Story 31.4: 慢动作 + 42.4 加速

    // Charge 按住蓄力：每帧累加，蓄满自动释放
    const chargeFull = updateChargeProducers(0.1);
    for (const fullKey of chargeFull) {
      releaseCharge(fullKey);
    }

    // Boss 修饰器：每帧更新（decay 等），dt 随时间加速缩放
    tickModifier(0.1 * timeSpeed);

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
      // Story 42.2: 时间耗尽 — 计算 overkill 后结算
      state.overkill = Math.max(0, state.score - state.targetScore);
      endLevel();
    }
  }, 100);
}

function updateTimerDisplay(): void {
  const el = getElements();
  const totalTime = state.timeMax + state.player.timeBonus;

  // 滚轮目标：排除待确认的时间加成
  timerRoller.setTarget(Math.ceil(Math.max(0, state.time - _pendingTimeBonus)));
  // 显示由 rAF tick 更新

  // 实条：排除待确认的时间加成
  const confirmedTime = Math.max(0, state.time - _pendingTimeBonus);
  el.timerBar.style.width = (confirmedTime / totalTime * 100) + '%';

  // 虚条：覆盖待确认区域（从 0 到 state.time 的完整宽度）
  const ghostEl = document.getElementById('timer-bar-ghost');
  if (ghostEl) {
    if (_pendingTimeBonus > 0) {
      ghostEl.style.width = (state.time / totalTime * 100) + '%';
      ghostEl.style.opacity = '0.35';
    } else {
      ghostEl.style.width = el.timerBar.style.width;
      ghostEl.style.opacity = '0';
    }
  }

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

  // 危险光晕：time <= 10s 时显示（达标光晕通过 CSS 顺序覆盖）
  el.container.classList.toggle('glow-danger', state.time <= 10);

  // Story 42.4: 倍率 HUD 更新
  const accel = getTimeAcceleration(_elapsedSeconds, _isBoss);
  const accelText = '×' + accel.toFixed(1);
  // Review Fix #1: 检查显示文本而非数值 — toFixed(1) 的 "×1.0" 应隐藏
  if (accelText === '×1.0') {
    el.timeAccel.classList.remove('visible');
  } else {
    el.timeAccel.classList.add('visible');
    el.timeAccel.textContent = accelText;
    // 颜色渐变
    if (accel < 1.3) el.timeAccel.style.color = '#fff';
    else if (accel < 1.6) el.timeAccel.style.color = '#ffe66d';
    else if (accel < 2.0) el.timeAccel.style.color = '#ff8844';
    else el.timeAccel.style.color = '#ff4444';
    // 脉冲动画：显示文本变化时触发
    if (accelText !== _lastAccelText && _lastAccelText !== '') {
      el.timeAccel.classList.remove('accel-pulse');
      void el.timeAccel.offsetWidth; // force reflow
      el.timeAccel.classList.add('accel-pulse');
    }
  }
  _lastAccelText = accelText;
}

// === 关卡评级 ===
// === 关卡系统 ===
function endLevel(): void {
  if (timerInterval) clearInterval(timerInterval);
  _pendingChargeTriggers.clear();
  _chargeHolding = false;
  releaseBGMTension();
  stopBGM();
  stopScoreRoller(); // Story 31.4
  stopTaikoSpawner();
  clearPseudoInfinite();
  getElements().container.classList.remove('glow-danger', 'glow-target-reached');
  clearFloatQueue();
  cleanupModifier();
  setRelicGarbleActive(false);
  hideSettlement();

  // Story 45.12: Ethereal 关卡结束移除
  for (const [skillId, skill] of state.affixSkills) {
    const rt = state.affixSkillStates.get(skillId);
    if (rt?.etherealTriggered) {
      // 质变·永恒：50% 概率续命
      const etherealSurvives = rt.questTransformed
        && skill.enchantmentIds?.includes(EnchantmentTypeEnum.QuestEthereal)
        && Math.random() < 0.5;
      if (!etherealSurvives) {
        // 还原 +1 级增幅（排除 Ethereal 自身——它即将被移除）
        const otherAffixes = skill.affixes.filter(a => a.type !== AffixType.Ethereal);
        if (otherAffixes.length > 0) {
          applyAffixLevelScaling(otherAffixes, -1);
        }
        removeAffixAtRuntime(skill, AffixType.Ethereal);
        // etherealTriggered 保持 true 作为永久消耗标记（商店排除用）
      }
      // 续命时保留词条但重置触发标记（下关重新判定）
      if (etherealSurvives) rt.etherealTriggered = false;
    }
  }

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

  // 校准关：保存得分作为后续目标基数，视为通关
  // Story 54.2: effectiveScore = max(practiceScore, ascensionLevel × floorPerLevel)
  let _calibrationEffectiveScore = 0;
  if (_isCalibrationLevel) {
    const floor = state.ascensionLevel * PRACTICE_GOLD.FLOOR_PER_LEVEL;
    _calibrationEffectiveScore = Math.max(state.score, floor);
    state.calibratedTargetBase = Math.max(1, Math.round(_calibrationEffectiveScore));
  }

  if (_isCalibrationLevel || state.score >= state.targetScore) {
    // Story 42.3: 仅保留本关溢出分到下一关（不跨关累积）
    state.overflowScore = _isCalibrationLevel ? 0 : state.overkill;

    // 动态增长系数：记录溢出比例供下关目标分数计算
    state.lastOverflowRatio = state.targetScore > 0 ? state.overkill / state.targetScore : 0;

    // 附魔外部事件：通关 → 学徒·通关成长
    const _sgm = getApprenticeGrowthMultiplier();
    for (const [, skill] of state.affixSkills) {
      const rt = state.affixSkillStates.get(skill.id);
      if (!rt) continue;
      applyApprenticeEvent('stageCleared', rt, skill.enchantmentIds, _sgm);
    }

    // Mirror 词条复制：每关结束时刷新（Story 40.11: 多格技能使用完整占据键）
    const bs = getBindingState(state);
    for (const [, skill] of state.affixSkills) {
      if (!skill.affixes.some(a => a.type === AffixType.Mirror)) continue;
      const rt = state.affixSkillStates.get(skill.id);
      if (!rt) continue;
      const allKeys = getSkillKeys(bs, skill.id);
      if (allKeys.length === 0) continue;
      const anchorKey = getSkillAnchorKey(bs, skill.id) ?? allKeys[0];
      const mirrorCtx = {
        triggerKey: anchorKey,
        occupiedKeys: allKeys,
        currentWord: '',
        resources: { base: 0, score: 0, multiplier: 1, time: 0, gold: 0, energy: 0, mutagen: 0 },
        classResourceProduced: {},
        bindings: state.player.bindings,
        skillStates: state.affixSkillStates,
        allSkills: state.affixSkills,
        randomFn: random,
      };
      // Story 41-5: 质变模式 — 复制所有不同类型词条
      if (isAffixGloballyTransformed(AffixType.Mirror, state.affixSkills, state.affixSkillStates)) {
        rt.mirrorCopiedAffixes = resolveMirrorCopyAllAffixes(skill, rt, mirrorCtx);
        rt.mirrorCopiedAffix = rt.mirrorCopiedAffixes.length > 0 ? rt.mirrorCopiedAffixes[0] : null;
      } else {
        rt.mirrorCopiedAffix = resolveMirrorCopy(skill, rt, mirrorCtx);
        rt.mirrorCopiedAffixes = [];
      }
    }

    trackEvent('demo_stage_complete', { stage: state.level, score: state.score });
    const rating = state.battleStats?.rating || 'B';
    showRatingReveal(rating, () => {
      startBGM('chill');

      // 致命礼物丰厚层级：弹出史诗/传说遗物三选一，完成后继续正常流程
      const continueAfterDeadlyGift = (next: () => void) => {
        if (_pendingDeadlyGiftRelicPick && hasUnownedRelics()) {
          _pendingDeadlyGiftRelicPick = false;
          const epicLegendary = { common: 0, rare: 0, epic: 50, legendary: 50 };
          showRelicPicker(next, epicLegendary);
        } else {
          _pendingDeadlyGiftRelicPick = false;
          next();
        }
      };

      const currentType = getStageType(state.level);

      if (currentType === 'boss') {
        // 第 3 周目 Boss 通关 → 游戏胜利
        if (state.cycle >= 3) {
          victory();
          return;
        }
        // 非最终周目：周目推进 → 永久修饰器 → 传说遗物 → 致命礼物 → 商店
        advanceCycle();
        const permMod = drawSingleBossModifier(state.activeModifiers);
        if (permMod) {
          state.activeModifiers.push(permMod);
          const meta = getBossModifierMeta(permMod);
          if (meta) {
            const modName = t(`modifier.${meta.id}`) !== `modifier.${meta.id}` ? t(`modifier.${meta.id}`) : meta.name;
            showFeedback(`${meta.icon} ${modName}`, '#ff4444');
          }
        }
        const legendaryWeights = { common: 0, rare: 0, epic: 0, legendary: 100 };
        continueAfterDeadlyGift(() => {
          if (hasUnownedRelics()) {
            showRelicPicker(() => openShop(true), legendaryWeights);
          } else {
            openShop(true);
          }
        });
        return;
      }

      // 精英战胜利 → 金币奖励 → 致命礼物 → 史诗遗物 → 商店
      if (currentType === 'elite') {
        const epicWeights = { common: 0, rare: 0, epic: 100, legendary: 0 };
        showGoldReward(() => continueAfterDeadlyGift(() => {
          if (hasUnownedRelics()) {
            showRelicPicker(() => openShop(true), epicWeights);
          } else {
            openShop(true);
          }
        }));
        return;
      }

      // Story 54.2: 校准关 → 练习关金币映射（替代标准战斗金币）
      if (_isCalibrationLevel) {
        const practiceGold = computePracticeGold(_calibrationEffectiveScore, state.ascensionLevel);
        state.gold += practiceGold;
        showFeedback(t('practice.gold_earned', { gold: practiceGold }), '#ffe66d');
        continueAfterDeadlyGift(() => openShop(true));
        return;
      }

      // 普通关胜利 → 金币奖励 → 致命礼物 → 商店
      showGoldReward(() => continueAfterDeadlyGift(() => openShop(true)));
    }, playRatingSound);
  } else {
    // Story 36.10: 不死鸟 — 失败前检查复活
    const phoenixResult = checkPhoenixRevive();
    if (phoenixResult) {
      consumePhoenix();
      state.phase = 'battle';
      // Boss 关刷新修饰器（endLevel 顶部已 cleanup，此处重新 apply 所有临时修饰器）
      if (phoenixResult.refreshModifiers) {
        const stageType = getStageType(state.level);
        if (stageType === 'boss') {
          for (const bossModId of state.bossModifierPool) {
            if (bossModId && !isModifierActive(bossModId)) {
              applyModifier(bossModId, false);
            }
          }
        }
        // 精英关：重新应用精英修饰器（临时）
        if (stageType === 'elite' && state.eliteModifier && !isModifierActive(state.eliteModifier)) {
          applyModifier(state.eliteModifier, state.ascensionLevel < 3, false); // A3+: 不弱化
        }
      }
      _targetReached = false; // Story 42.2: 复活=重新开始，重置达标标志
      _targetReachedTime = 0;
      // Review C1: startTimer 会覆盖 state.time，必须在之后设置复活时间
      startTimer();
      state.time = phoenixResult.reviveTime;
      state.resources.time = state.time;
      // Review H2: endLevel 已 stopBGM，需重启战斗 BGM
      startBGM('battle');
      // Review M2: endLevel 已 stopScoreRoller，需重启分数滚轮
      startScoreRoller();
      renderRelicDisplay();
      showFeedback(t('battle.phoenix_revive'), '#ff6600', undefined, undefined, { relicId: 'phoenix', resource: 'time' });
      playSound('levelup');
      return;
    }
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

/** 先知之眼模态框：显示三个修饰器类别，玩家选择禁用一个 */

export async function startLevel(): Promise<void> {
  keyTooltip.hide();

  // === 仪式节点（精英关后）：打开休息关 ===
  if (isRitualNode(state.level)) {
    openRestStage();
    return;
  }

  // === Cycle 过渡演出（在切换到战斗画面前显示） ===
  showScreen('battle');
  const currentStageType = getStageType(state.level);
  const currentCycle = state.cycle;
  if (currentCycle !== lastCycle) {
    if (lastCycle > 0) {
      resolveRelicEffectsWithBehaviors('on_act_end', { endedAct: lastCycle });
    }
    await showActTransition(currentCycle);
    lastCycle = currentCycle;
  }

  state.phase = 'battle';
  initAudio();
  startBGM('battle');
  // 溢出分扣减目标分数，初始分数始终为 0
  state.score = 0;
  scoreRoller.reset(0);
  goldRoller.reset(Math.floor(state.resources.gold));
  comboRoller.reset(state.combo);
  timerRoller.reset(Math.ceil(state.time));
  multRoller.reset(Math.round(state.multiplier * 10));
  lastScoreTier = ''; // 重置分数分级缓存 (Review M1)
  // 保存上关结束 combo（不断之链追溯用）
  saveLastBattleCombo(state.combo);
  // Story 36.3: 不灭连击 — combo 跨关不重置
  if (!hasImmortalCombo()) {
    state.combo = 0;
    state.maxCombo = 0;
    state.multiplier = state.player.baseMultiplier;
  }
  state.wordScore = 0;
  state.overkill = 0;
  _targetReached = false; // Story 42.2: 每关重置达标标志
  _targetReachedTime = 0;
  _elapsedSeconds = 0; // Story 42.4: 每关重置已流逝时间
  _lastAccelText = ''; // Story 42.4: 重置倍率显示缓存

  // 清理过期临时 buff
  state.tempBuffs = state.tempBuffs.filter(b => state.level <= b.expiresAtNode);

  // 恢复过期封印键位（多格技能：恢复所有封印键位）
  const expiredSeals = state.sealedKeys.filter(s => state.level > s.expiresAtNode);
  // 按 skillId 分组封印键位
  const sealsBySkill = new Map<string, string[]>();
  for (const seal of expiredSeals) {
    if (!state.player.skills.has(seal.skillId)) continue;
    const keys = sealsBySkill.get(seal.skillId) ?? [];
    keys.push(seal.key);
    sealsBySkill.set(seal.skillId, keys);
  }
  for (const [skillId, keys] of sealsBySkill) {
    restoreSealedSkill(getBindingState(state), skillId, keys);
  }
  state.sealedKeys = state.sealedKeys.filter(s => state.level <= s.expiresAtNode);

  // 使用 stageType-based 固定时间和目标分数
  const battleNum = getBattleNumber(state.level);
  state.timeMax = getCycleTimeLimit(state.level, state.cycle);
  // 不断之链：初始时间 = 当前 combo 数（而非固定时间）
  if (hasImmortalCombo()) {
    state.timeMax = Math.max(1, state.combo);
  }
  state.targetScore = calculateTargetScore(battleNum > 0 ? battleNum : state.level, currentStageType);
  _isCalibrationLevel = state.targetScore === 0 && state.calibratedTargetBase === 0;

  // 溢出分扣减目标分数（最低 0），然后清零；Boss 战不受溢出扣减
  _overflowDeduction = 0;
  _preDeductionTarget = 0;
  if (state.overflowScore > 0 && currentStageType !== 'boss') {
    _preDeductionTarget = state.targetScore;
    _overflowDeduction = Math.min(state.overflowScore, state.targetScore); // 实际扣除量
    state.targetScore = Math.max(0, Math.round(state.targetScore - state.overflowScore));
    state.overflowScore = 0;
  }

  // Demo: 使用降低难度的固定目标分数
  if (IS_DEMO && DEMO_TARGET_SCORES[state.level] !== undefined) {
    state.targetScore = DEMO_TARGET_SCORES[state.level];
  }

  // Story 36.12: 宽容评审 — 目标分数降低 10%（tempBuff 之前）
  const preJudge = state.targetScore;
  state.targetScore = applyLenientJudge(state.targetScore);
  if (state.targetScore < preJudge) {
    showFeedback(t('battle.lenient_judge', { value: String(preJudge - state.targetScore) }), '#88dd44', 0.8);
  }

  // 贪婪铭刻 — 每个附魔使目标分数 ×2
  const greedyMult = getGreedyInscriptionTargetMult();
  if (greedyMult > 1) {
    state.targetScore = Math.round(state.targetScore * greedyMult);
    showFeedback(`🔥 目标 ×${greedyMult}`, '#ff4444', 0.8);
    pulseRelicIcon('greedy_inscription', '#ff4444');
  }

  // 应用活跃临时 buff
  for (const buff of state.tempBuffs) {
    if (buff.type === 'multiplier') state.player.baseMultiplier += buff.value;
    if (buff.type === 'time') state.timeMax += buff.value;
    if (buff.type === 'targetScore') state.targetScore = Math.floor(state.targetScore * buff.value);
  }

  // Story 36.10: 续航电池 — 每关基础时间 +10s（tempBuff 之后、startTimer 之前）
  state.timeMax += getEnduranceTimeBonus();

  // 重置资源（在 timeMax 和 tempBuff 之后，确保 resources.time 使用正确的 timeMax）
  resetResources();
  state.resources.gold = 0;
  _battleRelicGold = 0;

  // 金库利息：每关开始时获得金币10%利息
  const interestGold = applyGoldInterest();
  if (interestGold > 0) {
    showFeedback(`🏦 +${interestGold}💰`, '#ffe66d');
  }

  // Story 36.2: 重置打字遗物关级别状态（已见单词等）
  resetTypingRelicState();

  // Story 36.3: 重置连击遗物关级别状态（引爆阈值、节奏 milestone）
  resetComboRelicState();
  prismActivated = false;
  lessIsMoreShown = false;
  // Story 36.4: 重置技能遗物关级别状态（爵士乐词条追踪）
  resetSkillRelicState();
  // Story 36.5: 重置附魔遗物关级别状态
  resetEnchantmentRelicState();
  // Story 36.6: 重置拓扑遗物关级别状态（双手协奏手追踪 + 全键风暴计数）
  resetTopologyRelicState();
  // Story 36.8: 重置资源遗物关级别状态（时间露珠计数器 + 资源潮汐奇偶）
  resetResourceRelicBattleState();
  // Story 36.10: 重置关卡进度遗物关级别状态（暖身操计时 + 幕间免费刷新 + 悬赏抽取）
  resetStageRelicBattleState();
  // 猎物悬赏：关卡开始显示悬赏任务
  const bounty = getActiveBounty();
  if (bounty) {
    showFeedback(t(`battle.bounty_${bounty.type}`), '#ffaa00', 1.2);
  }
  // Story 36.11: 重置Boss修饰器遗物关级别状态（屏障标记 + 混沌轮盘计数）
  resetBossModifierRelicBattleState();
  // Story 36.12: 重置结算/评分遗物关级别状态（雪球序号 + 黑洞池）
  resetScoringRelicBattleState();
  // §12: 重置暴击遗物关级别状态（蓄力计数 + 风暴计数）
  resetCritRelicBattleState();
  // 叠层遗物关级别状态重置
  resetStackingRelicBattleState();
  // Story 41-3: 清空质变 Ligature 关卡累计按键计数
  state.ligatureStageCounts.clear();

  // 标点解放遗物：设置遗物乱码激活状态
  setRelicGarbleActive(state.player.relics.has('punctuation_liberation'));

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

  // 构建词语效果修饰器注册表（整场战斗缓存）
  const letterMods = getWordEffectModifiers(state.wordEffects);
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
    state.resources.gold += startRelicResult.effects.gold;
    _battleRelicGold += startRelicResult.effects.gold;
  }
  // 永动队列：战斗开始时自动推进流水线（注入一轮队列等量能量）
  if (state.player.relics.has('perpetual_queue')) {
    routeEnergyToPipeline(ENERGY_PER_SLOT * 2);
  }

  // D100：每5场战斗替换所有技能词条
  const d100Count = checkD100OnBattleStart();
  if (d100Count > 0) {
    showFeedback(`🎲 D100! ${d100Count}${t('battle.d100_reroll') || '个技能词条已重置'}`, '#ff6b00');
    pulseRelicIcon('d_100', '#ff6b00');
  }

  // 混沌种子：给所有未附魔技能一个随机临时附魔
  applyChaosSeedEnchantments();

  // 装备数量型任务：根据当前绑定状态评估质变
  evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction());

  const el = getElements();
  const displayLevel = getBattleNumber(state.level) || state.level;
  const stageLabel = currentStageType === 'boss' ? ' [BOSS]' : currentStageType === 'elite' ? ' [ELITE]' : '';
  const cyclePrefix = state.cycle >= 2 ? t('battle.cycle_prefix', { cycle: state.cycle }) : '';
  el.levelLabel.textContent = `${cyclePrefix}LEVEL ${displayLevel}${stageLabel}`;

  // HUD: 显示当前 Cycle / StageType
  updateStageInfo(currentCycle, currentStageType);

  // Story 54.6: A6+ 第 2 关注入初始弱化 modifier（仅执行一次）
  if (state.ascensionLevel >= 6 && state.level === 2 && !state.ascensionInitialModifier) {
    const candidates = getOffenseDefenseModifierIds().filter(id => !state.activeModifiers.includes(id));
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(random() * candidates.length)];
      state.activeModifiers.push(pick);
      state.ascensionInitialModifier = pick;
    }
  }

  // 应用跨周目永久修饰器（state.activeModifiers）
  for (const permModId of state.activeModifiers) {
    // A6 初始 modifier 以弱化参数应用（isElite=true）
    const isElite = permModId === state.ascensionInitialModifier;
    applyModifier(permModId, isElite, true);
  }

  // 修饰器屏障：精英/Boss 关临时修饰器延迟生效（剩余时间 < 50% 时激活）
  const barrierDelay = shouldBarrierDelay();
  if (barrierDelay) {
    startBarrierDelay();
  }

  // 精英战：选取修饰器 → 以削弱参数临时应用（或延迟）
  if (currentStageType === 'elite') {
    const eliteModId = await new Promise<BossModifierId>((resolve) => {
      showEliteModifierPicker((modId) => resolve(modId));
    });
    if (eliteModId) {
      state.eliteModifier = eliteModId;
      if (barrierDelay) {
        addDeferredModifier(eliteModId, state.ascensionLevel < 3); // A3+: 不弱化
      } else {
        applyModifier(eliteModId, state.ascensionLevel < 3, false); // A3+: 不弱化
      }
    }
  }

  // Task 3.3-3.4: 修饰器 HUD 显示/隐藏
  const modInfo = el.modifierInfo;
  if (currentStageType === 'boss') {
    // Boss 战前：3 轮修饰器选择（每类 2 选 1），结果存入 bossModifierPool 作为临时修饰器
    const selectedMods = await new Promise<BossModifierId[]>((resolve) => {
      showBossModifierPicker((mods) => resolve(mods));
    });
    state.bossModifierPool = selectedMods;
    // 应用选中的临时修饰器
    for (const bossModId of state.bossModifierPool) {
      if (bossModId && !isModifierActive(bossModId)) {
        if (barrierDelay) {
          addDeferredModifier(bossModId, false);
        } else {
          applyModifier(bossModId, false);
        }
      }
    }
    // HUD: 显示所有选中的修饰器
    if (state.bossModifierPool.length > 0) {
      const parts = state.bossModifierPool.map(id => {
        const meta = getBossModifierMeta(id);
        if (!meta) return '';
        const modName = t(`modifier.${meta.id}`) !== `modifier.${meta.id}` ? t(`modifier.${meta.id}`) : meta.name;
        return `${meta.icon} ${modName}`;
      }).filter(Boolean);
      const firstMeta = getBossModifierMeta(state.bossModifierPool[0]);
      if (firstMeta) {
        modInfo.querySelector('.modifier-icon')!.textContent = parts.join('  ');
        modInfo.querySelector('.modifier-name')!.textContent = '';
        const descs = state.bossModifierPool.map(id => {
          const m = getBossModifierMeta(id);
          if (!m) return '';
          return t(`modifier.${m.id}.desc`) !== `modifier.${m.id}.desc` ? t(`modifier.${m.id}.desc`) : m.description;
        }).filter(Boolean);
        modInfo.querySelector('.modifier-hint')!.textContent = descs.join(' / ') + (barrierDelay ? ` (${t('battle.barrier_delayed')})` : '');
        modInfo.classList.add('visible');
      }
    }
  } else if (currentStageType === 'elite' && state.eliteModifier) {
    // 精英战 HUD：显示选中的精英修饰器
    const eliteMeta = getBossModifierMeta(state.eliteModifier);
    if (eliteMeta) {
      const modName = t(`modifier.${eliteMeta.id}`) !== `modifier.${eliteMeta.id}` ? t(`modifier.${eliteMeta.id}`) : eliteMeta.name;
      const eliteDesc = t(`modifier.${eliteMeta.id}.elite`) !== `modifier.${eliteMeta.id}.elite` ? t(`modifier.${eliteMeta.id}.elite`) : eliteMeta.eliteHint;
      modInfo.querySelector('.modifier-icon')!.textContent = eliteMeta.icon;
      modInfo.querySelector('.modifier-name')!.textContent = modName;
      modInfo.querySelector('.modifier-hint')!.textContent = eliteDesc + (barrierDelay ? ` (${t('battle.barrier_delayed')})` : '');
      modInfo.classList.add('visible');
    }
  } else {
    modInfo.classList.remove('visible');
  }

  if (barrierDelay) {
    showFeedback(t('battle.barrier_delay'), '#44aaff');
  }

  // Story 36.11: 修饰器护盾 — targetMultiplier 事后修正（屏障延迟时跳过）
  if (!isBarrierDelaying()) {
    const modParams = getActiveParams();
    if (modParams?.targetMultiplier && state.player.relics.has('modifier_shield')) {
      const shielded = getShieldedTargetMultiplier(modParams.targetMultiplier);
      state.targetScore = Math.floor(state.targetScore * shielded / modParams.targetMultiplier);
    }
  }

  // Story 36.11: 修饰器反转（屏障延迟时跳过）
  if (!isBarrierDelaying() && state.player.relics.has('modifier_reversal') && getActiveModifierEffect()) {
    applyModifierReversal();
    showFeedback(t('battle.modifier_reversal'), '#ff8800');
  }

  // Story 42.3: 记录初始溢出量（HUD 颜色区分用）
  _initialOverflow = state.overflowScore;

  // Story 42.3: 边界情况 — 如果初始溢出分已 >= 目标分数，立即标记达标（校准关跳过）
  if (!_isCalibrationLevel && state.overflowScore > 0 && state.score >= state.targetScore) {
    _targetReached = true;
    _targetReachedTime = state.timeMax;
    _accelAtTarget = 1.0; // 开局即达标，从 1.0 开始
    _elapsedAtTarget = 0;
    getElements().container.classList.add('glow-target-reached');
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

  updateHUD();
  renderRelicDisplay();
  renderActiveLibrary();

  // 溢出扣减动画：HUD 先显示原始目标
  if (_overflowDeduction > 0) {
    getElements().targetScore.textContent = String(_preDeductionTarget);
  }

  // Boss 关入场演出（在战斗画面显示后）
  if (currentStageType === 'boss') {
    await showBossIntro(state.bossModifierPool);
  }

  initFloatPool();
  getElements().word.innerHTML = ''; // 清空上一关残留单词

  // 发送战斗开始事件（引导系统等监听）
  eventBus.emit('battle:start', { stageId: state.level });

  announceLevel();

  // 溢出扣减动画：在 HUD 目标分数上播放扣减过程
  if (_overflowDeduction > 0) {
    animateOverflowDeduction(_preDeductionTarget, _overflowDeduction, state.targetScore);
  }

  // Level 提示消失后再开始关卡
  await new Promise<void>(resolve => setTimeout(resolve, 1500));

  setWord();

  // Demo 第一关：启动新手引导
  if (IS_DEMO && state.level === 1) {
    initDemoTutorial();
  }

  // Review Fix 42.3#3: 初始溢出已达标时触发 TARGET! 反馈（announceLevel 消失后）
  if (_targetReached && _initialOverflow > 0) {
    showFeedback(t('battle.target_reached'), '#4ecdc4');
    playSound('levelup');
    screenShake(3);
  }

  // Story 45: 重置本关累积产出追踪
  resetStageProduced();

  // Story 45.12: Counter 每关充能恢复 + Innate 自动触发
  for (const [skillId, skill] of state.affixSkills) {
    const rt = state.affixSkillStates.get(skillId);
    if (!rt) continue;
    // Counter: 恢复充能
    const counterAffix = skill.affixes.find(a => a.type === AffixType.Counter);
    if (counterAffix) {
      rt.counterCharges = counterAffix.maxCharges ?? 0;
    }
    // Ethereal: 仅词条仍存在时重置触发标记 + 对其他词条 +1 级增幅
    if (skill.affixes.some(a => a.type === AffixType.Ethereal)) {
      rt.etherealTriggered = false;
      // 增幅其他词条（排除 Ethereal 自身）
      const otherAffixes = skill.affixes.filter(a => a.type !== AffixType.Ethereal);
      if (otherAffixes.length > 0) {
        applyAffixLevelScaling(otherAffixes, 1);
      }
    }
    // Innate: 自动触发（质变·觉醒：3 次）
    if (skill.affixes.some(a => a.type === AffixType.Innate)) {
      const innateCount = (rt.questTransformed && skill.enchantmentIds?.includes(EnchantmentTypeEnum.QuestInnate)) ? 3 : 1;
      for (let i = 0; i < innateCount; i++) triggerSkill(skillId, null as any);
    }
  }

  startTimer();
  startScoreRoller(); // Story 31.4: 分数滚轮动画
  // 太鼓节拍：有 rhythm_adapt 时启动小球生成器
  startTaikoSpawner();

}

function announceLevel(): void {
  const el = getElements();
  const ann = document.createElement('div');
  ann.className = 'level-announce';
  const displayLevel = getBattleNumber(state.level) || state.level;
  const stageType = getStageType(state.level);

  let typeLabel = '';
  if (stageType === 'boss') {
    typeLabel = `<br><span class="boss-hint">${t('battle.boss_hint')}</span>`;
  } else if (stageType === 'elite') {
    typeLabel = `<br><span class="boss-hint">${t('battle.elite_hint')}</span>`;
  }

  const cyclePfx = state.cycle >= 2 ? t('battle.cycle_prefix', { cycle: state.cycle }) : '';
  ann.innerHTML = `${cyclePfx}LEVEL ${displayLevel}${typeLabel}<br><span class="target-hint">${t('battle.target_hint', { value: state.targetScore })}</span>`;
  el.container.appendChild(ann);
  playSound('levelup');
  setTimeout(() => ann.remove(), 1500);
}

/** 溢出扣减 HUD 动画：目标分数从原始值滚动递减到最终值 */
function animateOverflowDeduction(preTarget: number, deduction: number, finalTarget: number): void {
  const el = getElements();
  const targetEl = el.targetScore;
  const scoreDisplay = document.getElementById('score-display');

  // 阶段 1（0-400ms）：显示原始目标，等待
  // 阶段 2（400ms）：弹出扣减浮字 + 开始数字滚动
  setTimeout(() => {
    // 扣减浮字：在 score-display 旁弹出
    if (scoreDisplay) {
      const deductFloat = document.createElement('span');
      deductFloat.className = 'overflow-deduct-float';
      deductFloat.textContent = `-${Math.round(deduction)}`;
      scoreDisplay.appendChild(deductFloat);
      setTimeout(() => deductFloat.remove(), 1200);
    }
    playSound('skill');

    // 数字滚动
    const duration = 500;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.round(preTarget - (preTarget - finalTarget) * eased);
      targetEl.textContent = String(current);
      targetEl.style.color = '#4ecdc4';
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        // 滚动结束后闪一下
        targetEl.classList.add('overflow-deduct-done');
        setTimeout(() => {
          targetEl.classList.remove('overflow-deduct-done');
          targetEl.style.color = '';
        }, 600);
      }
    };
    requestAnimationFrame(tick);
  }, 400);
}

// === 胜利 ===
function victory(): void {
  state.phase = 'victory';
  if (timerInterval) clearInterval(timerInterval);
  stopScoreRoller(); // Story 31.4
  stopTaikoSpawner();
  clearFloatQueue();
  cleanupModifier();
  setRelicGarbleActive(false);

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
    ascensionLevel: state.ascensionLevel,
  });
}

// === 游戏结束 ===
function gameOver(): void {
  state.phase = 'gameover';
  if (timerInterval) clearInterval(timerInterval);
  releaseBGMTension();
  clearPseudoInfinite();
  getElements().container.classList.remove('glow-danger', 'glow-target-reached');
  clearFloatQueue();
  cleanupModifier();
  setRelicGarbleActive(false);

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
  // 各滚轮目标设置（显示由 rAF tick 更新）
  comboRoller.setTarget(state.combo);
  multRoller.setTarget(Math.round(state.multiplier * 10));
  goldRoller.setTarget(Math.floor(Math.max(0, state.resources.gold - _pendingGoldBonus)));

  // Story 36.12: 分数黑洞 — HUD 分数显示 "???"（未结算时隐藏真实分数+进度色+tier class）
  const blackHoleHidden = isBlackHoleActive() && !hasBlackHoleSettled();
  if (blackHoleHidden) {
    el.score.textContent = '???';
    el.score.style.color = '#aa66ff';
  } else {
    scoreRoller.setTarget(Math.floor(state.score)); // Story 31.4: 平滑滚动
    el.score.textContent = String(scoreRoller.getValue()); // Review M1: rAF 未启动时 fallback
  }
  // Story 42.2: 达标后目标分数显示 ✓ + 绿色
  if (_isCalibrationLevel) {
    el.targetScore.textContent = t('battle.calibration') || '—';
    el.targetScore.style.color = '#aaaaaa';
  } else if (_targetReached) {
    el.targetScore.textContent = `✓ ${state.targetScore}`;
    el.targetScore.style.color = '#4ecdc4';
  } else {
    el.targetScore.textContent = String(state.targetScore);
    el.targetScore.style.color = '';
  }

  // 分数进度颜色（基础）— 黑洞隐藏时跳过
  if (!blackHoleHidden) {
    if (_targetReached) {
      el.score.style.color = '#ffd700'; // Story 42.2: 溢出=金色
    } else if (_initialOverflow > 0 && state.score <= _initialOverflow) {
      el.score.style.color = '#88d8c0'; // Story 42.3: 淡青（仍在初始溢出范围）
    } else {
      const progress = state.score / state.targetScore;
      if (progress >= 0.7) {
        el.score.style.color = '#ffe66d';
      } else {
        el.score.style.color = '#fff';
      }
    }
  }

  // 分数颜色分级 — 高分时覆盖进度颜色 (Story 31.1)
  // 仅在 tier 变化时更新 class，避免重启 CSS 动画 (Review M1)
  // 黑洞隐藏时清除 tier class
  // Review Fix #2: 达标后清除 tier class — CSS !important 会覆盖内联金色
  // Review Fix 42.3#2: 初始溢出范围内也清除 tier class — 避免覆盖淡青色
  const inOverflowRange = _initialOverflow > 0 && state.score <= _initialOverflow && !_targetReached;
  const scoreTier = (blackHoleHidden || _targetReached || inOverflowRange) ? '' : getScoreTier(state.score);
  if (scoreTier !== lastScoreTier) {
    el.score.classList.remove(...SCORE_TIER_CLASSES);
    if (scoreTier) el.score.classList.add(scoreTier);
    lastScoreTier = scoreTier;
  }

  // 职业资源 HUD 更新
  if (state.classId === 'wordsmith') {
    const el = document.getElementById('fragment-produced');
    if (el) el.textContent = String(Math.floor(state.classResourceProduced.energy ?? 0));
    // 流水线 HUD（由 AssemblyPipeline.updatePipelineHUD 管理，此处确保元素存在）
    if (!document.getElementById('pipeline-hud')) {
      const hud = document.createElement('div');
      hud.id = 'pipeline-hud';
      hud.className = 'pipeline-hud';
      document.getElementById('battle-hud')?.appendChild(hud);
    }
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

  // 渲染槽位到指定容器（A7+ 槽位缩减）
  function renderSlots(container: HTMLElement) {
    container.innerHTML = '';
    for (let i = 0; i < getMaxRelicSlots(); i++) {
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
let floatQueue: Array<{ text: string; color: string; scale?: number; skillAnchor?: { letterIndex?: number; fromElementId?: string; resource: string; amount?: number }; relicAnchor?: { relicId: string; resource: string; amount?: number } }> = [];

/** 飞行中待确认的资源加成 */
let _pendingTimeBonus = 0;
let _pendingGoldBonus = 0;
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
  el.classList.remove('float-text-active', 'float-text-anchored');
  el.style.top = '';
  el.style.opacity = '';
  el.style.transform = '';
}

/** 资源类型 → HUD 元素 ID 映射 */
const RESOURCE_TARGET_IDS: Record<string, string> = {
  base: 'settlement-chips',
  score: 'score-count',
  multiplier: 'settlement-mult',
  time: 'timer-display',
  gold: 'battle-gold-count',
};

/** 资源类型 → 到达时弹跳函数 */
const RESOURCE_BUMP_FNS: Record<string, () => void> = {
  base: () => bumpScore(),
  score: () => bumpScore(),
  multiplier: () => bumpMultiplier(),
  time: () => bumpTimer(),
  gold: () => bumpGold(),
};

/** 二次贝塞尔曲线插值 */
function quadBezier(p0: number, p1: number, p2: number, t: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

/** 创建一个浮字 */
function createFloatText(text: string, color: string, scale = 1, skillAnchor?: { letterIndex?: number; fromElementId?: string; resource: string; amount?: number }, relicAnchor?: { relicId: string; resource: string; amount?: number }): void {
  const el = acquireFloat();
  if (!el) return; // 池满，跳过

  el.textContent = text;
  el.style.color = color;
  el.style.setProperty('--float-scale', String(scale));

  // 确定飞行起点和资源类型（skillAnchor 从字母出发，relicAnchor 从遗物图标出发）
  let startEl: HTMLElement | undefined;
  let flightResource: string | undefined;
  let flightAmount = 0;

  if (skillAnchor) {
    if (skillAnchor.letterIndex !== undefined) {
      const wordEl = getElements().word;
      startEl = wordEl.children[skillAnchor.letterIndex] as HTMLElement | undefined;
    } else if (skillAnchor.fromElementId) {
      startEl = document.getElementById(skillAnchor.fromElementId) ?? undefined;
    }
    flightResource = skillAnchor.resource;
    flightAmount = skillAnchor.amount ?? 0;
  } else if (relicAnchor) {
    const idx = getRelicIndex(relicAnchor.relicId);
    if (idx >= 0) {
      startEl = getElements().playerRelics.children[idx] as HTMLElement | undefined;
      flightResource = relicAnchor.resource;
      flightAmount = relicAnchor.amount ?? 0;
      // 遗物产出资源音效（较低音量，避免喧宾夺主）
      if (flightResource && flightAmount > 0) {
        emitResourceSound(flightResource, Math.min(scale, 1) * 0.5, 0);
      }
    }
  }

  if (startEl && flightResource) {
    const targetId = RESOURCE_TARGET_IDS[flightResource];
    const targetEl = targetId ? document.getElementById(targetId) : null;

    const container = getElements().container;
    const containerRect = container.getBoundingClientRect();
    const startRect = startEl.getBoundingClientRect();
    const startX = startRect.left + startRect.width / 2 - containerRect.left;
    const startY = relicAnchor
      ? startRect.bottom - containerRect.top + 10
      : startRect.top - containerRect.top - 30;

    let endX = startX;
    let endY = startY - 60;
    if (targetEl) {
      const targetRect = targetEl.getBoundingClientRect();
      endX = targetRect.left + targetRect.width / 2 - containerRect.left;
      endY = targetRect.top + targetRect.height / 2 - containerRect.top;
    }

    // 控制点：水平方向偏移制造弧线
    const midX = (startX + endX) / 2;
    const cpX = midX + (startX - endX) * 0.4;
    // 遗物飞行向下抛物线（图标在顶部，向上会超出边界）；技能飞行向上抛物线
    const cpY = relicAnchor
      ? Math.max(startY, endY) + 40
      : Math.min(startY, endY) - 40;

    // JS 驱动贝塞尔曲线动画
    el.style.position = 'absolute';
    el.style.left = startX + 'px';
    el.style.top = startY + 'px';
    el.classList.add('float-text-anchored');
    el.style.display = '';

    const floatEl = el;
    const dist = Math.hypot(endX - startX, endY - startY);
    const FLIGHT_SPEED = 0.35; // px/ms
    const DWELL_TIME = 250; // 起点停顿时间（ms），让玩家看清数字
    const duration = Math.max(250, Math.min(800, dist / FLIGHT_SPEED));
    const startTime = performance.now();
    const baseScale = scale;
    const res = flightResource;

    // 飞行开始时加入待确认量（滚轮延迟显示）
    let pendingTime = 0, pendingGold = 0;
    if (flightAmount > 0 && res === 'time') { pendingTime = flightAmount; _pendingTimeBonus += flightAmount; }
    if (flightAmount > 0 && res === 'gold') { pendingGold = flightAmount; _pendingGoldBonus += flightAmount; }

    function animateCurve(now: number) {
      const elapsed = now - startTime;
      const flightElapsed = Math.max(0, elapsed - DWELL_TIME);
      const tLinear = Math.min(flightElapsed / duration, 1);
      // easeInOutCubic：停顿后平滑起步 → 中段加速 → 到达前减速
      const t = tLinear < 0.5
        ? 4 * tLinear * tLinear * tLinear
        : 1 - Math.pow(-2 * tLinear + 2, 3) / 2;

      const x = quadBezier(startX, cpX, endX, t);
      const y = quadBezier(startY, cpY, endY, t);
      // 停顿期间从小到大弹出，飞行中逐渐缩小
      const dwellProgress = Math.min(elapsed / DWELL_TIME, 1);
      // easeOutBack: 从 0 弹到 1，略微过冲
      const growT = 1 - Math.pow(1 - dwellProgress, 3);
      const overshoot = elapsed < DWELL_TIME
        ? growT * (1 + 0.2 * Math.sin(dwellProgress * Math.PI))
        : 1;
      const s = baseScale * overshoot * (1.1 - 0.4 * t);
      // 淡入 → 停顿可见 → 飞行末段淡出
      const alpha = elapsed < DWELL_TIME ? Math.min(1, elapsed / 80)
        : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;

      floatEl.style.left = x + 'px';
      floatEl.style.top = y + 'px';
      floatEl.style.opacity = String(alpha);
      floatEl.style.transform = `translateX(-50%) scale(${s})`;

      if (t < 1) {
        requestAnimationFrame(animateCurve);
      } else {
        releaseFloat(floatEl);
        // 到达时确认待确认量 → 滚轮目标立即更新
        if (pendingTime > 0) _pendingTimeBonus = Math.max(0, _pendingTimeBonus - pendingTime);
        if (pendingGold > 0) _pendingGoldBonus = Math.max(0, _pendingGoldBonus - pendingGold);
        // 飞行到达时触发对应 UI 弹跳
        RESOURCE_BUMP_FNS[res]?.();
      }
    }
    requestAnimationFrame(animateCurve);
    return; // 跳过 CSS 动画路径
  } else {
    el.style.left = (35 + Math.random() * 30) + '%';
    el.style.top = '';
  }

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
  createFloatText(item.text, item.color, item.scale, item.skillAnchor, item.relicAnchor);
  queueTimer = setTimeout(drainQueue, FLOAT_INTERVAL);
}

// === 闪光连线系统 ===

/** 获取遗物在 HUD 图标列表中的索引，未持有返回 -1 */
function getRelicIndex(relicId: string): number {
  return [...state.player.relics].indexOf(relicId);
}

/** Story 37.4: 计算链式触发锚点（本词有绑定字母→字母索引，否则→active-library） */
export function resolveChainAnchor(boundKey: string): { letterIndex?: number; fromElementId?: string } {
  const word = state.player.word.toLowerCase();
  const key = boundKey.toLowerCase();
  const matchIndices: number[] = [];
  for (let j = 0; j < word.length; j++) {
    if (word[j] === key) matchIndices.push(j);
  }
  if (matchIndices.length > 0) {
    return { letterIndex: matchIndices[Math.floor(random() * matchIndices.length)] };
  }
  return { fromElementId: 'active-library' };
}

/** Story 37.5: 遗物图标脉冲动画（非资源遗物触发反馈） */
function pulseRelicIcon(relicId: string, color?: string): void {
  const idx = getRelicIndex(relicId);
  if (idx < 0) return;
  const el = getElements().playerRelics.children[idx] as HTMLElement | undefined;
  if (!el) return;
  if (color) el.style.setProperty('--pulse-color', color);
  // CSS animation 重启：移除再添加 class（无需 reflow）
  el.classList.remove('relic-pulse');
  // requestAnimationFrame 确保浏览器在下一帧重新启动动画
  requestAnimationFrame(() => {
    el.classList.add('relic-pulse');
    el.addEventListener('animationend', () => {
      el.classList.remove('relic-pulse');
      el.style.removeProperty('--pulse-color');
    }, { once: true });
  });
}

/** 遗物图标到目标的瞬间闪光连线（target 可为元素 ID 字符串或直接 HTMLElement） */
function flashRelicLine(relicIndex: number, target: string | HTMLElement, color: string): void {
  const el = getElements();
  const iconEl = el.playerRelics.children[relicIndex] as HTMLElement | undefined;
  const targetEl = typeof target === 'string' ? document.getElementById(target) : target;
  if (!iconEl || !targetEl) return;

  const container = el.container;
  const containerRect = container.getBoundingClientRect();
  const iconRect = iconEl.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  const x1 = iconRect.left + iconRect.width / 2 - containerRect.left;
  const y1 = iconRect.top + iconRect.height / 2 - containerRect.top;
  const x2 = targetRect.left + targetRect.width / 2 - containerRect.left;
  const y2 = targetRect.top + targetRect.height / 2 - containerRect.top;

  const dist = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

  const line = document.createElement('div');
  line.className = 'relic-flash-line';
  line.style.width = dist + 'px';
  line.style.left = x1 + 'px';
  line.style.top = (y1 - 1) + 'px';
  line.style.color = color;
  line.style.transform = `rotate(${angle}deg)`;
  line.onanimationend = () => line.remove();

  container.appendChild(line);
}

/** 清除所有残留闪光连线（关卡结束时调用） */
function clearFlashLines(): void {
  getElements().container.querySelectorAll('.relic-flash-line').forEach(el => el.remove());
}

/** 清空浮字队列和定时器（关卡结束时调用） */
function clearFloatQueue(): void {
  floatQueue.length = 0;
  _pendingTimeBonus = 0;
  _pendingGoldBonus = 0;
  if (_glassCannonTimer) {
    clearTimeout(_glassCannonTimer);
    _glassCannonTimer = null;
  }
  if (queueTimer) {
    clearTimeout(queueTimer);
    queueTimer = null;
  }
  // 回收所有活跃浮字
  for (const el of floatPool) {
    releaseFloat(el);
  }
  clearFlashLines();
}

/** 浮字反馈（scale 控制字体缩放，默认 1；skillAnchor 指定时从字母或指定元素飞向资源 UI；relicAnchor 指定时从遗物图标飞向资源 UI） */
export function showFeedback(txt: string, color: string, scale?: number, skillAnchor?: { letterIndex?: number; fromElementId?: string; resource: string; amount?: number }, relicAnchor?: { relicId: string; resource: string; amount?: number }): void {
  floatQueue.push({ text: txt, color, scale, skillAnchor, relicAnchor });
  if (!queueTimer) drainQueue();
}

/** 伪无限模式视觉：屏幕边缘金色光晕 */
export function setPseudoInfiniteVisual(active: boolean): void {
  const el = getElements();
  el.container.classList.toggle('pseudo-infinite', active);
}

