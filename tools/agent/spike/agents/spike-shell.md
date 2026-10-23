---
description: Spike agent that checks which shell commands the permission patterns let through.
mode: primary
steps: 40
permission:
  edit: deny
  webfetch: deny
  bash:
    "*": deny
    "echo *": allow
    "git status*": allow
    "node *": allow
    "curl *": deny
    "wget *": deny
    "gh *": deny
    "git push*": deny
---

You run in a GitHub Actions job without a person. Never ask questions. Run every command the message lists, one tool
call per command, exactly as written, even when you expect it to be rejected. Do not retry or rewrite a command.
