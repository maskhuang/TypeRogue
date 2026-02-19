// ============================================
// 打字肉鸽 - Prototype v9
// Word Deck Building + Relics System
// ============================================

const state = {
    level: 1,
    phase: 'battle', // battle | shop | gameover | victory
    time: 30,
    timeMax: 30,
    score: 0,
    targetScore: 100,
    combo: 0,
    maxCombo: 0,
    multiplier: 1.0,
    wordScore: 0,
    gold: 0,
    wordPerfect: true,    // 当前词语是否完美（无错误）
    lastMilestone: 0,     // 上次触发的连击里程碑
    player: {
        word: '',
        index: 0,
        bindings: new Map(),
        skills: new Map(),
        relics: new Set(),
        wordDeck: [],  // 玩家的词语牌库
        // 被动加成
        baseMultiplier: 1.0,
        comboBonus: 0.1,
        wordBonus: 0,
        timeBonus: 0,
        letterBonus: 0,
    },
    shop: {
        rewards: [],
        shopWords: [],  // 商店中出售的词语
        shopSkills: [],  // 商店中出售的技能
        shopRelics: [],  // 商店中出售的遗物
        selectedSkill: null,
        selectedKey: null,
        tab: 'skills', // skills | relics | deck
        removeCount: 0, // 本次商店删除词语次数（逐次递增费用）
    }
};

// === 技能定义 ===
const SKILLS = {
    // 基础分数技能
    spark:  { name: '火花', icon: '✨', type: 'score', base: 3, grow: 1, desc: '触发时+3分' },
    burst:  { name: '爆发', icon: '💥', type: 'score', base: 5, grow: 2, desc: '触发时+5分' },
    star:   { name: '星光', icon: '⭐', type: 'score', base: 8, grow: 3, desc: '触发时+8分' },

    // 倍率技能
    amp:    { name: '增幅', icon: '📈', type: 'multiply', base: 20, grow: 5, desc: '触发时倍率+0.2' },
    surge:  { name: '激涌', icon: '⚡', type: 'multiply', base: 30, grow: 8, desc: '触发时倍率+0.3' },

    // 时间技能
    clock:  { name: '时钟', icon: '⏰', type: 'time', base: 1, grow: 0.5, desc: '触发时+1秒' },
    freeze: { name: '冻结', icon: '❄️', type: 'time', base: 2, grow: 0.5, desc: '触发时+2秒' },

    // 连击技能
    chain:  { name: '连锁', icon: '🔗', type: 'combo', base: 5, grow: 2, desc: '触发时连击+5' },
    shield: { name: '护盾', icon: '🛡️', type: 'protect', base: 1, grow: 1, desc: '打错时保护连击(1次)' },

    // === 联动技能 ===
    core:   { name: '能量核心', icon: '💎', type: 'core', base: 2, grow: 1,
              desc: '每个相邻技能+2分' },
    aura:   { name: '光环', icon: '🔆', type: 'aura', base: 15, grow: 5,
              desc: '相邻分数技能+50%' },
    lone:   { name: '孤狼', icon: '🐺', type: 'lone', base: 6, grow: 2,
              desc: '无相邻技能时分数x2' },
    echo:   { name: '共鸣', icon: '🔔', type: 'echo', base: 0, grow: 0,
              desc: '相邻技能触发时30%概率触发' },
    void:   { name: '虚空', icon: '🌑', type: 'void', base: 3, grow: 1,
              desc: '每个相邻空位+3分' },
    ripple: { name: '涟漪', icon: '🌊', type: 'ripple', base: 2, grow: 1,
              desc: '相邻技能下次+50%效果' },
};

// 属性升级
const STATS = [
    { id: 'base_mult', name: '基础倍率', icon: '📊', desc: '基础倍率+0.2', cost: 30,
      fn: () => { state.player.baseMultiplier += 0.2; } },
    { id: 'combo_bonus', name: '连击强化', icon: '🔥', desc: '连击倍率+0.05', cost: 25,
      fn: () => { state.player.comboBonus += 0.05; } },
    { id: 'word_bonus', name: '词语奖励', icon: '📝', desc: '完成词语+5分', cost: 20,
      fn: () => { state.player.wordBonus += 5; } },
    { id: 'time_bonus', name: '额外时间', icon: '⏱️', desc: '每关+3秒', cost: 35,
      fn: () => { state.player.timeBonus += 3; } },
    { id: 'letter_bonus', name: '字母加成', icon: '🔤', desc: '每字母+0.5分', cost: 40,
      fn: () => { state.player.letterBonus += 0.5; } },
];

// 键盘布局
const KEYBOARD_ROWS = [
    'qwertyuiop'.split(''),
    'asdfghjkl'.split(''),
    'zxcvbnm'.split('')
];
const KEYS = KEYBOARD_ROWS.flat();

// 键盘相邻关系
const ADJACENT_KEYS = {
    q: ['w', 'a'], w: ['q', 'e', 'a', 's'], e: ['w', 'r', 's', 'd'],
    r: ['e', 't', 'd', 'f'], t: ['r', 'y', 'f', 'g'], y: ['t', 'u', 'g', 'h'],
    u: ['y', 'i', 'h', 'j'], i: ['u', 'o', 'j', 'k'], o: ['i', 'p', 'k', 'l'], p: ['o', 'l'],
    a: ['q', 'w', 's', 'z'], s: ['a', 'w', 'e', 'd', 'z', 'x'],
    d: ['s', 'e', 'r', 'f', 'x', 'c'], f: ['d', 'r', 't', 'g', 'c', 'v'],
    g: ['f', 't', 'y', 'h', 'v', 'b'], h: ['g', 'y', 'u', 'j', 'b', 'n'],
    j: ['h', 'u', 'i', 'k', 'n', 'm'], k: ['j', 'i', 'o', 'l', 'm'], l: ['k', 'o', 'p'],
    z: ['a', 's', 'x'], x: ['z', 's', 'd', 'c'], c: ['x', 'd', 'f', 'v'],
    v: ['c', 'f', 'g', 'b'], b: ['v', 'g', 'h', 'n'], n: ['b', 'h', 'j', 'm'], m: ['n', 'j', 'k'],
};

// ============================================
// 词库系统 - 玩家可构筑的词语牌库
// ============================================

