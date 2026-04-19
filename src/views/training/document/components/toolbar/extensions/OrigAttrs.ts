import { Extension } from '@tiptap/core'

/**
 * 选择性保存高保真方案：为所有块级叶子节点统一注入三个不可见属性。
 *
 * - __origRange: [number, number] | null —— 原始 document.xml / headerN.xml /
 *   footerN.xml 等部件中的字节区间，用于导出时按字节原样复制未改动内容。
 * - __origHash:  string | null —— 原始 XML 规范化后的指纹（FNV-1a 64-bit），
 *   用于快速判定内容是否发生过修改（命中即走"原样复制"路径）。
 * - __origPart:  string | null —— 来源部件路径（如 "word/document.xml"、
 *   "word/header2.xml"），方便导出时找到对应的原始字节源。
 * - __origContentFp: string | null —— 节点内容的稳定 JSON 指纹。
 *   导入阶段一次性计算；导出时重算并与存储值比较，相同→未改动（字节复用），
 *   不同→被编辑过（localSerializer 重生成）。与 __origHash 的区别：hash 针对 XML 字节，
 *   只用于校验字节片段本身；contentFp 针对 Tiptap JSON，用于判断用户是否编辑过节点。
 *
 * 这三个属性：
 *   - `rendered: false` —— 不输出到 HTML，避免污染 DOM 与粘贴。
 *   - `keepOnSplit: false` —— 段落拆分产生的新节点不应继承原 origRange，
 *     否则会被误判为"未改动"。
 *
 * 由 converter 在 DOCX 导入阶段写入；导出时由 converter 的
 * nodeClassifier / xmlPatcher 消费；协同链路中由 y-prosemirror 透明同步到 Yjs。
 *
 * 节点类型范围（与 plan 第 2 节"挂载粒度规则"一致）：
 *   - paragraph / heading：对应 w:p
 *   - table：对应 w:tbl
 *   - image：对应 w:drawing（块级图片场景）
 *   - horizontalRule / pageBreak：块级原子节点
 *   - tocEntry：由外层 w:sdt 承载；此处保留 origRange 字段作为占位，
 *     TOC 的原子字节复用另由 __origSdtId / __origSdtXml 支撑。
 */
export interface OrigAttrsOptions {
  /** 需要注入 origRange / origHash / origPart 的节点 type name 列表 */
  types: string[]
}

export const OrigAttrs = Extension.create<OrigAttrsOptions>({
  name: 'origAttrs',

  addOptions() {
    return {
      types: [
        'paragraph',
        'heading',
        'table',
        'horizontalRule',
        'image',
        'pageBreak',
        'tocEntry'
      ]
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          __origRange: {
            default: null,
            rendered: false,
            keepOnSplit: false
          },
          __origHash: {
            default: null,
            rendered: false,
            keepOnSplit: false
          },
          __origPart: {
            default: null,
            rendered: false,
            keepOnSplit: false
          },
          __origContentFp: {
            default: null,
            rendered: false,
            keepOnSplit: false
          }
        }
      }
    ]
  }
})

export default OrigAttrs
