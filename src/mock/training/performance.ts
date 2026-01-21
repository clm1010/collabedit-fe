/**
 * 演训方案 Mock 数据和 API
 * 用于开发调试，可通过配置切换到 Java 后端
 */
import type {
  TrainingPerformanceVO,
  TrainingPerformancePageReqVO,
  SubmitAuditReqVO,
  PublishDocReqVO,
  RejectRecordVO,
  RejectReqVO,
  PermissionCheckResponse,
  checkWriteData,
  UploadDocumentData,
  ExamRecordVO,
  ExamApplyReqVO
} from '@/types/performance'
import {
  performanceCategories,
  ALL_CATEGORY,
  type DocCategoryVO
} from '@/views/training/performance/config/categories'

// ==================== Mock 数据 ====================

/**
 * 模拟延迟（模拟网络请求）
 */
const mockDelay = (ms: number = 300): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 生成模拟 ID
 */
let mockIdCounter: number = 100
const generateMockId = (): number => ++mockIdCounter

/**
 * 审核状态枚举（编辑中:1、审核中:2、审核通过:3、发布:4、驳回:5）
 */
const ApplyNode: Record<string, string> = {
  EDITING: '1', // 编辑中
  REVIEWING: '2', // 审核中
  APPROVED: '3', // 审核通过
  PUBLISHED: '4', // 发布
  REJECTED: '5' // 驳回
}

/**
 * 模拟演训方案数据列表
 */
const mockDataList: TrainingPerformanceVO[] = [
  {
    id: '1',
    planId: 'drill-001',
    exerciseName: '2024年度联合作战演练',
    planName: '联合作战演练筹划方案',
    collegeCode: 'LHZZXY',
    fileType: '演训方案',
    activeUser: 'admin,staff_a',
    description: '本方案用于指导2024年度联合作战演练的组织实施',
    level: 'ZLJ',
    exerciseType: 'LHL',
    // exerciseTheme: '联合作战',
    docType: 'docx',
    createBy: 'admin',
    applyNode: ApplyNode.EDITING, // 编辑中
    createTime: '2024-12-10 09:30:00',
    updateTime: '2024-12-12 14:20:00',
    delFlg: '0'
  },
  {
    id: '2',
    planId: 'drill-002',
    exerciseName: '战略级演训项目',
    planName: '战略级综合演练方案',
    collegeCode: 'GFDX',
    fileType: '作战计划',
    activeUser: 'staff_b',
    description: '战略级综合演练的总体方案设计',
    level: 'ZLJ',
    exerciseType: 'ZUOZL',
    // exerciseTheme: '战略演练',
    docType: 'docx',
    createBy: 'staff_b',
    applyNode: ApplyNode.REVIEWING, // 审核中
    createTime: '2024-12-08 10:00:00',
    updateTime: '2024-12-11 16:45:00',
    delFlg: '0'
  },
  {
    id: '3',
    planId: 'drill-003',
    exerciseName: '网络安全演练',
    planName: '网络攻防演练实施方案',
    collegeCode: 'GJAQXY',
    fileType: '导调计划',
    activeUser: 'admin',
    description: '网络空间安全攻防演练方案',
    level: 'YXJ',
    exerciseType: 'WLL',
    // exerciseTheme: '网络安全',
    docType: 'docx',
    createBy: 'admin',
    applyNode: ApplyNode.APPROVED, // 审核通过
    createTime: '2024-12-05 08:30:00',
    updateTime: '2024-12-10 11:20:00',
    delFlg: '0'
  },
  {
    id: '4',
    planId: 'drill-004',
    exerciseName: '后勤保障演练',
    planName: '联合勤务保障方案',
    collegeCode: 'LHQWXY',
    fileType: '作战文书',
    activeUser: 'staff_a,staff_b',
    description: '后勤保障体系综合演练方案',
    level: 'ZSJ',
    exerciseType: 'HZL',
    // exerciseTheme: '后勤保障',
    docType: 'docx',
    createBy: 'staff_a',
    applyNode: ApplyNode.PUBLISHED, // 发布
    createTime: '2024-12-01 14:00:00',
    updateTime: '2024-12-09 09:15:00',
    delFlg: '0'
  },
  {
    id: '5',
    planId: 'drill-005',
    exerciseName: '电磁频谱管控演练',
    planName: '电磁环境管控方案',
    collegeCode: 'SGLXY',
    fileType: '企图立案',
    activeUser: 'admin',
    description: '复杂电磁环境下的频谱管控方案',
    level: 'YXJ',
    exerciseType: 'DCL',
    // exerciseTheme: '电磁管控',
    docType: 'docx',
    createBy: 'admin',
    applyNode: ApplyNode.REJECTED, // 驳回
    createTime: '2024-11-28 11:30:00',
    updateTime: '2024-12-08 15:40:00',
    delFlg: '0'
  },
  {
    id: '6',
    planId: 'drill-006',
    exerciseName: '后勤保障演练',
    planName: '联合勤务保障方案',
    collegeCode: 'SGLXY',
    fileType: '作战文书',
    activeUser: 'staff_a,staff_b',
    description: '后勤保障体系综合演练方案',
    level: 'YXJ',
    exerciseType: 'HZL',
    // exerciseTheme: '后勤保障',
    docType: 'docx',
    createBy: 'staff_a',
    applyNode: ApplyNode.REVIEWING, // 审核中
    createTime: '2024-11-28 11:30:00',
    updateTime: '2024-12-08 15:40:00',
    delFlg: '0'
  },
  {
    id: '7',
    planId: 'drill-007',
    exerciseName: '太空作战演练',
    planName: '太空作战演练方案',
    collegeCode: 'SGLXY',
    fileType: '企图立案',
    activeUser: 'staff_a',
    description: '太空作战演练方案',
    level: 'YXJ', // 演训等级
    exerciseType: 'KZL', // 演训类型
    // exerciseTheme: '太空作战',
    docType: 'docx', // 文档类型
    createBy: 'staff_a', // 创建人
    applyNode: ApplyNode.REJECTED, // 驳回
    createTime: '2024-11-28 11:30:00',
    updateTime: '2024-12-08 15:40:00',
    delFlg: '0'
  }
]

