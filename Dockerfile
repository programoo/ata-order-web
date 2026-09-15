# build stage: compile the Vite app into static files
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# a relative base URL switches the MSW mock off and makes the browser call its
# own origin; nginx then proxies /api/ to the backend (see nginx.conf)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# run stage: serve dist/ with nginx (no Node at runtime)
FROM nginx:1.29-alpine
# where /api/ is proxied to; defaults to the salary-app k8s Service in the same
# namespace. Override at run time, e.g. -e API_UPSTREAM=http://host.docker.internal:8080
ENV API_UPSTREAM=http://salary-app
# files in templates/ are envsubst'ed into conf.d/ when the container starts
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
