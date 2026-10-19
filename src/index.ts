// Entry point. Keep this file a manifest: one run() call per module.
// Feature code lives in src/modules/<name>.ts and exports an init
// function that no-ops when its selector is absent from the page.
import { initAriaRoles } from './modules/aria-roles';
import { initEnvironmentSwitcher } from './modules/environment-switcher';
import { initPlaceholders } from './modules/placeholders';
import { initUniqueFormIds } from './modules/unique-form-ids';

// Each module runs in isolation: one that throws is logged and skipped,
// and every module after it still initializes.
function run(name: string, init: () => void) {
  try {
    init();
  } catch (error) {
    console.error(`[wfc] ${name} failed to initialize`, error);
  }
}

function boot() {
  // Release the pre-paint scroll lock set by loader.html first, before any
  // module measures the page — smooth-scroll libraries such as Lenis read
  // the scroll height at init and get ~0 while body is still locked. The
  // head snippet also has a fallback timeout.
  document.documentElement.classList.remove('is-loading');

  run('environment-switcher', initEnvironmentSwitcher);
  // Starter fixes for markup Webflow publishes (conventions.md §9–11).
  run('aria-roles', initAriaRoles);
  run('placeholders', initPlaceholders);
  run('unique-form-ids', initUniqueFormIds);
  // Add project feature initializers here: run('<name>', init<Name>);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
