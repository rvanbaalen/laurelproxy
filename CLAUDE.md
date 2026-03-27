# RoxyProxy

HTTP/HTTPS intercepting proxy with CLI, web UI, REST API, and Claude Code plugin. Captures traffic in SQLite and makes it queryable.

## Project Structure

- `main` branch: proxy source code, CLI, server, web UI, tests
- `website` branch: Astro landing page + docs site, deployed to GitHub Pages at robinvanbaalen.nl/roxyproxy/

## Development

```bash
npm install          # install dependencies
npm test             # run tests (vitest)
npm run build        # build server + UI
npm run dev:ui       # dev server for web UI
```

## Testing

Test framework: vitest. Run with `npm test`. Tests are colocated with source (`src/**/*.test.ts`) and in `tests/integration/`.
