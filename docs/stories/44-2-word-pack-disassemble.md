# Story 44.2: 词包购买 → 碎片拆解

## Status: ready-for-dev

## Story

作为造词师玩家，我购买词包后应获得字母碎片而非直接获得词语，这样我可以自由决定用碎片组装什么词。

## 验收标准 (AC)

### AC1: 词包拆解逻辑
- 造词师购买词包选词后，词不加入 wordDeck
- 选中的词拆解为字母碎片：`"apple" → { a:1, p:2, l:1, e:1 }`
- 碎片加入 `fragmentInventory`

### AC2: 商店 UI 适配
- 造词师的词包购买界面显示"拆解为碎片"而非"加入词库"
- 购买确认后显示获得的碎片明细（如 `+1a +2p +1l +1e`）
- 购买反馈动画适配（碎片飞入库存而非词库）

### AC3: 非造词师不受影响
- 无职业/蜕变师购买词包仍直接加入词库（原逻辑不变）

### AC4: 移除旧版直接加词逻辑
- 造词师分支不再调用 `wordDeck.push(word)`
- 确保造词师只能通过流水线组装获得新词

## 技术说明

### 涉及文件
- `src/src/data/wordPacks.ts` — 购买流程分支（造词师 → 拆解）
- `src/src/systems/shop.ts` — 词包购买 UI 反馈
- `src/src/systems/classes/FragmentQueue.ts` — 碎片写入（复用现有 fragmentInventory 写入逻辑）

### 依赖
- Story 44.1 完成（fragmentInventory 已确认保留）
