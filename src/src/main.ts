// ============================================
// 打字肉鸽 - 游戏入口
// ============================================

import './style.css';
import { initElements, getElements } from './ui/elements';
import { state, resetState } from './core/state';
import { getStarterWords } from './data/words';
import { startLevel, initInput, resetCycleTracking, showScreen } from './systems/battle';
import { initFloatTextCanvas, clearFloatTexts } from './ui/effects/FloatTextPool';
import { stopBGM, initAudio } from './effects/sound';
import { startTutorialMode } from './systems/tutorial/TutorialMode';
import { openSettingsPanel, applyAllSettings } from './ui/SettingsPanel';
import { loadSettings } from './core/UserSettings';
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
import { initLocale, setLocale, getLocale, applyHtmlI18n, t } from './demo/demo-i18n';
import type { Locale } from './demo/demo-i18n';
import { tutorialManager } from './systems/tutorial/TutorialManager';
import { initFullTutorial } from './systems/tutorial/tutorialInit';
import { A8_WORD_COMPRESS_RATIO } from './core/constants';

// === 游戏初始化 ===
async function init(): Promise<void> {
  console.log('🎮 打字肉鸽 - 初始化中...');

  // 加载用户设置
  loadSettings()

  // 初始化 UI 元素引用
  initElements();

  // 应用设置（CRT 等，音量在 initAudio 后生效）
  applyAllSettings();

  // 初始化 Canvas2D 浮字系统
  initFloatTextCanvas(document.getElementById('game-container')!);

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

    // Story 56-1: 显示主菜单
    showScreen('menu');
    const menuStartBtn = document.getElementById('menu-start-btn');
    if (menuStartBtn) {
      menuStartBtn.onclick = () => {
        initAudio();
        getElements().mainMenuScreen.style.display = 'none';
        resetCycleTracking();
        state.level = 1;
        void startLevel();
      };
    }
    const tutorialBtn = document.getElementById('menu-tutorial-btn');
    if (tutorialBtn) tutorialBtn.onclick = () => startTutorialMode();
    const settingsBtn = document.getElementById('menu-settings-btn');
    if (settingsBtn) settingsBtn.onclick = () => openSettingsPanel();
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

  // 初始化重开按钮 — 回主菜单而非 reload
  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) {
    restartBtn.onclick = () => {
      stopBGM();
      clearFloatTexts();
      resetState();
      showScreen('menu');
      updateMenuInfo();
    };
  }

  // Story 25.6: 每日挑战按钮
  const dailyBtn = document.getElementById('daily-btn');
  if (dailyBtn) {
    const seedStr = getDailySeedString();
    dailyBtn.textContent = `📅 ${t('gameover.daily')} (${seedStr})`;
    dailyBtn.onclick = () => {
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
    // Story 54.7: A8+ 词库压缩 30%（ascensionLevel 已由 AscensionPicker 设置）
    if (state.ascensionLevel >= 8) {
      const deck = state.player.wordDeck;
      const removeCount = Math.floor(deck.length * A8_WORD_COMPRESS_RATIO);
      const indices = Array.from({ length: deck.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      const toRemove = new Set(indices.slice(0, removeCount));
      state.player.wordDeck = deck.filter((_, i) => !toRemove.has(i));
    }

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

  // Story 56-1: 显示主菜单（而非直接进入职业选择）
  showScreen('menu');
  updateMenuInfo();

  // 主菜单「开始游戏」按钮
  const menuStartBtn = document.getElementById('menu-start-btn');
  if (menuStartBtn) {
    menuStartBtn.onclick = () => {
      // 用户手势 → 初始化音频（浏览器要求）
      initAudio();
      // 每局重置 state + 恢复词库
      resetState();
      state.player.wordDeck = getStarterWords();
      rollAffixWeights(random);
      resetWordRelicRunState();
      state.endlessUnlocked = metaState.isModeUnlocked('endless');

      getElements().mainMenuScreen.style.display = 'none';
      showClassPicker(metaState, () => {
        showAscensionPicker(metaState, state.classId, startAfterClassSelect);
      });
    };
  }

  // 主菜单「教程」按钮
  const tutorialBtn = document.getElementById('menu-tutorial-btn');
  if (tutorialBtn) tutorialBtn.onclick = () => startTutorialMode();

  // 主菜单「设置」按钮
  const settingsBtn = document.getElementById('menu-settings-btn');
  if (settingsBtn) settingsBtn.onclick = () => openSettingsPanel();
}

/** 更新主菜单底部信息 */
function updateMenuInfo(): void {
  const infoEl = document.getElementById('menu-info');
  if (!infoEl) return;
  const parts: string[] = ['v0.2'];
  if (state.ascensionLevel > 0) parts.push(`A${state.ascensionLevel}`);
  infoEl.textContent = parts.join(' · ');
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

  // Demo: 安装错误边界，移除旧 overlay，直接初始化到主菜单
  installDemoErrorBoundary();
  document.getElementById('demo-start-overlay')?.remove();
  void init();
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
