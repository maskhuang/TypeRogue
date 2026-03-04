// ============================================
// 打字肉鸽 - 游戏入口
// ============================================

import './style.css';
import { initElements } from './ui/elements';
import { state } from './core/state';
import { getStarterWords } from './data/words';
import { drawBossModifiers } from './data/bossModifiers';
import { drawConverterPool } from './data/converters';
import { drawConnectorPool } from './data/connectors';
import { startLevel, initInput, resetLastAct } from './systems/battle';
import { initShopEvents } from './systems/shop';
import { shouldShowRelicPicker, showRelicPicker } from './systems/relicPicker';

// === 游戏初始化 ===
function init(): void {
  console.log('🎮 打字肉鸽 - 初始化中...');

  // 初始化 UI 元素引用
  initElements();

  // 初始技能
  state.player.skills.set('prod_burst', { level: 1 });
  state.player.bindings.set('f', 'prod_burst');

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

  // 抽取本局 Boss 修饰器池（3 个随机修饰器，精英关/Boss 关使用）
  state.bossModifierPool = drawBossModifiers(3);

  // 抽取本局转化者池（40 个中随机 20 个）
  state.converterPool = drawConverterPool();

  // 抽取本局连接者池（36 个中随机 18 个）
  state.connectorPool = drawConnectorPool();

  // 启动游戏
  resetLastAct();
  state.level = 1;
  if (shouldShowRelicPicker(state.level)) {
    showRelicPicker(() => void startLevel());
  } else {
    void startLevel();
  }
}

// === 启动 ===
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
