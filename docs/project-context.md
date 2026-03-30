---
project_name: '打字肉鸽'
user_name: 'Yuchenghuang'
date: '2026-03-29'
sections_completed: ['technology_stack', 'engine_rules', 'performance', 'code_organization', 'testing', 'platform', 'critical_rules']
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing game code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | ~5.9.3 | Primary language |
| Vite | ^7.3.1 | Build tool (web) |
| electron-vite | ^3.0.0 | Build tool (desktop) |
| PixiJS | ^8.16.0 | WebGL rendering (scenes, HUD, keyboard visualizer) |
| Electron | ^34.0.0 | Desktop runtime |
| Howler.js | ^2.2.4 | Audio system |
| steamworks.js | ^0.4.0 | Steam integration |
| Vitest | ^3.0.0 | Test framework |

**Build Targets:**
- `npm run dev:electron` — Electron desktop (full game)
- `npm run dev:web` — Web demo (`__DEMO_MODE__=true`, tree-shakes full features)
- `npm run dev:web:full` — Web full (`__DEMO_MODE__=false`)

---

## Project Structure

```
src/                          ← Project root (package.json lives here)
├── main/                     ← Electron main process (Node.js)
│   ├── index.ts              ← BrowserWindow, IPC handlers
│   ├── preload.ts            ← contextBridge → window.electronAPI
│   ├── save.ts               ← Atomic file I/O (tmp+rename)
│   ├── steam.ts              ← steamworks.js wrapper
│   ├── cloud-sync.ts         ← Steam Cloud sync
│   └── achievement-cache.ts  ← Offline achievement queue
│
├── shared/                   ← Shared by main + renderer
│   ├── types.ts              ← SaveData, MetaSaveData, RunSaveData, IpcResponse
│   ├── ipc-channels.ts       ← IPC_CHANNELS constant
│   ├── achievements.ts       ← ACHIEVEMENT_MAP
│   └── version.ts            ← Version string
│
├── src/                      ← Renderer process (game code)
│   ├── main.ts               ← Game entry point
│   ├── core/                 ← Pure state & infrastructure (NO DOM/PixiJS)
│   │   ├── constants.ts      ← BALANCE, KEYBOARD_ROWS, RESOURCE_*, ANIMATION
│   │   ├── types.ts          ← All core interfaces (GameState, ResourceType, etc.)
│   │   ├── state.ts          ← Global state singleton + helpers
│   │   ├── seededRandom.ts   ← Seedable PRNG (daily challenge)
│   │   ├── state/            ← OOP state classes (BattleState, RunState, MetaState)
│   │   ├── events/           ← TypedEventBus + GameEvents interface
│   │   ├── save/             ← SaveManager (IPC bridge, localStorage fallback)
│   │   └── unlock/           ← UnlockSystem + unlock-definitions
│   │
│   ├── data/                 ← Static game data & generation (pure, no side effects)
│   │   ├── affixes.ts        ← AffixType(20), EnchantmentType(25), AffixSkillInstance
│   │   ├── affixTrigger.ts   ← 6-phase trigger pipeline, enchantment logic (~1600 lines)
│   │   ├── affixMutation.ts  ← Metamorph mutation logic
│   │   ├── skillGeneration.ts← generateSkill() — random affix-skill factory
│   │   ├── skillShapes.ts    ← Polyomino shapes, mapShapeToKeys()
│   │   ├── skills.ts         ← DELETED_SKILL_IDS (save compat only)
│   │   ├── relics.ts         ← 53 relics, RELIC_MODIFIER_DEFS, MAX_RELIC_SLOTS=12
│   │   ├── bossModifiers.ts  ← 15 boss modifiers, BOSS_MODIFIER_REGISTRY
│   │   ├── classes.ts        ← ClassDefinition (none/wordsmith/metamorph)
│   │   ├── keyboardTopology.ts ← PositionRelation enum, HAND_MAP
│   │   ├── wordPacks.ts      ← WordPack definitions
│   │   └── words.ts          ← Word list loaders
│   │
│   ├── systems/              ← Game logic (no rendering)
│   │   ├── battle.ts         ← Core battle loop (~2700 lines), startLevel/endLevel/completeWord
│   │   ├── shop.ts           ← Shop system (~3400 lines), generateShopItems/buy/sell
│   │   ├── skills.ts         ← triggerSkill() dispatcher (~450 lines)
│   │   ├── affixTriggerOrchestrator.ts ← FIFO work-queue trigger dispatcher
│   │   ├── bindingManager.ts ← Polyomino shape → keyboard binding
│   │   ├── bossModifierEngine.ts ← applyModifier/cleanupModifier/tickModifier
│   │   ├── bossModifierPicker.ts ← Boss/elite modifier selection UI
│   │   ├── ritualEnchantment.ts  ← Ritual node enchantment selection
│   │   ├── dragManager.ts    ← Skill drag-and-drop rebinding
│   │   ├── relicPicker.ts    ← Relic selection UI
│   │   ├── audio/            ← AudioManager, SoundPool, KeystrokeSoundController
│   │   ├── classes/          ← ClassManager, CraftingStation, MetamorphStation
│   │   ├── letters/          ← LetterFrequencySystem
│   │   ├── modifiers/        ← EffectPipeline framework (built but unused by relics)
│   │   ├── relics/           ← 11 behavior modules + RelicPipeline (pure functions)
│   │   ├── scoring/          ← ScoreCalculator
│   │   ├── skills/           ← EffectQueue, AdjacencyMap
│   │   ├── stage/            ← StageManager, stageFlow (12-node cycle)
│   │   ├── tutorial/         ← TutorialManager, TutorialOverlay
│   │   └── typing/           ← InputHandler, WordLoader, WordMatcher
│   │
│   ├── scenes/               ← PixiJS scene graph
│   │   ├── Scene.ts / BaseScene.ts / SceneManager.ts
│   │   ├── battle/           ← BattleScene, BattleFlowController, WordController
│   │   ├── shop/             ← ShopScene, ShopItemDisplay
│   │   ├── gameover/         ← GameOverScene
│   │   ├── victory/          ← VictoryScene
│   │   └── collection/       ← CollectionScene (relics/skills/stats/leaderboard tabs)
│   │
│   ├── ui/                   ← UI components (PixiJS + DOM)
│   │   ├── elements.ts       ← DOM element cache (getElements())
│   │   ├── theme.ts          ← Color/font constants
│   │   ├── effects/          ← Particles, ScorePopup, ScoreSettlement, SkillFeedback
│   │   ├── hud/              ← BattleHUD, ComboCounter, ScoreDisplay, TimerBar, WordDisplay
│   │   ├── keyboard/         ← KeyboardVisualizer, KeyVisual, KeyTooltip
│   │   ├── indicators/       ← CloudSyncIndicator
│   │   └── notifications/    ← UnlockNotification
│   │
│   ├── effects/              ← DOM-based visual/audio feedback
│   │   ├── juice.ts          ← Screen shake, score roller, milestone celebrations
│   │   ├── particles.ts      ← DOM particle spawner
│   │   └── sound.ts          ← Web Audio API synthesis, BGM
│   │
│   └── demo/                 ← Demo-only code (tree-shaken in full build)
│       ├── demo-config.ts    ← IS_DEMO flag, starter bindings
│       ├── demo-i18n.ts      ← t(), setLocale(), localization
│       └── demo-*.ts         ← Demo tutorial, end screen, analytics
│
└── tests/unit/               ← Vitest tests (mirrors src/ structure, ~120 files)
```

