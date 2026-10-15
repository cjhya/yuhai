# 宇海最小后端

## 1. 初始化本地数据库

以下命令只创建空数据库，不创建业务表。请将 MySQL 客户端路径和管理员账号替换为本机实际值：

```powershell
Get-Content .\database\init.sql | & "C:\Program Files\MySQL\MySQL Server 26.10\bin\mysql.exe" -u root -p
```

应用账号由本机数据库管理员创建并仅授予 `yuhai` 所需权限；账号密码不得写入仓库。

## 2. 配置当前 PowerShell 会话

```powershell
$env:DB_URL = "jdbc:mysql://127.0.0.1:3306/yuhai?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai&characterEncoding=utf8"
$env:DB_USERNAME = "yuhai_app"
$env:DB_PASSWORD = Read-Host "MySQL password"
$env:SERVER_PORT = "8080"
```

## 3. 启动与验证

```powershell
.\mvnw.cmd spring-boot:run
Invoke-WebRequest http://127.0.0.1:8080/api/health | Select-Object StatusCode, Content
```

只有 Mapper 的 `SELECT 1` 成功并返回 `1` 时接口才返回 HTTP 200；连接或查询异常返回 HTTP 503。

