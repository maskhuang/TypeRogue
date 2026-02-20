// ============================================
// 打字肉鸽 - 战斗系统
// ============================================

import { state, synergy, calculateTargetScore, hasRelic } from '../core/state';
import { eventBus } from '../core/events/EventBus';
import { inputHandler } from './typing/InputHandler';
import { getElements } from '../ui/elements';
import { SKILLS } from '../data/skills';
import { RELICS } from '../data/relics';
import { juiceUp, bumpCombo, bumpScore, bumpMultiplier, screenShake, updateMultiplierGlow } from '../effects/juice';
import { playSound, initAudio } from '../effects/sound';
import { spawnParticles } from '../effects/particles';
import { triggerSkill } from './skills';
import { openShop } from './shop';

// === 计时器 ===
let timerInterval: ReturnType<typeof setInterval> | null = null;

// === 分数结算 ===
let wordBaseScore = 0; // 词语基础分（不含倍率）
let settlementTimeouts: ReturnType<typeof setTimeout>[] = []; // 所有结算相关的定时器

// === 屏幕管理 ===
export function showScreen(name: 'battle' | 'shop' | 'gameover'): void {
  const el = getElements();
  el.battleScreen.style.display = name === 'battle' ? 'flex' : 'none';
  el.shopScreen.style.display = name === 'shop' ? 'flex' : 'none';
  el.gameoverScreen.style.display = name === 'gameover' ? 'flex' : 'none';
}

// === 词语系统 ===
function getActiveWords(): string[] {
  return state.player.wordDeck.length > 0 ? state.player.wordDeck : ['fire', 'ice', 'bolt', 'spark', 'flame'];
}

function pickWord(): string {
  const words = getActiveWords();
  const bound = [...state.player.bindings.keys()];

  // 磁石遗物：更高几率选择包含技能字母的词
  const magnetChance = hasRelic('magnet') ? 0.8 : 0.6;

  if (bound.length && Math.random() < magnetChance) {
    const good = words.filter(w => bound.some(l => w.includes(l)));
    if (good.length) return good[Math.floor(Math.random() * good.length)].toUpperCase();
  }
  return words[Math.floor(Math.random() * words.length)].toUpperCase();
}

function setWord(): void {
  state.player.word = pickWord();
  state.player.index = 0;
  state.wordScore = 0;
  wordBaseScore = 0; // 重置基础分
  state.wordPerfect = true;
  synergy.echoTrigger.clear();
  synergy.wordSkillCount = 0; // 重置技能触发计数
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

  // 计算倍率: 基础 + 连击加成 + 完美主义加成
  let mult = state.player.baseMultiplier + state.combo * state.player.comboBonus;
  if (hasRelic('perfectionist')) {
    mult += synergy.perfectStreak * 0.01;
  }
  state.multiplier = mult;

  // 字母基础分 + 字母加成
  const letterBase = 1 + state.player.letterBonus;
  const letterScore = letterBase * state.multiplier;
  wordBaseScore += letterBase; // 累计基础分（用于结算展示）
  state.wordScore += letterScore;

  // 触发技能
  if (skillId) {
    letter.classList.add('skill-triggered');
    juiceUp(letter, 0.4, 5); // 强力弹跳
    bumpMultiplier();
    triggerSkill(skillId, k);
  }

  spawnParticles(letter, skillId ? 10 : 5, '#4ecdc4');
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

  // 护盾保护
  if (synergy.shieldCount > 0) {
    synergy.shieldCount--;
    showFeedback('护盾保护!', '#87ceeb');
    return;
  }

  // 凤凰羽毛遗物：50%几率保护连击
  if (hasRelic('phoenix_feather') && Math.random() < 0.5) {
    showFeedback('凤凰羽毛!', '#ff9500');
    return;
  }

  // 完美主义遗物：重置完美计数
  synergy.perfectStreak = 0;

  // 标记词语不完美
  state.wordPerfect = false;

  if (state.combo > 5) showFeedback(`${state.combo}× 断了!`, '#ff6b6b');
  state.combo = 0;
  state.lastMilestone = 0;
  state.multiplier = state.player.baseMultiplier;
  updateHUD();
}

