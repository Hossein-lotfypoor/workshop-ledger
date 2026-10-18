// src/types.d.ts
import { Moment } from 'moment';

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

declare module 'moment-jalaali' {
  import moment = require('moment');
  export = moment;
}

declare module 'moment' {
  interface Moment {
    loadPersian(options?: { dialect?: string }): void;
    format(format: string): string;
    isValid(): boolean;
  }
}