/**
 * 模拟驳回历史记录
 */
const mockRejectHistory: Record<string, RejectRecordVO[]> = {
  5: [
    {
      rejectBy: '审核员A',
      rejectTime: '2024-12-08 15:40:00',
      reason: '方案描述不够详细，请补充具体实施步骤'
    }
  ]
}

/**
 * 模拟审核记录数据
 * 审核结果: 1通过 2驳回
 */
const mockExamRecordList: Record<string | string, ExamRecordVO[]> = {
  '2': [
    {
      id: 'exam-001',
      applyId: 'apply-001',
      examNode: '节点1',
      examResult: '1',
      examOpinion: '方案设计合理，同意通过',
      examOffice: 'office-001',
      examUserId: 'user1',
      nextUserId: 'user2',
      examOfficeName: '作战部',
      createTime: '2024-12-09 10:00:00'
    },
    {
      id: 'exam-002',
      applyId: 'apply-001',
      examNode: '节点2',
      examResult: '1',
      examOpinion: '内容完整，审核通过',
      examOffice: 'office-002',
      examUserId: 'user2',
      nextUserId: 'user3',
      examOfficeName: '训练部',
      createTime: '2024-12-10 14:30:00'
    }
  ],
  3: [
    {
      id: 'exam-003',
      applyId: 'apply-002',
      examNode: '节点1',
      examResult: '1',
      examOpinion: '审核通过',
      examOffice: 'office-001',
      examUserId: 'user1',
      nextUserId: 'user2',
      examOfficeName: '作战部',
      createTime: '2024-12-06 09:00:00'
    },
    {
      id: 'exam-004',
      applyId: 'apply-002',
      examNode: '节点2',
      examResult: '1',
      examOpinion: '同意',
      examOffice: 'office-002',
      examUserId: 'user2',
      nextUserId: '',
      examOfficeName: '训练部',
      createTime: '2024-12-07 11:00:00'
    }
  ],
  4: [
    {
      id: 'exam-005',
      applyId: 'apply-003',
      examNode: '节点1',
      examResult: '1',
      examOpinion: '审核通过',
      examOffice: 'office-001',
      examUserId: 'user1',
      nextUserId: 'user2',
      examOfficeName: '作战部',
      createTime: '2024-12-02 10:00:00'
    },
    {
      id: 'exam-006',
      applyId: 'apply-003',
      examNode: '节点2',
      examResult: '1',
      examOpinion: '方案可行，同意发布',
      examOffice: 'office-002',
      examUserId: 'user2',
      nextUserId: '',
      examOfficeName: '训练部',
      createTime: '2024-12-03 15:00:00'
    }
  ],
  6: [
    {
      id: 'exam-007',
      applyId: 'apply-004',
      examNode: '节点1',
      examResult: '1',
      examOpinion: '初审通过',
      examOffice: 'office-001',
      examUserId: 'user1',
      nextUserId: 'user2',
      examOfficeName: '作战部',
      createTime: '2024-12-06 16:00:00'
    }
  ]
}

