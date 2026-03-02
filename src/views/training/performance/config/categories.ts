/** 字典数据接口（与后端 /sjrh/dict/dataList 返回格式一致） */
export interface DocCategoryVO {
  value: string
  label: string
  count?: number
}

/** 文档分类 fallback（tb_file_type） */
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

export const ALL_CATEGORY: DocCategoryVO = { value: '0', label: '全部' }

/** 演训等级 fallback（tb_level_type） */
export const levelCategories: DocCategoryVO[] = [
  { value: '1', label: '战术级' },
  { value: '2', label: '战役级' },
  { value: '3', label: '战略级' }
]

/** 所属学院 fallback（tb_academy_type） */
export const academyCategories: DocCategoryVO[] = [
  { value: 'GFDX', label: '国防大学' },
  { value: 'LHZZ', label: '联合作战学院' },
  { value: 'GJAQ', label: '国家安全学院' },
  { value: 'JSGL', label: '军事管理学院' },
  { value: 'ZZ', label: '政治学院' },
  { value: 'LHQW', label: '联合勤务学院' },
  { value: 'JSWH', label: '军事文化学院' },
  { value: 'GJFW', label: '国际防务学院' },
  { value: 'YJSY', label: '研究生院' }
]

/** 演训类型 fallback（tb_exercise_type） */
export const exerciseTypeCategories: DocCategoryVO[] = [
  { value: '1', label: '政治类' },
  { value: '2', label: '作战类' },
  { value: '3', label: '战略类' },
  { value: '4', label: '联合类' },
  { value: '5', label: '文化类' },
  { value: '6', label: '经济类' },
  { value: '7', label: '后勤装备类' },
  { value: '8', label: '大学年度演训' },
  { value: '9', label: '认知类' },
  { value: '10', label: '后装类' },
  { value: '11', label: '国际防务类' },
  { value: '12', label: '网络类' },
  { value: '13', label: '电磁类' },
  { value: '14', label: '太空类' },
  { value: '15', label: '管理类' },
  { value: '16', label: '情报类' },
  { value: '17', label: '国防动员类' }
]

/** 演训城市 fallback（tb_city_type） */
export const cityCategories: DocCategoryVO[] = [
  { value: 'BJ', label: '北京' },
  { value: 'SH', label: '上海' },
  { value: 'SJZ', label: '石家庄' },
  { value: 'XA', label: '西安' },
  { value: 'NJ', label: '南京' }
]

export const getCategoryLabelByValue = (value: string): string => {
  if (value === '0') return '全部'
  const category = performanceCategories.find((c) => c.value === value)
  return category?.label || ''
}

export const getCategoryValueByLabel = (label: string): string => {
  if (label === '全部') return '0'
  const category = performanceCategories.find((c) => c.label === label)
  return category?.value || ''
}
