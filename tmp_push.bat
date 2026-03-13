echo # AstraETL >> README.md
git init
git remote remove origin
git remote add origin https://github.com/abhaydubey200/AstraETL.git
git add -f .env
git add .
git commit -m "first commit"
git branch -M main
git push -u origin main
