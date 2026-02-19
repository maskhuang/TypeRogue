// ============================================
// 打字肉鸽 - UI Effects 模块导出
// ============================================
// Story 7.3: 粒子效果系统
// Story 7.4: 技能触发反馈

// Story 7.3 - Particle System
export { ParticleManager } from './ParticleManager'
export { ParticleController } from './ParticleController'
export { ScorePopup } from './ScorePopup'
export type { ScorePopupOptions } from './ScorePopup'
export { PARTICLE_PRESETS, getMilestoneParticleCount, getFlameIntensity } from './ParticlePresets'
export type { ParticlePresetType, ParticlePresetConfig } from './ParticlePresets'

// Story 7.4 - Skill Feedback
export { SkillFeedbackManager } from './SkillFeedbackManager'
export { SkillIconPopup } from './SkillIconPopup'
export { EffectTextDisplay } from './EffectTextDisplay'
export type { EffectTextOptions } from './EffectTextDisplay'
export { AdjacencyVisualizer } from './AdjacencyVisualizer'
export { EffectQueueDisplay } from './EffectQueueDisplay'
export type { QueuedEffect } from './EffectQueueDisplay'
