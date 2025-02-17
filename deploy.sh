ssh user@your-server-ip << 'ENDSSH'
cd /path/to/anecdot
git pull
npm install
pm2 restart anecdot
ENDSSH