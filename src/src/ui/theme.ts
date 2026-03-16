/**
 * Design Token — 统一的视觉样式常量
 * PixiJS 组件使用 JS 常量，DOM 组件使用 style.css 中对应的 CSS 变量
 */

export const TEXT_LEVEL = {
  title:    { size: 18, color: '#ffffff', weight: 'bold' },
  subtitle: { size: 14, color: '#e0e0e0', weight: 'bold' },
  body:     { size: 13, color: '#cccccc', weight: 'normal' },
  caption:  { size: 11, color: '#aaaaaa', weight: 'normal' },
  badge:    { size: 11, color: '#ffffff', weight: 'bold' },
} as const

export const MIN_FONT_SIZE = 11

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24
} as const

export const TOOLTIP = {
  maxWidth: 340,
  paddingY: 12,
  paddingX: 16,
  lineHeight: 1.5,
  borderRadius: 8,
} as const
