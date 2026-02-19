FROM node:20-alpine

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY index.html styles.css app.js i18n.js ./
COPY styles ./styles
COPY audio ./audio
RUN mkdir -p audio/standard
COPY server ./server

EXPOSE 80

ENV PORT=80
CMD ["node", "server/index.js"]
