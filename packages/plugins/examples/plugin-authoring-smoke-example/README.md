# Plugin Authoring Smoke Example

A ATV-Teams plugin

## Development

```bash
pnpm install
pnpm dev            # watch builds
pnpm dev:ui         # local dev server with hot-reload events
pnpm test
```

## Install Into ATV-Teams

```bash
pnpm paperclipai plugin install ./
```

## Build Options

- `pnpm build` uses esbuild presets from `@paperclipai/plugin-sdk/bundlers`.
- `pnpm build:rollup` uses rollup presets from the same SDK.
