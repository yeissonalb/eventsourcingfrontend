FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# El navegador llama a rutas del mismo origen y vite preview las reenvía a las APIs.
# Así la imagen sirve igual en localhost, en una VM o en Codespaces.
ARG VITE_API_URL=/command-api
ARG VITE_HISTORY_API_URL=/history-api
ARG VITE_API_BASE_URL=/command-api
ARG VITE_OTEL_ENABLED=true

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_HISTORY_API_URL=$VITE_HISTORY_API_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_OTEL_ENABLED=$VITE_OTEL_ENABLED

RUN npm run build

ENV API_PROXY_TARGET=http://transaction-api:3000
ENV HISTORY_PROXY_TARGET=http://history-api:3001

EXPOSE 5173

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]
