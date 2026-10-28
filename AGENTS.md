# SleekFin Repository Instructions

These instructions apply to the entire repository. Treat `references/` as read-only research material unless the user explicitly names a reference repository as the target of a change.

## Priorities

1. Implement exactly what the user requested. Do not add adjacent features, broad cleanup, dependency upgrades, redesigns, or formatting sweeps.
2. Keep SleekFin specific to Jellyfin 12.0, .NET 10, and the Jellyfin Web `v12.0` contract unless the user explicitly requests a compatibility change.
3. Keep production code concise. Do not add abstractions, helpers, state, compatibility branches, dependencies, support files, or tests unless they are necessary for the requested behavior.
4. Inspect the relevant source, history, and surrounding conventions before editing. Do not infer behavior from filenames or issue labels alone.
5. Preserve unrelated user changes. Never overwrite, discard, stage, or commit work that is outside the current task.
6. Distinguish implemented, build-verified, manually tested, and live Jellyfin-verified outcomes. Never present one as another.

## User workflow and product preferences

- Treat the user's corrections to component names and scope literally. If they distinguish the drag box, preview header, live header, drawer, dropdown, or sidebar, verify and change that exact surface.
- Do not substitute prototypes, isolated mock pages, or approximate stand-ins when the user asks for a Jellyfin change. Implement it in SleekFin, deploy it to the authorized Jellyfin instance, and inspect the actual rendered result.
- When a design should match SeerrFin, inspect SeerrFin's current configuration markup and styles and make equivalent SleekFin controls use the same structure, dimensions, typography, spacing, colors, and interaction patterns where compatible with SleekFin's scoped naming.
- Use the actual icons, labels, enabled state, and configurable names exposed by Jellyfin, SeerrFin, or Jellyfin Enhanced. Do not invent glyphs, redraw provider icons, or hardcode labels that the provider can change.
- Preserve direct manipulation in the UI Builder: show the dragged element, update ordering continuously, animate movement smoothly, and let users drag between the palette, preview, and open overflow surfaces. Do not add arrow controls or click-to-add/remove behavior unless explicitly requested. Preserve duplicate items and draggable structural items such as separators and spaces.
- Verify header behavior under every affected placement and width: left, center, and right positioning; crowded desktop overflow; mobile dock and drawer layouts; brand overlap; structural-only overflow; and repeated SPA mounts. Header content must not become horizontally scrollable, and hidden items must always have a visible overflow control.
- When asked to remove dead, redundant, obsolete, or unnecessary code, first identify the exact proven candidates and explain why each is removable. Delete only that approved list unless the user explicitly authorizes the audit and deletion together.
- After deploying browser assets, use a hard refresh or a fresh cache-busting page load before judging the result. After live interaction tests, discard unsaved test settings and restore any temporary viewport override so the user's browser remains in its normal state.
- Use credentials the user explicitly provides for the authorized task instead of repeatedly asking during that task, but never write credentials into repository files, logs, commit messages, shell history, or long-term notes.

## Reference baseline

- Use SeerrFin as the structural reference: one solution, one Jellyfin plugin project, embedded browser assets, a small plugin entry point, role-based folders, and version-triggered release automation.
- Reuse architectural patterns, not SeerrFin product behavior, names, selectors, API integrations, or legacy compatibility code.
- Check `references/jellyfin` and the exact `v12.0` state of `references/jellyfin-web` before relying on a Jellyfin API, DOM structure, route, layout behavior, or CSS class.
- Use the other reference plugins to compare integration patterns, not as authority over Jellyfin 12 source.
- Do not build, format, rename, or edit files under `references/` during ordinary SleekFin work.

## Required change workflow

For every feature, fix, refactor, style change, configuration change, documentation change, build change, or CI change:

1. Inspect the current worktree and the complete relevant code path.
2. Define the narrow change boundary. A working vertical slice may cross configuration, controller, service, model, JavaScript, and CSS files when all of them are required for one behavior.
3. Implement only that coherent change.
4. Run verification proportionate to the affected behavior.
5. Review the complete diff for correctness, accidental scope expansion, secrets, stale names, generated files, and unnecessary comments.
6. Report the changed files, verification results, and any unavailable live checks.
7. Propose an exact commit subject and ask the user for explicit permission to commit.
8. Commit only after that approval. If approval is declined or unavailable, leave the verified work uncommitted.

The original request to make an edit is not commit approval. Approval for an earlier commit is not approval for a later one.

## Repository organization

Keep plugin production code under `src/Jellyfin.Plugin.SleekFin/`, keep the frontend build entry point at the repository root, and preserve these boundaries:

