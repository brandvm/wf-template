export {};

declare global {
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
