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
  levelCategories,
  academyCategories,
  exerciseTypeCategories,
  cityCategories,
  type DocCategoryVO
} from '@/views/training/performance/config/categories'

const mockDelay = (ms: number = 300): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve, ms))

let mockIdCounter: number = 100
const generateMockId = (): number => ++mockIdCounter

const ApplyNode: Record<string, string> = {
  EDITING: '1',
  REVIEWING: '2',
  APPROVED: '3',
  PUBLISHED: '4',
  REJECTED: '5'
}

const mockDataList: TrainingPerformanceVO[] = [
  {
    id: '1',
    planId: 'drill-001',
    exerciseName: '2024年度联合作战演练',
    planName: '联合作战演练筹划方案',
    collegeCode: 'LHZZ',
    fileType: 'YXFA',
    activeUser: 'admin,staff_a',
    description: '本方案用于指导2024年度联合作战演练的组织实施',
    level: '3',
    exerciseType: '4',
    docType: 'docx',
    createBy: 'admin',
    applyNode: ApplyNode.EDITING,
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
    fileType: 'ZZJH',
    activeUser: 'staff_b',
    description: '战略级综合演练的总体方案设计',
    level: '3',
    exerciseType: '2',
    docType: 'docx',
    createBy: 'staff_b',
    applyNode: ApplyNode.REVIEWING,
    createTime: '2024-12-08 10:00:00',
    updateTime: '2024-12-11 16:45:00',
    delFlg: '0'
  },
  {
    id: '3',
    planId: 'drill-003',
    exerciseName: '网络安全演练',
    planName: '网络攻防演练实施方案',
    collegeCode: 'GJAQ',
    fileType: 'DDJH',
    activeUser: 'admin',
    description: '网络空间安全攻防演练方案',
    level: '2',
    exerciseType: '12',
    docType: 'docx',
    createBy: 'admin',
    applyNode: ApplyNode.APPROVED,
    createTime: '2024-12-05 08:30:00',
    updateTime: '2024-12-10 11:20:00',
    delFlg: '0'
  },
  {
    id: '4',
    planId: 'drill-004',
    exerciseName: '后勤保障演练',
    planName: '联合勤务保障方案',
    collegeCode: 'LHQW',
    fileType: 'ZZWS',
    activeUser: 'staff_a,staff_b',
    description: '后勤保障体系综合演练方案',
    level: '1',
    exerciseType: '10',
    docType: 'docx',
    createBy: 'staff_a',
    applyNode: ApplyNode.PUBLISHED,
    createTime: '2024-12-01 14:00:00',
    updateTime: '2024-12-09 09:15:00',
    delFlg: '0'
  },
  {
    id: '5',
    planId: 'drill-005',
    exerciseName: '电磁频谱管控演练',
    planName: '电磁环境管控方案',
    collegeCode: 'JSGL',
    fileType: 'QTLA',
    activeUser: 'admin',
    description: '复杂电磁环境下的频谱管控方案',
    level: '2',
    exerciseType: '13',
    docType: 'docx',
    createBy: 'admin',
    applyNode: ApplyNode.REJECTED,
    createTime: '2024-11-28 11:30:00',
    updateTime: '2024-12-08 15:40:00',
    delFlg: '0'
  },
  {
    id: '6',
    planId: 'drill-006',
    exerciseName: '后勤保障演练',
    planName: '联合勤务保障方案',
    collegeCode: 'JSGL',
    fileType: 'ZZWS',
    activeUser: 'staff_a,staff_b',
    description: '后勤保障体系综合演练方案',
    level: '2',
    exerciseType: '10',
    docType: 'docx',
    createBy: 'staff_a',
    applyNode: ApplyNode.REVIEWING,
    createTime: '2024-11-28 11:30:00',
    updateTime: '2024-12-08 15:40:00',
    delFlg: '0'
  },
  {
    id: '7',
    planId: 'drill-007',
    exerciseName: '太空作战演练',
    planName: '太空作战演练方案',
    collegeCode: 'JSGL',
    fileType: 'QTLA',
    activeUser: 'staff_a',
    description: '太空作战演练方案',
    level: '2',
    exerciseType: '14',
    docType: 'docx',
    createBy: 'staff_a',
    applyNode: ApplyNode.REJECTED,
    createTime: '2024-11-28 11:30:00',
    updateTime: '2024-12-08 15:40:00',
    delFlg: '0'
  }
]

