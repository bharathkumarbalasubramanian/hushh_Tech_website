import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Keeps onboarding pages truly mobile-responsive by reserving the exact amount
 * of scroll space needed for the fixed bottom CTA/footer.
 *
 * Why: Most onboarding screens use a fixed footer (`[data-onboarding-footer]`),
 * but footer height varies per step. We measure it and set a CSS variable on
 * `.onboarding-shell` so the scrollable `main` never gets covered on small screens.
 */
export default function OnboardingShellAutoPadding() {
  const { pathname } = useLocation();
  const isOnboardingSurface = pathname.startsWith('/onboarding') || pathname === '/investor-guide';

  useEffect(() => {
    document.documentElement.classList.toggle('onboarding-html', isOnboardingSurface);
    document.body.classList.toggle('onboarding-body', isOnboardingSurface);

    return () => {
      document.documentElement.classList.remove('onboarding-html');
      document.body.classList.remove('onboarding-body');
    };
  }, [isOnboardingSurface]);

  useEffect(() => {
    let rafId: number | null = null;
    let timeoutId: number | null = null;
    const resizeObservers: ResizeObserver[] = [];
    const windowResizeHandlers: Array<() => void> = [];

    const applyForShell = (shell: HTMLElement) => {
      const footer = shell.querySelector<HTMLElement>('[data-onboarding-footer]');
      if (!footer) {
        // Fallback is defined in CSS; remove any stale per-shell override.
        shell.style.removeProperty('--onboarding-footer-space');
        return;
      }

      const update = () => {
        const rect = footer.getBoundingClientRect();
        // Avoid setting invalid values (e.g. during unmount).
        const h = Math.max(0, Math.ceil(rect.height));
        if (h > 0) {
          shell.style.setProperty('--onboarding-footer-space', `${h}px`);
        }
      };

      update();

      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => update());
        ro.observe(footer);
        resizeObservers.push(ro);
      }

      // Some layout changes (orientation, zoom) won't always trigger ResizeObserver reliably.
      const onResize = () => update();
      window.addEventListener('resize', onResize, { passive: true });
      windowResizeHandlers.push(() => window.removeEventListener('resize', onResize));
    };

    const run = () => {
      const shells = Array.from(document.querySelectorAll<HTMLElement>('.onboarding-shell'));
      shells.forEach(applyForShell);
    };

    // Run after paint so measured sizes are accurate.
    rafId = window.requestAnimationFrame(run);
    // Run once more after layout settles (fonts, async content).
    timeoutId = window.setTimeout(run, 250);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      resizeObservers.forEach((ro) => ro.disconnect());
      windowResizeHandlers.forEach((cleanup) => cleanup());
    };
  }, [pathname]);

  return null;
}

