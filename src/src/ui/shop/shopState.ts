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
}
