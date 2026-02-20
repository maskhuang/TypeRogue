// ============================================
// 打字肉鸽 - ModifierRegistry 修饰器注册中心
// ============================================
// Story 11.1: 统一效果管道的数据层

import type { Modifier, ModifierTrigger, ModifierPhase } from './ModifierTypes'

/**
 * 修饰器注册中心
 *
 * 职责:
 * - 管理所有活跃的 Modifier（技能绑定时注册，解绑时移除；遗物获取时注册）
 * - 按 trigger/phase/source 查询修饰器
 * - 查询结果按 priority 升序排序
 */
export class ModifierRegistry {
  private modifiers = new Map<string, Modifier>()

  // === 注册 ===

  /** 注册一个修饰器（重复 id 会覆盖旧的） */
  register(modifier: Modifier): void {
    this.modifiers.set(modifier.id, modifier)
  }

  /** 批量注册多个修饰器 */
  registerMany(modifiers: Modifier[]): void {
    for (const mod of modifiers) {
      this.register(mod)
    }
  }

  // === 移除 ===

  /** 按 id 移除修饰器 */
  unregister(id: string): void {
    this.modifiers.delete(id)
  }

  /** 移除所有来自同一 source 的修饰器 */
  unregisterBySource(source: string): void {
    for (const [id, mod] of this.modifiers) {
      if (mod.source === source) {
        this.modifiers.delete(id)
      }
    }
  }

  // === 查询 ===

  /** 按 trigger 查询（可选按 phase 过滤），按 priority 升序排序 */
  getByTrigger(trigger: ModifierTrigger, phase?: ModifierPhase): Modifier[] {
    const result: Modifier[] = []
    for (const mod of this.modifiers.values()) {
      if (mod.trigger !== trigger) continue
      if (phase !== undefined && mod.phase !== phase) continue
      result.push(mod)
    }
    return result.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
  }

  /** 按 source 查询，按 priority 升序排序 */
  getBySource(source: string): Modifier[] {
    const result: Modifier[] = []
    for (const mod of this.modifiers.values()) {
      if (mod.source === source) {
        result.push(mod)
      }
    }
    return result.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
  }

  /** 获取所有修饰器，按 priority 升序排序 */
  getAll(): Modifier[] {
    return Array.from(this.modifiers.values()).sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
  }

  // === 工具 ===

  /** 检查是否存在指定 id 的修饰器 */
  has(id: string): boolean {
    return this.modifiers.has(id)
  }

  /** 返回注册的修饰器数量 */
  count(): number {
    return this.modifiers.size
  }

  /** 清除所有修饰器 */
  clear(): void {
    this.modifiers.clear()
  }
}
