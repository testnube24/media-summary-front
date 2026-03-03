FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Override API URL at image build time for portability across environments.
ARG API_URL=http://localhost:8080
RUN sed -i "s|https://api.tudominio.com|${API_URL}|g" src/environments/environment.prod.ts \
  && npm run build -- --configuration production

FROM nginx:1.27-alpine
COPY --from=build /app/dist/media-summary-app /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

