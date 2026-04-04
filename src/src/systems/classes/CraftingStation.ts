// ============================================
// 打字肉鸽 - 造词台 UI（流水线版）
// ============================================
// Epic 44: 碎片库存 + 流水线可视化 + 词语组装 + 可拼词列表 + 拆解

import { state } from '../../core/state';
import { playSound } from '../../effects/sound';
import { showFeedback } from '../battle';
import { createPipeline, MAX_PIPELINE_LENGTH, MAX_QUEUE_SIZE } from './AssemblyPipeline';
import { getAllWords } from '../../data/wordPacks';
import { applyApprenticeEvent } from '../../data/affixTrigger';
import { getApprenticeGrowthMultiplier } from '../relics/EnchantmentRelicBehaviors';

// === 模块状态 ===
let currentWordLetters: string[] = [];
let cachedGoldUpdate: (() => void) | null = null;
let cachedContainer: HTMLElement | null = null;

// === 造词台面板渲染 ===
export function renderCraftPanel(container: HTMLElement, onGoldUpdate: () => void): void {
  cachedGoldUpdate = onGoldUpdate;
  cachedContainer = container;
  container.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'craft-title';
  title.textContent = '⚡ 造词台';
  container.appendChild(title);

  // --- 流水线状态 ---
  renderPipelineStatus(container);

  // --- 碎片库存 ---
  renderFragmentInventory(container);

  // --- 组装新词（队列版：随时可排队） ---
  renderWordBuilder(container);
  renderSuggestedWords(container);

  // --- 已造词列表 ---
  renderCraftedWordList(container);
}

// === 流水线可视化 ===
function renderPipelineStatus(container: HTMLElement): void {
  const section = document.createElement('div');
  section.className = 'craft-section craft-pipeline-section';

  const header = document.createElement('div');
  header.className = 'craft-section-header';
  header.textContent = `⚡ 组装流水线 (${state.assemblyQueue.length}/${MAX_QUEUE_SIZE})`;
  section.appendChild(header);

  if (state.assemblyQueue.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'craft-pipeline-empty';
    empty.textContent = '无组装中的词语 — 在下方选择碎片开始组装';
    section.appendChild(empty);
  } else {
    state.assemblyQueue.forEach((pipeline, qIdx) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'craft-queue-item';
      if (qIdx === 0) itemDiv.classList.add('craft-queue-active');

      // 词名 + 进度
      const wordLabel = document.createElement('div');
      wordLabel.className = 'craft-pipeline-word';
      const completedCount = pipeline.slots.filter(s => s.completed).length;
      if (qIdx === 0) {
        wordLabel.textContent = `🔨 "${pipeline.targetWord}" — ${completedCount}/${pipeline.slots.length}`;
      } else {
        wordLabel.textContent = `📋 ${qIdx + 1}. "${pipeline.targetWord}"`;
      }
      itemDiv.appendChild(wordLabel);

      // 当前生产中：显示槽位进度条
      if (qIdx === 0) {
        const slotsRow = document.createElement('div');
        slotsRow.className = 'craft-pipeline-slots';

        let foundActive = false;
        for (const slot of pipeline.slots) {
          const el = document.createElement('div');
          el.className = 'craft-pipeline-slot';
          if (slot.completed) {
            el.classList.add('craft-pipeline-slot-done');
            el.textContent = `${slot.letter.toUpperCase()} ✓`;
          } else if (!foundActive) {
            el.classList.add('craft-pipeline-slot-active');
            el.textContent = slot.letter.toUpperCase();
            foundActive = true;
          } else {
            el.classList.add('craft-pipeline-slot-pending');
            el.textContent = slot.letter.toUpperCase();
          }

          const bar = document.createElement('div');
          bar.className = 'craft-pipeline-bar';
          const fill = document.createElement('div');
          fill.className = 'craft-pipeline-fill';
          fill.style.width = `${Math.round(slot.progress * 100)}%`;
          bar.appendChild(fill);
          el.appendChild(bar);
          slotsRow.appendChild(el);
        }
        itemDiv.appendChild(slotsRow);
      }

      // 取消按钮
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'craft-cancel-btn';
      cancelBtn.textContent = '✕';
      cancelBtn.title = '取消（返还碎片）';
      cancelBtn.onclick = (e) => {
        e.stopPropagation();
        for (const slot of pipeline.slots) {
          if (/[a-z]/.test(slot.letter)) {
            state.fragmentInventory[slot.letter] = (state.fragmentInventory[slot.letter] || 0) + 1;
          }
        }
        state.assemblyQueue.splice(qIdx, 1);
        showFeedback('组装已取消，碎片已返还', '#88ccff');
        rerender();
      };
      itemDiv.appendChild(cancelBtn);

      section.appendChild(itemDiv);
    });
  }

  container.appendChild(section);
}

