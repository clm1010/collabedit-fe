<template>
  <div class="tools-toolbar">
    <!-- 二维码 -->
    <div class="toolbar-group">
      <el-tooltip content="二维码" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="openQrcodeDialog">
          <Icon icon="mdi:qrcode" class="btn-icon-large" />
          <span class="btn-text">二维码</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 条形码 -->
    <div class="toolbar-group">
      <el-tooltip content="条形码" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="openBarcodeDialog">
          <Icon icon="mdi:barcode" class="btn-icon-large" />
          <span class="btn-text">条形码</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 电子签名 -->
    <div class="toolbar-group">
      <el-tooltip content="电子签名" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="openSignatureDialog">
          <Icon icon="mdi:draw" class="btn-icon-large" />
          <span class="btn-text">电子签名</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 电子签章 -->
    <div class="toolbar-group">
      <el-tooltip content="电子签章" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="openSealDialog">
          <Icon icon="mdi:stamper" class="btn-icon-large" />
          <span class="btn-text">电子签章</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 流程图 -->
    <div class="toolbar-group">
      <el-tooltip content="流程图" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="openFlowchartDialog">
          <Icon icon="mdi:sitemap-outline" class="btn-icon-large" />
          <span class="btn-text">流程图</span>
        </button>
      </el-tooltip>
    </div>

    <!-- 图表 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="280" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="图表" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:chart-bar" class="btn-icon-large" />
                <span class="btn-text">图表</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="chart-panel">
          <div class="chart-types">
            <button
              v-for="chart in chartTypes"
              :key="chart.type"
              class="chart-item"
              @click="insertChart(chart.type)"
            >
              <Icon :icon="chart.icon" class="chart-icon" />
              <span>{{ chart.label }}</span>
            </button>
          </div>
        </div>
      </el-popover>
    </div>

    <!-- Mermaid -->
    <div class="toolbar-group">
      <el-tooltip content="Mermaid 图" placement="bottom" :show-after="500">
        <button class="toolbar-btn-large" @click="openMermaidDialog">
          <Icon icon="mdi:vector-polyline" class="btn-icon-large" />
          <span class="btn-text">Mermaid</span>
        </button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 中文大小写 -->
    <div class="toolbar-group">
      <el-popover placement="bottom" :width="200" trigger="click">
        <template #reference>
          <span>
            <el-tooltip content="中文大小写" placement="bottom" :show-after="500">
              <button class="toolbar-btn-large">
                <Icon icon="mdi:ideogram-cjk-variant" class="btn-icon-large" />
                <span class="btn-text">中文大小写</span>
              </button>
            </el-tooltip>
          </span>
        </template>
        <div class="case-panel">
          <div class="case-options">
            <button class="case-btn" @click="convertToChineseNumber('lower')">
              <span class="case-example">一二三四五</span>
              <span class="case-label">小写</span>
            </button>
            <button class="case-btn" @click="convertToChineseNumber('upper')">
              <span class="case-example">壹贰叁肆伍</span>
              <span class="case-label">大写</span>
            </button>
            <button class="case-btn" @click="convertToChineseMoney">
              <span class="case-example">人民币大写</span>
              <span class="case-label">金额</span>
            </button>
          </div>
        </div>
      </el-popover>
    </div>

    <!-- 二维码对话框 -->
    <el-dialog v-model="qrcodeDialogVisible" title="插入二维码" width="480px">
      <el-form :model="qrcodeForm" label-width="80px">
        <el-form-item label="内容">
          <el-input
            v-model="qrcodeForm.content"
            type="textarea"
            :rows="3"
            placeholder="请输入要生成二维码的内容（网址、文本等）"
          />
        </el-form-item>
        <el-form-item label="大小">
          <el-slider v-model="qrcodeForm.size" :min="100" :max="400" :step="20" />
          <span class="size-label">{{ qrcodeForm.size }}px</span>
        </el-form-item>
      </el-form>
      <div v-if="qrcodeForm.content" class="qrcode-preview">
        <div class="preview-label">预览：</div>
        <div class="preview-box">
          <canvas ref="qrcodeCanvas"></canvas>
        </div>
      </div>
      <template #footer>
        <el-button @click="qrcodeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="insertQrcode">插入</el-button>
      </template>
    </el-dialog>

    <!-- 条形码对话框 -->
    <el-dialog v-model="barcodeDialogVisible" title="插入条形码" width="480px">
      <el-form :model="barcodeForm" label-width="80px">
        <el-form-item label="内容">
          <el-input v-model="barcodeForm.content" placeholder="请输入条形码内容（数字或字母）" />
        </el-form-item>
        <el-form-item label="格式">
          <el-select v-model="barcodeForm.format" style="width: 100%">
            <el-option label="CODE128" value="CODE128" />
            <el-option label="CODE39" value="CODE39" />
            <el-option label="EAN13" value="EAN13" />
            <el-option label="EAN8" value="EAN8" />
            <el-option label="UPC" value="UPC" />
          </el-select>
        </el-form-item>
        <el-form-item label="高度">
          <el-slider v-model="barcodeForm.height" :min="30" :max="150" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="barcodeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="insertBarcode">插入</el-button>
      </template>
    </el-dialog>

    <!-- 电子签名对话框 -->
    <el-dialog v-model="signatureDialogVisible" title="电子签名" width="600px">
      <div class="signature-container">
        <div class="signature-toolbar">
          <div class="color-options">
            <span class="label">颜色：</span>
            <button
              v-for="color in signatureColors"
              :key="color"
              class="color-btn"
              :class="{ active: signatureColor === color }"
              :style="{ backgroundColor: color }"
              @click="signatureColor = color"
            ></button>
          </div>
          <div class="width-options">
            <span class="label">粗细：</span>
            <el-slider v-model="signatureWidth" :min="1" :max="10" :step="1" style="width: 100px" />
          </div>
          <el-button text @click="clearSignature">清除</el-button>
        </div>
        <canvas
          ref="signatureCanvas"
          class="signature-canvas"
          @mousedown="startDrawing"
          @mousemove="draw"
          @mouseup="stopDrawing"
          @mouseleave="stopDrawing"
        ></canvas>
      </div>
      <template #footer>
        <el-button @click="signatureDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="insertSignature">插入签名</el-button>
      </template>
    </el-dialog>

    <!-- 电子签章对话框 -->
    <el-dialog v-model="sealDialogVisible" title="电子签章" width="480px">
      <div class="seal-container">
        <div class="seal-preview" :style="{ borderColor: sealColor }">
          <div class="seal-text" :style="{ color: sealColor }">{{ sealText || '公司名称' }}</div>
          <div class="seal-star">★</div>
          <div class="seal-bottom" :style="{ color: sealColor }">{{
            sealBottomText || '专用章'
          }}</div>
        </div>
        <el-form :model="sealForm" label-width="80px" class="mt-4">
          <el-form-item label="公司名称">
            <el-input v-model="sealText" placeholder="请输入公司名称" />
          </el-form-item>
          <el-form-item label="底部文字">
            <el-input v-model="sealBottomText" placeholder="专用章" />
          </el-form-item>
          <el-form-item label="印章颜色">
            <div class="seal-colors">
              <button
                v-for="color in sealColors"
                :key="color"
                class="seal-color-btn"
                :class="{ active: sealColor === color }"
                :style="{ backgroundColor: color }"
                @click="sealColor = color"
              ></button>
            </div>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="sealDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="insertSeal">插入签章</el-button>
      </template>
    </el-dialog>

    <!-- 流程图对话框 -->
    <el-dialog v-model="flowchartDialogVisible" title="插入流程图" width="700px">
      <div class="flowchart-container">
        <div class="flowchart-toolbar">
          <span class="label">选择模板：</span>
          <el-select v-model="flowchartTemplate" style="width: 200px">
            <el-option label="空白流程图" value="blank" />
            <el-option label="简单流程" value="simple" />
            <el-option label="决策流程" value="decision" />
            <el-option label="循环流程" value="loop" />
          </el-select>
        </div>
        <div class="flowchart-preview">
          <pre>{{ flowchartCode }}</pre>
        </div>
        <el-input
          v-model="flowchartCode"
          type="textarea"
          :rows="8"
          placeholder="输入 Mermaid 流程图代码"
        />
      </div>
      <template #footer>
        <el-button @click="flowchartDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="insertFlowchart">插入</el-button>
      </template>
    </el-dialog>

    <!-- Mermaid 对话框 -->
    <el-dialog v-model="mermaidDialogVisible" title="插入 Mermaid 图" width="700px">
      <div class="mermaid-container">
        <div class="mermaid-types">
          <el-radio-group v-model="mermaidType">
            <el-radio value="flowchart">流程图</el-radio>
            <el-radio value="sequence">时序图</el-radio>
            <el-radio value="class">类图</el-radio>
            <el-radio value="state">状态图</el-radio>
            <el-radio value="gantt">甘特图</el-radio>
            <el-radio value="pie">饼图</el-radio>
          </el-radio-group>
        </div>
        <el-input
          v-model="mermaidCode"
          type="textarea"
          :rows="10"
          :placeholder="mermaidPlaceholder"
        />
      </div>
      <template #footer>
        <el-button @click="mermaidDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="insertMermaid">插入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck - 忽略 Tiptap 扩展类型问题
