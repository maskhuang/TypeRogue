// ============================================
// 打字肉鸽 - 战斗系统
// ============================================

import { state, synergy, calculateTargetScore } from '../core/state';
import { eventBus } from '../core/events/EventBus';
import { inputHandler } from './typing/InputHandler';
import { getElements } from '../ui/elements';
import { SKILLS } from '../data/skills';
import { RELICS, hasRelic } from '../data/relics';
import { juiceUp, bumpCombo, bumpScore, bumpMultiplier, screenShake, updateMultiplierGlow } from '../effects/juice';
import { playSound, initAudio } from '../effects/sound';
import { spawnParticles } from '../effects/particles';
import { triggerSkill } from './skills';
import { openShop } from './shop';

// === 计时器 ===
let timerInterval: ReturnType<typeof setInterval> | null = null;

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
  state.wordPerfect = true;
  synergy.echoTrigger.clear();
  renderWord();
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
  const letterScore = (1 + state.player.letterBonus) * state.multiplier;
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

  // 词语完成奖励
  let wordBonus = state.player.wordBonus;
  let finalWordScore = state.wordScore + wordBonus;

  // 狂战士面具：连击>20时分数+50%
  if (hasRelic('berserker_mask') && state.combo > 20) {
    finalWordScore *= 1.5;
  }

  finalWordScore = Math.floor(finalWordScore);
  state.score += finalWordScore;
  showScorePopup(finalWordScore);
  bumpScore();

  // 发送词语完成事件
  eventBus.emit('word:complete', {
    word: state.player.word,
    score: finalWordScore,
    perfect: state.wordPerfect
  });

  // 时间水晶遗物：完成词语+0.5秒
  if (hasRelic('time_crystal')) {
    state.time = Math.min(state.time + 0.5, state.timeMax + state.player.timeBonus + 5);
  }

  // 词语完成 - 所有字母一起弹跳
  Array.from(el.word.children).forEach((letter, i) => {
    setTimeout(() => juiceUp(letter as HTMLElement, 0.25, 4 * (i % 2 === 0 ? 1 : -1)), i * 30);
  });

  // 分级屏幕震动
  const shakeIntensity = finalWordScore >= 20 ? 3 : finalWordScore >= 10 ? 2 : 1;
  screenShake(shakeIntensity);

  playSound('word');

  setTimeout(() => {
    if (state.phase === 'battle') setWord();
  }, 200);
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

  if (state.score >= state.targetScore) {
    openShop(true);
  } else {
    gameOver();
  }
}

export function startLevel(): void {
  state.phase = 'battle';
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.multiplier = state.player.baseMultiplier;
  state.wordScore = 0;
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
      span.title = `${relic.name}: ${relic.desc}`;
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
      span.title = `${relic.name}: ${relic.desc}`;
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
