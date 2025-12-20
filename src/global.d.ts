declare interface JQuery {
  localize(): () => any;
}

declare module 'jquery-i18next' {
  export function init( ...args: any[] ): any;
}

// Vite环境变量类型声明
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}