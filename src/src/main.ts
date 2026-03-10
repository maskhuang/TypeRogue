// ============================================
// 打字肉鸽 - 游戏入口
// ============================================

import './style.css';
import { initElements } from './ui/elements';
import { state } from './core/state';
import { getStarterWords } from './data/words';
import { drawBossModifiers } from './data/bossModifiers';
import { drawConverterPool, CONVERTERS } from './data/converters';
import { drawConnectorPool, drawReplicatorPool, CONNECTORS, REPLICATORS } from './data/connectors';
import { drawAmplifierPool, AMPLIFIERS } from './data/amplifiers';
import { startLevel, initInput, resetLastAct } from './systems/battle';
import { initShopEvents } from './systems/shop';
import { hasUnownedRelics, showRelicPicker, RELIC_WEIGHT_PRESETS } from './systems/relicPicker';
import { MetaState } from './core/state/MetaState';
import { initLeaderboardDisplay, renderLeaderboard } from './ui/leaderboardDisplay';
import { eventBus } from './core/events/EventBus';
import { getDailySeed, getDailySeedString, setSeededMode, setNormalMode } from './core/seededRandom';
import { showClassPicker } from './systems/classes/ClassPicker';
import { filterSkillIdsByClass } from './systems/classes/ClassResourceFilter';
import { saveManager } from './core/save/SaveManager';

// === 游戏初始化 ===
async function init(): Promise<void> {
  console.log('🎮 打字肉鸽 - 初始化中...');

  // 初始化 UI 元素引用
  initElements();

  // 初始技能
  state.player.skills.set('prod_burst', { level: 1 });
  state.player.bindings.set('f', 'prod_burst');

  // 初始金币
  state.gold = 50;

  // 初始化输入处理
  initInput();

  // 初始化商店事件
  initShopEvents();

  // Story 25.5: 初始化 MetaState（排行榜 + 统计）
  const metaState = new MetaState();

  // 加载存档
  const savedMeta = await saveManager.loadMeta();
  if (savedMeta) {
    metaState.deserialize(savedMeta);
  }

  state.endlessUnlocked = metaState.isModeUnlocked('endless');
  initLeaderboardDisplay(metaState);

  // 监听保存请求：Run 结束时自动持久化 MetaState
  eventBus.on('meta:request_save', () => {
    void saveManager.saveMeta(metaState.serialize());
  });

  // 排行榜：Run 结束后渲染
  eventBus.on('meta:stats_updated', () => {
    renderLeaderboard();
    // 保存后刷新 endlessUnlocked（可能刚解锁）
    state.endlessUnlocked = metaState.isModeUnlocked('endless');
  });

  // 初始化重开按钮
  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) {
    restartBtn.onclick = () => window.location.reload();
  }

  // Story 25.6: 每日挑战按钮
  const dailyBtn = document.getElementById('daily-btn');
  if (dailyBtn) {
    const seedStr = getDailySeedString();
    dailyBtn.textContent = `📅 每日挑战 (${seedStr})`;
    dailyBtn.onclick = () => {
      // 存储 daily 标记到 sessionStorage，reload 时读取
      sessionStorage.setItem('dailyMode', '1');
      window.location.reload();
    };
  }

  console.log('✅ 初始化完成');
  console.log('📊 状态:', state);

  // Story 25.6: 检查是否为每日模式
  const isDaily = sessionStorage.getItem('dailyMode') === '1';
  sessionStorage.removeItem('dailyMode');

  if (isDaily) {
    const seed = getDailySeed();
    setSeededMode(seed);
    state.gameMode = 'daily';
    state.dailySeed = seed;
    console.log(`📅 每日挑战模式 — 种子: ${seed} (${getDailySeedString()})`);
  } else {
    setNormalMode();
    state.gameMode = 'normal';
    state.dailySeed = null;
  }

  // 初始词库（必须在种子设置之后，确保每日模式确定性）
  state.player.wordDeck = getStarterWords();

  // 抽取本局 Boss 修饰器池（3 个随机修饰器，精英关/Boss 关使用）
  state.bossModifierPool = drawBossModifiers(3);

  // 抽取本局转化者池（52 个中随机 31 个，非造词师过滤后 ~20）
  state.converterPool = drawConverterPool();

  // 抽取本局连接者池（25 个中随机 13 个）
  state.connectorPool = drawConnectorPool();

  // 抽取本局复制者池（6 个中随机 5 个）
  state.replicatorPool = drawReplicatorPool();

  // 抽取本局增幅者池（30 个中随机 15 个）
  state.amplifierPool = drawAmplifierPool();

  // 启动游戏流程：职业选择 → 遗物选择 → 开始关卡
  resetLastAct();
  state.level = 1;

  const startAfterClassSelect = () => {
    // Story 32.2: 按职业过滤技能池（移除非当前职业的职业资源技能）
    state.converterPool = filterSkillIdsByClass(state.converterPool, state.classId, id => CONVERTERS[id]);
    state.connectorPool = filterSkillIdsByClass(state.connectorPool, state.classId, id => CONNECTORS[id]);
    state.replicatorPool = filterSkillIdsByClass(state.replicatorPool, state.classId, id => REPLICATORS[id] as any);
    state.amplifierPool = filterSkillIdsByClass(state.amplifierPool, state.classId, id => AMPLIFIERS[id]);

    // 有初始遗物的职业跳过开局三选一
    if (state.classId === 'none' && hasUnownedRelics()) {
      showRelicPicker(() => void startLevel(), RELIC_WEIGHT_PRESETS.gameStart);
    } else {
      void startLevel();
    }
  };

  // Story 32.1: 显示职业选择界面
  showClassPicker(metaState, startAfterClassSelect);
}

// === 启动 ===
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void init());
} else {
  void init();
}
