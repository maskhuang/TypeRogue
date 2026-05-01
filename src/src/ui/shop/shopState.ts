// ============================================
// Shop Preview · Shared Module State (Story 60.16)
// ============================================
// 集中管理跨模块共享的：
//   - 不可变常量（VERBS / 阈值）
//   - 类型定义（UndoEntry / SubmitStage / DrawerKind / InboxCardData）
//   - 模块级会话状态（previewState 对象，伪 mutable shared state）
//
// 模块依赖：本模块零依赖于其他 shop/* 模块。
// ============================================

import type { ItemDescriptor } from '../itemDescriptors';
import type { WordPack } from '../../core/types';
import { shouldPlayShopSound } from '../../core/UserSettings';
import { playSound } from '../../effects/sound';
import { state } from '../../core/state';

// === Constants ===

export const PREVIEW_HASH = '#shop-preview';
export const HIGH_PRICE_THRESHOLD = 100;
export const PREVIEW_SEED_GOLD = 248;

export const VERBS = ['LIS', 'BUY', 'INF', 'SEL', 'RES', 'PRO', 'HEL', 'UND', 'STA', 'WOR'] as const;
export const VERB_FULL: Record<string, string> = {
  LIS: 'LIST', BUY: 'BUY', INF: 'INFO', SEL: 'SELL',
  RES: 'RESHUFFLE', PRO: 'PROCEED', HEL: 'HELP', UND: 'UNDO',
  STA: 'STATS', WOR: 'WORDS',
};

// stamp 动画 600ms（CSS 控制） + 200ms safety = 800ms fallback timer
export const SUBMIT_STAMP_FALLBACK_MS = 800;

// === Types ===

export type UndoEntry =
  | { kind: 'skill'; sku: string; price: number; skillId: string; itemIdx: number }
  | { kind: 'pack'; sku: string; price: number; words: string[] }
  | { kind: 'relic'; sku: string; price: number; relicId: string };

export type SubmitStage = 'warn-bindings' | 'warn-inbox';

export type DrawerKind = 'words' | 'craft' | 'metamorph' | 'pack-pick';

export interface InboxCardData {
  iconEmoji: string;
  name: string;
  sku: string;
  clearance: string;
  skillId: string;
  shapeId: string;
  rotation: number;
  rarity: number;
  shapePreviewHtml: string;
  /** Story 60.9 follow-up #9: 是否已开封（曾装配过）— 卸回 IN-tray 时为 true */
  opened: boolean;
}

// === Module-level session state ===
// 伪 mutable shared state：其他模块 import previewState 后用 previewState.X 读写。
// 直接 export let X 跨模块赋值无法同步（ESM live binding 仅 export 侧可改），
// 因此用 object container 维持单一引用。
export const previewState = {
  active: false,
  currentScreen: 'terminal' as 'terminal' | 'workbench',
  typedBuffer: '',
  cmdHistory: [] as string[],
  historyIdx: -1, // -1 = no nav
  undoStack: [] as UndoEntry[],
  pendingConfirm: null as { sku: string; price: number } | null,
  // Story 60.2: 多词 pack 选词流程未完成时的暂存状态（drawer 打开期间存活）
  pendingPackPick: null as { d: ItemDescriptor; pack: WordPack } | null,
  // Story 60.4: SUBMIT 警告流程暂存状态
  pendingSubmit: null as { stage: SubmitStage; nextStage: SubmitStage | 'proceed' } | null,
  // Story 60.4: stamp 动画进行中防重复点击
  submitting: false,
  workbenchEntered: false,
  // Story 60.9 follow-up #9: 追踪"曾被装配过"的 skillId — 卸回 IN-tray 时
  // 渲染为已开封态（无运单包装），区别于刚购入的未拆封态（完整运单）
  unsealedSkillIds: new Set<string>(),
  // 已购买 SKU 集合 — 跨 rebuildDescriptors() 持久化（descriptor 重建会丢 purchased flag，
  // 这里是真相源，descriptor.purchased 在 rebuildDescriptors 时从此 set 同步）
  purchasedSkus: new Set<string>(),
  // Story 60.11: RESHUFFLE 后下次 LIS 走逐行 print 模式
  nextListIsAnimated: false,
  // Story 60.11: cmdList 调用计数器 — 用户在动画期间再次 LIS 时取消旧队列
  listCallCounter: 0,
  // snapshot of descriptors for current shop session — re-derived each LIST or after mutation
  descriptorCache: [] as ItemDescriptor[],
  drawerOpen: null as DrawerKind | null,
  menuPrevDisplay: null as string | null,
};

