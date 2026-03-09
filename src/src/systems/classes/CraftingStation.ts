// ============================================
// 打字肉鸽 - 造词台 UI + 造词逻辑
// ============================================
// Story 32.6: 造词师专属商店 tab，包含采集队列编辑、碎片库存、造词输入、消耗预览、已造词列表

import { state } from '../../core/state';
import { playSound } from '../../effects/sound';
import { showFeedback } from '../battle';
import { onWordCrafted } from '../skills';
import { getMaxQueueLength, setFragmentQueue } from './FragmentQueue';

// === 金币递增公式常量 ===
const REPEAT_GOLD_COST = [0, 5, 15, 30] as const;

// === 造词金币成本计算 ===
export function calculateCraftCost(letters: string[]): { fragments: Record<string, number>; gold: number } {
  const fragments: Record<string, number> = {};
  let gold = 0;

  for (const l of letters) {
    const lower = l.toLowerCase();
    fragments[lower] = (fragments[lower] || 0) + 1;
  }

  // 共鸣字模：重复字母不收金币
  if (!state.player.relics.has('resonance_mold')) {
    for (const count of Object.values(fragments)) {
      for (let i = 1; i < count; i++) {
        const costIndex = Math.min(i, REPEAT_GOLD_COST.length - 1);
        gold += REPEAT_GOLD_COST[costIndex];
      }
    }
  }

  return { fragments, gold };
}

// === 检查碎片是否充足 ===
function hasEnoughFragments(needed: Record<string, number>): boolean {
  for (const [letter, count] of Object.entries(needed)) {
    if (Math.floor(state.fragmentInventory[letter] || 0) < count) return false;
  }
  return true;
}

// === 造词核心逻辑 ===
// === 最低词长 ===
const MIN_WORD_LENGTH = 2;

export function craftWord(letters: string[], onGoldUpdate: () => void): boolean {
  if (letters.length < MIN_WORD_LENGTH) {
    if (letters.length > 0) showFeedback(`词长至少 ${MIN_WORD_LENGTH} 个字母!`, '#ff6b6b');
    return false;
  }

  const word = letters.join('').toLowerCase();
  const { fragments, gold } = calculateCraftCost(letters);

  if (!hasEnoughFragments(fragments)) {
    showFeedback('碎片不足!', '#ff6b6b');
    return false;
  }
  if (state.gold < gold) {
    showFeedback('金币不足!', '#ff6b6b');
    return false;
  }

  // 扣碎片
  for (const [letter, count] of Object.entries(fragments)) {
    state.fragmentInventory[letter] -= count;
  }

  // 扣金币
  state.gold -= gold;
  onGoldUpdate();

  // 推入词库
  state.player.wordDeck.push(word);
  state.craftedWords.push(word);

  // 丰收附魔累计
  onWordCrafted();

  playSound('buy');
  return true;
}

// === 造词台面板渲染 ===
let currentWordLetters: string[] = [];
let cachedGoldUpdate: (() => void) | null = null;

export function renderCraftPanel(container: HTMLElement, onGoldUpdate: () => void): void {
  cachedGoldUpdate = onGoldUpdate;
  container.innerHTML = '';

  // --- 标题 ---
  const title = document.createElement('div');
  title.className = 'craft-title';
  title.textContent = '🔤 造词台';
  container.appendChild(title);

  // --- 采集队列编辑区 ---
  renderQueueEditor(container);

  // --- 碎片库存 ---
  renderFragmentInventory(container);

  // --- 造词输入区 + 消耗预览 ---
  renderWordBuilder(container, onGoldUpdate);

  // --- 已造词列表 ---
  renderCraftedWordList(container);
}

// === 采集队列编辑区 ===
function renderQueueEditor(container: HTMLElement): void {
  const section = document.createElement('div');
  section.className = 'craft-section craft-queue-section';

  const header = document.createElement('div');
  header.className = 'craft-section-header';
  header.textContent = '采集队列';
  section.appendChild(header);

  const queueRow = document.createElement('div');
  queueRow.className = 'craft-queue-row';

  const maxLen = getMaxQueueLength();
  for (let i = 0; i < maxLen; i++) {
    const slot = document.createElement('div');
    slot.className = 'craft-queue-slot';
    const letter = state.fragmentQueue[i] || '_';
    slot.textContent = letter === '_' ? '·' : letter.toUpperCase();
    if (letter === '_') slot.classList.add('craft-queue-empty');
    if (i === state.fragmentQueuePosition) slot.classList.add('craft-queue-active');

    slot.onclick = () => showLetterPicker(i, container);
    queueRow.appendChild(slot);
  }

  section.appendChild(queueRow);
  container.appendChild(section);
}

