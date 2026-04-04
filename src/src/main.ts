// ============================================
// 打字肉鸽 - 游戏入口
// ============================================

import './style.css';
import { initElements } from './ui/elements';
import { state } from './core/state';
import { getStarterWords } from './data/words';
import { startLevel, initInput, resetCycleTracking } from './systems/battle';
import { initShopEvents } from './systems/shop';
import { hasUnownedRelics, showRelicPicker, RELIC_WEIGHT_PRESETS } from './systems/relicPicker';
import { MetaState } from './core/state/MetaState';
import { initLeaderboardDisplay, renderLeaderboard } from './ui/leaderboardDisplay';
import { eventBus } from './core/events/EventBus';
import { getDailySeed, getDailySeedString, setSeededMode, setNormalMode, random } from './core/seededRandom';
import { resetWordRelicRunState } from './systems/relics/WordRelicBehaviors';
import { showClassPicker } from './systems/classes/ClassPicker';
import { showAscensionPicker } from './systems/classes/AscensionPicker';
import { saveManager } from './core/save/SaveManager';
import {
  IS_DEMO,
  DEMO_STARTER_RELIC, DEMO_STARTER_BINDINGS
} from './demo/demo-config';
import { generateSkill } from './data/skillGeneration';
import { createSkillRuntimeState, rollAffixWeights } from './data/affixes';
import { bindShapeToKeys, getBindingState } from './systems/bindingManager';
import { cleanDemoDom, installDemoErrorBoundary, checkWebGLSupport, showWebGLError } from './demo/demo-dom-cleanup';
import { trackEvent } from './demo/demo-analytics';
import { initLocale, setLocale, getLocale, applyHtmlI18n } from './demo/demo-i18n';
import type { Locale } from './demo/demo-i18n';
import { tutorialManager } from './systems/tutorial/TutorialManager';
import { initFullTutorial } from './systems/tutorial/tutorialInit';

// === 游戏初始化 ===
async function init(): Promise<void> {
  console.log('🎮 打字肉鸽 - 初始化中...');

  // 初始化 UI 元素引用
  initElements();

  // Demo: 移除完整版多余 DOM 节点
  cleanDemoDom();

  // 初始化输入处理
  initInput();

  // 初始化商店事件
  initShopEvents();

  if (IS_DEMO) {
    // === Demo 模式：精简初始化 ===

    // 每局随机词条权重
    rollAffixWeights(random);

    // 预设技能绑定（词条制技能系统）
    for (const { resource, key } of DEMO_STARTER_BINDINGS) {
      const sk = generateSkill({ resource, rarity: 0, level: 1 });
      state.player.skills.set(sk.id, { level: 1 });
      state.affixSkills.set(sk.id, sk);
      state.affixSkillStates.set(sk.id, createSkillRuntimeState(sk.id));
      bindShapeToKeys(getBindingState(state), sk.id, key);
    }
    // Story 54.2: 初始金币由练习关得分映射，不再固定赋值

    // 赠送开局遗物
    state.player.relics.add(DEMO_STARTER_RELIC);

    // Boss 修饰器池初始为空（Boss 战前由 picker 填充）
    state.bossModifierPool = [];

    // 跳过职业选择
    state.classId = 'none';
    state.gameMode = 'normal';
    state.dailySeed = null;

    // Story 36.7: 重置单词遗物 Run 级别状态
    resetWordRelicRunState();

    // 初始词库
    state.player.wordDeck = getStarterWords();

    // 直接开始
    resetCycleTracking();
    state.level = 1;
    void startLevel();
    return;
  }

  // === 完整版流程 ===

  // 初始技能（新词条制系统）— 绑定键位延迟到词库生成后
  const starterSkill = generateSkill({ rarity: 0, level: 1 });
  state.player.skills.set(starterSkill.id, { level: 1 });
  state.affixSkills.set(starterSkill.id, starterSkill);
  state.affixSkillStates.set(starterSkill.id, createSkillRuntimeState(starterSkill.id));

  // Story 54.2: 初始金币由练习关得分映射，不再固定赋值

  // Story 25.5: 初始化 MetaState（排行榜 + 统计）
  const metaState = new MetaState();

  // 加载存档
  const savedMeta = await saveManager.loadMeta();
  if (savedMeta) {
    metaState.deserialize(savedMeta);
  }

  state.endlessUnlocked = metaState.isModeUnlocked('endless');
  initLeaderboardDisplay(metaState);

  // Story 39.3: 连接 TutorialManager 持久化后端
  tutorialManager.setPersistence(metaState);

  // DEBUG: 暴露到全局，方便控制台重置教程进度
  (window as unknown as Record<string, unknown>).__tutorialManager = tutorialManager;

  // Story 39.4: 完整版引导（L0-L1），仅非 Demo 模式
  if (!IS_DEMO) {
    initFullTutorial();
  }

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

  // Story 36.7: 重置单词遗物 Run 级别状态（词汇收藏 Set）
  resetWordRelicRunState();

  // 每局随机词条权重（必须在种子设置之后）
  rollAffixWeights(random);

  // 初始词库（必须在种子设置之后，确保每日模式确定性）
  state.player.wordDeck = getStarterWords();

  // 初始技能绑定延迟到 startLevel → setWord 后，绑定到第一个单词首字母
  // 见 battle.ts bindStarterSkillToFirstWord()

  // Boss 修饰器池初始为空（Boss 战前由 picker 填充）
  state.bossModifierPool = [];

  // 启动游戏流程：职业选择 → 遗物选择 → 开始关卡
  resetCycleTracking();
  state.level = 1;

  // === DEBUG: 手动测试遗物 — 修改此数组切换子系统 ===
  const DEBUG_RELICS: string[] = [
  ];

  const startAfterClassSelect = () => {
    // DEBUG: 直接授予测试遗物，跳过三选一
    if (DEBUG_RELICS.length > 0) {
      for (const id of DEBUG_RELICS) state.player.relics.add(id);
      // 行会勋章：自动随机选行
      if (DEBUG_RELICS.includes('row_medal')) {
        import('./systems/relics/TopologyRelicBehaviors').then(m => m.autoSelectRowMedal());
      }
      void startLevel();
      return;
    }
    // 有初始遗物的职业跳过开局三选一
    if (state.classId === 'none' && hasUnownedRelics()) {
      showRelicPicker(() => void startLevel(), RELIC_WEIGHT_PRESETS.gameStart);
    } else {
      void startLevel();
    }
  };

  // Story 32.1 → 54.3: 职业选择 → Ascension 选择 → 开始
  showClassPicker(metaState, () => {
    showAscensionPicker(metaState, state.classId, startAfterClassSelect);
  });
}

