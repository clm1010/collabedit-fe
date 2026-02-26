## 1 先通过 Node 后端登录获取有效 token：

- 在浏览器控制台执行（或用 Postman）

```
  // 'http://localhost:8081/api/login'
  fetch('http://192.168.2.169:8081/api/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username: 'admin', password: 'admin123'})
  }).then(r => r.json()).then(d => console.log(d))

```

## 2 拿到返回的 accessToken 和 refreshToken，拼成 URL 访问：

- http://192.168.2.169:5173/training/performance?token=拿到的accessToken&refreshToken=拿到的refreshToken

## 3 页面正常加载后，在控制台篡改 ACCESS_TOKEN：

- localStorage.setItem('ACCESS_TOKEN', JSON.stringify({c: Date.now(), e: Date.now() + 86400000, v: '"invalid_expired_token"'}))

## 4 刷新页面 REFRESH_TOKEN 是 Node 签发的、数据库中存在，刷新流程就能走通。

- 能返回 {code: 200, data: {accessToken: '...', refreshToken: '...'}} 的 JSON 数据。
- 示例：http://192.168.2.169:5173/training/performance?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjEsInVuIjoiYWRtaW4iLCJpYXQiOjE3NzIwMTAxNzUsImV4cCI6MTc3MjAxNzM3NX0.AthP4F6Jd9oL8POnmsksSclDaQG-3wj2Yv-otEmkUwk&refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjEsInVuIjoiYWRtaW4iLCJpYXQiOjE3NzIwMTAxNzUsImV4cCI6MTc3MjYxNDk3NX0.O1ywJzSWZ4m4_skzTB4Cn5SU1e5W8_5bQPiCZ2UFDiw
