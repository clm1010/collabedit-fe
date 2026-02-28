<template>
  <div class="performance-container">
    <el-row :gutter="20" class="h-full">
      <el-col :span="24" :xs="24" class="h-full">
        <div class="h-full flex flex-col">
          <PerformanceSearch
            ref="searchRef"
            v-model="queryParams"
            :categories="categories"
            @search="handleQuery"
            @reset="resetQuery"
          />

          <ContentWrap class="flex-1 overflow-hidden mt-4 table-container-wrap">
            <div class="h-full flex flex-col p-4">
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

              <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="flex-shrink-0">
                <el-tab-pane label="最近文档" name="recent" />
                <el-tab-pane label="审核列表" name="review" />
                <el-tab-pane label="文档发布" name="publish" />
              </el-tabs>

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

  <PerformanceForm
    ref="performanceFormRef"
    v-model:visible="dialogVisible"
    :is-edit-mode="isEditMode"
    :loading="loading"
    :file-type-options="fileTypeOptions"
    @save="handleFormSave"
    @open-drill-selector="openDrillSelector"
  />

  <DrillSelector v-model:visible="drillSelectorVisible" @select="handleDrillSelect" />

  <AuditFlowDialog
    v-model="auditDialogVisible"
    :document-id="currentAuditRow?.id || 0"
    :flow-list="auditFlowList"
    :user-options="userOptions"
    :loading="auditLoading"
    @submit="handleAuditSubmit"
  />

  <PublishDialog
    ref="publishDialogRef"
    v-model:visible="publishDialogVisible"
    :loading="publishLoading"
    :user-options="userOptions"
    @submit="handlePublishDialogSubmit"
  />

  <RejectDialog
    ref="rejectDialogRef"
    v-model:visible="rejectDialogVisible"
    :loading="rejectLoading"
    @submit="handleRejectDialogSubmit"
  />

  <ExamRecordDialog
    v-model:visible="examRecordDialogVisible"
    :loading="examRecordLoading"
    :record-list="examRecordList"
  />

  <DocumentPreviewDialog
    v-model:visible="previewDialogVisible"
    :content="previewContent"
    :title="previewTitle"
  />
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, onActivated, nextTick, computed, onUnmounted } from 'vue'
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
import { useDocBufferStore } from '@/store/modules/docBuffer'
import { blobToText } from '@/views/utils/fileUtils'
import { logger } from '@/views/utils/logger'
import { parseFileContent } from '@/views/training/document/utils/wordParser'
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
const categories = ref<PerformanceApi.DocCategoryVO[]>([])
const selectedRows = ref<PerformanceApi.TrainingPerformanceVO[]>([])

// 只有选中的数据都是"编辑中"(1)或"驳回"(5)状态才能批量删除
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
  fileType: undefined,
  exerciseType: undefined,
  level: undefined,
  docType: undefined
})

const searchRef = ref()

const getList = async () => {
  loading.value = true
  try {
    const params = pickBy(queryParams, (value) => {
      if (isArray(value)) return !isEmpty(value)
      return !isNil(value) && value !== ''
    }) as Record<string, any>

    // createTime 数组转换为 '2025-10-10,2025-12-12' 格式
    if (isArray(params.createTime) && params.createTime.length === 2) {
      params.createTime = params.createTime.join(',')
    }

    params.tabType =
      activeTab.value === 'review' ? 'review' : activeTab.value === 'publish' ? 'publish' : 'recent'

    logger.debug('查询参数:', params)
    const data = await PerformanceApi.getPageList(params as any)
    list.value = data.records || data || []
    total.value = data.total || 0
  } catch (error) {
    logger.error('获取数据失败:', error)
    ElMessage.error('获取数据失败，请确保后端服务已启动')
  } finally {
    loading.value = false
  }
}

