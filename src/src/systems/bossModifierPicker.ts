// ============================================
// 打字肉鸽 - Boss 修饰器选择（每类各选一）
// ============================================
// Story 25.3: 每周目 Boss 胜利后从 offense/defense/disruption 各选 1 个

import { state } from '../core/state'
import { generateBossModifierCandidatesByCategory, getBossModifierMeta } from '../data/bossModifiers'
import type { BossModifierId, ModifierCategory } from '../data/bossModifiers'
import { playSound } from '../effects/sound'
import { t } from '../demo/demo-i18n'
import { hasModifierPardon, consumeModifierPardon } from './relics/BossModifierRelicBehaviors'

const CATEGORY_LABELS: Record<ModifierCategory, string> = {
  offense: 'modifier_picker.cat_offense',
  defense: 'modifier_picker.cat_defense',
  disruption: 'modifier_picker.cat_disruption',
}

/** 显示 Boss 修饰器选择模态框（每类各选一，共 3 轮）
 *  选中的修饰器不再自动加入 activeModifiers，而是收集后通过回调返回 */
export function showBossModifierPicker(onComplete: (selectedMods: BossModifierId[]) => void): void {
  // 传入精英修饰器保证出现在对应类别
  const categoryGroups = generateBossModifierCandidatesByCategory(state.activeModifiers, state.eliteModifier)
  const categories: ModifierCategory[] = ['offense', 'defense', 'disruption']

  // 过滤掉空类别
  const rounds: Array<{ category: ModifierCategory; candidates: BossModifierId[] }> = []
  for (let i = 0; i < categories.length; i++) {
    if (categoryGroups[i].length > 0) {
      rounds.push({ category: categories[i], candidates: categoryGroups[i] })
    }
  }

  if (rounds.length === 0) {
    state.eliteModifier = null
    onComplete([])
    return
  }

  let roundIdx = 0
  const sessionPicks: BossModifierId[] = []

  const showRound = () => {
    if (roundIdx >= rounds.length) {
      closeModifierPicker()
      state.eliteModifier = null
      onComplete(sessionPicks)
      return
    }
    const { category, candidates } = rounds[roundIdx]
    const onSkip = hasModifierPardon() ? () => {
      consumeModifierPardon()
      playSound('skill')
      roundIdx++
      showRound()
    } : undefined
    renderPickerRound(category, candidates, sessionPicks, (modId) => {
      sessionPicks.push(modId)
      playSound('skill')
      roundIdx++
      showRound()
    }, onSkip)
  }

  showRound()
}

/** 显示精英修饰器选择（全部候选平铺，选 1 个） */
export function showEliteModifierPicker(onComplete: (modId: BossModifierId) => void): void {
  const categoryGroups = generateBossModifierCandidatesByCategory(state.activeModifiers)
  // 每类取 1 个（共 3 选 1）
  const allCandidates: BossModifierId[] = categoryGroups
    .map(group => group[0])
    .filter((id): id is BossModifierId => !!id)

  if (allCandidates.length === 0) {
    onComplete(null as any)
    return
  }

  const modal = document.getElementById('modifier-picker-modal')
  const cardsEl = document.getElementById('modifier-picker-cards')
  const activeEl = document.getElementById('modifier-picker-active')
  const titleEl = modal?.querySelector('.modifier-picker-title') as HTMLElement | null
  if (!modal || !cardsEl || !activeEl) return

  // 标题
  if (titleEl) {
    titleEl.textContent = `⚔️ ${t('battle.elite_pick')} ⚔️`
  }

  // 已激活修饰器列表
  activeEl.innerHTML = ''
  if (state.activeModifiers.length > 0) {
    const label = document.createElement('div')
    label.className = 'modifier-picker-active-label'
    label.textContent = t('modifier_picker.active_label')
    activeEl.appendChild(label)

    const list = document.createElement('div')
    list.className = 'modifier-picker-active-list'
    for (const modId of state.activeModifiers) {
      const meta = getBossModifierMeta(modId)
      if (meta) {
        const tag = document.createElement('span')
        tag.className = 'modifier-picker-active-tag'
        const modName = t(`modifier.${meta.id}`) !== `modifier.${meta.id}` ? t(`modifier.${meta.id}`) : meta.name
        const modDesc = t(`modifier.${meta.id}.desc`) !== `modifier.${meta.id}.desc` ? t(`modifier.${meta.id}.desc`) : meta.description
        tag.textContent = `${meta.icon} ${modName}`
        tag.title = modDesc
        list.appendChild(tag)
      }
    }
    activeEl.appendChild(list)
  }

  // 渲染候选卡片
  cardsEl.innerHTML = ''
  let picked = false
  allCandidates.forEach(modId => {
    const meta = getBossModifierMeta(modId)
    if (!meta) return

    const card = document.createElement('div')
    card.className = 'modifier-picker-card'
    // 显示 eliteHint 而非完整描述
    const modName = t(`modifier.${meta.id}`) !== `modifier.${meta.id}` ? t(`modifier.${meta.id}`) : meta.name
    const eliteDesc = t(`modifier.${meta.id}.elite`) !== `modifier.${meta.id}.elite` ? t(`modifier.${meta.id}.elite`) : meta.eliteHint
    card.innerHTML = `
      <div class="modifier-picker-icon">${meta.icon}</div>
      <div class="modifier-picker-name">${modName}</div>
      <div class="modifier-picker-desc">${eliteDesc}</div>
    `

    card.onclick = () => {
      if (picked) return
      picked = true
      closeModifierPicker()
      onComplete(modId)
    }

    cardsEl.appendChild(card)
  })

  modal.classList.remove('modifier-picker-hidden')
}

