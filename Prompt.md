# Prompt.md — AI-Assisted Development Log

This file documents every prompt, decision point, and iterative refinement that
shaped this project. It serves as a reproducible blueprint: anyone reading it can
understand *why* the code is the way it is, and can regenerate or extend the
project by replaying the same conversation arc.

---

## Phase 1 — Initial brief

**Source:** PDF task sheet (`Backend Task - NodeJs-1.pdf`)

```
We are looking for a skilled backend developer to complete the following task
using ExpressJs and any relational database engine (Postgres, MySQL, or SQLite)
and prefer to use Knex ORM.

Use the same database:
• Develop an API endpoint to list products with fields: product_code,
  product_title, and product_price. Implement Redis caching for the product
  list API results to cache the response on the first request and serve
  subsequent requests from the cache with a 2-minute expiry time.
• Develop an endpoint to submit tickets with required fields: ticket_number
  (integer, unique), subject (string), and description (text). The API should
  enforce all fields as mandatory and validate uniqueness of ticket_number to
  reject duplicates.
• Dockerize the entire NestJS application for portability and ease of deployment.
• (Bonus) Include feature testing using Jest or a similar testing framework to
  ensure functionality and code quality for both 2 endpoints.
```

**Contradiction flagged:** The brief opens with *ExpressJs + Knex* but the
bullets reference *NestJS*. This was treated as a template artefact; the explicit
lead instruction took precedence.

---

## Phase 2 — Clarifying questions & decisions

Three decisions were resolved before any code was written.

### 2.1 Framework

**Prompt:**
```
The PDF says "ExpressJs + Knex" at the top but mentions "NestJS" in the
bullets/footer. Which framework should I build with?
```

**Options presented:**
| Option | Rationale |
|--------|-----------|
| Express + Knex | Matches the explicit primary instruction and the stated Knex preference. Lighter, faster to review. |
| NestJS + Knex | Matches the footer/bullet mentions. More structure (modules/DI), heavier scaffolding. |

**Decision:** `Express + Knex`

---

### 2.2 Database

**Prompt:**
```
Which relational database engine should I use?
```

**Options presented:**
| Option | Rationale |
|--------|-----------|
| PostgreSQL | Production-realistic, runs cleanly in docker-compose alongside Redis. |
| MySQL | Also fully supported by Knex. |
| SQLite | Simplest; no extra container, but least representative of production. |

**Decision:** `PostgreSQL 16`

---

### 2.3 Concurrency / locking on POST /api/tickets

**Prompt:**
```
On POST endpoint you should handle locking — ask me about your recommendation
on how to perform it.
```

**Options presented with code previews:**

**Option A — Redis lock + DB constraint (recommended)**
```typescript
const token = randomUUID();
const key = `lock:ticket:${ticket_number}`;
const ok = await redis.set(key, token, 'PX', 5000, 'NX');
if (!ok) throw Conflict('ticket is being processed');
try {
  await ticketsRepo.insert(dto); // 23505 -> 409
} finally {
  // release only if we still own it (Lua CAS)
  await releaseLock(key, token);
}
```

**Option B — PostgreSQL advisory lock + constraint**
```typescript
await knex.transaction(async (trx) => {
  await trx.raw(
    'SELECT pg_advisory_xact_lock(hashtext(?))',
    [String(ticket_number)]
  );
  await trx('tickets').insert(dto); // 23505 -> 409
});
```

**Option C — DB unique constraint only**
```typescript
try {
  await ticketsRepo.insert(dto);
} catch (e) {
  if (e.code === '23505') throw Conflict('ticket_number exists');
  throw e;
}
```

**Decision:** `Option A — Redis distributed lock + DB unique constraint`

*Rationale:* Redis is already in the stack for caching. The SET NX PX pattern
demonstrates explicit distributed locking across horizontally-scaled app
instances. The DB UNIQUE constraint is the authoritative backstop if the lock
ever expires mid-flight. A Lua compare-and-delete (`KEYS[1] == ARGV[1]`) prevents
accidentally releasing another holder's lock.

---

### 2.4 Additional requirements (user additions)

**Prompt:**
```
Use express with TS on monolithic modular architecture.
```

This added two constraints to the plan:
- **TypeScript** (strict, compiled with `tsc`; multi-stage Dockerfile).
- **Modular monolith**: each feature module (`products`, `tickets`) owns its
  full vertical slice (routes → controller → service → repository). Modules share
  only `core` and `infra`; no module imports another module's internals.

---

## Phase 3 — Implementation plan

The agreed architecture before any file was created:

