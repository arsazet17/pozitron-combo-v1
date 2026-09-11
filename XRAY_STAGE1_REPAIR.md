# XRAY Stage 1: immutable forecasts and durable history

This repair changes the lifecycle, storage, workflows, UI and PWA. The bytes of
xray-structure-engine-v4.mjs are unchanged (Git blob
d6bf20b7e7c0dd48782eb75fb01136e19d3adaee). No ranking, weights, repeats,
predicted20 selection or four-combination selection were changed.

## Storage guarantees

- Every canonical target occurs once across history and pending.
- A SHA-256 forecastFingerprint covers sourceDraw, targetDraw, engineVersion,
  createdAt, forecast numbers, all four branches, original source/target metadata,
  structural diagnostics and the payout snapshot when one was frozen.
- data/xray-runtime.guard.json retains every published target's fingerprint.
  Settled rows additionally have a digest of the complete saved record.
- Validation checks both the guard and previous Git HEAD. Recomputing a modified
  forecast's fingerprint cannot bypass the previous guard.
- Existing runtime/guard read or parse errors are fatal. An existing missing
  runtime is never treated as a new installation. No history truncation remains.
- The builder uses an exclusive local lock. A settlement is atomically renamed
  into runtime, then its guard is durably written, before calling the unchanged
  forecast engine. If either checkpoint fails, the next forecast is not built.
- Runtime is written before guard. After an interrupted guard update, the next
  run first validates that all older guard records survive, then advances the
  guard before normal processing. It never rewinds a guard.
- Repeat rebuild without new facts does not alter frozen, generation or files.
- Changing installed engine version does not replace an existing pending.
- New forecasts freeze a payout table snapshot. Old records keep all saved
  numbers, hits and payouts; absent legacy totalPayout is the sum of saved branch
  payouts, counting legacy aliases only once.

## Missing facts and missed forecast windows

MISSING_TARGET_FACT preserves the pending forecast and stops advancement until
the exact target fact becomes available. Rolling the archive back does not
clear this error.

If several facts arrived before the next forecast was published, the previous
frozen is settled and saved, then MISSED_FORECAST_WINDOW stops advancement.
No predictions are manufactured for already-known past outcomes.

After reviewing the verified archive, explicitly run the runtime workflow with
resume_live_after_gap=true (default false), or invoke:
node build-xray-runtime.mjs --resume-live-after-gap

That operation records the skipped target range as NO_PUBLISHED_FORECAST and
creates only the next forecast after the latest available fact. It cannot clear
MISSING_TARGET_FACT and cannot recalculate any existing pending.

## Recovery performed in this repair

Seven lost published settled records 327250–327256 were copied unchanged from
b3f68b9b779a071296de6d1e451c79ea63766531. Each carries its original creation time,
engine version, recovery source and first-publication commit/time. No historical
prediction was calculated with the modern engine.

327093 has no published forecast in the complete relevant runtime Git timeline:
pending327092 was followed directly by pending327094. The gap is documented,
not filled with a synthetic result.

Late: 327092,327249,327257.
Replaced: 327249,327257.
These records have statisticsEligible=false. Existing primary records and their
old hits are retained. The first published variants for replaced targets remain
separately in data/xray-recovery-evidence.json, never counted as additional
canonical forecasts. Publication evidence establishes repository availability,
not the exact time a web deployment became available.

At adoption of base4e2119be4fa34690f200391ad005d1d79124fdd6, history grows
from224 to231, and pending327322 is preserved. All60 prior search-journal snapshots
are retained; the existing unchanged journal generator adds20 current snapshots.

## Publishing and CI

Four workflow entry points share concurrency combo-main-writer,
cancel-in-progress=false, and one publisher implementation. Every writer
reconciles current runtime, journal and source-hashed app output. DATA mode
additionally fetches verified official data; only data/status/runtime/journal
change because of a new draw.

A newer remote HEAD causes a fresh checkout and recalculation/revalidation.
No generated runtime is rebased and blindly pushed. Rejected pushes are
recomputed; uncertain push success is checked by ancestry. Before push, all
tests and baseline validation run. Runtime output changes trigger checks,
not another runtime rebuild.

The14 historical install workflows are read-only manual retirement notices.
Their scripts remain in the repository and original workflows remain in Git.
They can no longer overwrite the repaired lifecycle/UI/PWA.

APP BUILD includes installed engine/runtime/UI source and excludes live data.
Application version4.3.5 is this UI/storage repair release. Data updates do not
bump it. The shell build ID is shared by app-version.json, HTML, manifest and SW.

## UI and PWA

Current fact, next frozen forecast and settled result are separately labeled.
Purple is a repeat from the source fact, never a verified future hit. Saved
branch and total payouts, diagnostics and late/replaced exclusion notes are shown.
The public API is window.ComboXrayUI; hidden table geometry is measured only
after visibility and redraws on layout, navigation, fold, orientation and refresh.

The service worker precaches actual versioned JS/CSS/manifest URLs. It deletes
only combo-keno-shell-* caches. Runtime, all data directory resources, official
archive/status, payouts, presets and app-version remain network/no-store.
Offline navigation can load the shell; live facts are not silently taken from
an old service-worker cache.

## Checks

node .github/scripts/check-stage1.mjs
node validate-xray-runtime.mjs --baseline previous-runtime.json --baseline-guard previous-guard.json

The check entry runs Node syntax checks,19 lifecycle/IO regressions,9 UI/PWA/build
checks, full workflow JSON/YAML sanity and publisher race/failure scenarios,
then validates current runtime and guard. A separate check compares against the
previous published commit (including additive adoption from the legacy schema).

The desktop shell/Node sandbox was unavailable during authoring. Before commit,
the exact source suites were executed in isolated V8 with filesystem/browser/
crypto adapters; Acorn8.18 parsed all changed modules and HTML inline scripts.
GitHub Actions runs the committed suites using actual Node22. The UI tests model
browser events and cache APIs; they are not a manual real-device browser test.

Дополнительно исправлено экранирование строки в отключённом `install-combo-merged-fast.cjs`: полный `node --check` выявил синтаксическую ошибку старого установщика. Проверки теперь запускаются при изменении любого JS/MJS/CJS.

После amend CI загружает точный `event.before` SHA, если он отсутствует в checkout, и сравнивает историю с ним. Ошибка загрузки остаётся fatal. Отдельный `self-test-published-baseline.mjs` проверяет этот путь и отказ при недоступной/невалидной предыдущей версии.

Во время финальной проверки authoritative DATA writer успешно закрыл frozen №327322 с неизменным fingerprint и создал №327323. История выросла с231 до232; исходный автоматический коммит144d82112eda2fab467f740091dbd1cf86356b5b сохранён в Git как свидетельство. Его пять файлов данных включены без изменений в единый итоговый ремонтный коммит.
