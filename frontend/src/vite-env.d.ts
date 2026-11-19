/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute site origin used for canonical/OG URLs (slash-less). */
  readonly VITE_SITE_URL?: string;
  /** Public contact address shown on the contact/legal pages when set. */
  readonly VITE_CONTACT_EMAIL?: string;
  /** Analytics provider script URL; empty/unset disables analytics entirely. */
  readonly VITE_ANALYTICS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
