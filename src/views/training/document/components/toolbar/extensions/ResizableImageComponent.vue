<template>
  <node-view-wrapper
    class="resizable-image-wrapper"
    :class="{
      'is-selected': selected,
      'is-resizing': isResizing
    }"
    :style="wrapperStyle"
  >
    <div
      class="image-container"
      :style="containerStyle"
      @click="handleClick"
      @dblclick="handleDoubleClick"
    >
      <img
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

      <template v-if="selected && editor?.isEditable && !imageError">
        <div
          class="resize-handle resize-handle-nw"
          @mousedown.stop.prevent="startResize($event, 'nw')"
        ></div>
        <div
          class="resize-handle resize-handle-ne"
          @mousedown.stop.prevent="startResize($event, 'ne')"
        ></div>
        <div
          class="resize-handle resize-handle-sw"
          @mousedown.stop.prevent="startResize($event, 'sw')"
        ></div>
        <div
          class="resize-handle resize-handle-se"
          @mousedown.stop.prevent="startResize($event, 'se')"
        ></div>
        <div
          class="resize-handle resize-handle-n"
          @mousedown.stop.prevent="startResize($event, 'n')"
        ></div>
        <div
          class="resize-handle resize-handle-s"
          @mousedown.stop.prevent="startResize($event, 's')"
        ></div>
        <div
          class="resize-handle resize-handle-w"
          @mousedown.stop.prevent="startResize($event, 'w')"
        ></div>
        <div
          class="resize-handle resize-handle-e"
          @mousedown.stop.prevent="startResize($event, 'e')"
        ></div>
      </template>

      <div v-if="isResizing" class="size-tooltip">
        {{ Math.round(currentWidth) }} × {{ Math.round(currentHeight) }}
      </div>

      <div v-if="selected && editor?.isEditable && !imageError" class="image-toolbar">
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
const isResizing = ref(false)
const imageError = ref(false)
const currentWidth = ref(0)
const currentHeight = ref(0)
const naturalWidth = ref(0)
const naturalHeight = ref(0)
const aspectRatio = ref(1)

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

const wrapperStyle = computed(() => {
  const align = props.node.attrs.align || 'center'
  let justifyContent = 'center'

  if (align === 'left') {
    justifyContent = 'flex-start'
  } else if (align === 'right') {
    justifyContent = 'flex-end'
  }

  return {
    display: 'flex',
    justifyContent,
    width: '100%',
    height: 'auto',
    minHeight: 'fit-content',
    overflow: 'visible'
  }
})

// 编辑器可用宽度（A4 页面宽度 794px - 左右边距 120*2 = 554px，留一些余量）
const MAX_IMAGE_WIDTH = 540
const editorMaxWidth = ref(MAX_IMAGE_WIDTH)

let startX = 0
let startY = 0
let startWidth = 0
let startHeight = 0
let resizeDirection = ''

const containerStyle = computed(() => {
  // 完全不限制容器尺寸，让图片自然显示
  return {
    maxWidth: '100%'
  }
})

const imageStyle = computed(() => {
  // 图片最大宽度为编辑器宽度，高度自动按比例缩放
  return {
    maxWidth: `${editorMaxWidth.value}px`,
    width: 'auto',
    height: 'auto',
    display: imageError.value ? 'none' : 'block'
  }
})

const handleImageLoad = () => {
  imageError.value = false
  if (imageRef.value) {
    const editorEl = imageRef.value.closest('.ProseMirror') as HTMLElement | null
    if (editorEl?.clientWidth) {
      editorMaxWidth.value = editorEl.clientWidth
    }
    naturalWidth.value = imageRef.value.naturalWidth
    naturalHeight.value = imageRef.value.naturalHeight
    aspectRatio.value = naturalWidth.value / naturalHeight.value

    // 如果没有设置宽高，使用自然尺寸（限制最大宽度）
    if (!props.node.attrs.width) {
      currentWidth.value = Math.min(naturalWidth.value, editorMaxWidth.value)
      currentHeight.value = currentWidth.value / aspectRatio.value
    } else {
      let parsedWidth = parseFloat(props.node.attrs.width) || naturalWidth.value
      // 限制宽度不超过编辑器可用宽度
      if (parsedWidth > editorMaxWidth.value) {
        parsedWidth = editorMaxWidth.value
      }
      // 只有宽度且没有高度时，使用自然宽度（避免导入后被过度压缩）
      if (!props.node.attrs.height && naturalWidth.value) {
        parsedWidth = Math.min(naturalWidth.value, editorMaxWidth.value)
        props.updateAttributes({
          width: Math.round(parsedWidth)
        })
      }
      currentWidth.value = parsedWidth
      const parsedHeight = props.node.attrs.height ? parseFloat(props.node.attrs.height) : undefined
      if (parsedHeight) {
        const expectedRatio = naturalHeight.value / naturalWidth.value
        const actualRatio = parsedHeight / parsedWidth
        if (expectedRatio && Math.abs(actualRatio - expectedRatio) > 0.02) {
          logger.warn('[image] height mismatch, drop height', {
            src: String(props.node.attrs.src || '').slice(0, 80),
            parsedWidth,
            parsedHeight,
            naturalWidth: naturalWidth.value,
            naturalHeight: naturalHeight.value
          })
          props.updateAttributes({
            height: null
          })
          currentHeight.value = currentWidth.value / aspectRatio.value
        } else {
          currentHeight.value = parsedHeight
        }
      } else {
        currentHeight.value = currentWidth.value / aspectRatio.value
      }

      // 如果宽度被限制了，更新节点属性
      if (parsedWidth !== parseFloat(props.node.attrs.width)) {
        props.updateAttributes({
          width: Math.round(currentWidth.value),
          height: Math.round(currentHeight.value)
        })
      }
    }
  }
}