// === 字母选择器弹窗 ===
function showLetterPicker(slotIndex: number, panelContainer: HTMLElement): void {
  // 移除已有选择器
  document.getElementById('letter-picker-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'letter-picker-modal';
  modal.className = 'letter-picker-modal';

  const overlay = document.createElement('div');
  overlay.className = 'letter-picker-overlay';
  overlay.onclick = () => modal.remove();
  modal.appendChild(overlay);

  const content = document.createElement('div');
  content.className = 'letter-picker-content';

  const pickerTitle = document.createElement('div');
  pickerTitle.className = 'letter-picker-title';
  pickerTitle.textContent = `队列位置 ${slotIndex + 1}`;
  content.appendChild(pickerTitle);

  const grid = document.createElement('div');
  grid.className = 'letter-picker-grid';

  // 26 字母 + 跳过
  const options = 'abcdefghijklmnopqrstuvwxyz_'.split('');
  for (const ch of options) {
    const btn = document.createElement('button');
    btn.className = 'letter-picker-btn';
    btn.textContent = ch === '_' ? '跳过' : ch.toUpperCase();
    if (ch === '_') btn.classList.add('letter-picker-skip');

    btn.onclick = () => {
      const newQueue = [...state.fragmentQueue];
      newQueue[slotIndex] = ch;
      setFragmentQueue(newQueue);
      modal.remove();
      // 重新渲染面板以反映变化
      if (cachedGoldUpdate) {
        renderCraftPanel(panelContainer, cachedGoldUpdate);
      }
    };

    grid.appendChild(btn);
  }

  content.appendChild(grid);
  modal.appendChild(content);
  document.body.appendChild(modal);
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

    // 点击添加到造词输入
    cell.onclick = () => {
      addLetterToWord(letter, container);
    };

    grid.appendChild(cell);
  }

  section.appendChild(grid);
  container.appendChild(section);
}

// === 添加字母到当前拼词 ===
function addLetterToWord(letter: string, panelContainer: HTMLElement): void {
  // 检查库存是否足够（计算已在输入中使用的数量）
  const usedCount = currentWordLetters.filter(l => l === letter).length;
  const available = Math.floor(state.fragmentInventory[letter] || 0) - usedCount;
  if (available <= 0) {
    showFeedback(`${letter.toUpperCase()} 碎片不足!`, '#ff6b6b');
    return;
  }
  currentWordLetters.push(letter);
  refreshWordBuilder(panelContainer);
}

// === 从当前拼词移除字母 ===
function removeLetterFromWord(index: number, panelContainer: HTMLElement): void {
  currentWordLetters.splice(index, 1);
  refreshWordBuilder(panelContainer);
}

// === 刷新造词输入区（重渲整个面板以同步库存和造词区） ===
function refreshWordBuilder(panelContainer: HTMLElement): void {
  if (!cachedGoldUpdate) return;
  renderCraftPanel(panelContainer, cachedGoldUpdate);
}

