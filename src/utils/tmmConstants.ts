/**
 * 模板管理 - 公共常量
 *
 * 独立文件，方便跨项目引用，避免路径别名依赖问题
 * 可直接复制到其他项目使用，无需依赖 @/ 别名配置
 */

// ==================== 要素类型定义 ====================

/**
 * 要素类型枚举
 * - text: 文本输入
 * - radio: 单选
 * - multiple: 多选
 * - number: 数字输入
 * - time: 日期时间选择
 */
export type ElementItemType = 'text' | 'radio' | 'multiple' | 'number' | 'time'

/**
 * 要素类型选项配置接口
 */
export interface ElementTypeOption {
  value: ElementItemType // 要素类型值
  label: string // 显示标签
  hasOptions: boolean // 是否需要配置选项（单选/多选需要）
}

/**
 * 要素类型选项列表
 * 用于要素编辑器的类型选择下拉框
 *
 * @constant
 * @example
 * // 在其他项目中使用（相对路径导入）
 * import { ELEMENT_TYPE_OPTIONS } from './tmmConstants'
 */
export const ELEMENT_TYPE_OPTIONS: ElementTypeOption[] = [
  { value: 'text', label: '文本', hasOptions: false },
  { value: 'radio', label: '单选', hasOptions: true },
  { value: 'multiple', label: '多选', hasOptions: true },
  { value: 'number', label: '数字', hasOptions: false },
  { value: 'time', label: '日期', hasOptions: false }
]

/**
 * 要素类型标签映射
 * 用于将类型值转换为中文显示
 *
 * @constant
 * @example
 * const label = ELEMENT_TYPE_LABELS['text'] // '文本'
 */
export const ELEMENT_TYPE_LABELS: Record<ElementItemType, string> = {
  text: '文本',
  radio: '单选',
  multiple: '多选',
  number: '数字',
  time: '日期'
}

/**
 * 判断要素类型是否需要配置选项
 *
 * @param type 要素类型
 * @returns 是否需要配置选项
 *
 * @example
 * needOptions('radio') // true
 * needOptions('text') // false
 */
export const needOptions = (type: ElementItemType): boolean => {
  return type === 'radio' || type === 'multiple'
}
