/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOW_PRIVATE_MODULES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
