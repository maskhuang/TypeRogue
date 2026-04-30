// ============================================
// Workbench Shape Placement Preview + Rotation
// ============================================
// Story 60.1: 多格技能形状绑定 + 范围预览（新工作台版）
// 选择器目标 .kb-key.kb-tier-1[data-key]，与 systems/shop.ts:3883 的 .key-slot
// 版本平行存在；旧 classic shop 仍由 systems/shop.ts 负责。

import { state } from '../core/state';
import { KEYS, INBOX_MAX, PUNCTUATION_KEYS } from '../core/constants';
import { mapShapeToKeys, getShapeRotationCount } from '../data/skillShapes';
import { calculateLetterFrequency, FREQ_UNLOCK_THRESHOLD } from '../systems/letters/LetterFrequencySystem';
import {
  bindShapeToKeys,
  unbindSkill,
  getBindingState,
  getSkillAnchorKey,
  type BindShapeResult,
} from '../systems/bindingManager';
import type { DragPayload } from '../systems/dragManager';
import { playSound } from '../effects/sound';

// ===== Story 60.1: 纯状态变更接口（无 DOM） =====
// shopPreview.ts 的 bindSkillToKey / unbindSkillFromKey 两个 wrapper 调用这些，
// 测试也直接验证这两个函数。

/**
 * 把 IN-tray 中的 skillId 绑定到 key（多格走 bindShapeToKeys，单格也走）。
 * 处理 displaced 技能回 inbox + 失败回退。返回原始 BindShapeResult 供调用方观察。
 */
export function applyBindFromInbox(skillId: string, key: string): BindShapeResult {
  const bs = getBindingState(state);
  const inboxIdx = state.player.inbox.indexOf(skillId);
  if (inboxIdx >= 0) state.player.inbox.splice(inboxIdx, 1);

  const result = bindShapeToKeys(bs, skillId, key);
  if (!result.success) {
    if (state.player.inbox.length < INBOX_MAX) state.player.inbox.push(skillId);
    return result;
  }
  for (const dId of result.displacedSkillIds) {
    if (
      state.player.inbox.length < INBOX_MAX &&
      state.player.inbox.indexOf(dId) < 0
    ) {
      state.player.inbox.push(dId);
    }
  }
  return result;
}

/**
 * 卸下指定键所属技能（多格的话整个形状全卸）。
 * @returns 卸下的 skillId（未绑定时返回 undefined）
 */
export function applyUnbindKeyToInbox(key: string): string | undefined {
  const skillId = state.player.bindings.get(key);
  if (!skillId) return undefined;
  const bs = getBindingState(state);
  unbindSkill(bs, skillId);
  if (
    state.player.inbox.length < INBOX_MAX &&
    state.player.inbox.indexOf(skillId) < 0
  ) {
    state.player.inbox.push(skillId);
  }
  return skillId;
}

const HL_VALID = 'shape-preview-valid';
const HL_INVALID = 'shape-preview-invalid';
const HL_DISPLACED = 'shape-preview-displaced';

function workbenchKey(key: string): HTMLElement | null {
  // CSS attribute selector — anchorKey 已经被 KEYS.includes 校验过
  return document.querySelector(
    `#workbench-screen-preview .kb-key.kb-tier-1[data-key="${key}"]`,
  ) as HTMLElement | null;
}

/**
 * 拖拽悬停时高亮形状覆盖的全部键位。
 * - monomino: 仅高亮 anchor 单键（绿章 valid，被覆盖时叠加 displaced）
 * - 多格 shape: 走 mapShapeToKeys 计算覆盖范围，全键位高亮
 *
 * 不再依赖 dragManager 的 .drop-zone-highlight 荧光蓝 — 工作台所有 hover 状态都用 paper-craft 油墨色。
 */
// Story 60.20 dogfood: 共享 freq-lock 判定（与 shopWorkbench.isKeyFreqLocked 同算法）—
// shapePreview 在更深层级，避免循环依赖故内联实现，同算法即可。
function isKeyFreqLocked(key: string, letterFreqs: Map<string, number>): boolean {
  const k = key.toLowerCase();
  if (PUNCTUATION_KEYS.includes(k)) {
    return !state.player.relics.has('punctuation_liberation');
  }
  return (letterFreqs.get(k) ?? 0) < FREQ_UNLOCK_THRESHOLD;
}

