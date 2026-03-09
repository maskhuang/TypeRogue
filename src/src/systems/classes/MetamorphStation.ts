// ============================================
// 打字肉鸽 - 蜕变台 UI + 蜕变逻辑
// ============================================
// Story 32.9: 蜕变师专属商店 tab，消费变异素从隐藏池盲盒替换技能

import { state } from '../../core/state';
import { playSound } from '../../effects/sound';
import { showFeedback } from '../battle';
import { renderBuildManager } from '../shop';
import { getSkillDisplayInfo } from '../../data/skills';
import { PRODUCERS, isProducer } from '../../data/producers';
import { CONVERTERS, isConverter } from '../../data/converters';
import { CONNECTORS, isConnector } from '../../data/connectors';
import { AMPLIFIERS, isAmplifier } from '../../data/amplifiers';
import { filterSkillIdsByClass } from './ClassResourceFilter';
import { random } from '../../core/seededRandom';

// === 技能类型判定 ===
type SkillType = 'producer' | 'converter' | 'connector' | 'amplifier';

function getSkillType(id: string): SkillType | null {
  if (isProducer(id)) return 'producer';
  if (isConverter(id)) return 'converter';
  if (isConnector(id)) return 'connector';
  if (isAmplifier(id)) return 'amplifier';
  return null;
}

// === 隐藏池计算 ===
function computeHiddenPool(type: 'converter' | 'connector' | 'amplifier'): string[] {
  // 全集 ID
  let allIds: string[];
  let visiblePool: string[];
  let getDefinition: (id: string) => { resource?: any; source?: any; target?: any } | undefined;

  switch (type) {
    case 'converter':
      allIds = Object.keys(CONVERTERS);
      visiblePool = state.converterPool;
      getDefinition = id => CONVERTERS[id];
      break;
    case 'connector':
      allIds = Object.keys(CONNECTORS);
      visiblePool = state.connectorPool;
      getDefinition = id => CONNECTORS[id];
      break;
    case 'amplifier':
      allIds = Object.keys(AMPLIFIERS);
      visiblePool = state.amplifierPool;
      getDefinition = id => AMPLIFIERS[id];
      break;
  }

  // 隐藏池 = 全集 - 可见池
  const visibleSet = new Set(visiblePool);
  let hidden = allIds.filter(id => !visibleSet.has(id));

  // 职业资源过滤
  hidden = filterSkillIdsByClass(hidden, state.classId, getDefinition);

  // 排除玩家已拥有技能
  const ownedIds = new Set(state.player.skills.keys());
  hidden = hidden.filter(id => !ownedIds.has(id));

  return hidden;
}

// === 蜕变核心逻辑 ===
function performMetamorph(oldSkillId: string, boundKey: string, container: HTMLElement): void {
  const type = getSkillType(oldSkillId);
  if (!type || type === 'producer') return;

  // 费用计算
  const hasPrimalMutant = state.player.relics.has('primal_mutant');
  const isFree = hasPrimalMutant && state.player.relicStates['primal_mutant'] === 0;

  if (!isFree) {
    if (state.mutagenInventory < 1) {
      showFeedback('变异素不足!', '#ff6b6b');
      return;
    }
  }

  // 隐藏池
  const pool = computeHiddenPool(type);
  if (pool.length === 0) {
    showFeedback('隐藏池已空!', '#ff6b6b');
    return;
  }

  // 扣费
  if (!isFree) {
    state.mutagenInventory -= 1;
  } else {
    // 标记本关已使用免费次数
    state.player.relicStates['primal_mutant'] = 1;
  }

  // 随机抽取
  const idx = Math.floor(random() * pool.length);
  const newSkillId = pool[idx];

  // 全继承交换
  const oldData = state.player.skills.get(oldSkillId);
  if (!oldData) return;

  const { level, purchasePrice } = oldData;

  // skills: 删旧 → 加新（继承 level, purchasePrice）
  state.player.skills.delete(oldSkillId);
  state.player.skills.set(newSkillId, { level, purchasePrice });

  // bindings: 同 key 指向新 ID
  state.player.bindings.set(boundKey, newSkillId);

  // enchantedSkills: 迁移附魔
  const enchId = state.player.enchantedSkills.get(oldSkillId);
  if (enchId) {
    state.player.enchantedSkills.delete(oldSkillId);
    state.player.enchantedSkills.set(newSkillId, enchId);
  }

  // growthValues: 迁移成长值
  const growth = state.growthValues.get(oldSkillId);
  if (growth !== undefined) {
    state.growthValues.delete(oldSkillId);
    state.growthValues.set(newSkillId, growth);
  }

  // masteryCounters: 迁移精通计数
  const mastery = state.masteryCounters.get(oldSkillId);
  if (mastery !== undefined) {
    state.masteryCounters.delete(oldSkillId);
    state.masteryCounters.set(newSkillId, mastery);
  }

  // devourIcons: 迁移吞噬图标
  const devour = state.devourIcons.get(oldSkillId);
  if (devour !== undefined) {
    state.devourIcons.delete(oldSkillId);
    state.devourIcons.set(newSkillId, devour);
  }

  // 反馈
  const oldInfo = getSkillDisplayInfo(oldSkillId);
  const newInfo = getSkillDisplayInfo(newSkillId, level, state.player.enchantedSkills);
  playSound('skill');
  showFeedback(`${oldInfo.icon}→${newInfo.icon} ${newInfo.name}`, '#2ecc71', 1.2);

  // 刷新面板
  renderMetamorphPanel(container);
  renderBuildManager();
}

