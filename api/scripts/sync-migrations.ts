#!/usr/bin/env tsx

/**
 * 自动同步迁移脚本
 * 智能检测已存在的表和字段，自动标记相应的迁移为已执行
 * 这个脚本解决了当数据库通过备份恢复后，迁移记录不同步的问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_TABLE = 'schema_migrations';

// 创建迁移记录表
const createMigrationsTable = async (): Promise<void> => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await query(createTableSQL);
    console.log('✅ Migrations table created or already exists');
  } catch (error) {
    console.error('❌ Error creating migrations table:', error);
    throw error;
  }
};

// 检查表是否存在
const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error);
    return false;
  }
};

// 检查列是否存在
const checkColumnExists = async (tableName: string, columnName: string): Promise<boolean> => {
  try {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
      )
    `, [tableName, columnName]);
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking column ${tableName}.${columnName}:`, error);
    return false;
  }
};

// 检查索引是否存在
const checkIndexExists = async (indexName: string): Promise<boolean> => {
  try {
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname = $1
      )
    `, [indexName]);
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking index ${indexName}:`, error);
    return false;
  }
};

// 获取已执行的迁移
const getExecutedMigrations = async (): Promise<string[]> => {
  try {
    const result = await query(`SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY executed_at`);
    return result.rows.map((row: any) => row.filename);
  } catch (error) {
    console.error('Error getting executed migrations:', error);
    return [];
  }
};

// 记录迁移执行（如果不存在）
const recordMigrationIfNotExists = async (filename: string): Promise<boolean> => {
  try {
    const result = await query(`
      INSERT INTO ${MIGRATIONS_TABLE} (filename, executed_at) 
      VALUES ($1, CURRENT_TIMESTAMP) 
      ON CONFLICT (filename) DO NOTHING 
      RETURNING id
    `, [filename]);
    
    if (result.rows.length > 0) {
      console.log(`✅ Migration recorded: ${filename}`);
      return true;
    } else {
      console.log(`⚠️  Migration already recorded: ${filename}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error recording migration ${filename}:`, error);
    return false;
  }
};

// 获取迁移文件列表
const getMigrationFiles = (): string[] => {
  const migrationsDir = path.join(__dirname, '../../migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('Migrations directory not found');
    return [];
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  return files;
};

// 分析迁移文件内容
const analyzeMigrationFile = async (filePath: string): Promise<{
  tables: string[];
  columns: Array<{table: string, column: string}>;
  indexes: string[];
  hasIfNotExists: boolean;
}> => {
  const sql = fs.readFileSync(filePath, 'utf8').toLowerCase();
  
  const analysis = {
    tables: [] as string[],
    columns: [] as Array<{table: string, column: string}>,
    indexes: [] as string[],
    hasIfNotExists: sql.includes('if not exists')
  };

  // 提取CREATE TABLE语句
  const createTableMatches = sql.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?(\w+)/g);
  if (createTableMatches) {
    createTableMatches.forEach(match => {
      const tableMatch = match.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?(\w+)/);
      if (tableMatch) {
        analysis.tables.push(tableMatch[1]);
      }
    });
  }

  // 提取ALTER TABLE ADD COLUMN语句
  const addColumnMatches = sql.match(/alter\s+table\s+(\w+)\s+add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?(\w+)/g);
  if (addColumnMatches) {
    addColumnMatches.forEach(match => {
      const columnMatch = match.match(/alter\s+table\s+(\w+)\s+add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?(\w+)/);
      if (columnMatch) {
        analysis.columns.push({ table: columnMatch[1], column: columnMatch[2] });
      }
    });
  }

  // 提取CREATE INDEX语句
  const createIndexMatches = sql.match(/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?(\w+)/g);
  if (createIndexMatches) {
    createIndexMatches.forEach(match => {
      const indexMatch = match.match(/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?(\w+)/);
      if (indexMatch) {
        analysis.indexes.push(indexMatch[1]);
      }
    });
  }

  return analysis;
};

// 智能检测迁移是否已应用
const isMigrationApplied = async (filePath: string, filename: string): Promise<boolean> => {
  try {
    const analysis = await analyzeMigrationFile(filePath);
    
    console.log(`\n🔍 Analyzing migration: ${filename}`);
    console.log(`   Tables to check: ${analysis.tables.length}`);
    console.log(`   Columns to check: ${analysis.columns.length}`);
    console.log(`   Indexes to check: ${analysis.indexes.length}`);
    console.log(`   Has IF NOT EXISTS: ${analysis.hasIfNotExists}`);

    // 如果是安全的迁移（有IF NOT EXISTS），可以直接标记
    if (analysis.hasIfNotExists) {
      console.log(`   ✅ Safe migration (has IF NOT EXISTS clauses)`);
      return true;
    }

    // 检查所有表是否存在
    for (const table of analysis.tables) {
      const exists = await checkTableExists(table);
      console.log(`   Table ${table}: ${exists ? '✅ exists' : '❌ missing'}`);
      if (!exists) {
        return false;
      }
    }

    // 检查所有列是否存在
    for (const {table, column} of analysis.columns) {
      const exists = await checkColumnExists(table, column);
      console.log(`   Column ${table}.${column}: ${exists ? '✅ exists' : '❌ missing'}`);
      if (!exists) {
        return false;
      }
    }

    // 检查所有索引是否存在
    for (const index of analysis.indexes) {
      const exists = await checkIndexExists(index);
      console.log(`   Index ${index}: ${exists ? '✅ exists' : '❌ missing'}`);
      if (!exists) {
        return false;
      }
    }

    console.log(`   ✅ All objects exist, migration appears to be applied`);
    return true;

  } catch (error) {
    console.error(`❌ Error analyzing migration ${filename}:`, error);
    return false;
  }
};

// 主函数：自动同步迁移记录
export const syncMigrations = async (dryRun: boolean = false): Promise<void> => {
  try {
    console.log('🚀 Starting automatic migration sync...');
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be applied)'}`);
    console.log('=' .repeat(60));
    
    // 测试数据库连接
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // 创建迁移记录表
    await createMigrationsTable();

    // 获取迁移文件和已执行的迁移
    const migrationFiles = getMigrationFiles();
    const executedMigrations = await getExecutedMigrations();

    console.log(`\n📊 Migration Status:`);
    console.log(`   Total migration files: ${migrationFiles.length}`);
    console.log(`   Already recorded: ${executedMigrations.length}`);
    console.log(`   Pending analysis: ${migrationFiles.length - executedMigrations.length}`);

    // 找出未记录的迁移
    const unrecordedMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );

    if (unrecordedMigrations.length === 0) {
      console.log('\n✅ All migrations are already recorded in the database');
      return;
    }

    console.log(`\n🔍 Analyzing ${unrecordedMigrations.length} unrecorded migrations...`);

    let appliedCount = 0;
    let skippedCount = 0;
    const migrationsDir = path.join(__dirname, '../../migrations');

    for (const filename of unrecordedMigrations) {
      const filePath = path.join(migrationsDir, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Migration file not found: ${filename}`);
        continue;
      }

      const isApplied = await isMigrationApplied(filePath, filename);
      
      if (isApplied) {
        if (!dryRun) {
          const recorded = await recordMigrationIfNotExists(filename);
          if (recorded) {
            appliedCount++;
          }
        } else {
          console.log(`   [DRY RUN] Would record: ${filename}`);
          appliedCount++;
        }
      } else {
        console.log(`   ⏭️  Skipping: ${filename} (changes not detected in database)`);
        skippedCount++;
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 Migration sync completed!');
    console.log(`\n📋 Summary:`);
    console.log(`   ${dryRun ? 'Would record' : 'Recorded'}: ${appliedCount} migrations`);
    console.log(`   Skipped: ${skippedCount} migrations`);
    console.log(`   Total processed: ${appliedCount + skippedCount} migrations`);

    if (skippedCount > 0) {
      console.log(`\n⚠️  Note: ${skippedCount} migrations were skipped because their changes`);
      console.log(`   were not detected in the database. You can run these manually:`);
      console.log(`   npm run migrate`);
    }

    if (dryRun) {
      console.log(`\n💡 This was a dry run. To apply changes, run:`);
      console.log(`   npm run migrate:sync`);
    }

  } catch (error) {
    console.error('❌ Migration sync failed:', error);
    throw error;
  }
};

// CLI接口
if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');
  
  syncMigrations(dryRun)
    .then(() => {
      console.log('\n✅ Migration sync process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration sync process failed:', error);
      process.exit(1);
    });
}
