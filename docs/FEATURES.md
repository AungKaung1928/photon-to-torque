# Feature map

What the site must do, how a visitor reaches each feature, and how `scripts/verify.sh` proves it still works.
The script builds the site, serves the build and loads every row below in headless Chrome. It exits non-zero on a
console error, a missing element or an empty drawing. Screenshots of step 1 of each chapter go to `verify-out/`
(git-ignored).

```
./scripts/verify.sh          # needs Chrome; set CHROME=/path/to/chrome if it is not found
```

| Feature | How a visitor reaches it | How the script drives it | Visible state that proves it |
|---|---|---|---|
| Chapter page | Chapter list in the header, or `#/<route>/1` | Loads `#/<route>/1` for `tick`, `ppo`, `dds`, `sim2real`, `vla`, `sysid` | Chapter title (`h1`), step title, ring with a current step |
| Step-through | Next / Back buttons, arrow keys, ring | Reads "1 / N" on step 1, then loads every `#/<route>/<k>` up to N | Position text shows `k / N` on step k |
| Wrap-around | Next on the last step | Loads the last step | Next links to `#/<route>/1` |
| Chapter panels | Below the step card | Looks for each panel heading id (table below) | Heading present, at least one SVG, no empty SVG |
| Japanese | Language switch, or a Japanese browser | Loads step 1 of every chapter with the browser language set to `ja` | `<html lang="ja">`, chapter title differs from English |
| Unknown link | A mistyped or old URL | Loads `#/nope/99` | Chapter 1, step 1 is shown, never a blank page |

| Chapter route | Panel heading ids |
|---|---|
| `tick` | `budget-h`, `latency-h` |
| `ppo` | `clip-h`, `diag-h` |
| `dds` | `qos-h`, `profiles-h` |
| `sim2real` | `holdout-h`, `trap-h` |
| `vla` | `scaling-h`, `timing-h`, `ladder-h` |
| `sysid` | `replay-h`, `fit-h`, `spread-h` |

## Not covered

- Moving a slider or pressing an arrow key: the script loads pages, it does not send input events. The math behind
  every slider is unit-tested (`npm test`).
- Phone width: screenshots are taken at 1280 px only.

A new chapter or panel gets a row in `CHAPTERS` in `scripts/verify.mjs` and a row here.