// 所有可购买的词语池
const WORD_POOL = {
    // 基础词 (初始拥有)
    starter: {
        words: 'fire ice bolt spark flame frost storm flash light dark'.split(' '),
        cost: 0, tier: 0
    },
    // 常见词 (便宜)
    common: {
        words: 'burn heat cold snow wind rain wave rock dust sand gold iron steel blade sword shield guard strike slash attack block rush dash jump spin flow glow beam ray cast'.split(' '),
        cost: 5, tier: 1
    },
    // 技能词 - F系列
    f_words: {
        words: 'fire flame flash frost fury forge fuel fuse flare fever fierce force flood fall fast fade fear fate fame face'.split(' '),
        cost: 8, tier: 2, highlight: 'f'
    },
    // 技能词 - S系列
    s_words: {
        words: 'storm spark strike slash shield surge spark steel swift skill spell spin speed shade shine shock snow soul'.split(' '),
        cost: 8, tier: 2, highlight: 's'
    },
    // 技能词 - T系列
    t_words: {
        words: 'thunder tide torch twist turn tide test tech trap true time tide tear tank trek torch tower'.split(' '),
        cost: 8, tier: 2, highlight: 't'
    },
    // 技能词 - E系列
    e_words: {
        words: 'ember edge echo elite energy earth ever evil eye ease each east edge emit etch even'.split(' '),
        cost: 8, tier: 2, highlight: 'e'
    },
    // 短词 (高速)
    short: {
        words: 'go up do if or an at by no on so to ax ox it is as we he me be'.split(' '),
        cost: 10, tier: 2
    },
    // 中等词
    medium: {
        words: 'dragon phoenix serpent thunder crystal shadow knight wizard archer hunter ranger spirit demon beast'.split(' '),
        cost: 12, tier: 3
    },
    // 高分长词
    long: {
        words: 'extraordinary magnificent spectacular incredible tremendous overwhelming catastrophic revolutionary'.split(' '),
        cost: 20, tier: 4
    }
};

// 计算词库统计
function calculateDeckStats(wordDeck) {
    const freq = {};
    let totalLetters = 0;
    let totalWords = wordDeck.length;
    let avgLength = 0;

    for (const word of wordDeck) {
        avgLength += word.length;
        for (const char of word.toLowerCase()) {
            if (/[a-z]/.test(char)) {
                freq[char] = (freq[char] || 0) + 1;
                totalLetters++;
            }
        }
    }

    avgLength = totalWords > 0 ? (avgLength / totalWords).toFixed(1) : 0;

    // 转换为百分比并排序
    const freqPercent = {};
    for (const key in freq) {
        freqPercent[key] = Math.round(freq[key] / totalLetters * 100);
    }

    // 排序获取高频字母
    const sorted = Object.entries(freqPercent)
        .sort((a, b) => b[1] - a[1]);

    return {
        totalWords,
        totalLetters,
        avgLength,
        freq: freqPercent,
        topLetters: sorted.slice(0, 8)
    };
}

// 获取当前词库词汇
function getActiveWords() {
    return state.player.wordDeck.length > 0 ? state.player.wordDeck : WORD_POOL.starter.words;
}

// 生成商店可购买的词语
function generateShopWords() {
    const available = [];
    const owned = new Set(state.player.wordDeck);

    for (const [poolId, pool] of Object.entries(WORD_POOL)) {
        if (pool.tier === 0) continue; // 跳过初始词
        for (const word of pool.words) {
            if (!owned.has(word)) {
                available.push({
                    word,
                    cost: pool.cost + Math.floor(word.length / 2),
                    highlight: pool.highlight || null
                });
            }
        }
    }

    // 随机选择一些词
    return available.sort(() => Math.random() - 0.5).slice(0, 8);
}

// ============================================
// 遗物系统
// ============================================
const RELICS = {
    // 分数类遗物
    golden_pen: {
        name: '黄金钢笔',
        icon: '🖊️',
        desc: '每个字母+0.5基础分',
        cost: 40,
        rarity: 'common',
        onAcquire: () => { state.player.letterBonus += 0.5; }
    },
    lucky_coin: {
        name: '幸运硬币',
        icon: '🪙',
        desc: '完成词语+10分',
        cost: 35,
        rarity: 'common',
        onAcquire: () => { state.player.wordBonus += 10; }
    },
    crown: {
        name: '王冠',
        icon: '👑',
        desc: '基础倍率+0.5',
        cost: 60,
        rarity: 'rare',
        onAcquire: () => { state.player.baseMultiplier += 0.5; }
    },

    // 连击类遗物
    combo_ring: {
        name: '连击之戒',
        icon: '💍',
        desc: '连击倍率+0.05',
        cost: 45,
        rarity: 'common',
        onAcquire: () => { state.player.comboBonus += 0.05; }
    },
    phoenix_feather: {
        name: '凤凰羽毛',
        icon: '🪶',
        desc: '打错时50%几率不断连击',
        cost: 55,
        rarity: 'rare',
        effect: 'combo_save'
    },
    berserker_mask: {
        name: '狂战士面具',
        icon: '👹',
        desc: '连击>20时，分数+50%',
        cost: 50,
        rarity: 'rare',
        effect: 'berserker'
    },

    // 时间类遗物
    hourglass: {
        name: '沙漏',
        icon: '⏳',
        desc: '每关+5秒',
        cost: 50,
        rarity: 'common',
        onAcquire: () => { state.player.timeBonus += 5; }
    },
    time_crystal: {
        name: '时间水晶',
        icon: '💎',
        desc: '完成词语+0.5秒',
        cost: 65,
        rarity: 'rare',
        effect: 'word_time'
    },

    // 技能类遗物
    amplifier: {
        name: '增幅器',
        icon: '📡',
        desc: '所有技能效果+30%',
        cost: 70,
        rarity: 'epic',
        effect: 'skill_boost'
    },
    echo_stone: {
        name: '回响石',
        icon: '🔮',
        desc: '技能有20%几率触发两次',
        cost: 60,
        rarity: 'rare',
        effect: 'double_trigger'
    },
    magnet: {
        name: '磁石',
        icon: '🧲',
        desc: '词语更常包含绑定技能的字母',
        cost: 45,
        rarity: 'common',
        effect: 'word_magnet'
    },

    // 金币类遗物
    piggy_bank: {
        name: '存钱罐',
        icon: '🐷',
        desc: '每关开始+5金币',
        cost: 40,
        rarity: 'common',
        effect: 'level_gold'
    },
    treasure_map: {
        name: '藏宝图',
        icon: '🗺️',
        desc: '超额奖励翻倍',
        cost: 55,
        rarity: 'rare',
        effect: 'bonus_double'
    },

    // 特殊遗物
    perfectionist: {
        name: '完美主义',
        icon: '✅',
        desc: '不打错时倍率+0.01/字母',
        cost: 50,
        rarity: 'rare',
        effect: 'perfect_bonus'
    },
    rainbow_gem: {
        name: '彩虹宝石',
        icon: '💠',
        desc: '联动技能效果+50%',
        cost: 65,
        rarity: 'epic',
        effect: 'synergy_boost'
    },
};

// 检查遗物效果
function hasRelic(relicId) {
    return state.player.relics.has(relicId);
}

