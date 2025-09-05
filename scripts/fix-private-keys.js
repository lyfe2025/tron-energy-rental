#!/usr/bin/env node

/**
 * 修复私钥占位符脚本
 * 用于修复现有账户中的私钥占位符问题
 */

const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI颜色代码
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('');
  log('='.repeat(60), 'cyan');
  log(`🔧 ${message}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logStep(step, message) {
  log(`${step}. ${message}`, 'yellow');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function getAuthToken() {
  return new Promise((resolve, reject) => {
    const cmd = `curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@tronrental.com","password":"admin123456"}' | jq -r .data.token`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      const token = stdout.trim();
      if (token && token !== 'null') {
        resolve(token);
      } else {
        reject(new Error('Failed to get auth token'));
      }
    });
  });
}

async function getProblematicAccounts() {
  return new Promise((resolve, reject) => {
    const cmd = `psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental -t -c "SELECT id, name, tron_address, LENGTH(private_key_encrypted) as key_length FROM energy_pools WHERE LENGTH(private_key_encrypted) < 64;" | grep -v "^$"`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error && error.code !== 1) { // 忽略grep找不到结果的错误
        reject(error);
        return;
      }
      
      const lines = stdout.trim().split('\n').filter(line => line.trim());
      const accounts = lines.map(line => {
        const parts = line.trim().split('|').map(p => p.trim());
        return {
          id: parts[0],
          name: parts[1],
          tron_address: parts[2],
          key_length: parseInt(parts[3])
        };
      }).filter(account => account.id);
      
      resolve(accounts);
    });
  });
}

async function fixPrivateKeys(token, accounts) {
  const fixData = {
    accounts: accounts.map(account => ({
      id: account.id,
      private_key_encrypted: generateSamplePrivateKey(account.name)
    }))
  };
  
  return new Promise((resolve, reject) => {
    const cmd = `curl -s -X POST http://localhost:3001/api/energy-pool/accounts/fix-private-keys \\
      -H "Content-Type: application/json" \\
      -H "Authorization: Bearer ${token}" \\
      -d '${JSON.stringify(fixData)}'`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        reject(new Error(`Invalid JSON response: ${stdout}`));
      }
    });
  });
}

function generateSamplePrivateKey(accountName) {
  // 为每个账户生成一个基于名称的示例私钥（仅用于演示）
  const hash = require('crypto').createHash('sha256').update(accountName + 'sample_key').digest('hex');
  return hash;
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  try {
    logHeader('私钥占位符修复工具');
    
    logStep('1', '检查问题账户...');
    const accounts = await getProblematicAccounts();
    
    if (accounts.length === 0) {
      logSuccess('没有发现私钥占位符问题！所有账户的私钥都是正确的格式。');
      return;
    }
    
    log('\n发现以下账户有私钥占位符问题:', 'red');
    accounts.forEach(account => {
      log(`  • ${account.name} (${account.tron_address}) - 私钥长度: ${account.key_length}`, 'yellow');
    });
    
    logWarning('这些账户的私钥是占位符，需要替换为真实的64位十六进制私钥');
    
    const confirm1 = await askQuestion('\n❓ 是否继续修复这些账户的私钥？(y/N): ');
    if (confirm1.toLowerCase() !== 'y' && confirm1.toLowerCase() !== 'yes') {
      log('用户取消操作', 'yellow');
      return;
    }
    
    logWarning('⚠️  重要提示: 此脚本将为每个账户生成示例私钥用于演示');
    logWarning('⚠️  在生产环境中，您应该使用真实的、安全生成的私钥');
    
    const confirm2 = await askQuestion('\n❓ 确认要用示例私钥替换占位符？(y/N): ');
    if (confirm2.toLowerCase() !== 'y' && confirm2.toLowerCase() !== 'yes') {
      log('用户取消操作', 'yellow');
      return;
    }
    
    logStep('2', '获取认证令牌...');
    const token = await getAuthToken();
    logSuccess('认证令牌获取成功');
    
    logStep('3', '修复私钥占位符...');
    const result = await fixPrivateKeys(token, accounts);
    
    if (result.success) {
      logSuccess(result.message);
      
      if (result.data && result.data.summary) {
        const { total, success, failed } = result.data.summary;
        log(`\n📊 修复统计:`, 'cyan');
        log(`  • 总计: ${total} 个账户`, 'white');
        log(`  • 成功: ${success} 个账户`, 'green');
        log(`  • 失败: ${failed} 个账户`, failed > 0 ? 'red' : 'white');
        
        if (result.data.results) {
          const failedResults = result.data.results.filter(r => !r.success);
          if (failedResults.length > 0) {
            log('\n❌ 失败的账户:', 'red');
            failedResults.forEach(r => {
              log(`  • ${r.id}: ${r.message}`, 'red');
            });
          }
        }
      }
    } else {
      logError(`修复失败: ${result.message}`);
    }
    
    logStep('4', '验证修复结果...');
    const remainingProblems = await getProblematicAccounts();
    
    if (remainingProblems.length === 0) {
      logSuccess('🎉 所有私钥问题已成功修复！');
    } else {
      logWarning(`仍有 ${remainingProblems.length} 个账户存在私钥问题`);
    }
    
    log('\n✨ 修复完成！', 'green');
    logWarning('⚠️  请记住在生产环境中使用真实的、安全的私钥');
    
  } catch (error) {
    logError(`修复过程出错: ${error.message}`);
    console.error(error);
  } finally {
    rl.close();
  }
}

// 处理优雅退出
process.on('SIGINT', () => {
  log('\n\n用户中断操作', 'yellow');
  rl.close();
  process.exit(0);
});

if (require.main === module) {
  main();
}
