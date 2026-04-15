/**
 * DevTools guard intentionally disabled.
 *
 * The previous implementation used debugger timing and DOM clearing in
 * production, which can false-positive in Safari/WebKit and blank the app.
 * Keeping this as a no-op preserves the import surface without risking the
 * application boot path.
 */
const initDevToolsGuard = (): void => {};

export default initDevToolsGuard;
