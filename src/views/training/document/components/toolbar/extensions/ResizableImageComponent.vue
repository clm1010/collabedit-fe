<template>
  <node-view-wrapper
    as="span"
    class="resizable-image-wrapper"
    :class="{
      'is-selected': selected,
      'is-resizing': isResizing,
      'is-inline': isInline,
      'is-cropping': isCropping
    }"
    :style="wrapperStyle"
  >
    <!-- ========== 裁剪模式 ========== -->
    <div
      v-if="isCropping"
      class="crop-mode-container"
      :style="cropModeContainerStyle"
    >
      <img
        ref="cropImageRef"
        :src="node.attrs.src"
        :style="cropModeImageStyle"
        draggable="false"
      />
      <div
        class="crop-frame"
        :style="cropFrameStyle"
        @mousedown.stop.prevent="startCropMove"
      >
        <div class="crop-handle crop-handle-nw" @mousedown.stop.prevent="startCropDrag($event, 'nw')"></div>
        <div class="crop-handle crop-handle-ne" @mousedown.stop.prevent="startCropDrag($event, 'ne')"></div>
        <div class="crop-handle crop-handle-sw" @mousedown.stop.prevent="startCropDrag($event, 'sw')"></div>
        <div class="crop-handle crop-handle-se" @mousedown.stop.prevent="startCropDrag($event, 'se')"></div>
        <div class="crop-handle crop-handle-n" @mousedown.stop.prevent="startCropDrag($event, 'n')"></div>
        <div class="crop-handle crop-handle-s" @mousedown.stop.prevent="startCropDrag($event, 's')"></div>
        <div class="crop-handle crop-handle-w" @mousedown.stop.prevent="startCropDrag($event, 'w')"></div>
        <div class="crop-handle crop-handle-e" @mousedown.stop.prevent="startCropDrag($event, 'e')"></div>
      </div>
      <div class="crop-toolbar">
        <button class="crop-toolbar-btn confirm" @click.stop="confirmCrop" title="确认裁剪">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <span>确认</span>
        </button>
        <button class="crop-toolbar-btn cancel" @click.stop="cancelCrop" title="取消裁剪">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          <span>取消</span>
        </button>
      </div>
    </div>

    <!-- ========== 正常模式 ========== -->
    <div
      v-else
      class="image-container"
      :style="containerStyle"
      @click="handleClick"
      @dblclick="handleDoubleClick"
    >
      <!-- 有裁剪时：用 overflow:hidden 容器 + 偏移渲染 -->
      <div v-if="hasCrop" class="crop-display" :style="cropDisplayStyle">
        <img
          ref="imageRef"
          :src="node.attrs.src"
          :alt="node.attrs.alt"
          :title="node.attrs.title"
          :style="croppedImageStyle"
          draggable="false"
          @load="handleImageLoad"
          @error="handleImageError"
        />
      </div>
      <!-- 无裁剪时：原有渲染方式 -->
      <img
        v-else
        ref="imageRef"
        :src="node.attrs.src"
        :alt="node.attrs.alt"
        :title="node.attrs.title"
        :style="imageStyle"
        draggable="false"
        @load="handleImageLoad"
        @error="handleImageError"
      />

      <div v-if="imageError" class="image-error">
        <span class="error-icon">🖼️</span>
        <span class="error-text">图片加载失败</span>
        <button class="retry-btn" @click.stop="retryLoadImage">重新加载</button>
      </div>

      <template v-if="selected && editor?.isEditable && !imageError && !isCropping">
        <div class="resize-handle resize-handle-nw" @mousedown.stop.prevent="startResize($event, 'nw')"></div>
        <div class="resize-handle resize-handle-ne" @mousedown.stop.prevent="startResize($event, 'ne')"></div>
        <div class="resize-handle resize-handle-sw" @mousedown.stop.prevent="startResize($event, 'sw')"></div>
        <div class="resize-handle resize-handle-se" @mousedown.stop.prevent="startResize($event, 'se')"></div>
        <div class="resize-handle resize-handle-n" @mousedown.stop.prevent="startResize($event, 'n')"></div>
        <div class="resize-handle resize-handle-s" @mousedown.stop.prevent="startResize($event, 's')"></div>
        <div class="resize-handle resize-handle-w" @mousedown.stop.prevent="startResize($event, 'w')"></div>
        <div class="resize-handle resize-handle-e" @mousedown.stop.prevent="startResize($event, 'e')"></div>
      </template>

      <div v-if="isResizing" class="size-tooltip">
        {{ Math.round(currentWidth) }} × {{ Math.round(currentHeight) }}
      </div>

      <div v-if="selected && editor?.isEditable && !imageError && !isCropping" class="image-toolbar">
        <button
          class="toolbar-btn"
          @click.stop="toggleDisplay"
          :title="isInline ? '转为块图片' : '转为行内图片'"
        >
          <svg v-if="isInline" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 5h18v2H3V5zm0 12h18v2H3v-2zm0-4h18v2H3v-2zm0-4h18v2H3V9z" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 5h8v2H3V5zm0 12h8v2H3v-2zm0-4h18v2H3v-2zm0-4h18v2H3V9z" />
          </svg>
        </button>
        <span class="toolbar-divider"></span>
        <button
            class="toolbar-btn"
            :class="{ active: currentAlign === 'left' }"
            @click.stop="alignImage('left')"
            title="左对齐"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v2H3V3zm0 4h12v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2zm0 4h18v2H3v-2z" />
            </svg>
          </button>
          <button
            class="toolbar-btn"
            :class="{ active: currentAlign === 'center' || !currentAlign }"
            @click.stop="alignImage('center')"
            title="居中"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v2H3V3zm3 4h12v2H6V7zm-3 4h18v2H3v-2zm3 4h12v2H6v-2zm-3 4h18v2H3v-2z" />
            </svg>
          </button>
          <button
            class="toolbar-btn"
            :class="{ active: currentAlign === 'right' }"
            @click.stop="alignImage('right')"
            title="右对齐"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v2H3V3zm6 4h12v2H9V7zm-6 4h18v2H3v-2zm6 4h12v2H9v-2zm-6 4h18v2H3v-2z" />
            </svg>
          </button>
          <span class="toolbar-divider"></span>
        <button class="toolbar-btn" @click.stop="enterCropMode" title="裁剪">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z"/>
          </svg>
        </button>
        <button v-if="hasCrop" class="toolbar-btn" @click.stop="clearCrop" title="取消裁剪">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z"/>
            <line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button class="toolbar-btn" @click.stop="previewImage" title="预览">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
            />
          </svg>
        </button>
        <button class="toolbar-btn" @click.stop="resetSize" title="重置大小">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
            />
          </svg>
        </button>
        <button class="toolbar-btn danger" @click.stop="deleteImage" title="删除">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
            />
          </svg>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showPreview" class="image-preview-overlay" @click="closePreview">
        <div class="preview-toolbar" @click.stop>
          <button class="preview-btn" @click="zoomOut" title="缩小">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"
              />
            </svg>
          </button>
          <span class="zoom-text">{{ Math.round(previewScale * 100) }}%</span>
          <button class="preview-btn" @click="zoomIn" title="放大">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm-2-4h2v2h1v-2h2v-1h-2V7h-1v2H7v1z"
              />
            </svg>
          </button>
          <button class="preview-btn" @click="resetZoom" title="重置缩放">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2zm0-10h2v8h-2z"
              />
            </svg>
          </button>
          <span class="toolbar-divider"></span>
          <button class="preview-btn" @click="downloadImage" title="下载">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
          </button>
          <button class="preview-btn close-btn" @click="closePreview" title="关闭">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>
        <div class="preview-container" @click.stop>
          <img
            :src="node.attrs.src"
            :style="{
              transform: `scale(${previewScale}) translate(${previewX}px, ${previewY}px)`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }"
            @mousedown="startDrag"
            @wheel.prevent="handleWheel"
            draggable="false"
          />
        </div>
      </div>
    </Teleport>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { logger } from '@/views/utils/logger'

