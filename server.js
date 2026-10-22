// Local development server. On Netlify, netlify/functions/contact.js handles the form instead.
const path = require('path');
const express = require('express');

try { process.loadEnvFile(path.join(__dirname, '.env')); } catch { /* .env is optional */ }

const { handleContact, COMPANY } = require('./lib/contact');

const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.post('/api/contact', async (req, res) => {
  const { status, json } = await handleContact(req.body, req.ip);
  res.status(status).json(json);
});

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

app.listen(PORT, () => {
  console.log(`${COMPANY} website running at http://localhost:${PORT}`);
  if (!process.env.SMTP_HOST) console.log('[mail] SMTP not configured - contact form runs in DEMO mode (Ethereal).');
});
