// ============================================
// 打字肉鸽 - 技能系统（词条制）
// ============================================
// Epic 35 清理：仅保留词条制技能触发逻辑

import { state, synergy } from '../core/state';
import { onSkillFireV2 } from './affixV2BattleIntegration';
import { RESOURCE_COLORS } from '../core/constants';
import type { ResourceType, PseudoInfiniteState } from '../core/types';
import { t } from '../demo/demo-i18n';
import { getElements } from '../ui/elements';
import { playSound, emitResourceSound } from '../effects/sound';
import { showFeedback, setPseudoInfiniteVisual, resolveChainAnchor, performAutocomplete, getChargeAutoMultBonus } from './battle';
import { routeEnergyToPipeline, consumeCompletedWord, updatePipelineHUD } from './classes/AssemblyPipeline';
import { GENERIC_RESOURCES } from './classes/ClassResourceFilter';
import { getFloatScale } from '../effects/juice';
import { eventBus } from '../core/events/EventBus';
import { random } from '../core/seededRandom';
import { orchestrateAffixTrigger } from './affixTriggerOrchestrator';
import { getAscendBaseScale, canAscend, executeAscend, RES_ENCHANTMENT_BY_RESOURCE, APPRENTICE_RES_EXP_RATE, APPRENTICE_CRIT_GROWTH } from '../data/affixTrigger';
import { getMultiplierPrismBonus, getCancelChainBonus } from './relics/ComboRelicBehaviors';
import { getTaikoBonus } from './relics/TypingRelicBehaviors';
import { getFirstStrikeBonus, getLessIsMoreBonus, trackWordAffixTypes, resetWordAffixTypes, getUncrownedKingAffixlessBonus } from './relics/SkillRelicBehaviors';
import { getApprenticeGrowthMultiplier, getEnchantDividendGold, getEnchantBoostBonus } from './relics/EnchantmentRelicBehaviors';
import { getAdjacentPowerBonus, getCornerPowerBonus, recordLineClearHit } from './relics/TopologyRelicBehaviors';
import { getSkillKeys, getBindingState, unbindSkill } from './bindingManager';
import { getShortSprintBonus, getLongWordCritBonus } from './relics/WordRelicBehaviors';
import { getResourceTideBonus, getResourceFocusBonus, getResourceDiversityBonus, rollProductionDividend, getTimeTrickle, applyFurnaceConversion } from './relics/ResourceRelicBehaviors';
import { getWarmUpBonus, getDesperateCritRate } from './relics/StageRelicBehaviors';
import { getLuckyStrikeCritRate, getCritBonusGold, isCritChargeReady, consumeCritCharge, advanceCritCharge, recordWordCrit, isFateCoinActive } from './relics/CritRelicBehaviors';
import { getFuryBeatCritRate } from './relics/ComboRelicBehaviors';
import { getRuneSpikeCritRate } from './relics/EnchantmentRelicBehaviors';
import { getPrecisionStrikeCritRate } from './relics/TopologyRelicBehaviors';
import { AffixType, EnchantmentType as EnchantmentTypeEnum, BASE_VALUES, applyAffixLevelScaling, SWARM_BONUS_TABLE } from '../data/affixes';
import type { PositionRelation } from '../data/keyboardTopology';
import { rollAffixParams } from '../data/skillGeneration';
import { inputHandler } from './typing/InputHandler';


// === 战后统计：记录技能触发 ===
const EMPTY_RESOURCES = { base: 0, score: 0, multiplier: 0, time: 0, shield: 0, gold: 0, energy: 0, mutagen: 0 };

export function recordSkillTrigger(
  skillId: string,
  triggerKey: string | undefined,
  resource: ResourceType,
  delta: number,
  isChain: boolean,
): void {
  const bs = state.battleStats;
  if (!bs || !triggerKey) return;
  // key stats
  let ks = bs.keyStats.get(triggerKey);
  if (!ks) { ks = { triggerCount: 0, resources: { ...EMPTY_RESOURCES } }; bs.keyStats.set(triggerKey, ks); }
  ks.triggerCount++;
  ks.resources[resource] += Math.abs(delta);
  // skill stats
  let ss = bs.skillStats.get(skillId);
  if (!ss) { ss = { triggerCount: 0, resources: { ...EMPTY_RESOURCES }, chainTriggered: 0 }; bs.skillStats.set(skillId, ss); }
  ss.triggerCount++;
  ss.resources[resource] += Math.abs(delta);
  if (isChain) {
    ss.chainTriggered++;
    bs.totalChainTriggers++;
  }
  // T1 遗物：追踪本词产出的资源种类
  if (Math.abs(delta) > 0) {
    _wordResourceTypes.add(resource);
  }
}

