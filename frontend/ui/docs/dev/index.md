# Developer documentation

Documentation for people working on **APIHUB UI**: local setup, mocks, feature implementation notes, and frontend coding conventions.

| Guide                                                    | Purpose                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| [CODING_GUIDELINES.md](./CODING_GUIDELINES.md)           | TypeScript, React, MUI, imports, `/api` hooks, file layout, accessibility |
| [local-development.md](./local-development.md)           | Proxy mode, mixed mode, build                                             |
| [portal-mock-server.md](./portal-mock-server.md)         | Mock API reference, Vite overrides                                        |
| [ai-assistant-streaming.md](./ai-assistant-streaming.md) | AI Assistant live-turn implementation                                     |

Update [local-development.md](./local-development.md) and [portal-mock-server.md](./portal-mock-server.md) in the same PR when you change `packages/portal/vite.config.ts` or mock routes.

Update [CODING_GUIDELINES.md](./CODING_GUIDELINES.md) when you introduce or change team-wide frontend conventions.
