// ============================================
// 打字肉鸽 - 游戏入口
// ============================================

import './style.css';
import { initElements } from './ui/elements';
import { state } from './core/state';
import { getStarterWords } from './data/words';
import { startLevel, initInput } from './systems/battle';
import { initShopEvents } from './systems/shop';

// === 游戏初始化 ===
function init(): void {
  console.log('🎮 打字肉鸽 - 初始化中...');

  // 初始化 UI 元素引用
  initElements();

  // 初始技能
  state.player.skills.set('burst', { level: 1 });
  state.player.bindings.set('f', 'burst');

  // 初始词库
  state.player.wordDeck = getStarterWords();

  // 初始金币
  state.gold = 30;

  // 初始化输入处理
  initInput();

  // 初始化商店事件
  initShopEvents();

  // 初始化重开按钮
  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) {
    restartBtn.onclick = () => window.location.reload();
  }

  console.log('✅ 初始化完成');
  console.log('📊 状态:', state);

  // 启动游戏
  state.level = 1;
  startLevel();
}

// === 启动 ===
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