const getCategories = async () => {
  try {
    const res = await PerformanceApi.getDocCategories()
    categories.value = res.withAll || []
  } catch (error) {
    logger.error('获取分类失败:', error)
    ElMessage.error('获取文档分类失败，请确保后端服务已启动')
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  searchRef.value?.resetFields()
  queryParams.fileType = undefined
  activeTab.value = 'recent'
  handleQuery()
}

const dialogVisible = ref(false)
const isEditMode = ref(false)
const currentEditId = ref<string | null>(null)
const performanceFormRef = ref()

const fileTypeOptions = computed(() => {
  const filtered = filter(categories.value, (item) => item.value !== '0')
  return map(filtered, (item) => ({
    label: item.label,
    value: item.value
  }))
})

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

// 模拟用户列表
const userOptions = [
  { label: 'user1', value: 'user1' },
  { label: 'user2', value: 'user2' },
  { label: 'user3', value: 'user3' },
  { label: 'user4', value: 'user4' },
  { label: 'user5', value: 'user5' }
]

const drillSelectorVisible = ref(false)

const openDrillSelector = () => {
  drillSelectorVisible.value = true
}

const handleDrillSelect = (row: any) => {
  if (!row) return
  performanceFormRef.value?.setDrillData(row)
  drillSelectorVisible.value = false
}

const handleAdd = () => {
  isEditMode.value = false
  currentEditId.value = null
  dialogVisible.value = true
  nextTick(() => {
    performanceFormRef.value?.resetForm()
  })
}

const handleEditData = (row: PerformanceApi.TrainingPerformanceVO) => {
  isEditMode.value = true
  currentEditId.value = row.id || null
  dialogVisible.value = true

  nextTick(() => {
    performanceFormRef.value?.setFormData({
      id: row.id || '',
      planId: row.planId || '',
      exerciseName: row.exerciseName || '',
      planName: row.planName || '',
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

const handleFormSave = async (formData: any, uploadFile: File | null) => {
  try {
    // 只有新建模式且选择上传文档时，才验证是否已选择文件
    if (!isEditMode.value && formData.creationMethod === 'upload' && !uploadFile) {
      ElMessage.warning('请选择要上传的文件')
      return
    }

    loading.value = true

    const fileType = formData.fileType || ''
    logger.debug(fileType, 'fileType------')

    if (isEditMode.value) {
      const editData: any = {
        id: currentEditId.value,
        planId: formData.planId,
        exerciseName: formData.exerciseName,
        planName: formData.planName,
        exerciseType: formData.exerciseType,
        level: formData.level,
        fileType: fileType,
        collegeCode: formData.collegeCode,
        description: formData.description,
        activeUser: formData.activeUser.join(',')
      }
      logger.debug(editData, 'editData（编辑）------')
      await PerformanceApi.updatePerformanceData(editData)
      ElMessage.success('更新成功')
      dialogVisible.value = false
      getList()
      return
    }

    const saveData: PerformanceApi.TrainingPerformanceVO = {
      planId: formData.planId,
      exerciseName: formData.exerciseName,
      planName: formData.planName,
      exerciseType: formData.exerciseType,
      level: formData.level,
      fileType: fileType,
      collegeCode: formData.collegeCode,
      description: formData.description,
      activeUser: formData.activeUser.join(',')
    }

    if (formData.creationMethod === 'upload') {
      logger.debug('上传文档文件:', uploadFile!.name)
      const uploadResult = await PerformanceApi.uploadDocument({
        file: uploadFile!
      })
      logger.debug('上传结果:', uploadResult, typeof uploadResult)

      // 兼容两种响应格式
      let fileId: string | null = null

      if (isString(uploadResult)) {
        // axios 封装解包后直接返回了 data 值
        fileId = uploadResult
        logger.debug('上传成功(解包响应), 文件ID:', fileId)
      } else if (isObject(uploadResult)) {
        // 完整响应对象
        const result = uploadResult as { code?: number; data?: string; msg?: string }
        if (result.code === 200 || result.code === 0) {
          fileId = result.data || null
          logger.debug('上传成功(完整响应), 文件ID:', fileId)
        } else {
          ElMessage.error(result.msg || '上传文档失败')
          return
        }
      }

      if (isEmpty(fileId)) {
        ElMessage.error('上传文档失败：未获取到文件ID')
        return
      }

      saveData.fileId = fileId as string
      logger.debug(saveData, 'saveData（上传文档）------')
      await PerformanceApi.createNewData(saveData)
      ElMessage.success('创建成功')
    } else {
      logger.debug(saveData, 'saveData（新建文档）------')
      await PerformanceApi.createNewData(saveData)
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    getList()
  } catch (error: any) {
    if (error !== false) {
      // 不是验证失败
      logger.error('保存失败:', error)
      ElMessage.error(error.message || '保存失败')
    }
  } finally {
    loading.value = false
  }
}

const handleTabChange = () => {
  // 标签页切换：
  // 1、最近文档 - 查询全部数据（不传 tabType）
  // 2、审核列表 - 传递 tabType='review'
  // 3、文档发布 - 传递 tabType='publish'
  queryParams.pageNo = 1
  getList()
}

const handleSelectionChange = (val: PerformanceApi.TrainingPerformanceVO[]) => {
  selectedRows.value = val
  logger.debug('选择变化:', val)
}

const handleEdit = async (row: any) => {
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在校验权限...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    const collaborationUser = collaborationUserStore.getOrCreateUser()
    const permResult = await PerformanceApi.checkWritePermission({
      id: row.id,
      userId: collaborationUser.id as string
    })

    if (permResult.status === 500 || permResult.data === false) {
      ElMessage.error('您没有该文档的写作权限')
      ElMessage.error(permResult.msg)
      return
    }

    loadingInstance.setText('正在加载文档内容...')
    const streamResult = await PerformanceApi.getFileStream(row.id)

    let hasContent = false
    if (streamResult && streamResult.size > 0) {
      const docBufferStore = useDocBufferStore()
      const arrayBuffer = await streamResult.arrayBuffer()
      docBufferStore.setBuffer(String(row.id), arrayBuffer)
      hasContent = true
      logger.debug('文件流已存入内存 Store, size:', arrayBuffer.byteLength)
    } else {
      logger.warn('文件流为空或无效')
    }

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

    router.push({
      name: 'DocumentEdit',
      params: { id: row.id },
      query: {
        title: row.planName,
        hasContent: hasContent ? 'true' : 'false'
      }
    })
  } catch (error) {
    logger.error('写作权限校验失败:', error)
    ElMessage.error('操作失败，请稍后重试')
  } finally {
    loadingInstance.close()
  }
}

const auditDialogVisible = ref(false)
const auditLoading = ref(false)
const currentAuditRow = ref<PerformanceApi.TrainingPerformanceVO>()

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

const openAuditDialog = (row: PerformanceApi.TrainingPerformanceVO) => {
  currentAuditRow.value = row
  auditDialogVisible.value = true
}

const handleAuditSubmit = async (submitData: {
  id: string
  flowId: string
  auditors: Record<string, string[]>
  comment: string
}) => {
  auditLoading.value = true
  try {
    logger.debug('提交审核参数:', submitData)
    const apiData = {
      ...submitData,
      id: submitData.id
    }
    const result = await PerformanceApi.submitAudit(apiData)
    logger.debug('提交审核结果:', result)

    // 兼容两种响应格式
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
      ElMessage.success('提交审核成功')
      auditDialogVisible.value = false
      getList()
    }
  } catch (error: any) {
    logger.error('提交审核失败:', error)
    ElMessage.error(error.message || '提交审核失败')
  } finally {
    auditLoading.value = false
  }
}

const publishDialogVisible = ref(false)
const publishLoading = ref(false)
const currentPublishRow = ref<PerformanceApi.TrainingPerformanceVO>()
const publishDialogRef = ref()

const openPublishDialog = (row: PerformanceApi.TrainingPerformanceVO) => {
  currentPublishRow.value = row
  publishDialogVisible.value = true
  nextTick(() => {
    publishDialogRef.value?.setDefaultScope(['user1', 'user2', 'user3'])
  })
}

const handlePublishDialogSubmit = async (visibleScope: string[]) => {
  if (isNil(currentPublishRow.value?.id)) return
  logger.debug('发布参数:', currentPublishRow.value.id, visibleScope)
  publishLoading.value = true
  try {
    const result = await PerformanceApi.publishDocument({
      id: currentPublishRow.value.id,
      visibleScope: visibleScope
    })
    logger.debug('发布结果:', result)

    // 兼容两种响应格式
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
      ElMessage.success('发布成功')
      publishDialogVisible.value = false
      getList()
    }
  } catch (error: any) {
    logger.error('发布失败:', error)
    ElMessage.error(error.message || '发布失败')
  } finally {
    publishLoading.value = false
  }
}

const previewDialogVisible = ref(false)
const previewContent = ref('')
const previewTitle = ref('')

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

    // 判断是否为 Word 文档（docx/doc）
    const mimeType = blob.type || ''
    let isWordDoc =
      mimeType.includes('application/vnd.openxmlformats') || mimeType.includes('application/msword')

    if (!isWordDoc) {
      // 通过文件头判断是否为 docx（ZIP: PK）
      const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
      isWordDoc = header[0] === 0x50 && header[1] === 0x4b
    }

    if (isWordDoc) {
      // Word 文档：直接转 ArrayBuffer 解析为 HTML
      const arrayBuffer = await blob.arrayBuffer()
      const htmlContent = await parseFileContent(arrayBuffer)
      if (htmlContent) {
        previewContent.value = htmlContent
        previewTitle.value = row.planName || '文档预览'
        previewDialogVisible.value = true
        return
      }
      logger.warn('Word 解析失败，回退为文本预览')
    }

    const text = await blobToText(blob)
    const md = new MarkdownIt()
    const htmlContent = md.render(text)
    previewContent.value = htmlContent
    previewTitle.value = row.planName || '文档预览'
    previewDialogVisible.value = true
  } catch (error) {
    logger.error('预览失败:', error)
    ElMessage.error('预览失败，请稍后重试')
  } finally {
    loadingInstance.close()
  }
}

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

    const mimeType = blob.type || ''
    let isWordDoc =
      mimeType.includes('application/vnd.openxmlformats') || mimeType.includes('application/msword')

    if (!isWordDoc) {
      // 通过文件头判断是否为 docx（ZIP: PK）
      const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
      isWordDoc = header[0] === 0x50 && header[1] === 0x4b
    }

    let downloadBlob = blob
    let filename = `${row.planName || '文档'}.docx`

    if (!isWordDoc) {
      // 非 Word 文档：按 markdown 处理并导出为 docx
      const markdownText = await blobToText(blob)
      const md = new MarkdownIt()
      const htmlContent = md.render(markdownText)
      downloadBlob = await htmlToDocx(htmlContent, row.planName || '文档')
    }

    const url = window.URL.createObjectURL(downloadBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    logger.error('导出失败:', error)
    ElMessage.error('导出失败，请稍后重试')
  } finally {
    loadingInstance.close()
  }
}

const examRecordDialogVisible = ref(false)
const examRecordLoading = ref(false)
const examRecordList = ref<PerformanceApi.ExamRecordVO[]>([])

const openExamRecordDialog = async (row: PerformanceApi.TrainingPerformanceVO) => {
  if (!row.id) return
  examRecordDialogVisible.value = true
  examRecordLoading.value = true
  examRecordList.value = []

  try {
    const res = await PerformanceApi.getExamRecordList(row.id)
    // 兼容两种返回格式：数组或 { data: [...] }
    examRecordList.value = Array.isArray(res) ? res : (res.data || [])
  } catch (error) {
    logger.error('获取审核记录失败:', error)
    ElMessage.error('获取审核记录失败')
  } finally {
    examRecordLoading.value = false
  }
}

const rejectDialogVisible = ref(false)
const rejectLoading = ref(false)
const currentRejectRow = ref<PerformanceApi.TrainingPerformanceVO>()
const rejectDialogRef = ref()

const handleRejectDialogSubmit = async (reason: string) => {
  if (isEmpty(reason.trim())) {
    ElMessage.warning('请输入驳回原因')
    return
  }

  if (isNil(currentRejectRow.value?.id)) return

  rejectLoading.value = true
  try {
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
    logger.error('驳回失败:', error)
    ElMessage.error('驳回失败')
  } finally {
    rejectLoading.value = false
  }
}

const handleReviewExecute = async (row: PerformanceApi.TrainingPerformanceVO) => {
  logger.debug('审核:', row)

  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在加载文档...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    loadingInstance.setText('正在加载文档内容...')
    const streamResult = await PerformanceApi.getFileStream(row.id!)

    let hasContent = false
    if (streamResult && streamResult.size > 0) {
      const docBufferStore = useDocBufferStore()
      const arrayBuffer = await streamResult.arrayBuffer()
      docBufferStore.setBuffer(String(row.id!), arrayBuffer)
      hasContent = true
    }

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

    router.push({
      name: 'DocumentEdit',
      params: { id: row.id },
      query: {
        title: row.planName,
        hasContent: hasContent ? 'true' : 'false',
        readonly: 'true',
        reviewMode: 'true'
      }
    })
  } catch (error) {
    logger.error('加载文档失败:', error)
    ElMessage.error('加载失败，请稍后重试')
  } finally {
    loadingInstance.close()
  }
}

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

const handleBatchDelete = async () => {
  if (isEmpty(selectedRows.value)) {
    ElMessage.warning('请先选择要删除的数据')
    return
  }

  // 只能删除"编辑中"(1)或"驳回"(5)状态的数据
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

// 状态样式映射（编辑中:1、审核中:2、审核通过:3、发布:4、驳回:5）
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

onMounted(() => {
  getCategories()
  getList()
})

onActivated(() => {
  getList()
})

onUnmounted(() => {
  // 清理选中状态，避免内存泄漏
  selectedRows.value = []
  list.value = []
  categories.value = []
})
</script>
<style scoped lang="scss">
@use '@/lmStyles/dialog.scss';
@use '@/lmStyles/table.scss';
.performance-container {
  height: calc(100vh - 90px); // 减去头部和标签栏高度
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
</style>
