// ============================================
// 打字肉鸽 - 造词师采集队列
// ============================================
// Story 32.4: 字母碎片资源 + 采集队列

import { state } from '../../core/state';
import { random } from '../../core/seededRandom';

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
 * 概率溢出：将浮点碎片数转换为离散整数
 * floor(raw) = 保底，frac(raw) = 额外 +1 概率
 */
export function resolveFragmentAmount(rawAmount: number): number {
  const base = Math.floor(rawAmount);
  const frac = rawAmount - base;
  return frac > 0 && random() < frac ? base + 1 : base;
}

/**
 * 按采集队列分配碎片到字母池
 * 返回分配结果（如 {e: 2, a: 1}）
 * 跳过 '_' 格，推进队列位置
 */
export function distributeFragments(amount: number): Record<string, number> {
  const result: Record<string, number> = {};
  const queue = state.fragmentQueue;
  if (queue.length === 0 || amount <= 0) return result;

  let distributed = 0;
  let safetyLimit = queue.length; // 防止全 '_' 死循环
  while (distributed < amount && safetyLimit > 0) {
    const letter = queue[state.fragmentQueuePosition % queue.length];
    state.fragmentQueuePosition = (state.fragmentQueuePosition + 1) % queue.length;
    if (letter === '_') {
      safetyLimit--;
      continue;
    }
    safetyLimit = queue.length; // 遇到有效字母重置安全计数
    result[letter] = (result[letter] ?? 0) + 1;
    // 碎片棱镜：同时产出字母表相邻字母
    if (state.player.relics.has('fragment_prism')) {
      const code = letter.charCodeAt(0);
      if (code > 97) { // 'a' = 97, skip left for 'a'
        const left = String.fromCharCode(code - 1);
        result[left] = (result[left] ?? 0) + 1;
      }
      if (code < 122) { // 'z' = 122, skip right for 'z'
        const right = String.fromCharCode(code + 1);
        result[right] = (result[right] ?? 0) + 1;
      }
    }
    distributed++;
  }
  return result;
}

/**
 * 碎片路由：概率溢出 + 队列分配 + 写入库存
 * 统一入口，供 triggerProducer / triggerConverter / triggerConverterWithReduction 调用
 */
export function routeFragmentsToInventory(absDelta: number): void {
  state.classResourceProduced.fragment = (state.classResourceProduced.fragment ?? 0) + absDelta;
  const actualAmount = resolveFragmentAmount(absDelta);
  const distributed = distributeFragments(actualAmount);
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
