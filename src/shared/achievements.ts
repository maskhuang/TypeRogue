// ============================================
// 打字肉鸽 - 成就定义
// ============================================
// Story 8.3: Steam 成就 (AC: #1)

/**
 * 游戏成就 ID 与 Steam 成就 API 名称映射
 * 键: 游戏内成就 ID
 * 值: Steam API 成就名称（需在 Steamworks 后台配置）
 */
export const ACHIEVEMENT_MAP = {
  // 基础成就
  first_win: 'ACH_FIRST_WIN', // 首次通关
  first_skill: 'ACH_FIRST_SKILL', // 首次绑定技能
  first_relic: 'ACH_FIRST_RELIC', // 首次获得遗物

  // 进度成就 - 完成局数
  runs_10: 'ACH_RUNS_10', // 完成10局
  runs_50: 'ACH_RUNS_50', // 完成50局
  runs_100: 'ACH_RUNS_100', // 完成100局

  // 技能成就
  all_skills: 'ACH_ALL_SKILLS', // 收集所有技能
  max_skill: 'ACH_MAX_SKILL', // 技能升到满级
  skills_10: 'ACH_SKILLS_10', // 解锁10个技能

  // 分数成就
  score_10k: 'ACH_SCORE_10K', // 单局10000分
  score_50k: 'ACH_SCORE_50K', // 单局50000分
  score_100k: 'ACH_SCORE_100K', // 单局100000分

  // 连击成就
  combo_20: 'ACH_COMBO_20', // 20连击
  combo_50: 'ACH_COMBO_50', // 50连击
  combo_100: 'ACH_COMBO_100', // 100连击

  // 遗物成就
  all_relics: 'ACH_ALL_RELICS', // 收集所有遗物
  relics_5: 'ACH_RELICS_5', // 收集5个遗物

  // 特殊成就
  perfect_stage: 'ACH_PERFECT_STAGE', // 无错误通过一关
  speedrun: 'ACH_SPEEDRUN', // 5分钟内通关
} as const

export type AchievementId = keyof typeof ACHIEVEMENT_MAP
export type SteamAchievementName = (typeof ACHIEVEMENT_MAP)[AchievementId]

/**
 * 带进度的成就接口
 */
export interface ProgressAchievement {
  id: AchievementId
  current: number
  target: number
}

/**
 * 进度成就的目标值定义
 * 只有需要累积进度的成就才需要在这里定义
 */
export const PROGRESS_ACHIEVEMENTS: Partial<Record<AchievementId, { target: number }>> = {
  runs_10: { target: 10 },
  runs_50: { target: 50 },
  runs_100: { target: 100 },
  skills_10: { target: 10 },
  relics_5: { target: 5 },
}

/**
 * 检查是否为进度成就
 */
export function isProgressAchievement(id: AchievementId): boolean {
  return id in PROGRESS_ACHIEVEMENTS
}

/**
 * 获取进度成就的目标值
 */
export function getProgressTarget(id: AchievementId): number | null {
  return PROGRESS_ACHIEVEMENTS[id]?.target ?? null
}

/**
 * 获取 Steam 成就名称
 */
export function getSteamAchievementName(id: AchievementId): SteamAchievementName {
  return ACHIEVEMENT_MAP[id]
}

/**
 * 所有成就 ID 列表
 */
export const ALL_ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENT_MAP) as AchievementId[]

/**
 * 成就总数
 */
export const ACHIEVEMENT_COUNT = ALL_ACHIEVEMENT_IDS.length