// ==================== Mock API 实现 ====================

/**
 * 获取分页列表数据
 */
export const getPageList = async (params: TrainingPerformancePageReqVO) => {
  await mockDelay()

  let filteredList = [...mockDataList]

  // 按状态筛选
  if (params.applyNode) {
    filteredList = filteredList.filter((item) => item.applyNode === params.applyNode)
  }

  // 按方案名称筛选
  if (params.planName) {
    filteredList = filteredList.filter((item) =>
      item.planName.toLowerCase().includes(params.planName!.toLowerCase())
    )
  }

  // 按文档分类筛选
  if (params.fileType) {
    filteredList = filteredList.filter((item) => item.fileType === params.fileType)
  }

  // 按演训主题筛选
  // if (params.exerciseTheme) {
  //   filteredList = filteredList.filter((item) =>
  //     item.exerciseTheme?.toLowerCase().includes(params.exerciseTheme!.toLowerCase())
  //   )
  // }

  // 按演训类型筛选
  if (params.exerciseType) {
    filteredList = filteredList.filter((item) => item.exerciseType === params.exerciseType)
  }

  // 按演训等级筛选
  if (params.level) {
    filteredList = filteredList.filter((item) => item.level === params.level)
  }

  // 按标签页类型筛选
  // tabType=recent: 显示全部数据
  // tabType=review: 只显示审核中(2)和审核通过(3)
  // tabType=publish: 只显示发布(4)
  if (params.tabType === 'review') {
    filteredList = filteredList.filter((item) =>
      [ApplyNode.REVIEWING, ApplyNode.APPROVED].includes(item.applyNode || '')
    )
  } else if (params.tabType === 'publish') {
    filteredList = filteredList.filter((item) => item.applyNode === ApplyNode.PUBLISHED)
  }

  // 分页
  const pageNo = params.pageNo || 1
  const pageSize = params.pageSize || 10
  const startIndex = (pageNo - 1) * pageSize
  const endIndex = startIndex + pageSize
  const list = filteredList.slice(startIndex, endIndex)

  return {
    code: 200,
    data: {
      records: list,
      total: filteredList.length
    },
    msg: 'success'
  }
}

/**
 * 获取文档分类列表
 * 返回 data（原始数据）和 withAll（带"全部"选项的数据）
 */
export const getDocCategories = async (): Promise<{ data: DocCategoryVO[]; withAll: DocCategoryVO[] }> => {
  await mockDelay(100)
  return {
    data: performanceCategories,
    withAll: [ALL_CATEGORY, ...performanceCategories]
  }
}

/**
 * 新建筹划方案
 */
export const createNewData = async (data: TrainingPerformanceVO) => {
  await mockDelay()

  const newItem: TrainingPerformanceVO = {
    ...data,
    id: String(generateMockId()),
    applyNode: ApplyNode.EDITING, // 编辑中
    createTime: new Date().toLocaleString('zh-CN'),
    updateTime: new Date().toLocaleString('zh-CN'),
    delFlg: '0'
  }

  mockDataList.unshift(newItem)

  return {
    code: 200,
    data: newItem,
    msg: '创建成功'
  }
}

/**
 * 编辑演训方案数据
 */
export const updatePerformanceData = async (data: any) => {
  await mockDelay()

  const index = mockDataList.findIndex((item) => item.id === data.id)
  if (index !== -1) {
    mockDataList[index] = {
      ...mockDataList[index],
      ...data,
      updateTime: new Date().toLocaleString('zh-CN')
    }

    return {
      code: 200,
      data: mockDataList[index],
      msg: '更新成功'
    }
  }

  return {
    code: 500,
    data: null,
    msg: '数据不存在'
  }
}

/**
 * 删除演训方案
 */
export const deleteTrainingPerformance = async (ids: string | string[]) => {
  await mockDelay()

  const idsArray = Array.isArray(ids) ? ids : [ids]
  idsArray.forEach((id) => {
    const index = mockDataList.findIndex((item) => item.id === id)
    if (index !== -1) {
      mockDataList.splice(index, 1)
    }
  })

  return {
    code: 200,
    data: null,
    msg: '删除成功'
  }
}

/**
 * 提交审核
 * @param data { id: number, flowId: string, auditors: Record<string, string[]>, comment?: string }
 */
