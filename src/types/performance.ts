/**
 * 演训方案 API 类型定义
 */

// 演训方案数据接口
export interface TrainingPerformanceVO {
  id?: string
  planId?: string // 演训数据ID
  exerciseName?: string // 演训数据名称
  planName: string // 筹划方案名称
  collegeCode?: string // 学院代码
  fileType: string //左侧树文档分类
  activeUser?: string // 可编辑用户
  description?: string // 简介/描述
  level?: string //演训等级
  exerciseType?: string // 演训类型
  exerciseTheme?: string // 演训主题
  docType?: string // 文件类型
  createBy?: string // 创建人
  applyNode?: string // 审核状态
  createTime?: string // 创建时间 (上传时间)
  updateTime?: string // 更新时间
  delFlg?: string // 删除(0-未删除,1-已删除)
  flowId?: string // 审核流程id
  flowNode?: string // 当前审核节点
  creationMethod?: string // 创建方式: 'new', 'upload'
  newFileType?: string //新建文档时选择的文件类型
  fileId?: any //上传文档时返回的文件ID
  scope?: string // 权限范围

  // 保留原有字段以兼容列表显示
  offset?: number // 偏移量
  userId?: string // 用户ID
  version?: string // 版本号
  author?: string // 作者
}

// 查询参数接口
export interface TrainingPerformancePageReqVO extends PageParam {
  planName?: string // 方案名称
  applyNode?: string // 审核状态
  createTime?: string //创建时间 (上传时间)
  fileType?: string //左侧文档分类
  exerciseTheme?: string //演训主题
  exerciseType?: string //演训类型
  level?: string // 演训等级
  collegeCode?: string // 所属学院
  docType?: string // 文件类型
  tabType?: string // 标签页类型undefined(recent)
}

// 审核状态枚举（编辑中:1、审核中:2、审核通过:3、发布:4、驳回:5）
export enum ApplyNodeEnum {
  EDITING = '1', // 编辑中
  REVIEWING = '2', // 审核中
  APPROVED = '3', // 审核通过
  PUBLISHED = '4', // 发布
  REJECTED = '5' // 驳回
}

// 审核状态文本映射
export const ApplyNodeTextMap: Record<string, string> = {
  '1': '编辑中',
  '2': '审核中',
  '3': '审核通过',
  '4': '发布',
  '5': '驳回'
}

// 审核节点接口
export interface AuditNodeVO {
  nodeId: string // 节点ID
  nodeName: string // 节点名称
  users: string[] // 节点用户列表
}

// 审核流程接口
export interface AuditFlowVO {
  flowId: string // 流程ID
  flowName: string // 流程名称
  nodes: AuditNodeVO[] // 流程节点列表
}

// 提交审核参数接口
export interface SubmitAuditReqVO {
  id: string // 方案ID
  flowId: string // 流程ID
  auditors: Record<string, string[]> // 节点审核人 { node1: ['user1'], node2: ['user2', 'user3'] }
  comment?: string // 审核说明
}

// 发布文档参数接口
export interface PublishDocReqVO {
  id: string // 方案ID
  visibleScope: string[] // 可见范围（用户ID列表）
}

// 驳回记录接口
export interface RejectRecordVO {
  rejectBy: string
  rejectTime: string
  reason: string
}

// 驳回请求接口
export interface RejectReqVO {
  id: string
  reason: string
  rejectBy?: string // 可选，通常由后端从 token 获取，这里模拟传递
}

// 权限校验响应接口
export interface PermissionCheckResponse {
  code: number
  data: boolean // true=有权限, false=无权限
  status: number // 200=正常, 500=异常
  msg?: string
}

// 权限校验请求接口
export interface checkWriteData {
  id: string
  userId: string
}

// 文件流响应接口
export interface FileStreamResponse {
  code: number
  data: Blob | null
  msg?: string
}

// 上传文档参数接口
export interface UploadDocumentData {
  id?: string // 文档ID（可选）
  file: File // 文件对象
}

// 审核记录接口 - GET /examRecord/examApply 返回参数
export interface ExamRecordVO {
  id: string // 记录ID
  applyId: string // 记录id（关联applyId）
  examNode: string // 审核节点
  examResult: string // 审核结果 1通过 2驳回
  examOpinion: string // 审核意见
  examOffice: string // 审核部门id
  examUserId: string // 审批用户id
  nextUserId: string // 下一审批用户id
  examOfficeName: string // 审核部门名称
  createTime?: string // 创建时间
}

// 审核结果枚举
export enum ExamResultEnum {
  PASS = '1', // 通过
  REJECT = '2' // 驳回
}

// 审核结果文本映射
export const ExamResultTextMap: Record<string, string> = {
  '1': '通过',
  '2': '驳回'
}

// 审核/驳回操作请求接口 - POST /examRecord/examApply
export interface ExamApplyReqVO {
  applyId: string // 当前数据id
  examResult: string // 审核结果 1通过 2驳回
  examOpinion: string // 审核意见/驳回原因
  examUserId: string // 审批用户id
}
