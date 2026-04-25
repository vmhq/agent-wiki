# Migration Roadmap — Agent Wiki Recovery

> **Principle**: No rewrites. Incremental improvement. Leave every file better than you found it.
> **Date**: 2025-04-25
> **Estimated duration**: 4-6 weeks (part-time)

---

## Fase 1: Stop the Bleeding (Semana 1)

**Goal**: Fix security vulnerabilities and add regression tests to critical flows.

### 1.1 Eliminar código muerto
- [ ] **Remove unused `fuse.js` dependency**
  - Files: `apps/web/package.json`
  - Action: `bun remove fuse.js`
  - Risk: 🟢 Bajo — Unused dependency
  - Rollback: `git revert`

- [ ] **Consolidar wrappers duplicados web/mcp**
  - Files: `apps/web/lib/wiki.ts`, `apps/mcp/src/wiki.ts`
  - Action: Create `packages/wiki/src/store.ts` with a `createWikiStoreInstance(wikiDir)` factory; update both wrappers to import from shared package
  - Risk: 🟡 Medio — Affects both apps
  - Rollback: `git revert`

### 1.2 Unificar manejo de errores en flujos críticos
- [ ] **Create `Result<T>` type in shared package**
  - Files: `packages/wiki/src/shared/result.ts` (new)
  - Action: Implement `ok()` / `err()` helpers; update `WikiError` to include `statusCode`
  - Risk: 🟡 Medio — Foundation for all future error handling
  - Rollback: Type additions are backward compatible

- [ ] **Migrate critical API routes to `Result<T>`**
  - Files: `apps/web/app/api/wiki/route.ts`, `apps/web/app/api/wiki/[slug]/route.ts`
  - Action: Update to use `Result<T>` pattern; keep existing response format
  - Risk: 🟡 Medio — Must maintain exact same JSON response structure
  - Rollback: `git revert`

- [ ] **Migrate critical MCP tools to `Result<T>`**
  - Files: `apps/mcp/src/server.ts` (wiki_get, wiki_create, wiki_update)
  - Action: Update top 3 most-used tools to use `Result<T>`
  - Risk: 🟡 Medio — Must maintain same MCP response format
  - Rollback: `git revert`

### 1.3 Agregar tests de regresión
- [ ] **Add integration tests for wiki CRUD API**
  - Files: `apps/web/app/api/wiki/route.test.ts` (new), `apps/web/app/api/wiki/[slug]/route.test.ts` (new)
  - Action: Test GET, POST, PUT, PATCH, DELETE with temp directory; verify auth behavior
  - Test count: 8-10 tests
  - Risk: 🟢 Bajo — New files only
  - Rollback: Delete test files

- [ ] **Add integration tests for MCP tools**
  - Files: `apps/mcp/src/server.test.ts` (new)
  - Action: Test wiki_list, wiki_get, wiki_create, wiki_search with mock store
  - Test count: 6-8 tests
  - Risk: 🟢 Bajo — New files only
  - Rollback: Delete test files

- [ ] **Add integration tests for search API**
  - Files: `apps/web/app/api/search/route.test.ts` (new)
  - Action: Test empty query, normal query, special characters
  - Test count: 3-4 tests
  - Risk: 🟢 Bajo — New files only

### Tests que deben existir ANTES de tocar código:
```bash
# Run these commands before any refactoring:
bun run test                    # packages/wiki tests (existing)
bun run --filter web test       # web tests (to be added)
bun run --filter mcp test       # mcp tests (to be added)
```

### Riesgo de ruptura: 🟠 Medio-Alto
**Mitigation**: 
- All changes behind feature flags where possible
- Run full test suite after each change
- Deploy to staging first
- Monitor `/health` and `/api/health` endpoints

### Rollback strategy:
```bash
# If production issues detected:
git log --oneline -5              # Find last stable commit
git revert HEAD~n..HEAD           # Revert affected commits
docker compose down && docker compose up -d --build
```

---

## Fase 2: Extraer Utilidades Comunes (Semanas 2-3)