// T1 遗物支持：追踪本词已产出的不同资源种类
const _wordResourceTypes = new Set<string>();
// T1 遗物支持：本词是否有产出者触发过（熔炉之心使用）
let _wordHasProducerTriggered = false;

// === 追踪本词各资源产出量（boss_keystroke_tax 资源触发用）===
const _currentWordOutput: Record<string, number> = {};

/** Story 45: 本关累积资源产出追踪（供 PhaseShift/EndoExo/Fusion 读取） */
const _stageProduced: Partial<Record<ResourceType, number>> = {};

/** 重置本关累积产出（每关开始时调用） */
export function resetStageProduced(): void {
  for (const key of Object.keys(_stageProduced)) delete _stageProduced[key as ResourceType];
}

/** 记录本关资源产出（applyResource 正产出时调用） */
export function recordStageProduced(resource: ResourceType, amount: number): void {
  if (amount > 0) {
    _stageProduced[resource] = (_stageProduced[resource] ?? 0) + amount;
  } else if (amount < 0) {
    // 消耗扣减累积产出（不低于 0）
    _stageProduced[resource] = Math.max(0, (_stageProduced[resource] ?? 0) + amount);
  }
}

/** 获取本关累积产出快照（注入 TriggerContext） */
export function getStageProduced(): Partial<Record<ResourceType, number>> {
  return { ..._stageProduced };
}

/** 重置本词资源产出追踪（每词开始时调用） */
export function resetWordResourceOutput(): void {
  for (const key of Object.keys(_currentWordOutput)) {
    delete _currentWordOutput[key];
  }
}

/** 记录本词资源产出（applyResource 中调用） */
export function recordWordResourceOutput(resource: ResourceType, amount: number): void {
  _currentWordOutput[resource] = (_currentWordOutput[resource] ?? 0) + amount;
}

/** 查询本词某资源产出量（completeWord 中查询被征税资源） */
export function getWordResourceOutput(resource: string): number {
  return _currentWordOutput[resource] ?? 0;
}

/** 获取本词累积产出快照（注入 TriggerContext） */
export function getWordProduced(): Partial<Record<ResourceType, number>> {
  return { ..._currentWordOutput } as Partial<Record<ResourceType, number>>;
}

/** 获取本词已产出的资源种类数 */
export function getWordResourceTypeCount(): number {
  return _wordResourceTypes.size;
}

/** 本词是否有产出者触发过 */
export function hasProducerTriggeredThisWord(): boolean {
  return _wordHasProducerTriggered;
}

/** 重置词级追踪（每词开始时调用） */
export function resetWordResourceTypes(): void {
  _wordResourceTypes.clear();
  _wordHasProducerTriggered = false;
  resetWordAffixTypes();
  // 重置本词资源产出追踪
  resetWordResourceOutput();
}

/**
 * Charge 按住蓄力 — 每帧更新充能值。
 * 遍历当前 held keys → 查 bindings → 找 Charge affix → 累加 chargeAccumulated。
 * 返回本帧刚蓄满的 key 列表（大写），供 battle.ts 自动释放。
 */
export function updateChargeProducers(dt: number): string[] {
  const heldKeys = inputHandler.getHeldKeys()
  const justFull: string[] = []
  if (heldKeys.size === 0) return justFull

  for (const [key] of heldKeys) {
    const skillId = state.player.bindings.get(key.toLowerCase())
    if (!skillId) continue
    const skill = state.affixSkills.get(skillId)
    if (!skill) continue
    const rt = state.affixSkillStates.get(skillId)
    if (!rt) continue

    const chargeAffix = skill.affixes.find(a => a.type === AffixType.Charge)
    if (!chargeAffix) continue

    const maxBonus = chargeAffix.maxBonus ?? 2.5
    if (rt.chargeAccumulated >= maxBonus) continue

    // 固定速率：每 0.2s 蓄 1.0 倍率
    const rate = 1.0 / 0.2
    rt.chargeAccumulated = Math.min(
      rt.chargeAccumulated + rate * dt,
      maxBonus,
    )
    if (rt.chargeAccumulated >= maxBonus) {
      justFull.push(key.toUpperCase())
    }
  }
  return justFull
}