import { ref, computed, watch, nextTick } from 'vue'
import { Icon } from '@/components/Icon'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'
import { useEditor } from './useEditor'

// 获取编辑器实例
const editor = useEditor()

// 图表类型
const chartTypes = [
  { type: 'bar', label: '柱状图', icon: 'mdi:chart-bar' },
  { type: 'line', label: '折线图', icon: 'mdi:chart-line' },
  { type: 'pie', label: '饼图', icon: 'mdi:chart-pie' },
  { type: 'area', label: '面积图', icon: 'mdi:chart-areaspline' },
  { type: 'radar', label: '雷达图', icon: 'mdi:radar' },
  { type: 'scatter', label: '散点图', icon: 'mdi:chart-scatter-plot' }
]

// 二维码相关
const qrcodeDialogVisible = ref(false)
const qrcodeCanvas = ref<HTMLCanvasElement | null>(null)
const qrcodeForm = ref({
  content: '',
  size: 200
})

// 条形码相关
const barcodeDialogVisible = ref(false)
const barcodeForm = ref({
  content: '',
  format: 'CODE128',
  height: 80
})

// 电子签名相关
const signatureDialogVisible = ref(false)
const signatureCanvas = ref<HTMLCanvasElement | null>(null)
const signatureColor = ref('#000000')
const signatureWidth = ref(3)
const signatureColors = ['#000000', '#1a73e8', '#ff0000', '#00aa00']
let isDrawing = false
let ctx: CanvasRenderingContext2D | null = null

