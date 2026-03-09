// ============================================
// 打字肉鸽 - 职业管理器
// ============================================
// Story 32.1 Task 2: ClassManager

import type { ClassId } from '../../core/types';
import type { ClassDefinition } from '../../data/classes';
import { CLASS_DEFINITIONS, getClassDefinition } from '../../data/classes';
import { state, addRelicWithCapacity } from '../../core/state';

/**
 * ClassManager - 管理职业注册和当前选中职业
 *
 * 职责：
 * - 注册职业定义
 * - 查询当前职业
 * - 选择职业（写入 state + 添加 starterRelic）
 * - 重置职业（Run 结束时）
 */
class ClassManagerImpl {
  private registry: Map<ClassId, ClassDefinition> = new Map();

  constructor() {
    // 自动注册所有内置职业
    for (const def of Object.values(CLASS_DEFINITIONS)) {
      this.register(def);
    }
  }

  /**
   * 注册职业定义
   */
  register(def: ClassDefinition): void {
    this.registry.set(def.id, def);
  }

  /**
   * 获取当前选中的职业定义
   */
  getCurrentClass(): ClassDefinition {
    return getClassDefinition(state.classId);
  }

  /**
   * 选择职业
   * - 写入 state.classId
   * - 如有 starterRelic，自动加入背包
   */
  selectClass(classId: ClassId): void {
    const def = this.registry.get(classId);
    if (!def) {
      console.warn(`ClassManager: Unknown classId "${classId}"`);
      return;
    }

    state.classId = classId;

    // 添加初始遗物
    if (def.starterRelic) {
      addRelicWithCapacity(def.starterRelic);
    }
  }

  /**
   * 重置职业为 none
   *
   * 注意：当前游戏通过 window.location.reload() 重开，resetState() 中
   * createInitialState() 已将 classId 设为 'none'，因此本方法暂未被显式调用。
   * 保留此方法供未来非 reload 重开流程使用。
   */
  resetClass(): void {
    state.classId = 'none';
  }

  /**
   * 获取已注册的职业定义
   */
  getClassDefinition(classId: ClassId): ClassDefinition | undefined {
    return this.registry.get(classId);
  }

  /**
   * 获取所有已注册职业
   */
  getAllClasses(): ClassDefinition[] {
    return Array.from(this.registry.values());
  }
}

/** 全局单例 */
export const classManager = new ClassManagerImpl();
