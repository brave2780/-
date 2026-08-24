import express from 'express';
import cors from 'cors';
import pagesRouter from './routes/pages.js';
import './db.js';

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api/pages', pagesRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, HOST, () => {
  console.log(`Notepad server running at http://${HOST}:${PORT}`);
  console.log('같은 네트워크의 다른 기기에서 접속하려면 이 PC의 로컬 IP 주소를 사용하세요.');
});
