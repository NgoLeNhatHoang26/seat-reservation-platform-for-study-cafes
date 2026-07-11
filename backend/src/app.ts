import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware } from './middleware/requestId';
import router from './routes/index';

const app = express();

app.use(requestIdMiddleware);
app.use(morgan('dev'));


app.use(
    cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization','Idempotency-Key'],
    })
);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ message: 'OK' });
});

app.use('/api/v1', router);
app.use(errorHandler);

export default app;