// 电子签章相关
const sealDialogVisible = ref(false)
const sealText = ref('')
const sealBottomText = ref('专用章')
const sealColor = ref('#ff0000')
const sealColors = ['#ff0000', '#0000ff', '#000000']
const sealForm = ref({})

// 流程图相关
const flowchartDialogVisible = ref(false)
const flowchartTemplate = ref('simple')
const flowchartCode = ref(`graph TD
    A[开始] --> B{判断条件}
    B -->|是| C[处理1]
    B -->|否| D[处理2]
    C --> E[结束]
    D --> E`)

// Mermaid 相关
const mermaidDialogVisible = ref(false)
const mermaidType = ref('flowchart')
const mermaidCode = ref('')

const mermaidPlaceholder = computed(() => {
  const placeholders: Record<string, string> = {
    flowchart: `graph TD
    A[开始] --> B[处理]
    B --> C[结束]`,
    sequence: `sequenceDiagram
    Alice->>Bob: Hello Bob
    Bob-->>Alice: Hi Alice`,
    class: `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal: +int age
    Animal: +String gender`,
    state: `stateDiagram-v2
    [*] --> Still
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]`,
    gantt: `gantt
    title 项目计划
    dateFormat YYYY-MM-DD
    section 阶段1
    任务1: 2024-01-01, 30d
    任务2: 2024-02-01, 20d`,
    pie: `pie title 占比分布
    "A类" : 30
    "B类" : 45
    "C类" : 25`
  }
  return placeholders[mermaidType.value] || ''
})

