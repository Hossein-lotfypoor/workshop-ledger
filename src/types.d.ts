// src/types.d.ts
import { Moment } from 'moment';

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