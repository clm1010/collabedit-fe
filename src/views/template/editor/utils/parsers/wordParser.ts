import mammoth from 'mammoth'

export const mammothStyleMap = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='标题 1'] => h1:fresh",
  "p[style-name='标题 2'] => h2:fresh",
  "p[style-name='标题 3'] => h3:fresh",
  "p[style-name='标题 4'] => h4:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Block Text'] => blockquote:fresh",
  "p[style-name='Code'] => pre:fresh",
  "r[style-name='Code Char'] => code",
  'b => strong',
  'i => em',
  'u => u',
  'strike => s'
]

export const cleanWordHtml = (html: string): string => {
  let result = html

  result = result.replace(/(<p>\s*<\/p>\s*){2,}/g, '<p></p>')
  result = result.replace(/&nbsp;&nbsp;+/g, ' ')
  result = result.replace(/mso-[^;:"]+:[^;:"]+;?/gi, '')
  result = result.replace(/style="\s*"/g, '')
  result = result.replace(/class="[^"]*Mso[^"]*"/gi, '')

  const MAX_IMAGE_WIDTH = 540

  result = result.replace(/<img([^>]*)style="([^"]*)"/gi, (_match, attrs, style) => {
    const widthMatch = style.match(/width:\s*([^;]+)/i)
    let width = 0

    if (widthMatch) {
      const widthStr = widthMatch[1].trim()
      if (widthStr.endsWith('pt')) {
        width = parseFloat(widthStr) * 1.33
      } else if (widthStr.endsWith('in')) {
        width = parseFloat(widthStr) * 96
      } else if (widthStr.endsWith('cm')) {
        width = parseFloat(widthStr) * 37.8
      } else if (widthStr.endsWith('mm')) {
        width = parseFloat(widthStr) * 3.78
      } else if (!widthStr.endsWith('%')) {
        width = parseFloat(widthStr) || 0
      }
    }

    let newStyle = style
    if (width > MAX_IMAGE_WIDTH) {
      newStyle = style
        .replace(/width:\s*[^;]+;?/i, `width: ${MAX_IMAGE_WIDTH}px;`)
        .replace(/height:\s*[^;]+;?/i, 'height: auto;')
    }

    if (!newStyle.includes('max-width')) {
      newStyle += '; max-width: 100%'
    }
    if (!newStyle.includes('height: auto')) {
      newStyle = newStyle.replace(/height:\s*[^;]+;?/i, 'height: auto;')
    }

    return `<img${attrs}style="${newStyle}; display: block;"`
  })

  result = result.replace(
    /<img(?![^>]*style=)([^>]*)>/gi,
    '<img$1 style="max-width: 100%; height: auto; display: block;">'
  )

  return result
}

export const parseWordDocument = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer()

    const options: any = {
      styleMap: mammothStyleMap,
      includeDefaultStyleMap: true,
      includeEmbeddedStyleMap: true,
      convertImage: mammoth.images.imgElement((image: any) => {
        return image.read('base64').then((imageBuffer: string) => {
          const contentType = image.contentType || 'image/png'
          return {
            src: `data:${contentType};base64,${imageBuffer}`
          }
        })
      })
    }

    const result = await mammoth.convertToHtml({ arrayBuffer }, options)
    const html = cleanWordHtml(result.value)

    if (result.messages && result.messages.length > 0) {
      const seriousMessages = result.messages.filter((m: any) => m.type === 'error')
      if (seriousMessages.length > 0) {
        console.error('Word 转换错误:', seriousMessages)
      } else {
        console.info('Word 转换提示:', result.messages)
      }
    }

    return html
  } catch (error) {
    console.error('Word 文档解析失败:', error)
    throw new Error('Word 文档解析失败，请确保文件格式正确')
  }
}