function renderPickerRound(
  category: ModifierCategory,
  candidates: BossModifierId[],
  sessionPicks: BossModifierId[],
  onPick: (id: BossModifierId) => void,
  onSkip?: () => void,
): void {
  const modal = document.getElementById('modifier-picker-modal')
  const cardsEl = document.getElementById('modifier-picker-cards')
  const activeEl = document.getElementById('modifier-picker-active')
  const titleEl = modal?.querySelector('.modifier-picker-title') as HTMLElement | null
  if (!modal || !cardsEl || !activeEl) return

  // 更新标题（显示当前类别）
  const catLabel = t(CATEGORY_LABELS[category]) || category
  if (titleEl) {
    titleEl.textContent = `⚔️ ${catLabel} ⚔️`
  }

  // 渲染已激活修饰器列表（永久 + 本轮已选）
  activeEl.innerHTML = ''
  const allDisplay = [...state.activeModifiers, ...sessionPicks]
  if (allDisplay.length > 0) {
    const label = document.createElement('div')
    label.className = 'modifier-picker-active-label'
    label.textContent = t('modifier_picker.active_label')
    activeEl.appendChild(label)

    const list = document.createElement('div')
    list.className = 'modifier-picker-active-list'
    for (const modId of allDisplay) {
      const meta = getBossModifierMeta(modId)
      if (meta) {
        const tag = document.createElement('span')
        tag.className = 'modifier-picker-active-tag'
        const modName = t(`modifier.${meta.id}`) !== `modifier.${meta.id}` ? t(`modifier.${meta.id}`) : meta.name
        const modDesc = t(`modifier.${meta.id}.desc`) !== `modifier.${meta.id}.desc` ? t(`modifier.${meta.id}.desc`) : meta.description
        tag.textContent = `${meta.icon} ${modName}`
        tag.title = modDesc
        list.appendChild(tag)
      }
    }
    activeEl.appendChild(list)
  }

  // 渲染候选卡片
  cardsEl.innerHTML = ''
  let picked = false
  candidates.forEach(modId => {
    const meta = getBossModifierMeta(modId)
    if (!meta) return

    const card = document.createElement('div')
    card.className = 'modifier-picker-card'
    card.innerHTML = `
      <div class="modifier-picker-icon">${meta.icon}</div>
      <div class="modifier-picker-name">${t(`modifier.${meta.id}`) !== `modifier.${meta.id}` ? t(`modifier.${meta.id}`) : meta.name}</div>
      <div class="modifier-picker-desc">${t(`modifier.${meta.id}.desc`) !== `modifier.${meta.id}.desc` ? t(`modifier.${meta.id}.desc`) : meta.description}</div>
    `

    card.onclick = () => {
      if (picked) return
      picked = true
      onPick(modId)
    }

    cardsEl.appendChild(card)
  })

  if (onSkip) {
    const skipBtn = document.createElement('button')
    skipBtn.className = 'modifier-picker-skip-btn'
    skipBtn.textContent = t('modifier_picker.skip_round')
    skipBtn.onclick = () => { if (!picked) { picked = true; onSkip() } }
    cardsEl.after(skipBtn)
  }

  modal.classList.remove('modifier-picker-hidden')
}

function closeModifierPicker(): void {
  const modal = document.getElementById('modifier-picker-modal')
  if (modal) modal.classList.add('modifier-picker-hidden')
}
