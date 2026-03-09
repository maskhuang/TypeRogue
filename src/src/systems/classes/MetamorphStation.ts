// ============================================
// 打字肉鸽 - 蜕变台 UI + 蜕变逻辑
// ============================================
// Story 32.9: 蜕变师专属商店 tab，消费变异素从隐藏池盲盒替换技能

import { state } from '../../core/state';
import { playSound } from '../../effects/sound';
import { showFeedback } from '../battle';
import { renderBuildManager } from '../shop';
import { getSkillDisplayInfo, getSkillSchool } from '../../data/skills';
import { isProducer } from '../../data/producers';
import { CONVERTERS, isConverter } from '../../data/converters';
import { CONNECTORS, REPLICATORS, isConnector, isReplicator } from '../../data/connectors';
import { AMPLIFIERS, isAmplifier } from '../../data/amplifiers';
import { filterSkillIdsByClass } from './ClassResourceFilter';
import { random } from '../../core/seededRandom';

// === 技能类型判定 ===
type SkillType = 'producer' | 'converter' | 'connector' | 'replicator' | 'amplifier';

export function getSkillType(id: string): SkillType | null {
  if (isProducer(id)) return 'producer';
  if (isConverter(id)) return 'converter';
  if (isConnector(id)) return 'connector';
  if (isReplicator(id)) return 'replicator';
  if (isAmplifier(id)) return 'amplifier';
  return null;
}

