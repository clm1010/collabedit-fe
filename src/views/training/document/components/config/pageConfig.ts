/**
 * 页面配置文件
 * 包含页面大小、页边距等配置
 */

// 页面大小类型
export type PageSizeType = 'A4' | 'A3' | 'A5' | 'B5' | '5号信封' | '6号信封'

// 页面大小配置 (单位: mm)
export interface PageSizeConfig {
  name: PageSizeType
  width: number // 宽度 mm
  height: number // 高度 mm
  widthPx: number // 宽度 px (96dpi)
  heightPx: number // 高度 px (96dpi)
}

// mm 转换为 px (假设 96 DPI)
const mmToPx = (mm: number): number => Math.round((mm * 96) / 25.4)

// 页面大小配置表
export const pageSizeConfig: Record<PageSizeType, PageSizeConfig> = {
  A4: {
    name: 'A4',
    width: 210,
    height: 297,
    widthPx: mmToPx(210), // 约 794px
    heightPx: mmToPx(297) // 约 1123px
  },
  A3: {
    name: 'A3',
    width: 297,
    height: 420,
    widthPx: mmToPx(297),
    heightPx: mmToPx(420)
  },
  A5: {
    name: 'A5',
    width: 148,
    height: 210,
    widthPx: mmToPx(148),
    heightPx: mmToPx(210)
  },
  B5: {
    name: 'B5',
    width: 176,
    height: 250,
    widthPx: mmToPx(176),
    heightPx: mmToPx(250)
  },
  '5号信封': {
    name: '5号信封',
    width: 109,
    height: 129,
    widthPx: mmToPx(109),
    heightPx: mmToPx(129)
  },
  '6号信封': {
    name: '6号信封',
    width: 119,
    height: 229,
    widthPx: mmToPx(119),
    heightPx: mmToPx(229)
  }
}

// 页边距配置 (单位: mm)
export interface PageMarginConfig {
  top: number
  bottom: number
  left: number
  right: number
}

// 默认页边距预设
export const marginPresets: Record<string, PageMarginConfig> = {
  普通: { top: 25.4, bottom: 25.4, left: 31.8, right: 31.8 },
  窄: { top: 12.7, bottom: 12.7, left: 12.7, right: 12.7 },
  适中: { top: 25.4, bottom: 25.4, left: 19.1, right: 19.1 },
  宽: { top: 25.4, bottom: 25.4, left: 50.8, right: 50.8 }
}

// 默认页面设置
export const defaultPageSettings = {
  size: 'A4' as PageSizeType,
  orientation: 'portrait' as 'portrait' | 'landscape',
  margin: { ...marginPresets['普通'] },
  background: '#ffffff',
  showOutline: false,
  showLineBreak: false,
  showLineNumber: false
}

// 获取页面尺寸 (考虑方向)
export const getPageDimensions = (
  size: PageSizeType,
  orientation: 'portrait' | 'landscape'
): { width: number; height: number } => {
  const config = pageSizeConfig[size]
  if (orientation === 'landscape') {
    return { width: config.heightPx, height: config.widthPx }
  }
  return { width: config.widthPx, height: config.heightPx }
}

// 将 mm 转换为 px
export const convertMmToPx = mmToPx

// 将 px 转换为 mm
export const convertPxToMm = (px: number): number => Math.round((px * 25.4) / 96)