---

## Critical Implementation Rules

### Electron Architecture Rules

```
MAIN PROCESS (main/)           RENDERER PROCESS (src/)
├── Node.js APIs allowed       ├── DOM/Browser APIs allowed
├── Steam API (steamworks.js)  ├── PixiJS rendering
├── File system (save.ts)      ├── Game logic (systems/)
└── Window management          └── UI/Input handling
        │                              │
        └──────── IPC ONLY ────────────┘
         (shared/ipc-channels.ts)
```

**NEVER:**
- Import `fs`, `path`, or Node APIs in renderer
- Call Steam API from renderer
- Block main process with sync operations
- In non-Electron (web): `SaveManager` falls back to `localStorage`

### Dual State Architecture

Two state systems coexist — understand which one you're working with:

| System | Location | Used By | Pattern |
|--------|----------|---------|---------|
| **`state` singleton** | `core/state.ts` | `battle.ts`, `shop.ts`, `skills.ts`, DOM HUD | Direct mutable object, Proxy for `resources.multiplier`/`resources.time` |
| **OOP state classes** | `core/state/` | PixiJS scenes, tests, serialization | `BattleState`, `RunState`, `MetaState` — encapsulated, event-driven |

**MetaState** — Cross-run (file persistence): unlocks, achievements, leaderboard, tutorial progress
**RunState** — Single-run (memory): skills, bindings, relics, gold, stage, cycle, class fields
**BattleState** — Single-battle (memory): score, combo, time, word progress, phase FSM

