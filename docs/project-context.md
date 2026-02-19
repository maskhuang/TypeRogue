---
project_name: '打字肉鸽'
user_name: 'Yuchenghuang'
date: '2026-02-16'
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

**Dual System - DO NOT MIX:**

| System | Trigger | Data Source | Location |
|--------|---------|-------------|----------|
| Passive | Automatic on keypress | ADJACENT_KEYS map | `skills/passive/` |
| Active | Queue-based | EffectQueue | `skills/active/` |

**Processing Order (MUST follow):**
1. PassiveSkillSystem calculates position bonus
2. ActiveSkillSystem applies queued effects
3. SkillCoordinator executes final effect
4. EventBus broadcasts `skill:triggered`

**Keyboard Adjacency (Novel Pattern):**
```typescript
// CORRECT: Use AdjacencyMap
const adjacent = adjacencyMap.getAdjacent('F')  // ['D', 'G', 'R', 'T', 'C', 'V']

// WRONG: Hardcode adjacency
const adjacent = ['D', 'G']  // Incomplete, will break skills
```

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
| Data definitions | `data/` | `skills.ts` |

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
- **Save during battle:** Queue save, execute on battle end
- **Steam offline:** Graceful fallback, local achievements

---

## Quick Reference

### New Skill Checklist

- [ ] Define in `data/skills.ts`
- [ ] Determine system: passive (position) or active (queue)
- [ ] Implement in appropriate `systems/skills/` subfolder
- [ ] Add to SkillCoordinator if needs cross-system logic
- [ ] Create sound in audio pool
- [ ] Add visual feedback in `ui/effects/`

### New Scene Checklist

- [ ] Extend Scene interface with all lifecycle hooks
- [ ] Register in SceneManager
- [ ] Define valid transitions in GameStateMachine
- [ ] Handle onPause/onResume for overlays

---

_Last updated: 2026-02-16_
