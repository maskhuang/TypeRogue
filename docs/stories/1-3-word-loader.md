# Story 1.3: 词库加载器

Status: done

## Story

As a **玩家**,
I want **游戏能加载不同难度和语言的词库**,
so that **我能根据自己的水平选择合适的词语练习**.

## Acceptance Criteria

1. **AC1:** 从 `assets/data/words/` 加载 JSON 词库文件
2. **AC2:** 支持按语言/类别懒加载词库
3. **AC3:** 缓存已加载的词库，避免重复请求
4. **AC4:** 词库格式支持: `{ words: string[], difficulty?: number[] }`
5. **AC5:** 提供随机获取词语的方法
6. **AC6:** 与现有 words.ts 数据兼容

## Tasks / Subtasks

- [x] **Task 1: 定义词库数据结构** (AC: 4)
  - [x] 1.1 创建 WordList 接口
  - [x] 1.2 创建 WordEntry 接口（含难度）
  - [x] 1.3 类型定义在 WordLoader.ts 本地

- [x] **Task 2: 创建 WordLoader 类** (AC: 1, 2, 3)
  - [x] 2.1 创建 `src/systems/typing/WordLoader.ts`
  - [x] 2.2 实现 load(category) 方法
  - [x] 2.3 实现缓存机制 (Map)
  - [x] 2.4 处理加载错误

- [x] **Task 3: 实现词语获取方法** (AC: 5)
  - [x] 3.1 实现 getRandomWord(wordList) 方法
  - [x] 3.2 实现 getWordsByDifficulty(wordList, maxDifficulty) 方法
  - [x] 3.3 实现 getRandomWordFromCategories(categories) 混合获取

- [x] **Task 4: 创建默认词库文件** (AC: 4, 6)
  - [x] 4.1 创建 public/assets/data/words/ 目录
  - [x] 4.2 创建 starter.json, common.json
  - [x] 4.3 创建 f-words.json, s-words.json, long.json

- [x] **Task 5: 集成验证** (AC: 1-6)
  - [x] 5.1 现有 words.ts 保持兼容
  - [x] 5.2 TypeScript 编译通过

## Dev Notes

### 架构约束

- **位置:** `src/systems/typing/WordLoader.ts`
- **资产:** `assets/data/words/*.json`
- **模式:** 懒加载 + 缓存

### 词库 JSON 格式

```json
{
  "name": "starter",
  "language": "en",
  "words": ["fire", "ice", "bolt", "spark"],
  "difficulty": [1, 1, 2, 1]
}
```

### 关键实现细节

```typescript
interface WordList {
  name: string
  language: string
  words: string[]
  difficulty?: number[]
}

class WordLoader {
  private cache = new Map<string, WordList>()

  async load(category: string): Promise<WordList> {
    if (this.cache.has(category)) {
      return this.cache.get(category)!
    }

    const response = await fetch(`/assets/data/words/${category}.json`)
    const data: WordList = await response.json()
    this.cache.set(category, data)
    return data
  }

  getRandomWord(category?: string): string {
    // ...
  }
}
```

### References

- [Source: docs/game-architecture.md#Data Access] - DataManager 模式
- [Source: docs/epics.md#Story 1.3] - 验收标准
- [Source: src/data/words.ts] - 现有词库数据

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript 编译: 无错误

### Completion Notes List

1. 创建了 WordLoader 类，支持懒加载和缓存
2. 实现了 load(), preload(), getRandomWord() 等方法
3. 支持按难度筛选 getWordsByDifficulty()
4. 创建了 5 个 JSON 词库文件
5. 与现有 words.ts 保持兼容

### File List

**Created:**
- `src/systems/typing/WordLoader.ts` - 词库加载器
- `public/assets/data/words/starter.json` - 基础词库
- `public/assets/data/words/common.json` - 常见词库
- `public/assets/data/words/f-words.json` - F 系列词库
- `public/assets/data/words/s-words.json` - S 系列词库
- `public/assets/data/words/long.json` - 长词词库

**Modified:**
- `src/systems/typing/index.ts` - 添加 WordLoader 导出
