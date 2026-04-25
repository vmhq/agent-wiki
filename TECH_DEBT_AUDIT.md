# Technical Debt Audit — Agent Wiki

> **Scope**: Concrete problems found in the codebase with file/line evidence.
> **Date**: 2025-04-25
> **Severity scale**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## A. Duplication & Redundancy

### A1. Identical Wiki Store Wrappers (Copy-Paste)
**Files**: `apps/web/lib/wiki.ts` and `apps/mcp/src/wiki.ts`
**Evidence**: Lines 1-40 in both files are **nearly identical** (only difference is one exports `getPublicErrorMessage` in web, missing in MCP).
**Impact**: 🟠 High — Any change to store initialization, exports, or WIKI_DIR logic must be made in two places.
**Recommendation**: Extract to shared package or create a factory function.

### A2. Duplicate `slugify` Implementation
**File 1**: `packages/wiki/src/index.ts:121-129`
**File 2**: `apps/web/components/editor/WikiEditor.tsx:19-27`
**Evidence**: Both functions implement identical slug transformation logic.
**Impact**: 🟡 Medium — Logic divergence risk if slug rules ever change.
**Recommendation**: Export `slugify` from `@agent-wiki/wiki` and reuse in WikiEditor.

### A3. Duplicate Tag Counting Logic
**File 1**: `apps/web/app/page.tsx:15-23`
**File 2**: `apps/web/components/shell/AppSidebar.tsx:66-76`
**Evidence**: Both compute tag frequency and sort by count.
**Impact**: 🟢 Low — Small duplication, but could be a shared utility.

### A4. Duplicate Date Formatting Pattern
**Evidence**: `formatDistanceToNow(new Date(entry.updated), { addSuffix: true })` appears in:
- `apps/web/app/wiki/[slug]/page.tsx:50`
- `apps/web/components/WikiCard.tsx:45`
- `apps/web/components/shell/AppSidebar.tsx:104`
- `apps/web/components/ViewSwitcher.tsx:49`
- `apps/web/app/maintenance/page.tsx:90`
**Impact**: 🟢 Low — Consistent pattern but repeated many times.

### A5. Duplicate Refresh-on-Focus Logic
**File 1**: `apps/web/components/RefreshOnFocus.tsx`
**File 2**: `apps/web/components/shell/AppSidebar.tsx:44-59`
**Evidence**: Both implement window focus + visibility change listeners with refresh logic.
**Impact**: 🟡 Medium — Sidebar does its own fetching, RefreshOnFocus does router.refresh(). Different approaches to the same problem.

---

## B. Acoplamiento y Dependencias

### B1. GraphView Component is a "God Component"
**File**: `apps/web/components/GraphView.tsx` (420 lines)
**Evidence**: 
- Mixes canvas rendering logic (`paintNode` function, 80+ lines)
- Mixes graph physics configuration (`handleEngineStop`)
- Mixes UI state management (query, selectedTag, selectedNode)
- Mixes data transformation (connection counting, filtering, tag color mapping)
- Directly imports `react-force-graph-2d` with dynamic loading
**Impact**: 🟠 High — Extremely difficult to test, reuse, or modify safely.

### B2. WikiEditor Component Mixed Concerns
**File**: `apps/web/components/editor/WikiEditor.tsx` (232 lines)
**Evidence**:
- UI rendering (form fields, mode switching)
- API client logic (`request()` function with fetch)
- LocalStorage management (`getStoredKey()`)
- Slug generation logic (`slugify()`)
- Tag parsing (`splitTags()`)
**Impact**: 🟠 High — Business logic (API calls) mixed with presentation.

### B3. Auth Module Mixes OAuth + API Key
**File**: `apps/mcp/src/auth.ts` (447 lines)
**Evidence**:
- OAuth 2.0 authorization server (metadata, authorize, token, register endpoints)
- JWT signing/verification
- API key validation
- HTML page generation (authorizePage, errorPage)
- PKCE verification
- In-memory client/code stores
**Impact**: 🟡 Medium — File is large but cohesive. Could be split into `oauth/` and `middleware/` submodules.

### B4. Core Library Mixes Many Responsibilities
**File**: `packages/wiki/src/index.ts` (491 lines)
**Evidence**:
- File I/O operations
- Schema validation (Zod)
- Cache management
- Search scoring algorithm
- Graph building
- Maintenance report generation
- History management
- Slug validation/transformation
**Impact**: 🟡 Medium — Single file does everything. Works for now but doesn't scale.

