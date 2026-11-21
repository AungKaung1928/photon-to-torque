# Feature map

What the site must do, how a visitor reaches each feature, and how `scripts/verify.sh` proves it still works.
The script builds the site, serves the build and loads every row below in headless Chrome. It exits non-zero on a
console error, a missing element or an empty drawing. Screenshots of the overview and of step 1 of each chapter go to `verify-out/`
(git-ignored).

```
./scripts/verify.sh          # needs Chrome; set CHROME=/path/to/chrome if it is not found
```

| Feature | How a visitor reaches it | How the script drives it | Visible state that proves it |
|---|---|---|---|
| Overview | Opening the site, or the site name in the header | Loads the site with no route, in English and Japanese | One card per chapter (`card-<route>`) with a number and a link to step 1 |
| Chapter page | Overview card, chapter list in the header, or `#/<route>/1` | Loads `#/<route>/1` for `tick`, `ppo`, `dds`, `sim2real`, `vla`, `sysid` | Chapter title (`h1`), step title, ring with a current step |
| Step-through | Next / Back buttons, arrow keys, ring | Reads "1 / N" on step 1, then loads every `#/<route>/<k>` up to N | Position text shows `k / N` on step k |
| Wrap-around | Next on the last step | Loads the last step | Next links to `#/<route>/1` |
| Chapter panels | Below the step card | Looks for each panel heading id (table below) | Heading present, at least one SVG, no empty SVG |
| Jump to evidence | Buttons under the chapter intro | Looks for one button per panel (`evidence-<panel id>`) on every step | Button present for each panel heading |
| Japanese | Language switch, or a Japanese browser | Loads step 1 of every chapter with the browser language set to `ja` | `<html lang="ja">`, chapter title differs from English |
| Phone width | A 390 px wide phone | Loads step 1 of every chapter inside a 390 px frame, in English and Japanese, and reads the page's scroll width | Page is no wider than the frame (no sideways scroll); screenshot `<route>-1-phone.png` |
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

A new chapter or panel gets a row in `CHAPTERS` in `scripts/verify.mjs` and a row here.
