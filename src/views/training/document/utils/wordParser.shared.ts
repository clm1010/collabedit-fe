import type { WordFileFormat } from './wordParser/types'

/**
 * 中文字体回退映射表
 * 将 Word 中的字体名称映射到包含回退链的 CSS font-family 值
 * 确保在用户系统没有对应字体时能优雅降级
 */
export const chineseFontFallbackMap: Record<string, string> = {
  // 宋体系列
  宋体: '"宋体", "SimSun", "STSong", "NSimSun", serif',
  SimSun: '"SimSun", "宋体", "STSong", "NSimSun", serif',
  新宋体: '"NSimSun", "新宋体", "SimSun", "宋体", serif',
  NSimSun: '"NSimSun", "新宋体", "SimSun", "宋体", serif',
  华文宋体: '"STSong", "华文宋体", "SimSun", "宋体", serif',
  STSong: '"STSong", "华文宋体", "SimSun", "宋体", serif',

  // 黑体系列
  黑体: '"黑体", "SimHei", "Microsoft YaHei", "微软雅黑", sans-serif',
  SimHei: '"SimHei", "黑体", "Microsoft YaHei", "微软雅黑", sans-serif',
  微软雅黑: '"Microsoft YaHei", "微软雅黑", "SimHei", "黑体", sans-serif',
  'Microsoft YaHei': '"Microsoft YaHei", "微软雅黑", "SimHei", "黑体", sans-serif',
  华文黑体: '"STHeiti", "华文黑体", "SimHei", "黑体", sans-serif',
  STHeiti: '"STHeiti", "华文黑体", "SimHei", "黑体", sans-serif',

  // 楷体系列
  楷体: '"楷体", "KaiTi", "STKaiti", "华文楷体", serif',
  KaiTi: '"KaiTi", "楷体", "STKaiti", "华文楷体", serif',
  华文楷体: '"STKaiti", "华文楷体", "KaiTi", "楷体", serif',
  STKaiti: '"STKaiti", "华文楷体", "KaiTi", "楷体", serif',
  华文彩云: '"STCaiyun", "华文彩云", cursive',
  STCaiyun: '"STCaiyun", "华文彩云", cursive',
  华文琥珀: '"STHupo", "华文琥珀", cursive',
  STHupo: '"STHupo", "华文琥珀", cursive',
  华文新魏: '"STXinwei", "华文新魏", serif',
  STXinwei: '"STXinwei", "华文新魏", serif',
  华文行楷: '"STXingkai", "华文行楷", "KaiTi", "楷体", serif',
  STXingkai: '"STXingkai", "华文行楷", "KaiTi", "楷体", serif',
  楷体_GB2312: '"楷体_GB2312", "KaiTi_GB2312", "KaiTi", "楷体", serif',
  KaiTi_GB2312: '"KaiTi_GB2312", "楷体_GB2312", "KaiTi", "楷体", serif',

  // 仿宋系列
  仿宋: '"仿宋", "FangSong", "STFangsong", "华文仿宋", serif',
  FangSong: '"FangSong", "仿宋", "STFangsong", "华文仿宋", serif',
  华文仿宋: '"STFangsong", "华文仿宋", "FangSong", "仿宋", serif',
  STFangsong: '"STFangsong", "华文仿宋", "FangSong", "仿宋", serif',
  仿宋_GB2312: '"仿宋_GB2312", "FangSong_GB2312", "FangSong", "仿宋", serif',
  FangSong_GB2312: '"FangSong_GB2312", "仿宋_GB2312", "FangSong", "仿宋", serif',

  // 方正系列（常用于公文）
  方正小标宋:
    '"方正小标宋简体", "FZXiaoBiaoSong-B05S", "FangSong", "仿宋", "SimSun", "宋体", serif',
  方正小标宋简体:
    '"方正小标宋简体", "FZXiaoBiaoSong-B05S", "FangSong", "仿宋", "SimSun", "宋体", serif',
  'FZXiaoBiaoSong-B05S':
    '"FZXiaoBiaoSong-B05S", "方正小标宋简体", "FangSong", "仿宋", "SimSun", "宋体", serif',
  方正仿宋: '"方正仿宋简体", "FZFangSong-Z02S", "FangSong", "仿宋", serif',
  方正仿宋简体: '"方正仿宋简体", "FZFangSong-Z02S", "FangSong", "仿宋", serif',
  'FZFangSong-Z02S': '"FZFangSong-Z02S", "方正仿宋简体", "FangSong", "仿宋", serif',
  方正黑体: '"方正黑体简体", "FZHei-B01S", "SimHei", "黑体", sans-serif',
  方正黑体简体: '"方正黑体简体", "FZHei-B01S", "SimHei", "黑体", sans-serif',
  'FZHei-B01S': '"FZHei-B01S", "方正黑体简体", "SimHei", "黑体", sans-serif',
  方正大标宋简体:
    '"方正大标宋简体", "FZDaBiaoSong-B06S", "FZXiaoBiaoSong-B05S", "SimSun", "宋体", serif',
  'FZDaBiaoSong-B06S':
    '"FZDaBiaoSong-B06S", "方正大标宋简体", "FZXiaoBiaoSong-B05S", "SimSun", "宋体", serif',
  方正舒体: '"方正舒体", "FZShuTi-S05S", "KaiTi", "楷体", serif',
  'FZShuTi-S05S': '"FZShuTi-S05S", "方正舒体", "KaiTi", "楷体", serif',
  方正姚体: '"方正姚体", "FZYaoTi", "KaiTi", "楷体", serif',
  FZYaoTi: '"FZYaoTi", "方正姚体", "KaiTi", "楷体", serif',
  方正楷体: '"方正楷体简体", "FZKai-Z03S", "KaiTi", "楷体", serif',
  方正楷体简体: '"方正楷体简体", "FZKai-Z03S", "KaiTi", "楷体", serif',
  'FZKai-Z03S': '"FZKai-Z03S", "方正楷体简体", "KaiTi", "楷体", serif',

  // 其他常用字体
  隶书: '"隶书", "LiSu", "STLiti", serif',
  LiSu: '"LiSu", "隶书", "STLiti", serif',
  华文隶书: '"STLiti", "华文隶书", "LiSu", "隶书", serif',
  STLiti: '"STLiti", "华文隶书", "LiSu", "隶书", serif',
  幼圆: '"幼圆", "YouYuan", sans-serif',
  YouYuan: '"YouYuan", "幼圆", sans-serif',
  华文细黑: '"STXihei", "华文细黑", "Microsoft YaHei", sans-serif',
  STXihei: '"STXihei", "华文细黑", "Microsoft YaHei", sans-serif',
  华文中宋: '"STZhongsong", "华文中宋", "SimSun", "宋体", serif',
  STZhongsong: '"STZhongsong", "华文中宋", "SimSun", "宋体", serif',
  微软雅黑Light: '"Microsoft YaHei Light", "Microsoft YaHei", "微软雅黑", sans-serif',
  'Microsoft YaHei Light': '"Microsoft YaHei Light", "Microsoft YaHei", "微软雅黑", sans-serif',
  文泉驿微米黑: '"WenQuanYi Micro Hei", "文泉驿微米黑", "Microsoft YaHei", "微软雅黑", sans-serif',
  'WenQuanYi Micro Hei':
    '"WenQuanYi Micro Hei", "文泉驿微米黑", "Microsoft YaHei", "微软雅黑", sans-serif',
  文泉驿等宽微米黑:
    '"WenQuanYi Zen Hei Mono", "文泉驿等宽微米黑", "Microsoft YaHei", "微软雅黑", sans-serif',
  'WenQuanYi Zen Hei Mono':
    '"WenQuanYi Zen Hei Mono", "文泉驿等宽微米黑", "Microsoft YaHei", "微软雅黑", sans-serif',

  // 苹果系统字体
  'PingFang SC': '"PingFang SC", "苹方-简", "Microsoft YaHei", sans-serif',
  苹方: '"PingFang SC", "苹方-简", "Microsoft YaHei", sans-serif',
  'Hiragino Sans GB': '"Hiragino Sans GB", "冬青黑体简体中文", "Microsoft YaHei", sans-serif',

  // 英文字体（保留原样但添加回退）
  Arial: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
  'Times New Roman': '"Times New Roman", Times, serif',
  Calibri: 'Calibri, "Segoe UI", Arial, sans-serif',
  'Segoe UI': '"Segoe UI", Arial, sans-serif'
}

