# Archive

This folder keeps legacy page snapshots that are no longer part of the active build.

## What belongs here

- Old `src/pages` files kept for reference during refactors.
- Backup page implementations that should not stay in the live route tree.

## What does not belong here

- Active route entries.
- Reusable components or services that are still imported by the app.

## Current convention

- The canonical page structure lives in `src/pages/`.
- Folder-based pages such as `step-1/ui.tsx` and `step-1/logic.ts` are the preferred pattern.
- Anything archived here should be treated as reference material and can be removed later once it is no longer useful.
