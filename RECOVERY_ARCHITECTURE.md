# Recovery Architecture — Agent Wiki

> **Goal**: Define the target state for a maintainable, testable, scalable codebase.
> **Constraint**: Must be achievable incrementally without rewriting from scratch.
> **Date**: 2025-04-25

---

## 1. Target Folder Structure

```
agent-wiki/
├── apps/
│   ├── web/                          # Next.js 16 app (presentation layer)
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── (routes)/             # Grouped routes
│   │   │   │   ├── page.tsx          # Index
│   │   │   │   ├── wiki/
│   │   │   │   ├── edit/
│   │   │   │   ├── search/
│   │   │   │   ├── graph/
│   │   │   │   └── maintenance/
│   │   │   ├── api/                  # API routes (thin controllers)
│   │   │   │   ├── wiki/
│   │   │   │   ├── search/
│   │   │   │   ├── graph/
│   │   │   │   ├── maintenance/
│   │   │   │   └── health/
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/               # React components (presentation only)
│   │   │   ├── ui/                   # Reusable UI primitives
│   │   │   ├── layout/               # Layout components (Navbar, Sidebar, etc.)
│   │   │   ├── wiki/                 # Wiki-specific components
│   │   │   │   ├── WikiCard.tsx
│   │   │   │   ├── WikiListItem.tsx
│   │   │   │   ├── WikiEditor.tsx    # UI only, no API logic
│   │   │   │   └── MarkdownRenderer.tsx
│   │   │   ├── graph/
│   │   │   │   ├── GraphView.tsx     # Orchestrates sub-components
│   │   │   │   ├── GraphCanvas.tsx   # Canvas rendering logic
│   │   │   │   ├── GraphControls.tsx # Zoom/filter UI
│   │   │   │   └── NodePanel.tsx     # Selected node detail panel
│   │   │   └── search/
│   │   │       ├── SearchBar.tsx
│   │   │       └── TagCloud.tsx
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── useWikiApi.ts         # Centralized API client
│   │   │   ├── useCommandPalette.ts
│   │   │   └── useTheme.ts
│   │   ├── lib/                      # Thin adapters
│   │   │   ├── wiki.ts               # Store instance + re-exports
│   │   │   └── auth.ts               # Auth middleware
│   │   └── types/
│   │       └── index.ts              # Web-specific type augmentations
│   │
│   └── mcp/                          # MCP server (presentation + infra)
│       ├── src/
│       │   ├── index.ts              # Express server bootstrap
│       │   ├── server.ts             # MCP tool definitions
│       │   ├── routes/               # HTTP routes
│       │   │   ├── health.ts
│       │   │   ├── oauth.ts          # OAuth router (extracted from auth.ts)
│       │   │   └── mcp.ts            # MCP transport routes
│       │   ├── middleware/           # Express middleware
│       │   │   ├── auth.ts           # Auth middleware only
│       │   │   ├── rateLimit.ts      # Rate limiting
│       │   │   ├── requestLogger.ts  # Structured logging
│       │   │   └── errorHandler.ts   # Global error handler
│       │   ├── services/             # Application services
│       │   │   └── oauthService.ts   # OAuth business logic
│       │   └── types/
│       │       └── index.ts
│       └── ...
│
├── packages/
│   └── wiki/                         # Domain + Application layer
│       ├── src/
│       │   ├── domain/               # Pure business logic
│       │   │   ├── entities/
│       │   │   │   ├── WikiEntry.ts
│       │   │   │   ├── GraphData.ts
│       │   │   │   └── MaintenanceReport.ts
│       │   │   ├── valueObjects/
│       │   │   │   ├── Slug.ts       # Slug validation/transformation
│       │   │   │   └── Tags.ts       # Tag normalization
│       │   │   └── repositories/
│       │   │       └── WikiRepository.ts  # Interface only
│       │   │
│       │   ├── application/          # Use cases / services
│       │   │   ├── WikiService.ts    # CRUD operations
│       │   │   ├── SearchService.ts  # Search logic
│       │   │   ├── GraphService.ts   # Graph building
│       │   │   └── MaintenanceService.ts
│       │   │
│       │   ├── infrastructure/       # Technical implementations
│       │   │   ├── FileSystemWikiRepository.ts
│       │   │   └── InMemoryCache.ts
│       │   │
│       │   ├── shared/               # Truly generic utilities (max 5 files)
│       │   │   ├── errors.ts         # WikiError, errorStatus, getPublicErrorMessage
│       │   │   ├── schemas.ts        # Zod schemas
│       │   │   └── utils.ts          # slugify, excerptFromContent, safeTimestamp
│       │   │
│       │   └── index.ts              # Public API exports
│       └── ...
│
├── docker/
│   ├── entrypoint-web.sh
│   └── entrypoint-mcp.sh
│
├── .github/
│   └── workflows/
│       └── docker.yml
│
├── wiki/                             # Data directory (gitignored)
├── package.json
├── docker-compose.yml
└── AGENTS.md                         # Updated after each phase
```

