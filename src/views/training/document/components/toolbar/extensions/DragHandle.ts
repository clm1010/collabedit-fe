/**
 * Tiptap 块级拖动手柄扩展
 * 支持拖动段落、标题、列表等块级元素
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, NodeSelection, TextSelection } from '@tiptap/pm/state'

export interface DragHandleOptions {
  dragHandleWidth: number
}

const DragHandlePluginKey = new PluginKey('dragHandle')

export const DragHandle = Extension.create<DragHandleOptions>({
  name: 'dragHandle',

  addOptions() {
    return {
      dragHandleWidth: 24
    }
  },

  addProseMirrorPlugins() {
    let dragHandleElement: HTMLElement | null = null
    let currentNode: HTMLElement | null = null
    let currentNodePos: number | null = null
    let draggedNodeData: { node: any; pos: number } | null = null
    let isDragging = false
    let hideTimeout: ReturnType<typeof setTimeout> | null = null
    const editorView = this.editor.view

    // 处理 drop 事件
    const handleDrop = (event: DragEvent) => {
      if (!isDragging || !draggedNodeData) return

      event.preventDefault()
      event.stopPropagation()

      // 检查是否在编辑器区域内
      const editorRect = editorView.dom.getBoundingClientRect()
      if (
        event.clientX < editorRect.left ||
        event.clientX > editorRect.right ||
        event.clientY < editorRect.top ||
        event.clientY > editorRect.bottom
      ) {
        // 不在编辑器内，取消操作
        cleanupDrag()
        return
      }

      // 获取放置位置
      const coordinates = editorView.posAtCoords({
        left: event.clientX,
        top: event.clientY
      })

      if (!coordinates) {
        cleanupDrag()
        return
      }

      const dropPos = coordinates.pos
      const $dropPos = editorView.state.doc.resolve(dropPos)

      // 找到放置位置对应的块级节点的起始位置
      let targetPos: number
      try {
        // 获取放置位置所在的块级节点
        const depth = $dropPos.depth
        if (depth === 0) {
          // 在文档根级别
          targetPos = dropPos
        } else {
          // 获取当前块的起始位置
          targetPos = $dropPos.before(depth)
        }
      } catch {
        cleanupDrag()
        return
      }

      const sourcePos = draggedNodeData.pos
      const sourceNode = draggedNodeData.node

      // 如果目标位置和源位置相同或相邻，不做操作
      if (targetPos === sourcePos || targetPos === sourcePos + sourceNode.nodeSize) {
        cleanupDrag()
        return
      }

      try {
        const tr = editorView.state.tr

        // 检查源节点是否还存在
        const currentSourceNode = editorView.state.doc.nodeAt(sourcePos)
        if (!currentSourceNode || currentSourceNode.type.name !== sourceNode.type.name) {
          cleanupDrag()
          return
        }

        // 如果目标位置在源节点之后，需要先删除源节点，再插入
        // 如果目标位置在源节点之前，需要先插入，再删除
        if (targetPos > sourcePos) {
          // 先删除源节点
          tr.delete(sourcePos, sourcePos + sourceNode.nodeSize)
          // 计算新的插入位置（考虑删除后的偏移）
          const adjustedTargetPos = targetPos - sourceNode.nodeSize
          // 插入节点
          tr.insert(adjustedTargetPos, sourceNode)
        } else {
          // 先插入到目标位置
          tr.insert(targetPos, sourceNode)
          // 删除源节点（位置需要加上插入节点的大小）
          tr.delete(sourcePos + sourceNode.nodeSize, sourcePos + sourceNode.nodeSize * 2)
        }

        editorView.dispatch(tr.scrollIntoView())
      } catch (error) {
        console.error('拖动失败:', error)
      }

      cleanupDrag()
    }

    // 处理 dragover 事件
    const handleDragOver = (event: DragEvent) => {
      if (!isDragging) return

      // 检查是否在编辑器区域内
      const editorRect = editorView.dom.getBoundingClientRect()
      if (
        event.clientX >= editorRect.left &&
        event.clientX <= editorRect.right &&
        event.clientY >= editorRect.top &&
        event.clientY <= editorRect.bottom
      ) {
        event.preventDefault()
        event.dataTransfer!.dropEffect = 'move'
      }
    }

    // 处理 dragend 事件
    const handleDragEnd = () => {
      cleanupDrag()
    }

    // 用于存储拖动预览元素的引用（提升到外层作用域）
    let dragPreviewRef: HTMLElement | null = null

    // 清理拖动状态
    const cleanupDrag = () => {
      isDragging = false
      draggedNodeData = null

      if (currentNode) {
        currentNode.classList.remove('dragging')
      }

      if (dragHandleElement) {
        const handle = dragHandleElement.querySelector('.drag-handle') as HTMLElement
        if (handle) {
          handle.style.cursor = 'grab'
          handle.style.background = 'transparent'
          // 恢复 SVG 填充色
          const circles = handle.querySelectorAll('circle')
          circles.forEach((c) => c.setAttribute('fill', '#999'))
        }
      }

      // 清理可能遗留的拖动预览元素
      if (dragPreviewRef && document.body.contains(dragPreviewRef)) {
        document.body.removeChild(dragPreviewRef)
        dragPreviewRef = null
      }

      hideDragHandle()
    }

    // 创建拖动手柄
    const createDragHandle = () => {
      const wrapper = document.createElement('div')
      wrapper.className = 'drag-handle-wrapper'
      wrapper.style.cssText = `
        position: fixed;
        display: flex;
        align-items: center;
        gap: 2px;
        opacity: 0;
        transition: opacity 0.15s ease;
        z-index: 100;
        pointer-events: auto;
      `

      // 加号按钮 - 点击添加新段落
      const plusBtn = document.createElement('button')
      plusBtn.className = 'drag-handle-plus'
      plusBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      `
      plusBtn.style.cssText = `
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: transparent;
        cursor: pointer;
        color: #999;
        border-radius: 4px;
        transition: all 0.15s ease;
        padding: 0;
        flex-shrink: 0;
      `
      plusBtn.title = '点击添加新段落'

      // 拖动手柄
      const handle = document.createElement('div')
      handle.className = 'drag-handle'
      handle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="14" viewBox="0 0 10 14" style="display: block; pointer-events: none;">
          <circle cx="2" cy="2" r="1.5" fill="#999" />
          <circle cx="8" cy="2" r="1.5" fill="#999" />
          <circle cx="2" cy="7" r="1.5" fill="#999" />
          <circle cx="8" cy="7" r="1.5" fill="#999" />
          <circle cx="2" cy="12" r="1.5" fill="#999" />
          <circle cx="8" cy="12" r="1.5" fill="#999" />
        </svg>
      `
      handle.style.cssText = `
        width: 20px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        color: #999;
        border-radius: 4px;
        transition: background 0.15s ease;
        flex-shrink: 0;
        background: transparent;
        border: none;
        outline: none;
        box-sizing: border-box;
        pointer-events: auto;
        user-select: none;
        -webkit-user-drag: element;
      `
      handle.setAttribute('draggable', 'true')
      handle.title = '拖动移动段落'

      // 阻止默认的拖动行为，确保我们的自定义拖动生效
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation()
      })

      wrapper.appendChild(plusBtn)
      wrapper.appendChild(handle)

      // 绑定加号按钮事件
      plusBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (currentNodePos !== null) {
          const pos = currentNodePos
          const node = editorView.state.doc.nodeAt(pos)
          if (node) {
            const endPos = pos + node.nodeSize
            editorView.dispatch(
              editorView.state.tr
                .insert(endPos, editorView.state.schema.nodes.paragraph.create())
                .scrollIntoView()
            )
            editorView.focus()
            try {
              const newPos = endPos + 1
              editorView.dispatch(
                editorView.state.tr.setSelection(
                  TextSelection.near(editorView.state.doc.resolve(newPos))
                )
              )
            } catch {
              // 忽略选择错误
            }
          }
        }
      })

      plusBtn.addEventListener('mouseenter', () => {
        plusBtn.style.background = '#e8f0fe'
        plusBtn.style.color = '#1a73e8'
      })
      plusBtn.addEventListener('mouseleave', () => {
        plusBtn.style.background = 'transparent'
        plusBtn.style.color = '#999'
      })

      handle.addEventListener('mouseenter', () => {
        handle.style.background = '#f0f0f0'
        // 更新 SVG 填充色
        const circles = handle.querySelectorAll('circle')
        circles.forEach((c) => c.setAttribute('fill', '#666'))
      })
      handle.addEventListener('mouseleave', () => {
        if (!isDragging) {
          handle.style.background = 'transparent'
          // 恢复 SVG 填充色
          const circles = handle.querySelectorAll('circle')
          circles.forEach((c) => c.setAttribute('fill', '#999'))
        }
      })

      // 拖动开始
      handle.addEventListener('dragstart', (e) => {
        if (!currentNode || currentNodePos === null) {
          e.preventDefault()
          return
        }

        // 获取要拖动的节点
        const nodeToMove = editorView.state.doc.nodeAt(currentNodePos)
        if (!nodeToMove) {
          e.preventDefault()
          return
        }

        isDragging = true
        draggedNodeData = {
          node: nodeToMove,
          pos: currentNodePos
        }

        handle.style.cursor = 'grabbing'
        handle.style.background = '#e0e0e0'
        // 更新 SVG 填充色
        const circles = handle.querySelectorAll('circle')
        circles.forEach((c) => c.setAttribute('fill', '#333'))

        // 设置拖动数据
        e.dataTransfer!.effectAllowed = 'move'
        e.dataTransfer!.setData('application/x-tiptap-drag', 'true')

        // 清理之前可能遗留的拖动预览元素
        if (dragPreviewRef && document.body.contains(dragPreviewRef)) {
          document.body.removeChild(dragPreviewRef)
          dragPreviewRef = null
        }

        // 创建拖动预览
        dragPreviewRef = currentNode.cloneNode(true) as HTMLElement
        dragPreviewRef.style.cssText = `
          position: absolute;
          top: -9999px;
          left: -9999px;
          background: #fff;
          padding: 8px 12px;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          max-width: 400px;
          overflow: hidden;
          opacity: 0.9;
          pointer-events: none;
        `
        document.body.appendChild(dragPreviewRef)
        e.dataTransfer!.setDragImage(dragPreviewRef, 20, 20)

        // 延迟移除预览元素（确保拖动图像已被渲染）
        setTimeout(() => {
          if (dragPreviewRef && document.body.contains(dragPreviewRef)) {
            document.body.removeChild(dragPreviewRef)
            dragPreviewRef = null
          }
        }, 100)

        // 添加拖动样式
        currentNode.classList.add('dragging')

        // 选中当前节点
        try {
          const selection = NodeSelection.create(editorView.state.doc, currentNodePos)
          editorView.dispatch(editorView.state.tr.setSelection(selection))
        } catch {
          // 忽略选择错误
        }
      })

      // 防止手柄区域的 mouseout 隐藏手柄
      wrapper.addEventListener('mouseenter', () => {
        if (hideTimeout) {
          clearTimeout(hideTimeout)
          hideTimeout = null
        }
      })

      wrapper.addEventListener('mouseleave', () => {
        if (!isDragging) {
          hideTimeout = setTimeout(() => {
            hideDragHandle()
          }, 100)
        }
      })

      return { wrapper, handle }
    }

    // 显示拖动手柄
    const showDragHandle = (node: HTMLElement, pos: number) => {
      if (hideTimeout) {
        clearTimeout(hideTimeout)
        hideTimeout = null
      }

      if (!dragHandleElement) {
        const elements = createDragHandle()
        dragHandleElement = elements.wrapper
        document.body.appendChild(dragHandleElement)

        // 添加全局事件监听
        document.addEventListener('drop', handleDrop, true)
        document.addEventListener('dragover', handleDragOver, true)
        document.addEventListener('dragend', handleDragEnd, true)
      }

      const rect = node.getBoundingClientRect()
      const editorRect = editorView.dom.getBoundingClientRect()

      // 计算手柄位置 - 放在节点左侧
      const left = Math.max(editorRect.left - 52, 8)

      dragHandleElement.style.left = `${left}px`
      dragHandleElement.style.top = `${rect.top + rect.height / 2 - 12}px`
      dragHandleElement.style.opacity = '1'

      currentNode = node
      currentNodePos = pos
    }

    // 隐藏拖动手柄
    const hideDragHandle = () => {
      if (dragHandleElement && !isDragging) {
        dragHandleElement.style.opacity = '0'
      }
    }

    // 查找块级节点及其位置
    const findBlockNode = (target: HTMLElement): { node: HTMLElement; pos: number } | null => {
      const blockSelectors = 'p, h1, h2, h3, h4, h5, h6, blockquote, pre, ul, ol, table, hr'
      const blockNode = target.closest(blockSelectors) as HTMLElement

      if (!blockNode || !editorView.dom.contains(blockNode)) {
        return null
      }

      // 获取节点在文档中的位置
      try {
        const pos = editorView.posAtDOM(blockNode, 0)
        if (pos === undefined || pos === null) return null

        // 找到该位置对应的节点起始位置
        const $pos = editorView.state.doc.resolve(pos)
        const depth = $pos.depth

        // 找到顶级块节点的位置
        let nodePos = pos
        if (depth > 1) {
          nodePos = $pos.before(depth)
        } else if (depth === 1) {
          nodePos = $pos.before(1)
        }

        // 验证位置是否有效
        const nodeAtPos = editorView.state.doc.nodeAt(nodePos)
        if (!nodeAtPos) return null

        return { node: blockNode, pos: nodePos }
      } catch {
        return null
      }
    }

    return [
      new Plugin({
        key: DragHandlePluginKey,
        view: () => ({
          update: () => {
            // 视图更新时重新定位手柄
            if (currentNode && currentNodePos !== null && dragHandleElement) {
              if (dragHandleElement.style.opacity === '1' && !isDragging) {
                const rect = currentNode.getBoundingClientRect()
                const editorRect = editorView.dom.getBoundingClientRect()
                const left = Math.max(editorRect.left - 52, 8)
                dragHandleElement.style.left = `${left}px`
                dragHandleElement.style.top = `${rect.top + rect.height / 2 - 12}px`
              }
            }
          },
          destroy: () => {
            // 移除全局事件监听
            document.removeEventListener('drop', handleDrop, true)
            document.removeEventListener('dragover', handleDragOver, true)
            document.removeEventListener('dragend', handleDragEnd, true)

            // 清理拖动手柄元素
            if (dragHandleElement) {
              dragHandleElement.remove()
              dragHandleElement = null
            }

            // 清理拖动预览元素
            if (dragPreviewRef && document.body.contains(dragPreviewRef)) {
              document.body.removeChild(dragPreviewRef)
              dragPreviewRef = null
            }

            // 清理超时定时器
            if (hideTimeout) {
              clearTimeout(hideTimeout)
              hideTimeout = null
            }

            // 重置状态
            currentNode = null
            currentNodePos = null
            draggedNodeData = null
            isDragging = false
          }
        }),
        props: {
          handleDOMEvents: {
            mousemove: (_view, event) => {
              if (isDragging) return false

              const target = event.target as HTMLElement

              // 忽略手柄本身
              if (target.closest('.drag-handle-wrapper')) {
                return false
              }

              const result = findBlockNode(target)
              if (result) {
                showDragHandle(result.node, result.pos)
              }

              return false
            },
            mouseleave: () => {
              if (!isDragging) {
                hideTimeout = setTimeout(() => {
                  hideDragHandle()
                }, 200)
              }
              return false
            }
          }
        }
      })
    ]
  }
})

export default DragHandle
