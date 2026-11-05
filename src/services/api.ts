import { RitaseRecord, User, MasterDigger, MasterHauler, MasterChecker, MasterMaterial, MasterLocation, MasterJobCategory, AuditLog, McrRecord } from '../types';
import { saveOfflineRitase, getOfflineRitaseQueue, removeOfflineRitaseItem } from './offlineDB';

export const syncOfflineQueue = async () => {
  if (!navigator.onLine) return;
  try {
    const queue = await getOfflineRitaseQueue();
    if (queue.length === 0) return;
    let syncedCount = 0;
    for (const item of queue) {
      try {
        const { localId, createdAtOffline, ...payload } = item;
        const res = await fetch('/api/ritase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          await removeOfflineRitaseItem(localId);
          syncedCount++;
        }
      } catch (err) {
        // individual sync failed
      }
    }
    if (syncedCount > 0) {
      console.log(`Synced ${syncedCount} offline ritase records to server.`);
    }
  } catch (err) {
    console.error('Error syncing offline queue:', err);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineQueue();
  });
  window.addEventListener('load', async () => {
    syncOfflineQueue();
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered:', reg);
        reg.update().catch(() => {});
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'TRIGGER_OFFLINE_SYNC') {
            syncOfflineQueue();
          }
        });
      } catch (err) {
        console.error('SW registration failed:', err);
      }
    }
  });
}

async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if ('sync' in reg) {
        await (reg as any).sync.register('sync-ritase');
      }
    } catch (err) {
      // background sync not supported/allowed
    }
  }
}

export interface MastersData {
  diggers: MasterDigger[];
  haulers: MasterHauler[];
  checkers: MasterChecker[];
  materials: MasterMaterial[];
  locations: MasterLocation[];
  job_categories: MasterJobCategory[];
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ success: boolean; user: User }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal login');
    return data;
  },

  // Users
  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Gagal memuat data user');
    return res.json();
  },

  async createUser(payload: any): Promise<any> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menambah user');
    return data;
  },

  async updateUser(id: string, payload: any): Promise<any> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memperbarui user');
    return data;
  },

  async deleteUser(id: string, adminUserId: string, adminUserName: string): Promise<any> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUserId, adminUserName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus user');
    return data;
  },

  // Masters
  async getMasters(): Promise<MastersData> {
    const res = await fetch('/api/masters');
    if (!res.ok) throw new Error('Gagal memuat master data');
    return res.json();
  },

  async createMaster(type: string, payload: any): Promise<any> {
    const res = await fetch(`/api/masters/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menambah master data');
    return data;
  },

  async updateMaster(type: string, id: string, payload: any): Promise<any> {
    const res = await fetch(`/api/masters/${type}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memperbarui master data');
    return data;
  },

  async deleteMaster(type: string, id: string, adminUserId: string, adminUserName: string): Promise<any> {
    const res = await fetch(`/api/masters/${type}/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUserId, adminUserName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus master data');
    return data;
  },

  // Ritase
  async getRitase(params?: Record<string, string>): Promise<RitaseRecord[]> {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/ritase${query ? `?${query}` : ''}`);
    if (!res.ok) throw new Error('Gagal memuat data ritase');
    return res.json();
  },

  async getRitaseById(id: string): Promise<RitaseRecord> {
    const res = await fetch(`/api/ritase/${id}`);
    if (!res.ok) throw new Error('Data ritase tidak ditemukan');
    return res.json();
  },

  async createRitase(record: Partial<RitaseRecord>): Promise<{ success: boolean; message: string; record: RitaseRecord }> {
    if (!navigator.onLine) {
      await saveOfflineRitase(record);
      await registerBackgroundSync();
      return {
        success: true,
        message: 'Perangkat offline. Data ritase disimpan secara lokal (IndexedDB) dan akan disinkronkan saat online.',
        record: { ...record, id: `OFFLINE-${Date.now()}` } as RitaseRecord
      };
    }

    try {
      const res = await fetch('/api/ritase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan ritase');
      return data;
    } catch (err) {
      await saveOfflineRitase(record);
      await registerBackgroundSync();
      return {
        success: true,
        message: 'Koneksi gagal. Data ritase disimpan secara lokal (IndexedDB) dan akan disinkronkan saat online.',
        record: { ...record, id: `OFFLINE-${Date.now()}` } as RitaseRecord
      };
    }
  },

  async updateRitase(id: string, record: Partial<RitaseRecord>): Promise<{ success: boolean; message: string; record: RitaseRecord }> {
    const res = await fetch(`/api/ritase/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengupdate ritase');
    return data;
  },

  async resetRitase(user_id: string, user_name: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/ritase', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, user_name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mereset data ritase');
    return data;
  },

  async deleteRitase(id: string, user_id: string, user_name: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/ritase/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, user_name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus ritase');
    return data;
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch('/api/audit-logs');
    if (!res.ok) throw new Error('Gagal memuat audit log');
    return res.json();
  },

  // MCR Query Data
  async getMcrRecords(params?: { job_category?: string; tanggal?: string; shift?: string; search?: string }): Promise<McrRecord[]> {
    const q = new URLSearchParams();
    if (params?.job_category) q.append('job_category', params.job_category);
    if (params?.tanggal) q.append('tanggal', params.tanggal);
    if (params?.shift) q.append('shift', params.shift);
    if (params?.search) q.append('search', params.search);
    const url = `/api/mcr-records${q.toString() ? `?${q.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Gagal memuat data MCR');
    return res.json();
  },

  async saveMcrRecords(records: McrRecord[], replace = true, user_id?: string, user_name?: string): Promise<{ success: boolean; count: number; records: McrRecord[] }> {
    const res = await fetch('/api/mcr-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records, replace, user_id, user_name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan data MCR');
    return data;
  },

  async clearMcrRecords(user_id?: string, user_name?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/mcr-records', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, user_name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mereset data MCR');
    return data;
  },

  async syncMcrToRitase(user_id?: string, user_name?: string): Promise<{ success: boolean; addedCount: number; totalRitase: number }> {
    const res = await fetch('/api/mcr-records/sync-to-ritase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, user_name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal sinkronisasi data MCR');
    return data;
  }
};