| Location | Responsibility |
| --- | --- |
| `SleekFinPlugin.cs` | Plugin identity, Jellyfin lifecycle, configuration ownership, and dashboard page registration only. |
| `Configuration/` | Persisted settings, safe defaults, normalization, migrations, and dashboard configuration UI. |
| `Controllers/` | HTTP routes, authorization, input validation, request mapping, response mapping, and embedded asset delivery. |
| `Services/` | Application behavior, external integrations, stateful work, and background operations. |
| `Helpers/` | Focused stateless normalization, transformation, and reusable operations. |
| `Model/` | Request, response, transport, and internal data shapes. |
| `Frontend/` | Authored Preact/JSX components, feature logic, runtime code, and shared browser utilities. |
| `Inject/` | Hand-authored component and feature CSS, static browser assets, and generated bundles under `Build/`. |
| `Properties/AssemblyInfo.cs` | Assembly identity and version. |
| `build.js` | The repository-level frontend build entry point. |
| `meta.json` | Installed plugin metadata. |
| `manifest.json` | Plugin repository/catalog metadata. |
| `.github/workflows/release.yml` | Version-triggered packaging and release automation. |

- Prefer one primary type per C# file. Closely coupled DTO item types may share a file when that improves discoverability.
- Add a subfolder only when a cohesive feature or domain has outgrown its current category.
- Keep controllers thin. Split a controller or service when it starts handling separate resources, integrations, or workflows.
- When dependency injection becomes necessary, use `PluginServiceRegistrator` as the single registration point. Do not create or retain an empty registrator.
- A new injected asset is incomplete until it is embedded in the project file, served by a controller, injected in the correct order, and verified in the built assembly.
- Keep `build.js` at the repository root. Keep `Inject/Build/` gitignored and generate it through the frontend, .NET, and release builds; never edit or commit generated bundles directly.
- Split the authored frontend by cohesive components and features with matching, narrowly scoped `sleekfin-*.css` assets. Do not collapse distinct responsibilities back into monolithic JavaScript or CSS files.
- Do not give frontend modules independent version constants or markers. Use the plugin release version only where a version is actually required.

## C# conventions

- Keep `<TargetFramework>net10.0</TargetFramework>` and Jellyfin package version `12.0.0` synchronized with the workflow and metadata.
- Keep nullable reference types and implicit usings enabled.
- Use file-scoped namespaces, four-space indentation, and braces on their own lines.
- Use `PascalCase` for types, methods, properties, and public constants.
- Use `camelCase` for parameters and local variables. Prefix private instance fields with `_`.
- Use descriptive feature-and-role names. Avoid generic names such as `Manager`, `Util`, or `Data` when a more precise name exists.
- Mark concrete classes `sealed` when inheritance is not required or intentionally supported. Mark stateless utility classes `static`.
- Initialize non-null strings and collections with safe defaults. Use nullable types only when absence is meaningful.
- Prefer immutable internal/response models with `init`; use `set` when ASP.NET model binding or Jellyfin XML configuration requires it.
- Use explicit `StringComparison.Ordinal` or `StringComparison.OrdinalIgnoreCase` for identifiers, keys, routes, protocol values, and marker checks.
- Use invariant formatting for values placed in URLs, headers, serialized payloads, or cache keys.
- Prefer guard clauses and small focused methods over deep nesting.
- Match the surrounding file style. Do not reformat unrelated code.

## Configuration and serialization

- Give every setting a safe explicit default.
- Treat persisted property names and meanings as compatibility-sensitive.
- Normalize malformed, missing, duplicated, or legacy values at load/save boundaries.
- Keep normalization deterministic and idempotent. Clamp numeric ranges and validate constrained strings before feature logic uses them.
- Add a migration path before renaming, changing the meaning of, or removing a persisted setting.
- When adding a setting, update every required layer together: configuration model, dashboard load/save behavior, normalization, client payload, feature behavior, and relevant documentation.
- Default to `System.Text.Json`. Use Newtonsoft JSON only at a boundary that specifically requires `JObject`, `JArray`, or another Newtonsoft type.
- Do not mix serializer-specific attributes on the same persisted contract without a verified reason and round-trip test.
- Never expose API keys, tokens, credentials, private server configuration, or absolute filesystem paths to the browser.

## Dependency injection, state, and async work

