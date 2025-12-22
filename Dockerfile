# Gebruik een lichtgewicht Nginx image als basis
FROM nginx:alpine

# Verwijder de standaard Nginx index pagina
RUN rm -rf /usr/share/nginx/html/*

# Kopieer de custom Nginx configuratie
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Kopieer ALLE benodigde HTML-bestanden in één keer:
# Dit omvat index.html, html_tester.html en code_diff.html
COPY *.* /usr/share/nginx/html/

# Expose poort 80 voor webverkeer
EXPOSE 80

# Start Nginx op de voorgrond
CMD ["nginx", "-g", "daemon off;"]
