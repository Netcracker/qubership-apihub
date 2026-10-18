{{- define "java-task-consumer.name" -}}
qubership-apihub-java-task-consumer
{{- end }}

{{- define "java-task-consumer.fullname" -}}
{{ include "java-task-consumer.name" . }}
{{- end }}

{{- define "java-task-consumer.labels" -}}
app.kubernetes.io/name: {{ include "java-task-consumer.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: job
app.kubernetes.io/part-of: qubership-apihub
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/technology: java
{{- end }}

{{- define "java-task-consumer.registryAuthEnabled" -}}
{{- or .Values.registryAuth.existingSecret .Values.registryAuth.configJson -}}
{{- end }}

{{- define "java-task-consumer.registryAuthSecretName" -}}
{{- if .Values.registryAuth.existingSecret -}}
{{ .Values.registryAuth.existingSecret }}
{{- else -}}
{{ include "java-task-consumer.fullname" . }}-registry-auth
{{- end -}}
{{- end }}