// 监听二维码内容变化，生成预览
watch(
  () => qrcodeForm.value.content,
  async (content) => {
    if (content && qrcodeCanvas.value) {
      await nextTick()
      try {
        await QRCode.toCanvas(qrcodeCanvas.value, content, {
          width: qrcodeForm.value.size,
          margin: 2
        })
      } catch (err) {
        console.error('生成二维码失败:', err)
      }
    }
  }
)

// 签名画布初始化
watch(signatureDialogVisible, async (visible) => {
  if (visible) {
    await nextTick()
    initSignatureCanvas()
  }
})

const initSignatureCanvas = () => {
  if (!signatureCanvas.value) return
  const canvas = signatureCanvas.value
  canvas.width = 550
  canvas.height = 200
  ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = signatureColor.value
    ctx.lineWidth = signatureWidth.value
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }
}

const startDrawing = (e: MouseEvent) => {
  if (!ctx || !signatureCanvas.value) return
  isDrawing = true
  ctx.strokeStyle = signatureColor.value
  ctx.lineWidth = signatureWidth.value
  ctx.beginPath()
  const rect = signatureCanvas.value.getBoundingClientRect()
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
}

const draw = (e: MouseEvent) => {
  if (!isDrawing || !ctx || !signatureCanvas.value) return
  const rect = signatureCanvas.value.getBoundingClientRect()
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
  ctx.stroke()
}

const stopDrawing = () => {
  isDrawing = false
}

const clearSignature = () => {
  if (!ctx || !signatureCanvas.value) return
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, signatureCanvas.value.width, signatureCanvas.value.height)
}

// 打开对话框
const openQrcodeDialog = () => {
  qrcodeForm.value.content = ''
  qrcodeDialogVisible.value = true
}

const openBarcodeDialog = () => {
  barcodeForm.value.content = ''
  barcodeDialogVisible.value = true
}

const openSignatureDialog = () => {
  signatureDialogVisible.value = true
}

const openSealDialog = () => {
  sealDialogVisible.value = true
}

const openFlowchartDialog = () => {
  flowchartDialogVisible.value = true
}

const openMermaidDialog = () => {
  mermaidCode.value = mermaidPlaceholder.value
  mermaidDialogVisible.value = true
}

// 插入二维码
const insertQrcode = async () => {
  if (!editor || !qrcodeForm.value.content) {
    ElMessage.warning('请输入二维码内容')
    return
  }

  try {
    const dataUrl = await QRCode.toDataURL(qrcodeForm.value.content, {
      width: qrcodeForm.value.size,
      margin: 2
    })
    editor.value.chain().focus().setImage({ src: dataUrl, alt: '二维码' }).run()
    qrcodeDialogVisible.value = false
    ElMessage.success('二维码已插入')
  } catch (err) {
    ElMessage.error('生成二维码失败')
  }
}

// 插入条形码
const insertBarcode = () => {
  if (!editor || !barcodeForm.value.content) {
    ElMessage.warning('请输入条形码内容')
    return
  }

  // 条形码需要专门的库来生成，这里简化处理
  const placeholder = `<div class="barcode-placeholder" data-content="${barcodeForm.value.content}" data-format="${barcodeForm.value.format}">
    <svg viewBox="0 0 200 ${barcodeForm.value.height}">
      <text x="100" y="${barcodeForm.value.height / 2}" text-anchor="middle">条形码: ${barcodeForm.value.content}</text>
    </svg>
  </div>`

  editor.value.chain().focus().insertContent(placeholder).run()
  barcodeDialogVisible.value = false
  ElMessage.success('条形码已插入')
}

// 插入签名
const insertSignature = () => {
  if (!editor || !signatureCanvas.value) return

  const dataUrl = signatureCanvas.value.toDataURL('image/png')
  editor.value.chain().focus().setImage({ src: dataUrl, alt: '电子签名' }).run()
  signatureDialogVisible.value = false
  ElMessage.success('签名已插入')
}

