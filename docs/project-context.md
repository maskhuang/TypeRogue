---
project_name: '打字肉鸽'
user_name: 'Yuchenghuang'
date: '2026-03-10'
sections_completed: ['technology_stack', 'engine_rules', 'performance', 'code_organization', 'testing', 'platform', 'critical_rules']
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing game code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | ~5.9.3 | Primary language |
| Vite | ^7.3.1 | Build tool |
| PixiJS | ^8.16.0 | WebGL/WebGPU rendering |
| Electron | latest | Desktop runtime |
| Howler.js | ^2.2.4 | Audio system |
| steamworks.js | latest | Steam integration |

**Version Constraints:**
- PixiJS v8 required for WebGPU support
- Electron for Steam integration via steamworks.js
- Howler.js for low-latency audio (<50ms)

---

## Critical Implementation Rules

### Electron Architecture Rules

```
MAIN PROCESS (main/)           RENDERER PROCESS (renderer/)
├── Node.js APIs allowed       ├── DOM/Browser APIs allowed
├── Steam API (steamworks.js)  ├── PixiJS rendering
├── File system (fs)           ├── Game logic
└── Window management          └── UI/Input handling
        │                              │
        └──────── IPC ONLY ────────────┘
```

**MUST:**
- All Steam API calls in main process only
- All file I/O (saves) in main process only
- Use IPC channels defined in `shared/ipc-channels.ts`
- Never import Node.js modules in renderer

**NEVER:**
- Import `fs`, `path`, or Node APIs in renderer process
- Call Steam API from renderer
- Block main process with synchronous operations

### State Management Rules

**Three-Layer State (CRITICAL):**

```typescript
// CORRECT: Access through StateCoordinator
stateCoordinator.onBattleEnd(result)

// WRONG: Direct cross-layer modification
state.meta.unlocks.push(newUnlock)  // FORBIDDEN
```

| Layer | Scope | Persistence | Reset |
|-------|-------|-------------|-------|
| MetaState | Permanent unlocks, achievements | File | Never |
| RunState | Current run: skills, gold, stage | Memory | On run end |
| BattleState | Active battle: score, combo, time | Memory | On stage end |

**Rule:** Only StateCoordinator may update cross-layer state.

### Skill System Rules

**Five Skill Categories:**

| Category | Count | Trigger | Behavior |
|----------|-------|---------|----------|
| Producer | 77 (7 standard add + 70 mechanic) | Direct keystroke | Generate resource (add only; multiply via ench_multiply enchantment); mechanic variants: charge, decay, pulse, crit, void |
| Converter | 45 (20/run, weighted) | Direct keystroke | Read source resource → produce target (38 hetero + 7 same-source; add only, multiply via ench_multiply) |
| Connector | 25 (13/run) | Passive: resource event | When positional neighbor produces matching resource → fire random non-same skill |
| Replicator | 6 (5/run) | Direct keystroke | Copy & fire random skill in positional range |
| Amplifier | 36 (15/run) | Direct keystroke | +1 stack/trigger; stacks → % bonus to positional neighbors |

**Central Dispatcher — `triggerSkill()` in `systems/skills.ts` (~1200 lines):**

```
keydown → InputHandler → eventBus('input:keypress')
  → battle.ts handleKeyPress() → playerCorrect(k)
  → lookup: skillId = state.player.bindings.get(k)
  → triggerSkill(skillId, k)
```

**Producer/Converter Computation Order (MUST follow):**
1. Base value: `getProducerValue(id, level)` (Lv1/Lv2/Lv3)
2. Enchantment multiplier: `getEnchantmentMultiplier()` (growth/mastery/harvest/repulsion/devour/overflow/letter_affinity)
3. Amplifier bonus: `getAmplifierBonus()` — scan bound amplifiers, check position relation + stacks
4. Relic multiplier: `resolveRelicSkillTrigger()` via RelicPipeline
5. Apply to resource state
6. Post-trigger: `checkResourceTriggers()` (→ Connectors), `checkResonanceTriggers()`, `applyPostTriggerEnchantments()` (→ Splash + Transmutation)
7. Growth/mastery/devour accumulation
8. Visual feedback + audio + `eventBus.emit('skill:triggered')`

