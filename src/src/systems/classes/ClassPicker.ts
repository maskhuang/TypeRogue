// ============================================
// 打字肉鸽 - 职业选择界面
// ============================================
// 5 段身份阶梯 duty-roster（narrative §2.16 / §4.3 LOCKED）
//   录入者(R) → 接入 `none` 职业 · 唯一可签字
//   校对者(P) / 修改者(M) / 作者(A) / 猴子(K) → 仅 roster 占位 · 永远 OCCUPIED
//   wordsmith / metamorph 数据层保留，但不再在 duty roster 显示
// 兼容性：保留 #class-select-modal 容器 ID 和 #class-select-cards 容器 ID

import type { ClassId } from '../../core/types';
import { classManager } from './ClassManager';
import type { MetaState } from '../../core/state/MetaState';
import { t } from '../../demo/demo-i18n';
import { playDeskSound } from '../../effects/sound';

// 5 段身份阶梯 · roster 显示定义（narrative §4.3 5段身份阶梯）
//   首项 录入者 是唯一可签字项（hooks to `none`）· 其余 4 项 LOCKED 占位
interface RosterRowDef {
  /** 行 dataset 标识 · 录入者用 'operator'，其余占位用 narrative-stage id */
  rowId: string;
  /** 单字符键入字符 */
  key: string;
  /** 引擎实际职业 ID（仅 operator 项填 `none`，占位项 null） */
  engineClassId: ClassId | null;
  zoneCode: string;
  sectionZh: string;
  sectionEn: string;
  clearance: string;
}
const ROSTER_LAYOUT: RosterRowDef[] = [
  { rowId: 'operator',    key: 'R', engineClassId: 'none', zoneCode: 'OPR-1-A', sectionZh: '录入区',   sectionEn: 'DATA ENTRY',    clearance: 'CLR 1-A' },
  { rowId: 'proofreader', key: 'P', engineClassId: null,   zoneCode: 'PRF-2-B', sectionZh: '校对台',   sectionEn: 'PROOFREADING',  clearance: 'CLR 2-B' },
  { rowId: 'modifier',    key: 'M', engineClassId: null,   zoneCode: 'MOD-3-A', sectionZh: '修改区',   sectionEn: 'REVISION',      clearance: 'CLR 3-A' },
  { rowId: 'author',      key: 'A', engineClassId: null,   zoneCode: 'AUT-4-A', sectionZh: '作者室',   sectionEn: 'AUTHORSHIP',    clearance: 'CLR 4-A' },
  { rowId: 'monkey',      key: 'K', engineClassId: null,   zoneCode: 'MNK-?-?', sectionZh: '猴群坐席', sectionEn: 'MONKEY DESK',   clearance: 'CLR —' },
];

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

  // 渲染 5 行身份阶梯 · 录入者(R) 接入 `none` · 其余 4 行 LOCKED 占位
  listEl.innerHTML = '';
  ROSTER_LAYOUT.forEach(layout => {
    const isUnlockable = layout.engineClassId !== null
      && metaState.isClassUnlocked(layout.engineClassId);
    const row = createRosterRow(layout, isUnlockable);
    if (isUnlockable) {
      row.addEventListener('click', () => {
        playDeskSound('paper');
        if (inputEl.value.toUpperCase() === layout.key) return;
        inputEl.value = layout.key;
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
    // dataset.engineClassId 仅设在可签字行（录入者 → 'none'）
    const classId = row.dataset.engineClassId as ClassId | undefined;
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

function createRosterRow(layout: RosterRowDef, isUnlocked: boolean): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'roster-row';
  row.dataset.rowId = layout.rowId;
  row.dataset.key = layout.key;
  if (layout.engineClassId) row.dataset.engineClassId = layout.engineClassId;
  if (!isUnlocked) row.classList.add('locked');

  const keyEl = document.createElement('div');
  keyEl.className = 'key';
  keyEl.textContent = layout.key;
  row.appendChild(keyEl);

  const roleEl = document.createElement('div');
  roleEl.className = 'role';
  const codeEl = document.createElement('div');
  codeEl.className = 'sec-code';
  codeEl.textContent = layout.zoneCode;
  roleEl.appendChild(codeEl);

  const zhEl = document.createElement('div');
  zhEl.className = 'section-zh';
  zhEl.textContent = layout.sectionZh;
  roleEl.appendChild(zhEl);

  const enEl = document.createElement('div');
  enEl.className = 'section-en';
  enEl.textContent = layout.sectionEn;
  roleEl.appendChild(enEl);

  // 身份阶梯名（5 阶段 · narrative §4.3）作 alt label
  const altText = t(`roster.role.${layout.rowId}`);
  if (altText && altText !== `roster.role.${layout.rowId}`) {
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
  clrEl.textContent = layout.clearance;
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
