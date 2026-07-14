/**
 * ServiceDesk API
 *
 * REST API layer between the ServiceDesk frontend and Salesforce.
 * All Salesforce authentication and API communication is confined to
 * this tier; clients interact only with the endpoints exposed here.
 */
import 'dotenv/config'; // must load before route modules read process.env
import express from 'express';
import cors from 'cors';
import authRoutes, { requireAuth } from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';

const app = express();
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/tickets', requireAuth, ticketRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ServiceDesk API listening on http://localhost:${PORT}`);
});
