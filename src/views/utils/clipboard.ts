/**
 * 兼容非安全上下文（HTTP）的剪贴板写入工具。
 *
 * navigator.clipboard 仅在 Secure Context（HTTPS / localhost）下可用，
 * 通过 HTTP 局域网 IP 访问时为 undefined。本函数自动降级到
 * document.execCommand('copy') 以保证在任何环境下均可正常复制。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // 降级方案：execCommand('copy')
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    return successful
  } catch (error) {
    console.error('复制到剪贴板失败:', error)
    return false
  }
}
