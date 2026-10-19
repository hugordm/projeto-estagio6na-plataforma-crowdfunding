import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API de Crowdfunding no ar' });
});

app.get('/health-db', async (req, res) => {
  try {
    const users = await prisma.user.count();
    res.json({ status: 'ok', database: 'conectado', users });
  } catch (error) {
    console.error('Erro ao consultar o banco:', error);
    res.status(500).json({ status: 'erro', database: 'falha na consulta' });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
