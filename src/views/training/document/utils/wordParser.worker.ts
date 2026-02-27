import type { ParseProgressCallback } from './wordParser/types'
import { parseWithDocxPreview } from './wordParser.preview'

/**
 * 使用 Web Worker 解析（大文件）
 */
export function parseWithWorker(
  arrayBuffer: ArrayBuffer,
  onProgress?: ParseProgressCallback
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(new URL('./wordParserWorker.ts', import.meta.url), {
        type: 'module'
      })

      worker.onmessage = (e) => {
        const { type, html, progress, text, error } = e.data

        if (type === 'progress') {
          onProgress?.(progress, text)
        } else if (type === 'success') {
          resolve(html)
          worker.terminate()
        } else if (type === 'fallback') {
          worker.terminate()
          parseWithDocxPreview(arrayBuffer, onProgress).then(resolve).catch(reject)
        } else if (type === 'error') {
          reject(new Error(error))
          worker.terminate()
        }
      }

      worker.onerror = (e) => {
        console.error('Worker 错误:', e)
        worker.terminate()
        parseWithDocxPreview(arrayBuffer, onProgress).then(resolve).catch(reject)
      }

      const workerBuffer = arrayBuffer.slice(0)
      worker.postMessage({ arrayBuffer: workerBuffer, method: 'ooxml' }, [workerBuffer])
    } catch (e) {
      console.warn('Worker 创建失败，回退到 docx-preview:', e)
      parseWithDocxPreview(arrayBuffer, onProgress).then(resolve).catch(reject)
    }
  })
}
