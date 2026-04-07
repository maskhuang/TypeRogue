// ============================================
// 打字肉鸽 - Ascension 级别选择器
// ============================================
// Story 54.3: 职业选择后弹出，选择本局 Ascension 难度

import { state } from '../../core/state';
import { MAX_ASCENSION_LEVEL } from '../../core/state/MetaState';
import type { MetaState } from '../../core/state/MetaState';
import { t } from '../../demo/demo-i18n';
import { playSound } from '../../effects/sound';

/**
 * 显示 Ascension 级别选择器
 * 仅当 maxAscension >= 1 时显示；否则直接跳过（A0）
 */
export function showAscensionPicker(metaState: MetaState, classId: string, onComplete: () => void): void {
  const maxAscension = metaState.getAscension(classId);

  // 未解锁任何 Ascension → 跳过
  if (maxAscension <= 0) {
    state.ascensionLevel = 0;
    onComplete();
    return;
  }

  const modal = document.getElementById('ascension-select-modal');
  const listEl = document.getElementById('ascension-select-list');
  const confirmBtn = document.getElementById('ascension-select-confirm') as HTMLButtonElement | null;
  const titleEl = document.getElementById('ascension-select-title');

  if (!modal || !listEl || !confirmBtn) {
    state.ascensionLevel = 0;
    onComplete();
    return;
  }

  // 默认选中最高已解锁级别
  let selectedLevel = maxAscension;

  if (titleEl) titleEl.textContent = t('ascension.title');
  confirmBtn.textContent = t('ascension.confirm', { level: selectedLevel });

  listEl.innerHTML = '';

  // 渲染 A0 ~ A(maxAscension) 行
  for (let level = 0; level <= MAX_ASCENSION_LEVEL; level++) {
    const unlocked = level <= maxAscension;
    const row = document.createElement('div');
    row.className = 'ascension-row';
    if (!unlocked) row.classList.add('ascension-locked');
    if (level === selectedLevel) row.classList.add('ascension-selected');

    const levelEl = document.createElement('span');
    levelEl.className = 'ascension-level';
    levelEl.textContent = level === 0 ? 'A0' : `A${level}`;

    const nameEl = document.createElement('span');
    nameEl.className = 'ascension-name';
    nameEl.textContent = level === 0 ? t('ascension.a0_name') : t(`ascension.a${level}_name`);

    const descEl = document.createElement('span');
    descEl.className = 'ascension-desc';
    descEl.textContent = level === 0 ? t('ascension.a0_desc') : t(`ascension.a${level}_desc`);

    row.appendChild(levelEl);
    row.appendChild(nameEl);
    row.appendChild(descEl);

    if (unlocked) {
      row.onclick = () => {
        playSound('click');
        selectedLevel = level;
        listEl.querySelectorAll('.ascension-row').forEach(r => r.classList.remove('ascension-selected'));
        row.classList.add('ascension-selected');
        confirmBtn!.textContent = t('ascension.confirm', { level: selectedLevel });
      };
    }

    listEl.appendChild(row);
  }

  confirmBtn.onclick = () => {
    playSound('confirm');
    state.ascensionLevel = selectedLevel;
    modal.classList.add('ascension-select-hidden');
    onComplete();
  };

  modal.classList.remove('ascension-select-hidden');
}
