// ============================================
// 打字肉鸽 - 战斗系统
// ============================================

import { state, synergy, calculateTargetScore, resetResources } from '../core/state';
import { resolveRelicEffects, resolveRelicEffectsWithBehaviors, queryRelicFlag } from './relics/RelicPipeline';
import { eventBus } from '../core/events/EventBus';
import { inputHandler } from './typing/InputHandler';
import { getElements } from '../ui/elements';
import { SKILLS, getSkillDisplayInfo } from '../data/skills';
import { PRODUCERS } from '../data/producers';
import { CONVERTERS } from '../data/converters';
import { CONNECTORS } from '../data/connectors';
import { RELICS } from '../data/relics';
import { juiceUp, bumpCombo, bumpScore, bumpMultiplier, screenShake, updateMultiplierGlow } from '../effects/juice';
import { playSound, initAudio } from '../effects/sound';
import { spawnParticles } from '../effects/particles';
import { triggerSkill, resolveSkillEventModifiers, calculateLonePassiveBonus, getVoidLetterModifiers, clearPseudoInfinite } from './skills';
import { isLayoutOnlyPassive } from '../data/skills';
import { openShop } from './shop';
import { shouldShowRelicPicker, showRelicPicker } from './relicPicker';
import { getLetterScoreModifiers } from './letters/LetterFrequencySystem';
import { ModifierRegistry } from './modifiers/ModifierRegistry';
import { EffectPipeline } from './modifiers/EffectPipeline';
import { keyTooltip } from '../ui/keyboard/KeyTooltip';
import { getStageType, getTimeLimit, getBattleNumber, getEliteModifierIndex, getActForNode } from './stage/stageFlow';
import { getBossModifierMeta, getActiveParams, incrementDiminishCount, getDiminishMultiplier, transformWordForModifier, isRhythmLocked } from '../data/bossModifiers';
import type { BossModifierMeta } from '../data/bossModifiers';
import { applyModifier, cleanupModifier, tickModifier, startBossRotation, stopBossRotation } from './bossModifierEngine';
import { showActTransition, showEliteAnnouncement, showBossIntro, updateStageInfo } from './actTransition';

/** 获取当前精英关的修饰器元数据（非精英关返回 undefined） */
function getCurrentEliteModifierMeta(): BossModifierMeta | undefined {
  const modIdx = getEliteModifierIndex(state.level);
  if (modIdx < 0) return undefined;
  const modId = state.bossModifierPool[modIdx];
  return modId ? getBossModifierMeta(modId) : undefined;
}

// === Act 过渡追踪 ===
let lastAct = 0;

/** 重置 Act 过渡追踪（新游戏时调用） */
export function resetLastAct(): void { lastAct = 0; }

// === 计时器 ===
let timerInterval: ReturnType<typeof setInterval> | null = null;

// === 分数结算 ===
let wordBaseScore = 0; // 词语基础分（不含倍率）
let settlementTimeouts: ReturnType<typeof setTimeout>[] = []; // 所有结算相关的定时器
let letterRegistry: ModifierRegistry | null = null; // 字母升级注册表（每关开始时构建）
let lonePassiveBonus = 0; // 孤狼被动倍率加成（每关开始时计算）

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
  const words = getActiveWords();
  const bound = [...state.player.bindings.keys()];

  // 有绑定技能的字母时，偏向选择包含它们的词
  if (bound.length && Math.random() < 0.6) {
    const good = words.filter(w => bound.some(l => w.includes(l)));
    if (good.length) return good[Math.floor(Math.random() * good.length)].toUpperCase();
  }
  return words[Math.floor(Math.random() * words.length)].toUpperCase();
}