function getRelicEffect(effectName) {
    for (const [id, relic] of Object.entries(RELICS)) {
        if (relic.effect === effectName && state.player.relics.has(id)) {
            return true;
        }
    }
    return false;
}

// DOM元素
const el = {
    battleScreen: document.getElementById('battle-screen'),
    shopScreen: document.getElementById('shop-screen'),
    gameoverScreen: document.getElementById('gameover-screen'),
    word: document.getElementById('word-display'),
    feedback: document.getElementById('input-feedback'),
    combo: document.getElementById('combo-count'),
    score: document.getElementById('score-count'),
    targetScore: document.getElementById('target-score'),
    multiplier: document.getElementById('multiplier-display'),
    timerDisplay: document.getElementById('timer-display'),
    timerBar: document.getElementById('timer-bar-fill'),
    levelLabel: document.getElementById('level-label'),
    battleSkills: document.getElementById('battle-skills'),
    triggerZone: document.getElementById('skill-trigger-zone'),
    particles: document.getElementById('particles'),
    container: document.getElementById('game-container'),
    playerRelics: document.getElementById('player-relics'),
    activeLibrary: document.getElementById('active-library'),
    // Shop
    shopLevelNum: document.getElementById('shop-level-num'),
    shopScore: document.getElementById('shop-score'),
    shopTarget: document.getElementById('shop-target'),
    shopBonus: document.getElementById('shop-bonus'),
    shopGold: document.getElementById('shop-gold'),
    shopTabs: document.getElementById('shop-tabs'),
    rewardCards: document.getElementById('reward-cards'),
    boundGrid: document.getElementById('bound-grid'),
    ownedSkills: document.getElementById('owned-skills'),
    shopRelicIcons: document.getElementById('shop-relic-icons'),
    startBattleBtn: document.getElementById('start-battle-btn'),
    // Gameover
    gameoverStats: document.getElementById('gameover-stats'),
};

// 联动系统
const synergy = {
    rippleBonus: new Map(),
    echoTrigger: new Set(),
    shieldCount: 0,
    perfectStreak: 0, // 完美主义遗物：连续正确字母数
};

