// ============================================
// 打字肉鸽 - 游戏入口
// ============================================

import './style.css';
import { initElements, getElements } from './ui/elements';
import { state, resetState } from './core/state';
import { getStarterWords } from './data/words';
import { startLevel, initInput, resetCycleTracking, showScreen } from './systems/battle';
import { initFloatTextCanvas, clearFloatTexts } from './ui/effects/FloatTextPool';
import { stopBGM, initAudio, playSound, setMasterVolume, setMusicVolume, playDeskSound } from './effects/sound';
import { startTutorialMode } from './systems/tutorial/TutorialMode';
import { openSettingsPanel, applyAllSettings, wireSettingsToggleIcon, applyCRT } from './ui/SettingsPanel';
import { loadSettings, getSettings, updateSettings } from './core/UserSettings';
import type { BackgroundMode } from './core/UserSettings';
import { setBackgroundMode } from './effects/balatroBackground';
import { initShopEvents } from './systems/shop';
import { hasUnownedRelics, showRelicPicker, RELIC_WEIGHT_PRESETS } from './systems/relicPicker';
import { MetaState } from './core/state/MetaState';
import { getNarrativeArchive } from './core/state/NarrativeArchiveState';
import { initLeaderboardDisplay, renderLeaderboard } from './ui/leaderboardDisplay';
import { eventBus } from './core/events/EventBus';
import { getDailySeed, getDailySeedString, setSeededMode, setNormalMode, random } from './core/seededRandom';
import { resetWordRelicRunState } from './systems/relics/WordRelicBehaviors';
import { showClassPicker } from './systems/classes/ClassPicker';
import { showAscensionPicker } from './systems/classes/AscensionPicker';
import { CLASS_DEFINITIONS } from './data/classes';
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
import { initShopPreview } from './ui/shopPreview';
import { wireV2BattleIntegration } from './systems/affixV2BattleIntegration';
import { renderHandbook } from './ui/handbook/handbookOverlay';

// 模块级引用，让 updateMenuInfo 能拿到 metaState
let menuMetaRef: MetaState | null = null;

