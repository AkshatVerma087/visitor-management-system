# ---- Backend Dockerfile ----
# Simple single-stage: install deps, generate Prisma client, run

FROM node:22-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json ./

# Install all dependencies
RUN npm install

# Copy the rest of the backend code
COPY . .

# Generate the Prisma client
RUN npx prisma generate

# Expose the API port
EXPOSE 4000

# Start the server
CMD ["node", "server.js"]