/** 检查技能是否有 Charge 词条 */
export function isChargeSkill(skillId: string): boolean {
  const skill = state.affixSkills.get(skillId)
  return !!skill && skill.affixes.some(a => a.type === AffixType.Charge)
}

export function isReechoSkill(skillId: string): boolean {
  const skill = state.affixSkills.get(skillId)
  return !!skill && skill.affixes.some(a => a.type === AffixType.Reecho)
}

// === 技能键命中率计算 ===
export function computeSkillDensity(word: string): number {
  if (!word || word.length === 0) return 0
  const w = word.toLowerCase()
  let hits = 0
  for (const ch of w) {
    if (state.player.bindings.has(ch)) hits++
  }
  return hits / w.length
}


// === 资源标签 ===
function getResourceLabel(r: ResourceType): string {
  return t(`unit.${r}`);
}

// === 连接者：进入伪无限模式 ===
export function enterPseudoInfinite(participantKeys: string[]): void {
  // 已有伪无限运行中则合并参与者
  if (state.pseudoInfiniteState) {
    for (const k of participantKeys) {
      if (!state.pseudoInfiniteState.participantKeys.includes(k)) {
        state.pseudoInfiniteState.participantKeys.push(k);
      }
    }
    return;
  }

  const piState: PseudoInfiniteState = { intervalId: 0, participantKeys: [...participantKeys] };
  state.pseudoInfiniteState = piState;
  setPseudoInfiniteVisual(true);

  const intervalId = setInterval(() => {
    if (state.phase !== 'battle') {
      clearPseudoInfinite();
      return;
    }
    const keys = state.pseudoInfiniteState?.participantKeys ?? [];
    for (const key of keys) {
      const sid = state.player.bindings.get(key);
      if (!sid) continue;
      if (state.affixSkills.has(sid)) {
        triggerSkill(sid, key);
      }
    }
  }, 250);

  piState.intervalId = intervalId as unknown as number;
}

// === 连接者：清理伪无限模式 ===
export function clearPseudoInfinite(): void {
  if (state.pseudoInfiniteState) {
    clearInterval(state.pseudoInfiniteState.intervalId);
    state.pseudoInfiniteState = null;
    setPseudoInfiniteVisual(false);
  }
}

// === 触发技能（词条制） ===
export function triggerSkill(
  skillId: string, triggerKey: string,
  overrideAnchor?: { letterIndex?: number; fromElementId?: string },
  outputScale?: number,
): void {
  if (state.affixSkills.has(skillId)) {
    triggerAffixSkillWithFeedback(skillId, triggerKey, overrideAnchor, outputScale);
  }
  // 未知技能：静默忽略
}

