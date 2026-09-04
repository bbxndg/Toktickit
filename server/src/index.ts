import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health';
import categoriesRouter from './routes/categories';
import requestersRouter from './routes/requesters';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', healthRouter);
app.use('/api', categoriesRouter);
app.use('/api', requestersRouter);

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`TokTickIT API running on port ${PORT}`));
}

export default app;