**The `state` singleton is the operational source-of-truth during gameplay.** The OOP classes handle serialization and PixiJS scene integration.

**Resource Routing (CRITICAL):**
- `base` / `multiplier` → write to `synergy.skillBaseScore` / `synergy.skillMultBonus` (NOT directly to `state.resources`)
- `score` → write directly to `state.resources.score`
- Combined at word-completion time in `completeWord()`

### Affix-Based Skill System (Current)

> **The old 5-category skill system (Producer/Converter/Connector/Replicator/Amplifier) is DELETED.** Only `DELETED_SKILL_IDS` remain for save migration. All skills are now `AffixSkillInstance`.

**Skill Structure:**
```typescript
AffixSkillInstance {
  id: string              // unique ID
  resource: ResourceType  // what it produces (base/score/multiplier/time/gold/fragment/mutagen)
  baseValues: [number, number, number]  // Lv1/Lv2/Lv3
  level: 1 | 2 | 3       // upgrade via duplicate purchase
  rarity: 0-3            // white/blue/yellow/red
  affixes: AffixInstance[]  // behavior modifiers (from 20 AffixTypes)
  enchantmentIds: EnchantmentType[]  // unlocked at Lv3
  shapeId: string         // polyomino shape (monomino→tetromino)
  rotation: number        // shape rotation index
}
```

**Polyomino Shapes:** Skills occupy 1-4 keyboard keys based on rarity:
- Rarity 0: monomino (1 key)
- Rarity 1: monomino + domino (1-2 keys)
- Rarity 2: + triomino (1-3 keys)
- Rarity 3: + tetromino (1-4 keys)
- `mapShapeToKeys(anchor, shapeId, rotation)` maps shape onto QWERTY grid; returns null if off-keyboard

**20 Affix Types (6 categories):**

| Category | Affixes | Behavior |
|----------|---------|----------|
| Numeric | Convert, Rainbow | Convert reads a resource to scale output; Rainbow randomizes target resource |
| Rhythm | Charge, Decay, Pulse, Crit, Cascade | Charge=hold key; Decay=diminishing; Pulse=burst every N; Crit=chance×mult; Cascade=bonus if prev key in relation |
| Topology | Void, Resonance, Mirror | Void=bonus per empty neighbor; Resonance=auto-fire on neighbor trigger; Mirror=copy neighbor affix per stage |
| Trigger Chain | Link, Splash, Amplify, Conduit | Link=fire when watched-affix neighbor fires; Splash=re-trigger random neighbor; Amplify=stacking bonus; Conduit=give extra triggers to neighbors |
| Word Sense | Outcast, Gravity, Ligature | Outcast=bonus at word start/end; Gravity=alter word probability; Ligature=bonus per repeated letter |
| Meta Rule | Twin, Recurse, Taboo | Twin=2 enchantments; Recurse=chance to re-trigger; Taboo=big bonus + penalty chance |

**Skill Generation:** `generateSkill(rarity?, resource?, forceAffixes?)` in `data/skillGeneration.ts` — procedurally generates skills. Per-run affix weights randomized via `rollAffixWeights(rng)`.

### Skill Trigger Pipeline

**Trigger flow:**
```
keystroke → InputHandler → eventBus('input:keypress')
  → battle.ts handleKeyPress → playerCorrect(key)
  → triggerSkill(skillId, key) [systems/skills.ts]
    → orchestrateAffixTrigger() [affixTriggerOrchestrator.ts — FIFO work queue]
      → triggerAffixSkill() [data/affixTrigger.ts — 6-phase pipeline]
      → enqueue Phase 6 actions (resonance/link/splash/conduit/recurse)
    → applyResource() callback → modifies state
  → showFeedback() + eventBus.emit('skill:triggered')
```

