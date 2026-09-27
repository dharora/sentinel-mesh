FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY agents ./agents
COPY backend ./backend
COPY frontend ./frontend
EXPOSE 8787
CMD ["node", "backend/server.mjs"]