### B5. Web API Routes Lack Service Layer
**Evidence**: API routes (`apps/web/app/api/*/route.ts`) directly call store functions.
**Impact**: 🟡 Medium — No abstraction between HTTP transport and business logic.

---

## C. Inconsistencias de Patrones

### C1. Error Handling: 3+ Different Approaches
**Evidence**:
1. **Throw + try/catch + errorStatus**: Web API routes (`apps/web/app/api/wiki/[slug]/route.ts:25-35`)
2. **try/catch + return isError**: MCP tools (`apps/mcp/src/server.ts:75-88`)
3. **Throw WikiError**: Core library (`packages/wiki/src/index.ts:95-119`)
4. **Silent fail**: `AppSidebar.tsx:37-39` (catch block empty)
5. **Zod validation + early return**: Search route (`apps/web/app/api/search/route.ts:5-14`)

**Impact**: 🟠 High — Inconsistent user experience and makes error handling unpredictable.

### C2. Async Patterns Mixed
**Evidence**:
- `async/await`: Predominant (good)
- `new Promise((resolve) => { ... })`: `apps/mcp/src/index.ts:87-89` (authMiddleware wrapper)
- `callback`-style Express middleware: `apps/mcp/src/auth.ts:101`

**Impact**: 🟡 Medium — The Promise wrapper in MCP index is awkward.

### C3. Naming Conventions Inconsistent
**Evidence**:
| Pattern | Location | Example |
|---------|----------|---------|
| camelCase | Most files | `listEntries`, `getEntry` |
| snake_case | OAuth params | `redirect_uri`, `client_id` |
| PascalCase | Components | `WikiCard`, `GraphView` |
| UPPER_SNAKE | Env vars | `WIKI_API_KEY` |
| Mixed in schemas | `patchEntrySchema` | `insert_after` (enum value) |

**Impact**: 🟢 Low — Acceptable for domain-specific terms (OAuth uses snake_case by spec).

### C4. Import Extensions Inconsistent
**Evidence**:
- MCP server uses `.js` extensions: `import { createMcpServer } from "./server.js"`
- Web app uses no extensions: `import { WikiCard } from "@/components/WikiCard"`
- Package uses no extensions: `import fs from "fs"`

**Impact**: 🟢 Low — Driven by different module systems (ESNext vs bundler resolution).

### C5. Cache Invalidation is Manual
**Evidence**: `invalidate()` must be called after every write operation. If a developer forgets, stale data persists.
**File**: `packages/wiki/src/index.ts:231-233`
**Impact**: 🟡 Medium — Risk of stale reads if invalidate is missed.

---

## D. Código Muerto y "Hacks"

### D1. Unused Dependency: `fuse.js`
**File**: `apps/web/package.json:27`
**Evidence**: Declared as dependency but never imported or used. Search uses custom implementation in `packages/wiki/src/index.ts:337-361`.
**Impact**: 🟡 Medium — Increases bundle size and install time for no benefit.

### D2. `// eslint-disable-next-line` Suppressions
**Evidence**:
- `apps/web/components/GraphView.tsx:9` — `@typescript-eslint/no-explicit-any` for ForceGraph2D import
- `apps/web/components/GraphView.tsx:53` — `@typescript-eslint/no-explicit-any` for graphRef
**Impact**: 🟢 Low — Justified by library type limitations.

### D3. Hardcoded "local-secret" Fallback
**File**: `apps/mcp/src/auth.ts:50`
**Evidence**: `RESOLVED_CLIENT_SECRET = DEFAULT_CLIENT_SECRET ?? "local-secret"`
**Impact**: 🟡 Medium — Weak default secret in non-production environments.

### D4. Console-based Logging Only
**Evidence**:
- `apps/mcp/src/auth.ts:29-33` — `console.error` / `console.warn` for startup checks
- `apps/mcp/src/index.ts:180-186` — `console.log` for startup messages
- No structured logging library (pino, winston, etc.)
**Impact**: 🟡 Medium — Hard to parse logs in production; no log levels.

### D5. Inline CSS in OAuth HTML Pages
**File**: `apps/mcp/src/auth.ts:396-415`
**Evidence**: Full CSS stylesheet embedded in JavaScript string template.
**Impact**: 🟢 Low — Acceptable for simple OAuth consent page, but not maintainable.

### D6. `Number.isNaN(Date.parse(...))` Bug
**File**: `packages/wiki/src/index.ts:457`
**Evidence**: `Number.isNaN(Date.parse(entry.updated))` — `Date.parse()` returns `NaN` on invalid dates, but `isNaN()` (global) is the standard check. `Number.isNaN()` only returns true for `NaN` values, not for invalid date strings. This happens to work because `Date.parse()` returns `NaN` on invalid input, but it's semantically confusing.
**Impact**: 🟢 Low — Works correctly but confusing code.

