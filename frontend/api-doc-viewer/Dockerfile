FROM nginx:1.25.2-alpine

COPY packages/api-doc-viewer/dist       	/usr/share/nginx/html
COPY packages/api-doc-viewer/index.html     /usr/share/nginx/html/index.html  
COPY nginx/nginx.conf                       /etc/nginx/nginx.conf
COPY nginx/entrypoint.sh                    /tmp

# giving permissions to nginx
RUN chmod -R 777 /var/log/nginx /var/cache/nginx/ /var/run/ /usr/share/nginx/html/ /etc/nginx/ && \
    chmod -R +x /tmp/

EXPOSE 8080

USER 1000

ENTRYPOINT ["/tmp/entrypoint.sh"]
