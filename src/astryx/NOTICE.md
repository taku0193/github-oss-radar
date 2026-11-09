# Astryx integration

Source: https://github.com/meta/astryx — retrieved 2026-11-10.

`expandMotionScale.ts` is an unmodified copy of
`packages/core/src/theme/expandMotionScale.ts`.

`motion.ts` uses the expressive entrance/move curve from
`packages/core/src/theme/themeMotion.ts`, and the light-mode radius and shadow
values from `packages/themes/neutral/src/neutralTheme.ts` (colors expressed as
equivalent hexadecimal alpha values). The app chooses its own duration scale.

Copyright (c) 2026 Meta Platforms, Inc. and affiliates. MIT license:
[`public/licenses/astryx.txt`](../../public/licenses/astryx.txt).

The Vue application uses these framework-independent foundations. React
components, React, StyleX and the Astryx CLI are not installed.

Upstream Git blob IDs at retrieval:

| File | Blob ID |
| --- | --- |
| `expandMotionScale.ts` | `60feb0602e082912883fb431ee800a0c7fc55e21` |
| `themeMotion.ts` | `86fd0878bd494a209958e999d99244c46d985eb6` |
| `neutralTheme.ts` | `bbb4d2ffe236a09ca5e0a215839da6860df956ad` |
