# Production Image for Frontend SPA
FROM nginx:1.27-alpine

# Set working directory
WORKDIR /usr/share/nginx/html

# Clean default static files
RUN rm -rf ./*

# Copy production build assets from Vite
COPY dist /usr/share/nginx/html

# Copy optimized production Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check probe (using IPv4 127.0.0.1 to avoid Alpine IPv6 localhost resolution issue)
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