/**
 * 获取字体的回退链
 * @param fontName 原始字体名称
 * @returns 包含回退链的 CSS font-family 值
 */
export const getFontWithFallback = (fontName: string): string => {
  const normalizeStack = (stack: string): string => stack.replace(/"/g, "'")

  // 先尝试精确匹配
  if (chineseFontFallbackMap[fontName]) {
    return normalizeStack(chineseFontFallbackMap[fontName])
  }

  // 尝试去除空格后匹配
  const normalizedName = fontName.replace(/\s+/g, '')
  if (chineseFontFallbackMap[normalizedName]) {
    return normalizeStack(chineseFontFallbackMap[normalizedName])
  }

  // 尝试部分匹配（处理带后缀的字体名）
  for (const [key, value] of Object.entries(chineseFontFallbackMap)) {
    if (fontName.includes(key) || key.includes(fontName)) {
      return normalizeStack(value)
    }
  }

  // 无法匹配时，返回原字体名加上通用回退
  // 根据字体名判断是衬线还是无衬线字体
  const isSansSerif = /黑|雅|苹方|Arial|Calibri|Segoe|sans/i.test(fontName)
  const fallbackStack = isSansSerif
    ? '"Microsoft YaHei", "微软雅黑", sans-serif'
    : '"SimSun", "宋体", serif'
  const safeFontName = fontName.replace(/["']/g, '')

  return normalizeStack(`"${safeFontName}", ${fallbackStack}`)
}

/**
 * 单位转换：pt -> px（1pt ≈ 1.33px）
 */
export const ptToPx = (pt: number): number => Math.round(pt * 1.33 * 100) / 100

/**
 * 单位转换：twips(1/20pt) -> px
 */
export const twipsToPx = (twips: number): number => ptToPx(twips / 20)

/**
 * 根据文本类型选择字号（半点单位）优先级
 * 中文文本优先使用 w:szCs，其次 w:sz；英文反之
 */
export const pickFontSizeHalfPoints = (
  preferCs: boolean,
  sources: Array<{ sz?: string; szCs?: string }>
): number | undefined => {
  for (const src of sources) {
    if (!src) continue
    const szVal = preferCs ? (src.szCs ?? src.sz) : (src.sz ?? src.szCs)
    if (szVal) {
      const parsed = parseInt(szVal, 10)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  return undefined
}

/**
 * 合并 run 级别样式（保持 rFonts 子字段）
 */
export const mergeRPr = (base: any, override: any): any => {
  if (!base && !override) return {}
  const merged = { ...(base || {}), ...(override || {}) }
  if (base?.['w:rFonts'] || override?.['w:rFonts']) {
    merged['w:rFonts'] = { ...(base?.['w:rFonts'] || {}), ...(override?.['w:rFonts'] || {}) }
  }
  return merged
}

/**
 * 格式化 px 数值（保留两位小数，去除多余 0）
 */
export const formatPx = (value: number): string => {
  const rounded = Math.round(value * 100) / 100
  return String(rounded)
    .replace(/\.0+$/, '')
    .replace(/(\.\d)0$/, '$1')
}

/**
 * 从 rFonts 中解析实际字体名（支持 theme）
 */
export const resolveFontFromRFonts = (
  rFonts: any,
  fontMap: Map<string, string>,
  themeFonts?: Record<string, string>
): string | undefined => {
  if (!rFonts) return undefined
  const direct =
    rFonts['@_w:eastAsia'] || rFonts['@_w:ascii'] || rFonts['@_w:hAnsi'] || rFonts['@_w:cs']
  if (direct) return fontMap.get(direct) || direct

  const themeKey =
    rFonts['@_w:eastAsiaTheme'] ||
    rFonts['@_w:asciiTheme'] ||
    rFonts['@_w:hAnsiTheme'] ||
    rFonts['@_w:csTheme']
  if (themeKey && themeFonts?.[themeKey]) {
    const themed = themeFonts[themeKey]
    return fontMap.get(themed) || themed
  }

  return undefined
}

/**
 * Base64 字符串转 Uint8Array
 * @param base64 Base64 字符串
 * @returns Uint8Array
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/**
 * 检测文件是否为 ZIP 格式（.docx 文件）
 * @param bytes 文件字节数组
 * @returns 是否为 ZIP 格式
 */
export const isZipFormat = (bytes: Uint8Array): boolean => {
  // ZIP 文件头：PK (0x50 0x4B)
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b
}

/**
 * 检测文件是否为旧版 .doc 格式（OLE/CFB 复合文档）
 * OLE 文件头: D0 CF 11 E0 A1 B1 1A E1
 * @param bytes 文件字节数组
 * @returns 是否为 .doc 格式
 */
export const isDocFormat = (bytes: Uint8Array): boolean => {
  if (bytes.length < 8) return false
  return (
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  )
}

/**
 * 检测 Word 文件格式
 * @param bytes 文件字节数组
 * @param filename 文件名（可选，用于辅助判断）
 * @returns 文件格式
 */
export const detectWordFormat = (bytes: Uint8Array, filename?: string): WordFileFormat => {
  if (isZipFormat(bytes)) return 'docx'
  if (isDocFormat(bytes)) return 'doc'
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop()
    if (ext === 'docx') return 'docx'
    if (ext === 'doc') return 'doc'
  }
  return 'unknown'
}

export const hasStyleHintsInHtml = (html: string): boolean => {
  if (!html) return false
  return /font-family:|font-size:|color:|background-color:|text-align:|data-text-align|<h[1-6]\\b|<mark\\b/i.test(
    html
  )
}

export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