**Chain Loop Detection:**
- `chainHistory: string[]` tracks fired keys; if same key reappears at depth ≥ 2 → `enterPseudoInfinite()` (250ms setInterval continuous fire)

**Keyboard Position Relations (6 types in `data/keyboardTopology.ts`):**

```typescript
enum PositionRelation {
  Adjacent, SameRow, SameColumn, SameHand, SameFinger, Symmetric
}
// CORRECT: Use topology functions
hasRelation(keyA, keyB, PositionRelation.Adjacent)

// WRONG: Hardcode adjacency lists
```

**Pool Draw (Per-Run Randomization):**
- Producers: all 77 always available (7 standard add + 28 charge/decay/pulse/crit + 42 void)
- Converters: 31 of 74 drawn per run
- Connectors: 13 of 25; Replicators: 5 of 6
- Amplifiers: 15 of 36
- Pool IDs stored in `state.converterPool`, `state.connectorPool`, etc.

### Enchantment System Rules

Enchantments attach to skills via `state.player.enchantedSkills: Map<skillId, enchantmentId>`.

| Category | Count | Behavior |
|----------|-------|----------|
| Growth | 6 (by position) | Neighbor triggers → permanent % output growth (cross-stage) |
| Splash | 6 | On trigger → fire all positional neighbors at 100%/N efficiency |
| Resonance | 6 | Neighbor triggers → self fires at reduced % |
| Repulsion | 6 | Empty positions in range → +% per empty slot |
| Devour | 6 | Every 5 triggers → permanently absorb weakest neighbor |
| Transmutation | 4 | After trigger → extra secondary resource (% of delta) |
| Mastery | 1 | Every 10 triggers → permanent +8% growth |
| Class-exclusive | 6 | Wordsmith (harvest/letter_affinity/overflow) + Metamorph (adapt/unstable/mutation_hunger) |

**Enchantment State (cross-stage, run-reset):**
- `growthValues: Map<skillId, number>` — cumulative growth %
- `masteryCounters: Map<skillId, number>` — mastery trigger count
- `devourIcons: Map<skillId, string[]>` — absorbed icons
- `devourCounters: Map<skillId, number>` — per-battle, cleared per stage

### Relic / Modifier Pipeline Rules

Relics use a 3-layer modifier pipeline (`systems/modifiers/`), skills do NOT:

```
Layers:  base (additive) → enhance (multiplicative) → global (multiplicative)
Phases:  before (intercept) → calculate → after (chain behaviors)
```

- `resolveRelicSkillTrigger(context)` returns a scalar multiplier (≥1.0) applied to skill output
- `PipelineContext` carries runtime state: combo, hand triggers, chain depth, amplifier stacks, skill density
- Triggers: `on_skill_trigger`, `on_correct_keystroke`, `on_word_complete`, `on_combo_break`, etc.

### Skill State Storage Rules

**Per-Run (in GameState / RunState):**
```typescript
player: {
  bindings: Map<string, string>          // key → skillId
  skills: Map<string, SkillInstance>     // skillId → { level: 1-3 }
  enchantedSkills: Map<string, string>   // skillId → enchantmentId
}
```

**Per-Stage Reset:**
- `amplifierStacks: Map<string, number>` — cleared between stages

**Per-Word Reset (module-level in skills.ts):**
- `_isChainTrigger`, `_currentChainDepth`, `_retriggerRequested`
- `_wordResourceTypes: Set<string>`, `_wordHasProducerTriggered`

