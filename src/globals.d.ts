export {};

declare global {
  // package.json's version (0.0.0 while it has none), replaced at build
  // time by build.mjs. dist/version.json carries it when package.json has one.
  const __WFC_VERSION__: string;

  interface Window {
    WFC?: {
      staging: boolean;
      dev: boolean;
      devBase: string;
      stag: string;
      // The pinned release tag from the head snippet, or null before the
      // first release.
      release: string | null;
      // Base URL production loads from: the jsDelivr tag, or staging while
      // release is null.
      prod: string;
      // Set before script execution, including when a fallback URL is used.
      source?: string;
    };
    Webflow?: { env?: (mode: string) => boolean };
  }
}