```
src/
├── config/index.ts          # typed env config
├── infra/
│   ├── db/                  # Knex instance, knexfile.js, migrations, seeds
│   └── cache/               # redis.ts, lock.ts (acquireLock / releaseLock)
├── core/                    # AppError, validate middleware, error-handler, asyncHandler
├── modules/
│   ├── products/            # routes → controller → service (cache-aside) → repository
│   └── tickets/             # routes → controller → service (Redis lock) → repository
├── app.ts                   # Express factory — no listen() (importable in tests)
├── routes.ts                # mounts /health, /api/products, /api/tickets
└── server.ts                # bootstrap: connect infra, listen, graceful shutdown
```

Key decisions baked in before coding:
- Migrations / seeds kept as plain `.js` so `knex migrate:latest` runs at
  container start without a TS compilation step.
- `app.ts` exports the app without calling `listen()` so supertest can import it
  directly in tests.
- `X-Cache-Status: HIT|MISS` response header added to make caching observable
  via `curl -i` without needing a Redis client.

---

## Phase 4 — Build order

Files were created in this sequence to ensure each layer was complete before
the next one imported it:

1. `package.json`, `tsconfig.json`, `jest.config.js`, `.env.example`, `.dockerignore`
2. `config/index.ts`
3. `infra/db/` — `knex.ts`, `knexfile.js`, migrations, seeds
4. `infra/cache/` — `redis.ts`, `lock.ts`
5. `core/` — `http-error.ts`, `async-handler.ts`, `validate.ts`, `error-handler.ts`
6. `app.ts`, `routes.ts`, `server.ts`
7. Products module (all five files)
8. Tickets module (all five files)
9. `Dockerfile` (multi-stage), `docker-entrypoint.sh`, `docker-compose.yml`
10. `tests/jest.setup.ts`, `tests/products.test.ts`, `tests/tickets.test.ts`
11. `scripts/smoke-test.sh`
12. `README.md`

---

## Phase 5 — Verification prompts

### 5.1 TypeScript compile

```bash
npm run build   # expected: tsc exits 0, no output
```

### 5.2 Docker build

```bash
docker compose build
# Expected: multi-stage build completes; runtime image ~130 MB
```

### 5.3 Stack start + smoke test

```bash
docker compose up -d
./scripts/smoke-test.sh
# Expected: 8/8 checks pass, exit 0
```

### 5.4 Jest feature tests

```bash
DB_HOST=localhost DB_PORT=5435 REDIS_HOST=localhost REDIS_PORT=6380 npm test
# Expected: 11/11 pass (later 13/13 after code-review fixes)
```

---

## Phase 6 — Code review findings & fixes

A senior code review surfaced three findings that were fixed immediately.

### Finding 1 — High: `finally` overrides try result

**Finding:**
```
finally always awaits releaseLock without isolating failures. If Redis rejects
the unlock after a successful insert (or after a mapped 409), the thrown error
overrides the try result, so the route returns 500 even though the ticket was
persisted.
Location: src/modules/tickets/tickets.service.ts:46-49
```

**Fix applied (`tickets.service.ts`):**
```typescript
// Before
} finally {
  await releaseLock(lockKey, lockToken);
}

// After
} finally {
  // Swallow Redis errors — a failed unlock must not override the DB result.
  // The lock TTL guarantees self-healing.
  await releaseLock(lockKey, lockToken).catch((err: Error) => {
    console.error('[lock] failed to release lock for ticket', dto.ticket_number, ':', err.message);
  });
}
```

---

### Finding 2 — Medium: `z.coerce` accepts `""` → `0`

**Finding:**
```
z.coerce.number() turns ""/null into 0, and .int() accepts it, so requests
omitting a real ticket_number can create ticket 0, bypassing required-field
validation.
Location: src/modules/tickets/tickets.schema.ts:8-10
```

**Fix applied (`tickets.schema.ts`):**
```typescript
// Before — coerce silently converts "" → 0 and null → 0
ticket_number: z.coerce
  .number({ required_error: 'ticket_number is required' })
  .int('ticket_number must be an integer'),

// After — express.json() already parses the body; a JSON number is a JS number.
// "" and null correctly fail the type check.
ticket_number: z
  .number({
    required_error: 'ticket_number is required',
    invalid_type_error: 'ticket_number must be a number',
  })
  .int('ticket_number must be an integer'),
```

Two regression tests were added to `tickets.test.ts`:
```typescript
it('returns 400 when ticket_number is an empty string', ...)
it('returns 400 when ticket_number is null', ...)
```

---

### Finding 3 — Medium: shared singleton teardown across test suites

**Finding:**
```
afterAll calls knex.destroy() on the shared app Knex instance while other
suites still need it; since Jest runs files in path order, the pool can be
torn down before tickets.test.ts runs.
Location: tests/products.test.ts:19-21
```