- Use constructor injection for services, loggers, Jellyfin services, and HTTP clients.
- Prefer an injected configuration accessor. Use `SleekFinPlugin.Instance` only at Jellyfin callbacks where dependency injection is unavailable.
- Use `IHttpClientFactory` or typed/named clients. Do not construct a new `HttpClient` for individual operations.
- Choose service lifetimes deliberately. Mutable singleton state must be thread-safe.
- Keep network, file, and other I/O asynchronous end to end.
- Never use `.Result`, `.Wait()`, or `.GetAwaiter().GetResult()` in controller, service, request, or helper code.
- Async operations must accept and propagate `CancellationToken` whenever the downstream API supports it.
- Do not swallow cancellation exceptions when cancellation was requested.
- Use `ConfigureAwait(false)` consistently in server-side library/service code where no request context is needed.
- Avoid fire-and-forget work unless Jellyfin owns its lifecycle and failures remain observable.
- Dispose requests, responses, streams, and other disposable resources at the narrowest correct scope.

## Controllers and security

- Controllers authenticate, validate, delegate, and translate results. Business and integration logic belongs in services.
- Apply `[Authorize]` to data and mutation endpoints by default.
- Require administrator authorization for endpoints that expose or modify plugin configuration.
- Use `[AllowAnonymous]` only for intentional public static assets or another explicitly reviewed public resource.
- Validate route, query, body, host, path, and enum-like inputs before calling a service.
- Verify Jellyfin user identity before any per-user operation.
- Use typed request and response DTOs for stable endpoints. Keep status codes and error shapes consistent.
- Never return credentials, authorization headers, internal exception details, sensitive upstream response bodies, or unrelated configuration.
- Do not proxy arbitrary schemes, hosts, paths, or headers without explicit allow-listing.

## Jellyfin and File Transformation boundaries

- Keep embedded-resource names, controller routes, transformation URLs, and project declarations synchronized.
- Use `ApiClient.getUrl(...)` for browser API routes and base-URL-safe relative paths for injected assets. Do not hardcode root-relative Jellyfin paths.
- Make every HTML or JSON transformation idempotent.
- Return the original content unchanged when the plugin is disabled or when input is null, malformed, already transformed, or missing required markers.
- Never duplicate scripts, stylesheets, navigation entries, listeners, or panels when initialization or transformation runs more than once.
- Treat reflection against File Transformation as an optional compatibility boundary:
  - Check the assembly, type, method, and expected signature.
  - Log an actionable warning when the dependency or contract is unavailable.
  - Fail open without preventing Jellyfin from starting or serving its normal web client.
- Keep transformation callbacks deterministic except for explicitly enabled development cache busting.
- Document the Jellyfin version or upstream limitation when a workaround would otherwise appear unnecessary.

## Injected JavaScript and CSS

- Keep the approved Preact/JSX authoring layer and compile it to isolated browser bundles. Do not add another framework, build layer, or frontend dependency without explicit approval.
- Keep generated bundles in strict-mode IIFEs and expose only one guarded `window.SleekFin` namespace. Do not leak helpers or mutable state into unrelated globals.
- Use `camelCase` for functions and variables and `UPPER_SNAKE_CASE` for true constants.
- Keep JSX compact. Put an opening tag and its props on one line when it remains readable, and do not wrap straightforward components in verbose abstractions.
- Keep straightforward calls, expressions, destructuring, object literals, and short returns on one line when they remain readable; use vertical formatting only when it materially improves clarity.
- Prefer JSX for component UI. For small non-Preact DOM fragments containing trusted values, prefer one parameterized template literal over long `createElement` and append chains; escape or sanitize untrusted values before interpolation.
- Represent each SVG icon's markup or path data as one string rather than an array of path fragments.
- Every module must tolerate duplicate evaluation and repeated Jellyfin SPA mounts.
- Guard every persistent event listener, observer, timer, and mount operation. Clean them up when their owning feature is removed.
- Do not assume a single page load or stable DOM. Jellyfin may keep hidden pages mounted, duplicate route containers, or replace React-managed headers after startup.
- Before touching a node, verify it is connected and belongs to the active visible page. Do not blindly use the first selector match.
- Debounce or batch MutationObserver work. Observe the narrowest stable ancestor and ignore mutations the plugin caused itself.
- Protect async rendering with request/session identifiers or equivalent cancellation so stale results cannot update a detached or superseded view.
- Prefer stable IDs, classes, and `data-*` markers. Keep SleekFin identifiers prefixed with `sleekfin` and custom events under `sleekfin:*`.
- Use DOM APIs or `textContent` for untrusted content. Do not interpolate remote or user-provided values into `innerHTML` without escaping or sanitizing them.
- Do not reach into Jellyfin webpack internals or mutate React-owned nodes unless no supported boundary exists, the user requested the behavior, and the exact Jellyfin 12 implementation was inspected.
- Scope CSS under `.sleekfin` or `.sleekfin-*`. Avoid generic element rules, global resets, SeerrFin's legacy `bst-*` prefix, and unrelated Jellyfin overrides.
- Reuse Jellyfin variables where appropriate. Add responsive and TV behavior when the feature requires them.
- Do not add or retain accessibility-only attributes, roles, tab stops, duplicate labels, focus rules, or reduced-motion branches unless the user requests them or the existing Jellyfin contract needs them for behavior. Preserve native semantics and any Jellyfin attributes or selectors that functionality depends on.
- Remove only proven dead or redundant JavaScript and CSS. Preserve lifecycle guards, stale-request protection, Jellyfin compatibility behavior, CSS specificity, and cascade order even when a shorter implementation is possible.
- Group CSS selectors or declarations only when they always apply together and the merge preserves specificity and order. Remove proven no-op declarations, orphaned selectors, unused imports or exports, dead branches, and unused props.
- Keep browser targets intentional and derived from supported Jellyfin clients. Do not change or remove compatibility compilation without verifying the generated bundles against those clients.
- Avoid `!important` unless overriding Jellyfin requires it; keep it narrowly scoped and explain the compatibility reason when non-obvious.

