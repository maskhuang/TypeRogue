// ============================================
// 打字肉鸽 - 职业选择界面
// ============================================
// Stage 3 · 桌面化 duty-roster 实现（2026-05）
//   原 card-grid + 确认按钮 → 一张「值班表」纸 + 三行 + 键入字母 + Enter 签到 + 红章 ASSIGNED
//   key→classId 映射：W→wordsmith, M→metamorph, N→none
// 兼容性：保留 #class-select-modal 容器 ID 和 #class-select-cards 容器 ID。
//   已锁定的职业渲染为 `▓▓▓▓-▓▓▓▓ · OCCUPIED`，不可签字。

import type { ClassId } from '../../core/types';
import type { ClassDefinition } from '../../data/classes';
import { CLASS_DEFINITIONS, getSelectableClassIds } from '../../data/classes';
import { classManager } from './ClassManager';
import type { MetaState } from '../../core/state/MetaState';
import { t } from '../../demo/demo-i18n';
import { playDeskSound } from '../../effects/sound';

// classId → 单字符键映射（与 duty roster 一致）
const KEY_FOR_CLASS: Record<ClassId, string> = {
  wordsmith: 'W',
  metamorph: 'M',
  none: 'N',
};

// 工号读取（与主菜单打卡共用 localStorage key）
const WORKER_ID_STORAGE_KEY = 'dpca-worker-id';
const DEFAULT_WORKER_ID = 'OP. PRIMATE-7842';
function getWorkerId(): string {
  try {
    return localStorage.getItem(WORKER_ID_STORAGE_KEY) || DEFAULT_WORKER_ID;
  } catch {
    return DEFAULT_WORKER_ID;
  }
}

/**
 * 显示职业选择界面（duty-roster 桌面版）
 */
export function showClassPicker(metaState: MetaState, onComplete: () => void): void {
  const modal = document.getElementById('class-select-modal');
  const listEl = document.getElementById('class-select-cards');
  const inputEl = document.getElementById('class-roster-input') as HTMLInputElement | null;
  const stampEl = document.getElementById('class-stamp-mark');

  if (!modal || !listEl || !inputEl || !stampEl) {
    // DOM 缺失（测试环境等）→ 直接进默认 none 职业
    onComplete();
    return;
  }

  let selectedClassId: ClassId | null = null;
  let completed = false;

  const finish = () => {
    if (completed) return;
    completed = true;
    if (selectedClassId) {
      // Stage 4 · skipStarter: 让 starter relic 通过申领单签发，而非默默自动入库
      classManager.selectClass(selectedClassId, { skipStarter: true });
    }
    closeClassPicker();
    onComplete();
  };

  // 渲染三行
  listEl.innerHTML = '';
  const allIds: ClassId[] = [...getSelectableClassIds(), 'none'];
  allIds.forEach(classId => {
    const def = CLASS_DEFINITIONS[classId];
    if (!def) return;
    const isUnlocked = metaState.isClassUnlocked(classId);
    const row = createRosterRow(def, isUnlocked);
    if (isUnlocked) {
      row.addEventListener('click', () => {
        playDeskSound('paper');
        if (inputEl.value.toUpperCase() === KEY_FOR_CLASS[classId]) return;
        inputEl.value = KEY_FOR_CLASS[classId];
        inputEl.dispatchEvent(new Event('input'));
      });
    }
    listEl.appendChild(row);
  });

  // 输入：高亮对应行
  const onInput = () => {
    const v = inputEl.value.toUpperCase();
    listEl.querySelectorAll<HTMLElement>('.roster-row').forEach(r => r.classList.remove('active'));
    if (!v) return;
    const row = listEl.querySelector<HTMLElement>(`.roster-row[data-key="${v}"]`);
    if (row && !row.classList.contains('locked')) row.classList.add('active');
  };
  inputEl.addEventListener('input', onInput);

  // Enter：签字 + 盖章
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = inputEl.value.toUpperCase();
    const row = listEl.querySelector<HTMLElement>(`.roster-row[data-key="${v}"]`);
    if (!row) return;
    if (row.classList.contains('locked')) return;
    const classId = row.dataset.classId as ClassId | undefined;
    if (!classId) return;
    selectedClassId = classId;
    inputEl.disabled = true;

    // 签字动画（用打卡时输入的工号逐字打）
    const sigEl = row.querySelector<HTMLElement>('.sig-line');
    if (sigEl) {
      playDeskSound('pen');
      typeWriter(sigEl, getWorkerId(), 50);
    }

    // 盖章
    setTimeout(() => {
      playDeskSound('stamp');
      stampEl.classList.add('show');
      setTimeout(() => {
        stampEl.classList.remove('show');
        // 场景切换：气动管道 whoosh
        playDeskSound('whoosh');
        finish();
      }, 950);
    }, 700);
  };
  inputEl.addEventListener('keydown', onKeydown);

  // 显示模态框 + 自动聚焦输入框
  modal.classList.remove('class-select-hidden');
  setTimeout(() => inputEl.focus(), 80);
}

function createRosterRow(def: ClassDefinition, isUnlocked: boolean): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'roster-row';
  row.dataset.classId = def.id;
  row.dataset.key = KEY_FOR_CLASS[def.id];
  if (!isUnlocked) row.classList.add('locked');

  const keyEl = document.createElement('div');
  keyEl.className = 'key';
  keyEl.textContent = KEY_FOR_CLASS[def.id];
  row.appendChild(keyEl);

  const roleEl = document.createElement('div');
  roleEl.className = 'role';
  // 区域代号（语言中性）+ 中区名 + 英区名 + 原岗位名（alt label）
  // CSS 通过 html[lang] 选择性显示中/英区名（保持双语数据完整，按 locale 切显示）
  const codeEl = document.createElement('div');
  codeEl.className = 'sec-code';
  codeEl.textContent = def.zoneCode;
  roleEl.appendChild(codeEl);

  const zhEl = document.createElement('div');
  zhEl.className = 'section-zh';
  zhEl.textContent = def.sectionZh;
  roleEl.appendChild(zhEl);

  const enEl = document.createElement('div');
  enEl.className = 'section-en';
  enEl.textContent = def.sectionEn;
  roleEl.appendChild(enEl);

  // 原岗位名（locale-aware via t()）作独立行 alt label
  const alt = t(`class.${def.id}.name`);
  const altText = alt !== `class.${def.id}.name` ? alt : def.name;
  if (altText && altText !== def.sectionZh && altText !== def.sectionEn) {
    const altEl = document.createElement('div');
    altEl.className = 'alt-name';
    altEl.textContent = `(${altText})`;
    roleEl.appendChild(altEl);
  }

  row.appendChild(roleEl);

  const sigEl = document.createElement('div');
  sigEl.className = 'sig-line';
  sigEl.textContent = isUnlocked ? '' : '▓▓▓▓-▓▓▓▓ · OCCUPIED';
  row.appendChild(sigEl);

  const clrEl = document.createElement('div');
  clrEl.className = 'clr';
  clrEl.textContent = def.clearance;
  row.appendChild(clrEl);

  return row;
}

function typeWriter(el: HTMLElement, text: string, speed: number): void {
  el.textContent = '';
  let i = 0;
  const id = setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(id);
  }, speed);
}

function closeClassPicker(): void {
  const modal = document.getElementById('class-select-modal');
  if (modal) modal.classList.add('class-select-hidden');
  // 重置输入状态以便下次打开
  const inputEl = document.getElementById('class-roster-input') as HTMLInputElement | null;
  if (inputEl) {
    inputEl.disabled = false;
    inputEl.value = '';
  }
}