---

## E. Riesgos de Producción

### E1. API Key Stored in localStorage (XSS Risk)
**File**: `apps/web/components/editor/WikiEditor.tsx:29-32, 64, 90`
**Evidence**: `window.localStorage.setItem("agent-wiki-api-key", apiKey)`
**Impact**: 🔴 Critical — Any XSS vulnerability exposes the API key. Should use httpOnly cookies or session storage at minimum.
**Mitigation**: Move API key to httpOnly cookie or server-side session.

### E2. No Rate Limiting
**Evidence**: Neither web app nor MCP server implement rate limiting.
**Impact**: 🔴 Critical — Vulnerable to brute force attacks on API key and OAuth endpoints, DoS via expensive operations (graph building, search).
**Mitigation**: Add `express-rate-limit` to MCP, implement Next.js middleware rate limiting for web.

### E3. In-Memory Session Stores (Not Scalable)
**File**: `apps/mcp/src/index.ts:83` and `apps/mcp/src/auth.ts:55-56`
**Evidence**:
```typescript
const sessions = new Map<string, StreamableHTTPServerTransport>();
const authCodes = new Map<...>();
const clients = new Map<...>();
```
**Impact**: 🟠 High — Sessions lost on restart; cannot scale horizontally.
**Mitigation**: Add Redis or database-backed sessions for production.

### E4. No Request Logging
**Evidence**: No middleware logs incoming requests (method, path, status, duration).
**Impact**: 🟠 High — Impossible to debug production issues or detect abuse.
**Mitigation**: Add Morgan or Pino HTTP logger to Express; add Next.js logging middleware.

### E5. Open CORS on MCP Server
**File**: `apps/mcp/src/index.ts:29-36`
**Evidence**: `cors({ origin: "*" })`
**Impact**: 🟡 Medium — By design for MCP clients, but combined with Bearer auth, this is acceptable. Should document this decision.

### E6. Cache Race Condition
**File**: `packages/wiki/src/index.ts:205-229`
**Evidence**: Cache is invalidated (`cache = null`) on writes, but concurrent reads between invalidation and refresh could return stale data. No locking mechanism.
**Impact**: 🟡 Medium — In a single-instance setup (file-based), this is unlikely to cause issues, but undefined behavior under load.

### E7. No Input Sanitization on Content
**Evidence**: Markdown content is stored as-is and rendered directly. While react-markdown handles XSS, the MCP server returns raw content to clients that may not sanitize.
**Impact**: 🟡 Medium — Potential XSS if MCP client renders content unsafely.

### E8. Missing Tests for Web and MCP
**Evidence**: 
- Only `packages/wiki/src/index.test.ts` exists (46 lines, 4 test cases)
- No tests for React components
- No tests for API routes
- No tests for MCP tools
- No tests for OAuth flows
**Impact**: 🟠 High — No regression protection; refactoring is risky.

### E9. Force-Dynamic on All Pages
**Evidence**: Every page has `export const dynamic = "force-dynamic"`
**Impact**: 🟡 Medium — Disables all static optimization; every request hits the file system. Fine for a wiki that changes frequently, but impacts performance.

### E10. No Backup/Restore Mechanism
**Evidence**: No tooling for backing up or restoring wiki data.
**Impact**: 🟡 Medium — Data loss risk if volume is corrupted.

---

## Resumen de Deuda Técnica

| Categoría | Cantidad | Severidad Promedio |
|-----------|----------|-------------------|
| Duplicación | 5 issues | Media |
| Acoplamiento | 5 issues | Media-Alta |
| Inconsistencias | 5 issues | Media |
| Código muerto/hacks | 6 issues | Baja-Media |
| Riesgos producción | 10 issues | Alta |

**Total**: 31 issues identificados

**Top 5 problemas a resolver urgentemente:**
1. 🔴 **API key en localStorage** (seguridad)
2. 🔴 **Sin rate limiting** (seguridad/estabilidad)
3. 🟠 **Sin tests** en web y MCP (calidad)
4. 🟠 **God Component GraphView** (mantenibilidad)
5. 🟠 **Wrappers duplicados** web/mcp (mantenibilidad)

El codebase no está en estado de emergencia, pero tiene deuda técnica acumulada que debe abordarse antes de escalar o exponer a más usuarios.