## Comments

- Write a comment only when it explains information the code cannot express clearly by itself.
- Relevant comments explain one of these things:
  - A Jellyfin, ASP.NET, browser, or serializer constraint.
  - A security or permission invariant.
  - A compatibility workaround or upstream API quirk.
  - A non-obvious lifecycle, race, caching, concurrency, fallback, or ordering decision.
  - Why an apparently simpler implementation is unsafe or incorrect.
- Explain **why**, the invariant, or the removal condition. Do not narrate assignments, loops, method names, selectors, or straightforward control flow.
- Prefer a clearer name or smaller function over a comment that compensates for unclear code.
- Do not add banner comments, redundant summaries, commented-out code, jokes, personal asides, or speculative notes such as “maybe,” “I think,” or “idk.”
- Do not leave unresolved uncertainty in a comment. Investigate it, ask the user when it affects scope, or create a tracked issue only when requested.
- Write short, complete, grammatically correct sentences with correct product names, capitalization, and punctuation.
- Keep comments immediately above the code they explain. Update or remove them whenever the associated behavior changes.
- Use XML documentation or JSDoc only for a public integration contract whose behavior is not obvious. Do not add boilerplate documentation to every member.
- Use logs, tests, or error messages instead of comments to describe runtime failures.

## Error handling and logging

- Validate expected failure conditions early and return explicit results.
- Catch the narrowest exception that can be handled meaningfully.
- Catch `Exception` only at a real external boundary where SleekFin can degrade safely. Preserve requested cancellation.
- Do not silently swallow malformed configuration, remote failures, or transformation errors unless a documented fallback is intentional.
- Use structured `ILogger` templates with named placeholders. Do not interpolate server log messages.
- Use `Information` for lifecycle events and major completed operations, `Warning` for recoverable compatibility/integration failures, `Error` for failed requested behavior or threatened persisted state, and `Debug` for optional diagnostics.
- Avoid logging the same failure at multiple layers or emitting high-volume logs from observers and render loops.
- Never log secrets, authorization headers, cookies, private message/body content, credential-bearing URLs, or full configuration objects.
- Browser logs should be sparse, prefixed consistently, and limited to actionable lifecycle or failure information.

## Verification requirements

Run the smallest relevant checks while developing, then run the full applicable set before proposing a commit.

| Change | Required verification |
| --- | --- |
| Any tracked change | Review the complete diff, run `git diff --check` when Git is available, and confirm no unrelated files are included. |
| C# or project file | `dotnet build SleekFin.sln -c Release` and `dotnet format SleekFin.sln --verify-no-changes --no-restore`. |
| Frontend JavaScript or JSX | Run `npm run build` and `npm run check`, then run `node --check` on every changed authored `.js` file. |
| Configuration HTML script | Extract and syntax-check its inline script, then verify load, edit, save, reload, and unknown-field preservation. |
| `meta.json` or `manifest.json` | `jq empty meta.json manifest.json`, then check GUID, version, ABI, owner, assembly name, and release URL consistency. |
| Embedded asset wiring | Build, then confirm every added resource name exists in `Jellyfin.Plugin.SleekFin.dll`. |
| Release workflow | Run `actionlint` when available and smoke-test version parsing, version replacement, ZIP contents, checksum generation, and manifest insertion. |
| Transformation | Verify disabled/malformed input is unchanged, repeated application is idempotent, asset order is correct, and base URLs are preserved. |
| API or security behavior | Verify authorization, validation, cancellation, status codes, safe errors, and absence of secrets in responses/logs. |
| User-facing injected UI | Test affected Modern, desktop/mobile legacy, TV, navigation/remount, loading, empty, and error paths, plus keyboard behavior only when the feature or existing Jellyfin contract requires it. |

