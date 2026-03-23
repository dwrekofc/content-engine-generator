The role of this file is to describe common mistakes and confusion points that agents might encounter as they work in this project. 

If you ever encounter something in the project that surprises you, please alert the developer working with you and indicate that this is the case to help prevent future agents from having the same issue.

This project is super green field and no one is using it yet. we are focused on getting it in the right shape.

## Build & Run

- Runtime: Bun
- UI: shadcn/ui with Base UI primitives + Tailwind CSS
- Language: TypeScript (strict)
- Dev (app): `bun run dev` (Vite dev server on port 5173)
- Dev (library): `bun run dev:lib`
- Build (app): `bun run build` (outputs to dist-app/)
- Build (library): `bun run build:lib` (outputs to dist/)

## Validation

- Tests: `bun test`
- Typecheck: `bun run tsc --noEmit`
- Lint: `bunx biome check .`
- Format: `bunx biome format . --write`

## Operational Notes

### Gotchas
- TypeScript 6.0 is installed — `baseUrl` in tsconfig.json is deprecated. Use `"paths": { "@/*": ["./src/*"] }` without baseUrl.
- Biome 2.4.8 — if you see schema version mismatch, run `bunx biome migrate --write`
- Zod 4.3.6 — API is mostly compatible with v3. `z.lazy()` works for recursive types. `z.discriminatedUnion()` works.
- Auto-fix lint+format: `bunx biome check . --write --unsafe`
- Tailwind CSS 4 uses `@import "tailwindcss"` instead of directives. Plugin-based via @tailwindcss/vite.
- Vite 8 — use `bunx vite` not `bun run vite`
- API server for generation: `bun run dev:api` starts on port 3001. Vite proxies `/api/*` to it. Both must run simultaneously for Generate mode to work.

### Codebase Patterns
