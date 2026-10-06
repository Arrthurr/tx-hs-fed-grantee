# Dependency and advisory review

Ownership: **Arrthurr** (repository owner). Review high/critical findings as they appear; re-review recorded exceptions by their `reviewBy` date.

This process covers development and build tooling as well as production dependencies. A clean `npm audit --omit=dev` does not mean the repo is free of development-server or test-toolchain risk.

## What we do and do not treat as a gate

- **Production (`npm audit --omit=dev`)** must stay at zero high/critical findings. A production finding needs a fix or a production-scoped exception in [`advisory-exceptions.json`](advisory-exceptions.json) before merge.
- **Development high/critical** findings must be fixed with a compatible update, or recorded in [`advisory-exceptions.json`](advisory-exceptions.json) with rationale, owner, and `reviewBy`. Untriaged high/critical findings fail `npm run test:advisories`.
- **Moderate and low** findings are listed in audit output and in the notes below. They do not fail CI. Do not add `--audit-level` flags, `npm audit --force`, or empty ignore lists to hide them.

Do not run `npm audit fix --force`. That command can jump Jest or Tailwind majors without a migration.

## How to review

1. Run `npm audit --omit=dev` and `npm audit`.
2. For each unique GHSA (not each inherited package row), record the installed version, dependency path, exploit prerequisites, and whether the code path is reachable in production, `vite`/`tsx` builds, or local `npm run dev`.
3. Prefer a compatible direct update (`package.json`) or a same-major `overrides` pin. Overrides belong in `package.json` so the lockfile stays reproducible.
4. If no compatible fix exists, add an exception object and explain the exposure. Set `reviewBy` no more than 90 days out (`check-advisories` rejects a later date).
5. Run `npm run test:advisories`, then lint, typecheck, unit tests, and production build.

`npm run test:advisories` also fails when an exception is stale, unused, more than 90 days out, or disagrees with the current finding’s package/severity. Remove exceptions that no longer match the audit. A new high/critical GHSA failing an unrelated PR is the intended gate: add a compatible update or an exception, do not lower the audit level. If the npm registry is unreachable, the check fails closed.

## Cadence

- **CI:** `.github/workflows/ci.yml` runs `npm run test:advisories` after `npm ci`.
- **Dependabot:** `.github/dependabot.yml` opens weekly npm and GitHub Actions update PRs. Treat those PRs as the recurring review, not as auto-merge.
- **Exceptions:** re-open the GHSA and this document on or before `reviewBy`.

Vite 7.3.7 patches the 7.x dev-server file-read and `server.fs.deny` advisories (GHSA-p9ff-h696-f583, GHSA-v2wj-q39q-566r, GHSA-fx2h-pf6j-xcff, GHSA-4w7w-66w2-5vf9). `vite.config.ts` binds `server.host` to `127.0.0.1`. `cors: true` is Vite’s default and only applies to that loopback process; the long-lived `Cache-Control` header is a local-dev caching choice, not a production header. Do not run `npm run dev -- --host` on a public network. Production is the static `dist/` output from `npm run build`.

## Toolchain pins (2026-10-06)

| Tool | Chosen line | Notes |
| --- | --- | --- |
| Vite | 7.3.x | Patches dev-server file-read / `server.fs.deny` advisories. |
| Jest + jsdom + `@types/jest` | 30.x | Direct `@jest/test-sequencer` 30 mixed with Jest 29 was removed. |
| ts-jest | 29.4.x | Supports Jest 29 and 30. `isolatedModules` now lives in the transform `tsconfig`, not the deprecated ts-jest option. |
| Tailwind CSS | 3.4.x | Stays on v3; v4 is a separate styling migration. |
| PostCSS | 8.5.29 | Direct pin plus override so nested copies cannot drift below the sourceMappingURL fixes. |

Unused direct dependencies removed in this pass: `@jest/test-sequencer`, `baseline-browser-mapping`.

Same-major `overrides` in `package.json` pin patched transitives the parent packages have not yet taken. They are not ignore lists. When Dependabot or a manual bump lands a parent that already includes the patch, delete the matching override and confirm `npm run test:advisories` still passes.

| Override | Closes |
| --- | --- |
| `handlebars` 4.7.10 | GHSA-2w6w-674q-4c4q and related Handlebars AST/injection advisories |
| `rollup` 4.64.0 | GHSA-mw96-cpmx-2vgc |
| `postcss` 8.5.29 | GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849, GHSA-fxqj-rqcc-2cmp, GHSA-qx2v-qp2m-jg93 |
| `browserslist` 4.29.3 | GHSA-c83g-rgw3-j3cx, GHSA-73wf-gq98-2v4g |
| `brace-expansion` 1.1.21 / 2.1.7 | GHSA-3jxr-9vmj-r5cp and later brace-expansion DoS advisories |
| `minimatch` 3.1.5 / 9.0.9 | GHSA-23c5-xmqv-rm74, GHSA-7r86-cg39-jmmj, GHSA-3ppc-4f35-3m26 |
| `picomatch` 2.3.2 / 4.0.7 | GHSA-c2c7-rcm5-vvqj, GHSA-3v7f-55p6-f55p |
| `nanoid` 3.3.20 | GHSA-xwg4-73v4-xw9w, GHSA-2v37-7h3g-55p8, GHSA-28wg-ghj8-5hjv |
| `flatted` 3.4.4 | GHSA-rf6f-7fwh-wjgh, GHSA-25h7-pfq9-p65f |
| `form-data` 4.0.6 | GHSA-hmw2-7cc7-3qxx |
| `glob@10` 10.5.0 | GHSA-5j98-mcp5-4vw2 |
| `js-yaml` 3.15.2 / 4.3.2 | GHSA-5p4m-2wfm-xmqj, GHSA-52cp-r559-cp3m, GHSA-2883-xcg3-v3hh, GHSA-mh29-5h37-fv8m |
| `source-map-js` 1.2.2 | GHSA-68fv-2mgg-jv7q |
| `ws` 8.22.0 | GHSA-96hv-2xvq-fx4p, GHSA-58qx-3vcg-4xpx |
| `ajv` 6.15.0 | GHSA-2g4f-4pwh-qvx6 |
| `@humanfs/node` 0.16.8 | GHSA-p498-v437-472g |
| `@babel/core` 7.29.7 | GHSA-4x5r-pxfx-6jf8 |
| `@tootallnate/once` 2.0.1 | GHSA-vpq2-c234-7xj6 |
| `esbuild` 0.28.2 | GHSA-g7r4-m6w7-qqqr |
| `postcss-selector-parser` 6.1.4 / 7.1.6 | GHSA-w9m9-85wc-3x92; 6.x still carries GHSA-rj75-hqrm-r3gf |

## Remaining findings that are not gated

These were present after the 2026-10-06 updates. They are moderate, have no compatible same-major fix that we are willing to take, and do not fail CI.

| Advisory | Package | Why it remains |
| --- | --- | --- |
| [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | `postcss-selector-parser` | Tailwind 3 still pulls a 6.x copy. The advisory range is `<7.1.6`, so 6.1.4 stays flagged. Forcing 7.x would be an unverified Tailwind 3 break. Quadratic selector parsing is a CSS-build DoS, not production request handling. |
| [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) | `sprintf-js` | Latest 1.1.3 is still in range. It arrives through `argparse@1` → `js-yaml@3` → Jest Istanbul config loading. npm’s suggested parent fix is ts-jest 27, which is a downgrade. Untrusted YAML is not fed to that path. |

Inherited package rows under `jest` / `ts-jest` / `tailwindcss` in `npm audit` count those two GHSAs plus the braces exception, not dozens of independent exploits.
