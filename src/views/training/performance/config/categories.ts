/**
 * 演训方案文档分类配置
 * 字段格式与 Java 后端保持一致：{ value, label }
 */

/**
 * 文档分类接口（与 Java 后端 /dict/list?dictType=FILE_TYPE 返回格式一致）
 */
export interface DocCategoryVO {
  value: string
  label: string
  count?: number
}

/**
 * Mock 文档分类数据（不包含"全部"，"全部"由使用方按需添加）
 */
export const performanceCategories: DocCategoryVO[] = [
  { value: 'ZCQB', label: '侦察情报' },
  { value: 'QTLA', label: '企图立案' },
  { value: 'ZZJH', label: '作战计划' },
  { value: 'YXFA', label: '演训方案' },
  { value: 'ZZWS', label: '作战文书' },
  { value: 'DDJH', label: '导调计划' },
  { value: 'ZJZB', label: '战绩战报' },
  { value: 'ZZXT', label: '作战想定' },
  { value: 'ZJBG', label: '总结报告' },
  { value: 'TZ', label: '通知' },
  { value: 'TG', label: '通告' },
  { value: 'PGJG', label: '评估结果' },
  { value: 'QT', label: '其它' }
]

/**
 * "全部"选项（左侧分类列表使用）
 */
export const ALL_CATEGORY: DocCategoryVO = { value: '0', label: '全部' }

/**
 * 根据 value 获取分类名称
 * @param value 分类 value
 */
export const getCategoryLabelByValue = (value: string): string => {
  if (value === '0') return '全部'
  const category = performanceCategories.find((c) => c.value === value)
  return category?.label || ''
}

/**
 * 根据名称获取分类 value
 * @param label 分类名称
 */
export const getCategoryValueByLabel = (label: string): string => {
  if (label === '全部') return '0'
  const category = performanceCategories.find((c) => c.label === label)
  return category?.value || ''
}
