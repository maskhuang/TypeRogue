// ============================================
// Shop Redesign Preview · Facade (Story 60.16 Tasks 5 + Review M2)
// ============================================
// 通过 URL hash `#shop-preview` 触发；不影响任何现有流程。
// 终端命令解析器 + 双屏切换 + 工作台视觉。
// 数据：state.shop.items (auto-seed if empty) → ItemDescriptor → 渲染。
//
// 本文件仅 re-export 拆分后的 4 个模块，维持 `from '../ui/shopPreview'`
// 旧 import 路径 100% 向后兼容。原 2548 行实现拆为：
//   - shop/shopState     ~150 行（状态 + 类型 + 常量 + shopBus + sfx + escapeHtml）
//   - shop/shopTerminal  ~1170 行（cmd / render / descriptors / banner / chrome）
//   - shop/shopWorkbench ~500 行（sync / drawer / drag / inbox card）
//   - shop/shopBootstrap ~890 行（lifecycle / 屏幕注入 / 输入派发 / submit / __test）
// ============================================

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

// 测试专用内部 API（实现在 shopBootstrap，facade 仅 re-export）
export { __test } from './shop/shopBootstrap';
