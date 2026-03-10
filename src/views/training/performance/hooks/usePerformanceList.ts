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
    const filtered = filter(categories.value, (item) => item.value !== '0')
    return map(filtered, (item) => ({
      label: item.label,
      value: item.value
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
    const category = categories.value.find((cat) => cat.value === categoryId)

    if (categoryId === '0') {
      queryParams.fileType = undefined
    } else if (category) {
      queryParams.fileType = category.value
    }

    handleQuery()
  }

  const getFileTypeLabel = (fileType?: string) => {
    if (!fileType) return ''
    const category = categories.value.find(
      (item) => item.label === fileType || item.value === fileType
    )
    return category?.label || fileType
  }

  const getLabelFromOptions = (options: PerformanceApi.DocCategoryVO[], value?: string) => {
    if (!value) return ''
    const option = options.find((item) => item.value === value)
    return option?.label || value
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

    getFileTypeLabel,
    getLabelFromOptions,
    getApplyNodeLabel,
    getStatusClass
  }
}

export default usePerformanceList
