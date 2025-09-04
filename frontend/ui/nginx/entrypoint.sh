#!/bin/sh
if ! whoami &> /dev/null; then
  if [ -w /etc/passwd ]; then
    echo "default:x:$(id -u):0:default user:${HOME}:/sbin/nologin" >> /etc/passwd
  fi
fi

DNS_RESOLVERS="$(awk '/^nameserver/{print $2}' /etc/resolv.conf | paste -sd' ' -)"
export DNS_RESOLVERS

POD_NAMESPACE="${POD_NAMESPACE:-}"
if [ -z "$POD_NAMESPACE" ] && [ -f /var/run/secrets/kubernetes.io/serviceaccount/namespace ]; then
  POD_NAMESPACE="$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)"
fi
[ -n "$POD_NAMESPACE" ] || POD_NAMESPACE="default"
export POD_NAMESPACE

CLUSTER_DOMAIN="$(awk '
  /^search/ {
    for (i=2; i<=NF; i++) {
      if ($i ~ /\.svc\./) { sub(/.*\.svc\./, "", $i); print $i; exit }
    }
  }' /etc/resolv.conf || true
)"
[ -n "${CLUSTER_DOMAIN:-}" ] || CLUSTER_DOMAIN="cluster.local"
export CLUSTER_DOMAIN

adjust_addr() {
  var="$1"
  val="$(eval echo \$$var)"
  case "$val" in
    *localhost*|*host.docker.internal*) ;;
    "")
      val="invalid.invalid.:80"
      ;;
    *)
      val="${val%:*}.${POD_NAMESPACE}.svc.${CLUSTER_DOMAIN}.:${val##*:}"
      ;;
  esac
  eval export $var=\"\$val\"
}

adjust_addr APIHUB_NC_SERVICE_ADDRESS
adjust_addr API_LINTER_SERVICE_ADDRESS

# No need to modify APIHUB_BACKEND_ADDRESS as its resolution is static

envsubst '${APIHUB_BACKEND_ADDRESS} ${APIHUB_NC_SERVICE_ADDRESS} ${API_LINTER_SERVICE_ADDRESS} ${DNS_RESOLVERS}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
nginx -g "daemon off;"
