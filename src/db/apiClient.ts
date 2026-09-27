// لایه ارتباط با سرور محلی کارگاه — جایگزین دسترسی مستقیم به IndexedDB
const configuredBase = import.meta.env.VITE_API_URL as string | undefined;

export const apiBaseUrl = (configuredBase?.replace(/\/$/, '') ?? '') + '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  if (!response.ok) {
    let message = `خطای سرور (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // پاسخ JSON نبود
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

class FilteredCollection<T> {
  constructor(private readonly table: string, private readonly where: string, private readonly equals: string) {}

  toArray(): Promise<T[]> {
    return request<T[]>(`/${this.table}${query({ where: this.where, equals: this.equals })}`);
  }

  async first(): Promise<T | undefined> {
    const rows = await this.toArray();
    return rows[0];
  }

  async count(): Promise<number> {
    const result = await request<{ count: number }>(
      `/${this.table}/count${query({ where: this.where, equals: this.equals })}`
    );
    return result.count;
  }
}

class SortedCollection<T> {
  constructor(private readonly table: string, private readonly orderBy: string, private readonly desc = false) {}

  reverse(): SortedCollection<T> {
    return new SortedCollection<T>(this.table, this.orderBy, !this.desc);
  }

  toArray(): Promise<T[]> {
    return request<T[]>(`/${this.table}${query({ orderBy: this.orderBy, desc: this.desc ? '1' : undefined })}`);
  }
}

/** یک جدول روی سرور، با همان امضای متدهایی که کد فعلی از Dexie استفاده می‌کند */
export class RemoteTable<T extends { id?: number }> {
  constructor(private readonly name: string) {}

  toArray(): Promise<T[]> {
    return request<T[]>(`/${this.name}`);
  }

  async get(id: number): Promise<T | undefined> {
    try {
      return await request<T>(`/${this.name}/${id}`);
    } catch {
      return undefined;
    }
  }

  async add(row: Omit<T, 'id'> | T): Promise<number> {
    const result = await request<{ id: number }>(`/${this.name}`, {
      method: 'POST',
      body: JSON.stringify(row),
    });
    return result.id;
  }

  async update(id: number, changes: Partial<T>): Promise<number> {
    const result = await request<{ updated: number }>(`/${this.name}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    });
    return result.updated;
  }

  async delete(id: number): Promise<void> {
    await request<{ deleted: number }>(`/${this.name}/${id}`, { method: 'DELETE' });
  }

  async count(): Promise<number> {
    const result = await request<{ count: number }>(`/${this.name}/count`);
    return result.count;
  }

  where(column: string) {
    return {
      equals: (value: string | number) => new FilteredCollection<T>(this.name, column, String(value)),
    };
  }

  orderBy(column: string): SortedCollection<T> {
    return new SortedCollection<T>(this.name, column);
  }
}

export type BackupPayload = Record<string, unknown[]>;

export async function serverIsReachable(): Promise<boolean> {
  try {
    await request<{ ok: boolean }>('/health');
    return true;
  } catch {
    return false;
  }
}

export function exportFromServer(): Promise<{ exportedAt: string; tables: BackupPayload }> {
  return request<{ exportedAt: string; tables: BackupPayload }>('/_export');
}

export function importToServer(
  tables: BackupPayload,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ imported: Record<string, number> }> {
  return request<{ imported: Record<string, number> }>('/_import', {
    method: 'POST',
    body: JSON.stringify({ tables, mode }),
  });
}