const handleImageError = () => {
  const src = props.node.attrs.src || ''
  const originSrc = props.node.attrs['data-origin-src'] || ''

  // 如果当前是 blob URL 且保留了原始 data URL，自动回退到原始 URL 恢复显示
  if (src.startsWith('blob:') && originSrc.startsWith('data:')) {
    logger.warn('[image] blob URL 失效，回退到 data-origin-src')
    props.updateAttributes({ src: originSrc })
    return // 不标记错误，等待 data URL 加载
  }

  imageError.value = true
}

// 重新加载图片（失败后重试）
const retryLoadImage = () => {
  imageError.value = false

  const src = props.node.attrs.src || ''
  const originSrc = props.node.attrs['data-origin-src'] || ''

  // 如果当前是 blob URL 且保留了原始 data URL，切换到原始 URL
  if (src.startsWith('blob:') && originSrc.startsWith('data:')) {
    logger.warn('[image] 重试：blob URL 可能已失效，回退到 data-origin-src')
    props.updateAttributes({ src: originSrc })
    return
  }

  // 通过清空再赋值触发重新加载
  if (imageRef.value) {
    imageRef.value.src = ''
    requestAnimationFrame(() => {
      if (imageRef.value) {
        imageRef.value.src = src
      }
    })
  }
}

const handleClick = () => {
}

const handleDoubleClick = () => {
  if (props.node.attrs.src) {
    window.open(props.node.attrs.src, '_blank')
  }
}

const alignImage = (align: string) => {
  props.updateAttributes({ align })
}

const resetSize = () => {
  if (naturalWidth.value && naturalHeight.value) {
    const newWidth = Math.min(naturalWidth.value, MAX_IMAGE_WIDTH)
    const newHeight = newWidth / aspectRatio.value
    currentWidth.value = newWidth
    currentHeight.value = newHeight
    props.updateAttributes({
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    })
  }
}

const deleteImage = () => {
  props.deleteNode()
}

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
  if (e.key === 'Escape') {
    closePreview()
  } else if (e.key === '+' || e.key === '=') {
    zoomIn()
  } else if (e.key === '-') {
    zoomOut()
  }
}

const zoomIn = () => {
  previewScale.value = Math.min(previewScale.value * 1.2, 5)
}

const zoomOut = () => {
  previewScale.value = Math.max(previewScale.value / 1.2, 0.1)
}

const resetZoom = () => {
  previewScale.value = 1
  previewX.value = 0
  previewY.value = 0
}