const props = defineProps(nodeViewProps)

const imageRef = ref<HTMLImageElement | null>(null)
const cropImageRef = ref<HTMLImageElement | null>(null)
const isResizing = ref(false)
const imageError = ref(false)
const currentWidth = ref(0)
const currentHeight = ref(0)
const naturalWidth = ref(0)
const naturalHeight = ref(0)
const aspectRatio = ref(1)

// ── 裁剪相关状态 ──
const isCropping = ref(false)
const tempCropTop = ref(0)
const tempCropRight = ref(0)
const tempCropBottom = ref(0)
const tempCropLeft = ref(0)
let cropDragDir = ''
let cropStartX = 0
let cropStartY = 0
let cropStartTop = 0
let cropStartRight = 0
let cropStartBottom = 0
let cropStartLeft = 0

const cropT = computed(() => props.node.attrs.cropTop ?? 0)
const cropR = computed(() => props.node.attrs.cropRight ?? 0)
const cropB = computed(() => props.node.attrs.cropBottom ?? 0)
const cropL = computed(() => props.node.attrs.cropLeft ?? 0)
const hasCrop = computed(() => cropT.value > 0 || cropR.value > 0 || cropB.value > 0 || cropL.value > 0)

const visibleRatioW = computed(() => 1 - cropL.value - cropR.value)
const visibleRatioH = computed(() => 1 - cropT.value - cropB.value)

