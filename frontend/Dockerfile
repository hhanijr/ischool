# ==========================================
# Development Frontend Dockerfile
# Optimized for Next.js Hot-Reload
# ==========================================
FROM node:18-alpine

WORKDIR /app

# Install dependencies first (for better caching)
COPY package.json package-lock.json ./
RUN npm install

# Copy source code (though it will be overridden by bind mount in compose)
COPY . .

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Next.js development server
CMD ["npm", "run", "dev"]