**Root cause:** Both test files imported the same `knex` and `redis` singletons
and each called `.destroy()` / `.quit()` in `afterAll`. With `--runInBand` Jest
runs files alphabetically (`products` → `tickets`), so products tore down the
pool before tickets could use it.

**Fix applied (both test files):**
- Removed `beforeAll(() => redis.connect())` — ioredis uses `lazyConnect: true`
  and auto-connects on the first command; explicit connection is unnecessary in tests.
- Removed `afterAll(() => redis.quit(); knex.destroy())` — shared singletons must
  not be torn down per-suite; `--forceExit` owns process-level cleanup.

```typescript
// Removed from both test files:
beforeAll(async () => { await redis.connect(); });
afterAll(async () => { await redis.quit(); await knex.destroy(); });

// Per-test isolation is handled by beforeEach (not afterAll):
beforeEach(async () => { await redis.del(CACHE_KEY); });         // products
beforeEach(async () => { await knex('tickets').truncate(); });   // tickets
```

---

## Phase 7 — Documentation

### 7.1 Mermaid diagrams in README

**Prompt:**
```
Provide in README.md mermaid to illustrate architectures like code and ERD
and components architectures.
```

Six diagrams were added:

| Diagram | Mermaid type | What it shows |
|---------|-------------|---------------|
| Component architecture | `flowchart LR` | Three Docker services, host/container ports, client connections |
| Code architecture | `graph TD` | Full modular-monolith layer graph — every file and dependency arrow |
| GET /api/products flow | `sequenceDiagram` | Cache HIT vs MISS decision path |
| POST /api/tickets flow | `sequenceDiagram` | Validation gate → lock → insert → release, all branches |
| ERD | `erDiagram` | Both tables: fields, types, PK/UK constraints |
| Docker image build | `flowchart LR` | Multi-stage build + entrypoint boot sequence |

**Correction applied:** The component diagram was originally written as
`C4Context` (requires a Mermaid plugin not available in most renderers). It was
replaced with a standard `flowchart LR` that renders everywhere.

**Prompt that triggered the fix:**
```
mermaid shows error on C4Context
```

---

## Reusable prompt templates

The prompts below can be copy-pasted to bootstrap a similar project with an AI
assistant.

### Bootstrap a modular Express + TypeScript backend

```
Build a production-ready Express + TypeScript backend in a modular monolith
architecture. Stack: Express 4, TypeScript (strict), Knex + PostgreSQL, Redis
(ioredis), zod for validation, Jest + supertest for feature tests.

Structure each feature as a self-contained module:
  routes → controller → service → repository
Shared cross-cutting code lives in `core/` (errors, middleware) and `infra/`
(DB, cache). No module imports another module's internals.

Expose the Express app from app.ts without calling listen() so supertest can
import it directly.
```

### Redis cache-aside pattern

```
Implement a cache-aside pattern in the service layer using ioredis.
Key: "products:list", TTL: 120 seconds.
Set an X-Cache-Status: HIT|MISS response header so caching is observable
via curl without a Redis client.
```

### Redis distributed lock with Lua CAS release

```
Before inserting a ticket, acquire a Redis distributed lock:
  SET lock:ticket:<ticket_number> <uuid-token> PX 5000 NX
If not acquired → 409 "being processed".
In a try/finally, insert and catch PG error 23505 → 409 "already exists".
Release with a Lua compare-and-delete so we never drop another holder's lock:
  if GET key == token then DEL key end
Wrap releaseLock in .catch() inside finally so a Redis failure cannot
override the result already committed to the DB.
```

### Docker multi-stage build for TypeScript

```
Write a multi-stage Dockerfile:
  Stage 1 (builder): npm ci + tsc → dist/
  Stage 2 (runtime): npm ci --omit=dev, copy dist/, copy plain-JS knexfile
    and migrations so knex migrate:latest runs without a TS build step.
Run the app as a non-root user.
Write a docker-entrypoint.sh that runs migrate:latest, seed:run, then
exec node dist/server.js.
```

### Smoke test script

```
Write a bash smoke test (set -euo pipefail) that:
1. GET /health → 200
2. GET /api/products twice → 200; check X-Cache-Status MISS then HIT
3. POST /api/tickets valid body → 201
4. POST /api/tickets same ticket_number → 409
5. POST /api/tickets missing field → 400
Print ✓/✗ per check, exit 1 if any fail.
```

### Jest test isolation for shared singletons

```
The app uses shared Knex and ioredis singletons.
Do NOT call knex.destroy() or redis.quit() in afterAll — tearing down shared
singletons per-suite breaks suites that run later (Jest runs files
alphabetically with --runInBand).
Use beforeEach for per-test isolation (truncate tables, del cache keys).
Let --forceExit own process-level cleanup.
ioredis lazyConnect:true auto-connects on first command — no explicit
beforeAll connect needed in tests.
```