const mockRejectHistory: Record<string, RejectRecordVO[]> = {
  5: [
    {
      rejectBy: '审核员A',
      rejectTime: '2024-12-08 15:40:00',
      reason: '方案描述不够详细，请补充具体实施步骤'
    }
  ]
}

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

export const getPageList = async (params: TrainingPerformancePageReqVO) => {
  await mockDelay()

  let filteredList = [...mockDataList]

  if (params.applyNode) {
    filteredList = filteredList.filter((item) => item.applyNode === params.applyNode)
  }

  if (params.planName) {
    filteredList = filteredList.filter((item) =>
      item.planName.toLowerCase().includes(params.planName!.toLowerCase())
    )
  }

  if (params.fileType) {
    filteredList = filteredList.filter((item) => item.fileType === params.fileType)
  }

  if (params.exerciseType) {
    filteredList = filteredList.filter((item) => item.exerciseType === params.exerciseType)
  }

  if (params.level) {
    filteredList = filteredList.filter((item) => item.level === params.level)
  }

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

export const getDocCategories = async (): Promise<{ data: DocCategoryVO[]; withAll: DocCategoryVO[] }> => {
  await mockDelay(100)
  return {
    data: performanceCategories,
    withAll: [ALL_CATEGORY, ...performanceCategories]
  }
}

export const getLevelOptions = async (): Promise<DocCategoryVO[]> => {
  await mockDelay(100)
  return levelCategories
}

export const getAcademyOptions = async (): Promise<DocCategoryVO[]> => {
  await mockDelay(100)
  return academyCategories
}

export const getExerciseTypeOptions = async (): Promise<DocCategoryVO[]> => {
  await mockDelay(100)
  return exerciseTypeCategories
}

export const getCityOptions = async (): Promise<DocCategoryVO[]> => {
  await mockDelay(100)
  return cityCategories
}

export const createNewData = async (data: TrainingPerformanceVO) => {
  await mockDelay()

  const newItem: TrainingPerformanceVO = {
    ...data,
    id: String(generateMockId()),
    applyNode: ApplyNode.EDITING,
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

export const submitAudit = async (data: SubmitAuditReqVO) => {
  await mockDelay()

  const index = mockDataList.findIndex((item) => item.id === data.id)
  if (index !== -1) {
    mockDataList[index].applyNode = ApplyNode.REVIEWING
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

export const publishDocument = async (data: PublishDocReqVO) => {
  await mockDelay()

  const index = mockDataList.findIndex((item) => item.id === data.id)
  if (index !== -1) {
    mockDataList[index].applyNode = ApplyNode.PUBLISHED
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

export const checkWritePermission = async (
  data: checkWriteData
): Promise<PermissionCheckResponse> => {
  await mockDelay(100)

  const hasPermission = data.userId === 'admin' || Math.random() > 0.3

  return {
    code: 200,
    data: hasPermission,
    status: 200,
    msg: hasPermission ? '有编辑权限' : '无编辑权限'
  }
}

export const getFileStream = async (_id: string): Promise<Blob | null> => {
  await mockDelay()

  const content = '这是模拟的文档内容\n\n用于开发测试。'
  return new Blob([content], { type: 'text/plain' })
}

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

export const getRejectHistory = async (id: string): Promise<{ data: RejectRecordVO[] }> => {
  await mockDelay(100)
  return { data: mockRejectHistory[id] || [] }
}

export const rejectTrainingPerformance = async (data: RejectReqVO) => {
  await mockDelay()

  const index = mockDataList.findIndex((item) => item.id === data.id)
  if (index !== -1) {
    mockDataList[index].applyNode = ApplyNode.REJECTED
    mockDataList[index].updateTime = new Date().toLocaleString('zh-CN')

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

export const exportTrainingPerformance = async (_params: TrainingPerformancePageReqVO) => {
  await mockDelay()
  return { data: mockDataList }
}

const mockExerciseDataList = [
  {
    id: 'drill-001',
    exerciseName: '2024年度联合作战演练',
    supportUnit: '中央军委',
    organizer: '参谋部',
    exerciseType: '4',
    level: '3',
    participatingUnits: '陆海空联合部队',
    city: 'BJ',
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
  },
  {
    id: 'drill-002',
    exerciseName: '战略级综合演训项目',
    supportUnit: '总参谋部',
    organizer: '训练处',
    exerciseType: '2',
    level: '3',
    participatingUnits: '装甲部队',
    city: 'BJ',
    academy: 'LHZZ',
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
  },
  {
    id: 'drill-003',
    exerciseName: '网络安全攻防演练',
    supportUnit: '网络安全局',
    organizer: '作训科',
    exerciseType: '12',
    level: '1',
    participatingUnits: '网络部队',
    city: 'SH',
    academy: 'GJAQ',
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
  },
  {
    id: 'drill-004',
    exerciseName: '后勤保障综合演练',
    supportUnit: '后勤部',
    organizer: '网络部',
    exerciseType: '10',
    level: '1',
    participatingUnits: '后勤保障部队',
    city: 'NJ',
    academy: 'LHQW',
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
  },
  {
    id: 'drill-005',
    exerciseName: '电磁频谱管控演练',
    supportUnit: '电子对抗部',
    organizer: '电子对抗处',
    exerciseType: '13',
    level: '3',
    participatingUnits: '电子对抗部队',
    city: 'XA',
    academy: 'JSGL',
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
  },
  {
    id: 'drill-006',
    exerciseName: '太空作战演练',
    supportUnit: '航天局',
    organizer: '作战部',
    exerciseType: '14',
    level: '3',
    participatingUnits: '航天部队',
    city: 'XA',
    academy: 'JSGL',
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
  },
  {
    id: 'drill-007',
    exerciseName: '海上联合演练',
    supportUnit: '海军司令部',
    organizer: '训练处',
    exerciseType: '4',
    level: '1',
    participatingUnits: '海军陆战队',
    city: 'NJ',
    academy: 'GJFW',
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
  },
  {
    id: 'drill-008',
    exerciseName: '跨区机动演练',
    supportUnit: '陆军司令部',
    organizer: '训练处',
    exerciseType: '2',
    level: '1',
    participatingUnits: '装甲旅',
    city: 'XA',
    academy: 'LHZZ',
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
  },
  {
    id: 'drill-009',
    exerciseName: '山地攻防演练',
    supportUnit: '西部战区',
    organizer: '作训科',
    exerciseType: '2',
    level: '1',
    participatingUnits: '合成营',
    city: 'BJ',
    academy: 'JSWH',
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
  },
  {
    id: 'drill-010',
    exerciseName: '城市反恐演练',
    supportUnit: '武警总部',
    organizer: '特战处',
    exerciseType: '2',
    level: '1',
    participatingUnits: '特战旅',
    city: 'BJ',
    academy: 'ZZ',
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
  }
]

export const getExerciseData = async (params: {
  pageNo?: number
  pageSize?: number
  exerciseName?: string
  exerciseType?: string
  level?: string
  academy?: string
  city?: string
}) => {
  await mockDelay(200)

  let filteredList = [...mockExerciseDataList]
  if (params.exerciseName) {
    filteredList = filteredList.filter((i) => i.exerciseName?.includes(params.exerciseName!))
  }
  if (params.exerciseType) {
    filteredList = filteredList.filter((i) => i.exerciseType === params.exerciseType)
  }
  if (params.level) {
    filteredList = filteredList.filter((i) => i.level === params.level)
  }
  if (params.academy) {
    filteredList = filteredList.filter((i) => i.academy === params.academy)
  }
  if (params.city) {
    filteredList = filteredList.filter((i) => i.city === params.city)
  }

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

export const getExamRecordList = async (id: string): Promise<{ data: ExamRecordVO[] }> => {
  await mockDelay(200)
  return { data: mockExamRecordList[id] || [] }
}

export const examApply = async (data: ExamApplyReqVO) => {
  await mockDelay(300)

  const index = mockDataList.findIndex((item) => String(item.id) === String(data.applyId))
  if (index !== -1) {
    if (data.examResult === '1') {
      mockDataList[index].applyNode = ApplyNode.APPROVED
    } else if (data.examResult === '2') {
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

interface MockMaterial {
  id: string
  deleted: number
  creator: string
  createTime: string
  updater: string
  updateTime: string
  fileName: string
  fileType: string
  contentType: string
  pathType: string
  filePath: string
  fileIntroduction: string
  fileContent: string
  oldPathType: string | null
  oldFilePath: string | null
  fileTypeLabel: string
  contentTypeName: string
}

const fp = (obj: string) => JSON.stringify({ bucket: 'zsrz-education', object: `/2025-12/${obj}`, path: `http://192.168.20.175:9003/zsrz-education/2025-12/${obj}`, pathExpireDate: 1765358124497 })
const WORD_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PDF_MIME = 'application/pdf'

const mockMaterialList: MockMaterial[] = [
  // YXFA 演训方案
  { id: 'mat-001', deleted: 0, creator: 'admin', createTime: '2025-01-05T01:00:00.000+00:00', updater: 'admin', updateTime: '2025-01-05T01:00:00.000+00:00', fileName: '联合作战演练任务背景.pdf', fileType: 'YXFA', contentType: PDF_MIME, pathType: 'MINIO', filePath: fp('20250105090000001.pdf'), fileIntroduction: '联合作战演练任务背景', fileContent: '本素材用于说明联合作战演练的任务背景与总体目标，包含参演力量编成、演练地域范围等基础信息。演练将在东部战区辖区内展开，涵盖陆海空三军联合行动。', oldPathType: null, oldFilePath: null, fileTypeLabel: '演训方案', contentTypeName: 'PDF' },
  { id: 'mat-002', deleted: 0, creator: 'admin', createTime: '2025-01-06T02:30:00.000+00:00', updater: 'admin', updateTime: '2025-01-06T02:30:00.000+00:00', fileName: '演训方案组织结构模板.word', fileType: 'YXFA', contentType: WORD_MIME, pathType: 'MINIO', filePath: fp('20250106103000002.word'), fileIntroduction: '演训方案组织结构模板', fileContent: '<h3>组织结构</h3><p>本次演练采用<strong>红蓝对抗</strong>模式，参演力量包括：</p><ul><li>红方：合成旅战斗群</li><li>蓝方：模拟假想敌分队</li></ul><p>演练重点检验<em>联合指挥</em>与<em>协同作战</em>能力。</p>', oldPathType: null, oldFilePath: null, fileTypeLabel: '演训方案', contentTypeName: 'WORD' },
  { id: 'mat-003', deleted: 0, creator: 'staff_b', createTime: '2025-01-07T06:00:00.000+00:00', updater: 'staff_b', updateTime: '2025-01-07T06:00:00.000+00:00', fileName: '演练总体筹划要点.word', fileType: 'YXFA', contentType: WORD_MIME, pathType: 'MINIO', filePath: fp('20250107140000003.word'), fileIntroduction: '演练总体筹划要点', fileContent: '<h3>筹划要点</h3><ol><li>明确演练目的和科目设置</li><li>拟定参演力量及编组方案</li><li>确定演练时间与地域</li><li>制定安全保障预案</li></ol><p>筹划工作应于演练前<strong>30天</strong>完成，经逐级审批后下达。</p>', oldPathType: null, oldFilePath: null, fileTypeLabel: '演训方案', contentTypeName: 'WORD' },
  { id: 'mat-004', deleted: 0, creator: 'admin', createTime: '2025-01-08T00:15:00.000+00:00', updater: 'admin', updateTime: '2025-01-08T00:15:00.000+00:00', fileName: '年度演训计划编制说明.pdf', fileType: 'YXFA', contentType: PDF_MIME, pathType: 'MINIO', filePath: fp('20250108081500004.pdf'), fileIntroduction: '年度演训计划编制说明', fileContent: '年度演训计划应包含演练名称、参演单位、时间节点、保障需求等核心要素。编制过程中需结合上级训练大纲要求，统筹安排各阶段训练内容。', oldPathType: null, oldFilePath: null, fileTypeLabel: '演训方案', contentTypeName: 'PDF' },

  // ZZJH 作战计划
  { id: 'mat-005', deleted: 0, creator: 'staff_a', createTime: '2025-01-10T01:30:00.000+00:00', updater: 'staff_a', updateTime: '2025-01-10T01:30:00.000+00:00', fileName: '作战计划编写规范.word', fileType: 'ZZJH', contentType: WORD_MIME, pathType: 'MINIO', filePath: fp('20250110093000005.word'), fileIntroduction: '作战计划编写规范', fileContent: '<h3>编写规范</h3><p>作战计划应包含以下要素：</p><table><tr><th>章节</th><th>内容</th></tr><tr><td>敌情判断</td><td>敌方兵力部署、可能行动方向</td></tr><tr><td>我方态势</td><td>己方编成、战斗序列</td></tr><tr><td>任务区分</td><td>各部队作战任务及协同关系</td></tr><tr><td>保障计划</td><td>后勤、装备、通信保障</td></tr></table>', oldPathType: null, oldFilePath: null, fileTypeLabel: '作战计划', contentTypeName: 'WORD' },
  { id: 'mat-006', deleted: 0, creator: 'admin', createTime: '2025-01-11T02:00:00.000+00:00', updater: 'admin', updateTime: '2025-01-11T02:00:00.000+00:00', fileName: '合同战斗计划要素.pdf', fileType: 'ZZJH', contentType: PDF_MIME, pathType: 'MINIO', filePath: fp('20250111100000006.pdf'), fileIntroduction: '合同战斗计划要素', fileContent: '合同战斗计划核心要素：战斗编成、任务区分、协同动作、火力计划、工程保障、后勤保障、通信保障、指挥关系。每个要素需明确责任单位和时间节点。', oldPathType: null, oldFilePath: null, fileTypeLabel: '作战计划', contentTypeName: 'PDF' },
  { id: 'mat-007', deleted: 0, creator: 'staff_b', createTime: '2025-01-12T06:20:00.000+00:00', updater: 'staff_b', updateTime: '2025-01-12T06:20:00.000+00:00', fileName: '防御作战计划参考.word', fileType: 'ZZJH', contentType: WORD_MIME, pathType: 'MINIO', filePath: fp('20250112142000007.word'), fileIntroduction: '防御作战计划参考', fileContent: '<p>防御作战计划应重点包含：</p><ul><li><strong>阵地编成</strong>：主阵地、前沿阵地、预备阵地</li><li><strong>火力配置</strong>：直射火力、间接火力、反坦克火力</li><li><strong>障碍设置</strong>：雷场、壕沟、铁丝网</li><li><strong>反冲击计划</strong>：预备队使用时机和方向</li></ul>', oldPathType: null, oldFilePath: null, fileTypeLabel: '作战计划', contentTypeName: 'WORD' },

  // DDJH 导调计划
  { id: 'mat-008', deleted: 0, creator: 'admin', createTime: '2025-01-14T01:00:00.000+00:00', updater: 'admin', updateTime: '2025-01-14T01:00:00.000+00:00', fileName: '导调工作基本流程.word', fileType: 'DDJH', contentType: WORD_MIME, pathType: 'MINIO', filePath: fp('20250114090000008.word'), fileIntroduction: '导调工作基本流程', fileContent: '<h3>导调流程</h3><ol><li><strong>导调准备</strong>：拟定导调方案，明确导调人员分工</li><li><strong>情况诱导</strong>：按时序发放态势信息</li><li><strong>裁决评判</strong>：依据交战规则进行实时裁决</li><li><strong>讲评总结</strong>：梳理问题，总结经验教训</li></ol>', oldPathType: null, oldFilePath: null, fileTypeLabel: '导调计划', contentTypeName: 'WORD' },
  { id: 'mat-009', deleted: 0, creator: 'staff_a', createTime: '2025-01-15T02:30:00.000+00:00', updater: 'staff_a', updateTime: '2025-01-15T02:30:00.000+00:00', fileName: '导调文书编写指南.pdf', fileType: 'DDJH', contentType: PDF_MIME, pathType: 'MINIO', filePath: fp('20250115103000009.pdf'), fileIntroduction: '导调文书编写指南', fileContent: '导调文书包括：导调方案、情况想定、导调日志、裁决记录、讲评报告。文书编写应做到时间精确、内容详实、格式规范，确保导调活动有据可查。', oldPathType: null, oldFilePath: null, fileTypeLabel: '导调计划', contentTypeName: 'PDF' },
  { id: 'mat-010', deleted: 0, creator: 'admin', createTime: '2025-01-16T03:45:00.000+00:00', updater: 'admin', updateTime: '2025-01-16T03:45:00.000+00:00', fileName: '导调情况想定示例.word', fileType: 'DDJH', contentType: WORD_MIME, pathType: 'MINIO', filePath: fp('20250116114500010.word'), fileIntroduction: '导调情况想定示例', fileContent: '<p>XX时XX分，蓝方在我防御正面实施<strong>佯攻</strong>，主力向我左翼迂回。</p><p>导调要求：红方指挥员需在<em>15分钟内</em>判明蓝方意图并调整部署。考核重点：情报研判能力、指挥决策速度。</p>', oldPathType: null, oldFilePath: null, fileTypeLabel: '导调计划', contentTypeName: 'WORD' },

  // ZZWS 作战文书
  { id: 'mat-011', deleted: 0, creator: 'admin', createTime: '2025-01-18T01:30:00.000+00:00', updater: 'admin', updateTime: '2025-01-18T01:30:00.000+00:00', fileName: '作战命令格式规范.word', fileType: 'ZZWS', contentType: WORD_MIME, pathType: 'MINIO', filePath: fp('20250118093000011.word'), fileIntroduction: '作战命令格式规范', fileContent: '<h3>作战命令格式</h3><p>标准作战命令包含五个部分：</p><ol><li>敌情</li><li>任务</li><li>执行（各分队任务）</li><li>保障</li><li>指挥与通信</li></ol><p>命令应简明扼要，避免歧义，使用规范军语。</p>', oldPathType: null, oldFilePath: null, fileTypeLabel: '作战文书', contentTypeName: 'WORD' },
  { id: 'mat-012', deleted: 0, creator: 'staff_a', createTime: '2025-01-19T06:00:00.000+00:00', updater: 'staff_a', updateTime: '2025-01-19T06:00:00.000+00:00', fileName: '战斗文书签发流程.pdf', fileType: 'ZZWS', contentType: PDF_MIME, pathType: 'MINIO', filePath: fp('20250119140000012.pdf'), fileIntroduction: '战斗文书签发流程', fileContent: '战斗文书签发流程：拟稿→核稿→签发→登记→分发→签收。紧急文书可先口头下达后补签书面文书。所有文书须编号存档，非密文书保存期限不少于5年。', oldPathType: null, oldFilePath: null, fileTypeLabel: '作战文书', contentTypeName: 'PDF' },
  { id: 'mat-013', deleted: 0, creator: 'staff_b', createTime: '2025-01-20T02:15:00.000+00:00', updater: 'staff_b', updateTime: '2025-01-20T02:15:00.000+00:00', fileName: '协同动作计划要素.word', fileType: 'ZZWS', contentType: WORD_MIME, pathType: 'MINIO', filePath: fp('20250120101500013.word'), fileIntroduction: '协同动作计划要素', fileContent: '<p>协同动作计划应明确：</p><ul><li>协同目标与方法</li><li>火力协同时序表</li><li>各分队动作衔接点</li><li>联络信号与暗语</li></ul><p>重点确保<strong>时间协同</strong>和<strong>空间协同</strong>的统一。</p>', oldPathType: null, oldFilePath: null, fileTypeLabel: '作战文书', contentTypeName: 'WORD' },

  // QTLA 企图立案
  { id: 'mat-014', deleted: 0, creator: 'admin', createTime: '2025-01-21T01:00:00.000+00:00', updater: 'admin', updateTime: '2025-01-21T01:00:00.000+00:00', fileName: '企图判断分析方法.pdf', fileType: 'QTLA', contentType: PDF_MIME, pathType: 'MINIO', filePath: fp('20250121090000014.pdf'), fileIntroduction: '企图判断分析方法', fileContent: '企图判断需综合运用情报分析、态势研判、兵棋推演等手段。重点分析敌方兵力调动、后勤保障变化、通信活动异常等征候，形成多种可能行动方案的概率评估。', oldPathType: null, oldFilePath: null, fileTypeLabel: '企图立案', contentTypeName: 'PDF' },
  { id: 'mat-015', deleted: 0, creator: 'staff_a', createTime: '2025-01-22T02:30:00.000+00:00', updater: 'staff_a', updateTime: '2025-01-22T02:30:00.000+00:00', fileName: '立案报告编写标准.word', fileType: 'QTLA', contentType: WORD_MIME, pathType: 'MINIO', filePath: fp('20250122103000015.word'), fileIntroduction: '立案报告编写标准', fileContent: '<h3>立案报告结构</h3><ol><li><strong>背景概述</strong>：阐述任务背景及当面敌情</li><li><strong>企图分析</strong>：列出敌方可能行动方案（最危险/最可能）</li><li><strong>我方对策</strong>：针对各方案拟定应对措施</li><li><strong>建议方案</strong>：推荐最优行动方案并说明理由</li></ol>', oldPathType: null, oldFilePath: null, fileTypeLabel: '企图立案', contentTypeName: 'WORD' },
  { id: 'mat-016', deleted: 0, creator: 'admin', createTime: '2025-01-23T03:00:00.000+00:00', updater: 'admin', updateTime: '2025-01-23T03:00:00.000+00:00', fileName: '态势研判报告模板.word', fileType: 'QTLA', contentType: WORD_MIME, pathType: 'MINIO', filePath: fp('20250123110000016.word'), fileIntroduction: '态势研判报告模板', fileContent: '<p>态势研判报告应包含：</p><ul><li>战场环境分析（地形、气象、电磁）</li><li>敌我力量对比</li><li>关键时间节点预判</li><li>态势发展趋势评估</li></ul><p>报告结论需给出<strong>置信度等级</strong>（高/中/低）。</p>', oldPathType: null, oldFilePath: null, fileTypeLabel: '企图立案', contentTypeName: 'WORD' }
]

export const getFilePage = async (params: {
  pageNo?: number
  pageSize?: number
  fileTypeList?: string[] | string
}) => {
  await mockDelay()

  let filteredList = mockMaterialList.filter((item) => item.deleted === 0)

  if (params.fileTypeList) {
    const types = Array.isArray(params.fileTypeList)
      ? params.fileTypeList
      : [params.fileTypeList]
    if (types.length > 0) {
      filteredList = filteredList.filter((item) => types.includes(item.fileType))
    }
  }

  const total = filteredList.length
  if (params.pageNo && params.pageSize) {
    const start = (params.pageNo - 1) * params.pageSize
    filteredList = filteredList.slice(start, start + params.pageSize)
  }

  return {
    code: 200,
    data: { dataFileVoList: filteredList, size: params.pageSize || filteredList.length, total },
    message: 'success'
  }
}

export default {
  getPageList,
  getDocCategories,
  getLevelOptions,
  getAcademyOptions,
  getExerciseTypeOptions,
  getCityOptions,
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
  examApply,
  getFilePage
}