export const submitAudit = async (data: SubmitAuditReqVO) => {
  await mockDelay()

  const index = mockDataList.findIndex((item) => item.id === data.id)
  if (index !== -1) {
    mockDataList[index].applyNode = ApplyNode.REVIEWING // 审核中
    mockDataList[index].flowId = data.flowId
    mockDataList[index].updateTime = new Date().toLocaleString('zh-CN')

    return {
      code: 200,
      data: mockDataList[index],
      msg: '提交审核成功'
    }
  }

  return {
    code: 500,
    data: null,
    msg: '数据不存在'
  }
}

/**
 * 发布文档
 */
export const publishDocument = async (data: PublishDocReqVO) => {
  await mockDelay()

  const index = mockDataList.findIndex((item) => item.id === data.id)
  if (index !== -1) {
    mockDataList[index].applyNode = ApplyNode.PUBLISHED // 发布
    mockDataList[index].updateTime = new Date().toLocaleString('zh-CN')

    return {
      code: 200,
      data: mockDataList[index],
      msg: '发布成功'
    }
  }

  return {
    code: 500,
    data: null,
    msg: '数据不存在'
  }
}

/**
 * 写作权限校验
 */
export const checkWritePermission = async (
  data: checkWriteData
): Promise<PermissionCheckResponse> => {
  await mockDelay(100)

  // 模拟权限校验：admin 用户始终有权限
  const hasPermission = data.userId === 'admin' || Math.random() > 0.3

  return {
    code: 200,
    data: hasPermission,
    status: 200,
    msg: hasPermission ? '有编辑权限' : '无编辑权限'
  }
}

/**
 * 获取文档文件流
 */
export const getFileStream = async (_id: string): Promise<Blob | null> => {
  await mockDelay()

  // 模拟返回一个简单的文本文件
  const content = '这是模拟的文档内容\n\n用于开发测试。'
  return new Blob([content], { type: 'text/plain' })
}

/**
 * 上传文档文件
 */
export const uploadDocument = async (_data: UploadDocumentData) => {
  await mockDelay(500)

  return {
    code: 200,
    data: {
      fileId: `mock-file-${Date.now()}`
    },
    msg: '上传成功'
  }
}

/**
 * 获取驳回历史
 */
export const getRejectHistory = async (id: string): Promise<{ data: RejectRecordVO[] }> => {
  await mockDelay(100)
  return { data: mockRejectHistory[id] || [] }
}

/**
 * 驳回演训方案
 */
export const rejectTrainingPerformance = async (data: RejectReqVO) => {
  await mockDelay()

  const index = mockDataList.findIndex((item) => item.id === data.id)
  if (index !== -1) {
    mockDataList[index].applyNode = ApplyNode.REJECTED // 驳回
    mockDataList[index].updateTime = new Date().toLocaleString('zh-CN')

    // 添加驳回记录
    if (!mockRejectHistory[data.id]) {
      mockRejectHistory[data.id] = []
    }
    mockRejectHistory[data.id].push({
      rejectBy: data.rejectBy || '当前用户',
      rejectTime: new Date().toLocaleString('zh-CN'),
      reason: data.reason
    })

    return {
      code: 200,
      success: true,
      message: '驳回成功'
    }
  }

  return {
    code: 500,
    success: false,
    message: '数据不存在'
  }
}

/**
 * 导出演训方案
 */
export const exportTrainingPerformance = async (_params: TrainingPerformancePageReqVO) => {
  await mockDelay()
  return { data: mockDataList }
}

/**
 * 模拟演训数据列表（用于选择弹窗）
 */
