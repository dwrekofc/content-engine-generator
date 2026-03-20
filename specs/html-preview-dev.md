# HTML Preview — Dev Server & Hot Reload

## Source
JTBD 4: Content Preview with Live Reload

## Purpose
The development server that wraps the HTML renderer with hot reload capability. Watches template, theme, and content JSON files for changes and triggers instant browser updates. Also provides overflow detection to help content authors identify fit issues.

## Requirements
- Serve the HTML renderer output in a browser via a local dev server
- Watch template, theme, and content JSON files for changes on disk
- Hot reload: file changes trigger an immediate preview update without manual browser refresh
- Show content overflow indicators when text or media exceeds a container's bounds (e.g., visual highlight, border change, or badge)
- Provide a URL that can be opened in any browser

## Constraints
- Phase 1 is browser-based with hot reload (dev-server style), not embedded in the app UI
- Uses Bun's built-in server or a lightweight dev server (Vite, etc.)
- Overflow detection is a visual hint in the preview, not a blocking error

## Acceptance Criteria
1. `bun run dev` (or equivalent) starts a local server serving the preview
2. Changing content JSON triggers a visible update without manual refresh
3. Changing theme JSON triggers a visible re-styling without manual refresh
4. Changing template JSON triggers a structural re-render without manual refresh
5. Overflow is visually indicated when content exceeds container bounds