// === 游戏初始化 ===
async function init(): Promise<void> {
  console.log('🎮 打字肉鸽 - 初始化中...');

  // 加载用户设置
  loadSettings()

  // 初始化 UI 元素引用
  initElements();

  // 应用设置（CRT 等，音量在 initAudio 后生效）
  applyAllSettings();
  wireSettingsToggleIcon();

  // 初始化 Canvas2D 浮字系统
  initFloatTextCanvas(document.getElementById('game-container')!);

  // Demo: 移除完整版多余 DOM 节点
  cleanDemoDom();

  // 初始化输入处理
  initInput();

  // 初始化商店事件
  initShopEvents();

  // MVP 预览：通过 URL hash `#shop-preview` 触发，不影响主流程
  initShopPreview();

  // V2 affix 战斗集成 · 订阅 battle:start / word:complete · 装配登记表为空时 no-op
  wireV2BattleIntegration();

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
        // 过场音由桌面 UI 接管
        getElements().mainMenuScreen.style.display = 'none';
        resetCycleTracking();
        state.level = 1;
        void startLevel();
      };
    }
    const tutorialBtn = document.getElementById('menu-tutorial-btn');
    if (tutorialBtn) tutorialBtn.onclick = () => { initAudio(); playDeskSound('paper'); startTutorialMode(); };
    const settingsBtn = document.getElementById('menu-settings-btn');
    if (settingsBtn) settingsBtn.onclick = () => { initAudio(); playDeskSound('paper'); openSettingsPanel(); };

    // === Stage 2: 桌面化主菜单交互 ===
    // 完整版在 line ~341 调用；DEMO 路径之前漏调，导致 handbook / request-pad / punch-input
    // 的 click + keydown listener 全部没挂，主菜单互动失效。
    setupDeskMenu();
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
  menuMetaRef = metaState;

  // 加载存档
  const savedMeta = await saveManager.loadMeta();
  if (savedMeta) {
    metaState.deserialize(savedMeta);
  }

  // PL-5: 加载 NarrativeArchive（仅本地，绝不上云）
  const savedNarrative = await saveManager.loadNarrative();
  if (savedNarrative) {
    getNarrativeArchive().deserialize(savedNarrative);
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

  // 工作台便条：记录战斗结果（驱动 after_fail / after_n_fails 触发便条 + 红领结）
  eventBus.on('battle:end', (e) => {
    void import('./data/narrative/workbenchNotes').then(m => m.recordBattleResult(e.result));
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
    dailyBtn.textContent = `${t('gameover.crt.daily')} · ${seedStr}`;
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
    // Stage 4 (2026-05): 所有职业都走开局申领单
    //   - wordsmith/metamorph: 申领单上仅一项专属 starter（不可拒，无 DENIED 重抽）
    //   - none: 三选一从 common 池抽
    const classDef = CLASS_DEFINITIONS[state.classId];
    const starterId = classDef?.starterRelic;
    if (starterId) {
      showRelicPicker(() => void startLevel(), RELIC_WEIGHT_PRESETS.gameStart, {
        titleKey: 'relic_picker.starter_title',
        deskMode: true,
        overrideCandidates: [starterId],
      });
    } else if (hasUnownedRelics()) {
      showRelicPicker(() => void startLevel(), RELIC_WEIGHT_PRESETS.gameStart, {
        titleKey: 'relic_picker.starter_title',
        deskMode: true,
      });
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
      // 过场音由桌面 UI 接管：punch + stamp + whoosh（在 setupDeskMenu 中触发）
      // 每局重置 state + 恢复词库
      resetState();
      state.player.wordDeck = getStarterWords();
      rollAffixWeights(random);
      resetWordRelicRunState();
      // 重新生成初始技能（resetState 会清空技能列表）
      const sk = generateSkill({ rarity: 0, level: 1 });
      state.player.skills.set(sk.id, { level: 1 });
      state.affixSkills.set(sk.id, sk);
      state.affixSkillStates.set(sk.id, createSkillRuntimeState(sk.id));
      state.endlessUnlocked = metaState.isModeUnlocked('endless');

      getElements().mainMenuScreen.style.display = 'none';
      showClassPicker(metaState, () => {
        showAscensionPicker(metaState, state.classId, startAfterClassSelect);
      });
    };
  }

  // 主菜单「教程」按钮 · Stage 4: 传 metaState 让完整版走真实 class picker + relic picker
  const tutorialBtn = document.getElementById('menu-tutorial-btn');
  if (tutorialBtn) tutorialBtn.onclick = () => { initAudio(); playDeskSound('paper'); startTutorialMode(menuMetaRef ?? undefined); };

  // 主菜单「设置」按钮
  const settingsBtn = document.getElementById('menu-settings-btn');
  if (settingsBtn) settingsBtn.onclick = () => { initAudio(); playDeskSound('paper'); openSettingsPanel(); };

  // === Stage 2: 桌面化主菜单交互 ===
  setupDeskMenu();
}

/**
 * Stage 2 · 桌面菜单交互：
 *   - 中央打卡卡输入工号 + Enter → CLOCKED IN 章动画 → 触发隐藏的 menuStartBtn（复用既有启动链）
 *   - 工号通过 localStorage 存储，ClassPicker 读取作为签字
 *   - 守则点击 → 打开守则覆盖层；ACK 按钮 → 触发 menuTutorialBtn
 *   - 申请表点击 → 打开申请表覆盖层；SUBMIT → 触发 menuSettingsBtn
 *   - 时钟显示真实时间（秒级 tick）
 */
const WORKER_ID_STORAGE_KEY = 'dpca-worker-id';
const WORKER_ID_PREFIX = 'OP. PRIMATE-';
const DEFAULT_SUFFIX = '7842';

/** 从输入框后缀 + 固定前缀 拼出完整工号；空后缀 → 沿用 storedSuffix。 */
function buildWorkerId(suffix: string, storedSuffix: string): string {
  const v = suffix.trim().toUpperCase();
  return WORKER_ID_PREFIX + (v || storedSuffix);
}

/** 从存储的完整工号中拆出后缀；不匹配前缀模式时回退默认。 */
function extractSuffix(storedFullId: string | null): string {
  if (!storedFullId) return DEFAULT_SUFFIX;
  const m = storedFullId.match(/^OP\.\s*PRIMATE-(.+)$/);
  return m ? m[1] : DEFAULT_SUFFIX;
}

function setupDeskMenu(): void {
  // 时钟（真实时间，每秒更新；不像 mock 那样加速）
  const clockEl = document.getElementById('menu-clock-display');
  if (clockEl) {
    const fmt = (n: number) => String(n).padStart(2, '0');
    const tick = () => {
      const d = new Date();
      clockEl.textContent = `${fmt(d.getHours())}:${fmt(d.getMinutes())}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  // 打卡日期戳：年份打码（████），月·日跟当天同步
  const punchDateEl = document.getElementById('menu-punch-date');
  if (punchDateEl) {
    const d = new Date();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    punchDateEl.textContent = `████·${MM}·${DD}`;
  }

  // 工号显示初始化（从 localStorage 读取上次的工号 → 拆出后缀填入输入框）
  const applicantIdEl = document.getElementById('punch-applicant-id');
  const storedFull = localStorage.getItem(WORKER_ID_STORAGE_KEY);
  const storedSuffix = extractSuffix(storedFull);
  const storedFullId = WORKER_ID_PREFIX + storedSuffix;
  if (applicantIdEl) applicantIdEl.textContent = storedFullId;

  // 打卡输入：实时预览 + Enter 提交（盖章后再切屏）
  const punchInput = document.getElementById('menu-punch-input') as HTMLInputElement | null;
  const punchStamp = document.getElementById('menu-punch-stamp');
  const startBtn = document.getElementById('menu-start-btn') as HTMLButtonElement | null;
  if (punchInput && startBtn) {
    // 实时预览：用户输入后缀时上方工号字段实时更新
    punchInput.addEventListener('input', () => {
      if (applicantIdEl) {
        applicantIdEl.textContent = buildWorkerId(punchInput.value, storedSuffix);
      }
    });

    punchInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (punchInput.disabled) return;
      // 首个用户手势 → 初始化音频（必须在播音前完成，否则 punch/stamp 因
      // audioContext===null 静默 return）
      initAudio();

      // 写入工号（空后缀 → 沿用 storedSuffix）
      const finalId = buildWorkerId(punchInput.value, storedSuffix);
      localStorage.setItem(WORKER_ID_STORAGE_KEY, finalId);
      if (applicantIdEl) applicantIdEl.textContent = finalId;

      // 盖章 → 等动画 → 切屏
      punchInput.disabled = true;
      if (punchStamp) {
        punchStamp.classList.add('show');
        playDeskSound('punch');
        setTimeout(() => playDeskSound('stamp'), 80);
        setTimeout(() => {
          punchStamp.classList.remove('show');
          punchInput.disabled = false;
          punchInput.value = '';
          // 场景切换：气动管道 whoosh
          playDeskSound('whoosh');
          startBtn.click();
        }, 950);
      } else {
        startBtn.click();
      }
    });
    // 主菜单显示时自动聚焦输入框（让 Enter 立即可用）
    setTimeout(() => punchInput.focus(), 100);
  }

  // 守则 / 申请表覆盖层
  const shroud = document.getElementById('menu-ov-shroud');
  const ovHandbook = document.getElementById('menu-ov-handbook');
  const ovRequest = document.getElementById('menu-ov-request');
  const handbookObj = document.getElementById('menu-handbook');
  const requestObj = document.getElementById('menu-request-pad');
  const tutorialBtn2 = document.getElementById('menu-tutorial-btn') as HTMLButtonElement | null;
  const settingsBtn2 = document.getElementById('menu-settings-btn') as HTMLButtonElement | null;

  // Stage 5 · 申请表 = 原 SettingsPanel 视觉改造，调整即时生效
  const populateRequestForm = (): void => {
    const s = getSettings();
    // 音量滑条
    const slider = document.getElementById('ws-vol') as HTMLInputElement | null;
    const sliderVal = document.getElementById('ws-vol-val');
    if (slider) {
      slider.value = String(Math.round(s.masterVolume * 100));
      if (sliderVal) sliderVal.textContent = `${slider.value}%`;
    }
    // 音乐(底乐)滑条
    const musicSlider = document.getElementById('ws-music') as HTMLInputElement | null;
    const musicSliderVal = document.getElementById('ws-music-val');
    if (musicSlider) {
      musicSlider.value = String(Math.round(s.musicVolume * 100));
      if (musicSliderVal) musicSliderVal.textContent = `${musicSlider.value}%`;
    }
    setRadio('ws-lang', s.locale);
    setRadio('ws-crt', s.crtEnabled ? '1' : '0');
    setRadio('ws-bg', s.backgroundMode);
  };

  // 滑条 + radio 实时绑定（首次 setupDeskMenu 时绑定一次即可）
  const volSlider = document.getElementById('ws-vol') as HTMLInputElement | null;
  const volSliderVal = document.getElementById('ws-vol-val');
  if (volSlider) {
    volSlider.addEventListener('input', () => {
      const v = parseInt(volSlider.value, 10) / 100;
      if (volSliderVal) volSliderVal.textContent = `${volSlider.value}%`;
      setMasterVolume(v);
      updateSettings({ masterVolume: v });
    });
  }
  const musicSlider2 = document.getElementById('ws-music') as HTMLInputElement | null;
  const musicSliderVal2 = document.getElementById('ws-music-val');
  if (musicSlider2) {
    musicSlider2.addEventListener('input', () => {
      const v = parseInt(musicSlider2.value, 10) / 100;
      if (musicSliderVal2) musicSliderVal2.textContent = `${musicSlider2.value}%`;
      setMusicVolume(v);
      updateSettings({ musicVolume: v });
    });
  }
  document.querySelectorAll<HTMLInputElement>('input[name="ws-lang"]').forEach(r => {
    r.addEventListener('change', () => {
      if (!r.checked) return;
      const lang = r.value;
      if (lang !== 'zh' && lang !== 'en') return;
      playDeskSound('paper');
      setLocale(lang as Locale);
      updateSettings({ locale: lang });
      applyHtmlI18n();
    });
  });
  document.querySelectorAll<HTMLInputElement>('input[name="ws-crt"]').forEach(r => {
    r.addEventListener('change', () => {
      if (!r.checked) return;
      playDeskSound('punch');
      const enabled = r.value === '1';
      applyCRT(enabled);
      updateSettings({ crtEnabled: enabled });
    });
  });
  document.querySelectorAll<HTMLInputElement>('input[name="ws-bg"]').forEach(r => {
    r.addEventListener('change', () => {
      if (!r.checked) return;
      playDeskSound('paper');
      const m = r.value as BackgroundMode;
      setBackgroundMode(m);
      updateSettings({ backgroundMode: m });
    });
  });

  const openOverlay = (which: 'handbook' | 'request') => {
    initAudio();
    playDeskSound('paper');
    shroud?.classList.add('show');
    if (which === 'handbook') {
      if (menuMetaRef) renderHandbook(menuMetaRef);  // 动态注入 layers (含未来 tab 切换)
      ovHandbook?.classList.add('show');
    }
    else {
      populateRequestForm();
      ovRequest?.classList.add('show');
    }
  };
  const closeOverlay = () => {
    shroud?.classList.remove('show');
    ovHandbook?.classList.remove('show');
    ovRequest?.classList.remove('show');
    // 关闭后焦点回到打卡输入
    punchInput?.focus();
  };

  handbookObj?.addEventListener('click', () => openOverlay('handbook'));
  requestObj?.addEventListener('click', () => openOverlay('request'));
  shroud?.addEventListener('click', closeOverlay);

  // ESC 关闭覆盖层
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (ovHandbook?.classList.contains('show') || ovRequest?.classList.contains('show'))) {
      closeOverlay();
    }
  });

  // 守则 ACK → 章音 → 按钮文字变"调档中" → overlay 收回 + whoosh → 教程
  // 静态注释告诉玩家"会去培训科"，转场动画兑现这个承诺
  // 事件委托：ACK 按钮由 renderHandbook 动态生成，监听挂在 overlay 容器上以幸存重绘
  ovHandbook?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const ackBtn = target.closest('#menu-ov-handbook-ack') as HTMLButtonElement | null;
    if (!ackBtn) return;
    e.stopPropagation();
    if (ackBtn.disabled) return;
    ackBtn.disabled = true;
    const originalText = ackBtn.textContent;
    ackBtn.textContent = t('hb.routing_text');
    playDeskSound('stamp');

    setTimeout(() => {
      closeOverlay();              // 触发 overlay scale-down + fade-out (0.4s)
      playDeskSound('whoosh');
      setTimeout(() => {
        ackBtn.disabled = false;
        ackBtn.textContent = originalText;
        tutorialBtn2?.click();
      }, 420);
    }, 380);
  });

  // 申请表 SUBMIT → 仅关闭（更改在交互时即时生效）
  document.getElementById('menu-ov-request-submit')?.addEventListener('click', (e) => {
    e.stopPropagation();
    playDeskSound('stamp');
    closeOverlay();
  });

  // 申请表 RESET → 复用 SettingsPanel 的 reset 行为：confirm + clear localStorage + reload
  document.getElementById('menu-ov-request-reset')?.addEventListener('click', (e) => {
    e.stopPropagation();
    playSound('warning');
    if (confirm(t('settings.reset_confirm'))) {
      localStorage.clear();
      window.location.reload();
    }
  });
  // settingsBtn2 不再被使用（申请表已是真实 settings 入口）；保留隐藏 DOM 兼容性
  void settingsBtn2;
}

function setRadio(name: string, value: string): void {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
}

/** 更新主菜单底部信息 */
function updateMenuInfo(): void {
  const infoEl = document.getElementById('menu-info');
  if (infoEl) {
    const parts: string[] = ['v0.2'];
    if (state.ascensionLevel > 0) parts.push(`GRADE A${state.ascensionLevel}`);
    infoEl.textContent = parts.join(' · ');
  }

  // 提交人字段（Layer 3）— 把玩家身份焊进档案
  const stats = menuMetaRef?.getStats();
  const days = stats ? Math.max(1, Math.ceil(stats.totalPlayTime / 86_400_000) + Math.floor(stats.totalRuns / 3)) : 0;
  const archived = stats?.victories ?? 0;
  const pending = stats ? Math.max(0, stats.totalRuns - stats.victories) : 0;
  const fmt = (n: number) => n.toString().padStart(2, '0');
  const setText = (id: string, val: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setText('menu-applicant-days', fmt(days));
  setText('menu-applicant-archived', fmt(archived));
  setText('menu-applicant-pending', fmt(pending));
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
  // 语言切换走 SettingsPanel（不再需要悬浮 #lang-toggle 按钮，去除冗余）

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void init());
  } else {
    void init();
  }
}