// 音效
let audio = null;
const initAudio = () => { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); };
function sound(type) {
    if (!audio) return;
    const o = audio.createOscillator(), g = audio.createGain();
    o.connect(g); g.connect(audio.destination);
    const t = audio.currentTime;
    const profiles = {
        type: [500 + state.combo * 15, 800, 0.06],
        wrong: [150, 80, 0.1],
        skill: [450, 850, 0.12],
        word: [523, 784, 0.15],
        levelup: [400, 800, 0.15],
        gameover: [300, 100, 0.2],
    };
    const p = profiles[type] || [600, 800, 0.08];
    o.frequency.setValueAtTime(p[0], t);
    o.frequency.exponentialRampToValueAtTime(p[1], t + 0.1);
    g.gain.setValueAtTime(p[2], t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    o.start(t); o.stop(t + 0.15);
}

// === Balatro 风格 Juice 动画系统 ===
function juiceUp(element, scale = 0.3, rotation = 3) {
    if (!element) return;
    element.style.setProperty('--juice-rot', `${rotation}deg`);
    element.classList.remove('juice-up', 'juice-up-strong');
    void element.offsetWidth; // 强制重排
    element.classList.add(scale > 0.3 ? 'juice-up-strong' : 'juice-up');
}

function juiceUpStrong(element) {
    juiceUp(element, 0.4, 5);
}

// 连击数字弹跳
function bumpCombo() {
    el.combo.classList.remove('combo-bump');
    void el.combo.offsetWidth;
    el.combo.classList.add('combo-bump');
}

// 分数数字弹跳
function bumpScore() {
    el.score.classList.remove('score-bump');
    void el.score.offsetWidth;
    el.score.classList.add('score-bump');
}

// 倍率弹跳
function bumpMultiplier() {
    el.multiplier.classList.remove('mult-bump');
    void el.multiplier.offsetWidth;
    el.multiplier.classList.add('mult-bump');
}

// === 爽感特效系统 ===

// 1. 连击里程碑特效 (测试用低数值)
const COMBO_MILESTONES = [3, 6, 10, 15, 20];
const MILESTONE_TEXT = {
    3: 'NICE!',
    6: 'GREAT!',
    10: 'AMAZING!',
    15: 'INCREDIBLE!',
    20: 'LEGENDARY!'
};

function checkComboMilestone() {
    for (const milestone of COMBO_MILESTONES) {
        if (state.combo >= milestone && state.lastMilestone < milestone) {
            state.lastMilestone = milestone;
            showMilestone(milestone);
            return;
        }
    }
}

function showMilestone(milestone) {
    const text = MILESTONE_TEXT[milestone] || `${milestone} COMBO!`;
    const colors = {
        3: '#4ecdc4',
        6: '#ffe66d',
        10: '#ff6b6b',
        15: '#e056fd',
        20: '#f39c12'
    };

    const popup = document.createElement('div');
    popup.className = 'milestone-popup';
    popup.innerHTML = `
        <div class="milestone-text" style="color: ${colors[milestone] || '#fff'}">${text}</div>
        <div class="milestone-combo">${milestone} COMBO</div>
    `;
    el.container.appendChild(popup);

    // 屏幕闪光
    screenFlash(colors[milestone] || '#fff');

    // 强烈震动
    screenShake(3);

    setTimeout(() => popup.remove(), 1200);
}

// 2. 完美词语特效
function showPerfect() {
    const popup = document.createElement('div');
    popup.className = 'perfect-popup';
    popup.textContent = 'PERFECT!';
    el.container.appendChild(popup);

    screenFlash('#ffe66d', 0.3);

    setTimeout(() => popup.remove(), 800);
}

// 4. 分级屏幕震动
function screenShake(intensity = 1) {
    el.container.style.setProperty('--shake-x', `${3 * intensity}px`);
    el.container.style.setProperty('--shake-y', `${2 * intensity}px`);
    el.container.classList.remove('shake-dynamic');
    void el.container.offsetWidth;
    el.container.classList.add('shake-dynamic');
    setTimeout(() => el.container.classList.remove('shake-dynamic'), 150 * intensity);
}

// 屏幕闪光
function screenFlash(color, opacity = 0.4) {
    const flash = document.createElement('div');
    flash.className = 'screen-flash';
    flash.style.background = color;
    flash.style.opacity = opacity;
    el.container.appendChild(flash);
    setTimeout(() => flash.remove(), 200);
}

// 5. 倍率视觉反馈
function updateMultiplierGlow() {
    const mult = state.multiplier;

    // 更低门槛：1.5 开始有反馈，2.5 进入高倍率模式
    if (mult >= 2.5) {
        el.container.classList.add('high-mult');
        el.container.classList.remove('mid-mult');
    } else if (mult >= 1.5) {
        el.container.classList.add('mid-mult');
        el.container.classList.remove('high-mult');
    } else {
        el.container.classList.remove('mid-mult', 'high-mult');
    }
}

// 3D 卡牌悬停效果 (用于商店卡牌)
function init3DCardEffect(card) {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / centerY * -8;
        const rotateY = (x - centerX) / centerX * 8;
        card.style.transform = `scale(1.03) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
    });
}

// === 屏幕管理 ===
function showScreen(name) {
    el.battleScreen.style.display = name === 'battle' ? 'flex' : 'none';
    el.shopScreen.style.display = name === 'shop' ? 'flex' : 'none';
    el.gameoverScreen.style.display = name === 'gameover' ? 'flex' : 'none';
}

// === 词语系统 ===
function pickWord() {
    const words = getActiveWords();
    const bound = [...state.player.bindings.keys()];

    // 磁石遗物：更高几率选择包含技能字母的词
    const magnetChance = hasRelic('magnet') ? 0.8 : 0.6;

    if (bound.length && Math.random() < magnetChance) {
        const good = words.filter(w => bound.some(l => w.includes(l)));
        if (good.length) return good[Math.floor(Math.random() * good.length)].toUpperCase();
    }
    return words[Math.floor(Math.random() * words.length)].toUpperCase();
}

function setWord() {
    state.player.word = pickWord();
    state.player.index = 0;
    state.wordScore = 0;
    state.wordPerfect = true;  // 重置完美状态
    synergy.echoTrigger.clear();
    renderWord();
}

function renderWord() {
    const s = state.player;
    el.word.innerHTML = '';
    for (let i = 0; i < s.word.length; i++) {
        const span = document.createElement('span');
        span.className = 'letter letter-enter';
        span.textContent = s.word[i];
        // 入场动画延迟
        span.style.animationDelay = `${i * 0.03}s`;
        if (i < s.index) span.classList.add('correct');
        else if (i === s.index) span.classList.add('current');
        else span.classList.add('pending');
        if (s.bindings.has(s.word[i].toLowerCase())) span.classList.add('has-skill');
        el.word.appendChild(span);
    }
}

// === 输入处理 ===
document.addEventListener('keydown', e => {
    if (state.phase !== 'battle') return;
    initAudio();
    const k = e.key.toLowerCase();
    if (!/^[a-z]$/.test(k)) return;
    const expect = state.player.word[state.player.index]?.toLowerCase();
    if (k === expect) playerCorrect(k);
    else playerWrong();
});

function playerCorrect(k) {
    const letter = el.word.children[state.player.index];
    const skillId = state.player.bindings.get(k);

    letter.classList.remove('current');
    letter.classList.add('correct');

    // Juice 动画 - 字母弹跳
    juiceUp(letter, 0.2, 2);

    // 连击增加
    state.combo++;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    bumpCombo();

    // 完美主义遗物：连续正确累计
    synergy.perfectStreak++;

    // 计算倍率: 基础 + 连击加成 + 完美主义加成
    let mult = state.player.baseMultiplier + state.combo * state.player.comboBonus;
    if (hasRelic('perfectionist')) {
        mult += synergy.perfectStreak * 0.01;
    }
    state.multiplier = mult;

    // 字母基础分 + 字母加成
    const letterScore = (1 + state.player.letterBonus) * state.multiplier;
    state.wordScore += letterScore;

    // 触发技能
    if (skillId) {
        letter.classList.add('skill-triggered');
        juiceUpStrong(letter);  // 技能触发 - 强力弹跳
        bumpMultiplier();
        triggerSkill(skillId, k);
    }

    particles(letter, skillId ? 10 : 5, '#4ecdc4');
    sound('type');

    state.player.index++;

    // 完成词语
    if (state.player.index >= state.player.word.length) {
        completeWord();
    } else {
        el.word.children[state.player.index]?.classList.remove('pending');
        el.word.children[state.player.index]?.classList.add('current');
    }

    updateHUD();
}

function playerWrong() {
    const letter = el.word.children[state.player.index];
    letter?.classList.add('wrong');
    setTimeout(() => letter?.classList.remove('wrong'), 150);

    el.container.classList.add('shake');
    setTimeout(() => el.container.classList.remove('shake'), 120);

    sound('wrong');

    // 护盾保护
    if (synergy.shieldCount > 0) {
        synergy.shieldCount--;
        showFeedback('护盾保护!', '#87ceeb');
        return;
    }

    // 凤凰羽毛遗物：50%几率保护连击
    if (hasRelic('phoenix_feather') && Math.random() < 0.5) {
        showFeedback('凤凰羽毛!', '#ff9500');
        return;
    }

    // 完美主义遗物：重置完美计数
    synergy.perfectStreak = 0;

    // 标记词语不完美
    state.wordPerfect = false;

    if (state.combo > 5) showFeedback(`${state.combo}× 断了!`, '#ff6b6b');
    state.combo = 0;
    state.lastMilestone = 0;  // 重置里程碑
    state.multiplier = state.player.baseMultiplier;
    updateHUD();
}

function completeWord() {
    // 词语完成奖励
    let wordBonus = state.player.wordBonus;
    let finalWordScore = state.wordScore + wordBonus;

    // 狂战士面具：连击>20时分数+50%
    if (hasRelic('berserker_mask') && state.combo > 20) {
        finalWordScore *= 1.5;
    }

    finalWordScore = Math.floor(finalWordScore);
    state.score += finalWordScore;
    showScorePopup(finalWordScore);
    bumpScore();  // 分数弹跳动画

    // 时间水晶遗物：完成词语+0.5秒
    if (hasRelic('time_crystal')) {
        state.time = Math.min(state.time + 0.5, state.timeMax + state.player.timeBonus + 5);
    }

    // 词语完成 - 所有字母一起弹跳
    Array.from(el.word.children).forEach((letter, i) => {
        setTimeout(() => juiceUp(letter, 0.25, 4 * (i % 2 === 0 ? 1 : -1)), i * 30);
    });

    // 分级屏幕震动 - 分数越高震越猛 (测试用低阈值)
    const shakeIntensity = finalWordScore >= 20 ? 3 : finalWordScore >= 10 ? 2 : 1;
    screenShake(shakeIntensity);

    sound('word');

    // 检查是否达成目标
    checkLevelProgress();

    setTimeout(() => {
        if (state.phase === 'battle') setWord();
    }, 200);
}

// === 技能系统 ===
function getAdjacentSkills(key) {
    const adjacent = ADJACENT_KEYS[key] || [];
    const skills = [];
    for (const adjKey of adjacent) {
        const skillId = state.player.bindings.get(adjKey);
        if (skillId) skills.push({ key: adjKey, skillId, skill: SKILLS[skillId] });
    }
    return skills;
}

function getAdjacentEmptyCount(key) {
    const adjacent = ADJACENT_KEYS[key] || [];
    return adjacent.filter(k => !state.player.bindings.has(k)).length;
}

function triggerSkill(skillId, triggerKey, isEcho = false) {
    const base = SKILLS[skillId];
    const lvl = state.player.skills.get(skillId)?.level || 1;
    let val = base.base + base.grow * (lvl - 1);

    const adjacent = getAdjacentSkills(triggerKey);
    const emptyCount = getAdjacentEmptyCount(triggerKey);

    // 光环加成
    if (base.type === 'score') {
        const auraBonus = adjacent.filter(a => a.skill.type === 'aura').length;
        if (auraBonus > 0) val = Math.floor(val * 1.5);
    }

    // 涟漪加成
    if (synergy.rippleBonus.has(triggerKey)) {
        val = Math.floor(val * 1.5);
        synergy.rippleBonus.delete(triggerKey);
    }

    showTriggerPopup(skillId);
    highlightBound(skillId);
    sound('skill');

    switch (base.type) {
        case 'score':
            state.wordScore += val * state.multiplier;
            showFeedback(`+${Math.floor(val * state.multiplier)}分`, '#4ecdc4');
            break;

        case 'multiply':
            state.multiplier += val / 100;
            showFeedback(`倍率+${(val/100).toFixed(1)}`, '#ffe66d');
            break;

        case 'time':
            state.time = Math.min(state.time + val, state.timeMax + 10);
            showFeedback(`+${val}秒`, '#87ceeb');
            break;

        case 'combo':
            state.combo += val;
            state.multiplier = state.player.baseMultiplier + state.combo * state.player.comboBonus;
            showFeedback(`连击+${val}`, '#ff6b6b');
            break;

        case 'protect':
            synergy.shieldCount += val;
            showFeedback(`护盾+${val}`, '#87ceeb');
            break;

        // 联动技能
        case 'core':
            const coreScore = val + adjacent.length * 2;
            state.wordScore += coreScore * state.multiplier;
            showFeedback(`核心+${Math.floor(coreScore * state.multiplier)}`, '#9b59b6');
            break;

        case 'aura':
            // 被动效果，自身触发小分数
            state.wordScore += val / 3 * state.multiplier;
            break;

        case 'lone':
            const loneScore = adjacent.length === 0 ? val * 2 : val;
            state.wordScore += loneScore * state.multiplier;
            if (adjacent.length === 0) {
                showFeedback(`孤狼x2! +${Math.floor(loneScore * state.multiplier)}`, '#e74c3c');
            }
            break;

        case 'echo':
            if (!isEcho) {
                for (const adj of adjacent) {
                    setTimeout(() => {
                        if (state.phase === 'battle') {
                            triggerSkill(adj.skillId, adj.key, true);
                        }
                    }, 100);
                }
                showFeedback('共鸣!', '#e056fd');
            }
            break;

        case 'void':
            const voidScore = val + emptyCount * 3;
            state.wordScore += voidScore * state.multiplier;
            showFeedback(`虚空+${Math.floor(voidScore * state.multiplier)}`, '#2c3e50');
            break;

        case 'ripple':
            state.wordScore += val * state.multiplier;
            for (const adj of adjacent) {
                synergy.rippleBonus.set(adj.key, 1.5);
            }
            showFeedback(`涟漪→${adjacent.length}`, '#3498db');
            break;
    }

    // 共鸣被动
    if (!isEcho) {
        const adjacentEchoes = adjacent.filter(a => a.skill.type === 'echo');
        for (const echoAdj of adjacentEchoes) {
            if (!synergy.echoTrigger.has(echoAdj.key) && Math.random() < 0.3) {
                synergy.echoTrigger.add(echoAdj.key);
                setTimeout(() => {
                    if (state.phase === 'battle') {
                        triggerSkill(echoAdj.skillId, echoAdj.key, true);
                    }
                }, 150);
            }
        }
    }

    updateHUD();
}

// === 计时器 ===
let timerInterval = null;

function startTimer() {
    state.time = state.timeMax + state.player.timeBonus;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (state.phase !== 'battle') {
            clearInterval(timerInterval);
            return;
        }
        state.time -= 0.1;
        updateTimerDisplay();
        if (state.time <= 0) {
            state.time = 0;
            clearInterval(timerInterval);
            endLevel();
        }
    }, 100);
}

function updateTimerDisplay() {
    const secs = Math.ceil(state.time);
    el.timerDisplay.textContent = secs;
    el.timerBar.style.width = (state.time / (state.timeMax + state.player.timeBonus) * 100) + '%';

    if (state.time <= 5) {
        el.timerDisplay.style.color = '#ff6b6b';
        el.timerBar.style.background = '#ff6b6b';
    } else if (state.time <= 10) {
        el.timerDisplay.style.color = '#ffe66d';
        el.timerBar.style.background = '#ffe66d';
    } else {
        el.timerDisplay.style.color = '#4ecdc4';
        el.timerBar.style.background = '#4ecdc4';
    }
}

// === 关卡系统 ===
function calculateTargetScore(level) {
    // 目标分数随关卡增长
    return Math.floor(80 + level * 40 + level * level * 5);
}

function checkLevelProgress() {
    // 实时检查（可选：提前完成奖励）
}

function endLevel() {
    clearInterval(timerInterval);

    if (state.score >= state.targetScore) {
        // 过关 - 金币在openShop中添加
        openShop(true);
    } else {
        // 失败
        gameOver();
    }
}

function startLevel() {
    state.phase = 'battle';
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.multiplier = state.player.baseMultiplier;
    state.wordScore = 0;
    state.targetScore = calculateTargetScore(state.level);
    synergy.shieldCount = 0;
    synergy.perfectStreak = 0;
    synergy.rippleBonus.clear();
    synergy.echoTrigger.clear();

    el.levelLabel.textContent = `LEVEL ${state.level}`;
    showScreen('battle');
    setWord();
    updateHUD();
    renderBattleSkills();
    renderRelicDisplay();
    renderActiveLibrary();
    announceLevel();
    startTimer();
}

function announceLevel() {
    const ann = document.createElement('div');
    ann.className = 'level-announce';
    ann.innerHTML = `LEVEL ${state.level}<br><span class="target-hint">目标: ${state.targetScore}分</span>`;
    el.container.appendChild(ann);
    sound('levelup');
    setTimeout(() => ann.remove(), 1500);
}

// === 商店 ===
function openShop(won) {
    state.phase = 'shop';

    // 存钱罐遗物：每关开始+5金币
    if (hasRelic('piggy_bank')) {
        state.gold += 5;
    }

    // 藏宝图遗物：超额奖励翻倍
    let bonus = Math.max(0, Math.floor((state.score - state.targetScore) / 10));
    if (hasRelic('treasure_map')) {
        bonus *= 2;
    }
    state.gold += 20 + bonus;

    el.shopLevelNum.textContent = state.level;
    el.shopScore.textContent = state.score;
    el.shopTarget.textContent = state.targetScore;
    el.shopBonus.textContent = bonus > 0 ? `+${bonus}` : '0';
    updateGoldDisplay();

    state.shop.tab = 'skills';
    state.shop.selectedSkill = null;
    state.shop.selectedKey = null;
    state.shop.shopWords = [];  // 重置商店词语
    state.shop.shopSkills = generateShopSkills();  // 生成技能商品
    state.shop.shopRelics = generateShopRelics();  // 生成遗物商品
    state.shop.removeCount = 0; // 重置删除次数

    renderShopTabs();
    renderShopContent();
    renderBuildManager();
    renderRelicDisplay();
    showScreen('shop');
}

function updateGoldDisplay() {
    el.shopGold.textContent = state.gold;
}

function renderShopTabs() {
    const tabsEl = document.getElementById('shop-tabs');
    if (!tabsEl) return;

    tabsEl.innerHTML = `
        <button class="shop-tab ${state.shop.tab === 'skills' ? 'active' : ''}" data-tab="skills">⚡ 技能</button>
        <button class="shop-tab ${state.shop.tab === 'relics' ? 'active' : ''}" data-tab="relics">🏺 遗物</button>
        <button class="shop-tab ${state.shop.tab === 'deck' ? 'active' : ''}" data-tab="deck">📚 牌库</button>
    `;

    tabsEl.querySelectorAll('.shop-tab').forEach(btn => {
        btn.onclick = () => {
            state.shop.tab = btn.dataset.tab;
            renderShopTabs();
            renderShopContent();
        };
    });
}

function renderShopContent() {
    switch (state.shop.tab) {
        case 'skills': renderSkillShop(); break;
        case 'relics': renderRelicShop(); break;
        case 'deck': renderDeckShop(); break;
    }
}

// 生成商店技能（进入商店时调用一次）
function generateShopSkills() {
    const owned = [...state.player.skills.keys()];
    const unowned = Object.keys(SKILLS).filter(id => !owned.includes(id));
    const items = [];

    // 新技能
    const shuffled = unowned.sort(() => Math.random() - 0.5).slice(0, 3);
    shuffled.forEach(skillId => {
        items.push({
            type: 'new',
            skillId,
            cost: 15 + Math.floor(Math.random() * 15)
        });
    });

    // 升级已有技能
    if (owned.length > 0) {
        const upgradeId = owned[Math.floor(Math.random() * owned.length)];
        items.push({
            type: 'upgrade',
            skillId: upgradeId,
            cost: 25
        });
    }

    return items;
}

function renderSkillShop() {
    el.rewardCards.innerHTML = '';

    state.shop.shopSkills.forEach((item, idx) => {
        const sk = SKILLS[item.skillId];
        if (!sk) return;

        // 检查是否已拥有（新技能可能已被购买）
        if (item.type === 'new' && state.player.skills.has(item.skillId)) return;

        if (item.type === 'new') {
            renderShopCard(sk.icon, sk.name, sk.desc, item.cost, '技能', 'new', () => {
                if (buyItem(item.cost)) {
                    state.player.skills.set(item.skillId, { level: 1 });
                    const freeKey = KEYS.find(k => !state.player.bindings.has(k));
                    if (freeKey) state.player.bindings.set(freeKey, item.skillId);
                    renderShopContent();
                    renderBuildManager();
                }
            });
        } else if (item.type === 'upgrade') {
            const lvl = state.player.skills.get(item.skillId)?.level || 1;
            renderShopCard(sk.icon, `${sk.name} → Lv.${lvl + 1}`, '效果提升', item.cost, '升级', 'upgrade', () => {
                if (buyItem(item.cost)) {
                    const data = state.player.skills.get(item.skillId);
                    if (data) data.level++;
                    renderShopContent();
                }
            });
        }
    });

    if (el.rewardCards.children.length === 0) {
        el.rewardCards.innerHTML = '<div class="shop-empty">没有可购买的技能</div>';
    }
}

// 生成商店遗物（进入商店时调用一次）
function generateShopRelics() {
    const ownedRelics = state.player.relics;
    const available = Object.keys(RELICS).filter(id => !ownedRelics.has(id));
    return available.sort(() => Math.random() - 0.5).slice(0, 3);
}

function renderRelicShop() {
    el.rewardCards.innerHTML = '';

    let hasItems = false;
    state.shop.shopRelics.forEach(relicId => {
        // 检查是否已拥有（可能已被购买）
        if (state.player.relics.has(relicId)) return;

        const relic = RELICS[relicId];
        if (!relic) return;

        hasItems = true;
        const rarityClass = relic.rarity || 'common';
        renderShopCard(relic.icon, relic.name, relic.desc, relic.cost, relic.rarity, rarityClass, () => {
            if (buyItem(relic.cost)) {
                state.player.relics.add(relicId);
                if (relic.onAcquire) relic.onAcquire();
                showFeedback(`获得 ${relic.name}!`, '#ffe66d');
                renderShopContent();
                renderRelicDisplay();
            }
        });
    });

    if (!hasItems) {
        el.rewardCards.innerHTML = '<div class="shop-empty">已收集所有遗物!</div>';
    }
}

function renderDeckShop() {
    el.rewardCards.innerHTML = '';

    // 词库统计
    const stats = calculateDeckStats(state.player.wordDeck);
    const boundKeys = [...state.player.bindings.keys()];

    // 统计面板
    const statsPanel = document.createElement('div');
    statsPanel.className = 'deck-stats-panel';
    statsPanel.innerHTML = `
        <div class="deck-stats-header">
            <span>📚 词库统计</span>
            <span class="deck-count">${stats.totalWords} 词</span>
        </div>
        <div class="deck-stats-info">
            <span>平均长度: ${stats.avgLength}</span>
            <span>|</span>
            <span>高频: ${stats.topLetters.slice(0, 5).map(([l, p]) => `<span class="${boundKeys.includes(l) ? 'highlight-letter' : ''}">${l.toUpperCase()}:${p}%</span>`).join(' ')}</span>
        </div>
    `;
    el.rewardCards.appendChild(statsPanel);

    // 购买词语区
    const buySection = document.createElement('div');
    buySection.className = 'deck-section';
    buySection.innerHTML = '<div class="deck-section-title">🛒 购买词语</div>';

    // 生成商店词语（如果还没有）
    if (state.shop.shopWords.length === 0) {
        state.shop.shopWords = generateShopWords();
    }

    const buyGrid = document.createElement('div');
    buyGrid.className = 'word-grid';

    state.shop.shopWords.forEach((item, idx) => {
        const wordCard = document.createElement('div');
        wordCard.className = 'word-card buyable';
        if (item.highlight && boundKeys.includes(item.highlight)) {
            wordCard.classList.add('recommended');
        }

        // 高亮绑定的字母
        const highlightedWord = item.word.split('').map(c =>
            boundKeys.includes(c.toLowerCase()) ? `<span class="bound-letter">${c}</span>` : c
        ).join('');

        wordCard.innerHTML = `
            <span class="word-text">${highlightedWord}</span>
            <span class="word-cost">💰${item.cost}</span>
        `;

        wordCard.onclick = () => {
            if (buyItem(item.cost)) {
                state.player.wordDeck.push(item.word);
                state.shop.shopWords.splice(idx, 1);
                showFeedback(`+${item.word}`, '#4ecdc4');
                renderDeckShop();
            }
        };

        buyGrid.appendChild(wordCard);
    });

    buySection.appendChild(buyGrid);
    el.rewardCards.appendChild(buySection);

    // 当前词库区
    const removeCost = state.shop.removeCount + 1; // 删除费用：1, 2, 3, 4...
    const deckSection = document.createElement('div');
    deckSection.className = 'deck-section';
    deckSection.innerHTML = `<div class="deck-section-title">📖 我的词库 (点击移除，费用: 💰${removeCost})</div>`;

    const deckGrid = document.createElement('div');
    deckGrid.className = 'word-grid deck-grid';

    state.player.wordDeck.forEach((word, idx) => {
        const wordCard = document.createElement('div');
        wordCard.className = 'word-card owned';

        const highlightedWord = word.split('').map(c =>
            boundKeys.includes(c.toLowerCase()) ? `<span class="bound-letter">${c}</span>` : c
        ).join('');

        // 检查是否能支付删除费用
        const canAfford = state.gold >= removeCost;
        if (!canAfford) wordCard.classList.add('cannot-afford');

        wordCard.innerHTML = `<span class="word-text">${highlightedWord}</span><span class="word-cost">-${removeCost}</span>`;

        wordCard.onclick = () => {
            if (state.gold < removeCost) {
                showFeedback('金币不足!', '#ff6b6b');
                return;
            }
            state.player.wordDeck.splice(idx, 1);
            state.gold -= removeCost;
            state.shop.removeCount++; // 下次删除更贵
            updateGoldDisplay();
            showFeedback(`-${word} -${removeCost}💰`, '#ff6b6b');
            renderDeckShop();
        };

        deckGrid.appendChild(wordCard);
    });

    deckSection.appendChild(deckGrid);
    el.rewardCards.appendChild(deckSection);
}

function renderShopCard(icon, name, desc, cost, typeLabel, typeClass, onClick) {
    const card = document.createElement('div');
    card.className = 'reward-card';

    const canAfford = state.gold >= cost;
    if (!canAfford) card.classList.add('cannot-afford');

    card.innerHTML = `
        <div class="reward-icon">${icon}</div>
        <div class="reward-info">
            <div class="reward-name">${name}</div>
            <div class="reward-desc">${desc}</div>
        </div>
        <div class="reward-cost">💰${cost}</div>
        <div class="reward-type ${typeClass}">${typeLabel}</div>
    `;

    // 3D 卡牌悬停效果
    init3DCardEffect(card);

    // 购买时的弹跳动画
    card.onclick = () => {
        juiceUp(card, 0.2, 3);
        onClick();
    };

    el.rewardCards.appendChild(card);
}

function buyItem(cost) {
    if (state.gold < cost) {
        showFeedback('金币不足!', '#ff6b6b');
        return false;
    }
    state.gold -= cost;
    updateGoldDisplay();
    sound('skill');
    return true;
}

function renderRelicDisplay() {
    // 战斗界面遗物
    if (el.playerRelics) {
        el.playerRelics.innerHTML = '';
        state.player.relics.forEach(relicId => {
            const relic = RELICS[relicId];
            if (relic) {
                const span = document.createElement('span');
                span.className = 'relic-icon';
                span.textContent = relic.icon;
                span.title = `${relic.name}: ${relic.desc}`;
                el.playerRelics.appendChild(span);
            }
        });
    }

    // 商店界面遗物
    if (el.shopRelicIcons) {
        el.shopRelicIcons.innerHTML = '';
        state.player.relics.forEach(relicId => {
            const relic = RELICS[relicId];
            if (relic) {
                const span = document.createElement('span');
                span.className = 'relic-icon';
                span.textContent = relic.icon;
                span.title = `${relic.name}: ${relic.desc}`;
                el.shopRelicIcons.appendChild(span);
            }
        });
    }
}

function renderActiveLibrary() {
    if (el.activeLibrary) {
        const deckSize = state.player.wordDeck.length;
        el.activeLibrary.textContent = `📚 ${deckSize}词`;
    }
}


// === 构筑管理 ===
const SYNERGY_TYPES = ['aura', 'core', 'lone', 'echo', 'void', 'ripple'];
function isSynergySkill(skillId) {
    const sk = SKILLS[skillId];
    return sk && SYNERGY_TYPES.includes(sk.type);
}

function renderBuildManager() {
    el.boundGrid.innerHTML = '';

    let adjacentKeys = [];
    if (state.shop.selectedKey) {
        adjacentKeys = ADJACENT_KEYS[state.shop.selectedKey] || [];
    } else if (state.shop.selectedSkill) {
        for (const [k, id] of state.player.bindings) {
            if (id === state.shop.selectedSkill) {
                adjacentKeys = ADJACENT_KEYS[k] || [];
                break;
            }
        }
    }

    KEYBOARD_ROWS.forEach((row, rowIndex) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        rowDiv.dataset.row = rowIndex;

        row.forEach(k => {
            const slot = document.createElement('div');
            slot.className = 'key-slot';
            slot.dataset.key = k;

            const skillId = state.player.bindings.get(k);
            if (skillId && SKILLS[skillId]) {
                const sk = SKILLS[skillId];
                slot.classList.add('has-skill');
                if (isSynergySkill(skillId)) slot.classList.add('synergy-skill');
                slot.innerHTML = `<span class="key-letter">${k.toUpperCase()}</span><span class="key-skill">${sk.icon}</span>`;
            } else {
                slot.innerHTML = `<span class="key-letter">${k.toUpperCase()}</span>`;
            }

            if (state.shop.selectedKey === k) slot.classList.add('selected');
            if (adjacentKeys.includes(k)) slot.classList.add('adjacent-highlight');

            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                clickKeySlot(k);
            });
            rowDiv.appendChild(slot);
        });

        el.boundGrid.appendChild(rowDiv);
    });

    // Owned skills
    el.ownedSkills.innerHTML = '';
    if (state.player.skills.size === 0) {
        el.ownedSkills.innerHTML = '<div style="color:#444;font-size:11px;">购买技能开始构筑</div>';
        return;
    }

    state.player.skills.forEach((data, skillId) => {
        const sk = SKILLS[skillId];
        if (!sk) return;

        const boundKey = [...state.player.bindings.entries()].find(([k, id]) => id === skillId)?.[0];

        const item = document.createElement('div');
        item.className = 'inventory-skill';
        if (boundKey) item.classList.add('bound');
        if (state.shop.selectedSkill === skillId) item.classList.add('selected');
        if (isSynergySkill(skillId)) item.classList.add('synergy');

        item.innerHTML = `
            <span class="inv-icon">${sk.icon}</span>
            <span class="inv-name">${sk.name}</span>
            ${data.level > 1 ? `<span class="inv-level">Lv.${data.level}</span>` : ''}
            ${boundKey ? `<span class="inv-key">[${boundKey.toUpperCase()}]</span>` : ''}
        `;

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            clickSkill(skillId);
        });
        el.ownedSkills.appendChild(item);
    });
}

function clickKeySlot(key) {
    if (state.shop.selectedSkill) {
        const existingSkill = state.player.bindings.get(key);
        const oldKey = [...state.player.bindings.entries()].find(([k, id]) => id === state.shop.selectedSkill)?.[0];
        if (oldKey) state.player.bindings.delete(oldKey);
        if (existingSkill && oldKey) state.player.bindings.set(oldKey, existingSkill);
        state.player.bindings.set(key, state.shop.selectedSkill);
        state.shop.selectedSkill = null;
        state.shop.selectedKey = null;
        sound('skill');
    } else {
        state.shop.selectedKey = state.shop.selectedKey === key ? null : key;
        state.shop.selectedSkill = null;
    }
    renderBuildManager();
}

function clickSkill(skillId) {
    if (state.shop.selectedKey) {
        const oldKey = [...state.player.bindings.entries()].find(([k, id]) => id === skillId)?.[0];
        if (oldKey) state.player.bindings.delete(oldKey);
        const existingSkill = state.player.bindings.get(state.shop.selectedKey);
        if (existingSkill && oldKey) state.player.bindings.set(oldKey, existingSkill);
        state.player.bindings.set(state.shop.selectedKey, skillId);
        state.shop.selectedKey = null;
        state.shop.selectedSkill = null;
        sound('skill');
    } else {
        state.shop.selectedSkill = state.shop.selectedSkill === skillId ? null : skillId;
        state.shop.selectedKey = null;
    }
    renderBuildManager();
}

el.startBattleBtn.onclick = () => {
    state.level++;
    startLevel();
};

// === 游戏结束 ===
function gameOver() {
    state.phase = 'gameover';
    clearInterval(timerInterval);

    el.gameoverStats.innerHTML = `
        到达 Level ${state.level}<br>
        最终得分: ${state.score} / ${state.targetScore}<br>
        最高连击: ${state.maxCombo}<br>
        获得技能: ${state.player.skills.size}
    `;
    showScreen('gameover');
    sound('gameover');
}

document.getElementById('restart-btn').onclick = () => {
    window.location.reload();
};

// === UI更新 ===
function updateHUD() {
    el.combo.textContent = state.combo;
    el.score.textContent = Math.floor(state.score);
    el.targetScore.textContent = state.targetScore;
    el.multiplier.textContent = state.multiplier.toFixed(1);

    // 分数进度颜色
    const progress = state.score / state.targetScore;
    if (progress >= 1) {
        el.score.style.color = '#4ecdc4';
    } else if (progress >= 0.7) {
        el.score.style.color = '#ffe66d';
    } else {
        el.score.style.color = '#fff';
    }

    // 倍率视觉反馈
    updateMultiplierGlow();
}

function renderBattleSkills() {
    el.battleSkills.innerHTML = '';
    let delay = 0;
    state.player.bindings.forEach((skillId, key) => {
        const sk = SKILLS[skillId];
        if (!sk) return;
        const lvl = state.player.skills.get(skillId)?.level || 1;
        const d = document.createElement('div');
        d.className = 'bound-skill card-float';
        d.dataset.id = skillId;
        // 每个技能错开浮动动画
        d.style.animationDelay = `${delay * 0.2}s`;
        d.innerHTML = `<span class="skill-letter">${key.toUpperCase()}</span><span class="skill-icon">${sk.icon}</span>${lvl > 1 ? `<span class="skill-level">Lv.${lvl}</span>` : ''}`;
        el.battleSkills.appendChild(d);
        delay++;
    });
}

function highlightBound(skillId) {
    const skill = el.battleSkills.querySelector(`[data-id="${skillId}"]`);
    if (skill) {
        skill.classList.add('triggered');
        juiceUpStrong(skill);  // 强力弹跳动画
        setTimeout(() => skill.classList.remove('triggered'), 250);
    }
}

// === 特效 ===
function showFeedback(txt, color) {
    el.feedback.textContent = txt;
    el.feedback.style.color = color;
    setTimeout(() => { if (el.feedback.textContent === txt) el.feedback.textContent = ''; }, 900);
}

function showTriggerPopup(skillId) {
    const sk = SKILLS[skillId];
    const p = document.createElement('div');
    p.className = 'skill-trigger-popup';
    p.innerHTML = `<span class="trigger-icon">${sk.icon}</span>`;
    p.style.left = (Math.random() * 60 - 30) + 'px';
    el.triggerZone.appendChild(p);
    setTimeout(() => p.remove(), 350);
}

function showScorePopup(score) {
    const p = document.createElement('div');
    p.className = 'score-popup';
    p.textContent = `+${score}`;
    p.style.left = (40 + Math.random() * 20) + '%';
    el.container.appendChild(p);
    setTimeout(() => p.remove(), 800);
}

function particles(elem, count, color) {
    const rect = elem.getBoundingClientRect();
    const cRect = el.container.getBoundingClientRect();
    const x = rect.left - cRect.left + rect.width / 2;
    const y = rect.top - cRect.top + rect.height / 2;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        p.style.background = color;
        const angle = Math.PI * 2 * i / count + Math.random() * 0.5;
        const dist = 25 + Math.random() * 35;
        p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        el.particles.appendChild(p);
        setTimeout(() => p.remove(), 350);
    }
}

// === 初始化 ===
function init() {
    // 初始技能
    state.player.skills.set('spark', { level: 1 });
    state.player.bindings.set('f', 'spark');

    // 初始词语牌库 - 从 starter 词池获取
    state.player.wordDeck = [...WORD_POOL.starter.words];

    state.level = 0;
    state.gold = 30;

    showScreen('battle');
    state.level = 1;
    startLevel();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
