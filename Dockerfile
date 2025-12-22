FROM nginx:alpine

# Verwijder de standaard nginx bestanden
RUN rm -rf /usr/share/nginx/html/*

# Kopieer ALLE bestanden uit de huidige map naar de container
COPY . /usr/share/nginx/html/

# Kopieer onze eigen nginx configuratie
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
