# AI Use — CPE334 Lab 1: TokTickIT

## LLM and Tools Used
- **LLM**: Claude (claude.ai) — planning, specification review, code generation
- **CLI Agent**: Codex — inline code execution and file generation
- **IDE**: VS Code

---

## Issue 1: Project Foundation

| Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|
| Plan project structure | "I am building TokTickIT for CPE334. Tech stack is React + TypeScript + Vite + Bootstrap for frontend, Node.js + Express + TypeScript for backend, PostgreSQL + Prisma for database. Give me the folder structure and setup order without writing code yet." | Got a clear setup order in one shot. Helped me understand the server should be initialized before the client. |
| Fix ts-node compatibility | "Running ts-node src/index.ts on Node.js v24 gives TypeError: Cannot read properties of undefined reading fileExists. How do I fix this without downgrading Node?" | Suggested switching to tsx which solved the issue immediately. No further iteration needed. |
| Setup tsconfig | "Give me a tsconfig.json for Node.js 24 + Express + TypeScript that uses commonjs modules and includes src and prisma folders." | Worked first try. Adjusted target to ES2022 for Node 24 compatibility. |
| Setup Vite with Vitest | "Add Vitest to an existing Vite + React + TypeScript project. Configure jsdom environment and a setup file for Testing Library." | Had to follow up to specify the setupFiles path correctly. Also needed to change defineConfig import to vitest/config for proper type checking. |
| Setup .gitignore | "Give me a .gitignore for a monorepo with a React Vite client and a Node.js Express server. Must exclude node_modules, .env, dist, and Prisma generated client." | Clean output. Added server/generated/ after peer review flagged it. |

### Reflection
Setting up the project foundation with AI assistance saved significant time on boilerplate
configuration. The ts-node to tsx migration was not obvious and would have taken much
longer without AI help. I learned to add explicit constraints like "do not install new packages"
and "do not modify X file" to prevent the agent from going beyond scope.

---

## Issue 2: API Health Check

| Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|
| Implement health endpoint | "Add GET /api/health to the existing Express + TypeScript backend. Return HTTP 200 with JSON { status: 'ok', service: 'TokTickIT API' }. Write a Supertest test that verifies the status code and response body." | Worked cleanly on first attempt. Both endpoint and tests generated correctly. |
| Update React UI | "Update App.tsx to show a Check System button. On click call GET /api/health. Show loading state while fetching, System Status Online when successful, and an error message when fetch fails. Use Bootstrap classes." | First version did not handle the offline case properly. Added explicit try-catch guidance in follow-up prompt. |
| Write Vitest tests | "Write Vitest tests for the App component. Test 1: heading renders. Test 2: loading state appears after clicking Check System. Test 3: error message appears when fetch rejects. Use vi.spyOn(global, 'fetch') for mocking." | Needed one follow-up to fix the mock structure. Final output covered all three states correctly. |

### Reflection
Single-responsibility prompts worked well here. Each prompt covered one endpoint or one
component. The happy path online state test was noted as missing by peer review, which
I noted for future improvement. Moving the hardcoded API URL to an env variable is a
known improvement to make in a later sprint.

---

## Issue 3: Create and Seed Categories

| Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|
| Add Prisma Category model | "Add a Category model to schema.prisma with fields: id autoincrement primary key, name String unique, createdAt DateTime default now. Do not add any other models." | Generated correctly on first attempt. Ran migration without issues. |
| Write idempotent seed script | "Create prisma/seed.ts that inserts four categories: Account and Access, Hardware, Software, Network. Use upsert so the script is safe to run multiple times without duplicates. Call prisma.$disconnect() in a finally block." | First attempt used create which would fail on re-run. Prompted again to use upsert. Final version was idempotent and correct. |

### Reflection
The key learning here was specifying idempotent behavior explicitly in the prompt.
Without the word "upsert" or "safe to run multiple times", the agent defaulted to create
which would throw on duplicate name. Being precise about edge cases in prompts
produces significantly better output.

---

## Issue 4: Display Category List

| Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|
| Add category API endpoint | "Add GET /api/categories to the Express backend. Query all categories from PostgreSQL via Prisma ordered by id ascending. Return only id and name as a JSON array. Keep existing GET /api/health untouched." | Worked first try. Confirmed orderBy id asc produces consistent order across runs. |
| Update UI with categories | "Update App.tsx to call both /api/health and /api/categories in parallel using Promise.all. Show category list under Supported Request Categories after success. Keep existing loading and error states. Never hardcode category names." | Had to follow up to fix how Promise.all handled two separate response bodies. Second attempt was correct. |
| Write Vitest tests for categories | "Write Vitest tests for the category list. Mock both fetch calls — health returns ok, categories returns 4 items. Test that all category names appear in the DOM. Use mockResolvedValueOnce for sequential mocks." | First mock only handled one fetch call. Added mockResolvedValueOnce chaining in follow-up. Final tests passed cleanly. |

### Reflection
Using Promise.all for parallel fetches was the right call for performance but introduced
complexity in Vitest mocking. Specifying mockResolvedValueOnce explicitly in the prompt
resolved the issue in one follow-up. This reinforced the pattern of including expected
implementation details in prompts, not just the desired behavior.

---

## Overall Reflection

Across all 4 issues, Claude and Codex reduced boilerplate and setup time significantly.
The most effective prompt pattern was: state the current file structure, specify what to add,
specify what NOT to touch, and include the expected output format.
The hardest part was Vitest mocking for multiple concurrent fetch calls, which required
iteration. Going forward I will include mocking strategy details in the initial prompt
to avoid back-and-forth.
