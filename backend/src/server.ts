import { app } from './app';

// Ponto de entrada: o app (rotas, middlewares e documentação) é montado em app.ts.
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
