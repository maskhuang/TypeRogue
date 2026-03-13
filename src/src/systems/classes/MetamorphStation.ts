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
  mutate, mutateSingle, getMutateCost, canMutate,
} from '../../data/affixMutation';
import { getMonoAffixCategory } from '../relics/RelicPipeline';
import type { AffixCategory } from '../../data/affixes';

// Old skill type system removed — only affix skills remain

// === 词条制技能蜕变操作面板 (35.10) ===

function renderAffixMutationPanel(skillId: string, boundKey: string, container: HTMLElement): void {
  const skill = state.affixSkills.get(skillId);
  if (!skill) return;

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

  // 蜕变按钮
  const btnArea = document.createElement('div');
  btnArea.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin:8px 0;';

  const cost = getMutateCost(skillId);
  const enabled = canMutate(skillId);
  const hasGeneStabilizer = state.player.relics.has('gene_stabilizer');

  // 全部蜕变按钮
  {
    const btn = document.createElement('button');
    btn.className = 'morph-action-btn';
    btn.style.cssText = `padding:8px 12px;border:1px solid ${enabled ? '#e67e22' : '#555'};background:${enabled ? 'rgba(230,126,34,0.15)' : 'rgba(50,50,50,0.3)'};color:${enabled ? '#e67e22' : '#666'};border-radius:4px;cursor:${enabled ? 'pointer' : 'not-allowed'};font-size:12px;text-align:left;`;
    btn.textContent = skill.affixes.length === 0
      ? '🔄 蜕变 — 无词条'
      : `🔄 蜕变全部词条 — 消耗 ${cost} 变异素`;
    if (enabled) {
      btn.onclick = () => {
        const monoCategory = getMonoAffixCategory() as AffixCategory | null;
        const result = mutate(skillId, monoCategory ?? undefined);
        if (result.success) {
          playSound('skill');
          showFeedback(`🔄 蜕变完成`, '#e67e22', 1.2);
          renderAffixMutationPanel(skillId, boundKey, container);
          renderBuildManager();
        } else {
          showFeedback(result.error || '操作失败', '#ff6b6b');
        }
      };
    }
    btnArea.appendChild(btn);
  }

  // 基因稳定器：单词条蜕变按钮
  if (hasGeneStabilizer && skill.affixes.length > 0) {
    for (let i = 0; i < skill.affixes.length; i++) {
      const affix = skill.affixes[i];
      const btn = document.createElement('button');
      btn.className = 'morph-action-btn';
      btn.style.cssText = `padding:8px 12px;border:1px solid ${enabled ? '#9b59b6' : '#555'};background:${enabled ? 'rgba(155,89,182,0.15)' : 'rgba(50,50,50,0.3)'};color:${enabled ? '#9b59b6' : '#666'};border-radius:4px;cursor:${enabled ? 'pointer' : 'not-allowed'};font-size:12px;text-align:left;`;
      btn.textContent = `🔒 蜕变 [${i}] ${AFFIX_NAMES[affix.type]} — 消耗 ${cost} 变异素`;
      if (enabled) {
        const idx = i;
        btn.onclick = () => {
          const monoCategory = getMonoAffixCategory() as AffixCategory | null;
          const result = mutateSingle(skillId, idx, monoCategory ?? undefined);
          if (result.success) {
            playSound('skill');
            showFeedback(`🔒 ${AFFIX_NAMES[result.oldAffix!.type]} → ${AFFIX_NAMES[result.newAffix!.type]}`, '#9b59b6', 1.2);
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
