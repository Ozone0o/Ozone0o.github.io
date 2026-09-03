# Ozone Layer 2.0

This repository is the Astro migration workspace for the Ozone Layer personal site.

## Technology

- Astro
- Markdown Content Collections
- Static GitHub Pages output

## Development

```sh
npm install
npm run dev
```

The migration scripts read the immutable legacy snapshot from the sibling worktree
`../Ozone0o.github.io-legacy` by default. You can override it with `LEGACY_ROOT`.

## Migration verification

```sh
npm run verify:migration
```

The command checks source post text, metadata, links, images, Daily item counts,
Daily order, date resolution, and referenced media. Run the migration generator
first when rebuilding the content:

```sh
npm run migrate
```

## Build and preview

```sh
npm run build
npm run preview
```

`legacy-hexo` is the old deployed Hexo snapshot. `redesign` is the Astro redesign
branch. The old snapshot is intentionally kept separate from the new source tree.
