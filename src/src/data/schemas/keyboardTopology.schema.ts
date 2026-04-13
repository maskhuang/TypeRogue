/**
 * keyboardTopology JSON schema
 *
 * 描述键盘静态拓扑数据：列/行/手/指/对称位映射。
 * 派生表（columnMap/rowMap）由 extract 脚本预先从 KEYBOARD_ROWS 计算并冻结到 JSON，
 * Godot 端无需再实现派生逻辑。
 *
 * 运行时函数（hasRelation / isAdjacent / ...）保留在 keyboardTopology.ts。
 */

import { z } from 'zod';
import keyboardTopologyJson from '../../../data-json/keyboardTopology.json' with { type: 'json' };

const handSchema = z.enum(['left', 'right']);

const keyToNumberMap = z.record(z.string(), z.number().int().nonnegative());
const keyToHandMap = z.record(z.string(), handSchema);
const keyToKeyMap = z.record(z.string(), z.string());

export const keyboardTopologySchema = z.object({
  columnMap: keyToNumberMap,
  rowMap: keyToNumberMap,
  handMap: keyToHandMap,
  fingerMap: keyToNumberMap,
  symmetricPairs: keyToKeyMap,
});

export type KeyboardTopologyData = z.infer<typeof keyboardTopologySchema>;

// 启动时校验：dev 模式抛错，prod 静默通过
function loadKeyboardTopology(): KeyboardTopologyData {
  // import.meta.env 可能不存在（Node 测试环境），用 try-catch 兜底
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDev = (import.meta as any).env?.DEV !== false;
  if (isDev) {
    return keyboardTopologySchema.parse(keyboardTopologyJson);
  }
  return keyboardTopologyJson as KeyboardTopologyData;
}

export const KEYBOARD_TOPOLOGY_DATA: KeyboardTopologyData = loadKeyboardTopology();
