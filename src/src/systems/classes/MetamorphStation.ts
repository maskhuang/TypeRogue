// ============================================
// 打字肉鸽 - 蜕变台 UI + 蜕变逻辑
// ============================================
// Story 32.9: 蜕变师专属商店 tab，消费变异素从隐藏池盲盒替换技能

import { state } from '../../core/state';
import { playSound } from '../../effects/sound';
import { showFeedback } from '../battle';
import { renderBuildManager } from '../shop';
import { AFFIX_NAMES, RARITY_COLORS, RARITY_NAMES } from '../../data/affixes';
import {
  mutateA, mutateUpgrade, mutateDowngrade,
  getMutateACost, getUpgradeCost,
  canMutateA, canUpgrade, canDowngrade,
} from '../../data/affixMutation';
import { queryRelicFlag, getMonoAffixCategory } from '../relics/RelicPipeline';
import type { AffixCategory } from '../../data/affixes';

// Old skill type system removed — only affix skills remain

// === 词条制技能蜕变操作面板 (35.10) ===

function renderAffixMutationPanel(skillId: string, boundKey: string, container: HTMLElement): void {
  const skill = state.affixSkills.get(skillId);
  if (!skill) return;

  // 清空容器，渲染操作面板
  container.innerHTML = '';

  // 标题
  const title = document.createElement('div');
  title.className = 'morph-title';
  title.textContent = `🧬 词条蜕变 — ${skill.name}`;
  container.appendChild(title);

  // 技能信息
  const info = document.createElement('div');
  info.style.cssText = 'color:#ccc;font-size:12px;margin:8px 0;padding:8px;background:rgba(255,255,255,0.05);border-radius:4px;';
  const rarityColor = RARITY_COLORS[skill.rarity] || '#fff';
  const rarityName = RARITY_NAMES[skill.rarity] || '?';

  const nameRow = document.createElement('div');
  nameRow.style.cssText = `color:${rarityColor};font-weight:bold;`;
  nameRow.textContent = `${skill.icon} ${skill.name} (${rarityName})`;
  info.appendChild(nameRow);

  const affixRow = document.createElement('div');
  affixRow.style.cssText = 'margin-top:4px;font-size:11px;';
  if (skill.affixes.length > 0) {
    skill.affixes.forEach((a, i) => {
      if (i > 0) affixRow.appendChild(document.createTextNode('  '));
      const span = document.createElement('span');
      span.style.color = '#aaa';
      span.textContent = `[${i}] ${AFFIX_NAMES[a.type]}`;
      affixRow.appendChild(span);
    });
  } else {
    const span = document.createElement('span');
    span.style.color = '#666';
    span.textContent = '无词条';
    affixRow.appendChild(span);
  }
  info.appendChild(affixRow);

  const mutagenRow = document.createElement('div');
  mutagenRow.style.cssText = 'margin-top:4px;font-size:11px;color:#888;';
  mutagenRow.textContent = `🧬 变异素: ${Math.floor(state.mutagenInventory)}`;
  info.appendChild(mutagenRow);

  container.appendChild(info);

  // 操作按钮区
  const btnArea = document.createElement('div');
  btnArea.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin:8px 0;';

  // === 蜕变A：词条重铸 ===
  if (skill.affixes.length > 0) {
    const aCost = getMutateACost(skillId);
    const aEnabled = canMutateA(skillId);
    for (let i = 0; i < skill.affixes.length; i++) {
      const affix = skill.affixes[i];
      const btn = document.createElement('button');
      btn.className = 'morph-action-btn';
      btn.style.cssText = `padding:8px 12px;border:1px solid ${aEnabled ? '#e67e22' : '#555'};background:${aEnabled ? 'rgba(230,126,34,0.15)' : 'rgba(50,50,50,0.3)'};color:${aEnabled ? '#e67e22' : '#666'};border-radius:4px;cursor:${aEnabled ? 'pointer' : 'not-allowed'};font-size:12px;text-align:left;`;
      btn.textContent = `🔄 重铸 [${i}] ${AFFIX_NAMES[affix.type]} — 消耗 ${aCost} 变异素`;
      if (aEnabled) {
        const idx = i;
        btn.onclick = () => {
          const monoCategory = getMonoAffixCategory() as AffixCategory | null;
          const result = mutateA(skillId, idx, monoCategory ?? undefined);
          if (result.success) {
            playSound('skill');
            showFeedback(`🔄 重铸: ${AFFIX_NAMES[result.oldAffix!.type]} → ${AFFIX_NAMES[result.newAffix!.type]}`, '#e67e22', 1.2);
            renderAffixMutationPanel(skillId, boundKey, container);
            renderBuildManager();
          } else {
            showFeedback(result.error || '操作失败', '#ff6b6b');
          }
        };
      }
      btnArea.appendChild(btn);
    }
  }

  // === 蜕变C↑：稀有度升级 ===
  {
    const whiteOnly = queryRelicFlag('white_only') as boolean;
    const upEnabled = !whiteOnly && canUpgrade(skillId);
    const upCost = skill.rarity < 3 ? getUpgradeCost(skill.rarity) : 0;
    const btn = document.createElement('button');
    btn.className = 'morph-action-btn';
    btn.style.cssText = `padding:8px 12px;border:1px solid ${upEnabled ? '#2ecc71' : '#555'};background:${upEnabled ? 'rgba(46,204,113,0.15)' : 'rgba(50,50,50,0.3)'};color:${upEnabled ? '#2ecc71' : '#666'};border-radius:4px;cursor:${upEnabled ? 'pointer' : 'not-allowed'};font-size:12px;text-align:left;`;
    btn.textContent = whiteOnly
      ? '⬆️ 稀有度升级 — 纯粹之心禁止'
      : skill.rarity >= 3
        ? '⬆️ 稀有度升级 — 已传说'
        : `⬆️ 稀有度升级 (${RARITY_NAMES[skill.rarity]}→${RARITY_NAMES[(skill.rarity + 1) as 0|1|2|3]}) — 消耗 ${upCost} 变异素`;
    if (upEnabled) {
      btn.onclick = () => {
        const monoUpCat = getMonoAffixCategory() as AffixCategory | null;
        const result = mutateUpgrade(skillId, monoUpCat ?? undefined);
        if (result.success) {
          playSound('skill');
          showFeedback(`⬆️ 升级: +${AFFIX_NAMES[result.newAffix!.type]}`, '#2ecc71', 1.2);
          renderAffixMutationPanel(skillId, boundKey, container);
          renderBuildManager();
        } else {
          showFeedback(result.error || '操作失败', '#ff6b6b');
        }
      };
    }
    btnArea.appendChild(btn);
  }

  // === 蜕变C↓：稀有度降级 ===
  {
    const downEnabled = canDowngrade(skillId);
    const btn = document.createElement('button');
    btn.className = 'morph-action-btn';
    btn.style.cssText = `padding:8px 12px;border:1px solid ${downEnabled ? '#e74c3c' : '#555'};background:${downEnabled ? 'rgba(231,76,60,0.15)' : 'rgba(50,50,50,0.3)'};color:${downEnabled ? '#e74c3c' : '#666'};border-radius:4px;cursor:${downEnabled ? 'pointer' : 'not-allowed'};font-size:12px;text-align:left;`;
    btn.textContent = skill.rarity <= 0
      ? '⬇️ 稀有度降级 — 已白装'
      : `⬇️ 稀有度降级 (${RARITY_NAMES[skill.rarity]}→${RARITY_NAMES[(skill.rarity - 1) as 0|1|2|3]}) — 返还 1 变异素`;
    if (downEnabled) {
      btn.onclick = () => {
        const result = mutateDowngrade(skillId);
        if (result.success) {
          playSound('skill');
          showFeedback(`⬇️ 降级: -${AFFIX_NAMES[result.removedAffix!.type]} +1🧬`, '#e74c3c', 1.2);
          renderAffixMutationPanel(skillId, boundKey, container);
          renderBuildManager();
        } else {
          showFeedback(result.error || '操作失败', '#ff6b6b');
        }
      };
    }
    btnArea.appendChild(btn);
  }

  container.appendChild(btnArea);

  // 返回按钮
  const backBtn = document.createElement('button');
  backBtn.style.cssText = 'padding:6px 12px;border:1px solid #555;background:rgba(255,255,255,0.05);color:#aaa;border-radius:4px;cursor:pointer;font-size:11px;margin-top:8px;';
  backBtn.textContent = '← 返回技能列表';
  backBtn.onclick = () => renderMetamorphPanel(container);
  container.appendChild(backBtn);
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

  // 技能网格
  const grid = document.createElement('div');
  grid.className = 'morph-skill-grid';

  for (const [key, skillId] of state.player.bindings) {
    const skillData = state.player.skills.get(skillId);
    if (!skillData) continue;

    const affixSkill = state.affixSkills.get(skillId);
    if (!affixSkill) continue;

    const card = document.createElement('div');
    card.className = 'morph-skill-card';
    card.style.borderColor = RARITY_COLORS[affixSkill.rarity] || '#fff';

    // 图标
    const icon = document.createElement('div');
    icon.className = 'morph-skill-icon';
    icon.textContent = affixSkill.icon;

    // 名称
    const name = document.createElement('div');
    name.className = 'morph-skill-name';
    name.textContent = affixSkill.name;

    // 键位
    const keyLabel = document.createElement('div');
    keyLabel.className = 'morph-skill-key';
    keyLabel.textContent = key.toUpperCase();

    // 类型标签
    const typeLabel = document.createElement('div');
    typeLabel.className = 'morph-skill-type';
    typeLabel.textContent = `${RARITY_NAMES[affixSkill.rarity]} (${affixSkill.affixes.length}词条)`;
    typeLabel.style.color = RARITY_COLORS[affixSkill.rarity] || '#fff';

    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(keyLabel);
    card.appendChild(typeLabel);

    card.onclick = () => {
      renderAffixMutationPanel(skillId, key, container);
    };

    grid.appendChild(card);
  }

  container.appendChild(grid);

  // 提示文字
  const hint = document.createElement('div');
  hint.className = 'morph-hint';
  hint.textContent = '点击技能，消耗变异素进行词条蜕变';
  container.appendChild(hint);
}
