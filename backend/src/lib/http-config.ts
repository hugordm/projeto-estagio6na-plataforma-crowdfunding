// Configurações HTTP lidas do ambiente: origens liberadas no CORS e "trust proxy".

// Origens que podem chamar a API pelo navegador: FRONTEND_URL (uma ou mais, separadas por vírgula).
// Padrão: o frontend local. Ferramentas fora do navegador (curl, Swagger em /docs) não dependem disso.
export function corsOrigins(): string[] {
  return (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

// TRUST_PROXY: quantos proxies confiáveis existem na frente da API (Render, Docker, Nginx...).
// Sem isso, atrás de um proxy todo mundo parece ter o IP do proxy e o rate limit por IP vira um só.
// Aceita "true"/"false", um número de saltos (ex.: 1) ou uma lista de IPs/sub-redes (ex.: "loopback, 10.0.0.0/8").
// Padrão (vazio): false, o certo quando a API recebe as conexões direto.
export function trustProxySetting(): boolean | number | string {
  const value = (process.env.TRUST_PROXY ?? '').trim();
  if (value === '' || value === 'false') return false;
  if (value === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}