const effectiveAspectRatio = computed(() => {
  if (!naturalWidth.value || !naturalHeight.value) return 1
  if (!hasCrop.value) return naturalWidth.value / naturalHeight.value
  const visW = naturalWidth.value * visibleRatioW.value
  const visH = naturalHeight.value * visibleRatioH.value
  return visW / visH
})

// ── 预览相关状态 ──
const showPreview = ref(false)
const previewScale = ref(1)
const previewX = ref(0)
const previewY = ref(0)
const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0
let dragStartPreviewX = 0
let dragStartPreviewY = 0

const currentAlign = computed(() => props.node.attrs.align || 'center')
const isInline = computed(() => props.node.attrs.display === 'inline')

const toggleDisplay = () => {
  const newDisplay = isInline.value ? 'block' : 'inline'
  props.updateAttributes({ display: newDisplay })
}

const wrapperStyle = computed(() => {
  if (isInline.value) {
    return {
      display: 'inline-block',
      verticalAlign: 'bottom',
      maxWidth: '100%'
    }
  }
  const align = props.node.attrs.align || 'center'
  let textAlign = 'center'
  if (align === 'left') textAlign = 'left'
  else if (align === 'right') textAlign = 'right'

  return {
    display: 'block',
    textAlign,
    width: '100%',
    lineHeight: '0'
  }
})

const MAX_IMAGE_WIDTH = 540
const editorMaxWidth = ref(MAX_IMAGE_WIDTH)

let startX = 0
let startY = 0
let startWidth = 0
let startHeight = 0
let resizeDirection = ''

const containerStyle = computed(() => {
  return { maxWidth: '100%' }
})

// ── 正常模式图片样式（无裁剪） ──
const imageStyle = computed(() => {
  const base: Record<string, string> = {
    maxWidth: `${editorMaxWidth.value}px`,
    display: imageError.value ? 'none' : 'block'
  }

  if (isResizing.value) {
    base.width = `${currentWidth.value}px`
    base.height = `${currentHeight.value}px`
    return base
  }

  const w = props.node.attrs.width
  const h = props.node.attrs.height
  if (w != null && w !== '' && w !== 0) {
    const parsedW = typeof w === 'number' ? w : parseFloat(String(w))
    if (!isNaN(parsedW) && parsedW > 0) {
      base.width = `${Math.min(parsedW, editorMaxWidth.value)}px`
    } else {
      base.width = 'auto'
    }
  } else {
    base.width = 'auto'
  }

  if (h != null && h !== '' && h !== 0) {
    const parsedH = typeof h === 'number' ? h : parseFloat(String(h))
    if (!isNaN(parsedH) && parsedH > 0) {
      base.height = `${parsedH}px`
    } else {
      base.height = 'auto'
    }
  } else {
    base.height = 'auto'
  }

  return base
})

// ── 裁剪后的 CSS 渲染 ──
const cropDisplayStyle = computed(() => {
  const w = isResizing.value ? currentWidth.value : (parseFloat(String(props.node.attrs.width)) || currentWidth.value)
  const h = isResizing.value ? currentHeight.value : (parseFloat(String(props.node.attrs.height)) || currentHeight.value)
  return {
    width: w ? `${w}px` : 'auto',
    height: h ? `${h}px` : 'auto',
    overflow: 'hidden',
    display: imageError.value ? 'none' : 'inline-block',
    borderRadius: '4px',
    position: 'relative' as const
  }
})

const croppedImageStyle = computed(() => {
  const w = isResizing.value ? currentWidth.value : (parseFloat(String(props.node.attrs.width)) || currentWidth.value)
  const h = isResizing.value ? currentHeight.value : (parseFloat(String(props.node.attrs.height)) || currentHeight.value)
  if (!w || !h) return { display: 'block' }
  const vrW = visibleRatioW.value || 1
  const vrH = visibleRatioH.value || 1
  const fullW = w / vrW
  const fullH = h / vrH
  const offsetX = -(cropL.value * fullW)
  const offsetY = -(cropT.value * fullH)
  return {
    width: `${fullW}px`,
    height: `${fullH}px`,
    marginLeft: `${offsetX}px`,
    marginTop: `${offsetY}px`,
    display: 'block',
    maxWidth: 'none',
    maxHeight: 'none',
    borderRadius: '0px',
    userSelect: 'none' as const
  }
})

// ── 裁剪模式样式 ──
const cropModeFullWidth = computed(() => {
  const vrW = visibleRatioW.value || 1
  return currentWidth.value / vrW
})
const cropModeFullHeight = computed(() => {
  const vrH = visibleRatioH.value || 1
  return currentHeight.value / vrH
})

