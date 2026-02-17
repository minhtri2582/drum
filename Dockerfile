FROM nginx:alpine

COPY index.html styles.css app.js /usr/share/nginx/html/
COPY styles /usr/share/nginx/html/styles

EXPOSE 80
