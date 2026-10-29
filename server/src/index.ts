import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health';
import categoriesRouter from './routes/categories';
import requestersRouter from './routes/requesters';
import relatedSystemsRouter from './routes/relatedSystems';
import ticketsRouter from './routes/tickets';
import ticketDetailRouter from './routes/ticketDetail';
import authRouter from './routes/auth';
import adminUsersRouter from './routes/adminUsers';
import staffRouter from './routes/staff';
import commentsNotesRouter from './routes/commentsNotes';
import actionsTakenRouter from './routes/actionsTaken';
import statusHistoryRouter from './routes/statusHistory';
import dashboardRouter from './routes/dashboard';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api', healthRouter);
app.use('/api', categoriesRouter);
app.use('/api', requestersRouter);
app.use('/api', relatedSystemsRouter);
app.use('/api', actionsTakenRouter);
app.use('/api', statusHistoryRouter);
app.use('/api', dashboardRouter);
app.use('/api', ticketsRouter);
app.use('/api', ticketDetailRouter);
app.use('/api', authRouter);
app.use('/api', adminUsersRouter);
app.use('/api', staffRouter);
app.use('/api', commentsNotesRouter);

app.use((error: { type?: string }, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: {
    code: 'VALIDATION_ERROR', message: 'A valid JSON request body is required.',
    details: [{ field: 'body', message: 'Unable to parse JSON.' }],
  } });
  return next(error);
});

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`TokTickIT API running on port ${PORT}`));
}

export default app;