const cropModeContainerStyle = computed(() => ({
  width: `${cropModeFullWidth.value}px`,
  height: `${cropModeFullHeight.value}px`,
  position: 'relative' as const,
  display: 'inline-block'
}))

const cropModeImageStyle = computed(() => ({
  width: `${cropModeFullWidth.value}px`,
  height: `${cropModeFullHeight.value}px`,
  display: 'block',
  userSelect: 'none' as const,
  borderRadius: '4px'
}))

const cropFrameStyle = computed(() => {
  const fw = cropModeFullWidth.value
  const fh = cropModeFullHeight.value
  const left = tempCropLeft.value * fw
  const top = tempCropTop.value * fh
  const right = tempCropRight.value * fw
  const bottom = tempCropBottom.value * fh
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${fw - left - right}px`,
    height: `${fh - top - bottom}px`
  }
})

// ── 裁剪模式操作 ──
const enterCropMode = () => {
  if (!naturalWidth.value || !naturalHeight.value) return
  tempCropTop.value = cropT.value
  tempCropRight.value = cropR.value
  tempCropBottom.value = cropB.value
  tempCropLeft.value = cropL.value
  isCropping.value = true
  document.addEventListener('keydown', handleCropKeydown)
}

const confirmCrop = () => {
  const ct = round4(tempCropTop.value)
  const cr = round4(tempCropRight.value)
  const cb = round4(tempCropBottom.value)
  const cl = round4(tempCropLeft.value)
  const hasAnyCrop = ct > 0 || cr > 0 || cb > 0 || cl > 0

  if (hasAnyCrop) {
    const oldVrW = visibleRatioW.value || 1
    const oldVrH = visibleRatioH.value || 1
    const fullW = currentWidth.value / oldVrW
    const fullH = currentHeight.value / oldVrH
    const newVrW = 1 - cl - cr
    const newVrH = 1 - ct - cb
    const newW = Math.round(fullW * newVrW)
    const newH = Math.round(fullH * newVrH)
    props.updateAttributes({
      cropTop: ct, cropRight: cr, cropBottom: cb, cropLeft: cl,
      width: newW, height: newH
    })
    currentWidth.value = newW
    currentHeight.value = newH
  } else {
    const fullW = currentWidth.value / (visibleRatioW.value || 1)
    const fullH = currentHeight.value / (visibleRatioH.value || 1)
    props.updateAttributes({
      cropTop: null, cropRight: null, cropBottom: null, cropLeft: null,
      width: Math.round(fullW), height: Math.round(fullH)
    })
    currentWidth.value = fullW
    currentHeight.value = fullH
  }

  isCropping.value = false
  document.removeEventListener('keydown', handleCropKeydown)
}

const cancelCrop = () => {
  isCropping.value = false
  document.removeEventListener('keydown', handleCropKeydown)
}

const clearCrop = () => {
  if (!hasCrop.value) return
  const fullW = currentWidth.value / (visibleRatioW.value || 1)
  const fullH = currentHeight.value / (visibleRatioH.value || 1)
  props.updateAttributes({
    cropTop: null, cropRight: null, cropBottom: null, cropLeft: null,
    width: Math.round(fullW), height: Math.round(fullH)
  })
  currentWidth.value = fullW
  currentHeight.value = fullH
}

const handleCropKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    confirmCrop()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelCrop()
  }
}

const round4 = (v: number) => Math.round(v * 10000) / 10000

const MIN_CROP_PX = 20

const startCropDrag = (event: MouseEvent, direction: string) => {
  cropDragDir = direction
  cropStartX = event.clientX
  cropStartY = event.clientY
  cropStartTop = tempCropTop.value
  cropStartRight = tempCropRight.value
  cropStartBottom = tempCropBottom.value
  cropStartLeft = tempCropLeft.value
  document.addEventListener('mousemove', handleCropDrag)
  document.addEventListener('mouseup', stopCropDrag)
}

const handleCropDrag = (event: MouseEvent) => {
  const fw = cropModeFullWidth.value
  const fh = cropModeFullHeight.value
  const dx = (event.clientX - cropStartX) / fw
  const dy = (event.clientY - cropStartY) / fh
  const minFrac = MIN_CROP_PX / Math.max(fw, fh)
  const maxT = () => 1 - tempCropBottom.value - minFrac / (fh / Math.max(fw, fh))
  const maxB = () => 1 - tempCropTop.value - minFrac / (fh / Math.max(fw, fh))
  const maxL = () => 1 - tempCropRight.value - minFrac / (fw / Math.max(fw, fh))
  const maxR = () => 1 - tempCropLeft.value - minFrac / (fw / Math.max(fw, fh))

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

  if (cropDragDir.includes('n')) {
    tempCropTop.value = clamp(cropStartTop + dy, 0, maxT())
  }
  if (cropDragDir.includes('s')) {
    tempCropBottom.value = clamp(cropStartBottom - dy, 0, maxB())
  }
  if (cropDragDir.includes('w')) {
    tempCropLeft.value = clamp(cropStartLeft + dx, 0, maxL())
  }
  if (cropDragDir.includes('e')) {
    tempCropRight.value = clamp(cropStartRight - dx, 0, maxR())
  }
}

const stopCropDrag = () => {
  cropDragDir = ''
  document.removeEventListener('mousemove', handleCropDrag)
  document.removeEventListener('mouseup', stopCropDrag)
}

const startCropMove = (event: MouseEvent) => {
  if ((event.target as HTMLElement)?.classList?.contains('crop-handle')) return
  cropDragDir = 'move'
  cropStartX = event.clientX
  cropStartY = event.clientY
  cropStartTop = tempCropTop.value
  cropStartRight = tempCropRight.value
  cropStartBottom = tempCropBottom.value
  cropStartLeft = tempCropLeft.value
  document.addEventListener('mousemove', handleCropMove)
  document.addEventListener('mouseup', stopCropMove)
}

const handleCropMove = (event: MouseEvent) => {
  const fw = cropModeFullWidth.value
  const fh = cropModeFullHeight.value
  const dx = (event.clientX - cropStartX) / fw
  const dy = (event.clientY - cropStartY) / fh

  const frameW = 1 - cropStartLeft - cropStartRight
  const frameH = 1 - cropStartTop - cropStartBottom

  let newLeft = cropStartLeft + dx
  let newTop = cropStartTop + dy
  newLeft = Math.max(0, Math.min(newLeft, 1 - frameW))
  newTop = Math.max(0, Math.min(newTop, 1 - frameH))

  tempCropLeft.value = newLeft
  tempCropRight.value = 1 - newLeft - frameW
  tempCropTop.value = newTop
  tempCropBottom.value = 1 - newTop - frameH
}

const stopCropMove = () => {
  cropDragDir = ''
  document.removeEventListener('mousemove', handleCropMove)
  document.removeEventListener('mouseup', stopCropMove)
}

// ── 图片加载与错误处理 ──
const handleImageLoad = () => {
  imageError.value = false
  if (!imageRef.value) return
  const editorEl = imageRef.value.closest('.ProseMirror') as HTMLElement | null
  if (editorEl?.clientWidth) {
    editorMaxWidth.value = editorEl.clientWidth
  }
  naturalWidth.value = imageRef.value.naturalWidth
  naturalHeight.value = imageRef.value.naturalHeight
  aspectRatio.value = naturalWidth.value / naturalHeight.value

  if (!props.node.attrs.width) {
    const baseNatW = hasCrop.value
      ? naturalWidth.value * visibleRatioW.value
      : naturalWidth.value
    const maxW = isInline.value
      ? Math.min(baseNatW, Math.round(editorMaxWidth.value * 0.5))
      : Math.min(baseNatW, editorMaxWidth.value)
    currentWidth.value = maxW
    currentHeight.value = currentWidth.value / effectiveAspectRatio.value
    return
  }

  const originalWidth = parseFloat(props.node.attrs.width) || naturalWidth.value
  const originalHeight = props.node.attrs.height
    ? parseFloat(props.node.attrs.height)
    : undefined

  // 1) 先按编辑器最大宽度等比缩放（宽高同时按同一系数，保留 docx 的宽高比）
  let scale = 1
  if (originalWidth > editorMaxWidth.value) {
    scale = editorMaxWidth.value / originalWidth
  }
  let parsedWidth = originalWidth * scale
  let parsedHeight = originalHeight !== undefined ? originalHeight * scale : undefined

  // 2) 如果只有宽度而没有高度，使用自然宽度（考虑 crop）避免导入后被过度压缩
  if (!props.node.attrs.height && naturalWidth.value && !isInline.value) {
    const natBase = hasCrop.value
      ? naturalWidth.value * visibleRatioW.value
      : naturalWidth.value
    parsedWidth = Math.min(natBase, editorMaxWidth.value)
    parsedHeight = undefined
    props.updateAttributes({ width: Math.round(parsedWidth) })
  }

  currentWidth.value = parsedWidth

  if (parsedHeight !== undefined) {
    // 3) 只在 docx 声明的纵横比与（考虑 crop 后的）自然纵横比 "严重" 不一致时才回退。
    //    阈值放宽到 25%：Word 里常见 1%~8% 的 EMU 整数舍入漂移不应触发回退；
    //    真正被 Word 显式拉伸/裁剪的图也通常按作者意图保留。
    const expectedRatio = (() => {
      if (!naturalWidth.value || !naturalHeight.value) return 0
      if (hasCrop.value) {
        return (naturalHeight.value * visibleRatioH.value) / (naturalWidth.value * visibleRatioW.value)
      }
      return naturalHeight.value / naturalWidth.value
    })()
    const declaredRatio = originalWidth
      ? (originalHeight ?? originalWidth) / originalWidth
      : 0
    const ratioDiff =
      expectedRatio > 0 && declaredRatio > 0
        ? Math.abs(declaredRatio - expectedRatio) / expectedRatio
        : 0

    if (expectedRatio && ratioDiff > 0.25) {
      logger.debug('[image] declared aspect ratio differs >25% from natural, fallback', {
        src: String(props.node.attrs.src || '').slice(0, 80),
        declaredRatio: Number(declaredRatio.toFixed(3)),
        expectedRatio: Number(expectedRatio.toFixed(3)),
        originalWidth,
        originalHeight,
        naturalWidth: naturalWidth.value,
        naturalHeight: naturalHeight.value
      })
      props.updateAttributes({ height: null })
      currentHeight.value = currentWidth.value / effectiveAspectRatio.value
    } else {
      currentHeight.value = parsedHeight
    }
  } else {
    currentHeight.value = currentWidth.value / effectiveAspectRatio.value
  }

  // 4) 若应用了缩放（宽度被裁剪或等比缩放过），同步把裁剪后的宽高回写节点属性，
  //    避免下次渲染再走一次 "docx 原尺寸 → 裁剪 → 回写" 流程。
  if (scale !== 1) {
    props.updateAttributes({
      width: Math.round(currentWidth.value),
      height: Math.round(currentHeight.value)
    })
  }
}

const handleImageError = () => {
  const src = props.node.attrs.src || ''
  const originSrc = props.node.attrs['data-origin-src'] || ''
  if (src.startsWith('blob:') && originSrc.startsWith('data:')) {
    logger.warn('[image] blob URL 失效，回退到 data-origin-src')
    props.updateAttributes({ src: originSrc })
    return
  }
  imageError.value = true
}

const retryLoadImage = () => {
  imageError.value = false
  const src = props.node.attrs.src || ''
  const originSrc = props.node.attrs['data-origin-src'] || ''
  if (src.startsWith('blob:') && originSrc.startsWith('data:')) {
    logger.warn('[image] 重试：blob URL 可能已失效，回退到 data-origin-src')
    props.updateAttributes({ src: originSrc })
    return
  }
  if (imageRef.value) {
    imageRef.value.src = ''
    requestAnimationFrame(() => {
      if (imageRef.value) imageRef.value.src = src
    })
  }
}

const handleClick = () => {}

const handleDoubleClick = () => {
  if (props.node.attrs.src && !imageError.value) {
    previewImage()
  }
}

const alignImage = (align: string) => {
  if (isInline.value) {
    props.updateAttributes({ display: 'block', align })
  } else {
    props.updateAttributes({ align })
  }
}

const resetSize = () => {
  if (naturalWidth.value && naturalHeight.value) {
    let targetNatW = naturalWidth.value
    let targetNatH = naturalHeight.value
    if (hasCrop.value) {
      targetNatW = naturalWidth.value * visibleRatioW.value
      targetNatH = naturalHeight.value * visibleRatioH.value
    }
    const newWidth = Math.min(targetNatW, MAX_IMAGE_WIDTH)
    const newHeight = newWidth / (targetNatW / targetNatH)
    currentWidth.value = newWidth
    currentHeight.value = newHeight
    props.updateAttributes({
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    })
  }
}

const deleteImage = () => { props.deleteNode() }

const previewImage = () => {
  showPreview.value = true
  previewScale.value = 1
  previewX.value = 0
  previewY.value = 0
  document.addEventListener('keydown', handlePreviewKeydown)
}

const closePreview = () => {
  showPreview.value = false
  document.removeEventListener('keydown', handlePreviewKeydown)
}

const handlePreviewKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') closePreview()
  else if (e.key === '+' || e.key === '=') zoomIn()
  else if (e.key === '-') zoomOut()
}

const zoomIn = () => { previewScale.value = Math.min(previewScale.value * 1.2, 5) }
const zoomOut = () => { previewScale.value = Math.max(previewScale.value / 1.2, 0.1) }
const resetZoom = () => { previewScale.value = 1; previewX.value = 0; previewY.value = 0 }

const handleWheel = (e: WheelEvent) => { e.deltaY < 0 ? zoomIn() : zoomOut() }

const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartPreviewX = previewX.value
  dragStartPreviewY = previewY.value
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
}

const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  previewX.value = dragStartPreviewX + (e.clientX - dragStartX) / previewScale.value
  previewY.value = dragStartPreviewY + (e.clientY - dragStartY) / previewScale.value
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const downloadImage = async () => {
  const src = props.node.attrs.src
  const filename = props.node.attrs.alt || 'image'
  try {
    if (src.startsWith('data:')) {
      const response = await fetch(src)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = filename
      document.body.appendChild(link); link.click(); document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else {
      try {
        const response = await fetch(src, { mode: 'cors' })
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url; link.download = filename
        document.body.appendChild(link); link.click(); document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch { window.open(src, '_blank') }
    }
  } catch (error) {
    logger.error('下载图片失败:', error)
    window.open(src, '_blank')
  }
}

// ── Resize ──
const startResize = (event: MouseEvent, direction: string) => {
  if (!props.editor?.isEditable) return
  isResizing.value = true
  resizeDirection = direction
  startX = event.clientX
  startY = event.clientY
  startWidth = currentWidth.value || (imageRef.value?.offsetWidth ?? 0)
  startHeight = currentHeight.value || (imageRef.value?.offsetHeight ?? 0)
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

const handleResize = (event: MouseEvent) => {
  if (!isResizing.value) return
  const deltaX = event.clientX - startX
  const deltaY = event.clientY - startY
  const ar = effectiveAspectRatio.value
  let newWidth = startWidth
  let newHeight = startHeight

  switch (resizeDirection) {
    case 'e': newWidth = startWidth + deltaX; newHeight = newWidth / ar; break
    case 'w': newWidth = startWidth - deltaX; newHeight = newWidth / ar; break
    case 's': newHeight = startHeight + deltaY; newWidth = newHeight * ar; break
    case 'n': newHeight = startHeight - deltaY; newWidth = newHeight * ar; break
    case 'se':
      if (event.shiftKey) { newWidth = startWidth + deltaX; newHeight = newWidth / ar }
      else { newWidth = startWidth + deltaX; newHeight = startHeight + deltaY }
      break
    case 'sw':
      if (event.shiftKey) { newWidth = startWidth - deltaX; newHeight = newWidth / ar }
      else { newWidth = startWidth - deltaX; newHeight = startHeight + deltaY }
      break
    case 'ne':
      if (event.shiftKey) { newWidth = startWidth + deltaX; newHeight = newWidth / ar }
      else { newWidth = startWidth + deltaX; newHeight = startHeight - deltaY }
      break
    case 'nw':
      if (event.shiftKey) { newWidth = startWidth - deltaX; newHeight = newWidth / ar }
      else { newWidth = startWidth - deltaX; newHeight = startHeight - deltaY }
      break
  }

  newWidth = Math.max(50, Math.min(newWidth, MAX_IMAGE_WIDTH))
  newHeight = Math.max(50, Math.min(newHeight, 900))
  currentWidth.value = newWidth
  currentHeight.value = newHeight
}

const stopResize = () => {
  if (!isResizing.value) return
  isResizing.value = false
  props.updateAttributes({
    width: Math.round(currentWidth.value),
    height: Math.round(currentHeight.value)
  })
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

onMounted(() => {
  if (props.node.attrs.width) {
    let parsedWidth = parseFloat(props.node.attrs.width)
    if (parsedWidth > editorMaxWidth.value) parsedWidth = editorMaxWidth.value
    currentWidth.value = parsedWidth
  }
  if (props.node.attrs.height) {
    currentHeight.value = parseFloat(props.node.attrs.height)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('keydown', handlePreviewKeydown)
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('keydown', handleCropKeydown)
  document.removeEventListener('mousemove', handleCropDrag)
  document.removeEventListener('mouseup', stopCropDrag)
  document.removeEventListener('mousemove', handleCropMove)
  document.removeEventListener('mouseup', stopCropMove)
})
</script>

<style lang="scss" scoped>
.resizable-image-wrapper {
  display: block !important;
  position: relative;
  line-height: 0;
  margin: 8px 0;
  text-align: center;
  width: 100% !important;
  height: auto !important;
  min-height: fit-content !important;
  overflow: visible !important;

  &.is-resizing .image-container {
    outline: 2px dashed #1a73e8;
  }

  &.is-inline {
    display: inline-block !important;
    width: auto !important;
    margin: 0 4px;
    vertical-align: bottom;
    line-height: 1;
  }

  &.is-cropping {
    z-index: 50;
  }
}

.image-container {
  position: relative;
  display: inline-block !important;
  border-radius: 4px;
  overflow: visible !important;
  transition: outline 0.15s ease;
  height: auto !important;
  min-height: fit-content !important;

  img {
    border-radius: 4px;
    cursor: default;
    user-select: none;
    display: block !important;
    max-height: none !important;
  }
}

.crop-display {
  display: inline-block;
  line-height: 0;
}

// ── 裁剪模式 ──
.crop-mode-container {
  display: inline-block;
  border-radius: 4px;
  overflow: visible;

  img {
    display: block;
    user-select: none;
  }
}

.crop-frame {
  position: absolute;
  border: 2px dashed #fff;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  cursor: move;
  z-index: 10;
}

.crop-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #fff;
  border: 2px solid #1a73e8;
  border-radius: 2px;
  z-index: 11;

  &:hover {
    background: #1a73e8;
  }

  &.crop-handle-nw { top: -5px; left: -5px; cursor: nw-resize; }
  &.crop-handle-ne { top: -5px; right: -5px; cursor: ne-resize; }
  &.crop-handle-sw { bottom: -5px; left: -5px; cursor: sw-resize; }
  &.crop-handle-se { bottom: -5px; right: -5px; cursor: se-resize; }
  &.crop-handle-n { top: -5px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
  &.crop-handle-s { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
  &.crop-handle-w { top: 50%; left: -5px; transform: translateY(-50%); cursor: w-resize; }
  &.crop-handle-e { top: 50%; right: -5px; transform: translateY(-50%); cursor: e-resize; }
}

.crop-toolbar {
  position: absolute;
  bottom: -44px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 20;
  white-space: nowrap;
}

.crop-toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;

  &.confirm {
    background: #1a73e8;
    color: #fff;
    &:hover { background: #1557b0; }
  }

  &.cancel {
    background: #f0f0f0;
    color: #666;
    &:hover { background: #e0e0e0; color: #333; }
  }

  svg { width: 16px; height: 16px; }
}

// ── Resize 手柄 ──
.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #fff;
  border: 2px solid #1a73e8;
  border-radius: 2px;
  z-index: 10;

  &:hover { background: #1a73e8; }

  &.resize-handle-nw { top: -5px; left: -5px; cursor: nw-resize; }
  &.resize-handle-ne { top: -5px; right: -5px; cursor: ne-resize; }
  &.resize-handle-sw { bottom: -5px; left: -5px; cursor: sw-resize; }
  &.resize-handle-se { bottom: -5px; right: -5px; cursor: se-resize; }
  &.resize-handle-n { top: -5px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
  &.resize-handle-s { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
  &.resize-handle-w { top: 50%; left: -5px; transform: translateY(-50%); cursor: w-resize; }
  &.resize-handle-e { top: 50%; right: -5px; transform: translateY(-50%); cursor: e-resize; }
}

.size-tooltip {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 20;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 200px;
  min-height: 150px;
  background: #f5f5f5;
  border: 1px dashed #ccc;
  border-radius: 4px;
  color: #999;

  .error-icon { font-size: 48px; margin-bottom: 8px; }
  .error-text { font-size: 12px; }

  .retry-btn {
    margin-top: 8px;
    padding: 4px 16px;
    border: 1px solid #409eff;
    border-radius: 4px;
    background: #fff;
    color: #409eff;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    &:hover { background: #409eff; color: #fff; }
  }
}

.image-toolbar {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 20;

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    color: #666;
    transition: all 0.15s ease;

    &:hover { background: #f0f0f0; color: #333; }
    &.active { background: #e8f0fe; color: #1a73e8; }
    &.danger:hover { background: #fee2e2; color: #dc2626; }
    svg { width: 16px; height: 16px; }
  }

  .toolbar-divider {
    width: 1px;
    height: 16px;
    background: #e0e0e0;
    margin: 0 4px;
  }
}

.image-preview-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .preview-toolbar {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    z-index: 10001;

    .preview-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px; height: 36px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      color: #666;
      transition: all 0.15s ease;
      &:hover { background: #f0f0f0; color: #333; }
      &.close-btn:hover { background: #fee2e2; color: #dc2626; }
    }

    .zoom-text {
      min-width: 50px;
      text-align: center;
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }

    .toolbar-divider {
      width: 1px; height: 20px;
      background: #e0e0e0;
      margin: 0 4px;
    }
  }

  .preview-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%; height: 100%;
    overflow: hidden;

    img {
      max-width: 90vw;
      max-height: 85vh;
      object-fit: contain;
      transition: transform 0.1s ease;
      user-select: none;
    }
  }
}
</style>