**Six-Phase Pipeline (`triggerAffixSkill()` in `data/affixTrigger.ts`):**
1. **Phase 1**: Base value = `baseValues[level-1]` × level scaling
2. **Phase 2**: Additive layer — all affix bonuses summed
3. **Phase 3**: Multiplicative layer — multiply operator enchantment applied
4. **Phase 4**: Resource routing — determines target resource, handles Rainbow, returns output
5. **Phase 5**: Post-trigger — Recurse (queue re-trigger), Splash targets, Outcast echo, Charge auto-complete
6. **Phase 6**: Neighbor notifications — Resonance, Link, ApprenticeNeighbor growth, Conduit extra triggers

**FIFO Work Queue (CRITICAL):** `affixTriggerOrchestrator.ts` replaces recursion with a flat work queue:
- Work types: `initial | recurse | resonance | link | splash | conduit | outcast_echo`
- Chain loop detection: `chainHistory.includes(triggerKey)` at depth ≥ 2 → `enterPseudoInfinite()` (250ms interval)
- Depth caps: `MAX_RECURSE_DEPTH`, `MAX_CHAIN_DEPTH`
- O(1) call-stack depth — prevents stack overflow from deep Recurse/Link chains

### Enchantment System

**25 EnchantmentTypes in 3 families:**

| Family | Types | Behavior |
|--------|-------|----------|
| Apprentice (7) | self, neighbor, res_base/score/mult/time/gold | Permanent % growth per trigger; `apprenticeAccumulated` tracks EXP |
| Quest (17+) | One per AffixType (charge_quest, crit_quest, etc.) | Fill stacks via specific events → transform skill at completion |
| Operator (1) | MultiplyOperator | Converts additive bonuses to multiplicative |

**Enchantment acquisition channels:**
1. **Shop** — randomly offered, 2-choose-1 UI (3 with `fate_fork` relic)
2. **Ritual** — stage 6 in each cycle, `openRitualEnchantment()`
3. **Chaos Seed relic** — temporary enchantments at battle start

**Enchantment state is per-run (survives between stages, reset on run end).**

### Relic System

**53 active relics across 11 subsystems, implemented as pure function calls (NOT via the modifier pipeline):**

| Subsystem | File | Example Relics |
|-----------|------|----------------|
| Typing | `TypingRelicBehaviors.ts` | wax_seal, echo_thimble, glass_cannon_v2 |
| Combo | `ComboRelicBehaviors.ts` | combo_buffer, multiplier_prism, immortal_combo |
| Skill | `SkillRelicBehaviors.ts` | first_strike, less_is_more, jazz |
| Enchantment | `EnchantmentRelicBehaviors.ts` | apprentice_robe, fate_fork, enchant_anchor |
| Topology | `TopologyRelicBehaviors.ts` | adjacent_power, symmetry_pact, key_storm |
| Word | `WordRelicBehaviors.ts` | word_collection, long_word_master, word_dealer |
| Resource | `ResourceRelicBehaviors.ts` | score_magnet, time_dew, universal_furnace |
| Shop | `ShopRelicBehaviors.ts` | discount_card, black_market, timed_auction |
| Stage | `StageRelicBehaviors.ts` | warm_up, elite_hunter, phoenix |
| Boss Modifier | `BossModifierRelicBehaviors.ts` | modifier_shield, chaos_roulette, modifier_reversal |
| Scoring | `ScoringRelicBehaviors.ts` | base_shield, snowball, score_black_hole |

**Pattern:** Each subsystem exports pure functions called inline from `battle.ts` / `skills.ts` / `shop.ts`. No central switch statement — adding a new relic subsystem is additive.

**`RelicPipeline.ts`** provides `resolveRelicEffects()`, `evaluateRelicCondition()`, and the behavior dispatch registry. `MAX_RELIC_SLOTS = 12`.

> **Note:** The `systems/modifiers/` pipeline framework (EffectPipeline, ModifierRegistry, ConditionEvaluator, BehaviorExecutor) exists but `RELIC_MODIFIER_DEFS` is empty. Relics use direct function calls, not the pipeline.

### Boss Modifier System

**15 modifiers in 3 categories:**