const handleWheel = (e: WheelEvent) => {
  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

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
  const deltaX = (e.clientX - dragStartX) / previewScale.value
  const deltaY = (e.clientY - dragStartY) / previewScale.value
  previewX.value = dragStartPreviewX + deltaX
  previewY.value = dragStartPreviewY + deltaY
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
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)
    } else {
      try {
        const response = await fetch(src, { mode: 'cors' })
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch {
        window.open(src, '_blank')
      }
    }
  } catch (error) {
    logger.error('下载图片失败:', error)
    window.open(src, '_blank')
  }
}

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

  let newWidth = startWidth
  let newHeight = startHeight

  switch (resizeDirection) {
    case 'e':
      newWidth = startWidth + deltaX
      newHeight = newWidth / aspectRatio.value
      break
    case 'w':
      newWidth = startWidth - deltaX
      newHeight = newWidth / aspectRatio.value
      break
    case 's':
      newHeight = startHeight + deltaY
      newWidth = newHeight * aspectRatio.value
      break
    case 'n':
      newHeight = startHeight - deltaY
      newWidth = newHeight * aspectRatio.value
      break
    case 'se':
      if (event.shiftKey) {
        newWidth = startWidth + deltaX
        newHeight = newWidth / aspectRatio.value
      } else {
        newWidth = startWidth + deltaX
        newHeight = startHeight + deltaY
      }
      break
    case 'sw':
      if (event.shiftKey) {
        newWidth = startWidth - deltaX
        newHeight = newWidth / aspectRatio.value
      } else {
        newWidth = startWidth - deltaX
        newHeight = startHeight + deltaY
      }
      break
    case 'ne':
      if (event.shiftKey) {
        newWidth = startWidth + deltaX
        newHeight = newWidth / aspectRatio.value
      } else {
        newWidth = startWidth + deltaX
        newHeight = startHeight - deltaY
      }
      break
    case 'nw':
      if (event.shiftKey) {
        newWidth = startWidth - deltaX
        newHeight = newWidth / aspectRatio.value
      } else {
        newWidth = startWidth - deltaX
        newHeight = startHeight - deltaY
      }
      break
  }

  newWidth = Math.max(50, newWidth)
  newHeight = Math.max(50, newHeight)

  newWidth = Math.min(newWidth, MAX_IMAGE_WIDTH)
  newHeight = Math.min(newHeight, 900)

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
    // 限制宽度不超过编辑器可用宽度
    if (parsedWidth > editorMaxWidth.value) {
      parsedWidth = editorMaxWidth.value
    }
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
})
</script>

<style lang="scss" scoped>
.resizable-image-wrapper {
  display: flex !important;
  position: relative;
  line-height: 0;
  margin: 8px 0;
  justify-content: center;
  width: 100% !important;
  height: auto !important;
  min-height: fit-content !important;
  overflow: visible !important;

  &.is-selected .image-container {
    outline: 2px solid #1a73e8;
    outline-offset: 2px;
  }

  &.is-resizing .image-container {
    outline: 2px dashed #1a73e8;
  }

  &.align-left {
    justify-content: flex-start;
  }

  &.align-center {
    justify-content: center;
  }

  &.align-right {
    justify-content: flex-end;
  }
}

.image-container {
  position: relative;
  display: block !important;
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
    height: auto !important;
    max-height: none !important;
  }
}

// 调整大小手柄
.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #fff;
  border: 2px solid #1a73e8;
  border-radius: 2px;
  z-index: 10;

  &:hover {
    background: #1a73e8;
  }

  // 四角
  &.resize-handle-nw {
    top: -5px;
    left: -5px;
    cursor: nw-resize;
  }

  &.resize-handle-ne {
    top: -5px;
    right: -5px;
    cursor: ne-resize;
  }

  &.resize-handle-sw {
    bottom: -5px;
    left: -5px;
    cursor: sw-resize;
  }

  &.resize-handle-se {
    bottom: -5px;
    right: -5px;
    cursor: se-resize;
  }

  // 四边中点
  &.resize-handle-n {
    top: -5px;
    left: 50%;
    transform: translateX(-50%);
    cursor: n-resize;
  }

  &.resize-handle-s {
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    cursor: s-resize;
  }

  &.resize-handle-w {
    top: 50%;
    left: -5px;
    transform: translateY(-50%);
    cursor: w-resize;
  }

  &.resize-handle-e {
    top: 50%;
    right: -5px;
    transform: translateY(-50%);
    cursor: e-resize;
  }
}

// 尺寸提示
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

// 图片加载失败
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

  .error-icon {
    font-size: 48px;
    margin-bottom: 8px;
  }

  .error-text {
    font-size: 12px;
  }

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

    &:hover {
      background: #409eff;
      color: #fff;
    }
  }
}

// 图片工具栏
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

    &:hover {
      background: #f0f0f0;
      color: #333;
    }

    &.active {
      background: #e8f0fe;
      color: #1a73e8;
    }

    &.danger:hover {
      background: #fee2e2;
      color: #dc2626;
    }

    svg {
      width: 16px;
      height: 16px;
    }
  }

  .toolbar-divider {
    width: 1px;
    height: 16px;
    background: #e0e0e0;
    margin: 0 4px;
  }
}

// 图片预览弹窗
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      color: #666;
      transition: all 0.15s ease;

      &:hover {
        background: #f0f0f0;
        color: #333;
      }

      &.close-btn:hover {
        background: #fee2e2;
        color: #dc2626;
      }
    }

    .zoom-text {
      min-width: 50px;
      text-align: center;
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }

    .toolbar-divider {
      width: 1px;
      height: 20px;
      background: #e0e0e0;
      margin: 0 4px;
    }
  }

  .preview-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
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