// 插入签章
const insertSeal = () => {
  if (!editor || !sealText.value) {
    ElMessage.warning('请输入公司名称')
    return
  }

  // 生成 SVG 签章
  const sealSvg = `<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="55" fill="none" stroke="${sealColor.value}" stroke-width="3"/>
    <circle cx="60" cy="60" r="48" fill="none" stroke="${sealColor.value}" stroke-width="1"/>
    <text x="60" y="40" text-anchor="middle" font-size="10" fill="${sealColor.value}" style="font-weight: bold;">
      <textPath href="#seal-path">${sealText.value}</textPath>
    </text>
    <path id="seal-path" d="M 15 60 A 45 45 0 1 1 105 60" fill="none"/>
    <text x="60" y="65" text-anchor="middle" font-size="18" fill="${sealColor.value}">★</text>
    <text x="60" y="90" text-anchor="middle" font-size="10" fill="${sealColor.value}">${sealBottomText.value}</text>
  </svg>`

  // 将 SVG 转换为 Data URL
  const svgBlob = new Blob([sealSvg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(svgBlob)

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 120
    canvas.height = 120
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(img, 0, 0)
      const dataUrl = canvas.toDataURL('image/png')
      editor.value?.chain().focus().setImage({ src: dataUrl, alt: '电子签章' }).run()
      sealDialogVisible.value = false
      ElMessage.success('签章已插入')
    }
    URL.revokeObjectURL(url)
  }
  img.src = url
}

// 插入流程图
const insertFlowchart = () => {
  if (!editor || !flowchartCode.value) {
    ElMessage.warning('请输入流程图代码')
    return
  }

  const mermaidDiv = `<div class="mermaid-diagram" data-type="flowchart">
    <pre class="mermaid">${flowchartCode.value}</pre>
  </div>`

  editor.value.chain().focus().insertContent(mermaidDiv).run()
  flowchartDialogVisible.value = false
  ElMessage.success('流程图已插入')
}

// 插入图表
const insertChart = (type: string) => {
  if (!editor.value) return

  const chartPlaceholder = `<div class="chart-placeholder" data-chart-type="${type}" style="width: 400px; height: 300px; background: #f5f5f5; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
    <span style="color: #999;">📊 ${type === 'bar' ? '柱状图' : type === 'line' ? '折线图' : type === 'pie' ? '饼图' : type === 'area' ? '面积图' : type === 'radar' ? '雷达图' : '散点图'}占位</span>
  </div>`

  editor.value.chain().focus().insertContent(chartPlaceholder).run()
  ElMessage.info('图表已插入（需要配置数据源）')
}

// 插入 Mermaid
const insertMermaid = () => {
  if (!editor || !mermaidCode.value) {
    ElMessage.warning('请输入 Mermaid 代码')
    return
  }

  const mermaidDiv = `<div class="mermaid-diagram" data-type="${mermaidType.value}">
    <pre class="mermaid">${mermaidCode.value}</pre>
  </div>`

  editor.value.chain().focus().insertContent(mermaidDiv).run()
  mermaidDialogVisible.value = false
  ElMessage.success('Mermaid 图已插入')
}

// 中文数字转换
const chineseLowerNumbers = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const chineseUpperNumbers = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']

const convertToChineseNumber = (type: 'lower' | 'upper') => {
  if (!editor.value) return

  const { from, to } = editor.value.state.selection
  const selectedText = editor.value.state.doc.textBetween(from, to)

  if (!selectedText || !/^\d+$/.test(selectedText)) {
    ElMessage.warning('请先选中阿拉伯数字')
    return
  }

  const numbers = type === 'lower' ? chineseLowerNumbers : chineseUpperNumbers
  const converted = selectedText
    .split('')
    .map((d) => numbers[parseInt(d)])
    .join('')

  editor.value.chain().focus().insertContentAt({ from, to }, converted).run()
  ElMessage.success('转换完成')
}

