# AI use record

LLM used: OpenAI Codex, working in the shared repository with human review after each issue.

Selected prompts and use:

1. Sprint 3 specification-agent prompt: read the Lab 3 contract and identify Issue 2 scope.
2. Issue 2 implementation prompt: build schema, migration, seed, authentication, middleware, and auth UI.
3. Peer review correction: align IT Priority, Staff/Admin ownership, and seeded collaboration data.
4. Issue 3 implementation prompt: replace selector identity with authenticated Requester identity and add Public Comments.
5. Issue 3 review correction: restore Create Ticket, attachment controls, and the resolution indicator.
6. Issue 4 implementation prompt: add Staff queue, assignment, priority, status, and Internal Notes.
7. Issue 4 review correction: make Staff queue/detail controls usable through the UI.
8. Issue 5 implementation prompt: add Administrator user management and safety rules.
9. Issue 5 review correction: add password reset confirmation and self-role protection.
10. Issue 6 release-audit prompt: reconcile tests, authorization, documentation, and release readiness.

Reflection: the specification work established contract boundaries and deferred dependencies explicitly. The implementation work translated those boundaries into server-enforced authorization, migrations, seed fixtures, and UI flows. Human peer review caught incomplete UI paths and password/safety gaps; each was addressed before the next audit pass. The final release audit records remaining gaps instead of marking unverified behavior as complete.
