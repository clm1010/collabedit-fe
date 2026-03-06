/**
 * Element Plus Table 全局样式配置
 *
 * 通过 CSS 自定义属性 + 全局样式注入统一管理表格样式，
 * 在 main.ts 中调用一次即可全局生效，无需各组件单独引入。
 */

const TABLE_HEADER_BG_COLOR = '#f0f4fa'
const TABLE_HEADER_TEXT_COLOR = '#333333'
const TABLE_HEADER_BORDER_COLOR = '#8bb8ff'
const TABLE_HEADER_HEIGHT = '64px'

export function setupElementPlusTableConfig() {
  const style = document.createElement('style')
  style.setAttribute('data-source', 'element-plus-table-config')
  style.textContent = `
    .el-table {
      --el-table-header-bg-color: ${TABLE_HEADER_BG_COLOR};
      --el-table-header-text-color: ${TABLE_HEADER_TEXT_COLOR};
    }
    .el-table__header-wrapper thead {
      height: ${TABLE_HEADER_HEIGHT};
    }
    .el-table__header-wrapper th {
      border-bottom-color: ${TABLE_HEADER_BORDER_COLOR} !important;
    }
  `
  document.head.appendChild(style)
}