const convertToChineseMoney = () => {
  if (!editor.value) return

  const { from, to } = editor.value.state.selection
  const selectedText = editor.value.state.doc.textBetween(from, to)

  if (!selectedText || !/^[\d.]+$/.test(selectedText)) {
    ElMessage.warning('请先选中金额数字')
    return
  }

  // 简化版人民币大写转换
  const amount = parseFloat(selectedText)
  if (isNaN(amount)) {
    ElMessage.warning('无效的金额')
    return
  }

  const digitChars = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
  const unitChars = ['', '拾', '佰', '仟', '万', '拾', '佰', '仟', '亿']

  let integerPart = Math.floor(amount)
  let decimalPart = Math.round((amount - integerPart) * 100)

  let result = ''

  // 处理整数部分
  const intStr = integerPart.toString()
  for (let i = 0; i < intStr.length; i++) {
    const digit = parseInt(intStr[i])
    const unitIndex = intStr.length - i - 1
    if (digit !== 0) {
      result += digitChars[digit] + unitChars[unitIndex]
    } else if (result && !result.endsWith('零')) {
      result += '零'
    }
  }

  result = result.replace(/零+$/, '') + '元'

  // 处理小数部分
  if (decimalPart > 0) {
    const jiao = Math.floor(decimalPart / 10)
    const fen = decimalPart % 10
    if (jiao > 0) result += digitChars[jiao] + '角'
    if (fen > 0) result += digitChars[fen] + '分'
  } else {
    result += '整'
  }

  editor.value.chain().focus().insertContentAt({ from, to }, result).run()
  ElMessage.success('转换完成')
}
</script>

<style lang="scss" scoped>
.tools-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  padding: 8px 12px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e0e0e0;
  margin: 0 8px;
}

.toolbar-btn-large {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #333;
  transition: all 0.15s ease;

  &:hover {
    background: #e8f0fe;
    color: #1a73e8;
  }

  .btn-icon-large {
    font-size: 22px;
  }

  .btn-text {
    font-size: 11px;
  }
}

.chart-panel {
  .chart-types {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .chart-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: #1a73e8;
      background: #e8f0fe;
    }

    .chart-icon {
      font-size: 24px;
      color: #666;
    }

    span {
      font-size: 12px;
    }
  }
}

.qrcode-preview {
  margin-top: 16px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
  text-align: center;

  .preview-label {
    font-size: 13px;
    color: #666;
    margin-bottom: 12px;
  }

  .preview-box {
    display: inline-block;
    padding: 16px;
    background: #fff;
    border-radius: 8px;
  }
}

.size-label {
  margin-left: 12px;
  font-size: 13px;
  color: #666;
}

.signature-container {
  .signature-toolbar {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 12px;

    .label {
      font-size: 13px;
      color: #666;
    }

    .color-options {
      display: flex;
      align-items: center;
      gap: 8px;

      .color-btn {
        width: 24px;
        height: 24px;
        border: 2px solid #e0e0e0;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.15s ease;

        &.active {
          border-color: #1a73e8;
          transform: scale(1.1);
        }
      }
    }

    .width-options {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .signature-canvas {
    width: 100%;
    height: 200px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    cursor: crosshair;
    background: #fff;
  }
}

.seal-container {
  .seal-preview {
    width: 120px;
    height: 120px;
    margin: 0 auto;
    border: 3px solid;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;

    .seal-text {
      font-size: 10px;
      font-weight: bold;
      text-align: center;
      max-width: 80px;
      word-break: break-all;
    }

    .seal-star {
      font-size: 20px;
      color: inherit;
    }

    .seal-bottom {
      font-size: 10px;
      position: absolute;
      bottom: 15px;
    }
  }

  .seal-colors {
    display: flex;
    gap: 8px;

    .seal-color-btn {
      width: 28px;
      height: 28px;
      border: 2px solid #e0e0e0;
      border-radius: 4px;
      cursor: pointer;

      &.active {
        border-color: #1a73e8;
      }
    }
  }
}

.case-panel {
  .case-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .case-btn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: #1a73e8;
      background: #e8f0fe;
    }

    .case-example {
      font-size: 14px;
    }

    .case-label {
      font-size: 12px;
      color: #666;
    }
  }
}

.flowchart-container,
.mermaid-container {
  .flowchart-toolbar,
  .mermaid-types {
    margin-bottom: 16px;

    .label {
      font-size: 13px;
      color: #666;
      margin-right: 8px;
    }
  }

  .flowchart-preview {
    background: #f5f5f5;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;

    pre {
      margin: 0;
      font-size: 12px;
      color: #666;
    }
  }
}
</style>