// === 造词输入区 + 消耗预览 ===
function renderWordBuilder(container: HTMLElement, onGoldUpdate: () => void): void {
  const section = document.createElement('div');
  section.className = 'craft-section craft-builder-section';

  const header = document.createElement('div');
  header.className = 'craft-section-header';
  header.textContent = '📝 造词';
  section.appendChild(header);

  // 当前拼词展示
  const wordRow = document.createElement('div');
  wordRow.className = 'craft-word-row';

  if (currentWordLetters.length === 0) {
    const placeholder = document.createElement('span');
    placeholder.className = 'craft-word-placeholder';
    placeholder.textContent = '点击上方碎片添加字母';
    wordRow.appendChild(placeholder);
  } else {
    for (let i = 0; i < currentWordLetters.length; i++) {
      const chip = document.createElement('span');
      chip.className = 'craft-word-chip';
      chip.textContent = currentWordLetters[i].toUpperCase();
      chip.title = '点击移除';
      chip.onclick = () => removeLetterFromWord(i, container);
      wordRow.appendChild(chip);
    }
  }
  section.appendChild(wordRow);

  // 消耗预览
  if (currentWordLetters.length > 0) {
    const { fragments, gold } = calculateCraftCost(currentWordLetters);
    const costRow = document.createElement('div');
    costRow.className = 'craft-cost-row';

    // 碎片消耗
    const fragCost = document.createElement('span');
    fragCost.className = 'craft-cost-fragments';
    fragCost.appendChild(document.createTextNode('消耗: '));
    const entries = Object.entries(fragments);
    for (let idx = 0; idx < entries.length; idx++) {
      const [letter, count] = entries[idx];
      const available = Math.floor(state.fragmentInventory[letter] || 0);
      const part = document.createElement('span');
      if (available < count) part.className = 'craft-cost-insufficient';
      part.textContent = `${letter.toUpperCase()}×${count}`;
      fragCost.appendChild(part);
      if (idx < entries.length - 1) fragCost.appendChild(document.createTextNode(' '));
    }
    costRow.appendChild(fragCost);

    // 金币消耗
    const goldCost = document.createElement('span');
    goldCost.className = 'craft-cost-gold';
    if (gold > state.gold) goldCost.classList.add('craft-cost-insufficient');
    const goldLabel = gold > 0 ? `💰 ${gold}g`
      : state.player.relics.has('resonance_mold') ? '💰 0g (共鸣字模)' : '💰 0g (无重复)';
    goldCost.textContent = goldLabel;
    costRow.appendChild(goldCost);

    section.appendChild(costRow);

    // 确认按钮
    const tooShort = currentWordLetters.length < MIN_WORD_LENGTH;
    const canCraft = !tooShort && hasEnoughFragments(fragments) && state.gold >= gold;
    const craftBtn = document.createElement('button');
    craftBtn.className = 'craft-confirm-btn';
    if (!canCraft) craftBtn.classList.add('craft-confirm-disabled');
    craftBtn.textContent = '确认造词';
    craftBtn.disabled = !canCraft;

    if (!canCraft) {
      const reason = tooShort ? `至少 ${MIN_WORD_LENGTH} 个字母`
        : !hasEnoughFragments(fragments) ? '碎片不足' : '金币不足';
      const hint = document.createElement('span');
      hint.className = 'craft-confirm-hint';
      hint.textContent = reason;
      section.appendChild(hint);
    }

    craftBtn.onclick = () => {
      if (!canCraft) return;
      const success = craftWord(currentWordLetters, onGoldUpdate);
      if (success) {
        currentWordLetters = [];
        renderCraftPanel(container, onGoldUpdate);
      }
    };
    section.appendChild(craftBtn);
  }

  container.appendChild(section);
}

// === 拆词剪刀：拆解已造词，返还 50% 碎片 ===
export function deconstructWord(word: string, onGoldUpdate: () => void): boolean {
  const idx = state.craftedWords.indexOf(word);
  if (idx === -1) return false;

  // 计算返还碎片（50% 向下取整）
  const { fragments } = calculateCraftCost(word.split(''));
  for (const [letter, count] of Object.entries(fragments)) {
    const refund = Math.floor(count * 0.5);
    if (refund > 0) {
      state.fragmentInventory[letter] = (state.fragmentInventory[letter] || 0) + refund;
    }
  }

  // 从 craftedWords 移除
  state.craftedWords.splice(idx, 1);

  // 从 wordDeck 移除（仅移除第一个匹配）
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
      btn.title = '拆解（返还50%碎片）';
      btn.onclick = (e) => {
        e.stopPropagation();
        if (cachedGoldUpdate) {
          deconstructWord(word, cachedGoldUpdate);
          renderCraftPanel(container, cachedGoldUpdate);
        }
      };
      tag.appendChild(btn);
    }

    list.appendChild(tag);
  }

  section.appendChild(list);
  container.appendChild(section);
}

// === 重置造词输入（商店关闭时清理） ===
export function resetCraftInput(): void {
  currentWordLetters = [];
  cachedGoldUpdate = null;
}
