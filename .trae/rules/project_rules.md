1.项目启动测试或者重启使用：npm run restart 或 pnpm run restart
2.API登录：
curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@tronrental.com","password":"admin123456"}' | jq .
3.本项目完全没有用到supabase，一直使用的是本地的数据库，配置信息看根目录下的.env文件：psql postgresql://postgres:postgres@localhost:5432/tron_energy_rental
注意：如果要执行 sql 之前，请先备份 执行：scripts/database/backup-database.sh