| Category | Modifiers | Effect |
|----------|-----------|--------|
| Offense (5) | fast_time, keystroke_tax, escalation, frostbite, mirror | Speed up time, tax keystrokes, accelerating difficulty, freeze input, score reset on threshold |
| Defense (5) | decay, cap, double_target, diminish, score_tax | Reduce output, cap score, double target, diminishing returns, flat tax |
| Disruption (5) | fade, scramble, reverse, garble, decoy | Visual fade, scramble letters, reverse words, garble display, fake words |

**Lifecycle:** `applyModifier()` at stage start → `tickModifier(dt)` each frame → `cleanupModifier()` at stage end

**Permanent accumulation:** Boss stages add a modifier to `state.activeModifiers` that persists across all future stages. Elite stages use a weaker version (`getParams(isElite=true)`). All active modifiers run simultaneously via `activeModifierInstances[]`.

**Word transformation chain:** `transformWordForModifier(word)` applies reverse → scramble → garble. Decoy: `generateDecoyWord()` replaces words with visually similar fakes.

### Cycle-Based Progression

```
12-stage cycle:
  Positions 1-4  = standard battles
  Position  5    = elite battle (guaranteed modifier, weakened)
  Position  6    = ritual (enchantment selection, no battle)
  Positions 7-11 = standard battles
  Position  12   = boss battle (adds permanent modifier)
```

- `CYCLE_LENGTH = 12` in `systems/stage/stageFlow.ts`
- Time limit decays `×0.9` per cycle (`CYCLE_TIME_DECAY`)
- Target score: `TARGET_BASE × TARGET_GROWTH^(stageNum-2)`, Boss ×1.5
- Time acceleration: `1 + ACCEL_RATE × elapsed²` (quadratic within a stage)

### Class System

| Class | Resource | Features |
|-------|----------|----------|
| None | — | Default, no restrictions |
| Wordsmith | fragment | Crafting station (fragments → words), harvest/letter_affinity/overflow enchantments |
| Metamorph | mutagen | Mutation station (mutagen → skill reroll), adapt/unstable/mutation_hunger enchantments |

- Wordsmith unlocked after 1 victory; Metamorph when all skills unlocked; Endless mode when all 3 classes cleared
- `ClassFeatureGate.isFeatureEnabled()` gates features; `ClassResourceFilter` filters shop items

### Keyboard Position Relations

**6 types in `data/keyboardTopology.ts`:**
```typescript
enum PositionRelation {
  Adjacent, SameRow, SameColumn, SameHand, SameFinger, Symmetric
}
```

**MUST use topology functions** — never hardcode adjacency:
```typescript
// CORRECT
hasRelation(keyA, keyB, PositionRelation.Adjacent)
// WRONG
const adjacent = ['W', 'E', 'S', 'D']  // hardcoded
```

### Scene Management

**SceneManager** — PixiJS scene stack (push/pop/replace):

| Operation | Use Case | Lifecycle |
|-----------|----------|-----------|
| `push()` | Overlay | current.onPause() → new.onEnter() |
| `pop()` | Return | top.onExit() → below.onResume() |
| `replace()` | Transition | old.onExit() → new.onEnter() |

**Important:** The production battle system runs in `systems/battle.ts` (DOM-based). The PixiJS `BattleScene` is a parallel architecture — both coexist.

---

## Performance Rules

### Frame Budget: 16.67ms (60 FPS)

| System | Budget | Priority |
|--------|--------|----------|
| Input handling | <1ms | Critical |
| Skill trigger + orchestrator | <2ms | Critical |
| Rendering (PixiJS + DOM) | <10ms | High |
| Audio | <1ms | High |
| Boss modifier tick | <1ms | Medium |

### Input Latency: <16ms (CRITICAL)

```typescript
// CORRECT: Direct event listener via InputHandler
document.addEventListener('keydown', handleKeyPress)

// WRONG: Polling in game loop
function update() { if (isKeyPressed('A')) { ... } }
```

### Audio Latency: <50ms

```typescript
// CORRECT: Pre-created sound pool (SoundPool class)
const pool = new SoundPool('key.ogg', 20)

// WRONG: Create on demand
function onKeyPress() { new Howl({ src: ['key.ogg'] }).play() }
```

### Memory Rules

