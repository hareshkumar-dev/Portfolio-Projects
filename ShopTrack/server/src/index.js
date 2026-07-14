/**
 * ShopTrack API
 *
 * REST API layer between the ShopTrack storefront and Salesforce.
 * Two access tiers:
 *   /api/public/*  — no login; storefront served via the integration user
 *   /api/admin/*   — requires an authenticated admin (store operator) session
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes, { requireAuth } from './routes/auth.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';

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

app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', requireAuth, adminRoutes);

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`ShopTrack API listening on http://localhost:${PORT}`);
});
