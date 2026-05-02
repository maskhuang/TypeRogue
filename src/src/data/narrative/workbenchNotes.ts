// ============================================
// 工作台便签：DPCA 前任使用者 / 同事 / 巡查员留下的小卡片
// ============================================
// 每次进店随机抽一张贴在工作台 note 区。新增便签直接 push 到 WORKBENCH_NOTES：
// id 用 'note-{编号}-{关键词}' 便于将来挑选 / 排除最近一张避重复 / 与 SCP 风事件挂钩。

import type { Locale } from '../../demo/demo-i18n';

export interface WorkbenchNote {
  /** 调试 / 防重 / 后续条件触发用的稳定 ID — 不展示给玩家 */
  id: string;
  zh: string;
  en: string;
}

export const WORKBENCH_NOTES: WorkbenchNote[] = [
  {
    id: 'note-4471-name',
    zh: '"它在叫我名字。如果你听见——立即更换键盘。" — 前任使用者 #4471（已失踪）',
    en: '"It is calling my name. If you hear it — replace the keyboard at once." — Previous user #4471 (missing)',
  },
];

/** 取出对应 locale 的文本 —— 控件层只调用这个，不直接读字段 */
export function getNoteText(note: WorkbenchNote, locale: Locale): string {
  return locale === 'zh' ? note.zh : note.en;
}

/**
 * 随机挑一张便签。默认 Math.random（每次进店变化）；调用方可注入 seeded RNG
 * 来做可复现 / 跟着 runSeed 决定的版本。
 */
export function pickRandomNote(rng: () => number = Math.random): WorkbenchNote {
  if (WORKBENCH_NOTES.length === 0) {
    throw new Error('WORKBENCH_NOTES is empty');
  }
  return WORKBENCH_NOTES[Math.floor(rng() * WORKBENCH_NOTES.length)];
}