/**
 * 重置 session 状态（除 active / menuPrevDisplay）— bootstrap 进入新 session 调用。
 * 注意：state.player.inbox 由 bootstrap.resetSession 单独清，因为它属 core/state。
 */
export function resetPreviewSession(): void {
  previewState.typedBuffer = '';
  previewState.cmdHistory = [];
  previewState.historyIdx = -1;
  previewState.undoStack = [];
  previewState.pendingConfirm = null;
  previewState.pendingPackPick = null; // L2 fix: 防止跨 session 残留 stale pack reference
  previewState.workbenchEntered = false;
  previewState.unsealedSkillIds = new Set<string>(); // Story 60.9 follow-up #9: 重置开封记录
  previewState.purchasedSkus = new Set<string>();
}

// === Story 60.12: shop 音效守卫包装 — 单点关 + 兼容 SOUND_PROFILES type ===
export function sfx(type: Parameters<typeof playSound>[0]): void {
  if (!shouldPlayShopSound()) return;
  playSound(type);
}

/** Pure utility — text → HTML-safe string. Shared by terminal output and workbench card render. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Owned skill entry — 一行 = 一个独特技能 sid，含合并后的占位 key 描述。 */
export interface OwnedSkillEntry {
  /** 技能 ID（唯一），用于查 state.affixSkills.get(sid) */
  sid: string;
  /** 占位 key 描述：bound 多键 → 'A+B' / 单键 → 'A' / inbox 槽 → 'IN1' */
  key: string;
  /** 排序首键（bound 取最小键字母，inbox 用 'Z{idx}' 排末尾） */
  sortKey: string;
}

/**
 * owned skills 列表：bindings 按 sid 去重合并多格 + inbox（保数组顺序）。
 * Story 60.20 review M1 fix: cmdInfoListOwned (terminal /OWNED) 与 syncFiledFolders
 * (workbench FILED.SKILL) 共用同一算法，避免双份漂移。
 */
export function getOwnedSkillEntries(): OwnedSkillEntry[] {
  // 多格 tetromino 在 bindings Map 里有 N 条 entry（每键一条），按 sid 分组合并 keys
  const sidToKeys = new Map<string, string[]>();
  for (const [k, sid] of state.player.bindings) {
    const arr = sidToKeys.get(sid) ?? [];
    arr.push(k.toUpperCase());
    sidToKeys.set(sid, arr);
  }
  const entries: OwnedSkillEntry[] = [];
  for (const [sid, keys] of sidToKeys) {
    keys.sort();
    entries.push({ sid, key: keys.join('+'), sortKey: keys[0] });
  }
  // bound 按首键字母排序
  entries.sort((a, b) => a.sortKey.charCodeAt(0) - b.sortKey.charCodeAt(0));
  // inbox 按数组顺序追加（与 IN-tray 显示一致）
  for (let i = 0; i < state.player.inbox.length; i++) {
    entries.push({ sid: state.player.inbox[i], key: `IN${i + 1}`, sortKey: `Z${i}` });
  }
  return entries;
}

// === Cross-module callback registry (Story 60.16 AC4) ===
// terminal / workbench 之间不直接 import；少量协调点（切屏/submit/post-buy 刷新）
// 由各模块自行注册到 shopBus，调用方通过 shopBus.X() 拨号。
//
// 维度：
//   - bootstrap-provided: showOnly / switchToWorkbench / updateTerminalChrome（terminal/workbench cmd 调）
//   - workbench-provided: syncWorkbenchInbox / syncWorkbenchRelics / syncWorkbenchKeys / openDrawer / closeDrawer / triggerInboxWhoosh
//   - terminal-provided: finalizePackPick / cancelPackPick（workbench drawer 调）
const noop = (): void => {};
export const shopBus = {
  // bootstrap-provided
  showOnly: noop as (which: 'terminal' | 'workbench') => void,
  switchToWorkbench: noop as () => void,
  updateTerminalChrome: noop as () => void,

  // workbench-provided
  syncWorkbenchInbox: noop as () => void,
  syncWorkbenchRelics: noop as () => void,
  syncWorkbenchKeys: noop as () => void,
  syncFiledFolders: noop as () => void,
  attachWorkbenchTooltips: noop as () => void,
  setupDragZones: noop as () => void,
  openDrawer: noop as (kind: DrawerKind) => void,
  closeDrawer: noop as () => void,
  triggerInboxWhoosh: noop as (slotIdx: number) => void,

  // terminal-provided
  finalizePackPick: noop as (word: string) => void,
  cancelPackPick: noop as () => void,
  appendLine: noop as (text: string, cls?: string, raw?: boolean) => void,
};