// === 碎片库存展示 ===
function renderFragmentInventory(container: HTMLElement): void {
  const section = document.createElement('div');
  section.className = 'craft-section craft-inventory-section';

  const header = document.createElement('div');
  header.className = 'craft-section-header';
  header.textContent = '碎片库存';
  section.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'craft-inventory-grid';

  for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
    const cell = document.createElement('div');
    cell.className = 'craft-inventory-cell';
    const total = Math.floor(state.fragmentInventory[letter] || 0);
    const used = currentWordLetters.filter(l => l === letter).length;
    const available = total - used;
    if (available <= 0) cell.classList.add('craft-inventory-empty');

    const letterEl = document.createElement('span');
    letterEl.className = 'craft-inventory-letter';
    letterEl.textContent = letter.toUpperCase();

    const countEl = document.createElement('span');
    countEl.className = 'craft-inventory-count';
    countEl.textContent = String(available);

    cell.appendChild(letterEl);
    cell.appendChild(countEl);

    // 有流水线时不可点击；无流水线时点击添加字母
    if (available > 0) {
      cell.onclick = () => addLetterToWord(letter);
    }

    grid.appendChild(cell);
  }

  section.appendChild(grid);
  container.appendChild(section);
}

// === 添加/移除字母 ===
function addLetterToWord(letter: string): void {
  const usedCount = currentWordLetters.filter(l => l === letter).length;
  const available = Math.floor(state.fragmentInventory[letter] || 0) - usedCount;
  if (available <= 0) return;
  currentWordLetters.push(letter);
  rerender();
}

function removeLetterFromWord(index: number): void {
  currentWordLetters.splice(index, 1);
  rerender();
}

function rerender(): void {
  if (cachedContainer && cachedGoldUpdate) {
    renderCraftPanel(cachedContainer, cachedGoldUpdate);
  }
}

// === 造词输入区（仅无流水线时显示）===
function renderWordBuilder(container: HTMLElement): void {
  const section = document.createElement('div');
  section.className = 'craft-section craft-builder-section';

  const header = document.createElement('div');
  header.className = 'craft-section-header';
  header.textContent = '📝 组装新词';
  section.appendChild(header);

  // 当前拼词
  const wordRow = document.createElement('div');
  wordRow.className = 'craft-word-row';

  if (currentWordLetters.length === 0) {
    const placeholder = document.createElement('span');
    placeholder.className = 'craft-word-placeholder';
    placeholder.textContent = '点击碎片添加字母，或从下方可拼词选择';
    wordRow.appendChild(placeholder);
  } else {
    for (let i = 0; i < currentWordLetters.length; i++) {
      const chip = document.createElement('span');
      chip.className = 'craft-word-chip';
      chip.textContent = currentWordLetters[i].toUpperCase();
      chip.title = '点击移除';
      chip.onclick = () => removeLetterFromWord(i);
      wordRow.appendChild(chip);
    }
  }
  section.appendChild(wordRow);

  // 确认按钮
  if (currentWordLetters.length >= 2) {
    const word = currentWordLetters.join('').toLowerCase();
    const tooLong = word.length > MAX_PIPELINE_LENGTH;
    const hasFragments = canBuildWord(word, state.fragmentInventory);
    const queueFull = state.assemblyQueue.length >= MAX_QUEUE_SIZE;
    const canStart = !tooLong && hasFragments && !queueFull;

    const btn = document.createElement('button');
    btn.className = 'craft-confirm-btn';
    if (!canStart) btn.classList.add('craft-confirm-disabled');
    btn.textContent = state.assemblyQueue.length > 0 ? '排队组装' : '开始组装';
    btn.disabled = !canStart;

    btn.onclick = () => {
      if (!canStart) return;
      const pipeline = createPipeline(word, state.fragmentInventory);
      if (pipeline) {
        state.assemblyQueue.push(pipeline);
        currentWordLetters = [];

        // 学徒事件
        const growthMult = getApprenticeGrowthMultiplier();
        for (const [, skill] of state.affixSkills) {
          const rt = state.affixSkillStates.get(skill.id);
          if (!rt) continue;
          applyApprenticeEvent('wordCrafted', rt, skill.enchantmentIds, growthMult);
        }

        playSound('buy');
        showFeedback(`⚡ 开始组装: ${word}`, '#9b59b6');
        rerender();
      } else {
        showFeedback('碎片不足或词太长!', '#ff6b6b');
      }
    };
    section.appendChild(btn);

    if (tooLong) {
      const hint = document.createElement('span');
      hint.className = 'craft-confirm-hint';
      hint.textContent = `最多 ${MAX_PIPELINE_LENGTH} 个字母`;
      section.appendChild(hint);
    }
    if (queueFull) {
      const hint = document.createElement('span');
      hint.className = 'craft-confirm-hint';
      hint.textContent = `队列已满 (${MAX_QUEUE_SIZE}/${MAX_QUEUE_SIZE})`;
      section.appendChild(hint);
    }
  }

  container.appendChild(section);
}

