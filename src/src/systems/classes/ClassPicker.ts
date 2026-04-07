// ============================================
// 打字肉鸽 - 职业选择界面
// ============================================
// Story 32.1 Task 4: 职业选择 UI（DOM 模态框模式）

import type { ClassId } from '../../core/types';
import type { ClassDefinition } from '../../data/classes';
import { CLASS_DEFINITIONS, getSelectableClassIds } from '../../data/classes';
import { classManager } from './ClassManager';
import type { MetaState } from '../../core/state/MetaState';
import { RESOURCE_LABELS, RESOURCE_ICONS } from '../../core/constants';
import { t } from '../../demo/demo-i18n';
import { playSound } from '../../effects/sound';

/**
 * 显示职业选择界面
 * @param metaState MetaState 实例，用于检查职业解锁状态
 * @param onComplete 选择完成后的回调
 */
export function showClassPicker(metaState: MetaState, onComplete: () => void): void {
  const modal = document.getElementById('class-select-modal');
  const cardsEl = document.getElementById('class-select-cards');
  const confirmBtn = document.getElementById('class-select-confirm');

  if (!modal || !cardsEl || !confirmBtn) {
    // 无 DOM 元素（测试环境等），直接跳过
    onComplete();
    return;
  }

  let selectedClassId: ClassId | null = null;
  let completed = false;

  const finish = () => {
    if (completed) return;
    completed = true;

    if (selectedClassId) {
      classManager.selectClass(selectedClassId);
    }

    closeClassPicker();
    onComplete();
  };

  cardsEl.innerHTML = '';

  // 可选择的职业卡片
  const selectableIds = getSelectableClassIds();
  const allIds: ClassId[] = [...selectableIds, 'none'];

  allIds.forEach(classId => {
    const def = CLASS_DEFINITIONS[classId];
    if (!def) return;

    const isUnlocked = metaState.isClassUnlocked(classId);
    const card = createClassCard(def, isUnlocked);

    if (isUnlocked) {
      card.onclick = () => {
        playSound('type');
        // 取消之前的选中
        cardsEl.querySelectorAll('.class-select-card').forEach(c =>
          c.classList.remove('class-card-selected')
        );
        card.classList.add('class-card-selected');
        selectedClassId = classId;

        // 显示确认按钮
        confirmBtn.classList.remove('class-select-confirm-hidden');
        const className = t(`class.${classId}.name`) !== `class.${classId}.name` ? t(`class.${classId}.name`) : def.name;
        confirmBtn.textContent = classId === 'none'
          ? t('class_select.start_no_class')
          : `${t('class_select.confirm')} ${className}`;
      };
    }

    cardsEl.appendChild(card);
  });

  // 确认按钮
  confirmBtn.onclick = () => {
    if (selectedClassId !== null) {
      playSound('levelup');
      finish();
    }
  };

  // 显示模态框
  modal.classList.remove('class-select-hidden');
  confirmBtn.classList.add('class-select-confirm-hidden');
}

/**
 * 创建职业卡片 DOM 元素（使用 DOM API 避免 innerHTML XSS 风险）
 */
function createClassCard(def: ClassDefinition, isUnlocked: boolean): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'class-select-card';

  if (!isUnlocked) {
    card.classList.add('class-card-locked');
  }

  const iconEl = document.createElement('div');
  iconEl.className = 'class-card-icon';
  iconEl.textContent = def.icon;
  card.appendChild(iconEl);

  const nameEl = document.createElement('div');
  nameEl.className = 'class-card-name';
  nameEl.textContent = t(`class.${def.id}.name`) !== `class.${def.id}.name` ? t(`class.${def.id}.name`) : def.name;
  card.appendChild(nameEl);

  const descEl = document.createElement('div');
  descEl.className = 'class-card-desc';
  descEl.textContent = t(`class.${def.id}.desc`) !== `class.${def.id}.desc` ? t(`class.${def.id}.desc`) : def.description;
  card.appendChild(descEl);

  if (def.id !== 'none') {
    const infoEl = document.createElement('div');
    infoEl.className = 'class-card-info';
    let hasInfo = false;

    if (def.uniqueResource) {
      const span = document.createElement('span');
      span.className = 'info-resource';
      const resIcon = RESOURCE_ICONS[def.uniqueResource] || '';
      const resKey = `resource.${def.uniqueResource}`;
      const resLabel = t(resKey) !== resKey ? t(resKey) : (RESOURCE_LABELS[def.uniqueResource] || def.uniqueResource);
      span.textContent = `${t('class_select.resource') !== 'class_select.resource' ? t('class_select.resource') : '资源'}: ${resIcon} ${resLabel}`;
      infoEl.appendChild(span);
      hasInfo = true;
    }
    if (def.loseDescription) {
      if (hasInfo) infoEl.appendChild(document.createElement('br'));
      const span = document.createElement('span');
      span.className = 'info-lose';
      const loseText = t(`class.${def.id}.lose`) !== `class.${def.id}.lose` ? t(`class.${def.id}.lose`) : def.loseDescription;
      span.textContent = `⚠ ${loseText}`;
      infoEl.appendChild(span);
      hasInfo = true;
    }
    if (def.starterRelic) {
      if (hasInfo) infoEl.appendChild(document.createElement('br'));
      const span = document.createElement('span');
      span.className = 'info-relic';
      span.textContent = t('class_select.starter_relic') !== 'class_select.starter_relic' ? `🏺 ${t('class_select.starter_relic')}` : '🏺 初始遗物';
      infoEl.appendChild(span);
      hasInfo = true;
    }

    if (hasInfo) card.appendChild(infoEl);
  }

  if (!isUnlocked) {
    const lockEl = document.createElement('div');
    lockEl.className = 'class-card-lock-text';
    const lockKey = `class_select.lock_${def.id}`;
    const lockText = t(lockKey) !== lockKey ? t(lockKey) : (def.id === 'wordsmith' ? '🔒 通关一次解锁' : def.id === 'metamorph' ? '🔒 用造词师通关一次解锁' : '🔒 未解锁');
    lockEl.textContent = lockText;
    card.appendChild(lockEl);
  }

  return card;
}

/**
 * 关闭职业选择模态框
 */
function closeClassPicker(): void {
  const modal = document.getElementById('class-select-modal');
  if (modal) modal.classList.add('class-select-hidden');
}
