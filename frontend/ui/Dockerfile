# APIHUB UI: nginx serving the two built front ends. The build context is the workspace root,
# and the image copies the dist trees of the workspace build:
#
#   docker build -f frontend/ui/Dockerfile .

FROM docker.io/nginx:1.31.3-alpine3.24

# No GIT_BRANCH or GIT_HASH build args: the content hash cannot see them, so a retagged image
# reported the ref that built it first. The commit and branch are OCI annotations on each branch
# tag instead (`docker buildx imagetools inspect <image>:<tag>`).

COPY frontend/ui/nginx/errors              /var/www/error
COPY frontend/ui/nginx/nginx.conf.template /app/nginx.conf.template
COPY frontend/ui/nginx/entrypoint.sh       /app/entrypoint.sh

# ui-agents is built with base '/agents/', ui-portal with '/'.
COPY frontend/ui/packages/agents/dist/ /usr/share/nginx/html/agents/
COPY frontend/ui/packages/portal/dist/ /usr/share/nginx/html/portal/

# Sets the correct file creation time.
# https://github.com/Netcracker/qubership-apihub/issues/238#issuecomment-3019713963
RUN find /usr/share/nginx/html -type f -exec touch {} +

RUN mkdir -p /app/nginx && \
    chmod -R 777 /var/log/nginx /var/cache/nginx/ /var/run/ /usr/share/nginx/html/ /app/nginx && \
    chmod -R +x /app/

WORKDIR /app

EXPOSE 8080

USER 1000

ENTRYPOINT ["/app/entrypoint.sh"]