const mockExerciseDataList = [
  {
    id: 'drill-001',
    exerciseName: '2024年度联合作战演练',
    supportUnit: '中央军委',
    organizer: '参谋部',
    exerciseType: 'LHL',
    level: 'ZLJ',
    participatingUnits: '陆海空联合部队',
    city: '北京',
    academy: 'GFDX',
    subject: '联合作战指挥',
    course: '现代战争理论',
    content: '多军种联合作战演练，涵盖陆海空天网电六大领域',
    relatedSystems: '指挥信息系统',
    implPlan: '分三阶段实施：筹划、演练、总结',
    groupingInfo: '红蓝双方对抗',
    keyClasses: '指挥班',
    participantCount: '5000',
    updater: '张三',
    startTime: '2024-01-01',
    endTime: '2024-01-15'
    // 用于表单回显
    // exerciseTheme: '联合作战'
  },
  {
    id: 'drill-002',
    exerciseName: '战略级综合演训项目',
    supportUnit: '总参谋部',
    organizer: '训练处',
    exerciseType: 'ZUOZL',
    level: 'ZLJ',
    participatingUnits: '装甲部队',
    city: '沈阳',
    academy: 'LHZZXY',
    subject: '装甲突击',
    course: '机械化作战',
    content: '装甲部队机动作战演练',
    relatedSystems: '战术通信系统',
    implPlan: '实战化演练',
    groupingInfo: '多个装甲营',
    keyClasses: '战术班',
    participantCount: '2000',
    updater: '李四',
    startTime: '2024-03-10',
    endTime: '2024-03-20'
    // exerciseTheme: '战略演练'
  },
  {
    id: 'drill-003',
    exerciseName: '网络安全攻防演练',
    supportUnit: '网络安全局',
    organizer: '作训科',
    exerciseType: 'WLL',
    level: 'ZSJ',
    participatingUnits: '网络部队',
    city: '上海',
    academy: 'GJAQXY',
    subject: '网络攻防',
    course: '信息安全',
    content: '网络空间安全攻防对抗演练',
    relatedSystems: '网络防护系统',
    implPlan: '红蓝对抗',
    groupingInfo: '攻防双方',
    keyClasses: '技术班',
    participantCount: '500',
    updater: '王五',
    startTime: '2024-04-05',
    endTime: '2024-04-12'
    // exerciseTheme: '网络安全'
  },
  {
    id: 'drill-004',
    exerciseName: '后勤保障综合演练',
    supportUnit: '后勤部',
    organizer: '网络部',
    exerciseType: 'HZL',
    level: 'ZSJ',
    participatingUnits: '后勤保障部队',
    city: '广州',
    academy: 'LHQWXY',
    subject: '后勤保障',
    course: '综合保障',
    content: '后勤保障体系综合演练',
    relatedSystems: '保障管理系统',
    implPlan: '全流程保障',
    groupingInfo: '多个保障分队',
    keyClasses: '保障班',
    participantCount: '1500',
    updater: '赵六',
    startTime: '2024-05-20',
    endTime: '2024-05-25'
    // exerciseTheme: '后勤保障'
  },
  {
    id: 'drill-005',
    exerciseName: '电磁频谱管控演练',
    supportUnit: '电子对抗部',
    organizer: '电子对抗处',
    exerciseType: 'DCL',
    level: 'ZLJ',
    participatingUnits: '电子对抗部队',
    city: '成都',
    academy: 'SGLXY',
    subject: '电磁管控',
    course: '电子对抗',
    content: '复杂电磁环境下的频谱管控演练',
    relatedSystems: '电子对抗系统',
    implPlan: '全频谱对抗',
    groupingInfo: '电子对抗分队',
    keyClasses: '对抗班',
    participantCount: '800',
    updater: '孙七',
    startTime: '2024-06-01',
    endTime: '2024-06-10'
    // exerciseTheme: '电磁管控'
  },
  {
    id: 'drill-006',
    exerciseName: '太空作战演练',
    supportUnit: '航天局',
    organizer: '作战部',
    exerciseType: 'KZL',
    level: 'ZLJ',
    participatingUnits: '航天部队',
    city: '西昌',
    academy: 'SGLXY',
    subject: '太空作战',
    course: '航天技术',
    content: '太空作战能力验证演练',
    relatedSystems: '航天测控系统',
    implPlan: '分阶段验证',
    groupingInfo: '航天作战单元',
    keyClasses: '航天班',
    participantCount: '600',
    updater: '周八',
    startTime: '2024-07-15',
    endTime: '2024-07-25'
    // exerciseTheme: '太空作战'
  },
  {
    id: 'drill-007',
    exerciseName: '海上联合演练',
    supportUnit: '海军司令部',
    organizer: '训练处',
    exerciseType: 'HHL',
    level: 'ZSJ',
    participatingUnits: '海军陆战队',
    city: '青岛',
    academy: 'GJFWXY',
    subject: '海上作战',
    course: '海战战术',
    content: '海上联合作战演练',
    relatedSystems: '海战指挥系统',
    implPlan: '海空协同',
    groupingInfo: '海上编队',
    keyClasses: '海战班',
    participantCount: '3000',
    updater: '吴九',
    startTime: '2024-08-10',
    endTime: '2024-08-20'
    // exerciseTheme: '海上作战'
  },
  {
    id: 'drill-008',
    exerciseName: '跨区机动演练',
    supportUnit: '陆军司令部',
    organizer: '训练处',
    exerciseType: 'ZUOZL',
    level: 'ZSJ',
    participatingUnits: '装甲旅',
    city: '兰州',
    academy: 'LHZZXY',
    subject: '机动作战',
    course: '快速反应',
    content: '远程机动和快速部署演练',
    relatedSystems: '机动指挥系统',
    implPlan: '快速机动',
    groupingInfo: '机动部队',
    keyClasses: '机动班',
    participantCount: '2500',
    updater: '郑十',
    startTime: '2024-09-05',
    endTime: '2024-09-15'
    // exerciseTheme: '机动作战'
  },
  {
    id: 'drill-009',
    exerciseName: '山地攻防演练',
    supportUnit: '西部战区',
    organizer: '作训科',
    exerciseType: 'ZUOZL',
    level: 'ZSJ',
    participatingUnits: '合成营',
    city: '昆明',
    academy: 'JSWHXY',
    subject: '山地作战',
    course: '复杂地形作战',
    content: '山地环境下的攻防作战演练',
    relatedSystems: '野战指挥系统',
    implPlan: '实地演练',
    groupingInfo: '山地作战单元',
    keyClasses: '山地班',
    participantCount: '1800',
    updater: '冯十一',
    startTime: '2024-10-01',
    endTime: '2024-10-10'
    // exerciseTheme: '山地作战'
  },
  {
    id: 'drill-010',
    exerciseName: '城市反恐演练',
    supportUnit: '武警总部',
    organizer: '特战处',
    exerciseType: 'ZUOZL',
    level: 'ZSJ',
    participatingUnits: '特战旅',
    city: '北京',
    academy: 'ZZXY',
    subject: '反恐作战',
    course: '特种作战',
    content: '城市环境反恐作战演练',
    relatedSystems: '反恐指挥系统',
    implPlan: '实战化演练',
    groupingInfo: '特战小组',
    keyClasses: '特战班',
    participantCount: '400',
    updater: '陈十二',
    startTime: '2024-11-15',
    endTime: '2024-11-20'
    // exerciseTheme: '反恐作战'
  }
]

