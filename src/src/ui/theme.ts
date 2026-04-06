/**
 * Design Token — 统一的视觉样式常量
 * PixiJS 组件使用 JS 常量，DOM 组件使用 style.css 中对应的 CSS 变量
 */

export const FONT_PIXEL = "'Press Start 2P', 'Courier New', monospace"

export const TEXT_LEVEL = {
  title:    { size: 12, color: '#ffffff', weight: 'bold' },
  subtitle: { size: 10, color: '#e0e0e0', weight: 'bold' },
  body:     { size: 9,  color: '#cccccc', weight: 'normal' },
  caption:  { size: 8,  color: '#aaaaaa', weight: 'normal' },
  badge:    { size: 8,  color: '#ffffff', weight: 'bold' },
} as const

export const MIN_FONT_SIZE = 8

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24
} as const

export const TOOLTIP = {
  maxWidth: 340,
  paddingY: 10,
  paddingX: 14,
  lineHeight: 1.6,
  borderRadius: 0,
} as const