function setWord(): void {
  state.player.word = transformWordForModifier(pickWord());
  state.player.index = 0;
  state.wordScore = 0;
  wordBaseScore = 0; // 重置基础分
  state.resources.base = 0; // 重置资源基数
  state.resources.score = 0; // 重置即时加分
  state.wordPerfect = true;
  synergy.echoTrigger.clear();
  synergy.wordSkillCount = 0;
  synergy.skillBaseScore = 0;
  synergy.letterBaseScore = 0;
  synergy.lastTriggeredSkillId = null;
  synergy.echoPending = false;
  synergy.ripplePending = false;
  synergy.ripplePassthrough = null;
  synergy.pulseCount = 0;
  synergy.wordCooldowns.clear();
  synergy.freezeTriggeredThisWord.clear();
  renderWord();
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
}

/**
 * 处理按键事件（通过 EventBus 接收）
 */
function handleKeyPress(data: { key: string; timestamp: number }): void {
  if (state.phase !== 'battle') return;
  initAudio();

  if (isRhythmLocked()) return;

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

function playerCorrect(k: string): void {
  const el = getElements();
  const letter = el.word.children[state.player.index] as HTMLElement;
  const skillId = state.player.bindings.get(k);

  letter.classList.remove('current');
  letter.classList.add('correct');

  // Juice 动画 - 字母弹跳
  juiceUp(letter, 0.2, 2);

  // 连击增加
  state.combo++;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  bumpCombo();

  // 完美主义遗物：连续正确累计
  synergy.perfectStreak++;

  // 计算倍率: 基础 + 孤狼被动 + 连击加成 + 完美主义加成 + 技能倍率加成
  let mult = state.player.baseMultiplier + lonePassiveBonus + state.combo * state.player.comboBonus;
  if (queryRelicFlag('perfectionist_streak')) {
    mult += synergy.perfectStreak * 0.01;
  }
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

  // 触发技能（孤狼/虚空等纯布局被动不触发）
  const shouldTrigger = skillId && !isLayoutOnlyPassive(skillId);
  if (shouldTrigger) {
    letter.classList.add('skill-triggered');
    juiceUp(letter, 0.4, 5); // 强力弹跳
    bumpMultiplier();
    triggerSkill(skillId, k);
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
}

function playerWrong(): void {
  const el = getElements();
  const letter = el.word.children[state.player.index] as HTMLElement;

  letter?.classList.add('wrong');
  setTimeout(() => letter?.classList.remove('wrong'), 150);

  el.container.classList.add('shake');
  setTimeout(() => el.container.classList.remove('shake'), 120);

  playSound('wrong');

  // 护盾保护（通过管道解析 shield 的 on_error 拦截器）
  {
    const shieldResult = resolveSkillEventModifiers('on_error', { hasError: true });
    if (shieldResult.intercepted && state.resources.shield > 0) {
      state.resources.shield -= 1;
      showFeedback('护盾保护!', '#87ceeb');
      return;
    }
  }

  // 遗物 on_error 管道解析（凤凰羽毛 + 玻璃大炮）
  {
    let phoenixProtected = false;
    let instantFailed = false;
    resolveRelicEffectsWithBehaviors('on_error', { hasError: true }, {
      onComboProtect: (probability: number) => {
        if (Math.random() < probability) {
          phoenixProtected = true;
        }
        return phoenixProtected;
      },
      onInstantFail: () => {
        instantFailed = true;
      },
    });
    if (phoenixProtected) {
      showFeedback('凤凰羽毛!', '#ff9500');
      return;
    }
    // 玻璃大炮：打错且未被保护 → 立即失败
    if (instantFailed) {
      showFeedback('玻璃大炮碎了!', '#ff0000');
      gameOver();
      return;
    }
  }

  // 完美主义遗物：重置完美计数
  synergy.perfectStreak = 0;

  // 标记词语不完美
  state.wordPerfect = false;

  if (state.combo > 5) showFeedback(`${state.combo}× 断了!`, '#ff6b6b');
  state.combo = 0;
  state.lastMilestone = 0;
  synergy.skillMultBonus = 0;
  state.multiplier = state.player.baseMultiplier + lonePassiveBonus;

  // Boss 修饰器：断连即扣（combo_punish）
  const modEffect = getActiveParams();
  if (modEffect?.comboPunishRate && state.score > 0) {
    const penalty = Math.floor(state.score * modEffect.comboPunishRate);
    state.score = Math.max(0, state.score - penalty);
    showFeedback(`-${penalty}分!`, '#ff4444');
  }

  updateHUD();
}

function completeWord(): void {
  const el = getElements();

  // 计算基础分（字母击键 + 技能基础分 + 字母升级底分 + 字母底分加成）
  const baseChips = Math.floor(wordBaseScore + synergy.skillBaseScore + synergy.letterBaseScore + state.player.wordBonus);
  state.resources.base = baseChips;
  let mult = state.multiplier;
  let bonusMult = 1;

  // 遗物效果：通过管道解析 on_word_complete 效果
  const wordRelicResult = resolveRelicEffects('on_word_complete', {
    combo: state.combo,
    multiplier: state.multiplier,
    totalSkillCount: state.player.skills.size,
  });
  // 狂战士面具等遗物的 multiply 加成
  bonusMult += wordRelicResult.effects.multiply;

  const finalMult = mult * bonusMult;
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
  bumpScore();

  // 发送词语完成事件
  eventBus.emit('word:complete', {
    word: state.player.word,
    score: finalWordScore,
    perfect: state.wordPerfect
  });

  // 词语完成 - 所有字母一起弹跳
  Array.from(el.word.children).forEach((letter, i) => {
    setTimeout(() => juiceUp(letter as HTMLElement, 0.25, 4 * (i % 2 === 0 ? 1 : -1)), i * 30);
  });

  // 分级屏幕震动
  const shakeIntensity = finalWordScore >= 20 ? 3 : finalWordScore >= 10 ? 2 : 1;
  screenShake(shakeIntensity);

  playSound('word');

  // 重置词语基础分
  wordBaseScore = 0;

  // 检查是否达到目标分数 - 提前结束关卡
  if (state.score >= state.targetScore && prevScore < state.targetScore) {
    // 计算 overkill：最后一击超出目标的分数
    const needed = state.targetScore - prevScore;
    state.overkill = finalWordScore - needed;

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

  // 遗物效果：完成词语时间加成（time_crystal 等）
  if (wordRelicResult.effects.time > 0) {
    state.time = Math.min(state.time + wordRelicResult.effects.time, state.timeMax * 2);
  }

  // 技能效果：on_word_complete 事件（预留扩展）
  resolveSkillEventModifiers('on_word_complete', {
    combo: state.combo,
    multiplier: state.multiplier,
  });

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
  const mult = state.multiplier;
  const final = Math.floor(chips * mult);

  if (chipsEl) chipsEl.textContent = chips.toLocaleString();
  if (multEl) multEl.textContent = mult.toFixed(1);
  if (finalEl) finalEl.textContent = final.toLocaleString();

  // 确保面板可见
  settlement.classList.remove('settlement-hidden');
  settlement.classList.add('settlement-live');
}

/** 词语完成时播放结算动画 */
function showSettlementComplete(chips: number, mult: number, final: number): void {
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
  if (finalEl) finalEl.textContent = final.toLocaleString();

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

  // 计算奖励（通过遗物管道解析）
  const currentType = getStageType(state.level);
  const baseGold = currentType === 'elite' ? 40 : 20; // 精英关金币 ×2
  const timeBonus = Math.floor(state.time);
  const goldRelicResult = resolveRelicEffects('on_battle_end', { overkill: state.overkill });
  const relicGold = Math.floor(goldRelicResult.effects.gold);
  const totalGold = baseGold + timeBonus + relicGold;

  // 设置数值
  const goldBaseEl = document.getElementById('gold-base');
  const goldOverkillEl = document.getElementById('gold-overkill');
  const goldTimeEl = document.getElementById('gold-time');
  const goldTreasureEl = document.getElementById('gold-treasure');
  const goldTotalEl = document.getElementById('gold-total');

  if (goldBaseEl) goldBaseEl.textContent = `+${baseGold}`;
  if (goldTimeEl) goldTimeEl.textContent = `+${timeBonus}`;
  if (goldTotalEl) goldTotalEl.textContent = `+${totalGold}`;

  // 遗物金币行：统一显示遗物加成
  const overkillRow = document.querySelector('.gold-overkill-row') as HTMLElement;
  if (overkillRow) overkillRow.style.display = 'none'; // 不再单独显示
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
    state.time -= 0.1 * timeSpeed;

    // Boss 修饰器：每帧更新（decay 等）
    tickModifier(0.1);

    updateTimerDisplay();

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

// === 关卡系统 ===
function endLevel(): void {
  if (timerInterval) clearInterval(timerInterval);
  clearPseudoInfinite();
  cleanupModifier();
  stopBossRotation();
  hideSettlement();

  // 清除倍率光晕效果
  const el = getElements();
  el.container.classList.remove('mid-mult', 'high-mult');

  if (state.score >= state.targetScore) {
    const currentType = getStageType(state.level);

    if (currentType === 'boss') {
      // Boss 关胜利 → 直接胜利（无商店）
      victory();
      return;
    }

    // 标准关和精英关胜利 → 遗物选择器（每5个战斗节点） → 商店
    const battleNum = getBattleNumber(state.level);
    if (battleNum > 0 && battleNum % 5 === 0 && shouldShowRelicPicker(battleNum)) {
      showRelicPicker(() => openShop(true));
    } else {
      openShop(true);
    }
  } else {
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
  const currentStageType = getStageType(state.level);
  const currentAct = getActForNode(state.level);
  if (currentAct !== lastAct) {
    await showActTransition(currentAct);
    lastAct = currentAct;
  }

  state.phase = 'battle';
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.multiplier = state.player.baseMultiplier;
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
  state.timeMax = getTimeLimit(state.level);
  state.targetScore = calculateTargetScore(battleNum > 0 ? battleNum : state.level, currentStageType);

  // 应用活跃临时 buff
  for (const buff of state.tempBuffs) {
    if (buff.type === 'multiplier') state.player.baseMultiplier += buff.value;
    if (buff.type === 'time') state.timeMax += buff.value;
    if (buff.type === 'targetScore') state.targetScore = Math.floor(state.targetScore * buff.value);
  }

  // 重置资源（在 timeMax 和 tempBuff 之后，确保 resources.time 使用正确的 timeMax）
  resetResources();

  synergy.perfectStreak = 0;
  synergy.skillMultBonus = 0;
  synergy.rippleBonus.clear();
  synergy.echoTrigger.clear();
  synergy.echoPending = false;
  synergy.ripplePending = false;
  synergy.ripplePassthrough = null;
  synergy.pulseCount = 0;
  synergy.wordCooldowns.clear();
  synergy.restoreComboCounters.clear();
  synergy.freezeTriggeredThisWord.clear();

  // 孤狼被动：计算倍率加成
  lonePassiveBonus = calculateLonePassiveBonus();
  state.multiplier = state.player.baseMultiplier + lonePassiveBonus;

  // 构建字频底分修饰器注册表（整场战斗缓存）
  const letterMods = getLetterScoreModifiers(state.player.wordDeck);
  // 虚空被动：注入相邻空位字母底分加成
  const voidMods = getVoidLetterModifiers();
  const allLetterMods = [...letterMods, ...voidMods];
  if (allLetterMods.length > 0) {
    letterRegistry = new ModifierRegistry();
    letterRegistry.registerMany(allLetterMods);
  } else {
    letterRegistry = null;
  }

  // 遗物效果：战斗开始管道（time_lord 额外时间等）
  const startRelicResult = resolveRelicEffects('on_battle_start');
  if (startRelicResult.effects.multiply > 0) {
    state.multiplier += startRelicResult.effects.multiply;
    }

  const el = getElements();
  const displayLevel = getBattleNumber(state.level) || state.level;
  const stageLabel = currentStageType === 'elite' ? ' [ELITE]' : currentStageType === 'boss' ? ' [BOSS]' : '';
  el.levelLabel.textContent = `LEVEL ${displayLevel}${stageLabel}`;

  // HUD: 显示当前 Act / StageType
  updateStageInfo(currentAct, currentStageType);

  // Task 2.3: 精英关金色边框样式
  el.battleScreen.classList.toggle('elite-stage', currentStageType === 'elite');

  // Task 3.3-3.4: 修饰器 HUD 显示/隐藏
  const modInfo = el.modifierInfo;
  if (currentStageType === 'elite') {
    const meta = getCurrentEliteModifierMeta();
    if (meta) {
      modInfo.querySelector('.modifier-icon')!.textContent = meta.icon;
      modInfo.querySelector('.modifier-name')!.textContent = meta.name;
      modInfo.querySelector('.modifier-hint')!.textContent = meta.eliteHint;
      modInfo.classList.add('visible');
    } else {
      modInfo.classList.remove('visible');
    }
    // 应用减弱版修饰器（精英关）
    const modIdx = getEliteModifierIndex(state.level);
    const modId = state.bossModifierPool[modIdx];
    if (modId) applyModifier(modId, true);
  } else if (currentStageType === 'boss') {
    // Boss 关：启动 3 阶段轮换引擎
    startBossRotation();
  } else {
    modInfo.classList.remove('visible');
  }

  showScreen('battle');
  setWord();
  updateHUD();
  renderBattleSkills();
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

  announceLevel();
  startTimer();

  // 时间遗物加成（在 startTimer 设置初始时间后应用，如 time_lord +8 秒、doomsday +30 秒）
  if (startRelicResult.effects.time > 0) {
    state.time = Math.min(state.time + startRelicResult.effects.time, state.timeMax * 2);
  }

  // 时间窃贼代价：基础时间减半（在遗物加成之后，故 time_lord + time_thief 有趣互动）
  if (queryRelicFlag('time_thief') === true) {
    state.time = Math.floor(state.time / 2);
  }

  // 末日倒计时代价：每过一关基础时间 -5 秒（第1关不扣）
  const doomPenalty = queryRelicFlag('doomsday') as number;
  if (doomPenalty > 0) {
    state.time = Math.max(5, state.time - doomPenalty);
  }

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
    typeLabel = `<br><span class="elite-hint">精英挑战${modName}</span>`;
  } else if (stageType === 'boss') {
    typeLabel = '<br><span class="boss-hint">BOSS 战</span>';
  }

  ann.innerHTML = `LEVEL ${displayLevel}${typeLabel}<br><span class="target-hint">目标: ${state.targetScore}分</span>`;
  el.container.appendChild(ann);
  playSound('levelup');
  setTimeout(() => ann.remove(), 1500);
}

// === 胜利 ===
function victory(): void {
  state.phase = 'victory';
  if (timerInterval) clearInterval(timerInterval);
  cleanupModifier();
  stopBossRotation();

  const el = getElements();
  el.gameoverStats.innerHTML = `
    通关! Boss 已击败!<br>
    最终得分: ${state.score}<br>
    最高连击: ${state.maxCombo}<br>
    获得技能: ${state.player.skills.size}
  `;
  showScreen('gameover');
  playSound('levelup');
}

// === 游戏结束 ===
function gameOver(): void {
  state.phase = 'gameover';
  if (timerInterval) clearInterval(timerInterval);
  clearPseudoInfinite();
  cleanupModifier();
  stopBossRotation();

  const el = getElements();
  const displayLevel = getBattleNumber(state.level) || state.level;
  el.gameoverStats.innerHTML = `
    到达 Level ${displayLevel}<br>
    最终得分: ${state.score} / ${state.targetScore}<br>
    最高连击: ${state.maxCombo}<br>
    获得技能: ${state.player.skills.size}
  `;
  showScreen('gameover');
  playSound('gameover');
}

// === UI 更新 ===
export function updateHUD(): void {
  const el = getElements();
  el.combo.textContent = String(state.combo);
  el.score.textContent = String(Math.floor(state.score));
  el.targetScore.textContent = String(state.targetScore);
  el.multiplier.textContent = state.multiplier.toFixed(1);

  // 分数进度颜色
  const progress = state.score / state.targetScore;
  if (progress >= 1) {
    el.score.style.color = '#4ecdc4';
  } else if (progress >= 0.7) {
    el.score.style.color = '#ffe66d';
  } else {
    el.score.style.color = '#fff';
  }

  updateMultiplierGlow();

  // 发送分数更新事件
  eventBus.emit('score:update', {
    score: state.score,
    multiplier: state.multiplier,
    combo: state.combo
  });
}

export function renderBattleSkills(): void {
  const el = getElements();
  el.battleSkills.innerHTML = '';

  let delay = 0;
  state.player.bindings.forEach((skillId, key) => {
    const sk = SKILLS[skillId] || PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId];
    if (!sk) return;

    const lvl = state.player.skills.get(skillId)?.level || 1;
    const display = getSkillDisplayInfo(skillId, state.player.evolvedSkills, lvl);
    const isEvolved = state.player.evolvedSkills.has(skillId);
    const d = document.createElement('div');
    d.className = `bound-skill card-float${isEvolved ? ' evolved' : ''}`;
    d.dataset.id = skillId;
    d.style.animationDelay = `${delay * 0.2}s`;
    d.innerHTML = `
      <span class="skill-letter">${key.toUpperCase()}</span>
      <span class="skill-icon">${display.icon}</span>
      ${lvl > 1 ? `<span class="skill-level">Lv.${lvl}</span>` : ''}
    `;
    el.battleSkills.appendChild(d);
    delay++;
  });
}

export function renderRelicDisplay(): void {
  const el = getElements();

  // 战斗界面遗物
  el.playerRelics.innerHTML = '';
  state.player.relics.forEach(relicId => {
    const relic = RELICS[relicId];
    if (relic) {
      const span = document.createElement('span');
      span.className = 'relic-icon';
      span.textContent = relic.icon;
      span.title = `${relic.name}: ${relic.description}`;
      el.playerRelics.appendChild(span);
    }
  });

  // 商店界面遗物
  el.shopRelicIcons.innerHTML = '';
  state.player.relics.forEach(relicId => {
    const relic = RELICS[relicId];
    if (relic) {
      const span = document.createElement('span');
      span.className = 'relic-icon';
      span.textContent = relic.icon;
      span.title = `${relic.name}: ${relic.description}`;
      el.shopRelicIcons.appendChild(span);
    }
  });
}

function renderActiveLibrary(): void {
  const el = getElements();
  const deckSize = state.player.wordDeck.length;
  el.activeLibrary.textContent = `📚 ${deckSize}词`;
}

// === 特效 ===
export function showFeedback(txt: string, color: string): void {
  const el = getElements();
  el.feedback.textContent = txt;
  el.feedback.style.color = color;
  setTimeout(() => {
    if (el.feedback.textContent === txt) el.feedback.textContent = '';
  }, 900);
}

function showScorePopup(score: number): void {
  const el = getElements();
  const p = document.createElement('div');
  p.className = 'score-popup';
  p.textContent = `+${score}`;
  p.style.left = (40 + Math.random() * 20) + '%';
  el.container.appendChild(p);
  setTimeout(() => p.remove(), 800);
}

export function highlightBoundSkill(skillId: string): void {
  const el = getElements();
  const skill = el.battleSkills.querySelector(`[data-id="${skillId}"]`) as HTMLElement;
  if (skill) {
    skill.classList.add('triggered');
    juiceUp(skill, 0.4, 5);
    setTimeout(() => skill.classList.remove('triggered'), 250);
  }
}
