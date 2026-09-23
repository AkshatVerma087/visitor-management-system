# ---- Frontend Dockerfile ----
# Simple: install deps, build static files, serve with a lightweight server

FROM node:22-alpine

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json ./

# Install all dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Build the production bundle
RUN npm run build

# Install a simple static file server
RUN npm install -g serve

# Expose the frontend port
EXPOSE 3000

# Serve the built files from dist/
CMD ["serve", "-s", "dist", "-l", "3000"]
