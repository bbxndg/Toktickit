# Automated Tests Summary — Lab 1

## Test Specifications

| ID | Tool | Scope | Description | Status |
|---|---|---|---|---|
| API-01 | Supertest | Server (`/api/health`) | `/api/health` returns HTTP 200 and `{ status: "ok", service: "TokTickIT API" }` | Passed |
| API-02 | Supertest | Server (`/api/categories`) | `/api/categories` returns the four seeded categories in order | Passed |
| UI-01 | Vitest | Client (App) | Heading "TokTickIT" renders correctly | Passed |
| UI-02 | Vitest | Client (App) | Loading state transitions to category list display | Passed |
| UI-03 | Vitest | Client (App) | Displays useful error message when API fails | Passed |
