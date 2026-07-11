FROM node:20-alpine AS builder

WORKDIR /app/frontend

COPY package*.json ./
RUN npm ci

COPY . .

# Relative /api/v1 — nginx proxies /api to backend
ENV VITE_API_BASE_URL=/api/v1

RUN npm run build

FROM nginx:1.27-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
