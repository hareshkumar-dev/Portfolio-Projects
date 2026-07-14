/**
 * PipelinePro API
 *
 * REST API layer between the PipelinePro frontend and Salesforce
 * Sales Cloud. All Salesforce authentication and API communication is
 * confined to this tier; clients interact only with the endpoints
 * exposed here.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes, { requireAuth } from './routes/auth.js';
import opportunityRoutes from './routes/opportunities.js';
import leadRoutes from './routes/leads.js';
import statsRoutes from './routes/stats.js';

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
app.use('/api/opportunities', requireAuth, opportunityRoutes);
app.use('/api/leads', requireAuth, leadRoutes);
app.use('/api/stats', requireAuth, statsRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`PipelinePro API listening on http://localhost:${PORT}`);
});
