// ============================================
// 打字肉鸽 - 战斗系统
// ============================================

import { state, synergy, calculateTargetScore, resetResources, createBattleStats } from '../core/state';
import { resolveRelicEffects, resolveRelicEffectsWithBehaviors, queryRelicFlag } from './relics/RelicPipeline';
import { eventBus } from '../core/events/EventBus';
import { inputHandler } from './typing/InputHandler';
import { getElements } from '../ui/elements';
import { RELICS, MAX_RELIC_SLOTS } from '../data/relics';
import { juiceUp, bumpCombo, bumpScore, bumpMultiplier, bumpTimer, getFloatScale, screenShake, getScoreTier, SCORE_TIER_CLASSES } from '../effects/juice';
import { playSound, initAudio } from '../effects/sound';
import { spawnParticles } from '../effects/particles';
import { triggerSkill, clearPseudoInfinite, resetWordResourceTypes, getWordResourceTypeCount } from './skills';
import { HAND_MAP } from '../data/keyboardTopology';
import { openShop } from './shop';
import { hasUnownedRelics, showRelicPicker, RELIC_WEIGHT_PRESETS } from './relicPicker';
import { getLetterScoreModifiers, calculateLetterFrequency } from './letters/LetterFrequencySystem';
import { ModifierRegistry } from './modifiers/ModifierRegistry';
import { EffectPipeline } from './modifiers/EffectPipeline';
import { keyTooltip } from '../ui/keyboard/KeyTooltip';
import { getStageType, getCycleTimeLimit, getBattleNumber, getEliteModifierIndex, getActForNode } from './stage/stageFlow';
import { getBossModifierMeta, getActiveParams, incrementDiminishCount, getDiminishMultiplier, transformWordForModifier, isRhythmLocked, drawBossModifiers } from '../data/bossModifiers';
import type { BossModifierMeta } from '../data/bossModifiers';
import { applyModifier, cleanupModifier, tickModifier, startBossRotation, stopBossRotation, isModifierActive } from './bossModifierEngine';
import { showBossModifierPicker } from './bossModifierPicker';
import { showActTransition, showEliteAnnouncement, showBossIntro, updateStageInfo } from './actTransition';
import { random, setNormalMode } from '../core/seededRandom';

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
  if (bound.length && random() < 0.6) {
    const good = words.filter(w => bound.some(l => w.includes(l)));
    if (good.length) return good[Math.floor(random() * good.length)].toUpperCase();
  }

  // 偏向选择包含已解锁字母（频率≥5）的词，减少无底分字母出现
  const freq = calculateLetterFrequency(state.player.wordDeck);
  const unlocked = new Set<string>();
  freq.forEach((count, letter) => { if (count >= 5) unlocked.add(letter); });
  if (unlocked.size > 0 && random() < 0.7) {
    // 按词中已解锁字母占比排序，取前半优选
    const scored = words.map(w => {
      const chars = [...w.toLowerCase()].filter(c => c >= 'a' && c <= 'z');
      const ratio = chars.length ? chars.filter(c => unlocked.has(c)).length / chars.length : 0;
      return { w, ratio };
    }).filter(x => x.ratio > 0.5);
    if (scored.length) return scored[Math.floor(random() * scored.length)].w.toUpperCase();
  }

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
  resetWordResourceTypes(); // 重置词级资源追踪
  leftHandTriggered = false; // 重置左右手追踪
  rightHandTriggered = false;
  synergy.wordSkillCount = 0;
  synergy.skillBaseScore = 0;
  synergy.letterBaseScore = 0;
  synergy.lastTriggeredSkillId = null;
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
    const scoreBefore = state.score;
    const timeBefore = state.time;
    triggerSkill(skillId, k);
    if (state.score > scoreBefore) skillProducedScore = true;
    if (state.time > timeBefore) skillProducedTime = true;
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

  letter?.classList.add('wrong');
  setTimeout(() => letter?.classList.remove('wrong'), 150);

  el.container.classList.add('shake');
  setTimeout(() => el.container.classList.remove('shake'), 120);

  playSound('wrong');

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

  // 标记词语不完美
  state.wordPerfect = false;

  if (state.combo > 5) showFeedback(`${state.combo}× 断了!`, '#ff6b6b');

  // 遗物 on_combo_break 管道解析（完美主义者断连击失去遗物）
  resolveRelicEffectsWithBehaviors('on_combo_break', {}, {
    onRemoveRelic: (relicId: string) => {
      state.player.relics.delete(relicId);
      showFeedback('遗物碎裂!', '#ff4444');
    },
  });

  state.combo = 0;
  state.lastMilestone = 0;
  synergy.skillMultBonus = 0;
  state.multiplier = state.player.baseMultiplier;

  // Boss 修饰器：断连即扣（combo_punish）
  const modEffect = getActiveParams();
  if (modEffect?.comboPunishRate && state.score > 0) {
    const penalty = Math.floor(state.score * modEffect.comboPunishRate);
    state.score = Math.max(0, state.score - penalty);
    showFeedback(`-${penalty}分!`, '#ff4444', getFloatScale('score', penalty));
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

  state.score += finalWordScore;
  bumpScore();

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
  if (state.score >= state.targetScore) {
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

  // 计算奖励：技能产出 + 遗物加成（基础金币已在关卡开始时重置为100）
  const skillGold = Math.floor(state.resources.gold);
  const goldRelicResult = resolveRelicEffects('on_battle_end', { overkill: state.overkill, remainingTime: state.time });
  const relicGold = Math.floor(goldRelicResult.effects.gold);
  const totalGold = skillGold + relicGold;

  // T2 遗物状态更新：entropy 衰减 + schrodinger_dice 翻倍/消失 (Story 28.2+28.3)
  if (state.player.relics.has('entropy')) {
    const curr = state.player.relicStates['entropy'] ?? 30;
    const next = curr - 5;
    if (next <= 0) {
      state.player.relics.delete('entropy');
      delete state.player.relicStates['entropy'];
      showFeedback('熵增殆尽...', '#999');
    } else {
      state.player.relicStates['entropy'] = next;
    }
  }
  if (state.player.relics.has('schrodinger_dice')) {
    if (random() < 0.5) {
      // 50% 翻倍
      const curr = state.player.relicStates['schrodinger_dice'] ?? 1.25;
      state.player.relicStates['schrodinger_dice'] = curr * 2;
      showFeedback(`骰子翻倍！×${(curr * 2).toFixed(2)}`, '#ffdd00');
    } else {
      // 50% 消失
      state.player.relics.delete('schrodinger_dice');
      delete state.player.relicStates['schrodinger_dice'];
      showFeedback('骰子消失了...', '#999');
    }
  }

  // 设置数值
  const goldSkillEl = document.getElementById('gold-skill');
  const goldTreasureEl = document.getElementById('gold-treasure');
  const goldTotalEl = document.getElementById('gold-total');

  if (goldSkillEl) goldSkillEl.textContent = `+${skillGold}`;
  if (goldTotalEl) goldTotalEl.textContent = String(100 + totalGold);

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

// === 关卡评级 ===
export function calculateRating(score: number, targetScore: number): string {
  if (score < targetScore) return 'C';
  const overkillRatio = (score - targetScore) / targetScore;
  if (overkillRatio >= 2.0) return 'SSS';
  if (overkillRatio >= 1.0) return 'SS';
  if (overkillRatio >= 0.5) return 'S';
  if (overkillRatio >= 0.2) return 'A';
  return 'B';
}

// === 关卡系统 ===
function endLevel(): void {
  if (timerInterval) clearInterval(timerInterval);
  clearPseudoInfinite();
  clearFloatQueue();
  cleanupModifier();
  stopBossRotation();
  hideSettlement();

  // 计算关卡评级
  if (state.battleStats) {
    state.battleStats.rating = calculateRating(state.score, state.targetScore);
  }

  if (state.score >= state.targetScore) {
    const currentType = getStageType(state.level);

    if (currentType === 'boss') {
      // Boss 关胜利 → 周目推进 + 修饰器选择 + 传说遗物三选一 + 进商店
      advanceCycle();
      showBossModifierPicker(() => {
        if (hasUnownedRelics()) {
          showRelicPicker(() => openShop(true), RELIC_WEIGHT_PRESETS.bossDrop);
        } else {
          openShop(true);
        }
      });
      return;
    }

    if (currentType === 'elite' && hasUnownedRelics()) {
      // 精英关胜利 → 遗物三选一（rare 60% / legendary 40%）→ 商店
      showRelicPicker(() => openShop(true), RELIC_WEIGHT_PRESETS.eliteDrop);
      return;
    }

    // 普通关胜利 → 直接进商店
    openShop(true);
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
  // 先隐藏所有屏幕，避免过渡动画期间暴露gameover等界面
  showScreen('battle');
  const currentStageType = getStageType(state.level);
  const currentAct = getActForNode(state.level);
  if (currentAct !== lastAct) {
    // T2 遗物事件钩子：幕切换时触发 on_act_end（跳过首次进入，lastAct=0 表示无前序幕）(Story 28.1)
    if (lastAct > 0) {
      resolveRelicEffectsWithBehaviors('on_act_end', { endedAct: lastAct });
      // T2 campfire_ember 幕重置：购买计数归零 (Story 28.2)
      if (state.player.relics.has('campfire_ember')) {
        state.player.relicStates['campfire_ember'] = 0;
      }
    }
    await showActTransition(currentAct);
    lastAct = currentAct;
  }

  state.phase = 'battle';
  state.score = 0;
  lastScoreTier = ''; // 重置分数分级缓存 (Review M1)
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
  state.timeMax = getCycleTimeLimit(state.level, state.cycle);
  state.targetScore = calculateTargetScore(battleNum > 0 ? battleNum : state.level, currentStageType, state.cycle);

  // 应用活跃临时 buff
  for (const buff of state.tempBuffs) {
    if (buff.type === 'multiplier') state.player.baseMultiplier += buff.value;
    if (buff.type === 'time') state.timeMax += buff.value;
    if (buff.type === 'targetScore') state.targetScore = Math.floor(state.targetScore * buff.value);
  }

  // 重置资源（在 timeMax 和 tempBuff 之后，确保 resources.time 使用正确的 timeMax）
  resetResources();
  state.resources.gold = 0;

  // 每关开始时金币重置为100
  state.gold = 100;

  // 初始化战后统计
  state.battleStats = createBattleStats();

  // 清空增幅者叠层（每关重置）
  state.amplifierStacks.clear();
  // 清空吞噬附魔触发计数（每关重置）
  state.devourCounters.clear();

  synergy.skillMultBonus = 0;
  state.multiplier = state.player.baseMultiplier;

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

  const el = getElements();
  const displayLevel = getBattleNumber(state.level) || state.level;
  const stageLabel = currentStageType === 'elite' ? ' [ELITE]' : currentStageType === 'boss' ? ' [BOSS]' : '';
  const cyclePrefix = state.cycle >= 2 ? `周目${state.cycle} · ` : '';
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
      modInfo.querySelector('.modifier-name')!.textContent = meta.name;
      modInfo.querySelector('.modifier-hint')!.textContent = meta.eliteHint;
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
  startTimer();

  // 时间遗物加成（在 startTimer 设置初始时间后应用，如 doomsday +30 秒）
  if (startRelicResult.effects.time > 0) {
    state.time += startRelicResult.effects.time;
  }

  // 时间窃贼代价：基础时间减半（在遗物加成之后应用）
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

  const cyclePfx = state.cycle >= 2 ? `周目${state.cycle} · ` : '';
  ann.innerHTML = `${cyclePfx}LEVEL ${displayLevel}${typeLabel}<br><span class="target-hint">目标: ${state.targetScore}分</span>`;
  el.container.appendChild(ann);
  playSound('levelup');
  setTimeout(() => ann.remove(), 1500);
}

// === 胜利 ===
function victory(): void {
  state.phase = 'victory';
  if (timerInterval) clearInterval(timerInterval);
  clearFloatQueue();
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
    enchantments: Array.from(state.player.enchantedSkills.entries()).map(([skillId, enchantmentId]) => ({ skillId, enchantmentId })),
    activeModifiers: [...state.activeModifiers],
    seed: state.dailySeed,
  });
}

// === 游戏结束 ===
function gameOver(): void {
  state.phase = 'gameover';
  if (timerInterval) clearInterval(timerInterval);
  clearPseudoInfinite();
  clearFloatQueue();
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
    enchantments: Array.from(state.player.enchantedSkills.entries()).map(([skillId, enchantmentId]) => ({ skillId, enchantmentId })),
    activeModifiers: [...state.activeModifiers],
    seed: state.dailySeed,
  });
}

// === UI 更新 ===
export function updateHUD(): void {
  const el = getElements();
  el.combo.textContent = String(state.combo);
  el.score.textContent = String(Math.floor(state.score));
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
        slot.title = `[${keyLabel}] ${relic?.name}: ${relic?.description}`;
      } else {
        slot.className = 'relic-icon relic-slot-empty';
        slot.textContent = '·';
        slot.title = `[${keyLabel}] 空槽位`;
      }
      container.appendChild(slot);
    }
  }

  renderSlots(el.playerRelics);
}

function renderActiveLibrary(): void {
  const el = getElements();
  const deckSize = state.player.wordDeck.length;
  el.activeLibrary.textContent = `📚 ${deckSize}词`;
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

