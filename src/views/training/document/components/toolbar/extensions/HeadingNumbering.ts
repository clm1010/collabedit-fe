import { Extension } from '@tiptap/core'

/**
 * 标题章节编号扩展（Heading Numbering）。
 *
 * DOCX 导入流水线（collabedit-doc-converter）会：
 *   1. 识别 heading 语义，优先于 numPr（修复 heading 被误判为 list 的老 bug）；
 *   2. 计算 "1" / "1.2" / "1.2.1" 等章节编号，以 **真实 text 节点** 的形式
 *      prepend 到 heading 内容最前面。编辑器里用户可以像编辑普通文字一样
 *      选中 / 修改 / 删除编号，符合"导入后编号就是文档一部分"的直觉。
 *   3. 另外在 heading attrs 上保留两条元数据：
 *      - `numberingText`：导入时计算好的原始编号字符串。导出阶段可据此
 *        判断 heading 开头是否仍是原编号（未改过 → 脱掉前缀让 Word 自动
 *        重新编号；改过 → 整体保留），避免双重编号。
 *      - `__origNumPr`：原始 w:numPr 引用 { numId, ilvl }，导出时 localSerializer
 *        可回写，保持和原 numbering.xml 的样式绑定。
 *
 * 本扩展只做 schema 注册；不再做视觉装饰（编号文本本身已经在 content 里）。
 */
export const HeadingNumbering = Extension.create({
  name: 'headingNumbering',

  addGlobalAttributes() {
    return [
      {
        types: ['heading'],
        attributes: {
          numberingText: {
            default: null,
            parseHTML: (element) =>
              (element as HTMLElement).getAttribute('data-numbering-text'),
            renderHTML: (attrs) => {
              const v = (attrs as Record<string, unknown>).numberingText
              if (typeof v !== 'string' || v.length === 0) return {}
              return { 'data-numbering-text': v }
            },
            keepOnSplit: false,
          },
          __origNumPr: {
            default: null,
            rendered: false,
            keepOnSplit: false,
          },
        },
      },
    ]
  },
})

export default HeadingNumbering
