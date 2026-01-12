/**
 * Mock API 统一导出
 *
 * 用于开发调试，可通过 VITE_USE_MOCK 环境变量切换
 */

export * as performanceMock from './training/performance'
export * as templateMock from './template/management'

export { default as performanceMockApi } from './training/performance'
export { default as templateMockApi } from './template/management'
