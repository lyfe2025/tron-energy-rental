export interface TableInfo {
  tableName: string
  rowCount: number
  tableSize: number
  indexSize: number | string
  lastUpdated?: string
  columns?: Array<{
    name: string
    type: string
    nullable: boolean
    default?: string
  }>
}

export interface DatabaseStats {
  totalTables?: number
  totalRecords?: number
  connectionCount?: number
  databaseSize: number
  tableStats?: TableInfo[]
  slowQueries?: SlowQuery[] | number
  // 向后兼容字段
  tables?: TableInfo[]
  tableCount?: number
  userCount?: number
  orderCount?: number
}

export interface SlowQuery {
  id: string
  query: string
  duration: number
  timestamp: string
}

export interface DatabaseStatus {
  connected: boolean
  version: string
  activeConnections: number
  maxConnections: number
}

export interface TablePagination {
  current: number
  pageSize: number
  total: number
}

export interface TableAnalysisResult {
  tableName: string
  analyzedAt: string
  healthScore: number
  tableInfo: {
    tableowner?: string
    hasindexes: boolean
    hastriggers: boolean
  }
  sizeInfo: {
    total_size?: string
    table_size?: string
    index_size?: string
  }
  statistics: {
    live_tuples?: number
    dead_tuples?: number
    inserts?: number
    updates?: number
    deletes?: number
    last_vacuum?: string
    last_autovacuum?: string
    last_analyze?: string
    last_autoanalyze?: string
  }
  indexes: Array<{
    indexname: string
    indexdef: string
  }>
  columns: Array<{
    column_name: string
    data_type: string
    character_maximum_length?: number
    is_nullable: string
  }>
  recommendations: string[]
}
