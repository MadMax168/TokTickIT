---

## Issue 4: Display Category List

| Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|
| Add category API | "Add GET /api/categories to Express backend. Query all categories from PostgreSQL via Prisma ordered by id. Return only id and name as JSON array." | Worked first try. Added orderBy id asc after noticing inconsistent order in first manual test. |
| Update UI with categories | "Update App.tsx to call both /api/health and /api/categories in parallel using Promise.all. Show category list after success. Keep existing loading and error states." | Had to follow up to fix the fetch mock structure for two simultaneous calls in Vitest. |
| Write Vitest tests for categories | "Write Vitest tests for category list. Mock both fetch calls — health returns ok, categories returns 4 items. Test that category names appear in the DOM." | First mock attempt only mocked one fetch call. Added sequential mock returns using mockResolvedValueOnce. |

---

## Overall Reflection

Across all 4 issues, using AI coding agents significantly reduced boilerplate setup time.
The most effective pattern was giving single-responsibility prompts with explicit constraints
(do not install new packages, do not modify X file). Prompts that included the expected
output format — such as pasting the expected JSON response — consistently produced
better results than open-ended prompts. The hardest part was Vitest mocking for
multiple fetch calls, which required two iterations to get right.
