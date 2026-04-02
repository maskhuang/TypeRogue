// ============================================
// 打字肉鸽 - 造词师词语组装流水线
// ============================================
// Epic 44: 碎片放入流水线，能量推进进度，组装完成加入词库

import { state } from '../../core/state';
import type { AssemblyPipeline, AssemblySlot } from '../../core/types';

// === 常量 ===

/** 每个槽位需要的能量（基础值，遗物可修正） */
export const ENERGY_PER_SLOT = 5;

/** 流水线最大长度（防止超长词） */
export const MAX_PIPELINE_LENGTH = 12;

/** 获取有效能量需求/槽位（应用遗物修正） */
export function getEffectiveEnergyPerSlot(letter?: string, targetWord?: string): number {
  let eps = ENERGY_PER_SLOT;
  // 大师词典：能量需求-20%
  if (state.player.relics.has('masters_lexicon')) {
    eps *= 0.8;
  }
  // 共鸣字模：重复字母槽位能量需求-50%
  if (letter && targetWord && state.player.relics.has('resonance_mold')) {
    const count = targetWord.split('').filter(ch => ch === letter).length;
    if (count >= 2) eps *= 0.5;
  }
  return eps;
}

// === 流水线操作 ===

/**
 * 创建组装流水线：检查碎片库存并消耗，生成槽位。
 * 副作用：修改传入的 fragmentInventory（扣除消耗的碎片）。
 * @returns 流水线实例，碎片不足或词太长时返回 null（不消耗）
 */
export function createPipeline(
  word: string,
  fragmentInventory: Record<string, number>,
): AssemblyPipeline | null {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length < 2 || w.length > MAX_PIPELINE_LENGTH) return null;

  // 检查碎片是否足够
  const needed: Record<string, number> = {};
  for (const ch of w) {
    needed[ch] = (needed[ch] ?? 0) + 1;
  }
  for (const [letter, count] of Object.entries(needed)) {
    if ((fragmentInventory[letter] ?? 0) < count) return null;
  }

  // 消耗碎片
  for (const [letter, count] of Object.entries(needed)) {
    fragmentInventory[letter] = (fragmentInventory[letter] ?? 0) - count;
  }

  // 创建槽位
  const slots: AssemblySlot[] = w.split('').map(letter => ({
    letter,
    progress: 0,
    completed: false,
  }));

  return { slots, targetWord: w };
}

/**
 * 推进流水线：能量从左到右填充槽位。
 * @param energyPerSlot 每槽位能量需求（可被遗物修正）
 * @returns 更新后的流水线 + 是否完成 + 剩余能量
 */
export function advancePipeline(
  pipeline: AssemblyPipeline,
  energy: number,
  energyPerSlot: number = ENERGY_PER_SLOT,
): { pipeline: AssemblyPipeline; completed: boolean; remainingEnergy: number } {
  let remaining = energy;

  for (const slot of pipeline.slots) {
    if (slot.completed) continue;
    if (remaining <= 0) break;

    const needed = (1 - slot.progress) * energyPerSlot;
    if (remaining >= needed) {
      slot.progress = 1;
      slot.completed = true;
      remaining -= needed;
    } else {
      slot.progress += remaining / energyPerSlot;
      remaining = 0;
    }
  }

  const completed = pipeline.slots.every(s => s.completed);
  return { pipeline, completed, remainingEnergy: remaining };
}

/**
 * 遗物感知版推进：每个槽位使用 getEffectiveEnergyPerSlot 计算能量需求。
 */
function advancePipelineWithRelics(
  pipeline: AssemblyPipeline,
  energy: number,
): { pipeline: AssemblyPipeline; completed: boolean; remainingEnergy: number } {
  let remaining = energy;

  for (const slot of pipeline.slots) {
    if (slot.completed) continue;
    if (remaining <= 0) break;

    const eps = getEffectiveEnergyPerSlot(slot.letter, pipeline.targetWord);
    const needed = (1 - slot.progress) * eps;
    if (remaining >= needed) {
      slot.progress = 1;
      slot.completed = true;
      remaining -= needed;
    } else {
      slot.progress += remaining / eps;
      remaining = 0;
    }
  }

  const completed = pipeline.slots.every(s => s.completed);
  return { pipeline, completed, remainingEnergy: remaining };
}

// === 状态操作 ===

/**
 * 能量路由入口：将能量注入当前流水线。
 * 替代旧版 routeFragmentsToInventory（造词师专用）。
 * 完成时自动将词加入 wordDeck + craftedWords。
 */
export function routeEnergyToPipeline(energy: number): void {
  if (!state.assemblyPipeline) return;

  const result = advancePipelineWithRelics(state.assemblyPipeline, energy);
  state.assemblyPipeline = result.pipeline;

  if (result.completed) {
    const word = result.pipeline.targetWord;
    // 加入词库
    if (!state.player.wordDeck.includes(word)) {
      state.player.wordDeck.push(word);
    }
    // 记录已造词
    if (!state.craftedWords.includes(word)) {
      state.craftedWords.push(word);
    }
    // 清空流水线
    state.assemblyPipeline = null;
    // 返回完成的词供调用方处理反馈
    _lastCompletedWord = word;
  }
}

/** 上次完成的词（供调用方读取后清零） */
let _lastCompletedWord: string | null = null;

/** 获取并清除上次完成的词 */
export function consumeCompletedWord(): string | null {
  const w = _lastCompletedWord;
  _lastCompletedWord = null;
  return w;
}

/** 战斗 HUD 流水线进度更新（纯 DOM API，无 innerHTML） */
export function updatePipelineHUD(): void {
  const el = document.getElementById('pipeline-hud');
  if (!el) return;

  const pipeline = state.assemblyPipeline;
  if (!pipeline) {
    el.textContent = '';
    el.style.display = 'none';
    return;
  }

  el.style.display = '';
  el.textContent = '';
  for (const slot of pipeline.slots) {
    const span = document.createElement('span');
    if (slot.completed) {
      span.className = 'ph-done';
      span.textContent = `${slot.letter.toUpperCase()}✓`;
    } else if (slot.progress > 0) {
      span.className = 'ph-active';
      span.textContent = `${slot.letter.toUpperCase()}▶`;
    } else {
      span.className = 'ph-pending';
      span.textContent = slot.letter.toUpperCase();
    }
    el.appendChild(span);
  }
}