export function highlightShapePlacementOnWorkbench(
  anchorKey: string,
  payload: DragPayload,
): void {
  clearShapePlacementOnWorkbench();

  const normalizedKey = anchorKey.toLowerCase();
  if (!KEYS.includes(normalizedKey)) return;

  const shapeId = payload.shapeId ?? 'monomino';
  const rotation = payload.rotation ?? 0;
  const dragSkillId = payload.skillId;
  const letterFreqs = calculateLetterFrequency(state.player.wordDeck);

  // Monomino: 单键直接高亮
  if (!shapeId || shapeId === 'monomino') {
    const slot = workbenchKey(normalizedKey);
    if (!slot) return;
    if (isKeyFreqLocked(normalizedKey, letterFreqs)) {
      slot.classList.add(HL_INVALID);
      return;
    }
    slot.classList.add(HL_VALID);
    const existing = state.player.bindings.get(normalizedKey);
    if (existing && existing !== dragSkillId) {
      slot.classList.add(HL_DISPLACED);
    }
    return;
  }

  // 多格 shape: 用 mapShapeToKeys 计算
  const allowPunct = state.player.relics.has('punctuation_liberation');
  const targetKeys = mapShapeToKeys(normalizedKey, shapeId, rotation, allowPunct);

  if (!targetKeys) {
    const slot = workbenchKey(normalizedKey);
    if (slot) slot.classList.add(HL_INVALID);
    return;
  }

  // 多格任一格锁定 → 整组都标 invalid（统一拒收语义）
  const anyLocked = targetKeys.some(k => isKeyFreqLocked(k, letterFreqs));
  if (anyLocked) {
    for (const key of targetKeys) {
      const slot = workbenchKey(key);
      if (slot) slot.classList.add(HL_INVALID);
    }
    return;
  }

  for (const key of targetKeys) {
    const slot = workbenchKey(key);
    if (!slot) continue;
    slot.classList.add(HL_VALID);
    const existing = state.player.bindings.get(key);
    if (existing && existing !== dragSkillId) {
      slot.classList.add(HL_DISPLACED);
    }
  }
}

export function clearShapePlacementOnWorkbench(): void {
  const wb = document.getElementById('workbench-screen-preview');
  if (!wb) return;
  wb.querySelectorAll(`.${HL_VALID}, .${HL_INVALID}, .${HL_DISPLACED}`)
    .forEach(el => el.classList.remove(HL_VALID, HL_INVALID, HL_DISPLACED));
}

/**
 * 右键旋转工作台上已绑定的多格技能。算法骨架与 systems/shop.ts:3929
 * handleKeySlotRotation 一致：
 *   1. 取 affixSkill 的 shapeId / 当前 rotation
 *   2. 按 step 顺/逆遍历后续旋转态
 *   3. 第一个 mapShapeToKeys 非 null 的 → 解绑 → 改 rotation → 重新 bindShapeToKeys
 *   4. 旋转可能 displace 相邻技能 — 必须把 displaced skillIds 推回 inbox（不然永久丢失）
 *   5. 全部放不下 → 抖动 + 失败音效
 *
 * 调用方需在旋转后调用 syncWorkbenchKeys()（键盘渲染）+ syncWorkbenchInbox()（IN-tray 显示
 * 新进 inbox 的 displaced 技能）。
 */
export function handleWorkbenchKeyRotation(
  key: string,
  reverse: boolean,
  syncKeys: () => void,
  syncInbox: () => void,
): void {
  const bs = getBindingState(state);
  const skillId = state.player.bindings.get(key);
  if (!skillId) return;

  const affixSkill = state.affixSkills.get(skillId);
  if (!affixSkill) return;

  const shapeId = affixSkill.shapeId ?? 'monomino';
  if (shapeId === 'monomino') return;

  const anchorKey = getSkillAnchorKey(bs, skillId);
  if (!anchorKey) return;

  const currentRotation = affixSkill.rotation ?? 0;
  const maxRot = getShapeRotationCount(shapeId);
  const step = reverse ? maxRot - 1 : 1;
  const allowPunct = state.player.relics.has('punctuation_liberation');

  let nextRotation = -1;
  for (let attempt = 1; attempt < maxRot; attempt++) {
    const candidate = (currentRotation + step * attempt) % maxRot;
    const probe = mapShapeToKeys(anchorKey, shapeId, candidate, allowPunct);
    if (probe) {
      nextRotation = candidate;
      break;
    }
  }

  if (nextRotation === -1) {
    playSound('wrong');
    const occupied = [...state.player.bindings.entries()]
      .filter(([, id]) => id === skillId)
      .map(([k]) => k);
    for (const k of occupied) {
      const el = workbenchKey(k);
      if (el) {
        el.classList.add('shape-shake');
        el.addEventListener('animationend', () => el.classList.remove('shape-shake'), { once: true });
      }
    }
    return;
  }

  unbindSkill(bs, skillId);
  affixSkill.rotation = nextRotation;
  const result = bindShapeToKeys(bs, skillId, anchorKey, allowPunct);

  if (!result.success) {
    affixSkill.rotation = currentRotation;
    bindShapeToKeys(bs, skillId, anchorKey, allowPunct);
    playSound('wrong');
    return;
  }

  // 把被覆盖的技能推回 IN-tray（容量内）— 否则旋转会永久丢失相邻技能
  let displacedAny = false;
  for (const dId of result.displacedSkillIds) {
    if (
      state.player.inbox.length < INBOX_MAX &&
      state.player.inbox.indexOf(dId) < 0
    ) {
      state.player.inbox.push(dId);
      displacedAny = true;
    }
  }

  syncKeys();
  if (displacedAny) syncInbox();

  const newKeys = [...state.player.bindings.entries()]
    .filter(([, id]) => id === skillId)
    .map(([k]) => k);
  for (const k of newKeys) {
    const el = workbenchKey(k);
    if (el) {
      el.classList.add('shape-rotating');
      el.addEventListener('animationend', () => el.classList.remove('shape-rotating'), { once: true });
    }
  }
}