/**
 * 获取演训数据列表（带分页）- 用于演训数据选择弹窗
 * POST /getPlan/getExerciseData
 * @param params { pageNo: 1, pageSize: 10 }
 */
export const getExerciseData = async (params: { pageNo?: number; pageSize?: number }) => {
  await mockDelay(200)

  const pageNo = params.pageNo || 1
  const pageSize = params.pageSize || 10
  const startIndex = (pageNo - 1) * pageSize
  const endIndex = startIndex + pageSize
  const list = mockExerciseDataList.slice(startIndex, endIndex)

  return {
    code: 200,
    data: {
      records: list,
      total: mockExerciseDataList.length
    },
    msg: 'success'
  }
}

/**
 * 获取审核记录列表
 * GET /examRecord/examApply
 * @param id 当前表格数据id
 */
export const getExamRecordList = async (id: string): Promise<{ data: ExamRecordVO[] }> => {
  await mockDelay(200)
  return { data: mockExamRecordList[id] || [] }
}

/**
 * 审核/驳回操作
 * POST /examRecord/examApply
 * @param data { apply, examResult, examOpinion, examuserId }
 */
export const examApply = async (data: ExamApplyReqVO) => {
  await mockDelay(300)

  // 查找对应数据
  const index = mockDataList.findIndex((item) => String(item.id) === String(data.applyId))
  if (index !== -1) {
    // 更新审核状态
    if (data.examResult === '1') {
      // 审核通过
      mockDataList[index].applyNode = ApplyNode.APPROVED
    } else if (data.examResult === '2') {
      // 驳回
      mockDataList[index].applyNode = ApplyNode.REJECTED
    }
    mockDataList[index].updateTime = new Date().toLocaleString('zh-CN')

    return {
      code: 200,
      data: mockDataList[index],
      msg: data.examResult === '1' ? '审核通过' : '驳回成功'
    }
  }

  return {
    code: 500,
    data: null,
    msg: '数据不存在'
  }
}

// 导出所有 Mock API
export default {
  getPageList,
  getDocCategories,
  createNewData,
  updatePerformanceData,
  deleteTrainingPerformance,
  submitAudit,
  publishDocument,
  checkWritePermission,
  getFileStream,
  uploadDocument,
  getRejectHistory,
  rejectTrainingPerformance,
  exportTrainingPerformance,
  getExerciseData,
  getExamRecordList,
  examApply
}
