The role of this file is to describe common mistakes and confusion points that agents might encounter as they work in this project. 

If you ever encounter something in the project that surprises you, please alert the developer working with you and indicate that this is the case to help prevent future agents from having the same issue.

This project is super green field and no one is using it yet. we are focused on getting it in the right shape.

## Build & Run

- Runtime: Bun
- UI: shadcn/ui with Base UI primitives + Tailwind CSS
- Language: TypeScript (strict)
- Build: `bun run build`
- Dev: `bun run dev`

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

### Codebase Patterns
