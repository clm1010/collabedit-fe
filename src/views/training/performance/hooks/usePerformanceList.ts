import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { isEmpty, isArray, isNil, pickBy, filter, map } from 'lodash-es'
import * as PerformanceApi from '@/api/training'

export function usePerformanceList() {
  const loading = ref(false)
  const total = ref(0)
  const list = ref<PerformanceApi.TrainingPerformanceVO[]>([])
  const categories = ref<PerformanceApi.DocCategoryVO[]>([])
  const selectedRows = ref<PerformanceApi.TrainingPerformanceVO[]>([])

  const queryParams = reactive<PerformanceApi.TrainingPerformancePageReqVO>({
    pageNo: 1,
    pageSize: 10,
    planName: undefined,
    collegeCode: undefined,
    createTime: undefined,
    applyNode: undefined,
    fileType: undefined,
    exerciseTheme: undefined,
    exerciseType: undefined,
    level: undefined,
    docType: undefined
  })

  const activeTab = ref('recent')
  const selectedCategory = ref('0')

  const fileTypeOptions = computed(() => {
    const filtered = filter(categories.value, (item) => item.id !== '0')
    return map(filtered, (item) => ({
      label: item.fileType,
      value: item.id,
      id: item.id
    }))
  })

  const getList = async () => {
    loading.value = true
    try {
      const params = pickBy(queryParams, (value) => {
        if (isArray(value)) return !isEmpty(value)
        return !isNil(value) && value !== ''
      }) as Record<string, any>

      if (isArray(params.createTime) && params.createTime.length === 2) {
        params.createTime = params.createTime.join(',')
      }

      params.tabType =
        activeTab.value === 'review'
          ? 'review'
          : activeTab.value === 'publish'
            ? 'publish'
            : 'recent'

      const data = await PerformanceApi.getPageList(params as any)
      list.value = data.records || data || []
      total.value = data.total || 0
    } catch (error) {
      console.error('获取数据失败:', error)
      ElMessage.error('获取数据失败，请确保后端服务已启动')
    } finally {
      loading.value = false
    }
  }

  const getCategories = async () => {
    try {
      const res = await PerformanceApi.getDocCategories()
      categories.value = res.data || []
    } catch (error) {
      console.error('获取分类失败:', error)
      ElMessage.error('获取文档分类失败，请确保后端服务已启动')
    }
  }

  const handleQuery = () => {
    queryParams.pageNo = 1
    getList()
  }

  const resetQuery = () => {
    Object.assign(queryParams, {
      pageNo: 1,
      pageSize: 10,
      planName: undefined,
      collegeCode: undefined,
      createTime: undefined,
      applyNode: undefined,
      fileType: undefined,
      exerciseTheme: undefined,
      exerciseType: undefined,
      level: undefined,
      docType: undefined
    })
    selectedCategory.value = '0'
    activeTab.value = 'recent'
    handleQuery()
  }

  const handleSelectionChange = (val: PerformanceApi.TrainingPerformanceVO[]) => {
    selectedRows.value = val
  }

  const handleTabChange = () => {
    queryParams.pageNo = 1
    getList()
  }

  const handleCategorySelect = (categoryId: string) => {
    selectedCategory.value = categoryId
    const category = categories.value.find((cat) => cat.id === categoryId)

    if (categoryId === '0') {
      queryParams.fileType = undefined
    } else if (category) {
      queryParams.fileType = category.fileType
    }

    handleQuery()
  }

  const collegeOptions = [
    { label: '国防大学', value: 'GFDX' },
    { label: '联合作战学院', value: 'LHZZXY' },
    { label: '国家安全学院', value: 'GJAQXY' },
    { label: '联合勤务学院', value: 'LHQWXY' },
    { label: '国际防务学院', value: 'GJFWXY' },
    { label: '军事管理学院', value: 'SGLXY' },
    { label: '政治学院', value: 'ZZXY' },
    { label: '军事文华学院', value: 'JSWHXY' },
    { label: '研究生院', value: 'YJSY' }
  ]

  const exerciseThemeOptions = [
    { label: '联合作战训练', value: 'LHZZYX' },
    { label: '作战训练', value: 'ZUOZL' },
    { label: '政治训练', value: 'ZZL' },
    { label: '经济训练', value: 'JJL' },
    { label: '认知训练', value: 'RZL' },
    { label: '文化训练', value: 'WHL' },
    { label: '后装训练', value: 'HZL' }
  ]

  const exerciseTypeOptions = [
    { label: '大学年度演训', value: 'DXNDYX' },
    { label: '联合类', value: 'LHL' },
    { label: '作战类', value: 'ZUOZL' },
    { label: '政治类', value: 'ZZL' },
    { label: '经济类', value: 'JJL' },
    { label: '认知类', value: 'RZL' },
    { label: '文化类', value: 'WHL' },
    { label: '后装类', value: 'HZL' },
    { label: '国际防务类', value: 'GJFWL' },
    { label: '网络类', value: 'WLL' },
    { label: '电磁类', value: 'DCL' },
    { label: '太空类', value: 'TKL' }
  ]

  const levelOptions = [
    { label: '战略级', value: 'ZLJ' },
    { label: '战役级', value: 'YXJ' },
    { label: '战术级', value: 'ZSJ' }
  ]

  const getCollegeLabel = (code?: string) => {
    if (!code) return ''
    const option = collegeOptions.find((item) => item.value === code)
    return option?.label || code
  }

  const getFileTypeLabel = (fileType?: string) => {
    if (!fileType) return ''
    const category = categories.value.find(
      (item) => item.fileType === fileType || item.id === fileType
    )
    return category?.fileType || fileType
  }

  const getLevelLabel = (level?: string) => {
    if (!level) return ''
    const option = levelOptions.find((item) => item.value === level)
    return option?.label || level
  }

  const getExerciseThemeLabel = (theme?: string) => {
    if (!theme) return ''
    const option = exerciseThemeOptions.find((item) => item.value === theme)
    return option?.label || theme
  }

  const getExerciseTypeLabel = (type?: string) => {
    if (!type) return ''
    const option = exerciseTypeOptions.find((item) => item.value === type)
    return option?.label || type
  }

  const applyNodeTextMap: Record<string, string> = {
    '1': '编辑中',
    '2': '审核中',
    '3': '审核通过',
    '4': '发布',
    '5': '驳回'
  }

  const getApplyNodeLabel = (applyNode?: string) => {
    if (!applyNode) return ''
    return applyNodeTextMap[applyNode] || applyNode
  }

  const getStatusClass = (status?: string) => {
    switch (status) {
      case '1':
        return 'bg-red-500'
      case '2':
        return 'bg-orange-500'
      case '3':
        return 'bg-green-500'
      case '4':
        return 'bg-blue-500'
      case '5':
        return 'bg-gray-400'
      default:
        return 'bg-gray-500'
    }
  }

  return {
    loading,
    total,
    list,
    categories,
    selectedRows,
    queryParams,
    activeTab,
    selectedCategory,
    fileTypeOptions,

    getList,
    getCategories,
    handleQuery,
    resetQuery,
    handleSelectionChange,
    handleTabChange,
    handleCategorySelect,

    getCollegeLabel,
    getFileTypeLabel,
    getLevelLabel,
    getExerciseThemeLabel,
    getExerciseTypeLabel,
    getApplyNodeLabel,
    getStatusClass,

    collegeOptions,
    exerciseThemeOptions,
    exerciseTypeOptions,
    levelOptions
  }
}

export default usePerformanceList
