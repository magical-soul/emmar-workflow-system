import express from 'express';
import cors from 'cors';
import { tenantGuard } from './middlewares/tenantGuard';
import { getTenantItems } from './controllers/itemController';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Base Server Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', engine: 'Emaar Enterprise Integration Hub' });
});

app.get('/api/items', tenantGuard, getTenantItems);

app.listen(PORT, () => {
  console.log(`Core Server running smoothly on network register: http://localhost:${PORT}`);
});
