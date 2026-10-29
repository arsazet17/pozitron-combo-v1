# COMBO publication pipeline

The three active writer entry points all call `ci-publish.mjs` with
`cancel-in-progress: false`. Official data uses `combo-data-writer`, so a pending
draw update cannot be displaced by a journal request in `combo-main-writer`.
App builds use `combo-app-writer`; concurrent publishers still verify remote HEAD
and recompute on a fresh checkout before retrying a rejected push.
Only this helper commits and pushes generated files.

Each attempt fetches current main into a disposable Actions checkout, computes
outputs, runs the complete Stage 1 tests, and compares the remote HEAD again
before committing. A non-fast-forward push causes a fresh checkout and complete
recomputation. Candidates are never rebased onto another input snapshot. An
uncertain push is verified by remote ancestry. If the publisher itself changed,
the old process stops and requires a rerun.

The stages remain separate:

1. DATA UPDATE optionally reads and verifies official facts. The existing
   `update-combo-v1.yaml` workflow_dispatch endpoint and credentials are preserved.
2. The search journal is rebuilt only for a new archive anchor.
3. APP BUILD reconciles the app source fingerprint. Its generator excludes
   archive and status data, so new draws do not change app version or build ID.

All entry points reconcile these stages, even if their nominal trigger is an app
or journal change. GitHub may replace an older pending concurrency run; the
remaining run therefore reconciles every output from current main.

The check workflow runs syntax, workflow and data-refresh tests on relevant
pushes and pull requests. Every writer runs these checks before its own
generated commit, because commits made with GITHUB_TOKEN normally do not start
another push workflow.

Fourteen old one-time installer workflows are read-only manual retirement
notices. Their installer scripts are retained unchanged. They can no longer
overwrite the app or PWA from an automatic or accidental manual workflow run.

Workflow files use JSON syntax, which is valid YAML. This lets
`self-test-workflows.mjs` parse each complete document and check the publication
permissions, dependencies and concurrency without a downloaded YAML parser.

The syntax gate checks every tracked JS/MJS/CJS file, including retired installers. Their generated code must remain syntactically valid even though manual install workflows no longer execute them.
