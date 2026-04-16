// Story 59.4 — modifiers/engine 子模块入口
//
// 重要：本 barrel 只导出 engine/ 下的符号。
// **刻意不从 parent ../index.ts 重导出**，避免 Epic 11 legacy 和 v1.1 engine 的 API 在
// 同一 import 路径下混淆。详见 ./README.md。

export { ModifierEngine } from './ModifierEngine'
export type {
  EngineModifier,
  EngineModifierContext,
  EngineModifierHost,
  EngineModifierKind,
  EngineModifierResult,
  EngineModifierScope,
  EngineModifierSource,
} from './types'
