---
name: full-codebase-security-audit
description: Deep-scans the entire codebase for security vulnerabilities, RLS gaps, auth bypasses, sensitive data exposure, and deployment risks. Launches 5 parallel agents that read every migration, hook, component, and config file. Use when the user asks for a security review, security audit, penetration test preparation, production readiness check, or gap analysis. Triggers on "security audit", "full security scan", "is this safe for production", "check security", "codebase security", "pen test prep", "productie review", "security review".
---
# Security Review Skill
Perform a **comprehensive, code-based security and deployment gap analysis** on the current project. This is not a checklist exercise — read actual code, trace data flows, and verify claims against reality.
## Execution Steps
### Phase 1: Discovery (parallel)
Launch multiple exploration agents in parallel to investigate:
**Agent 1 - Authentication & Authorization:**
- Read all auth-related files (hooks, providers, middleware, login pages)
- Check for dev bypasses, hardcoded credentials, mock sessions, test accounts
- Trace how sessions work (JWT, cookies, localStorage)
- Check if MFA/2FA is implemented
- Verify session revocation capabilities
- Check password policies (minimum length, complexity)
**Agent 2 - Database & RLS Security:**
- Read ALL database migrations, schema files, and ORM configurations
- For Supabase: verify RLS is enabled on every table, audit every policy per operation (SELECT/INSERT/UPDATE/DELETE) per role
- Check for overly permissive policies (`USING (true)`, `FOR ALL TO authenticated`)
- Verify audit log immutability (triggers blocking UPDATE/DELETE)
- Check for service_role key leaks in frontend code
- Look for SQL injection risks
- Check for column-level encryption on sensitive fields (PII, health, justice, financial)
**Agent 3 - Roles, Permissions & Sensitive Data:**
- Map every role to exact capabilities (view, edit, export, delete per table)
- Check if PermissionGate/guards are UI-only or server-enforced
- Identify all sensitive/PII fields and trace who can access them
- Check if sensitive field access is logged (`view_sensitive`)
- Verify export functions filter data by role
- Check for privilege escalation paths
**Agent 4 - Exports, Uploads & File Security:**
- Read all export functions (Word, Excel, CSV, PDF generation)
- Check if exports include sensitive data without role filtering
- Check if exports are logged in audit trail
- Check for spreadsheet/CSV formula injection protection
- Read file upload code: validate type, size, content, malware scanning
- Check storage bucket policies (per-user access control)
- Check for signed URLs vs public access
**Agent 5 - Deployment, Environment & Infrastructure:**
- Check for CI/CD configuration (GitHub Actions, Vercel, Netlify, Docker)
- Read .env files, .env.example, .gitignore
- Check for hardcoded secrets, API keys, tokens in source code
- Check for separated environments (dev/staging/prod)
- Check security headers (CSP, X-Frame-Options, HSTS, etc.)
- Identify all third-party services and data processors
- Check for error tracking with PII scrubbing
- Check for monitoring and alerting setup
### Phase 2: Analysis
After all agents complete, compile findings into a structured report.
### Phase 3: Report Output
Generate a gap analysis with this exact structure:
```markdown
# Security & Deployment Gap-Analyse
## Samenvatting
[2-3 zinnen over de algemene status]
## Beantwoording Prioriteitsvragen
For each of these 12 questions, give a concrete, code-referenced answer:
1. Dev-bypass: bestaat die en hoe is productie beschermd?
2. Gescheiden dev/staging/prod omgevingen?
3. Hoe zijn RLS/access policies getest per rol en per tabel?
4. Welke rollen mogen gevoelige data zien, exporteren en wijzigen?
5. Is MFA verplicht voor beheerders?
6. Hoe worden exports beveiligd en gelogd?
7. Hoe worden uploads gevalideerd en gescand?
8. Hoe voorkom je data-lek in logs, audit trails en foutmeldingen?
9. Hoe beheer je migrations, policies en rollback?
10. Zijn backups actief en is restore getest?
11. Waar staan frontend, database, storage en externe verwerking fysiek?
12. Wie monitort verdachte acties en wat is het incidentproces?
## Prioriteitenmatrix
### KRITIEK (blokkeer livegang)
| # | Bevinding | Locatie | Impact |
|---|-----------|---------|--------|
### HOOG (voor livegang oplossen)
| # | Bevinding | Locatie | Impact |
|---|-----------|---------|--------|
### GEMIDDELD (kort na livegang)
| # | Bevinding | Locatie | Impact |
|---|-----------|---------|--------|
### LAAG (backlog)
| # | Bevinding | Locatie | Impact |
|---|-----------|---------|--------|
## RLS/Policy Matrix
[Table showing per-table, per-role, per-operation access]
## Gevoelige Data Matrix
[Table showing which roles can view/edit/export/delete sensitive fields]
## Aanbevelingen
[Ordered by priority, with specific code changes suggested]
```
## Important Rules
- **Read actual code** — never assume based on file names alone
- **Verify claims** — if a feature is "defined", check if it's actually called/used
- **Trace data flows** — follow sensitive data from input to storage to output
- **Check both UI and server** — UI-only protection is not security
- **Reference file paths and line numbers** in all findings
- **Test for absence** — missing security controls are findings too
- **Be specific** — "exports are insecure" is not a finding; "readonly users can export CSV with justice data via RapportageDeelnemers.tsx line 141 without audit logging" is
- **Prioritize by impact** — data breach > privilege escalation > missing logging > cosmetic
- **Consider GDPR/AVG** — especially for Dutch/EU projects with sensitive personal data
- **Check for OWASP Top 10** — XSS, injection, broken auth, sensitive data exposure, etc.
## Tech Stack Detection
Auto-detect and adapt the review based on the stack:
- **Supabase**: Focus on RLS policies, service_role key exposure, auth bypass, storage policies
- **Firebase**: Focus on Firestore rules, Cloud Functions auth, storage rules
- **Next.js/Express**: Focus on middleware auth, API route protection, CORS
- **Django/Flask**: Focus on decorators, CSRF, ORM injection, session management
- **Any stack**: Always check env vars, secrets, auth flow, input validation, output encoding
