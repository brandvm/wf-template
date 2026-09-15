export {};

declare global {
  interface Window {
    BV?: {
      staging: boolean;
      dev: boolean;
      devBase: string;
      stag: string;
      // Set before script execution, including when a fallback URL is used.
      source?: string;
    };
    Webflow?: { env?: (mode: string) => boolean };
  }
}
