FROM node:19

WORKDIR /app

COPY server/package*.json ./
RUN npm install

COPY server ./
COPY views ./views

EXPOSE 5000

CMD ["node", "server.js"]