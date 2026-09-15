// Entry point. Keep this file a manifest: one import and one call per
// module. Feature code lives in src/modules/<name>.ts and exports an init
// function that no-ops when its selector is absent from the page.
import { initEnvironmentSwitcher } from './modules/environment-switcher';

function boot() {
  try {
    initEnvironmentSwitcher();
    // Add project feature initializers here.
  } finally {
    // Always release the pre-paint scroll lock set by loader.html, even if
    // a feature throws. The head snippet also has a fallback timeout.
    document.documentElement.classList.remove('is-loading');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
