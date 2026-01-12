/**
 * API 配置 - Mock/Java 后端统一切换
 *
 * 通过环境变量 VITE_USE_MOCK 控制：
 * - true: 使用 Mock 数据（开发调试）
 * - false: 使用 Java 后端接口（联调/生产）
 *
 * 配置方式：
 * 1. 在 .env.dev 或 .env.prod 中设置 VITE_USE_MOCK=true/false
 * 2. 或在启动命令中设置：VITE_USE_MOCK=true pnpm dev
 */

/**
 * 是否使用 Mock 数据
 * 默认开发环境使用 Mock，生产环境使用 Java 后端
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/**
 * API 模式枚举
 */
export enum ApiMode {
  MOCK = 'mock',
  JAVA = 'java'
}

/**
 * 当前 API 模式
 */
export const API_MODE: ApiMode = USE_MOCK ? ApiMode.MOCK : ApiMode.JAVA

/**
 * 打印当前 API 模式（仅开发环境）
 */
if (import.meta.env.DEV) {
  console.log(
    `%c[API Config] 当前模式: ${USE_MOCK ? '🎭 Mock 数据' : '☕ Java 后端'}`,
    'color: #409EFF; font-weight: bold;'
  )
  console.log(
    `%c[API Config] VITE_USE_MOCK = "${import.meta.env.VITE_USE_MOCK}"`,
    'color: #67C23A;'
  )
}

/**
 * 创建 API 切换器
 * 根据配置自动选择 Mock 或 Java 实现
 *
 * @param mockFn Mock 实现函数
 * @param javaFn Java 后端实现函数
 * @returns 根据配置返回对应的实现
 *
 * @example
 * ```ts
 * export const getPageList = createApiSwitcher(
 *   mockApi.getPageList,
 *   javaApi.getPageList
 * )
 * ```
 */
export function createApiSwitcher<T extends (...args: any[]) => any>(mockFn: T, javaFn: T): T {
  return (USE_MOCK ? mockFn : javaFn) as T
}

/**
 * 批量创建 API 切换器
 * 用于一次性创建多个 API 的切换
 *
 * @param mockApis Mock API 对象
 * @param javaApis Java API 对象
 * @returns 切换后的 API 对象
 *
 * @example
 * ```ts
 * const api = createApiSwitchers(mockApis, javaApis)
 * // api.getPageList, api.create, api.update 等会自动切换
 * ```
 */
export function createApiSwitchers<T extends Record<string, (...args: any[]) => any>>(
  mockApis: T,
  javaApis: T
): T {
  const result = {} as T
  const keys = new Set([...Object.keys(mockApis), ...Object.keys(javaApis)])

  keys.forEach((key) => {
    const mockFn = mockApis[key as keyof T]
    const javaFn = javaApis[key as keyof T]

    if (mockFn && javaFn) {
      result[key as keyof T] = createApiSwitcher(mockFn, javaFn)
    } else if (mockFn) {
      // 只有 Mock 实现
      result[key as keyof T] = mockFn
    } else if (javaFn) {
      // 只有 Java 实现
      result[key as keyof T] = javaFn
    }
  })

  return result
}

export default {
  USE_MOCK,
  API_MODE,
  createApiSwitcher,
  createApiSwitchers
}
