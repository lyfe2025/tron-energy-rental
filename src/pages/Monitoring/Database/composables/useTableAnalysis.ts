import { monitoringApi } from '@/api/monitoring'
import { ref } from 'vue'
import type { TableAnalysisResult, TableInfo } from '../types/database.types'

export function useTableAnalysis() {
  const selectedTable = ref<TableInfo | null>(null)
  const showTableDialog = ref(false)

  // 显示表详情
  const showTableDetails = (table: TableInfo) => {
    selectedTable.value = table
    showTableDialog.value = true
  }

  // 关闭表详情对话框
  const closeTableDialog = () => {
    showTableDialog.value = false
    selectedTable.value = null
  }

  // 分析表
  const analyzeTable = async (tableName: string) => {
    try {
      const response = await monitoringApi.analyzeTable(tableName)
      
      if (response.success && response.data) {
        // 显示分析结果
        showAnalysisResult(response.data)
      } else {
        console.error('表分析失败:', response.message)
        alert('表分析失败: ' + (response.message || '未知错误'))
      }
    } catch (error) {
      console.error('表分析失败:', error)
      alert('表分析失败，请稍后重试')
    }
  }

  // 显示分析结果
  const showAnalysisResult = (analysisData: TableAnalysisResult) => {
    const result = [
      `=== 表分析报告: ${analysisData.tableName} ===`,
      `分析时间: ${new Date(analysisData.analyzedAt).toLocaleString('zh-CN')}`,
      `健康度评分: ${analysisData.healthScore}/100`,
      '',
      '=== 基本信息 ===',
      `表所有者: ${analysisData.tableInfo.tableowner || '-'}`,
      `是否有索引: ${analysisData.tableInfo.hasindexes ? '是' : '否'}`,
      `是否有触发器: ${analysisData.tableInfo.hastriggers ? '是' : '否'}`,
      '',
      '=== 大小信息 ===',
      `总大小: ${analysisData.sizeInfo.total_size || '-'}`,
      `表大小: ${analysisData.sizeInfo.table_size || '-'}`,
      `索引大小: ${analysisData.sizeInfo.index_size || '-'}`,
      '',
      '=== 统计信息 ===',
      `活跃元组: ${analysisData.statistics.live_tuples || 0}`,
      `死元组: ${analysisData.statistics.dead_tuples || 0}`,
      `插入次数: ${analysisData.statistics.inserts || 0}`,
      `更新次数: ${analysisData.statistics.updates || 0}`,
      `删除次数: ${analysisData.statistics.deletes || 0}`,
      `最后清理: ${analysisData.statistics.last_vacuum || analysisData.statistics.last_autovacuum || '从未'}`,
      `最后分析: ${analysisData.statistics.last_analyze || analysisData.statistics.last_autoanalyze || '从未'}`,
      '',
      '=== 索引信息 ===',
      ...analysisData.indexes.map((idx) => `- ${idx.indexname}: ${idx.indexdef}`),
      '',
      '=== 字段信息 ===',
      ...analysisData.columns.map((col) => 
        `- ${col.column_name} (${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`
      ),
      '',
      '=== 优化建议 ===',
      ...analysisData.recommendations.map((rec: string) => `• ${rec}`)
    ].join('\n')
    
    // 创建一个新窗口显示分析结果
    const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes')
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>表分析报告 - ${analysisData.tableName}</title>
            <style>
              body { font-family: 'Courier New', monospace; padding: 20px; line-height: 1.6; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
            </style>
          </head>
          <body>
            <pre>${result}</pre>
            <br>
            <button onclick="window.print()">打印报告</button>
            <button onclick="window.close()">关闭</button>
          </body>
        </html>
      `)
      newWindow.document.close()
    } else {
      // 如果无法打开新窗口，则使用alert显示
      alert(result)
    }
  }

  return {
    selectedTable,
    showTableDialog,
    showTableDetails,
    closeTableDialog,
    analyzeTable,
    showAnalysisResult
  }
}