**Goal**: Deduplicate code and create shared abstractions.

### 2.1 Consolidar funciones duplicadas en `src/shared/`
- [ ] **Extract `slugify` to shared package**
  - Files: `packages/wiki/src/shared/utils.ts` (update), `apps/web/components/editor/WikiEditor.tsx`
  - Action: Export `slugify` from `@agent-wiki/wiki`; remove duplicate from WikiEditor
  - Risk: 🟡 Medio — Must verify WikiEditor still auto-generates slugs correctly
  - Rollback: `git revert`

- [ ] **Extract tag counting utility**
  - Files: `packages/wiki/src/shared/utils.ts` (new function), `apps/web/app/page.tsx`, `apps/web/components/shell/AppSidebar.tsx`
  - Action: Create `computeTagFrequency(entries)` function; update both consumers
  - Risk: 🟢 Bajo — Pure function, easy to test
  - Rollback: `git revert`

- [ ] **Extract date formatting utility**
  - Files: `packages/wiki/src/shared/utils.ts`, all components using `formatDistanceToNow`
  - Action: Create `formatRelativeDate(date)` wrapper
  - Risk: 🟢 Bajo — Refactoring only
  - Rollback: `git revert`

### 2.2 Crear abstracciones para integraciones externas
- [ ] **Create typed API client for web app**
  - Files: `apps/web/hooks/useWikiApi.ts` (new)
  - Action: Centralize all `fetch()` calls; handle errors consistently; manage API key securely (move from localStorage to httpOnly cookie or session)
  - Risk: 🟠 Alto — Changes how API key is stored (security improvement)
  - Rollback: Revert to inline fetch in components

- [ ] **Create repository abstraction**
  - Files: `packages/wiki/src/domain/repositories/WikiRepository.ts` (new), `packages/wiki/src/infrastructure/FileSystemWikiRepository.ts` (new)
  - Action: Extract file system logic from `index.ts` into repository class; keep existing API surface
  - Risk: 🟡 Medio — Internal refactoring, no external API changes
  - Rollback: `git revert`

### 2.3 Mejorar seguridad básica
- [ ] **Add rate limiting to MCP server**
  - Files: `apps/mcp/src/middleware/rateLimit.ts` (new), `apps/mcp/src/index.ts`
  - Action: Add `express-rate-limit` for OAuth endpoints and MCP routes
  - Risk: 🟡 Medio — Could block legitimate traffic if limits too strict
  - Rollback: Remove middleware

- [ ] **Add rate limiting to web API**
  - Files: `apps/web/middleware.ts` (new)
  - Action: Add Next.js middleware rate limiting for write operations
  - Risk: 🟡 Medio — Same as above
  - Rollback: Remove middleware

