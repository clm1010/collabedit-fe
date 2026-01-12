/**
 * 演训方案文档分类配置
 * 从 collaborative-middleware 迁移
 */

/**
 * 文档分类接口
 */
export interface DocCategoryVO {
  id: string
  fileType: string
  count?: number
}

/**
 * 文档分类数据
 */
export const performanceCategories: DocCategoryVO[] = [
  { id: '0', fileType: '全部' },
  { id: 'QTLA', fileType: '企图立案' },
  { id: 'ZZJH', fileType: '作战计划' },
  { id: 'YXFA', fileType: '演训方案' },
  { id: 'ZZWS', fileType: '作战文书' },
  { id: 'DTJH', fileType: '导调计划' },
  { id: 'ZZXD', fileType: '作战想定' },
  { id: 'ZJZG', fileType: '战绩战报' },
  { id: 'ZJBG', fileType: '总结报告' },
  { id: 'TZ', fileType: '通知' },
  { id: 'TG', fileType: '通告' },
  { id: 'PGJG', fileType: '评估结果' },
  { id: 'QT', fileType: '其它' }
]

/**
 * 根据 ID 获取分类名称
 * @param id 分类 ID
 */
export const getCategoryNameById = (id: string): string => {
  const category = performanceCategories.find((c) => c.id === id)
  return category?.fileType || ''
}

/**
 * 根据名称获取分类 ID
 * @param name 分类名称
 */
export const getCategoryIdByName = (name: string): string => {
  const category = performanceCategories.find((c) => c.fileType === name)
  return category?.id || ''
}
