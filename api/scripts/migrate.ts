import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 迁移记录表
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
    console.log('Migrations table created or already exists');
  } catch (error) {
    console.error('Error creating migrations table:', error);
    throw error;
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

// 记录迁移执行
const recordMigration = async (filename: string): Promise<void> => {
  try {
    await query(`INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`, [filename]);
    console.log(`Migration recorded: ${filename}`);
  } catch (error) {
    console.error(`Error recording migration ${filename}:`, error);
    throw error;
  }
};

// 执行单个迁移文件
const executeMigration = async (filePath: string, filename: string): Promise<void> => {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // 分割SQL语句（支持dollar-quoted字符串）
    const statements: string[] = [];
    let currentStatement = '';
    let inDollarQuote = false;
    let dollarTag = '';
    
    const lines = sql.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 跳过注释行和空行
      if (trimmedLine.length === 0 || trimmedLine.startsWith('--')) {
        continue;
      }
      
      // 检查dollar-quoted字符串的开始和结束
      const dollarMatches = trimmedLine.match(/\$([^$]*)\$/g);
      if (dollarMatches) {
        for (const match of dollarMatches) {
          if (!inDollarQuote) {
            inDollarQuote = true;
            dollarTag = match;
          } else if (match === dollarTag) {
            inDollarQuote = false;
            dollarTag = '';
          }
        }
      }
      
      currentStatement += (currentStatement ? ' ' : '') + trimmedLine;
      
      // 如果不在dollar-quoted字符串中，且行以分号结尾，则结束当前语句
      if (!inDollarQuote && trimmedLine.endsWith(';')) {
        statements.push(currentStatement.slice(0, -1).trim()); // 移除末尾的分号
        currentStatement = '';
      }
    }
    
    // 添加最后一个语句（如果有的话）
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    const filteredStatements = statements.filter(stmt => stmt.length > 0);
    
    console.log(`Executing migration: ${filename}`);
    console.log(`Found ${filteredStatements.length} SQL statements`);
    
    // 执行每个SQL语句
    for (let i = 0; i < filteredStatements.length; i++) {
      const statement = filteredStatements[i];
      if (statement) {
        try {
          const result = await query(statement);
          console.log(`  ✓ Statement ${i + 1}/${filteredStatements.length} executed`);
          console.log('Executed query', {
            text: statement.substring(0, 100) + (statement.length > 100 ? '...' : ''),
            duration: result.duration,
            rows: result.rowCount
          });
        } catch (error) {
          console.error(`  ✗ Error in statement ${i + 1}:`, error);
          console.error(`  Statement: ${statement.substring(0, 100)}...`);
          throw error;
        }
      }
    }
    
    // 记录迁移
    await recordMigration(filename);
    console.log(`✓ Migration completed: ${filename}`);
    
  } catch (error) {
    console.error(`✗ Migration failed: ${filename}`, error);
    throw error;
  }
};

// 获取迁移文件列表
const getMigrationFiles = (): string[] => {
  const migrationsDir = path.join(__dirname, '../../migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('Migrations directory not found, creating it...');
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // 按文件名排序
  
  return files;
};

// 运行所有待执行的迁移
export const runMigrations = async (): Promise<void> => {
  try {
    console.log('Starting database migrations...');
    
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
    
    console.log(`Found ${migrationFiles.length} migration files`);
    console.log(`${executedMigrations.length} migrations already executed`);
    
    // 找出待执行的迁移
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to execute');
      return;
    }
    
    console.log(`Executing ${pendingMigrations.length} pending migrations...`);
    
    // 执行待执行的迁移
    const migrationsDir = path.join(__dirname, '../../migrations');
    for (const filename of pendingMigrations) {
      const filePath = path.join(migrationsDir, filename);
      await executeMigration(filePath, filename);
    }
    
    console.log('✓ All migrations completed successfully!');
    
  } catch (error) {
    console.error('✗ Migration process failed:', error);
    throw error;
  }
};

// 回滚最后一个迁移（简单实现）
export const rollbackLastMigration = async (): Promise<void> => {
  try {
    const executedMigrations = await getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    const lastMigration = executedMigrations[executedMigrations.length - 1];
    
    // 从记录中删除
    await query(`DELETE FROM ${MIGRATIONS_TABLE} WHERE filename = $1`, [lastMigration]);
    
    console.log(`Rollback completed for: ${lastMigration}`);
    console.log('Note: This only removes the migration record. Manual cleanup may be required.');
    
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
};

// 获取迁移状态
export const getMigrationStatus = async (): Promise<void> => {
  try {
    const migrationFiles = getMigrationFiles();
    const executedMigrations = await getExecutedMigrations();
    
    console.log('\n=== Migration Status ===');
    console.log(`Total migration files: ${migrationFiles.length}`);
    console.log(`Executed migrations: ${executedMigrations.length}`);
    
    if (migrationFiles.length > 0) {
      console.log('\nMigration files:');
      migrationFiles.forEach(file => {
        const status = executedMigrations.includes(file) ? '✓ Executed' : '○ Pending';
        console.log(`  ${status} ${file}`);
      });
    }
    
    const pendingCount = migrationFiles.length - executedMigrations.length;
    if (pendingCount > 0) {
      console.log(`\n${pendingCount} migrations pending execution`);
    } else {
      console.log('\nAll migrations are up to date');
    }
    
  } catch (error) {
    console.error('Error getting migration status:', error);
    throw error;
  }
};

// CLI接口
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'up':
    case 'migrate':
      runMigrations().catch(process.exit);
      break;
    case 'rollback':
      rollbackLastMigration().catch(process.exit);
      break;
    case 'status':
      getMigrationStatus().catch(process.exit);
      break;
    default:
      console.log('Usage:');
      console.log('  npm run migrate        - Run pending migrations');
      console.log('  npm run migrate:status - Show migration status');
      console.log('  npm run migrate:rollback - Rollback last migration');
      break;
  }
}