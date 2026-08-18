# Agent Note: The per-provider row slot on the Models page

Status: implemented

English | [中文](2026-08-18-models-provider-row-slot.zh.md)

## Problem

Out-of-tree feature plugins needed per-provider content on the Models settings page — a quota/balance capsule beside a provider's name, for example. The page's rows are rendered inside `ui-settings-models` with no extension point, so the only ways in were replacing the whole `settings.section` contribution or manipulating the DOM from outside. Both destroy the page's own composition: a replacement duplicates its directory/settings/credential join and drifts from it, and DOM injection survives neither re-renders nor the page's own state transitions.

## Decision

The Models entry declares one list slot, `settings.models.provider`, in its `settings.section` registration's `children`, and renders it once per configured provider row between the row identity (name, custom tag, credential dot) and the row actions (edit, remove). The slot's canonical type lives in `ui-settings` beside every other settings slot type — the `settings.general.item` precedent one level deeper — so a contributor depends on the settings domain contract, not on the Models plugin.

The owner share is the row's current identity only: `provider` (the stable route id an edit cannot change, so it is the key a contribution fetches or caches by) and `displayName` (the renamable label an edit may change underneath a mounted contribution). No write affordances, no credential state, no namespace internals cross the boundary; a contribution that wants its own data fetches it through its own services keyed by the route id.

The seat renders only on rows. A whole-section provider drawn as its open setup card in the first-run posture owns no row and therefore no seat; dormant directory entries and the add/declare cards are untouched. An empty contribution list renders the outlet's `display:contents` anchor only, so a page without contributors is pixel-identical to the pre-slot page, and unloading the contributing plugin restores it exactly.

Registration follows the standard cross-plugin pattern: contributors use `ctx.slots.inject('settings.models.provider', ...)`, which waits for the Models entry's declaration, collapses with it if the Models plugin unloads, and re-registers on redeclaration — no activation-order or static-import dependency.

## Alternatives considered

**Replace the whole `settings.section` entry from the feature plugin.** Rejected: the replacement owns a parallel directory/settings/credential join that drifts from the page's, and the two registrations fight over one `settings.section` cell.

**DOM injection from a feature plugin.** Rejected: injected nodes sit outside React's tree, so the page's re-renders (invalidation-driven reloads, editor open/close, provider removal) orphan or duplicate them, and teardown cannot be reliable.

**A whole-page takeover through a `chain` slot.** Rejected: the need is row-scoped, not page-scoped; a takeover would still have to re-implement the entire page to place one capsule per row.

**Passing the provider list to the feature plugin as data.** Rejected: it inverts ownership — the Models page's join is view state, and duplicating it into another plugin's store to render chips creates a second fact source with its own staleness.

## Consequences

The Models page gains exactly one extension surface: a documented, typed, ordered list per configured row. `dsh-provider-balance` is the first consumer (a balance capsule fetched through its own host route, keyed by the route id). Future per-provider content — health badges, usage meters — registers the same way without editing `ui-settings-models` again.

The composition dependency runs one way: the contributor waits for the Models declaration and renders nothing without it, exactly like a General preference row waiting for `settings.general.item`. The slot catalog generator picks the new key up automatically (`pnpm run gen-client-catalog`), so inventory stays generated rather than hand-maintained.