---

## 2. Patterns to Unify

### 2.1 Error Handling: Result/Either Pattern

**Current state**: 5+ different error handling approaches.

**Target state**: Single `Result<T, E>` type used across all layers.

```typescript
// packages/wiki/src/shared/result.ts
type Result<T, E = WikiError> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

**Usage in domain layer**:
```typescript
function getEntry(slug: string): Result<WikiEntry | null> {
  try {
    const entry = repository.findBySlug(slug);
    return ok(entry);
  } catch (error) {
    return err(normalizeError(error));
  }
}
```

**Usage in web API**:
```typescript
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params;
  const result = wikiService.getEntry(slug);
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: result.error.statusCode });
  }
  if (!result.value) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ entry: result.value });
}
```

**Usage in MCP tools**:
```typescript
async ({ slug }) => {
  const result = wikiService.getEntry(slug);
  if (!result.ok) {
    return { content: [{ type: "text", text: result.error.message }], isError: true };
  }
  if (!result.value) {
    return { content: [{ type: "text", text: `Entry '${slug}' not found` }], isError: true };
  }
  return { content: [{ type: "text", text: JSON.stringify(result.value, null, 2) }] };
}
```

### 2.2 Naming Convention

**Target convention**:

| Category | Convention | Example |
|----------|------------|---------|
| Variables, functions | camelCase | `getEntry`, `listEntries` |
| Components | PascalCase | `WikiCard`, `GraphView` |
| Types, interfaces | PascalCase | `WikiEntry`, `GraphData` |
| Constants | UPPER_SNAKE | `WIKI_DIR`, `SLUG_RE` |
| File names | kebab-case | `wiki-service.ts`, `graph-view.tsx` |
| OAuth params | snake_case | `redirect_uri`, `client_id` |
| CSS custom properties | kebab-case | `--color-wiki-bg` |
| Environment variables | UPPER_SNAKE | `WIKI_API_KEY` |

**Migration rule**: New code follows convention. Legacy files updated when touched (boy scout rule).

### 2.3 Data Access: Repository Pattern

**Target state**: All storage access goes through `WikiRepository` interface.

```typescript
// packages/wiki/src/domain/repositories/WikiRepository.ts
export interface WikiRepository {
  findAll(): WikiMeta[];
  findBySlug(slug: string): WikiEntry | null;
  save(entry: WikiEntry): void;
  delete(slug: string): void;
  exists(slug: string): boolean;
}

// Implementation
export class FileSystemWikiRepository implements WikiRepository {
  constructor(private wikiDir: string) {}
  // ...implementation
}
```

**Benefits**:
- Swappable storage backend (could add S3, database later)
- Testable with in-memory mock
- Clear boundary between domain and infrastructure

### 2.4 API Client: Centralized HTTP Layer

**Target state**: Web app uses a typed API client instead of inline `fetch()`.

```typescript
// apps/web/hooks/useWikiApi.ts
export class WikiApiClient {
  constructor(private apiKey?: string) {}
  
  async createEntry(data: CreateEntryInput): Promise<Result<WikiEntry>> {
    // Centralized fetch logic, error handling, auth header
  }
  
