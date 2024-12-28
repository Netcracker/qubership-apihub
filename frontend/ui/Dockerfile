FROM nginx:1.26.0-alpine3.19

COPY packages/editor/dist                /usr/share/nginx/html/editor
COPY packages/agents/dist      /usr/share/nginx/html/agents
COPY packages/portal/dist                /usr/share/nginx/html/portal
COPY nginx/errors                        /var/www/error
COPY nginx/nginx.conf.template           /etc/nginx/nginx.conf.template
COPY nginx/entrypoint.sh                 /tmp

# giving permissions to nginx
RUN chmod -R 777 /var/log/nginx /var/cache/nginx/ /var/run/ /usr/share/nginx/html/ /etc/nginx/ && \
    chmod -R +x /tmp/

EXPOSE 8080

USER 1000

ENTRYPOINT ["/tmp/entrypoint.sh"]
