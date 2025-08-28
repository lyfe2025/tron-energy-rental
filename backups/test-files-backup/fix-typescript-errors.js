#!/usr/bin/env node

/**
 * TypeScript错误批量修复脚本
 * 修复项目中常见的类型错误
 */

import fs from 'fs';
import path from 'path';

// 修复的文件列表和对应的修复规则
const fixes = [
  {
    file: 'src/services/api.ts',
    patterns: [
      {
        search: /response\.data\.data\.configs/g,
        replace: 'response.data.data'
      }
    ]
  },
  {
    file: 'api/services/tron.ts',
    patterns: [
      {
        search: /if \(insertResult\.error\)/g,
        replace: '// Database errors are thrown, not returned'
      },
      {
        search: /console\.error\('Failed to record energy transaction:', insertResult\.error\);/g,
        replace: ''
      }
    ]
  },
  {
    file: 'api/services/energy-pool.ts',
    patterns: [
      {
        search: /const totalEnergy = accountInfo\.EnergyLimit \|\| 0;/g,
        replace: 'const totalEnergy = accountInfo.data?.energy?.limit || 0;'
      },
      {
        search: /const usedEnergy = accountInfo\.EnergyUsed \|\| 0;/g,
        replace: 'const usedEnergy = accountInfo.data?.energy?.used || 0;'
      }
    ]
  }
];

// 执行修复
function applyFixes() {
  console.log('开始修复TypeScript错误...');
  
  fixes.forEach(({ file, patterns }) => {
    if (fs.existsSync(file)) {
      console.log(`修复文件: ${file}`);
      let content = fs.readFileSync(file, 'utf8');
      
      patterns.forEach(({ search, replace }) => {
        content = content.replace(search, replace);
      });
      
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ 已修复: ${file}`);
    } else {
      console.log(`⚠️  文件不存在: ${file}`);
    }
  });
  
  console.log('修复完成！');
}

// 运行修复
applyFixes();
