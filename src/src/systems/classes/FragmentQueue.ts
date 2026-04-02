// ============================================
// 打字肉鸽 - 造词师采集队列
// ============================================
// Story 32.4: 字母碎片资源 + 采集队列

import { state } from '../../core/state';

const BASE_QUEUE_LENGTH = 6;

/**
 * 获取当前最大队列长度（基础 6，遗物可扩展）
 */
export function getMaxQueueLength(): number {
  let max = BASE_QUEUE_LENGTH;
  if (state.player.relics.has('masters_lexicon')) max += 2;
  return max;
}

/**
 * 按采集队列分配碎片到字母池（支持浮点累积）
 * 每个队列格最多分配 1.0，尾格接收剩余小数部分
 * 跳过 '_' 格，推进队列位置
 */
export function distributeFragments(amount: number): Record<string, number> {
  const result: Record<string, number> = {};
  const queue = state.fragmentQueue;
  if (queue.length === 0 || amount <= 1e-9) return result;

  let remaining = amount;
  let safetyLimit = queue.length; // 防止全 '_' 死循环
  while (remaining > 1e-9 && safetyLimit > 0) {
    const letter = queue[state.fragmentQueuePosition % queue.length];
    state.fragmentQueuePosition = (state.fragmentQueuePosition + 1) % queue.length;
    if (letter === '_') {
      safetyLimit--;
      continue;
    }
    safetyLimit = queue.length; // 遇到有效字母重置安全计数
    const portion = Math.min(remaining, 1);
    result[letter] = (result[letter] ?? 0) + portion;
    remaining -= portion;
  }
  return result;
}

/**
 * 碎片路由：浮点累积 + 队列分配 + 写入库存
 * 统一入口，供 triggerProducer / triggerConverter / triggerConverterWithReduction 调用
 */
export function routeFragmentsToInventory(absDelta: number): void {
  state.classResourceProduced.energy = (state.classResourceProduced.energy ?? 0) + absDelta;
  const distributed = distributeFragments(absDelta);
  for (const [letter, count] of Object.entries(distributed)) {
    state.fragmentInventory[letter] = (state.fragmentInventory[letter] ?? 0) + count;
  }
}

const VALID_QUEUE_CHAR = /^[a-z_]$/;

/**
 * 设定采集队列内容（验证长度，字母小写化，过滤非法字符）
 */
export function setFragmentQueue(letters: string[]): void {
  const maxLen = getMaxQueueLength();
  const capped = letters.slice(0, maxLen)
    .map(l => l.toLowerCase())
    .map(l => VALID_QUEUE_CHAR.test(l) ? l : '_');
  state.fragmentQueue = capped;
  if (state.fragmentQueuePosition >= capped.length) {
    state.fragmentQueuePosition = 0;
  }
}