// === 面板渲染 ===
export function renderMetamorphPanel(container: HTMLElement): void {
  container.innerHTML = '';

  // 标题
  const title = document.createElement('div');
  title.className = 'morph-title';
  title.textContent = '🧬 蜕变台';
  container.appendChild(title);

  // 变异素库存 + 免费次数提示
  const info = document.createElement('div');
  info.className = 'morph-info';
  const hasPrimalMutant = state.player.relics.has('primal_mutant');
  const isFree = hasPrimalMutant && state.player.relicStates['primal_mutant'] === 0;
  let infoText = `🧬 变异素: ${Math.floor(state.mutagenInventory)}`;
  if (isFree) {
    infoText += '  |  🎁 本关首次免费';
  }
  info.textContent = infoText;
  container.appendChild(info);

  // 技能网格
  const grid = document.createElement('div');
  grid.className = 'morph-skill-grid';

  for (const [key, skillId] of state.player.bindings) {
    const skillData = state.player.skills.get(skillId);
    if (!skillData) continue;

    const type = getSkillType(skillId);
    const displayInfo = getSkillDisplayInfo(skillId, skillData.level, state.player.enchantedSkills);

    const card = document.createElement('div');
    card.className = 'morph-skill-card';

    const isDisabled = !type || type === 'producer';
    if (isDisabled) {
      card.classList.add('morph-disabled');
    }

    // 图标
    const icon = document.createElement('div');
    icon.className = 'morph-skill-icon';
    icon.textContent = displayInfo.icon;

    // 名称
    const name = document.createElement('div');
    name.className = 'morph-skill-name';
    name.textContent = displayInfo.name;

    // 键位
    const keyLabel = document.createElement('div');
    keyLabel.className = 'morph-skill-key';
    keyLabel.textContent = key.toUpperCase();

    // 类型标签
    const typeLabel = document.createElement('div');
    typeLabel.className = 'morph-skill-type';
    const typeNames: Record<string, string> = {
      producer: '产出者',
      converter: '转化者',
      connector: '连接者',
      amplifier: '增幅者',
    };
    typeLabel.textContent = type ? typeNames[type] : '未知';

    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(keyLabel);
    card.appendChild(typeLabel);

    if (!isDisabled) {
      card.onclick = () => {
        card.classList.add('morph-transforming');
        setTimeout(() => {
          performMetamorph(skillId, key, container);
        }, 200);
      };
    }

    grid.appendChild(card);
  }

  container.appendChild(grid);

  // 提示文字
  const hint = document.createElement('div');
  hint.className = 'morph-hint';
  hint.textContent = '点击非产出者技能，消耗1🧬变异素从隐藏池随机替换为同类型技能';
  container.appendChild(hint);
}