- EffectQueue max 10 items (drop oldest)
- Lazy-load word lists
- Clear battle state completely on stage end
- `DELETED_SKILL_IDS` / `DELETED_RELIC_IDS` filter on deserialize for save compatibility

---

## Code Organization Rules

### Dependency Direction (ENFORCED)

```
data → core → systems → scenes
 ↑      ↑       ↑         ↑
Pure  No DOM   Can use   Can use
data  No PixiJS  core    systems + ui
```

**NEVER:**
- Import from `scenes/` in `systems/`
- Import from `systems/` in `core/`
- Create circular dependencies

### File Placement

| Type | Location | Example |
|------|----------|---------|
| State singleton | `core/state.ts` | `state`, `synergy`, `createInitialState()` |
| State classes | `core/state/` | `BattleState.ts`, `RunState.ts`, `MetaState.ts` |
| Event types | `core/events/` | `EventBus.ts` (GameEvents interface) |
| Affix/skill data | `data/` | `affixes.ts`, `affixTrigger.ts`, `skillGeneration.ts` |
| Relic data | `data/relics.ts` | RELICS array, RelicData, RelicEffect |
| Boss modifier data | `data/bossModifiers.ts` | BOSS_MODIFIER_REGISTRY |
| Shape definitions | `data/skillShapes.ts` | ShapeTemplate, mapShapeToKeys() |
| Keyboard topology | `data/keyboardTopology.ts` | PositionRelation, hasRelation() |
| Battle loop | `systems/battle.ts` | startLevel, endLevel, completeWord |
| Skill dispatcher | `systems/skills.ts` | triggerSkill() |
| Trigger orchestrator | `systems/affixTriggerOrchestrator.ts` | FIFO work queue |
| Relic behaviors | `systems/relics/` | 11 subsystem modules |
| Modifier pipeline | `systems/modifiers/` | EffectPipeline (framework, currently unused) |
| Shape binding | `systems/bindingManager.ts` | bindShapeToKeys(), unbindSkill() |
| Stage flow | `systems/stage/stageFlow.ts` | getStageType(), isRitualNode(), CYCLE_LENGTH |
| PixiJS scenes | `scenes/` | BattleScene, ShopScene, CollectionScene |
| PixiJS UI | `ui/` | BattleHUD, KeyboardVisualizer, effects |
| DOM feedback | `effects/` | juice.ts, particles.ts, sound.ts |

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes/Files | PascalCase | `SceneManager.ts` |
| Functions | camelCase | `triggerSkill()` |
| Constants | UPPER_SNAKE | `MAX_RELIC_SLOTS` |
| Events | colon-separated | `'skill:triggered'` |
| Relic IDs | snake_case | `'combo_buffer'` |
| Affix types | PascalCase enum | `AffixType.Cascade` |

---

## Event System

### Typed EventBus (REQUIRED)

All events declared in `GameEvents` interface (`core/events/EventBus.ts`). ~40 event types.

**Key event domains:**
```
input:keypress/keyup        — raw keyboard
word:correct/error/complete/new — word lifecycle
skill:triggered/upgraded    — skill events (includes crit/pulse/quest/taboo flags)
battle:start/end/pause/resume — battle lifecycle
score:update                — score changes
combo:update                — combo changes
shop:opened/purchase/skip   — shop events
relic:acquired/removed/effect — relic lifecycle
ritual:enchantment_applied  — ritual events
scene:change                — scene transitions (push/pop/replace)
meta:check_unlocks          — trigger unlock evaluation
audio:sfx_play/bgm_change   — audio control
tutorial:step_shown/completed — tutorial events
```

---

## Save System Rules

### Atomic Writes (main process only)

`main/save.ts`: write to `.tmp` → `fs.renameSync()` (atomic). Renderer uses `SaveManager` via IPC; falls back to `localStorage` in web.

### Serialization

- `RunState.serialize()` converts Maps/Sets → plain objects; affix skills via `serializeSkill()`
- `RunState.deserialize()` filters `DELETED_SKILL_IDS` / `DELETED_RELIC_IDS` on load
- `MetaState` serialization version: 6

---

## Testing Rules

```
tests/unit/    — Vitest unit tests (mirrors src/ structure, ~120 files)
```

