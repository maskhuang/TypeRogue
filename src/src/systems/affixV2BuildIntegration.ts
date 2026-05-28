// ============================================
// 打字肉鸽 - 新 Affix 系统 · 建造期（战斗外）集成
// ============================================
// 双阶段触发模型的「战斗外」半边：把建造期的玩家动作接进 V2 affix hook，
// 用 persistScope='run' 让效果永久化（详 docs / 记忆 affix-dual-phase-trigger）。
//
// 第一刀：唯一的「双 trigger」= on_resource_consumed。
//   建造期「买东西」真实消耗 gold → 复用 on_resource_consumed 派发：
//     - coprophagy（reclaim_consumed）→ 永久 gold 返现（购物返现）
//     - supplant（consume_skill，仅 ~6% 实例抽到此 trigger）→ 永久吞掉一个产 gold 的技能换永久 gold
//   其余抽到 on_resource_consumed 的 recipe：纯战斗运行时态 effect 在 resolver 顶部已静默
//   （persistScope='run' guard），非持久资源产出在本层过滤掉 → 「无意义的直接静默」。
//
// 接入门槛：与战斗集成同纪律，_equipped 为空时 hook 返 [] = no-op。

import { state } from '../core/state'
import { eventBus } from '../core/events/EventBus'
import { getBindingState, unbindSkill } from './bindingManager'
import { hookOnResourceConsumed, type SourcedResult } from './affixV2Equipped'
import {
  defaultResourceLv1Base,
  defaultGetPlayerResource,
  resyncV2EquipmentFromState,
} from './affixV2BattleIntegration'
import { PERSISTENT_RESOURCES } from './affixV2Effect'

// ============================================
// 永久 gold 注入 · 镜像 affixV2BattleIntegration.applyResourceAmount 的 gold 三写
// ============================================

function addPermanentGold(amount: number): void {
  if (amount === 0) return
  const r = state.resources as unknown as Record<string, number>
  r.gold = (r.gold ?? 0) + amount
  state.gold = (state.gold ?? 0) + amount
  state.player.gold = (state.player.gold ?? 0) + amount
}

/** 永久移除一个技能（建造期 supplant）· 镜像 shop.sellSkill 的解绑+删除，但不退售价（产出走 supplant payout）*/
function removeSkillPermanently(skillId: string): void {
  unbindSkill(getBindingState(state), skillId)
  state.affixSkills.delete(skillId)
  state.affixSkillStates.delete(skillId)
  state.player.skills.delete(skillId)
}

// ============================================
// 建造期结果处理 · 只落「持久产出 / 结构改动」，其余忽略（战斗运行时态在 resolver 已静默）
// ============================================

function processV2BuildResults(results: readonly SourcedResult[]): boolean {
  let changed = false
  for (const sr of results) {
    // 持久资源产出（reclaim_consumed / gain_resource）· 非持久资源直接丢弃（无意义静默）
    for (const prod of sr.result.resourceProduced) {
      if (!PERSISTENT_RESOURCES.has(prod.resource) || prod.amount === 0) continue
      addPermanentGold(prod.amount)
      changed = true
    }
    // 永久移除（supplant / consume_skill）· resolver 已把 'run' 目标收紧到产 gold 技能
    for (const rm of sr.result.skillsRemoved) {
      const removed = state.affixSkills.get(rm.targetSkillId)
      if (!removed) continue
      // 产出 = ratio × 被移除技能 gold Lv.N base（与战斗 applySkillConsume 同公式 · 这里恒 gold）
      const payout = rm.ratio * defaultResourceLv1Base(removed.resource, removed.level ?? 1)
      removeSkillPermanently(rm.targetSkillId)
      if (PERSISTENT_RESOURCES.has(removed.resource) && payout !== 0) addPermanentGold(payout)
      changed = true
    }
  }
  return changed
}

/** 建造期 UI 刷新 · 动态 import 避免把重模块 shop.ts 拉进早期 init（同 TutorialMode 纪律）*/
function refreshBuildUI(): void {
  if (typeof document === 'undefined') return
  import('./shop').then(m => {
    m.renderBuildManager?.()
    m.updateGoldDisplay?.()
  }).catch(() => { /* shop 未加载（不在建造期）→ 忽略 */ })
}

// ============================================
// 订阅装配
// ============================================

let _wired = false

/** 装上 V2 建造期集成订阅（idempotent）· 在 main.ts 与 wireV2BattleIntegration 一起调 */
export function wireV2BuildIntegration(): void {
  if (_wired) return
  _wired = true

  // shop:purchase → 买东西消耗 gold → 派发 on_resource_consumed（persistScope='run'）
  // price 来自事件（classic / terminal / ShopScene 三套商店均带）· 免费（smuggle，price=0）不触发
  eventBus.on('shop:purchase', ({ price }) => {
    if (!price || price <= 0) return
    // _equipped 在 battle:start 才 resync；建造期布局随时变 → 每次购买前按当前 bindings 重同步
    resyncV2EquipmentFromState()
    const results = hookOnResourceConsumed(
      'gold', price,
      defaultResourceLv1Base,
      defaultGetPlayerResource,
      Date.now(),
      'run',
    )
    if (processV2BuildResults(results)) refreshBuildUI()
  })
}
