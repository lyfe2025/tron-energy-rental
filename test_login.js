import http from 'http';

const data = JSON.stringify({
  email: 'admin@tronrental.com',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头: ${JSON.stringify(res.headers)}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('响应体:', responseData);
    try {
      const parsed = JSON.parse(responseData);
      console.log('解析后的响应:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('无法解析JSON响应');
    }
  });
});

req.on('error', (e) => {
  console.error(`请求遇到问题: ${e.message}`);
});

req.write(data);
req.end();