// ============================================
// Shop Redesign Preview · Facade (Story 60.16 Task 5)
// ============================================
// 通过 URL hash `#shop-preview` 触发；不影响任何现有流程。
// 终端命令解析器 + 双屏切换 + 工作台视觉。
// 数据：state.shop.items (auto-seed if empty) → ItemDescriptor → 渲染。
//
// 本文件仅 re-export 拆分后的 4 个模块（state / terminal / workbench / bootstrap），
// 维持 `from '../ui/shopPreview'` 旧 import 路径 100% 向后兼容。
// 旧的 2548 行实现拆为：
//   - shop/shopState     ~150 行（状态 + 类型 + 常量 + shopBus + sfx + escapeHtml）
//   - shop/shopTerminal  ~1170 行（cmd / render / descriptors / banner / chrome）
//   - shop/shopWorkbench ~500 行（sync / drawer / drag / inbox card）
//   - shop/shopBootstrap ~620 行（lifecycle / 屏幕注入 / 输入派发 / submit 流程）
// ============================================

import { previewState } from './shop/shopState';
import * as terminal from './shop/shopTerminal';
import * as workbench from './shop/shopWorkbench';
import type { ItemDescriptor } from './itemDescriptors';
import type { WordPack } from '../core/types';
import type { SubmitStage } from './shop/shopState';

// === Public API re-exports（外部 import 路径保持 './ui/shopPreview' 不变） ===

// Lifecycle / 入口（main.ts、systems/shop.ts 用）
export { enterTerminalShop, initShopPreview, triggerSubmit, handleSubmitConfirmation } from './shop/shopBootstrap';

// Banner / labels / chrome 测试 + craft 回调用
export {
  buildBannerLine,
  buildBannerText,
  getFormLabel,
  getClrLabel,
  getStageIcon,
  updateTerminalChrome,
  finalizePackPick,
  cancelPackPick,
} from './shop/shopTerminal';

// Workbench tooltip 测试用
export { attachWorkbenchTooltips } from './shop/shopWorkbench';

// === Story 60.2 / 60.4: 测试专用内部 API（不要在生产代码里使用）===
import * as bootstrap from './shop/shopBootstrap';

export const __test = {
  executeBuyPack: (d: ItemDescriptor) => terminal.executeBuyPack(d),
  getPendingPackPick: () => previewState.pendingPackPick,
  setPendingPackPick: (v: { d: ItemDescriptor; pack: WordPack } | null): void => {
    previewState.pendingPackPick = v;
  },
  getUndoStack: () => previewState.undoStack,
  resetUndoStack: (): void => { previewState.undoStack = []; },
  // Story 60.4
  getPendingSubmit: () => previewState.pendingSubmit,
  setPendingSubmit: (v: { stage: SubmitStage; nextStage: SubmitStage | 'proceed' } | null): void => {
    previewState.pendingSubmit = v;
  },
  isSubmitting: (): boolean => previewState.submitting,
  resetSubmitting: (): void => { previewState.submitting = false; },
  // Story 60.4 review M1: pendingConfirm 互斥测试
  setPendingConfirm: (v: { sku: string; price: number } | null): void => {
    previewState.pendingConfirm = v;
  },
  getPendingConfirm: () => previewState.pendingConfirm,
  // Story 60.7: BUY/SELL/UND 副作用测试入口
  executeBuySkill: (d: ItemDescriptor) => terminal.executeBuySkill(d),
  executeBuyRelic: (d: ItemDescriptor) => terminal.executeBuyRelic(d),
  cmdSell: (arg: string): void => terminal.cmdSell(arg),
  cmdUndo: (): void => terminal.cmdUndo(),
  // Story 60.10: INF 命令测试入口
  cmdInfo: (arg: string): void => terminal.cmdInfo(arg),
  /** Story 60.10 review M2: 注入 descriptorCache 方便测 catalog 命中路径 */
  setDescriptorCache: (items: ItemDescriptor[]): void => { previewState.descriptorCache = items; },
  // Story 60.11: 动画测试入口
  cmdList: (): void => terminal.cmdList(),
  cmdReshuffle: (): void => terminal.cmdReshuffle(),
  triggerInboxWhoosh: (slotIdx: number): void => workbench.triggerInboxWhoosh(slotIdx),
  showOnly: (which: 'terminal' | 'workbench'): void => bootstrap.showOnly(which),
  setNextListAnimated: (v: boolean): void => { previewState.nextListIsAnimated = v; },
  // Story 60.12: 音效测试入口
  bindSkillToKey: (skillId: string, key: string): void => workbench.bindSkillToKey(skillId, key),
  unbindSkillFromKey: (key: string): void => workbench.unbindSkillFromKey(key),
  cmdBuy: (arg: string): void => terminal.cmdBuy(arg),
  openDrawer: (kind: 'words' | 'craft' | 'metamorph' | 'pack-pick'): void => workbench.openDrawer(kind),
  proceedSubmit: (): void => bootstrap.proceedSubmit(),
};