function completeWord(): void {
  const el = getElements();

  // 计算基础分和倍率
  const baseChips = Math.floor(wordBaseScore);
  let mult = state.multiplier;
  let bonusMult = 1;

  // 狂战士面具：倍率>3.0时分数+50%
  if (hasRelic('berserker_mask') && state.multiplier > 3.0) {
    bonusMult = 1.5;
  }

  const finalMult = mult * bonusMult;
  const finalWordScore = Math.floor(baseChips * finalMult + state.player.wordBonus);

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

    // 显示金币奖励动画，然后结束关卡
    setTimeout(() => {
      if (state.phase === 'battle') {
        showGoldReward(() => endLevel());
      }
    }, 600);
    return;
  }

  // 时间水晶遗物：完成词语+0.5秒（只有未通关时生效）
  if (hasRelic('time_crystal')) {
    state.time = Math.min(state.time + 0.5, state.timeMax + state.player.timeBonus + 5);
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

  const chips = Math.floor(wordBaseScore);
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

  // 计算奖励（与 shop.ts openShop 公式一致）
  const baseGold = 20;
  const timeBonus = Math.floor(state.time);
  const overkillGold = hasRelic('overkill_blade') ? Math.max(0, state.overkill) : 0;
  const treasureGold = hasRelic('treasure_map') ? 15 : 0;
  const totalGold = baseGold + timeBonus + overkillGold + treasureGold;

  // 设置数值
  const goldBaseEl = document.getElementById('gold-base');
  const goldOverkillEl = document.getElementById('gold-overkill');
  const goldTimeEl = document.getElementById('gold-time');
  const goldTreasureEl = document.getElementById('gold-treasure');
  const goldTotalEl = document.getElementById('gold-total');

  if (goldBaseEl) goldBaseEl.textContent = `+${baseGold}`;
  if (goldTimeEl) goldTimeEl.textContent = `+${timeBonus}`;
  if (goldTotalEl) goldTotalEl.textContent = `+${totalGold}`;

  // 条件行：无遗物时隐藏整行
  const overkillRow = document.querySelector('.gold-overkill-row') as HTMLElement;
  if (overkillRow) overkillRow.style.display = overkillGold > 0 ? '' : 'none';
  if (goldOverkillEl) goldOverkillEl.textContent = `+${overkillGold}`;

  const treasureRow = document.querySelector('.gold-treasure-row') as HTMLElement;
  if (treasureRow) treasureRow.style.display = treasureGold > 0 ? '' : 'none';
  if (goldTreasureEl) goldTreasureEl.textContent = `+${treasureGold}`;

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
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    if (state.phase !== 'battle') {
      if (timerInterval) clearInterval(timerInterval);
      return;
    }

    state.time -= 0.1;
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
  hideSettlement();

  // 清除倍率光晕效果
  const el = getElements();
  el.container.classList.remove('mid-mult', 'high-mult');

  if (state.score >= state.targetScore) {
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

export function startLevel(): void {
  state.phase = 'battle';
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.multiplier = state.player.baseMultiplier;
  state.wordScore = 0;
  state.overkill = 0;
  state.targetScore = calculateTargetScore(state.level);

  synergy.shieldCount = 0;
  synergy.perfectStreak = 0;
  synergy.rippleBonus.clear();
  synergy.echoTrigger.clear();

  const el = getElements();
  el.levelLabel.textContent = `LEVEL ${state.level}`;

  showScreen('battle');
  setWord();
  updateHUD();
  renderBattleSkills();
  renderRelicDisplay();
  renderActiveLibrary();
  announceLevel();
  startTimer();
}

function announceLevel(): void {
  const el = getElements();
  const ann = document.createElement('div');
  ann.className = 'level-announce';
  ann.innerHTML = `LEVEL ${state.level}<br><span class="target-hint">目标: ${state.targetScore}分</span>`;
  el.container.appendChild(ann);
  playSound('levelup');
  setTimeout(() => ann.remove(), 1500);
}

// === 游戏结束 ===
function gameOver(): void {
  state.phase = 'gameover';
  if (timerInterval) clearInterval(timerInterval);

  const el = getElements();
  el.gameoverStats.innerHTML = `
    到达 Level ${state.level}<br>
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
    const sk = SKILLS[skillId];
    if (!sk) return;

    const lvl = state.player.skills.get(skillId)?.level || 1;
    const d = document.createElement('div');
    d.className = 'bound-skill card-float';
    d.dataset.id = skillId;
    d.style.animationDelay = `${delay * 0.2}s`;
    d.innerHTML = `
      <span class="skill-letter">${key.toUpperCase()}</span>
      <span class="skill-icon">${sk.icon}</span>
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