- `core/` must be testable without PixiJS/DOM
- Mock `eventBus` for isolated system tests
- Config: `vitest.config.ts` — globals=true, environment=node
- Run: `npm test` (watch) / `npm run test:run` (CI)

---

## Critical Anti-Patterns

### NEVER DO:

1. **Import Node.js in renderer**
   ```typescript
   import fs from 'fs'  // WRONG in src/src/
   ```

2. **Bypass the FIFO orchestrator with direct recursion**
   ```typescript
   // WRONG: Stack overflow on deep Recurse/Link chains
   function triggerAffixSkill() { triggerAffixSkill() }
   // CORRECT: Enqueue in affixTriggerOrchestrator
   ```

3. **Hardcode keyboard adjacency**
   ```typescript
   // WRONG
   const neighbors = ['Q', 'W', 'A']
   // CORRECT
   hasRelation(key, other, PositionRelation.Adjacent)
   ```

4. **Write resources directly during skill trigger**
   ```typescript
   // WRONG: base/multiplier bypass synergy tracking
   state.resources.base += value
   // CORRECT: Route through synergy state
   synergy.skillBaseScore += value
   ```

5. **Create sounds on demand**
   ```typescript
   // WRONG
   new Howl({ src: ['key.ogg'] }).play()
   // CORRECT: Use SoundPool pre-allocation
   ```

### Edge Cases to Handle

- **Fast typing (100+ WPM):** Sound pool ≥ 20 instances
- **Chain loop detection:** `chainHistory` tracks fired keys; same key at depth ≥ 2 → pseudoInfinite mode
- **Polyomino off-keyboard:** `mapShapeToKeys()` returns null if any cell falls off QWERTY grid
- **Resource routing:** `base`/`multiplier` → SynergyState; `score` → direct
- **Boss modifier stacking:** Multiple permanent modifiers active simultaneously; `rebuildActiveParams()` merges via `Object.assign`
- **Save compat:** `DELETED_SKILL_IDS` (~200 old IDs) and `DELETED_RELIC_IDS` (~50) filtered on deserialize
- **Demo mode:** `__DEMO_MODE__` compile-time flag; demo code in `src/demo/` tree-shaken from full build

---

## Quick Reference

### New Affix Type Checklist

- [ ] Add to `AffixType` enum in `data/affixes.ts`
- [ ] Assign to an `AffixCategory` in `AFFIX_CATEGORY_MAP`
- [ ] Add weight entry in `AFFIX_WEIGHTS` and `rollAffixWeights()`
- [ ] Implement instance generation in `data/skillGeneration.ts` (parameter tables)
- [ ] Add Phase 2/3 computation in `data/affixTrigger.ts` (`resolvePhase1()` or equivalent)
- [ ] Add Phase 5/6 post-trigger behavior if chaining (splash/link/recurse/conduit)
- [ ] Handle in `affixTriggerOrchestrator.ts` if new work type needed
- [ ] Add display name/description in `AFFIX_NAMES` / `AFFIX_DESCRIPTIONS`
- [ ] Add tooltip rendering in `ui/keyboard/KeyTooltip.ts`
- [ ] If quest enchantment needed: add to `QUEST_ENCHANTMENT_DEFS` + `QUEST_AFFIX_MAP`

### New Relic Checklist

- [ ] Define in `data/relics.ts` RELICS array (id, name, rarity, description, effects)
- [ ] Choose subsystem → create/update behavior file in `systems/relics/`
- [ ] Export pure functions, call them inline from `battle.ts` / `shop.ts` / `skills.ts`
- [ ] Add relic state initialization in `RelicPipeline.initRelicState()` if stateful
- [ ] Handle in `systems/relics/RelicPipeline.ts` if using condition evaluation
- [ ] Add unlock condition in `core/unlock/unlock-definitions.ts` if gated

### New Boss Modifier Checklist

- [ ] Add to `BOSS_MODIFIER_IDS` in `data/bossModifiers.ts`
- [ ] Implement `BossModifier` interface: `getParams(isElite)`, `apply()`, `cleanup()`, `onTick?(dt)`
- [ ] Register in `BOSS_MODIFIER_REGISTRY`
- [ ] Handle word transformation in `transformWordForModifier()` if visual
- [ ] Add `battle.ts` integration (tick, score modifiers, UI feedback)

---

_Last updated: 2026-03-29_
