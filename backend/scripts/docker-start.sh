#!/bin/sh
# Início do container do backend: aplica as migrations pendentes e sobe o servidor compilado.
# LOCAL_DATABASE_URL (opcional, usado com o perfil "local-db" do docker-compose) substitui o DATABASE_URL.
set -e

if [ -n "$LOCAL_DATABASE_URL" ]; then
  export DATABASE_URL="$LOCAL_DATABASE_URL"
fi

# O banco pode ainda estar subindo (ex.: perfil local-db): tenta as migrations algumas vezes.
attempt=1
until npx prisma migrate deploy; do
  if [ "$attempt" -ge 10 ]; then
    echo "Não foi possível aplicar as migrations após $attempt tentativas." >&2
    exit 1
  fi
  echo "Banco indisponível (tentativa $attempt). Nova tentativa em 3 s..."
  attempt=$((attempt + 1))
  sleep 3
done

exec node --enable-source-maps dist/server.js
