# ============================================================
# Weight Tracker — Frontend Dockerfile
# Multi-stage: "dev" for Vite dev server, "build" for static
# assets, "prod" for nginx serving the production build.
# ============================================================

# --- Stage: dev -------------------------------------------
# Used by docker-compose for hot-reload development
FROM node:20-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

# Vite needs --host to bind on 0.0.0.0 inside Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# --- Stage: build -----------------------------------------
# Compiles the React app to static files
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite picks up VITE_* env vars at build time
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID

RUN npm run build


# --- Stage: prod ------------------------------------------
# Serves the static build with nginx
FROM nginx:1.25-alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html

# Custom nginx config: serve SPA (all routes → index.html),
# proxy /api to the backend service.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
