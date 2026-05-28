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
import { hookOnResourceConsumed, hookOnRemoved, hookOnSkillConsumed, type SourcedResult } from './affixV2Equipped'
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

// on_removed 死亡回响 re-entrancy 防护（深度 1）· 镜像 affixV2BattleIntegration._inRemovalReaction：
// 被移除 skill 的 on_removed 若自身又取代别的 skill，其取代照常移除+产出，但不再二次派发 on_removed
// → 杜绝 consume→on_removed→consume→… 无限链。
let _inBuildRemovalReaction = false

/** 建造期死亡回响（深度 1 限流）· 永久移除前派发：被移除 skill 上的 on_removed 词条以 persistScope='run' 结算一次 */
function dispatchBuildSkillRemoved(skillId: string): void {
  if (_inBuildRemovalReaction) return
  _inBuildRemovalReaction = true
  try {
    const reactions = hookOnRemoved(skillId, defaultResourceLv1Base, defaultGetPlayerResource, Date.now(), 'run')
    processV2BuildResults(reactions)
  } finally {
    _inBuildRemovalReaction = false
  }
}

// on_skill_consumed 观察者 re-entrancy 防护（深度 1）· 镜像 affixV2BattleIntegration._inSkillConsumedReaction：
// 旁观词条若自身又取代别的 skill，其取代照常结算但不再二次派发观察者 → 杜绝 consume→observe→consume→… 无限链
// （独立于 on_removed 桶，与战斗集成一致）。
let _inBuildSkillConsumedReaction = false

/** 建造期「有技能被取代」全局观察者（深度 1 限流）· 永久移除后派发：全场 on_skill_consumed 词条以 persistScope='run' 各结算一次 ·
 *  移除后派发 → 被移除 skill 已离场，自然不自观察、不被取对象效果重选（建造期为永久删除，无战斗的 consumed 集语义）。 */
function dispatchBuildSkillConsumed(skillId: string): void {
  if (_inBuildSkillConsumedReaction) return
  _inBuildSkillConsumedReaction = true
  try {
    const reactions = hookOnSkillConsumed(skillId, defaultResourceLv1Base, defaultGetPlayerResource, Date.now(), 'run')
    processV2BuildResults(reactions)
  } finally {
    _inBuildSkillConsumedReaction = false
  }
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
      // 死亡回响：必须在解绑/删除前派发（之后该 skill 的词条已不在 _equipped）· persistScope='run' 永久结算
      dispatchBuildSkillRemoved(rm.targetSkillId)
      removeSkillPermanently(rm.targetSkillId)
      if (PERSISTENT_RESOURCES.has(removed.resource) && payout !== 0) addPermanentGold(payout)
      // 全局观察者：移除后派发（被移除 skill 已离场，旁观词条在其他技能上各响一次）· persistScope='run'
      dispatchBuildSkillConsumed(rm.targetSkillId)
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
// 建造期「消耗 gold」入口 · 派发 on_resource_consumed(persistScope='run')
// ============================================

/** 建造期消耗 goldAmount 点 gold → 派发 on_resource_consumed 反应（永久结算）· 返回是否有改动（供 UI 刷新）·
 *  导出以便单测直接调（绕开 eventBus / UI 刷新）。 */
export function runBuildResourceConsumed(goldAmount: number): boolean {
  if (!goldAmount || goldAmount <= 0) return false
  // _equipped 在 battle:start 才 resync；建造期布局随时变 → 每次按当前 bindings 重同步
  resyncV2EquipmentFromState()
  const results = hookOnResourceConsumed(
    'gold', goldAmount,
    defaultResourceLv1Base,
    defaultGetPlayerResource,
    Date.now(),
    'run',
  )
  return processV2BuildResults(results)
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
    if (runBuildResourceConsumed(price)) refreshBuildUI()
  })
}
