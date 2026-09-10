# Contributing

Synapsis uses vanilla TypeScript, Vite, WebGL2, and Capacitor. Keep dependencies narrow and preserve the flat stack architecture.

Before submitting a change:

```sh
npm ci
npm test
npm run build
```

New effects must include a unique `EffectKind`, catalog metadata, one image input/output shader, four bounded parameters, a conceptual library category, and tests confirming catalog validity. Stateful effects must keep history isolated by node ID and release GPU resources when removed.

Do not add nested nodes or opaque compound runtime types. Add inspirational compound looks as `GalleryRecipe` templates that expand into ordinary nodes.

Do not commit local media, recordings, build products, provisioning profiles, credentials, or signing keys. Shader ports must have a compatible license and attribution; original implementations are preferred.
