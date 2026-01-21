<template>
  <div class="performance-container">
    <el-row :gutter="20" class="h-full">
      <!-- 左侧文档分类 -->
      <el-col :span="4" :xs="24" class="h-full">
        <ContentWrap class="category-wrap">
          <div class="p-4 h-full flex flex-col">
            <div class="font-bold mb-4 text-16px">文档分类</div>
            <el-scrollbar class="flex-1">
              <el-menu
                :default-active="selectedCategory"
                class="border-0 category-menu"
                @select="handleCategorySelect"
              >
                <el-menu-item
                  v-for="category in categories"
                  :key="category.value"
                  :index="category.value"
                >
                  <span>{{ category.label }}</span>
                </el-menu-item>
              </el-menu>
            </el-scrollbar>
          </div>
        </ContentWrap>
      </el-col>

      <el-col :span="20" :xs="24" class="h-full">
        <div class="h-full flex flex-col">
          <!-- 搜索栏 -->
          <PerformanceSearch
            ref="searchRef"
            v-model="queryParams"
            @search="handleQuery"
            @reset="resetQuery"
          />

          <ContentWrap class="flex-1 overflow-hidden mt-4 table-container-wrap">
            <div class="h-full flex flex-col p-4">
              <!-- 工具栏 -->
              <div class="mb-4 flex-shrink-0">
                <el-button type="primary" size="large" @click="handleAdd">
                  <Icon icon="ep:plus" class="mr-1" />
                  新建
                </el-button>
                <el-button
                  type="danger"
                  plain
                  size="large"
                  :disabled="!canBatchDelete"
                  @click="handleBatchDelete"
                >
                  <Icon icon="ep:delete" class="mr-1" />
                  批量删除
                </el-button>
              </div>

              <!-- 标签页 -->
              <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="flex-shrink-0">
                <el-tab-pane label="最近文档" name="recent" />
                <el-tab-pane label="审核列表" name="review" />
                <el-tab-pane label="文档发布" name="publish" />
              </el-tabs>

              <!-- 表格 -->
              <div class="flex-1 overflow-hidden">
                <el-table
                  v-loading="loading"
                  :data="list"
                  @selection-change="handleSelectionChange"
                  stripe
                  height="100%"
                >
                  <el-table-column type="selection" width="55" />
                  <el-table-column label="序号" type="index" width="60" align="center" />
                  <el-table-column
                    label="方案名称"
                    prop="planName"
                    align="center"
                    min-width="200"
                  />
                  <el-table-column label="所属学院" prop="collegeCode" align="center" width="120">
                    <template #default="scope">
                      {{ getCollegeLabel(scope.row.collegeCode) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="文档分类" prop="fileType" align="center" width="120">
                    <template #default="scope">
                      {{ getFileTypeLabel(scope.row.fileType) }}
                    </template>
                  </el-table-column>

                  <!-- <el-table-column label="演训主题" prop="exerciseTheme" align="center" width="120">
                    <template #default="scope">
                      {{ getExerciseThemeLabel(scope.row.exerciseTheme) }}
                    </template>
                  </el-table-column> -->
                  <el-table-column label="演训类型" prop="exerciseType" align="center" width="120">
                    <template #default="scope">
                      {{ getExerciseTypeLabel(scope.row.exerciseType) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="演训等级" prop="level" align="center" width="100">
                    <template #default="scope">
                      {{ getLevelLabel(scope.row.level) }}
                    </template>
                  </el-table-column>
                  <el-table-column label="审核状态" prop="applyNode" align="center" width="120">
                    <template #default="scope">
                      <div class="flex items-center justify-center">
                        <div
                          :class="getStatusClass(scope.row.applyNode)"
                          class="w-2 h-2 rounded-full mr-2"
                        ></div>
                        {{ getApplyNodeLabel(scope.row.applyNode) }}
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="创建时间" prop="createTime" align="center" width="180" />
                  <el-table-column label="操作" align="center" width="320" fixed="right">
                    <template #default="scope">
                      <!-- 编辑中状态(1)显示：编辑、写作、审核、删除 -->
                      <div v-if="scope.row.applyNode === '1'">
                        <el-button link type="primary" @click="handleEditData(scope.row)">
                          <Icon icon="ep:edit-pen" />
                          编辑
                        </el-button>
                        <el-button link type="primary" @click="handleEdit(scope.row)">
                          <Icon icon="ep:edit" />
                          写作
                        </el-button>
                        <el-button link type="primary" @click="openAuditDialog(scope.row)">
                          <Icon icon="ep:upload" />
                          提交审核
                        </el-button>
                        <el-button link type="danger" @click="handleDelete(scope.row)">
                          <Icon icon="ep:delete" />
                          删除
                        </el-button>
                      </div>

                      <!-- 审核中状态(2)显示：审核、审核记录 -->
                      <div v-else-if="scope.row.applyNode === '2'">
                        <el-button link type="primary" @click="handleReviewExecute(scope.row)">
                          <Icon icon="ep:view" />
                          审核
                        </el-button>
                        <el-button link type="primary" @click="openExamRecordDialog(scope.row)">
                          <Icon icon="ep:document" />
                          审核记录
                        </el-button>
                      </div>

                      <!-- 审核通过状态(3)显示：发布 + 审核记录 -->
                      <div v-else-if="scope.row.applyNode === '3'">
                        <el-button link type="primary" @click="openPublishDialog(scope.row)">
                          <Icon icon="ep:promotion" />
                          发布
                        </el-button>
                        <el-button link type="primary" @click="openExamRecordDialog(scope.row)">
                          <Icon icon="ep:document" />
                          审核记录
                        </el-button>
                      </div>

                      <!-- 发布状态(4)显示：预览、导出、审核记录 -->
                      <div v-else-if="scope.row.applyNode === '4'">
                        <el-button link type="primary" @click="handlePreview(scope.row)">
                          <Icon icon="ep:view" />
                          预览
                        </el-button>
                        <el-button link type="primary" @click="handleExport(scope.row)">
                          <Icon icon="ep:download" />
                          导出
                        </el-button>
                        <el-button link type="primary" @click="openExamRecordDialog(scope.row)">
                          <Icon icon="ep:document" />
                          审核记录
                        </el-button>
                      </div>

                      <!-- 驳回状态(5)显示：编辑、写作、提交审核、删除、审核记录 -->
                      <div v-else-if="scope.row.applyNode === '5'">
                        <el-button link type="primary" @click="handleEditData(scope.row)">
                          <Icon icon="ep:edit-pen" />
                          编辑
                        </el-button>
                        <el-button link type="primary" @click="handleEdit(scope.row)">
                          <Icon icon="ep:edit" />
                          写作
                        </el-button>
                        <el-button link type="primary" @click="openAuditDialog(scope.row)">
                          <Icon icon="ep:upload" />
                          提交审核
                        </el-button>
                        <el-button link type="danger" @click="handleDelete(scope.row)">
                          <Icon icon="ep:delete" />
                          删除
                        </el-button>
                        <el-button link type="primary" @click="openExamRecordDialog(scope.row)">
                          <Icon icon="ep:document" />
                          审核记录
                        </el-button>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- 分页 -->
              <div class="mt-4 flex-shrink-0">
                <Pagination
                  :total="total"
                  v-model:page="queryParams.pageNo"
                  v-model:limit="queryParams.pageSize"
                  @pagination="getList"
                />
              </div>
            </div>
          </ContentWrap>
        </div>
      </el-col>
    </el-row>
  </div>

  <!-- 新建/编辑筹划方案弹窗 -->
  <PerformanceForm
    ref="performanceFormRef"
    v-model:visible="dialogVisible"
    :is-edit-mode="isEditMode"
    :loading="loading"
    :file-type-options="fileTypeOptions"
    @save="handleFormSave"
    @open-drill-selector="openDrillSelector"
  />

  <!-- 演训数据选择弹窗 -->
  <DrillSelector v-model:visible="drillSelectorVisible" @select="handleDrillSelect" />

  <!-- 审核流配置弹窗 -->
  <AuditFlowDialog
    v-model="auditDialogVisible"
    :document-id="currentAuditRow?.id || 0"
    :flow-list="auditFlowList"
    :user-options="userOptions"
    :loading="auditLoading"
    @submit="handleAuditSubmit"
  />

  <!-- 发布配置弹窗 -->
  <PublishDialog
    ref="publishDialogRef"
    v-model:visible="publishDialogVisible"
    :loading="publishLoading"
    :user-options="userOptions"
    @submit="handlePublishDialogSubmit"
  />

  <!-- 驳回原因弹窗 -->
  <RejectDialog
    ref="rejectDialogRef"
    v-model:visible="rejectDialogVisible"
    :loading="rejectLoading"
    @submit="handleRejectDialogSubmit"
  />

  <!-- 审核记录弹窗 -->
  <ExamRecordDialog
    v-model:visible="examRecordDialogVisible"
    :loading="examRecordLoading"
    :record-list="examRecordList"
  />

  <!-- 文档预览弹窗 -->
  <DocumentPreviewDialog
    v-model:visible="previewDialogVisible"
    :content="previewContent"
    :title="previewTitle"
  />
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, nextTick, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as PerformanceApi from '@/api/training'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { useCollaborationUserStore } from '@/store/modules/collaborationUser'
import AuditFlowDialog from '@/lmComponents/AuditFlowDialog/index.vue'
import DocumentPreviewDialog from '@/lmComponents/DocumentPreviewDialog/index.vue'
import MarkdownIt from 'markdown-it'
import { htmlToDocx } from '@/views/utils/htmlToDocx'
import PerformanceSearch from './components/PerformanceSearch.vue'
import PerformanceForm from './components/PerformanceForm.vue'
import DrillSelector from './components/DrillSelector.vue'
import PublishDialog from './components/PublishDialog.vue'
import RejectDialog from './components/RejectDialog.vue'
import ExamRecordDialog from './components/ExamRecordDialog.vue'
import { saveDocContent } from '@/views/utils/docStorage'
import { blobToBase64, blobToText } from '@/views/utils/fileUtils'
import {
  isEmpty,
  isArray,
  isNil,
  isObject,
  isString,
  pickBy,
  find,
  every,
  filter,
  map
} from 'lodash-es'

defineOptions({ name: 'TrainingPerformance' })

const router = useRouter()
const collaborationUserStore = useCollaborationUserStore()
const loading = ref(false)
const total = ref(0)
const list = ref<PerformanceApi.TrainingPerformanceVO[]>([])
const activeTab = ref('recent')
const selectedCategory = ref('0') // '0' 对应 "全部"
const categories = ref<PerformanceApi.DocCategoryVO[]>([])
const selectedRows = ref<PerformanceApi.TrainingPerformanceVO[]>([])

// 计算属性：判断是否可以批量删除（只有选中的数据都是"编辑中"(1)或"驳回"(5)状态才能删除）
const canBatchDelete = computed(() => {
  if (isEmpty(selectedRows.value)) return false
  return every(selectedRows.value, (row) => row.applyNode === '1' || row.applyNode === '5')
})

const queryParams = reactive<PerformanceApi.TrainingPerformancePageReqVO>({
  pageNo: 1,
  pageSize: 10,
  planName: undefined,
  collegeCode: undefined,
  createTime: undefined,
  applyNode: undefined,
  fileType: undefined, // 左侧文档分类
  // exerciseTheme: undefined, // 演训主题
  exerciseType: undefined, // 演训类型
  level: undefined, // 演训等级
  docType: undefined // 文档类型
})

const searchRef = ref()

// 获取数据列表 - 调用 Java 后端 /api/users/getPageList
const getList = async () => {
  loading.value = true
  try {
    // 使用 lodash pickBy 过滤空值
    const params = pickBy(queryParams, (value) => {
      if (isArray(value)) return !isEmpty(value)
      return !isNil(value) && value !== ''
    }) as Record<string, any>

    // 将 createTime 数组转换为字符串格式 '2025-10-10,2025-12-12'
    if (isArray(params.createTime) && params.createTime.length === 2) {
      params.createTime = params.createTime.join(',')
    }

    // 添加标签页类型参数
    params.tabType =
      activeTab.value === 'review' ? 'review' : activeTab.value === 'publish' ? 'publish' : 'recent'

    console.log('查询参数:', params)
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

// 获取文档分类
const getCategories = async () => {
  try {
    const res = await PerformanceApi.getDocCategories()
    // 左侧分类列表使用带"全部"的数据
    categories.value = res.withAll || []
  } catch (error) {
    console.error('获取分类失败:', error)
    ElMessage.error('获取文档分类失败，请确保后端服务已启动')
  }
}

// 查询按钮
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

// 重置按钮
const resetQuery = () => {
  searchRef.value?.resetFields()
  selectedCategory.value = '0' // '0' 对应 "全部"
  queryParams.fileType = undefined // 重置分类过滤
  activeTab.value = 'recent' // 重置标签页
  handleQuery()
}

// 文档分类选择
const handleCategorySelect = (index: string) => {
  selectedCategory.value = index
  console.log('选择分类 value:', index)

  // 使用 lodash find 根据 value 找到对应的 category
  const category = find(categories.value, (cat) => cat.value === index)

  // 将选择的分类传递到查询参数
  if (index === '0') {
    // 选择全部时 (value='0')，清空分类过滤
    queryParams.fileType = undefined
  } else if (category) {
    // 传递 label（分类名称）
    queryParams.fileType = category.label
    console.log('传递 fileType:', category.label)
  }

  // 触发查询
  handleQuery()
}

// 新建/编辑弹窗
const dialogVisible = ref(false)
const isEditMode = ref(false) // 是否为编辑模式（编辑模式隐藏创建方式）
const currentEditId = ref<string | null>(null) // 当前编辑的数据ID
const performanceFormRef = ref()

// 文档分类下拉选项（过滤掉"全部"，用于新建/编辑弹窗）
const fileTypeOptions = computed(() => {
  const filtered = filter(categories.value, (item) => item.value !== '0')
  return map(filtered, (item) => ({
    label: item.label,
    value: item.value
  }))
})

// 演训主题选项（供标签转换和 DrillSelector 使用）
// const exerciseThemeOptions = [
//   { label: '联合作战训练', value: 'LHZZYX' },
//   { label: '作战训练', value: 'ZUOZL' },
//   { label: '政治训练', value: 'ZZL' },
//   { label: '经济训练', value: 'JJL' },
//   { label: '认知训练', value: 'RZL' },
//   { label: '文化训练', value: 'WHL' },
//   { label: '后装训练', value: 'HZL' }
// ]

// 演训类型选项（供标签转换和 DrillSelector 使用）
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

// 演训等级选项（供标签转换使用）
const levelOptions = [
  { label: '战略级', value: 'ZLJ' },
  { label: '战役级', value: 'YXJ' },
  { label: '战术级', value: 'ZSJ' }
]

// 所属学院选项（供标签转换和 DrillSelector 使用）
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

// 模拟用户列表（用于审核和发布配置）
const userOptions = [
  { label: 'user1', value: 'user1' },
  { label: 'user2', value: 'user2' },
  { label: 'user3', value: 'user3' },
  { label: 'user4', value: 'user4' },
  { label: 'user5', value: 'user5' }
]

// 演训数据选择器
const drillSelectorVisible = ref(false)

const openDrillSelector = () => {
  drillSelectorVisible.value = true
}

// 演训数据选择回调
const handleDrillSelect = (row: any) => {
  if (!row) return
  // 调用表单组件的方法设置演训数据
  performanceFormRef.value?.setDrillData(row)
  drillSelectorVisible.value = false
}

// 新建
const handleAdd = () => {
  isEditMode.value = false // 新建模式
  currentEditId.value = null
  dialogVisible.value = true
  // 重置表单
  nextTick(() => {
    performanceFormRef.value?.resetForm()
  })
}

// 编辑数据
const handleEditData = (row: PerformanceApi.TrainingPerformanceVO) => {
  isEditMode.value = true // 编辑模式（隐藏创建方式）
  currentEditId.value = row.id || null
  dialogVisible.value = true

  // 填充表单数据
  nextTick(() => {
    performanceFormRef.value?.setFormData({
      id: row.id || '',
      planId: row.planId || '',
      exerciseName: row.exerciseName || '',
      planName: row.planName || '',
      // exerciseTheme: row.exerciseTheme || '',
      exerciseType: row.exerciseType || '',
      level: row.level || '',
      fileType: row.fileType || '',
      collegeCode: row.collegeCode || '',
      description: row.description || '',
      activeUser: row.activeUser ? row.activeUser.split(',') : [],
      creationMethod: 'new'
    })
  })
}

// 表单保存（接收来自 PerformanceForm 组件的数据）
const handleFormSave = async (formData: any, uploadFile: File | null) => {
  try {
    // 只有新建模式且选择上传文档时，才验证是否已选择文件
    if (!isEditMode.value && formData.creationMethod === 'upload' && !uploadFile) {
      ElMessage.warning('请选择要上传的文件')
      return
    }

    loading.value = true

    // 使用选择的分类 value 作为 fileType
    const fileType = formData.fileType || ''
    console.log(fileType, 'fileType------')

    // 编辑模式
    if (isEditMode.value) {
      // 构建编辑数据（不传递 creationMethod），映射到标准字段名
      const editData: any = {
        id: currentEditId.value, // 演训方案ID
        planId: formData.planId, // 演训数据ID
        exerciseName: formData.exerciseName, // 演训数据名称
        planName: formData.planName, // 演训方案名称
        // exerciseTheme: formData.exerciseTheme, // 演训主题
        exerciseType: formData.exerciseType, // 演训类型
        level: formData.level, // 演训等级
        fileType: fileType, // 文件类型
        collegeCode: formData.collegeCode, // 所属学院
        description: formData.description, // 描述
        activeUser: formData.activeUser.join(',') // 可编辑用户
      }
      console.log(editData, 'editData（编辑）------')
      await PerformanceApi.updatePerformanceData(editData)
      ElMessage.success('更新成功')
      dialogVisible.value = false
      getList()
      return
    }

    // 新建模式
    // 构建保存数据，映射到标准字段名
    const saveData: PerformanceApi.TrainingPerformanceVO = {
      planId: formData.planId, // 演训数据ID
      exerciseName: formData.exerciseName, // 演训数据名称
      planName: formData.planName, // 演训方案名称
      // exerciseTheme: formData.exerciseTheme, // 演训主题
      exerciseType: formData.exerciseType, // 演训类型
      level: formData.level, // 演训等级
      fileType: fileType, // 文档分类
      collegeCode: formData.collegeCode, // 所属学院
      description: formData.description, // 描述
      activeUser: formData.activeUser.join(',') // 可编辑用户
    }

    // 判断创建方式
    if (formData.creationMethod === 'upload') {
      // 上传文档模式
      console.log('上传文档文件:', uploadFile!.name)
      const uploadResult = await PerformanceApi.uploadDocument({
        file: uploadFile!
      })
      console.log('上传结果:', uploadResult, typeof uploadResult)

      // 处理上传结果 - 兼容两种响应格式
      let fileId: string | null = null

      if (isString(uploadResult)) {
        // axios 封装解包后直接返回了 data 值
        fileId = uploadResult
        console.log('上传成功(解包响应), 文件ID:', fileId)
      } else if (isObject(uploadResult)) {
        // 完整响应对象
        const result = uploadResult as { code?: number; data?: string; msg?: string }
        if (result.code === 200 || result.code === 0) {
          fileId = result.data || null
          console.log('上传成功(完整响应), 文件ID:', fileId)
        } else {
          ElMessage.error(result.msg || '上传文档失败')
          return
        }
      }

      if (isEmpty(fileId)) {
        ElMessage.error('上传文档失败：未获取到文件ID')
        return
      }

      // 将上传返回的 fileId 传递给 createNewData
      saveData.fileId = fileId as string
      console.log(saveData, 'saveData（上传文档）------')
      await PerformanceApi.createNewData(saveData)
      ElMessage.success('创建成功')
    } else {
      // 新建文档模式
      console.log(saveData, 'saveData（新建文档）------')
      await PerformanceApi.createNewData(saveData)
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    getList()
  } catch (error: any) {
    if (error !== false) {
      // 不是验证失败
      console.error('保存失败:', error)
      ElMessage.error(error.message || '保存失败')
    }
  } finally {
    loading.value = false
  }
}

// 文档生成
// const handleGenerate = () => {
//   ElMessage.info('文档生成功能开发中')
// }

// Tab 切换 list（使用 tab-change 事件，在值更新后触发）
const handleTabChange = () => {
  // 标签页切换：
  // 1、最近文档 - 查询全部数据（不传 tabType）
  // 2、审核列表 - 传递 tabType='review'
  // 3、文档发布 - 传递 tabType='publish'
  queryParams.pageNo = 1 // 切换时重置页码
  getList()
}

// 选择变化
const handleSelectionChange = (val: PerformanceApi.TrainingPerformanceVO[]) => {
  selectedRows.value = val
  console.log('选择变化:', val)
}

// 写作
const handleEdit = async (row: any) => {
  console.log('写作:', row)

  // 创建 loading 实例
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在校验权限...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    // 1. 获取或创建协作用户
    const collaborationUser = collaborationUserStore.getOrCreateUser()
    const userId = collaborationUser.id
    console.log('协作用户:', collaborationUser.name, `(${userId})`)

    // 2. 调用权限校验接口
    console.log('调用权限校验接口, id:', row.id, 'userId:', userId)
    const checkData: PerformanceApi.checkWriteData = { id: row.id, userId: userId as string } // 权限校验请求数据
    const permResult = await PerformanceApi.checkWritePermission(
      checkData as PerformanceApi.checkWriteData
    )
    console.log('权限校验结果:', permResult)

    // 3. 检查权限 - status=500 或 data=false 表示无权限
    if (permResult.status === 500 || permResult.data === false) {
      ElMessage.error('您没有该文档的写作权限')
      ElMessage.error(permResult.msg)
      return
    }

    // 4. 权限通过，获取文件流
    loadingInstance.setText('正在加载文档内容...')
    console.log('调用文件流接口, id:', row.id)
    const streamResult = await PerformanceApi.getFileStream(row.id)
    console.log('文件流结果:', streamResult, 'instanceof Blob:', streamResult instanceof Blob)

    // 5. 处理文件流数据
    let hasContent = false
    if (streamResult && streamResult.size > 0) {
      console.log('文件流有效, size:', streamResult.size, 'type:', streamResult.type)
      // 将 blob 转为 base64 存储到 IndexedDB（避免 sessionStorage 配额限制）
      const base64Content = await blobToBase64(streamResult)
      console.log(
        'base64 转换完成, 长度:',
        base64Content.length,
        '前100字符:',
        base64Content.substring(0, 100)
      )
      await saveDocContent(row.id, base64Content)
      hasContent = true
      console.log('文件流已存储到 IndexedDB, key:', `doc_content_${row.id}`)
    } else {
      console.warn('文件流为空或无效:', streamResult)
    }

    // 6. 准备文档信息并存储到 sessionStorage
    const documentInfo = {
      id: String(row.id),
      title: row.planName,
      content: '',
      createTime: row.createTime || new Date().toISOString(),
      updateTime: row.createTime || new Date().toISOString(),
      version: 'V1.0',
      tags: row.fileType ? [row.fileType] : [],
      creatorId: 0,
      creatorName: row.createBy || '未知'
    }
    sessionStorage.setItem(`doc_info_${row.id}`, JSON.stringify(documentInfo))

    // 7. 跳转编辑器
    router.push({
      name: 'DocumentEdit',
      params: { id: row.id },
      query: {
        title: row.planName, // 传递方案名称作为标题
        hasContent: hasContent ? 'true' : 'false'
      }
    })
  } catch (error) {
    console.error('写作权限校验失败:', error)
    ElMessage.error('操作失败，请稍后重试')
  } finally {
    loadingInstance.close()
  }
}

// 审核弹窗相关
const auditDialogVisible = ref(false)
const auditLoading = ref(false)
const currentAuditRow = ref<PerformanceApi.TrainingPerformanceVO>()

// 审核流程列表数据（传递给 AuditFlowDialog 组件）
const auditFlowList = [
  {
    flowId: 'flow1',
    flowName: '演训筹划文档审批流1',
    nodes: [
      { nodeId: 'node1', nodeName: '节点1', users: [] as string[] },
      { nodeId: 'node2', nodeName: '节点2', users: ['user1', 'user2'] },
      { nodeId: 'node3', nodeName: '节点3', users: ['user5'] },
      { nodeId: 'node4', nodeName: '节点4', users: ['user4'] }
    ]
  },
  {
    flowId: 'flow2',
    flowName: '演训筹划文档审批流2',
    nodes: [
      { nodeId: 'node1', nodeName: '节点1', users: [] as string[] },
      { nodeId: 'node2', nodeName: '节点2', users: [] as string[] }
    ]
  }
]

// 打开审核弹窗
const openAuditDialog = (row: PerformanceApi.TrainingPerformanceVO) => {
  currentAuditRow.value = row
  auditDialogVisible.value = true
}

// 确认审核（接收来自 AuditFlowDialog 组件的数据）
const handleAuditSubmit = async (submitData: {
  id: string
  flowId: string
  auditors: Record<string, string[]>
  comment: string
}) => {
  auditLoading.value = true
  try {
    console.log('提交审核参数:', submitData)
    // 转换为符合 API 类型的数据
    const apiData = {
      ...submitData,
      id: submitData.id
    }
    const result = await PerformanceApi.submitAudit(apiData)
    console.log('提交审核结果:', result)

    // 处理响应 - 兼容两种格式
    if (isObject(result) && !isNil(result)) {
      const res = result as { code?: number; msg?: string }
      if (res.code === 200 || res.code === 0) {
        ElMessage.success(res.msg || '提交审核成功')
        auditDialogVisible.value = false
        getList()
      } else {
        ElMessage.error(res.msg || '提交审核失败')
      }
    } else {
      // 直接成功
      ElMessage.success('提交审核成功')
      auditDialogVisible.value = false
      getList()
    }
  } catch (error: any) {
    console.error('提交审核失败:', error)
    ElMessage.error(error.message || '提交审核失败')
  } finally {
    auditLoading.value = false
  }
}

// 发布弹窗相关
const publishDialogVisible = ref(false)
const publishLoading = ref(false)
const currentPublishRow = ref<PerformanceApi.TrainingPerformanceVO>()
const publishDialogRef = ref()

// 打开发布弹窗
const openPublishDialog = (row: PerformanceApi.TrainingPerformanceVO) => {
  currentPublishRow.value = row
  publishDialogVisible.value = true
  nextTick(() => {
    publishDialogRef.value?.setDefaultScope(['user1', 'user2', 'user3'])
  })
}

// 确认发布（来自 PublishDialog 组件）
const handlePublishDialogSubmit = async (visibleScope: string[]) => {
  if (isNil(currentPublishRow.value?.id)) return
  console.log('发布参数:', currentPublishRow.value.id, visibleScope)
  publishLoading.value = true
  try {
    const result = await PerformanceApi.publishDocument({
      id: currentPublishRow.value.id,
      visibleScope: visibleScope
    })
    console.log('发布结果:', result)

    // 处理响应 - 兼容两种格式
    if (isObject(result) && !isNil(result)) {
      const res = result as { code?: number; msg?: string }
      if (res.code === 200 || res.code === 0) {
        ElMessage.success(res.msg || '发布成功')
        publishDialogVisible.value = false
        getList()
      } else {
        ElMessage.error(res.msg || '发布失败')
      }
    } else {
      // 直接成功
      ElMessage.success('发布成功')
      publishDialogVisible.value = false
      getList()
    }
  } catch (error: any) {
    console.error('发布失败:', error)
    ElMessage.error(error.message || '发布失败')
  } finally {
    publishLoading.value = false
  }
}

// 预览弹窗相关
const previewDialogVisible = ref(false)
const previewContent = ref('')
const previewTitle = ref('')

// 预览功能
const handlePreview = async (row: PerformanceApi.TrainingPerformanceVO) => {
  if (!row.id) {
    ElMessage.warning('文档ID不存在')
    return
  }

  const loadingInstance = ElLoading.service({
    text: '加载文档中...',
    background: 'rgba(255, 255, 255, 0.7)'
  })

  try {
    const blob = await PerformanceApi.getFileStream(row.id)
    if (!blob) {
      ElMessage.warning('文档内容为空')
      return
    }

    // 读取 Blob 内容为文本
    const text = await blob.text()

    // 使用 markdown-it 解析 Markdown 为 HTML
    const md = new MarkdownIt()
    const htmlContent = md.render(text)
    previewContent.value = htmlContent
    previewTitle.value = row.planName || '文档预览'
    previewDialogVisible.value = true
  } catch (error) {
    console.error('预览失败:', error)
    ElMessage.error('预览失败，请稍后重试')
  } finally {
    loadingInstance.close()
  }
}

// 导出功能（导出为 docx 格式）
const handleExport = async (row: PerformanceApi.TrainingPerformanceVO) => {
  if (!row.id) {
    ElMessage.warning('文档ID不存在')
    return
  }

  const loadingInstance = ElLoading.service({
    text: '导出文档中...',
    background: 'rgba(255, 255, 255, 0.7)'
  })

  try {
    const blob = await PerformanceApi.getFileStream(row.id)
    if (!blob) {
      ElMessage.warning('文档内容为空')
      return
    }

    // 使用 blobToText 读取内容（防止中文乱码）
    const markdownText = await blobToText(blob)

    // 使用 markdown-it 将 markdown 转换为 HTML
    const md = new MarkdownIt()
    const htmlContent = md.render(markdownText)

    // 使用 htmlToDocx 将 HTML 转换为 docx Blob
    const docxBlob = await htmlToDocx(htmlContent, row.planName || '文档')

    // 创建下载链接
    const url = window.URL.createObjectURL(docxBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${row.planName || '文档'}.docx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请稍后重试')
  } finally {
    loadingInstance.close()
  }
}

// 审核记录弹窗相关
const examRecordDialogVisible = ref(false)
const examRecordLoading = ref(false)
const examRecordList = ref<PerformanceApi.ExamRecordVO[]>([])

// 打开审核记录弹窗
const openExamRecordDialog = async (row: PerformanceApi.TrainingPerformanceVO) => {
  if (!row.id) return
  examRecordDialogVisible.value = true
  examRecordLoading.value = true
  examRecordList.value = []

  try {
    const res = await PerformanceApi.getExamRecordList(row.id)
    examRecordList.value = res.data || []
  } catch (error) {
    console.error('获取审核记录失败:', error)
    ElMessage.error('获取审核记录失败')
  } finally {
    examRecordLoading.value = false
  }
}

// 驳回弹窗相关
const rejectDialogVisible = ref(false)
const rejectLoading = ref(false)
const currentRejectRow = ref<PerformanceApi.TrainingPerformanceVO>()
const rejectDialogRef = ref()

// 提交驳回（来自 RejectDialog 组件）
const handleRejectDialogSubmit = async (reason: string) => {
  if (isEmpty(reason.trim())) {
    ElMessage.warning('请输入驳回原因')
    return
  }

  if (isNil(currentRejectRow.value?.id)) return

  rejectLoading.value = true
  try {
    // 获取当前用户ID
    const collaborationUser = collaborationUserStore.getOrCreateUser()
    const userId = collaborationUser.id || 'admin'

    await PerformanceApi.examApply({
      applyId: currentRejectRow.value.id,
      examResult: '2', // 驳回
      examOpinion: reason,
      examUserId: userId
    })
    ElMessage.success('驳回成功')
    rejectDialogVisible.value = false
    rejectDialogRef.value?.reset()
    getList()
  } catch (error) {
    console.error('驳回失败:', error)
    ElMessage.error('驳回失败')
  } finally {
    rejectLoading.value = false
  }
}

// 审核 - 跳转到编辑器（只读模式）
const handleReviewExecute = async (row: PerformanceApi.TrainingPerformanceVO) => {
  console.log('审核:', row)

  // 创建 loading 实例
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在加载文档...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    // 获取文件流
    loadingInstance.setText('正在加载文档内容...')
    const streamResult = await PerformanceApi.getFileStream(row.id!)

    // 处理文件流数据（使用 IndexedDB 避免 sessionStorage 配额限制）
    let hasContent = false
    if (streamResult && streamResult.size > 0) {
      const base64Content = await blobToBase64(streamResult)
      await saveDocContent(row.id!, base64Content)
      hasContent = true
    }

    // 准备文档信息
    const documentInfo = {
      id: String(row.id),
      title: row.planName,
      content: '',
      createTime: row.createTime || new Date().toISOString(),
      updateTime: row.createTime || new Date().toISOString(),
      version: 'V1.0',
      tags: row.fileType ? [row.fileType] : [],
      creatorId: 0,
      creatorName: row.createBy || '未知'
    }
    sessionStorage.setItem(`doc_info_${row.id}`, JSON.stringify(documentInfo))

    // 跳转编辑器（只读审核模式）
    router.push({
      name: 'DocumentEdit',
      params: { id: row.id },
      query: {
        title: row.planName,
        hasContent: hasContent ? 'true' : 'false',
        readonly: 'true', // 只读模式
        reviewMode: 'true' // 审核模式
      }
    })
  } catch (error) {
    console.error('加载文档失败:', error)
    ElMessage.error('加载失败，请稍后重试')
  } finally {
    loadingInstance.close()
  }
}

// 删除（单个）
const handleDelete = async (row: PerformanceApi.TrainingPerformanceVO) => {
  if (isNil(row.id)) {
    ElMessage.error('无效的数据ID')
    return
  }

  try {
    await ElMessageBox.confirm('确认要删除该方案吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await PerformanceApi.deleteTrainingPerformance(row.id)
    ElMessage.success('删除成功')
    getList()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 批量删除
const handleBatchDelete = async () => {
  if (isEmpty(selectedRows.value)) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  // 检查是否所有选中的数据都是"编辑中"(1)或"驳回"(5)状态
  const notEditingRows = filter(
    selectedRows.value,
    (row) => row.applyNode !== '1' && row.applyNode !== '5'
  )
  if (!isEmpty(notEditingRows)) {
    ElMessage.warning('只能删除"编辑中"或"驳回"状态的数据，请重新选择')
    return
  }

  try {
    await ElMessageBox.confirm(`确认要删除选中的 ${selectedRows.value.length} 条数据吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const ids = filter(
      map(selectedRows.value, (item) => item.id),
      (id): id is string => !isNil(id) && !isEmpty(id)
    )
    if (isEmpty(ids) || ids.length === 0) {
      ElMessage.error('无效的数据ID')
      return
    }

    await PerformanceApi.deleteTrainingPerformance(ids)
    ElMessage.success(`成功删除 ${ids.length} 条数据`)
    selectedRows.value = []
    getList()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 标签转换函数
const getCollegeLabel = (code?: string) => {
  if (!code) return ''
  const option = collegeOptions.find((item) => item.value === code)
  return option?.label || code
}

const getFileTypeLabel = (fileType?: string) => {
  if (!fileType) return ''
  const category = categories.value.find(
    (item) => item.label === fileType || item.value === fileType
  )
  return category?.label || fileType
}

const getLevelLabel = (level?: string) => {
  if (!level) return ''
  const option = levelOptions.find((item) => item.value === level)
  return option?.label || level
}

// const getExerciseThemeLabel = (theme?: string) => {
//   if (!theme) return ''
//   const option = exerciseThemeOptions.find((item) => item.value === theme)
//   return option?.label || theme
// }

const getExerciseTypeLabel = (type?: string) => {
  if (!type) return ''
  const option = exerciseTypeOptions.find((item) => item.value === type)
  return option?.label || type
}

// 审核状态文本映射（编辑中:1、审核中:2、审核通过:3、发布:4、驳回:5）
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

// 状态样式（编辑中:1、审核中:2、审核通过:3、发布:4、驳回:5）
const getStatusClass = (status?: string) => {
  switch (status) {
    case '1': // 编辑中
      return 'bg-red-500'
    case '2': // 审核中
      return 'bg-orange-500'
    case '3': // 审核通过
      return 'bg-green-500'
    case '4': // 发布
      return 'bg-blue-500'
    case '5': // 驳回
      return 'bg-gray-400'
    default:
      return 'bg-gray-500'
  }
}

// 页面初始化
onMounted(() => {
  getCategories() // 获取文档分类
  getList() // 获取表格数据
})

// 页面销毁时清理
onUnmounted(() => {
  // 清理选中状态，避免内存泄漏
  selectedRows.value = []
  list.value = []
  categories.value = []
})
</script>
<style scoped lang="scss">
.performance-container {
  height: calc(100vh - 90px); // 减去头部和标签栏高度
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.category-wrap {
  height: 100%;
  :deep(.el-card__body) {
    height: 100%;
    padding: 0;
  }
}

.category-menu {
  border-right: none !important;
}

.table-container-wrap {
  margin: 0;
  :deep(.el-card__body) {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;
  }
}

:deep(.el-menu-item) {
  height: 40px;
  line-height: 40px;
  margin-bottom: 4px;
  border-radius: 4px;
}

:deep(.el-menu-item.is-active) {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
</style>
