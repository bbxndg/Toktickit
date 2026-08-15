import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', healthRouter);

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`TokTickIT API running on port ${PORT}`));
}

export default app;
