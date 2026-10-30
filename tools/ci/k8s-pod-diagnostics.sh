#!/usr/bin/env bash
# Shows why a stack did not come up: every pod that is not ready, with the reason Kubernetes gives,
# the pod's Warning events, and the last lines of each container's log (and of the previous run when
# the container restarted). Deployments that have no pod at all show their conditions and the events
# of their ReplicaSets, where a missing Secret or ConfigMap surfaces.
#
# Writes the same findings twice: grouped into the job log with an `::error::` annotation per pod, and
# as Markdown appended to <summary-file> (pass "$GITHUB_STEP_SUMMARY"). The full logs stay in the
# kubernetes-logs artifact; this shows the part that names the cause.
#
# A diagnostic: it exits 0 whatever it finds, so the step that failed stays the one marked red.
#
# Usage: k8s-pod-diagnostics.sh <summary-file> <namespace> [namespace...]
set -uo pipefail

summary="${1:?usage: k8s-pod-diagnostics.sh <summary-file> <namespace...>}"
shift
[ $# -gt 0 ] || { echo "usage: k8s-pod-diagnostics.sh <summary-file> <namespace...>" >&2; exit 2; }

# Enough to show a stack trace or the last error lines, small enough for the 1 MiB summary limit.
log_lines=40
event_lines=10

# One line per container: `<kind> <name> <ready> <restarts> <state>`, the state being the waiting
# reason and message, the termination reason and exit code, or `running`.
containers() {
  jq -r '
    def state(s):
      if s.waiting then "waiting: \(s.waiting.reason // "")\(if s.waiting.message then " (\(s.waiting.message))" else "" end)"
      elif s.terminated then "terminated: \(s.terminated.reason // "") exit \(s.terminated.exitCode)"
      elif s.running then "running"
      else "unknown" end;
    def last(s): if s.terminated then ", last run: \(s.terminated.reason // "") exit \(s.terminated.exitCode)" else "" end;
    ((.status.initContainerStatuses // [])[] | "init \(.name) \(.ready) \(.restartCount) \(state(.state))\(last(.lastState // {}))"),
    ((.status.containerStatuses // [])[] | "main \(.name) \(.ready) \(.restartCount) \(state(.state))\(last(.lastState // {}))")
  '
}

# The first reason that explains the pod, for the table: a waiting or terminated container, a failed
# condition (Unschedulable), or the phase.
reason() {
  jq -r '
    [ ((.status.initContainerStatuses // []) + (.status.containerStatuses // []))[]
      | select(.ready | not)
      | (.state.waiting.reason // .state.terminated.reason // empty)
        + (if .lastState.terminated then " (last exit \(.lastState.terminated.exitCode))" else "" end) ]
    + [ (.status.conditions // [])[] | select(.status == "False" and .reason != null) | "\(.type): \(.reason)" ]
    + [ .status.phase ]
    | first'
}

md() { printf '%s\n' "$@" >> "$summary"; }

# Without this, a cluster that was never created would read as one whose pods are all ready.
if ! kubectl get namespaces >/dev/null 2>&1; then
  echo "no Kubernetes cluster answers: the failure came before the stack was deployed"
  md '### Pods that did not start' '' 'No Kubernetes cluster answers: the failure came before the stack was deployed.' ''
  exit 0
fi

bad_pods=()
for ns in "$@"; do
  while IFS= read -r pod; do
    [ -n "$pod" ] && bad_pods+=("$ns/$pod")
  done < <(kubectl get pods --namespace "$ns" --output=json 2>/dev/null | jq -r '
    .items[]
    | select(.status.phase != "Succeeded")
    | select([ (.status.containerStatuses // [])[] | .ready ] | (length == 0 or (all | not)))
    | .metadata.name')
done

empty_deployments=()
for ns in "$@"; do
  while IFS= read -r d; do
    [ -n "$d" ] && empty_deployments+=("$ns/$d")
  done < <(kubectl get deployments --namespace "$ns" --output=json 2>/dev/null | jq -r '
    .items[] | select((.status.replicas // 0) == 0 and (.spec.replicas // 1) > 0) | .metadata.name')
done

md '### Pods that did not start' ''
if [ ${#bad_pods[@]} -eq 0 ] && [ ${#empty_deployments[@]} -eq 0 ]; then
  echo "every pod in $* is ready"
  md "Every pod in \`$*\` is ready: the failure is not a pod that did not start. See the failed step's log." ''
  exit 0
fi

if [ ${#bad_pods[@]} -gt 0 ]; then
  md '| namespace | pod | reason |' '|---|---|---|'
  for entry in "${bad_pods[@]}"; do
    ns="${entry%%/*}"; pod="${entry#*/}"
    r="$(kubectl get pod "$pod" --namespace "$ns" --output=json | reason)"
    md "| \`$ns\` | \`$pod\` | $r |"
    echo "::error title=Pod not ready::$ns/$pod: $r"
  done
  md ''
fi

for entry in "${bad_pods[@]}"; do
  ns="${entry%%/*}"; pod="${entry#*/}"
  json="$(kubectl get pod "$pod" --namespace "$ns" --output=json)"
  status="$(containers <<< "$json")"
  events="$(kubectl get events --namespace "$ns" \
    --field-selector "involvedObject.kind=Pod,involvedObject.name=$pod,type=Warning" \
    --sort-by=.lastTimestamp \
    --output=custom-columns='LAST:.lastTimestamp,REASON:.reason,COUNT:.count,MESSAGE:.message' \
    2>/dev/null | tail -n "$event_lines")"

  echo "::group::$ns/$pod"
  echo "containers (kind name ready restarts state):"
  echo "$status" | sed 's/^/  /'
  echo "warning events:"
  echo "${events:-  none}" | sed 's/^/  /'

  md "<details><summary><code>$ns/$pod</code></summary>" ''
  md '```text' 'kind name ready restarts state' "$status" '```' ''
  [ -n "$events" ] && md 'Warning events:' '' '```text' "$events" '```' ''

  while read -r kind name _ restarts _; do
    [ -n "$name" ] || continue
    # A container that never started has no log; kubectl says so on stderr, which is the answer.
    current="$(kubectl logs --namespace "$ns" "$pod" --container "$name" --tail="$log_lines" 2>&1)"
    echo "log of $kind container $name, last $log_lines lines:"
    echo "$current" | sed 's/^/  /'
    md "Log of \`$name\`, last $log_lines lines:" '' '```text' "$current" '```' ''
    if [ "$restarts" != 0 ]; then
      previous="$(kubectl logs --namespace "$ns" "$pod" --container "$name" --previous --tail="$log_lines" 2>&1)"
      echo "log of $kind container $name before its last restart:"
      echo "$previous" | sed 's/^/  /'
      md "Log of \`$name\` before its last restart:" '' '```text' "$previous" '```' ''
    fi
  done <<< "$status"
  echo "::endgroup::"
  md '</details>' ''
done

for entry in "${empty_deployments[@]}"; do
  ns="${entry%%/*}"; d="${entry#*/}"
  conditions="$(kubectl get deployment "$d" --namespace "$ns" --output=json | jq -r \
    '(.status.conditions // [])[] | "\(.type)=\(.status) \(.reason // ""): \(.message // "")"')"
  events="$(kubectl get events --namespace "$ns" --field-selector "involvedObject.kind=ReplicaSet,type=Warning" \
    --sort-by=.lastTimestamp --output=custom-columns='OBJECT:.involvedObject.name,REASON:.reason,MESSAGE:.message' \
    2>/dev/null | grep -F -- "$d-" | tail -n "$event_lines")"
  echo "::error title=Deployment without pods::$ns/$d has no pod"
  echo "::group::$ns/$d (deployment without pods)"
  echo "$conditions" | sed 's/^/  /'
  echo "${events:-  no ReplicaSet warning events}" | sed 's/^/  /'
  echo "::endgroup::"
  md "<details><summary>deployment <code>$ns/$d</code> has no pod</summary>" ''
  md '```text' "$conditions" "$events" '```' '' '</details>' ''
done

exit 0