// === 词条制技能触发 + 浮字反馈 ===
function triggerAffixSkillWithFeedback(
  skillId: string, triggerKey: string,
  overrideAnchor?: { letterIndex?: number; fromElementId?: string },
  outputScale?: number,
): void {
  const skill = state.affixSkills.get(skillId)!;

  synergy.wordSkillCount++;
  synergy.triggeredSkillIds.add(skillId);
  _wordHasProducerTriggered = true;

  // Story 40.8: 获取多格技能占据的所有键位
  const occupiedKeys = getSkillKeys(getBindingState(state), skillId);
  if (occupiedKeys.length === 0) occupiedKeys.push(triggerKey); // 防御性回退

  // 暴击蓄力：在 ctx 构建前检查，构建后立即消耗
  const fateCoinActive = isFateCoinActive();
  const critChargeReady = isCritChargeReady();

  // 构建触发上下文
  const ctx = {
    triggerKey,
    occupiedKeys,
    currentWord: state.player.word,
    resources: { ...state.resources, gold: state.gold ?? 0 },
    playerGold: state.gold ?? 0,
    targetScore: state.targetScore ?? 0,
    currentTime: state.time ?? 0,
    initialTime: state.timeMax ?? 30,
    classResourceProduced: { ...state.classResourceProduced },
    bindings: state.player.bindings,
    skillStates: state.affixSkillStates,
    allSkills: state.affixSkills,
    randomFn: random,
    comboCount: state.combo,
    playerClass: state.classId,
    // Story 36.5: 附魔遗物注入（避免 data→systems 依赖）
    apprenticeGrowthMultiplier: getApprenticeGrowthMultiplier(),
    // Story 41-3: 质变 Ligature 关卡累计按键计数
    ligatureStageCounts: state.ligatureStageCounts,
    stageWordCounts: state.stageWordCounts,
    fragmentQueue: state.fragmentQueue,
    // §12 暴击遗物注入
    baseCritRate: getLuckyStrikeCritRate()
      + (critChargeReady ? 1.0 : 0)
      + getFuryBeatCritRate()
      + getRuneSpikeCritRate()
      + getPrecisionStrikeCritRate(triggerKey)
      + getLongWordCritBonus(state.player.word.length)
      + getDesperateCritRate(),
    fateCoinActive,
    // 旧叠层子系统遗物已 V2 重做为极速系（StackingRelicBehaviors）·
    // 旧 6-phase orchestrator 对 V2 skill 整体短路，以下 ctx 字段保留中性值仅为类型兼容
    perpetualIntervalMult: 1,
    critOverflowStacks: 0,
    surgeActive: false,
    overloadCircuitActive: false,
    neighborWatchActive: false,
    stackCritActive: false,   // V2 重做为极速 fire 必定暴击（affixV2BattleIntegration.onSkillFireV2）
    inscriptionFlowGrowth: 0,
    stageProduced: getStageProduced(),
    wordProduced: getWordProduced(),
    wordBaseScore: synergy.skillBaseScore,
  };

  // 暴击蓄力消耗（本次触发已注入 baseCritRate=1.0）
  if (critChargeReady) consumeCritCharge();

  // Story 41-3: 递增当前键的关卡累计计数
  state.ligatureStageCounts.set(triggerKey, (state.ligatureStageCounts.get(triggerKey) ?? 0) + 1);

  // Story 36.3 + 36.4 + 36.6 + 36.7: 遗物加算合并（倍率棱镜 + 首发强化 + 少而精 + 拓扑系遗物 + 短词冲刺）
  let relicBonus = 0;
  const prismBonus = getMultiplierPrismBonus();
  if (prismBonus > 0) relicBonus += prismBonus;
  const firstStrikeScore = getFirstStrikeBonus();
  if (firstStrikeScore > 0) state.score += firstStrikeScore;
  const lessIsMoreBonus = getLessIsMoreBonus();
  if (lessIsMoreBonus > 0) relicBonus += lessIsMoreBonus;
  // Story 36.6: 键盘拓扑遗物加算
  const adjacentBonus = getAdjacentPowerBonus(triggerKey);
  if (adjacentBonus > 0) relicBonus += adjacentBonus;
  const cornerBonus = getCornerPowerBonus(triggerKey);
  if (cornerBonus > 0) relicBonus += cornerBonus;
  // Story 36.7: 短词冲刺加算
  const shortSprintBonus = getShortSprintBonus(state.player.word.length);
  if (shortSprintBonus > 0) relicBonus += shortSprintBonus;
  // Story 36.10: 暖身操加算（前 10 秒 +40%）
  const warmUpBonus = getWarmUpBonus();
  if (warmUpBonus > 0) relicBonus += warmUpBonus;
  // 太鼓节拍命中加算（+30%）
  const taikoBonus = getTaikoBonus();
  if (taikoBonus > 0) relicBonus += taikoBonus;
  // 取消连锁加算（取消状态下 +10%×层数）
  const cancelBonus = getCancelChainBonus();
  if (cancelBonus > 0) relicBonus += cancelBonus;
  // 附魔增幅：已附魔技能产出+15%
  const hasEnchantment = skill.enchantmentIds.length > 0;
  const enchantBoost = getEnchantBoostBonus(hasEnchantment);
  if (enchantBoost > 0) relicBonus += enchantBoost;
  // 附魔红利：已附魔技能触发时+2金币
  const enchantGold = getEnchantDividendGold(hasEnchantment);
  if (enchantGold > 0) {
    state.player.gold += enchantGold;
    state.resources.gold += enchantGold;
    showFeedback(`💰 +${enchantGold}`, RESOURCE_COLORS.gold, undefined, undefined, { relicId: 'enchant_dividend', resource: 'gold', amount: enchantGold });
  }

  // 注：积少成多 / 浪涌等已 V2 重做为极速系遗物（产出加成走 emitV2SkillBaseOutput）

  // 蓄力质变：自动补全期间所有技能获得等量产出倍率
  const chargeMultBonus = getChargeAutoMultBonus();
  if (chargeMultBonus > 0) relicBonus += chargeMultBonus;

  // 升华缩放：Lv4+ 按 1.6^(level-3) 缩放基础值
  const ascendScale = getAscendBaseScale(skill.level);

  // 无冕之王���无词缀技能产出 +30%
  if (skill.rarity === 0) {
    const ukBonus = getUncrownedKingAffixlessBonus();
    if (ukBonus > 0) relicBonus += ukBonus;
  }

  // 记录触发前的学徒成长值，用于计算 growthDelta
  const runtimeState = state.affixSkillStates.get(skillId);
  const growthBefore = runtimeState?.apprenticeAccumulated ?? 0;

  const result = orchestrateAffixTrigger(skillId, triggerKey, ctx, {
    applyResource: (resource_: ResourceType, amount: number, isMultiplyOp?: boolean) => {
      // 资源熔炉：源资源转化为目标资源
      const resource = applyFurnaceConversion(resource_);
      // 消行满贯等额外触发的产出缩放
      if (outputScale !== undefined && outputScale !== 1) amount = amount * outputScale;
      // 升华缩放：Lv4+ 基础值缩放
      if (ascendScale > 1) amount = amount * ascendScale;
      // 遗物加算：正产出 + relicBonus%（不放大 taboo 惩罚）
      let totalBonus = relicBonus;
      // Story 36.8: 资源潮汐 — 按资源类型条件加算（4相位+80%）
      const tideBonus = getResourceTideBonus(resource);
      if (tideBonus > 0) totalBonus += tideBonus;
      // 资源专精：产出最多的资源类型+25%
      const focusBonus = getResourceFocusBonus(resource);
      if (focusBonus > 0) totalBonus += focusBonus;
      // 多元投资：≥3种资源类型时+20%
      const diversityBonus = getResourceDiversityBonus();
      if (diversityBonus > 0) totalBonus += diversityBonus;
      if (totalBonus > 0 && amount > 0) amount = amount * (1 + totalBonus);
      // 追踪本词资源产出（击键代价修饰器用）
      if (amount > 0) recordWordResourceOutput(resource, amount);
      // 追踪本关累积产出（正值累积，负值扣减——消耗会降低温度）
      recordStageProduced(resource, amount);

      // Res* 学徒附魔：全场资源产出监听（任何技能/遗物产出时，所有匹配 Res* 附魔的技能积累 EXP）
      const resEnch = RES_ENCHANTMENT_BY_RESOURCE[resource];
      if (resEnch && amount > 0) {
        const resGrowth = (amount / BASE_VALUES[resource][0]) * APPRENTICE_RES_EXP_RATE * (ctx.apprenticeGrowthMultiplier ?? 1);
        for (const [sid, sk] of state.affixSkills) {
          if (!sk.enchantmentIds.includes(resEnch)) continue;
          const rt = state.affixSkillStates.get(sid);
          if (rt) rt.apprenticeAccumulated += resGrowth;
        }
      }

      if (isMultiplyOp) {
        // 乘算化：resource *= amount（amount 即乘数）
        if (resource === 'base') {
          synergy.skillBaseScore *= amount;
        } else if (resource === 'multiplier') {
          // skillMultBonus 是加算到 mult 的增量，初始 0；
          // 乘算化需要把当前累积的倍率加成乘以 amount：
          // (1 + bonus) * amount - 1 → 使 mult += bonus 等效于 mult *= amount
          synergy.skillMultBonus = (1 + synergy.skillMultBonus) * amount - 1;
        } else if (resource === 'score') {
          // 乘算化：直接放大已获得的总分
          state.score *= amount;
        } else {
          state.resources[resource] *= amount;
        }
      } else {
        // 普通加算
        if (resource === 'base') {
          synergy.skillBaseScore += amount;
        } else if (resource === 'multiplier') {
          synergy.skillMultBonus += amount;
        } else if (resource === 'score') {
          state.resources.score += amount;
          state.score += amount;
        } else {
          state.resources[resource] += amount;
          // 金币同步：消耗时也扣 state.gold（雇佣词条等）
          if (resource === 'gold' && amount < 0) {
            state.gold = Math.max(0, (state.gold ?? 0) + amount);
          }
        }
      }
      // 产出分红 + 续命涓流：正产出后触发（非乘算）
      if (amount > 0 && !isMultiplyOp) {
        const dividendGold = rollProductionDividend();
        if (dividendGold > 0) {
          state.player.gold += dividendGold;
          state.resources.gold += dividendGold;
        }
        const trickleTime = getTimeTrickle();
        if (trickleTime > 0) {
          state.time = Math.min(state.time + trickleTime, state.timeMax);
        }
      }
      if (resource === 'energy') {
        state.classResourceProduced.energy = (state.classResourceProduced.energy ?? 0) + Math.abs(amount);
        routeEnergyToPipeline(Math.abs(amount));
        // 组装完成反馈（AssemblyPipeline 纯数据层不含 UI 依赖）
        let completedWord: string | null
        while ((completedWord = consumeCompletedWord()) !== null) {
          showFeedback(t('craft.completed', { word: completedWord }), '#4ecdc4');
          playSound('buy');
        }
        updatePipelineHUD();
      } else if (resource === 'mutagen') {
        state.classResourceProduced.mutagen = (state.classResourceProduced.mutagen ?? 0) + Math.abs(amount);
        state.mutagenInventory += Math.abs(amount);
      }
    },
    showFeedback: (text: string, color: string) => showFeedback(text, color),
    playSound: (type: string) => playSound(type),
    enterPseudoInfinite: (_keys: string[]) => setPseudoInfiniteVisual(true),
    // 质变·吞噬：移除最弱邻居 + 经验累积 → bonusPerSlot 升级
    devourTarget: (targetKey: string, neighborLevel: number) => {
      const targetSkillId = state.player.bindings.get(targetKey);
      if (!targetSkillId) return;
      // 移除被吞噬的技能
      unbindSkill(getBindingState(state), targetSkillId);
      state.affixSkills.delete(targetSkillId);
      state.affixSkillStates.delete(targetSkillId);
      // 经验累积：XP += 邻居等级，升级时走 AFFIX_LEVEL_SCALING
      const voidAffix = skill.affixes.find(a => a.type === AffixType.Void);
      if (voidAffix) {
        const xp = (voidAffix.devourXp ?? 0) + neighborLevel;
        const lvl = voidAffix.devourLevel ?? 0;
        const threshold = 3 * (lvl + 1);
        if (xp >= threshold) {
          voidAffix.devourLevel = lvl + 1;
          voidAffix.devourXp = xp - threshold;
          applyAffixLevelScaling([voidAffix], 1);
          showFeedback(`🦷 Lv${lvl + 1}!`, '#a855f7');
        } else {
          voidAffix.devourXp = xp;
        }
        showFeedback(`🦷 吞噬!`, '#ff4444');
      }
    },
    // 质变·繁殖：向邻居传播虫群词条
    swarmPropagate: (targetSkillId: string, posRel: number) => {
      const targetSkill = state.affixSkills.get(targetSkillId);
      if (!targetSkill) return;
      if (targetSkill.affixes.some(a => a.type === AffixType.Swarm)) return;
      const newAffix = rollAffixParams(AffixType.Swarm, targetSkill.resource, undefined, undefined, posRel as PositionRelation);
      targetSkill.affixes.push(newAffix);
      showFeedback(`🐛 繁殖!`, '#8B8000');
    },
    // Story 41-5: Charge 质变 — 满蓄力自动完成当前单词
    chargeAutoComplete: () => performAutocomplete('charge'),
  });

  // Story 36.4: 爵士乐 — 追踪本词触发的词条类型
  trackWordAffixTypes(skill.affixes);
  // 消行满贯 — 追踪本词技能命中行
  recordLineClearHit(triggerKey);

  // Story 37.6: 缓存链式锚点（同一 triggerKey 只调一次 resolveChainAnchor，避免 random() 不一致）
  const chainAnchorCache = new Map<string, { letterIndex?: number; fromElementId?: string }>();
  function buildAnchor(trKey: string, resource: string, amount: number): { letterIndex?: number; fromElementId?: string; resource: string; amount: number } {
    if (trKey !== triggerKey) {
      let pos = chainAnchorCache.get(trKey);
      if (!pos) { pos = resolveChainAnchor(trKey); chainAnchorCache.set(trKey, pos); }
      return pos.fromElementId
        ? { fromElementId: pos.fromElementId, resource, amount }
        : { letterIndex: pos.letterIndex, resource, amount };
    }
    if (overrideAnchor?.fromElementId) {
      return { fromElementId: overrideAnchor.fromElementId, resource, amount };
    }
    // 检查 triggerKey 是否在当前单词中；不在时从词库UI出发
    const word = state.player.word.toLowerCase();
    const key = trKey.toLowerCase();
    if (overrideAnchor?.letterIndex != null) {
      return { letterIndex: overrideAnchor.letterIndex, resource, amount };
    }
    if (word.includes(key)) {
      return { letterIndex: state.player.index, resource, amount };
    }
    return { fromElementId: 'active-library', resource, amount };
  }

  // 浮字反馈：基于每次触发的结果
  for (const tr of result.triggerResults) {
    // 叠层类技能：显示叠层数（自身不产出的技能不走下方产出浮字）
    if (tr.currentStacks != null) {
      const stackAnchor = buildAnchor(tr.triggerKey, skill.resource, 0);
      showFeedback(`×${Math.floor(tr.currentStacks)}`, '#aaaaaa', 1.0, stackAnchor);
    }
    if (!tr.phase4) continue;

    // 质变Rainbow·光谱：多资源浮字
    if (tr.phase4.allResources && tr.phase4.rainbowSkillBase && tr.phase4.rainbowSkillLevel) {
      const pool = GENERIC_RESOURCES;
      const skillBase = tr.phase4.rainbowSkillBase;
      const lvIdx = tr.phase4.rainbowSkillLevel - 1;
      for (const r of pool) {
        const targetBase = BASE_VALUES[r]?.[lvIdx] ?? 1;
        let share = skillBase > 0 ? tr.output * (targetBase / skillBase) : tr.output / pool.length;
        if (ascendScale > 1) share *= ascendScale;
        const tide = getResourceTideBonus(r);
        if (relicBonus + tide > 0 && share > 0) share *= (1 + relicBonus + tide);
        if (share === 0) continue;
        const c = RESOURCE_COLORS[r] || '#ffffff';
        const dv = parseFloat(Math.abs(share).toPrecision(4));
        const sc = getFloatScale(r, share);
        const pfx = tr.isCrit ? '💥' : '';
        const anc = buildAnchor(tr.triggerKey, r, share);
        showFeedback(`${pfx}+${dv}`, c, Math.max(sc, tr.isCrit ? 2.0 : 1), anc);
        emitResourceSound(r, sc, 0);
        recordSkillTrigger(skillId, triggerKey, r, share, false);
      }
      continue;
    }

    const resource = tr.phase4.targetResource;
    // 遗物缩放：同步缩放反馈值（升华缩放 + 加算遗物 + 资源潮汐，仅正产出）
    let amount = tr.phase4.output;
    if (ascendScale > 1) amount = amount * ascendScale;
    let feedbackBonus = relicBonus;
    const feedbackTide = getResourceTideBonus(resource);
    if (feedbackTide > 0) feedbackBonus += feedbackTide;
    if (feedbackBonus > 0 && amount > 0) amount = amount * (1 + feedbackBonus);
    if (amount === 0) continue;

    const color = RESOURCE_COLORS[resource] || '#ffffff';
    const displayValue = parseFloat(Math.abs(amount).toPrecision(4));
    const scale = getFloatScale(resource, amount);

    let prefix = '';
    if (tr.isCrit) prefix = '💥';
    const anchor = buildAnchor(tr.triggerKey, resource, amount);
    if (tr.isMultiplyOp) {
      showFeedback(`${prefix}×${displayValue}`, color, Math.max(scale, tr.isCrit ? 2.0 : 1), anchor);
    } else if (tr.isTabooPenalty) {
      showFeedback(`-${displayValue}`, '#ff4444', scale, anchor);
    } else {
      showFeedback(`${prefix}+${displayValue}`, color, Math.max(scale, tr.isCrit ? 2.0 : 1), anchor);
    }
    emitResourceSound(resource, scale, 0);

    // 战后统计
    recordSkillTrigger(skillId, triggerKey, resource, amount, false);

    // §12 暴击遗物：暴击奖金 + 风暴计数 + 蓄力推进
    if (tr.isCrit) {
      const critGold = getCritBonusGold();
      if (critGold > 0) {
        state.player.gold += critGold;
        state.resources.gold += critGold;
        showFeedback(t('battle.crit_bonus', { value: critGold }), RESOURCE_COLORS.gold, undefined, undefined, { relicId: 'crit_bonus', resource: 'gold', amount: critGold });
      }
      recordWordCrit();
      // 学徒·暴击：暴击时全场拥有该附魔的技能永久成长
      for (const [sid, sk] of state.affixSkills) {
        if (!sk.enchantmentIds.includes(EnchantmentTypeEnum.ApprenticeCrit as string)) continue;
        const srt = state.affixSkillStates.get(sid);
        if (srt) srt.apprenticeAccumulated += APPRENTICE_CRIT_GROWTH * (ctx.apprenticeGrowthMultiplier ?? 1);
      }
    }
    advanceCritCharge(tr.isCrit);
  }

  // 短视：增加目标分数
  for (const tr of result.triggerResults) {
    if (tr.targetScoreIncrease && tr.targetScoreIncrease > 0) {
      state.targetScore += tr.targetScoreIncrease
    }
  }

  // 消耗反馈（PhaseShift 气态 / EndoExo 放热 / Fusion 双消耗）
  for (const tr of result.triggerResults) {
    if (!tr.consumeRequests) continue
    for (const req of tr.consumeRequests) {
      if (req.amount <= 0) continue
      const cColor = RESOURCE_COLORS[req.resource] || '#ff4444'
      const cLabel = getResourceLabel(req.resource)
      const cDisplay = parseFloat(req.amount.toPrecision(3))
      const cAnchor = buildAnchor(tr.triggerKey, req.resource, -req.amount)
      showFeedback(`-${cDisplay}${cLabel}`, cColor, 0.6, cAnchor)
    }
  }

  // 衍生附魔额外资源反馈
  for (const tr of result.triggerResults) {
    if (!tr.phase5?.transmuteOutput) continue;
    const { resource: tmRes, amount: tmAmt } = tr.phase5.transmuteOutput;
    if (tmAmt === 0) continue;
    const tmColor = RESOURCE_COLORS[tmRes] || '#e67e22';
    const tmLabel = getResourceLabel(tmRes);
    const tmDisplay = parseFloat(Math.abs(tmAmt).toPrecision(3));
    const tmAnchor = buildAnchor(tr.triggerKey, tmRes, tmAmt);
    showFeedback(`🔀+${tmDisplay}${tmLabel}`, tmColor, undefined, tmAnchor);
  }

  // 自动升华：EXP 满即升级
  if (runtimeState) {
    while (canAscend(skill, runtimeState)) {
      executeAscend(skill, runtimeState);
      const data = state.player.skills.get(skillId);
      if (data) data.level = skill.level;
      showFeedback(`✨ ${skill.name} → Lv.${skill.level}!`, '#ffd700', 2.0);
      playSound('buy');
      eventBus.emit('skill:upgraded', { skillId, newLevel: skill.level });
    }
  }

  // 事件总线通知（含附魔成长数据）
  const growthAfter = runtimeState?.apprenticeAccumulated ?? 0;
  const growthDelta = growthAfter - growthBefore;
  const questCompleted = result.triggerResults.some(tr => tr.phase5?.questCompleted);
  eventBus.emit('skill:triggered', {
    key: triggerKey,
    skillId,
    type: 'active',
    ...(growthDelta > 0 ? { growthValue: growthDelta } : {}),
    ...(questCompleted ? { questCompleted: true } : {}),
  });

  // V2 affix 触发钩子（装配登记表为空时 no-op）
  const isCritFire = result.triggerResults.some(tr => tr.isCrit);
  onSkillFireV2(skillId, skillId, triggerKey, skill.resource, isCritFire, 0);
}