  async updateEntry(slug: string, data: UpdateEntryInput): Promise<Result<WikiEntry>> {
    // ...
  }
  
  // ...other methods
}
```

---

## 3. Layer Contracts

### 3.1 Dependencies Rule
```
Presentation (web/mcp) → Application (services) → Domain (entities) → Infrastructure (repo)
                              ↓
                         Shared (errors, schemas, utils)
```

**Forbidden**:
- Presentation importing infrastructure directly
- Domain importing presentation
- Web components calling `fs` directly

### 3.2 Data Flow

```
User Request
    ↓
[Presentation] Route/Component
    ↓ (calls)
[Application] Service/Use Case
    ↓ (calls)
[Domain] Entity/Value Object
    ↓ (calls)
[Infrastructure] Repository/Cache
    ↓
Storage (File System)
```

### 3.3 Cross-Cutting Concerns

| Concern | Where it lives | Rule |
|---------|---------------|------|
| Validation | Shared schemas (Zod) | Used by all layers |
| Auth | Presentation middleware | Web: `requireWriteAuth`, MCP: `authMiddleware` |
| Logging | Infrastructure | Structured logs, never `console.log` |
| Caching | Infrastructure | Repository-level, transparent to domain |
| Error handling | Shared | `Result<T>` type everywhere |

---

## 4. AGENTS.md Update Proposal

The current `AGENTS.md` is **95% accurate** but should be updated to reflect:

### Additions needed:
1. **Security note**: Document that API key is stored in `localStorage` (XSS risk) and the recommended migration path
2. **Dependency note**: Mention that `fuse.js` is declared but unused
3. **Testing note**: Document the lack of web/MCP tests and the plan to add them
4. **Architecture decision record (ADR)**: Document why file-based storage was chosen and when to migrate
5. **Scaling note**: Document in-memory session stores as a known limitation

### Corrections needed:
1. Next.js version: `16.2.4` (not just "16")
2. Express version: `5.2.1` (not just "5")

### Recommended: Create `AGENTS.md.v2`

Create a new version that includes:
- Current architecture (as-is)
- Target architecture (to-be)
- Migration checklist
- Decision log

---

## 5. Technology Decisions

| Decision | Current | Target | Rationale |
|----------|---------|--------|-----------|
| Error handling | Mixed | `Result<T>` everywhere | Consistency, type safety |
| Data access | Direct fs calls | Repository pattern | Testability, backend swap |
| API client | Inline fetch | Centralized client | DRY, error handling |
| Component size | Large files | <200 lines each | Maintainability |
| State management | useState/localStorage | Server state + URL state | Simplicity, shareability |
| CSS | Tailwind + globals | Tailwind + CSS variables | Consistent theming |
| Tests | Package only | All layers | Regression safety |
| Logging | console.* | Structured (pino) | Observability |
| Rate limiting | None | Express-rate-limit | Security |

---

## 6. Success Metrics

The recovery is complete when:

- [ ] All duplicate code eliminated (wrappers, slugify, tag counting)
- [ ] `Result<T>` used in all new code; legacy code updated when touched
- [ ] Repository pattern implemented for all storage access
- [ ] Web app has >80% integration test coverage for API routes
- [ ] MCP server has >80% test coverage for tools
- [ ] No `console.log` in production code
- [ ] API key no longer stored in `localStorage`
- [ ] Rate limiting enabled on all public endpoints
- [ ] `AGENTS.md` updated and accurate
- [ ] Bundle size reduced (remove unused deps)
- [ ] All components <200 lines (except layout wrappers)

---

## 7. Non-Goals (What We're NOT Doing)

To keep this realistic for a ~3,800-line project:

- **No database migration** — File-based storage is fine for current scale
- **No microservices** — Monorepo with 2 apps is appropriate
- **No GraphQL** — REST + MCP is sufficient
- **No state management library** — React state + server components is enough
- **No CDN/edge deployment** — Docker compose is sufficient for now
- **No full rewrite** — Incremental refactoring only
