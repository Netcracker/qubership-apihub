#!/bin/sh
if ! whoami &> /dev/null; then
  if [ -w /etc/passwd ]; then
    echo "default:x:$(id -u):0:default user:${HOME}:/sbin/nologin" >> /etc/passwd
  fi
fi

DNS_RESOLVERS="$(awk '/^nameserver/{print $2}' /etc/resolv.conf | paste -sd' ' -)"
export DNS_RESOLVERS


envsubst '${APIHUB_BACKEND_ADDRESS} ${APIHUB_NC_SERVICE_ADDRESS} ${API_LINTER_SERVICE_ADDRESS} ${DNS_RESOLVERS}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
nginx -g "daemon off;"
