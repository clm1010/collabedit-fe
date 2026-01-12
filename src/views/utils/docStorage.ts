/**
 * 文档内容存储工具
 * 使用 IndexedDB 存储大文件内容，避免 sessionStorage 配额限制
 */

const DB_NAME = 'doc_storage_db'
const DB_VERSION = 1
const STORE_NAME = 'doc_contents'

/**
 * 打开 IndexedDB 数据库
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('无法打开 IndexedDB 数据库'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
  })
}

/**
 * 保存文档内容到 IndexedDB
 * @param docId 文档ID
 * @param content 文档内容（base64 字符串）
 */
export const saveDocContent = async (docId: string | number, content: string): Promise<void> => {
  try {
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.put({
        key: `doc_content_${docId}`,
        content,
        timestamp: Date.now()
      })

      request.onsuccess = () => {
        db.close()
        resolve()
      }

      request.onerror = () => {
        db.close()
        reject(new Error('保存文档内容失败'))
      }
    })
  } catch (error) {
    console.error('IndexedDB 保存失败:', error)
    throw error
  }
}

/**
 * 从 IndexedDB 获取文档内容
 * @param docId 文档ID
 * @returns 文档内容（base64 字符串）或 null
 */
export const getDocContent = async (docId: string | number): Promise<string | null> => {
  try {
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get(`doc_content_${docId}`)

      request.onsuccess = () => {
        db.close()
        const result = request.result
        resolve(result ? result.content : null)
      }

      request.onerror = () => {
        db.close()
        reject(new Error('获取文档内容失败'))
      }
    })
  } catch (error) {
    console.error('IndexedDB 获取失败:', error)
    return null
  }
}

/**
 * 从 IndexedDB 删除文档内容
 * @param docId 文档ID
 */
export const removeDocContent = async (docId: string | number): Promise<void> => {
  try {
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.delete(`doc_content_${docId}`)

      request.onsuccess = () => {
        db.close()
        resolve()
      }

      request.onerror = () => {
        db.close()
        reject(new Error('删除文档内容失败'))
      }
    })
  } catch (error) {
    console.error('IndexedDB 删除失败:', error)
    throw error
  }
}

/**
 * 清理过期的文档内容（超过1小时的缓存）
 */
export const cleanupExpiredContent = async (): Promise<void> => {
  try {
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const expireTime = Date.now() - 60 * 60 * 1000 // 1小时前

    const request = store.openCursor()

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        const record = cursor.value
        if (record.timestamp && record.timestamp < expireTime) {
          cursor.delete()
        }
        cursor.continue()
      } else {
        db.close()
      }
    }

    request.onerror = () => {
      db.close()
    }
  } catch (error) {
    console.error('清理过期缓存失败:', error)
  }
}
