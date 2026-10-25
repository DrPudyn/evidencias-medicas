@echo off
cd /d "%~dp0"
echo Abrindo a previa local de Evidencias Medicas.
echo Acesse http://localhost:5173 quando o servidor estiver pronto.
if not exist dist\server\wrangler.json call npm run build
node scripts/preview-local.mjs
pause