### Tests requeridos antes de tocar código:
- [ ] Unit tests for `slugify`, `computeTagFrequency`, `formatRelativeDate`
- [ ] Integration tests for API client
- [ ] Load tests for rate limits (verify legitimate use isn't blocked)

### Riesgo de ruptura: 🟡 Medio
**Mitigation**: 
- Test all utility functions with edge cases
- Verify API client handles all existing error cases
- Set generous rate limits initially, tune down based on metrics

---

## Fase 3: Modularizar por Dominio (Semanas 4-6)

**Goal**: Separate business logic from presentation; split large components.

### 3.1 Mover lógica de negocio a `src/domain/`
- [ ] **Split `packages/wiki/src/index.ts` into services**
  - Files to create:
    - `packages/wiki/src/application/WikiService.ts` — CRUD operations
    - `packages/wiki/src/application/SearchService.ts` — Search logic
    - `packages/wiki/src/application/GraphService.ts` — Graph building
    - `packages/wiki/src/application/MaintenanceService.ts` — Maintenance reports
  - Files to modify: `packages/wiki/src/index.ts` — becomes thin barrel export
  - Risk: 🟠 Alto — Core library refactoring; affects both apps
  - Rollback: `git revert` (keep commits atomic)

- [ ] **Move cache to infrastructure**
  - Files: `packages/wiki/src/infrastructure/InMemoryCache.ts` (new)
  - Action: Extract cache logic from `index.ts` into dedicated class
  - Risk: 🟡 Medio — Must preserve cache invalidation behavior
  - Rollback: `git revert`

### 3.2 Separar presentation de application (Web app)
- [ ] **Decompose `GraphView.tsx`**
  - Files to create:
    - `apps/web/components/graph/GraphCanvas.tsx` — Canvas rendering + force graph
    - `apps/web/components/graph/GraphControls.tsx` — Zoom/search/filter UI
    - `apps/web/components/graph/NodePanel.tsx` — Selected node details
    - `apps/web/components/graph/useGraphData.ts` — Data transformation hook
  - Files to modify: `apps/web/components/GraphView.tsx` — becomes orchestrator
  - Risk: 🟡 Medio — Complex component, must preserve all interactions
  - Rollback: `git revert`

- [ ] **Extract API logic from `WikiEditor.tsx`**
  - Files: `apps/web/hooks/useWikiApi.ts` (update from Fase 2)
  - Action: Move `request()`, `save()`, `remove()` into API client; WikiEditor only handles UI state
  - Risk: 🟡 Medio — Must preserve localStorage API key behavior during transition
  - Rollback: `git revert`

### 3.3 Separar presentation de application (MCP server)
- [ ] **Extract OAuth router from `auth.ts`**
  - Files to create:
    - `apps/mcp/src/routes/oauth.ts` — OAuth endpoints
    - `apps/mcp/src/services/oauthService.ts` — OAuth business logic
    - `apps/mcp/src/middleware/auth.ts` — Auth middleware only
  - Files to modify: `apps/mcp/src/auth.ts` — deprecated, then removed
  - Risk: 🟡 Medio — OAuth is critical; must preserve all flows
  - Rollback: `git revert`

- [ ] **Add structured logging**
  - Files: `apps/mcp/src/middleware/requestLogger.ts` (new), `apps/web/lib/logger.ts` (new)
  - Action: Replace `console.log` with `pino` or similar; add request ID tracking
  - Risk: 🟢 Bajo — Additive change
  - Rollback: Remove logger imports

### Tests requeridos antes de tocar código:
- [ ] Full integration test suite for wiki CRUD (from Fase 1)
- [ ] Component tests for GraphView decomposition
- [ ] OAuth flow tests (authorization code exchange)
- [ ] Load tests for graph generation with 100+ entries

### Riesgo de ruptura: 🟠 Alto
**Mitigation**:
- Feature flags for new component structure
- A/B test GraphView if possible
- Monitor error rates after each deployment
- Keep old implementation commented out for 1 week

---

## Fase 4: Refactorización Dirigida (Continuo)

**Goal**: Every file touched gets improved. No "drive-by" changes without cleanup.

### Reglas:
1. **Boy Scout Rule**: Leave the file cleaner than you found it
2. **Test-first**: Add a test before fixing a bug or refactoring
3. **Document decisions**: Update `AGENTS.md` after significant changes
4. **Measure impact**: Run `bun run build` and `bun run test` after every change

### Checklist para cada archivo tocado:
- [ ] < 200 lines (if component) or < 300 lines (if service)
- [ ] No `console.log` — use logger instead
- [ ] Error handling uses `Result<T>` pattern
- [ ] Has at least one test (unit or integration)
- [ ] No duplicated logic (check with `grep`)
- [ ] Follows naming convention (camelCase for functions, PascalCase for components)
- [ ] Imports are sorted and grouped (React, external, internal, relative)
- [ ] Types are explicit (no `any` unless justified with comment)

### Tareas contínuas:
- [ ] Replace remaining `console.*` with structured logger
- [ ] Update all error handling to `Result<T>` (when touching a file)
- [ ] Split remaining large components (>200 lines)
- [ ] Add missing JSDoc comments to public functions
- [ ] Remove `@ts-ignore` or `@ts-expect-error` comments (when touching a file)
- [ ] Optimize cache invalidation (consider file watchers instead of manual)
- [ ] Add health check for wiki directory permissions
- [ ] Document all environment variables in `.env.example`

### Actualización de AGENTS.md:
After each phase completes:
1. Update architecture diagram if structure changed
2. Document new patterns adopted
3. Mark completed items in migration checklist
4. Add ADR (Architecture Decision Record) for major changes

---

## Plan de Rollback por Fase

| Fase | Estrategia de rollback | Tiempo estimado |
|------|----------------------|-----------------|
| **Fase 1** | `git revert` últimos commits | 5 minutos |
| **Fase 2** | `git revert` + eliminar archivos nuevos | 10 minutos |
| **Fase 3** | `git revert` + restaurar archivos originales | 15 minutos |
| **Fase 4** | `git revert` por commit individual | 2 minutos/commit |

### Procedimiento de emergencia:
```bash
# 1. Identificar commit estable previo a la fase
git log --oneline --graph --all

# 2. Revertir todos los commits de la fase actual
git revert --no-commit HEAD~N..HEAD

# 3. Verificar estado
git status

# 4. Construir y verificar
bun run build && bun run test

# 5. Commit del rollback
git commit -m "rollback: revert phase X due to production issues"

# 6. Desplegar
git push origin main
docker compose up -d --build
```

---

## Calendario Sugerido

| Semana | Foco | Horas estimadas |
|--------|------|-----------------|
| **Semana 1** | Fase 1: Seguridad + Tests críticos | 8-12h |
| **Semana 2** | Fase 2: Utilidades + Rate limiting | 6-10h |
| **Semana 3** | Fase 2: API client + Repository | 8-12h |
| **Semana 4** | Fase 3: Split core library | 10-15h |
| **Semana 5** | Fase 3: Decompose GraphView + WikiEditor | 8-12h |
| **Semana 6** | Fase 3: MCP modularization + Logging | 6-10h |
| **Continuo** | Fase 4: Boy scout rule | 1-2h/semana |

**Total**: ~40-60 horas de trabajo concentrado + mantenimiento continuo.

---

## Métricas de Éxito por Fase

### Fase 1 (Semana 1):
- [ ] 0 `console.log` en código de producción
- [ ] >80% cobertura en rutas CRUD
- [ ] 0 dependencias sin usar
- [ ] `Result<T>` usado en 3+ archivos

### Fase 2 (Semanas 2-3):
- [ ] 0 funciones duplicadas entre paquetes
- [ ] 1 API client centralizado
- [ ] Rate limiting activo en MCP + Web
- [ ] Repository pattern implementado

### Fase 3 (Semanas 4-6):
- [ ] `packages/wiki/src/index.ts` < 100 líneas (solo exports)
- [ ] `GraphView.tsx` < 150 líneas (orquestador)
- [ ] `WikiEditor.tsx` < 150 líneas (solo UI)
- [ ] OAuth separado en 3+ archivos
- [ ] Logger estructurado en ambas apps

### Fase 4 (Continuo):
- [ ] Cada PR incluye tests
- [ ] Cada archivo tocado mejora su cobertura
- [ ] `AGENTS.md` actualizado mensualmente
- [ ] 0 deuda técnica nueva (linters lo capturan)

---

## Notas Finales

1. **No reescribir desde cero**: Cada fase preserva la funcionalidad existente. Los usuarios no deben notar cambios.

2. **Prioridad sobre perfección**: Es mejor tener rate limiting básico que no tenerlo. Es mejor tener tests parciales que no tenerlos.

3. **Documentar decisiones**: Cada decisión arquitectónica significativa debe quedar registrada en `AGENTS.md` o en un ADR.

4. **Comunicar cambios**: Si múltiples personas trabajan en el proyecto, coordinar quién toma cada fase para evitar conflictos.

5. **Celebrar victorias**: Después de cada fase, hacer deploy y verificar que todo funciona. No acumular cambios sin desplegar.
