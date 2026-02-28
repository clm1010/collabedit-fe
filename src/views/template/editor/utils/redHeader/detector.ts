import type { RedHeader, RedHeaderType } from './types'

/** 红头文件特征：包含红色文字（#ff0000）和红色横线（data-line-color 或 class="red-line"） */
export const extractRedHeader = (html: string): RedHeader | null => {
  // 查找红色横线的位置（红头文件的结束标志）
  const redLineMatch = html.match(
    /<hr[^>]*(?:data-line-color|class="[^"]*red)[^>]*\/?>/i
  )

  if (!redLineMatch || redLineMatch.index === undefined) {
    return null
  }

  // 提取从开头到红色横线的内容
  const headerEndIndex = redLineMatch.index + redLineMatch[0].length
  const potentialHeader = html.slice(0, headerEndIndex)

  // 验证是否包含红头文件的特征：红色文字
  // 支持多种颜色格式：#ff0000, #FF0000, rgb(255, 0, 0), red
  const hasRedColor =
    /color\s*:\s*#ff0000/i.test(potentialHeader) ||
    /color\s*:\s*rgb\s*\(\s*255\s*,\s*0\s*,\s*0\s*\)/i.test(potentialHeader) ||
    /color\s*:\s*red\b/i.test(potentialHeader)

  if (!hasRedColor) {
    return null
  }

  // 判断红头文件类型
  const type = detectRedHeaderType(potentialHeader)

  return {
    header: potentialHeader,
    rest: html.slice(headerEndIndex),
    type
  }
}

export const detectRedHeaderType = (header: string): RedHeaderType => {
  // 检测机关公文特征
  if (
    header.includes('机密') ||
    header.includes('秘密') ||
    header.includes('特急') ||
    header.includes('加急') ||
    header.includes('发文机关') ||
    /文号|发\s*文\s*字/i.test(header)
  ) {
    return 'government'
  }

  // 检测党组织公文特征
  if (
    header.includes('中共') ||
    header.includes('党委') ||
    header.includes('支部') ||
    header.includes('党组')
  ) {
    return 'party'
  }

  // 检测军用公文特征
  if (
    header.includes('军') ||
    header.includes('部队') ||
    header.includes('司令部')
  ) {
    return 'military'
  }

  // 包含表格的可能是标准公文格式
  if (/<table[^>]*style/i.test(header)) {
    return 'government'
  }

  // 默认为自定义类型
  return 'custom'
}

export const hasRedHeader = (html: string): boolean => {
  return extractRedHeader(html) !== null
}

/** 匹配红头文件标记块 <!-- REDHEADER:type -->...<!-- /REDHEADER --> */
export const extractRedHeaderFromMarkdown = (
  markdown: string
): { type: RedHeaderType; header: string; rest: string } | null => {
  // 匹配红头文件标记块 <!-- REDHEADER:type -->...<!-- /REDHEADER -->
  const pattern = /<!--\s*REDHEADER:(\w+)\s*-->\s*([\s\S]*?)\s*<!--\s*\/REDHEADER\s*-->/
  const match = markdown.match(pattern)

  if (!match) {
    return null
  }

  const type = (match[1] as RedHeaderType) || 'custom'
  const header = match[2].trim()
  const rest = markdown.replace(pattern, '').trim()

  return { type, header, rest }
}