// === 启动 ===
if (IS_DEMO) {
  // Demo: 初始化 i18n + 应用 HTML 翻译
  initLocale();
  applyHtmlI18n();

  // Demo: 语言切换按钮
  const langBtns = document.querySelectorAll('.demo-lang-btn');
  // 初始化高亮状态
  langBtns.forEach(btn => {
    const lang = (btn as HTMLElement).dataset.lang;
    btn.classList.toggle('active', lang === getLocale());
  });
  langBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = (btn as HTMLElement).dataset.lang as Locale;
      setLocale(lang);
      langBtns.forEach(b => b.classList.toggle('active', (b as HTMLElement).dataset.lang === lang));
      applyHtmlI18n();
    });
  });

  // Demo: 安装错误边界，等待用户手势启动
  installDemoErrorBoundary();
  const overlay = document.getElementById('demo-start-overlay');
  if (overlay) {
    const startBtn = overlay.querySelector('.demo-start-btn');
    (startBtn || overlay).addEventListener('click', () => {
      if (!checkWebGLSupport()) {
        overlay.remove();
        showWebGLError();
        return;
      }
      overlay.remove();
      trackEvent('demo_start');
      void init();
    }, { once: true });
  } else {
    void init();
  }
} else {
  // 完整版：移除 demo overlay，初始化 i18n
  document.getElementById('demo-start-overlay')?.remove();
  initLocale();
  applyHtmlI18n();

  // 语言切换按钮
  const langBtns = document.querySelectorAll('#lang-toggle .lang-btn');
  langBtns.forEach(btn => {
    const lang = (btn as HTMLElement).dataset.lang;
    btn.classList.toggle('active', lang === getLocale());
  });
  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = (btn as HTMLElement).dataset.lang as Locale;
      setLocale(lang);
      langBtns.forEach(b => b.classList.toggle('active', (b as HTMLElement).dataset.lang === lang));
      applyHtmlI18n();
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void init());
  } else {
    void init();
  }
}
