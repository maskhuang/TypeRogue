// ============================================
// 打字肉鸽 - Boss 修饰器三选一
// ============================================
// Story 25.3: 每周目 Boss 胜利后选 1 个修饰器叠加

import { state } from '../core/state'
import { generateBossModifierCandidates, getBossModifierMeta } from '../data/bossModifiers'
import type { BossModifierId } from '../data/bossModifiers'
import { playSound } from '../effects/sound'

/** 显示 Boss 修饰器选择模态框 */
export function showBossModifierPicker(onComplete: () => void): void {
  const candidates = generateBossModifierCandidates(state.activeModifiers)
  if (candidates.length === 0) {
    onComplete()
    return
  }

  const modal = document.getElementById('modifier-picker-modal')
  if (!modal) {
    onComplete()
    return
  }

  const cardsEl = document.getElementById('modifier-picker-cards')
  const activeEl = document.getElementById('modifier-picker-active')
  if (!cardsEl || !activeEl) {
    onComplete()
    return
  }

  // Guard flag 防止快速点击多次触发
  let completed = false
  const finish = () => {
    if (completed) return
    completed = true
    closeModifierPicker()
    onComplete()
  }

  // 渲染已激活修饰器列表
  activeEl.innerHTML = ''
  if (state.activeModifiers.length > 0) {
    const label = document.createElement('div')
    label.className = 'modifier-picker-active-label'
    label.textContent = '已激活修饰器：'
    activeEl.appendChild(label)

    const list = document.createElement('div')
    list.className = 'modifier-picker-active-list'
    for (const modId of state.activeModifiers) {
      const meta = getBossModifierMeta(modId)
      if (meta) {
        const tag = document.createElement('span')
        tag.className = 'modifier-picker-active-tag'
        tag.textContent = `${meta.icon} ${meta.name}`
        tag.title = meta.description
        list.appendChild(tag)
      }
    }
    activeEl.appendChild(list)
  }

  // 渲染候选卡片
  cardsEl.innerHTML = ''
  candidates.forEach(modId => {
    const meta = getBossModifierMeta(modId)
    if (!meta) return

    const card = document.createElement('div')
    card.className = 'modifier-picker-card'
    card.innerHTML = `
      <div class="modifier-picker-icon">${meta.icon}</div>
      <div class="modifier-picker-name">${meta.name}</div>
      <div class="modifier-picker-desc">${meta.description}</div>
    `

    card.onclick = () => {
      state.activeModifiers.push(modId)
      playSound('skill')
      finish()
    }

    cardsEl.appendChild(card)
  })

  modal.classList.remove('modifier-picker-hidden')
}

function closeModifierPicker(): void {
  const modal = document.getElementById('modifier-picker-modal')
  if (modal) modal.classList.add('modifier-picker-hidden')
}
