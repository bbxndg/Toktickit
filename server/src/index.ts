import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import healthRouter from './routes/health';
import categoriesRouter from './routes/categories';
import requestersRouter from './routes/requesters';
import relatedSystemsRouter from './routes/relatedSystems';
import ticketsRouter from './routes/tickets';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads if needed
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', healthRouter);
app.use('/api', categoriesRouter);
app.use('/api', requestersRouter);
app.use('/api', relatedSystemsRouter);
app.use('/api', ticketsRouter);

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`TokTickIT API running on port ${PORT}`));
}

export default app;
