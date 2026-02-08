/**
 * 统一日志工具
 * 仅在开发环境 (import.meta.env.DEV) 下输出，生产环境静默
 * 保留 console.error 用于真正需要上报的错误
 */

const isDev = import.meta.env.DEV

const noop = (..._args: unknown[]): void => {}

export const logger = {
  /** 调试日志 - 仅开发环境输出 */
  debug: isDev ? console.log.bind(console) : noop,
  /** 信息日志 - 仅开发环境输出 */
  info: isDev ? console.info.bind(console) : noop,
  /** 警告日志 - 仅开发环境输出 */
  warn: isDev ? console.warn.bind(console) : noop,
  /** 错误日志 - 始终输出（用于真正需要上报的错误） */
  error: console.error.bind(console)
}

export default logger
