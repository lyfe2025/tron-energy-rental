import http from 'http';

// 测试不同的登录错误场景
const testCases = [
  {
    name: '错误的邮箱和密码',
    data: {
      email: 'wrong@example.com',
      password: 'wrongpassword'
    }
  },
  {
    name: '空邮箱',
    data: {
      email: '',
      password: 'admin123456'
    }
  },
  {
    name: '空密码',
    data: {
      email: 'admin@example.com',
      password: ''
    }
  },
  {
    name: '无效邮箱格式',
    data: {
      email: 'invalid-email',
      password: 'admin123456'
    }
  }
];

function testLogin(testCase) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(testCase.data);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedResponse = JSON.parse(responseBody);
          resolve({
            testCase: testCase.name,
            statusCode: res.statusCode,
            response: parsedResponse
          });
        } catch (error) {
          resolve({
            testCase: testCase.name,
            statusCode: res.statusCode,
            response: responseBody,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        testCase: testCase.name,
        error: error.message
      });
    });

    req.write(data);
    req.end();
  });
}

// 运行所有测试
async function runAllTests() {
  console.log('开始测试登录错误处理机制...\n');
  
  for (const testCase of testCases) {
    try {
      console.log(`测试: ${testCase.name}`);
      console.log(`请求数据:`, testCase.data);
      
      const result = await testLogin(testCase);
      
      console.log(`状态码: ${result.statusCode}`);
      console.log(`响应:`, result.response);
      
      if (result.parseError) {
        console.log(`解析错误: ${result.parseError}`);
      }
      
      console.log('---\n');
    } catch (error) {
      console.error(`测试失败: ${error.testCase}`);
      console.error(`错误: ${error.error}`);
      console.log('---\n');
    }
  }
  
  console.log('所有测试完成!');
}

runAllTests();