- Do not add test files or test projects unless the user explicitly requests them. Prefer existing checks and temporary local harnesses that are not committed.
- There is no assumption that an automated suite already exists. Report what actually ran.
- For browser integration, the meaningful live sequence is: build, install into Jellyfin 12, install/enable File Transformation, restart Jellyfin, hard-refresh the client, inspect console/network output, and exercise the affected lifecycle path.
- Record the Jellyfin version, plugin version, browser/client, relevant theme/plugins, steps, and outcome for live testing.
- For reference-driven visual changes, inspect the rendered result after each meaningful iteration. Use side-by-side or overlay comparisons for subtle fidelity work, and preserve any manual user changes made between iterations.
- A successful build or syntax check is not proof that injected behavior works in a real Jellyfin instance.
- If live verification is unavailable, say so explicitly before asking for commit approval.

## Commit approval and creation

After completing and validating a coherent change, stop before committing and show the user:

- The exact files that would be committed.
- A short summary of the behavior changed.
- The checks run and their results.
- Any failed, skipped, or unavailable checks.
- The exact proposed commit subject.

Ask the user whether to create that commit. Do not treat silence as approval.

After approval:

1. Recheck `git status` and the complete diff.
2. Stage only the approved task paths with `git add -- <paths>`. Never use `git add .` or `git add -A`.
3. Review the staged diff and confirm unrelated user changes, `references/`, `.DS_Store`, `bin/`, `obj/`, and `dist/` are excluded.
4. Create one local commit for the coherent concern.
5. Report the commit hash, subject, verification state, and remaining worktree status.

- Do not commit failed or unverified work unless the failure and risk are disclosed and the user explicitly instructs you to proceed.
- If the user declines or has not answered, leave the changes uncommitted.
- If this directory is not a Git repository, report that and ask before running `git init`.
- Commit approval does not authorize a push, tag, release, amend, rebase, squash, reset, or history rewrite. Each requires separate explicit authorization.

### Commit subjects

Use one comprehensive single-line subject in this form:

```text
type: Capitalized description of the completed outcome
```

- Prefer `feat`, `fix`, `style`, `refactor`, `docs`, `test`, `build`, `ci`, or `chore`.
- Use `feat` for new behavior and `fix` for corrected behavior. Do not label a bug fix as a feature.
- SeerrFin historically used `misc`; use a more precise type whenever one exists.
- Inspect recent commit subjects first and match their tone and level of detail.
- Match SeerrFin's user-visible, past-tense tone where natural: `Added`, `Fixed`, `Updated`, `Made`, or `Improved`.
- Include the main user-visible result and important technical or architectural details while omitting incidental cleanup and low-value implementation trivia.
- Do not add a commit body, paragraphs, or a dashed list. Keep all relevant information in the single Conventional Commit subject line.
- Keep one concern per commit. Required cross-layer files for one working vertical slice belong together; unrelated cleanup, documentation, dependencies, formatting, or workflow changes do not.

## Release and version guard

The first line of a commit containing `(vMAJOR.MINOR.PATCH.BUILD)` is an executable release signal when pushed to `main`.

- Ordinary commits must never contain a four-part `(v...)` marker.
- Use the marker only after the user explicitly approves both a release and the exact four-part version.
- Release approval is separate from commit approval, and push approval is separate from both.
- Do not use an empty commit to retrigger a failed release unless the user explicitly approves that recovery after the failure is diagnosed.
- Do not discover compatibility from a moving “latest” Jellyfin or Jellyfin Web release. Keep Jellyfin version, target ABI, target framework, output path, and ZIP naming pinned and synchronized.
- Do not manually bump workflow-managed project, assembly, metadata, catalog, checksum, timestamp, or tag values during ordinary work.
- The release workflow's bot-generated `chore: bump version to ...` commit is automation-owned. Do not imitate or amend it manually.
- Use SeerrFin's four-part intent only as guidance, and confirm the exact version with the user:
  - `MINOR` for a large new feature area.
  - `PATCH` for a smaller feature or meaningful fix.
  - `BUILD` for a tiny fix, toggle, or polish change.
- Never push, tag, publish, or create a GitHub release unless the user explicitly asks for that external action.
