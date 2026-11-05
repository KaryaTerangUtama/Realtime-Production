import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api, MastersData } from './services/api';
import { User, RitaseRecord, AuditLog, McrRecord } from './types';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { FormInputRitase } from './components/FormInputRitase';
import { FormInputMcr } from './components/FormInputMcr';
import { TableDataRitase } from './components/TableDataRitase';
import { MasterData } from './components/MasterData';
import { UserManagement } from './components/UserManagement';

import { ExportData } from './components/ExportData';
import { AuditLogModal } from './components/AuditLogModal';
import { LoginModal } from './components/LoginModal';
import { InstallPrompt } from './components/InstallPrompt';
import { APP_CLIENT_VERSION, forceUpdateApp } from './services/versionManager';


export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('ktu_checker_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [ritaseList, setRitaseList] = useState<RitaseRecord[]>([]);
  const [mcrRecords, setMcrRecords] = useState<McrRecord[]>([]);
  const [masters, setMasters] = useState<MastersData>({
    diggers: [],
    haulers: [],
    checkers: [],
    materials: [],
    locations: [],
    job_categories: []
  });
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ktu_checker_user');
      return !saved;
    } catch {
      return true;
    }
  });
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);

  // Fetch all initial server data
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      let ritaseData = await api.getRitase();
      const mastersData = await api.getMasters();
      const usersData = await api.getUsers();
      try {
        const mcrData = await api.getMcrRecords();
        setMcrRecords(mcrData);
      } catch (e) {
        console.error('Failed to load MCR records:', e);
      }

      // Clear old local backup if server ritase is empty or reset
      if (ritaseData.length === 0) {
        localStorage.removeItem('ktu_ritase_backup');
      } else {
        const localBackupRaw = localStorage.getItem('ktu_ritase_backup');
        if (localBackupRaw) {
          try {
            const localBackup: RitaseRecord[] = JSON.parse(localBackupRaw);
            if (localBackup && localBackup.length > 0) {
              const serverIds = new Set(ritaseData.map(r => r.id));
              const missingRecords = localBackup.filter(r => !serverIds.has(r.id));
              if (missingRecords.length > 0) {
                console.log(`Restoring ${missingRecords.length} backup records from localStorage to server...`);
                for (const rec of missingRecords) {
                  try {
                    await api.createRitase(rec);
                  } catch (e) {
                    // ignore
                  }
                }
                ritaseData = await api.getRitase();
              }
            }
          } catch (e) {
            console.error('Error parsing local ritase backup:', e);
          }
        }
      }

      setRitaseList(ritaseData);
      localStorage.setItem('ktu_ritase_backup', JSON.stringify(ritaseData));

      setMasters(mastersData);
      setUsers(usersData);

      // Verify current user still exists
      if (currentUser) {
        const found = usersData.find((u) => u.id === currentUser.id);
        if (found) {
          if (found.status === 'INACTIVE') {
            alert('Akun Anda telah dinonaktifkan oleh Administrator.');
            handleLogout();
          } else {
            setCurrentUser(found);
            localStorage.setItem('ktu_checker_user', JSON.stringify(found));
          }
        } else {
          handleLogout();
        }
      } else {
        setShowLoginModal(true);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUser]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, []);

  // Setup Server-Sent Events (SSE) for Real-Time synchronization across all users/devices
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.addEventListener('connected', (event) => {
          setIsConnected(true);
          try {
            if (event.data) {
              const info = JSON.parse(event.data);
              if (info.version && info.version !== APP_CLIENT_VERSION) {
                console.log(`[App] Server version ${info.version} differs from client ${APP_CLIENT_VERSION}. Auto-updating...`);
                forceUpdateApp(true);
              }
            }
          } catch (e) {}
        });

        // Real-time broadcast version update across all devices
        eventSource.addEventListener('app_version_update', (event) => {
          try {
            const info = JSON.parse(event.data);
            console.log('[App] Received broadcast update signal from server:', info);
            forceUpdateApp(false);
          } catch (e) {
            forceUpdateApp(false);
          }
        });

        // Real-time ritase created
        eventSource.addEventListener('ritase_created', (event) => {
          try {
            const newRecord: RitaseRecord = JSON.parse(event.data);
            setRitaseList((prev) => {
              if (prev.some((r) => r.id === newRecord.id)) return prev;
              return [newRecord, ...prev];
            });
          } catch (e) {
            console.error('Error parsing SSE ritase_created:', e);
          }
        });

        // Real-time ritase updated
        eventSource.addEventListener('ritase_updated', (event) => {
          try {
            const updatedRecord: RitaseRecord = JSON.parse(event.data);
            setRitaseList((prev) =>
              prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
            );
          } catch (e) {
            console.error('Error parsing SSE ritase_updated:', e);
          }
        });

        // Real-time ritase deleted
        eventSource.addEventListener('ritase_deleted', (event) => {
          try {
            const { id } = JSON.parse(event.data);
            setRitaseList((prev) => prev.filter((r) => r.id !== id));
          } catch (e) {
            console.error('Error parsing SSE ritase_deleted:', e);
          }
        });

        // Real-time ritase reset
        eventSource.addEventListener('ritase_reset', () => {
          setRitaseList([]);
          localStorage.removeItem('ktu_ritase_backup');
        });

        // Real-time master data updated
        eventSource.addEventListener('master_updated', () => {
          api.getMasters().then(setMasters).catch(console.error);
        });

        // Real-time user updated
        eventSource.addEventListener('user_updated', () => {
          api.getUsers().then(setUsers).catch(console.error);
        });

        // Real-time MCR data updated
        eventSource.addEventListener('mcr_updated', () => {
          api.getMcrRecords().then(setMcrRecords).catch(console.error);
        });

        eventSource.onerror = () => {
          setIsConnected(false);
          eventSource?.close();
          // Try reconnect after 4 seconds
          clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        setIsConnected(false);
      }
    };

    connectSSE();

    return () => {
      clearTimeout(reconnectTimeout);
      eventSource?.close();
    };
  }, []);

  // Auth handlers
  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await api.login(username, password);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        localStorage.setItem('ktu_checker_user', JSON.stringify(res.user));
        setShowLoginModal(false);
        if (res.user.role === 'CHECKER') {
          setActiveTab('input_ritase');
        } else {
          setActiveTab('dashboard');
        }
        return true;
      }
      return false;
    } catch (err) {
      throw err;
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ktu_checker_user');
    setShowLoginModal(true);
    setActiveTab('dashboard');
  };

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('ktu_checker_user', JSON.stringify(user));
    if (user.role === 'CHECKER') {
      setActiveTab('input_ritase');
    } else {
      setActiveTab('dashboard');
    }
  };

  // Ritase operations
  const handleCreateRitase = async (record: Partial<RitaseRecord>): Promise<boolean> => {
    const res = await api.createRitase(record);
    if (res.success && res.record) {
      setRitaseList((prev) => {
        if (prev.some((r) => r.id === res.record.id)) return prev;
        const next = [res.record, ...prev];
        localStorage.setItem('ktu_ritase_backup', JSON.stringify(next));
        return next;
      });
      return true;
    }
    return false;
  };

  const handleUpdateRitase = async (id: string, record: Partial<RitaseRecord>): Promise<boolean> => {
    const res = await api.updateRitase(id, {
      ...record,
      updated_by: currentUser?.name || 'Admin',
      user_id: currentUser?.id
    });
    if (res.success && res.record) {
      setRitaseList((prev) => {
        const next = prev.map((r) => (r.id === id ? res.record : r));
        localStorage.setItem('ktu_ritase_backup', JSON.stringify(next));
        return next;
      });
      return true;
    }
    return false;
  };

  const handleDeleteRitase = async (id: string): Promise<boolean> => {
    const res = await api.deleteRitase(id, currentUser?.id || 'UNKNOWN', currentUser?.name || 'Admin');
    if (res.success) {
      setRitaseList((prev) => {
        const next = prev.filter((r) => r.id !== id);
        localStorage.setItem('ktu_ritase_backup', JSON.stringify(next));
        return next;
      });
      return true;
    }
    return false;
  };

  const handleResetAllRitase = async (): Promise<void> => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      alert('Hanya Administrator yang dapat mereset data ritase.');
      return;
    }
    const confirmText = prompt('PERHATIAN! Tindakan ini akan menghapus SELURUH data ritase yang sudah terinput di sistem secara permanen.\n\nKetik "RESET" untuk mengonfirmasi:');
    if (confirmText !== 'RESET') {
      alert('Konfirmasi salah. Pembatalan reset data.');
      return;
    }

    try {
      await api.resetRitase(currentUser.id, currentUser.name);
      setRitaseList([]);
      localStorage.removeItem('ktu_ritase_backup');
      alert('Seluruh data ritase berhasil direset.');
    } catch (err: any) {
      alert(err.message || 'Gagal mereset data ritase');
    }
  };

  // Master operations
  const handleCreateMaster = async (type: string, payload: any): Promise<boolean> => {
    const res = await api.createMaster(type, payload);
    if (res.success) {
      const refreshed = await api.getMasters();
      setMasters(refreshed);
      return true;
    }
    return false;
  };

  const handleUpdateMaster = async (type: string, id: string, payload: any): Promise<boolean> => {
    const res = await api.updateMaster(type, id, payload);
    if (res.success) {
      const refreshed = await api.getMasters();
      setMasters(refreshed);
      return true;
    }
    return false;
  };

  const handleDeleteMaster = async (type: string, id: string): Promise<boolean> => {
    const res = await api.deleteMaster(type, id, currentUser?.id || 'SYSTEM', currentUser?.name || 'Admin');
    if (res.success) {
      const refreshed = await api.getMasters();
      setMasters(refreshed);
      return true;
    }
    return false;
  };

  // User management operations
  const handleCreateUser = async (payload: any): Promise<boolean> => {
    const res = await api.createUser(payload);
    if (res.success) {
      const refreshed = await api.getUsers();
      setUsers(refreshed);
      return true;
    }
    return false;
  };

  const handleUpdateUser = async (id: string, payload: any): Promise<boolean> => {
    const res = await api.updateUser(id, payload);
    if (res.success) {
      const refreshed = await api.getUsers();
      setUsers(refreshed);
      return true;
    }
    return false;
  };

  const handleDeleteUser = async (id: string): Promise<boolean> => {
    const res = await api.deleteUser(id, currentUser?.id || 'SYSTEM', currentUser?.name || 'Admin');
    if (res.success) {
      const refreshed = await api.getUsers();
      setUsers(refreshed);
      return true;
    }
    return false;
  };

  const handleOpenAuditLogs = async () => {
    try {
      const logs = await api.getAuditLogs();
      setAuditLogs(logs);
      setShowAuditModal(true);
    } catch (e) {
      alert('Gagal memuat log audit');
    }
  };

  // Count ritase today
  const ritaseCountToday = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return ritaseList.filter((r) => r.tanggal === todayStr).length;
  }, [ritaseList]);

  return (
    <div className="min-h-screen bg-[#F6F1E8] flex flex-col selection:bg-[#7b1113] selection:text-white">
      {/* Top Main Header */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        isConnected={isConnected}
        onOpenAuditLogs={handleOpenAuditLogs}
        onRefreshData={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={currentUser?.role}
        ritaseCountToday={ritaseCountToday}
        mcrRecordCount={mcrRecords.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            ritaseList={ritaseList}
            mcrRecords={mcrRecords}
            masters={masters}
            onNavigateToInput={() => setActiveTab('input_ritase')}
            onNavigateToMcr={() => setActiveTab('input_mcr')}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'input_ritase' && (
          <FormInputRitase
            masters={masters}
            currentUser={currentUser}
            ritaseList={ritaseList}
            onSubmit={handleCreateRitase}
            onSuccessNavigate={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'input_mcr' && (
          <FormInputMcr
            currentUser={currentUser}
            mcrRecords={mcrRecords}
            onRefreshMcr={async () => {
              const data = await api.getMcrRecords();
              setMcrRecords(data);
            }}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'data_ritase' && (
          <TableDataRitase
            ritaseList={ritaseList}
            currentUser={currentUser}
            masters={masters}
            onUpdateRitase={handleUpdateRitase}
            onDeleteRitase={handleDeleteRitase}
            onNavigateToExport={() => setActiveTab('export_data')}
          />
        )}

        {activeTab === 'master_data' && currentUser?.role === 'ADMIN' && (
          <MasterData
            masters={masters}
            currentUser={currentUser}
            onCreateMaster={handleCreateMaster}
            onUpdateMaster={handleUpdateMaster}
            onDeleteMaster={handleDeleteMaster}
          />
        )}

        {activeTab === 'user_management' && currentUser?.role === 'ADMIN' && (
          <UserManagement
            users={users}
            currentUser={currentUser}
            onCreateUser={handleCreateUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onResetRitase={handleResetAllRitase}
            ritaseCount={ritaseList.length}
          />
        )}



        {activeTab === 'export_data' && (
          <ExportData ritaseList={ritaseList} masters={masters} />
        )}
      </main>

      {/* Footer (Low-transparency, Hitam-Cream-Maroon Theme) */}
      <footer className="bg-[#FAF7F2] border-t-2 border-[#E2D7C5] mt-auto py-6 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-600">
          <div className="flex items-center gap-3">
            <div>
              <span className="font-black text-[#181A1F] tracking-wide">PT. KARYA TERANG UTAMA</span>
              <span className="mx-2 text-stone-400">&bull;</span>
              <span className="font-semibold text-stone-600">Sistem Checker Ritase Tambang Versi 2.4.0</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EDE4D5] border border-[#D6C7B2] text-[#181A1F]">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Database Backend Permanen Aktif
            </span>
            <span className="text-stone-400">&bull;</span>
            <span className="text-stone-600">Multi-User Sync (SSE)</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showLoginModal && (
        <LoginModal
          onLogin={handleLogin}
          onDirectSelectUser={handleSwitchUser}
          availableUsers={users}
        />
      )}

      {showAuditModal && (
        <AuditLogModal
          isOpen={showAuditModal}
          onClose={() => setShowAuditModal(false)}
          logs={auditLogs}
        />
      )}

      <InstallPrompt />
    </div>
  );
}
