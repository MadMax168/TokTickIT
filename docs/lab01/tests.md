# Test Documentation — CPE334 Lab 1: TokTickIT

## Issue 1: Project Foundation

No automated tests in this issue.
This issue only verifies that the project initializes and starts correctly.

Manual verification performed:
- `cd server && npm run dev` → TokTickIT API running on port 3000 ✓
- `cd client && npm run dev` → React app opens on http://localhost:5173 ✓
- Prisma initialized → schema.prisma accepted by Prisma CLI without error ✓
- .gitignore confirmed excluding node_modules/, .env, dist/, server/generated/ ✓

---

## Issue 2: Health Check

| Test ID | File | Tool | Description |
|---------|------|------|-------------|
| API-01 | server/tests/lab-01/api.test.ts | Supertest | GET /api/health returns 200 |
| API-02 | server/tests/lab-01/api.test.ts | Supertest | Response body has status ok and service TokTickIT API |
| UI-01 | client/src/test/App.test.tsx | Vitest | TokTickIT IT Service Desk heading renders |
| UI-02 | client/src/test/App.test.tsx | Vitest | Loading state appears after clicking Check System |
| UI-03 | client/src/test/App.test.tsx | Vitest | Error message appears when API is unreachable |

---

## Issue 3: Category Seed

No automated tests in this issue.
This issue is database preparation only.

Manual verification performed:
- `npm run db:seed` ran without errors ✓
- Prisma Studio confirmed 4 rows in Category table ✓
- Running seed a second time produced no duplicates (upsert verified) ✓

---

## Issue 4: Category List

| Test ID | File | Tool | Description |
|---------|------|------|-------------|
| API-03 | server/tests/lab-01/api.test.ts | Supertest | GET /api/categories returns 200 |
| API-04 | server/tests/lab-01/api.test.ts | Supertest | Response contains array of 4 categories |
| API-05 | server/tests/lab-01/api.test.ts | Supertest | First category name is Account and Access |
| UI-04 | client/src/test/App.test.tsx | Vitest | Categories appear after successful API response |
| UI-05 | client/src/test/App.test.tsx | Vitest | Category names come from API not hardcoded |

---

## Complete Test Summary — All Issues

| Test ID | File | Tool | Description |
|---------|------|------|-------------|
| API-01 | server/tests/lab-01/api.test.ts | Supertest | GET /api/health returns 200 |
| API-02 | server/tests/lab-01/api.test.ts | Supertest | Response body has status ok and service name |
| API-03 | server/tests/lab-01/api.test.ts | Supertest | GET /api/categories returns 200 |
| API-04 | server/tests/lab-01/api.test.ts | Supertest | Response contains array of 4 categories |
| API-05 | server/tests/lab-01/api.test.ts | Supertest | First category name is Account and Access |
| UI-01 | client/src/test/App.test.tsx | Vitest | TokTickIT heading renders |
| UI-02 | client/src/test/App.test.tsx | Vitest | Loading state appears after clicking Check System |
| UI-03 | client/src/test/App.test.tsx | Vitest | Error message appears when API is unreachable |
| UI-04 | client/src/test/App.test.tsx | Vitest | Categories appear after successful API response |
| UI-05 | client/src/test/App.test.tsx | Vitest | Category names come from API not hardcoded |