// === 隐藏池计算 ===
export function computeHiddenPool(type: 'converter' | 'connector' | 'replicator' | 'amplifier'): string[] {
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
    case 'replicator':
      allIds = Object.keys(REPLICATORS);
      visiblePool = state.replicatorPool;
      getDefinition = id => REPLICATORS[id] as any;
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
export function performMetamorph(oldSkillId: string, boundKey: string, container: HTMLElement): void {
  const type = getSkillType(oldSkillId);
  if (!type || type === 'producer') return;

  // 费用计算
  let cost = 1;
  const hasUltimateMutant = state.player.relics.has('ultimate_mutant_strain');
  const hasPrimalMutant = state.player.relics.has('primal_mutant');

  // 终极突变株：每关前2次蜕变免费（覆盖 primal_mutant）
  if (hasUltimateMutant) {
    const usedCount = state.player.relicStates['ultimate_mutant_strain'] ?? 0;
    if (usedCount < 2) cost = 0;
  } else if (hasPrimalMutant && state.player.relicStates['primal_mutant'] === 0) {
    cost = 0;
  }

  // 基因稳定器：同一键位再次蜕变免费
  if (cost > 0 && state.player.relics.has('gene_stabilizer')) {
    if (state.player.relicStates['gene_stab_' + boundKey] === 1) {
      cost = 0;
    }
  }

  if (cost > 0 && state.mutagenInventory < cost) {
    showFeedback('变异素不足!', '#ff6b6b');
    return;
  }

  // 隐藏池
  const pool = computeHiddenPool(type);
  if (pool.length === 0) {
    showFeedback('隐藏池已空!', '#ff6b6b');
    return;
  }

  // 验证技能数据（必须在扣费前检查，防止数据缺失时白扣资源）
  const oldData = state.player.skills.get(oldSkillId);
  if (!oldData) return;

  // 扣费
  if (cost > 0) {
    state.mutagenInventory -= cost;
  }

  // 更新遗物状态
  if (hasUltimateMutant) {
    state.player.relicStates['ultimate_mutant_strain'] = (state.player.relicStates['ultimate_mutant_strain'] ?? 0) + 1;
  } else if (hasPrimalMutant && cost === 0) {
    state.player.relicStates['primal_mutant'] = 1;
  }

  // 基因稳定器：记录已蜕变键位
  if (state.player.relics.has('gene_stabilizer')) {
    state.player.relicStates['gene_stab_' + boundKey] = 1;
  }

  // 随机抽取
  const idx = Math.floor(random() * pool.length);
  const newSkillId = pool[idx];

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

  // 适应附魔：每被蜕变一次 +15%（迁移后在新技能上累加）
  if (enchId === 'ench_adapt') {
    const current = state.growthValues.get(newSkillId) ?? 0;
    state.growthValues.set(newSkillId, current + 0.15);
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

  // 终极突变株：蜕变结果来自隐藏池 → 高稀有度返 1 变异素
  if (hasUltimateMutant) {
    state.mutagenInventory += 1;
    showFeedback('⚛️ +1变异素（高稀有度）', '#2ecc71');
  }

  // 适者生存：蜕变后技能本关产出 +20%
  if (state.player.relics.has('fittest_survivors')) {
    state.player.relicStates['fittest_' + newSkillId] = 1;
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

// === 技能悬停提示 ===
const TYPE_NAMES: Record<string, string> = {
  producer: '产出者', converter: '转化者', connector: '连接者', replicator: '复制者', amplifier: '增幅者',
};

function showMorphTooltip(e: MouseEvent, skillId: string, level: number, type: SkillType | null, boundKey: string, hiddenPoolSize?: number): void {
  hideMorphTooltip();
  const info = getSkillDisplayInfo(skillId, level, state.player.enchantedSkills);
  const school = getSkillSchool(skillId);
  const tip = document.createElement('div');
  tip.id = 'morph-tooltip';
  tip.className = 'key-tooltip';

  let html = `<div style="font-size:14px;font-weight:bold;color:#fff;margin-bottom:2px;">${info.icon} ${info.name} Lv.${level}</div>`;
  html += `<div style="color:#888;font-size:10px;margin-bottom:4px;">键位: ${boundKey.toUpperCase()}</div>`;
  html += `<div style="color:#aaa;font-size:10px;white-space:normal;margin-bottom:4px;">${info.desc}</div>`;
  html += `<span style="font-size:9px;padding:1px 4px;border-radius:3px;display:inline-block;background:rgba(255,255,255,0.08);" class="${school.cssClass}">${school.label}</span>`;

  if (type && type !== 'producer') {
    html += `<div style="color:#2ecc71;font-size:10px;margin-top:4px;">隐藏池剩余: ${hiddenPoolSize ?? 0} 个${TYPE_NAMES[type]}</div>`;
  } else if (type === 'producer') {
    html += `<div style="color:#666;font-size:10px;margin-top:4px;">产出者不可蜕变</div>`;
  }

  tip.innerHTML = html;
  tip.style.left = e.clientX + 12 + 'px';
  tip.style.top = e.clientY + 12 + 'px';
  document.body.appendChild(tip);
  requestAnimationFrame(() => {
    const rect = tip.getBoundingClientRect();
    if (rect.right > window.innerWidth) tip.style.left = (e.clientX - rect.width - 12) + 'px';
    if (rect.bottom > window.innerHeight) tip.style.top = (e.clientY - rect.height - 12) + 'px';
  });
}

function moveMorphTooltip(e: MouseEvent): void {
  const tip = document.getElementById('morph-tooltip');
  if (!tip) return;
  tip.style.left = e.clientX + 12 + 'px';
  tip.style.top = e.clientY + 12 + 'px';
  requestAnimationFrame(() => {
    const rect = tip.getBoundingClientRect();
    if (rect.right > window.innerWidth) tip.style.left = (e.clientX - rect.width - 12) + 'px';
    if (rect.bottom > window.innerHeight) tip.style.top = (e.clientY - rect.height - 12) + 'px';
  });
}

function hideMorphTooltip(): void {
  document.getElementById('morph-tooltip')?.remove();
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
  const hasUltimateMutant = state.player.relics.has('ultimate_mutant_strain');
  const hasPrimalMutant = state.player.relics.has('primal_mutant');
  let freeRemaining = 0;
  if (hasUltimateMutant) {
    freeRemaining = Math.max(0, 2 - (state.player.relicStates['ultimate_mutant_strain'] ?? 0));
  } else if (hasPrimalMutant && state.player.relicStates['primal_mutant'] === 0) {
    freeRemaining = 1;
  }
  let infoText = `🧬 变异素: ${Math.floor(state.mutagenInventory)}`;
  if (freeRemaining > 0) {
    infoText += `  |  🎁 本关免费剩余: ${freeRemaining}次`;
  }
  info.textContent = infoText;
  container.appendChild(info);

  // 预计算各类型隐藏池大小（避免逐次悬停重复计算）
  const poolSizes = new Map<string, number>();

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
    typeLabel.textContent = type ? TYPE_NAMES[type] : '未知';

    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(keyLabel);
    card.appendChild(typeLabel);

    // 缓存该类型隐藏池大小
    if (type && type !== 'producer' && !poolSizes.has(type)) {
      poolSizes.set(type, computeHiddenPool(type).length);
    }

    // 悬停提示
    card.addEventListener('mouseenter', (e: MouseEvent) => {
      showMorphTooltip(e, skillId, skillData.level, type, key, poolSizes.get(type ?? ''));
    });
    card.addEventListener('mousemove', (e: MouseEvent) => {
      moveMorphTooltip(e);
    });
    card.addEventListener('mouseleave', hideMorphTooltip);

    if (!isDisabled) {
      card.onclick = () => {
        hideMorphTooltip();
        card.classList.add('morph-transforming');
        setTimeout(() => {
          performMetamorph(skillId, key, container);
        }, 200);
      };
    }

    grid.appendChild(card);
  }

  container.appendChild(grid);

  // 深渊之眼：预览 2 个隐藏池技能
  if (state.player.relics.has('abyss_eye')) {
    const allHidden: string[] = [];
    for (const t of ['converter', 'connector', 'replicator', 'amplifier'] as const) {
      allHidden.push(...computeHiddenPool(t));
    }
    if (allHidden.length > 0) {
      const preview = document.createElement('div');
      preview.className = 'morph-abyss-preview';
      preview.innerHTML = '<div style="color:#a29bfe;font-size:11px;margin-bottom:4px;">👁️ 深渊之眼 — 隐藏池预览</div>';
      const count = Math.min(2, allHidden.length);
      // 随机选 2 个不重复
      const picked = new Set<number>();
      while (picked.size < count) {
        picked.add(Math.floor(random() * allHidden.length));
      }
      for (const i of picked) {
        const sid = allHidden[i];
        const sInfo = getSkillDisplayInfo(sid);
        const sType = getSkillType(sid);
        const label = document.createElement('div');
        label.style.cssText = 'color:#ccc;font-size:11px;padding:2px 0;';
        label.textContent = `${sInfo.icon} ${sInfo.name} (${sType ? TYPE_NAMES[sType] : '?'})`;
        preview.appendChild(label);
      }
      container.appendChild(preview);
    }
  }

  // 提示文字
  const hint = document.createElement('div');
  hint.className = 'morph-hint';
  hint.textContent = '点击非产出者技能，消耗1🧬变异素从隐藏池随机替换为同类型技能';
  container.appendChild(hint);
}