**SynergyState (per-word cross-skill tracking):**
```typescript
synergy: {
  wordSkillCount, lastTriggeredSkillId,
  skillBaseScore, skillMultBonus,  // combined at word-completion scoring
  letterBaseScore
}
```

**Resource Routing (CRITICAL):**
- `base` / `multiplier` → write to `synergy.skillBaseScore` / `synergy.skillMultBonus` (NOT directly to state.resources)
- `score` → write directly to `state.resources.score`
- Combined at word-completion time

### Scene Management Rules

**Scene Stack Operations:**

| Operation | Use Case | Example |
|-----------|----------|---------|
| `push()` | Overlay (pause menu) | Battle → Pause |
| `pop()` | Return from overlay | Pause → Battle |
| `replace()` | Full transition | Menu → Battle |

**Lifecycle Hooks (MUST implement):**
```typescript
interface Scene {
  onEnter(): void    // Called when scene becomes active
  onExit(): void     // Called when scene is removed
  onPause?(): void   // Called when covered by push()
  onResume?(): void  // Called when uncovered by pop()
}
```

---

## Performance Rules

### Frame Budget: 16.67ms (60 FPS)

| System | Budget | Priority |
|--------|--------|----------|
| Input handling | <1ms | Critical |
| Skill calculation | <2ms | Critical |
| Rendering | <10ms | High |
| Audio | <1ms | High |
| State updates | <2ms | Medium |

### Input Latency: <16ms (CRITICAL)

```typescript
// CORRECT: Direct event listener
document.addEventListener('keydown', handleKeyPress)

// WRONG: Polling in game loop
function update() {
  if (isKeyPressed('A')) { ... }  // Adds latency
}
```

### Audio Latency: <50ms

```typescript
// CORRECT: Pre-created sound pool
const keySound = new Howl({
  src: ['key.ogg'],
  pool: 20  // Support 100+ WPM typing
})

// WRONG: Create on demand
function playKeySound() {
  new Howl({ src: ['key.ogg'] }).play()  // Causes latency
}
```

### Memory Rules

- Object pool for frequently created objects (skills, effects)
- Limit EffectQueue to 10 items max
- Lazy-load word lists by language
- Clear battle state completely on stage end

---

## Code Organization Rules

### Dependency Direction (ENFORCED)

```
data → core → systems → scenes
 ↑      ↑       ↑         ↑
Pure  No PixiJS  Can use   Can use
data            core      systems + ui
```

**NEVER:**
- Import from `scenes/` in `systems/`
- Import from `systems/` in `core/`
- Create circular dependencies

### File Placement

| Type | Location | Example |
|------|----------|---------|
| State classes | `core/state/` | `MetaState.ts` |
| Event types | `core/events/` | `EventBus.ts` |
| Game mechanics | `systems/` | `typing/InputHandler.ts` |
| PixiJS scenes | `scenes/` | `battle/BattleScene.ts` |
| Reusable UI | `ui/` | `hud/ScoreDisplay.ts` |
| Data definitions | `data/` | `producers.ts`, `converters.ts`, `enchantments.ts` |
| Keyboard topology | `data/` | `keyboardTopology.ts` |
| Skill engine | `systems/` | `skills.ts` (central dispatcher) |
| Relic pipeline | `systems/modifiers/` | `EffectPipeline.ts`, `ModifierRegistry.ts` |

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes/Files | PascalCase | `SceneManager.ts` |
| Functions | camelCase | `triggerSkill()` |
| Constants | UPPER_SNAKE | `MAX_SKILLS` |
| Events | colon-separated | `'skill:triggered'` |
| Assets | kebab-case | `skill-fire.png` |

---

## Event System Rules

### Typed Events (REQUIRED)

```typescript
// CORRECT: Use typed event bus
eventBus.emit('skill:triggered', {
  key: 'F',
  skillId: 'fireBlast',
  type: 'active'
})

// WRONG: Untyped events
eventBus.emit('skill', { data: something })  // No type safety
```