// === 可拼词建议列表 ===
function renderSuggestedWords(container: HTMLElement): void {
  const suggestions = findBuildableWords();
  if (suggestions.length === 0) return;

  const section = document.createElement('div');
  section.className = 'craft-section craft-suggest-section';

  const header = document.createElement('div');
  header.className = 'craft-section-header';
  header.textContent = `💡 可拼词 (${suggestions.length})`;
  section.appendChild(header);

  const list = document.createElement('div');
  list.className = 'craft-suggest-list';

  for (const word of suggestions.slice(0, 20)) {
    const tag = document.createElement('span');
    tag.className = 'craft-suggest-tag';
    tag.textContent = word;
    tag.title = '点击选择';
    tag.onclick = () => {
      // 验证碎片仍然足够（可能在选择前被消耗）
      if (canBuildWord(word, state.fragmentInventory)) {
        currentWordLetters = word.split('');
      } else {
        showFeedback('碎片已不足!', '#ff6b6b');
      }
      rerender();
    };
    list.appendChild(tag);
  }

  section.appendChild(list);
  container.appendChild(section);
}

/** 从全局词库中筛选当前碎片可拼出且未拥有的词，按词长排序 */
function findBuildableWords(): string[] {
  const inv = state.fragmentInventory;
  const owned = new Set(state.player.wordDeck.map(w => w.toLowerCase()));

  const result: string[] = [];
  for (const word of getAllWords()) {
    if (owned.has(word)) continue;
    if (word.length < 2 || word.length > MAX_PIPELINE_LENGTH) continue;
    if (canBuildWord(word, inv)) result.push(word);
  }

  result.sort((a, b) => a.length - b.length);
  return result;
}

function canBuildWord(word: string, inv: Record<string, number>): boolean {
  const needed: Record<string, number> = {};
  for (const ch of word) needed[ch] = (needed[ch] ?? 0) + 1;
  for (const [letter, count] of Object.entries(needed)) {
    if (Math.floor(inv[letter] ?? 0) < count) return false;
  }
  return true;
}

// === 拆词剪刀 ===
export function deconstructWord(word: string, onGoldUpdate: () => void): boolean {
  const idx = state.craftedWords.indexOf(word);
  if (idx === -1) return false;

  // 返还碎片（100%）
  for (const ch of word.toLowerCase()) {
    if (/[a-z]/.test(ch)) {
      state.fragmentInventory[ch] = (state.fragmentInventory[ch] || 0) + 1;
    }
  }

  state.craftedWords.splice(idx, 1);
  const deckIdx = state.player.wordDeck.indexOf(word);
  if (deckIdx !== -1) state.player.wordDeck.splice(deckIdx, 1);

  showFeedback(`✂ 拆解「${word}」，碎片已返还!`, '#88ccff');
  playSound('buy');
  onGoldUpdate();
  return true;
}

// === 已造词列表 ===
function renderCraftedWordList(container: HTMLElement): void {
  if (state.craftedWords.length === 0) return;

  const section = document.createElement('div');
  section.className = 'craft-section craft-list-section';

  const header = document.createElement('div');
  header.className = 'craft-section-header';
  header.textContent = `已造词 (${state.craftedWords.length})`;
  section.appendChild(header);

  const list = document.createElement('div');
  list.className = 'craft-word-list';

  const hasScissors = state.player.relics.has('word_scissors');

  for (const word of state.craftedWords) {
    const tag = document.createElement('span');
    tag.className = 'craft-word-tag';
    tag.textContent = word;

    if (hasScissors) {
      const btn = document.createElement('button');
      btn.className = 'craft-deconstruct-btn';
      btn.textContent = '✂';
      btn.title = '拆解（返还所有碎片）';
      btn.onclick = (e) => {
        e.stopPropagation();
        if (cachedGoldUpdate) {
          deconstructWord(word, cachedGoldUpdate);
          rerender();
        }
      };
      tag.appendChild(btn);
    }

    list.appendChild(tag);
  }

  section.appendChild(list);
  container.appendChild(section);
}

// === 重置 ===
export function resetCraftInput(): void {
  currentWordLetters = [];
  cachedGoldUpdate = null;
  cachedContainer = null;
}
