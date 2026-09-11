# Upper XRAY table: bounded A/B check
Archive snapshot: 62dd989b70bcba7ec5e4b96e0fee8f383142e15d.
Exactly 1,000 consecutive fact transitions: source 326339–327338, target 326340–327339.
Each prediction uses only the 20 facts ending at its source; target fact is used only for scoring.
These are walk-forward reconstructions, not historical published frozen results.

| Variant | Mean current fact ∩ predicted20 | Mean predicted20 ∩ next fact | Worse / better than A |
| --- | ---: | ---: | ---: |
| A: unchanged V4.1 | 10.811 | 5.004 | — |
| B: omit latest fact's own ASC/DRAW edges | 8.245 | 4.974 | 313 / 276 |

411 ties. B retains the original weights/ages for the other 19 facts (skip age0===0 in edgeMaps; do not shift ages).
No repeat cap or alternate COMBO algorithm was introduced. B loses 30 total hits; production mathematics stays unchanged. No third candidate was needed.

Cause: edgeMaps includes bidirectional ASC/DRAW adjacency from the latest fact, with weight 1/(0.65+1)=0.60606 per edge. Support is then summed FROM that same fact to every candidate. Thus retained numbers receive their own contemporaneous adjacency support. Lexicographic ASC/DRAW support precedes the fresh flag; skipping x===n only removes a literal self-loop, not support through other numbers in the same fact. COLUMN/LEVEL also prioritize the current concentration; they were held fixed in B.

Display repair only: filter existing saved movementEdges to current-only FROM → forecast-only TO, before the ten-line limit. Both SVG and the textual movement list use the same filter. No frozen record or engine output is rewritten; COMBO logic is unchanged.

Verification: focused UI tests cover retained-source support, retained targets, self-loops, valid arrows after more than ten filtered edges, hidden/visible overlay and existing XRAY labels. PWA source, lifecycle, history, publisher and workflows are untouched.