### Event Naming Pattern

```
{domain}:{action}

Examples:
- battle:start
- battle:end
- skill:triggered
- word:complete
- save:complete
```

---

## Save System Rules

### Atomic Writes (CRITICAL)

```typescript
// CORRECT: Write to temp, then rename
function safeSave(path: string, data: object) {
  const temp = path + '.tmp'
  fs.writeFileSync(temp, JSON.stringify(data))
  fs.renameSync(temp, path)  // Atomic operation
}

// WRONG: Direct write (can corrupt on crash)
fs.writeFileSync(path, JSON.stringify(data))
```

### Save Locations

| Data | File | Sync |
|------|------|------|
| Meta (unlocks) | `userData/meta.json` | Steam Cloud |
| Run (in progress) | `userData/run.json` | Local only |
| Settings | `userData/settings.json` | Steam Cloud |

---

## Testing Rules

### Test Location

```
tests/
├── unit/           # Pure logic tests (core/, systems/)
└── integration/    # Scene/system interaction tests
```

### Testable Code

- `core/` must be testable without PixiJS
- Mock EventBus for isolated system tests
- Use StateCoordinator mocks for state tests

---

## Critical Anti-Patterns

### NEVER DO:

1. **Direct state mutation across layers**
   ```typescript
   // WRONG
   state.run.gold += 100
   state.meta.checkUnlocks()  // Cross-layer!
   ```

2. **Synchronous IPC in main process**
   ```typescript
   // WRONG
   ipcMain.on('save', (e, data) => {
     fs.writeFileSync(...)  // Blocks main process
   })
   ```

3. **Creating sounds on demand**
   ```typescript
   // WRONG
   function onKeyPress() {
     new Howl({ src: ['key.ogg'] }).play()
   }
   ```

4. **Polling for input**
   ```typescript
   // WRONG
   ticker.add(() => {
     if (keyboard.isDown('A')) { ... }
   })
   ```

5. **Importing Node.js in renderer**
   ```typescript
   // WRONG (in renderer process)
   import fs from 'fs'
   ```

### Edge Cases to Handle

- **Fast typing (100+ WPM):** Sound pool must be 20+
- **Skill chain overflow:** EffectQueue max 10, drop oldest
- **Connector chain loops:** chainHistory tracks fired keys; depth ≥ 2 same key → pseudoInfinite mode (250ms interval)
- **Amplifier fractional stacks:** Splash/resonance indirect triggers accumulate float stacks; use `Math.floor()` for bonuses
- **Resource routing:** `base`/`multiplier` go to SynergyState, NOT state.resources; `score` goes direct
- **Save during battle:** Queue save, execute on battle end
- **Steam offline:** Graceful fallback, local achievements
- **DELETED_SKILL_IDS:** RunState filters these on deserialize for save compatibility

---

## Quick Reference

### New Skill Checklist

- [ ] Define in `data/` (producers.ts / converters.ts / connectors.ts / amplifiers.ts)
- [ ] Determine category: Producer / Converter / Connector / Replicator / Amplifier
- [ ] Add trigger path in `systems/skills.ts` central dispatcher (`triggerSkill()`)
- [ ] If positional: use `PositionRelation` from `data/keyboardTopology.ts`
- [ ] Add to pool draw function if category uses pool (converters/connectors/replicators/amplifiers)
- [ ] Handle in `RunState.ts` serialization (addSkill/removeSkill/bindSkill)
- [ ] Create sound in audio pool (`effects/sound.ts`)
- [ ] Add visual feedback via `showTriggerPopup()` + `showFeedback()` + `SkillFeedbackManager`

### New Scene Checklist

- [ ] Extend Scene interface with all lifecycle hooks
- [ ] Register in SceneManager
- [ ] Define valid transitions in GameStateMachine
- [ ] Handle onPause/onResume for overlays

---

_Last updated: 2026-03-10_
