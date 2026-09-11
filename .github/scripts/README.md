# COMBO publication pipeline

The four active writer entry points all call `ci-publish.mjs` and share the
`combo-main-writer` concurrency group with `cancel-in-progress: false`.
Only this helper commits and pushes generated files.

Each attempt fetches current main into a disposable Actions checkout, saves
runtime and guard baselines, computes outputs, runs the complete Stage 1 tests,
and compares the remote HEAD again before committing. A non-fast-forward push
causes a fresh checkout and complete recomputation. Candidates are never rebased
onto another input snapshot. An uncertain push is verified by remote ancestry.
If the publisher itself changed, the old process stops and requires a rerun.

The stages remain separate:

1. DATA UPDATE optionally reads and verifies official facts. The existing
   `update-combo-v1.yaml` workflow_dispatch endpoint and credentials are preserved.
2. XRAY RUNTIME UPDATE validates the saved runtime/guard, settles the published
   frozen forecast, and creates the next forecast only through the protected
   runtime builder.
3. The search journal is rebuilt only for a new archive anchor.
4. APP BUILD reconciles the app source fingerprint. Its generator excludes
   archive/status/runtime data, so new draws do not change app version or build ID.

All entry points reconcile these stages, even if their nominal trigger is an app,
runtime or journal change. GitHub may replace an older pending concurrency run;
the remaining run therefore reconciles every output from current main. Existing
pending forecasts and settled history still remain immutable.

`MISSING_TARGET_FACT` and `MISSED_FORECAST_WINDOW` (builder exit 2) are validated
and published as diagnostics, then the job fails visibly. Other failures prevent
publication. The runtime workflow has a manual `resume_live_after_gap` boolean,
off by default, which explicitly permits the builder to record missed unpublished
forecasts and resume at the latest live draw without fabricating historical ones.

The Stage 1 check workflow runs syntax, lifecycle, frozen, payout, UI/PWA and
workflow tests on relevant pushes and pull requests. Published runtime and guard
outputs trigger checks, never their own rebuild. Every writer runs these checks
before its own generated commit, because commits made with GITHUB_TOKEN normally
do not start another push workflow.

Fourteen old one-time installer workflows are read-only manual retirement
notices. Their installer scripts are retained unchanged, and the previous
workflow implementations remain in Git history. They can no longer overwrite
the repaired app or PWA from an automatic or accidental manual workflow run.

Workflow files use JSON syntax, which is valid YAML. This lets
`self-test-workflows.mjs` parse each complete document and check the publication
permissions, dependencies and concurrency without a downloaded YAML parser.

The syntax gate checks every tracked JS/MJS/CJS file, including retired installers. Their generated code must remain syntactically valid even though manual install workflows no longer execute them.
