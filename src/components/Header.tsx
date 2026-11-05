import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Eye, LogOut, Clock, WifiOff, History, ChevronDown, RefreshCw, Smartphone, Radio } from 'lucide-react';
import { User } from '../types';
import { APP_CLIENT_VERSION, forceUpdateApp } from '../services/versionManager';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  isConnected: boolean;
  onOpenAuditLogs: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  isConnected,
  onOpenAuditLogs,
  onRefreshData,
  isRefreshing
}) => {
  const [time, setTime] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [showMenu, setShowMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleManualUpdate = async () => {
    setIsUpdating(true);
    await forceUpdateApp();
  };

  const handleBroadcastUpdate = async () => {
    if (!confirm('Kirim perintah pembaruan otomatis ke SEMUA perangkat checker/pengguna yang sedang membuka aplikasi sekarang?')) {
      return;
    }
    setIsBroadcasting(true);
    try {
      const res = await fetch('/api/system/broadcast-update', { method: 'POST' });
      if (res.ok) {
        alert('Perintah pembaruan versi berhasil dikirim ke seluruh perangkat!');
      }
    } catch (e) {
      alert('Gagal mengirim sinyal pembaruan');
    } finally {
      setIsBroadcasting(false);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      );
      setDateStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#7B1113] text-[#FAF7F2] border border-[#580A0B]">
            <ShieldCheck className="w-3 h-3 text-amber-300" /> ADMIN
          </span>
        );
      case 'CHECKER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#1B4332] text-[#E8F5E9] border border-[#2D6A4F]">
            <UserCheck className="w-3 h-3 text-emerald-300" /> CHECKER
          </span>
        );
      case 'PENGAWAS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#7C2D12] text-[#FFEDD5] border border-[#9A3412]">
            <ShieldCheck className="w-3 h-3 text-amber-300" /> PENGAWAS
          </span>
        );
      case 'VIEWER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#1E3A8A] text-[#DBEAFE] border border-[#1D4ED8]">
            <Eye className="w-3 h-3 text-blue-300" /> VIEWER
          </span>
        );
    }
  };

  return (
    <header className="bg-[#14161B] text-[#FAF7F2] shadow-md border-b-4 border-[#7B1113] sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand & Logo PT. KARYA TERANG UTAMA */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 pr-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-[#E5C992] bg-[#1F2229] border border-[#2E323D] px-1.5 py-0.5 rounded truncate">
                  FMS KTU
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                  v{APP_CLIENT_VERSION.split('-')[0]}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-[#D8CEBF] font-medium">
                  {isConnected ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Real-time DB</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-400">
                      <WifiOff className="w-3 h-3" /> Offline
                    </span>
                  )}
                </span>
              </div>

              <h1 className="text-xs sm:text-base md:text-xl font-black tracking-tight text-[#FAF7F2] mt-0.5 truncate">
                FORM CHECKER RITASE
              </h1>
              <p className="text-[10px] sm:text-xs font-bold text-[#E5C992] tracking-wide truncate">
                PT. KARYA TERANG UTAMA
              </p>
            </div>
          </div>

          {/* Right Info & User Controls (Low Transparency, High Comfort) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Clock & Date */}
            <div className="hidden md:flex flex-col items-end justify-center bg-[#1F2229] border border-[#2E323D] px-3.5 py-1.5 rounded-xl text-right">
              <div className="flex items-center gap-1.5 text-xs text-[#D8CEBF] font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="capitalize">{dateStr}</span>
              </div>
              <div className="font-mono text-base font-black tracking-wider text-amber-400">
                {time}
              </div>
            </div>

            {/* Refresh Data button */}
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              title="Refresh Data dari Server"
              className="p-2.5 rounded-xl bg-[#1F2229] hover:bg-[#2A2E38] border border-[#2E323D] text-[#D8CEBF] hover:text-[#FAF7F2] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* Force Update / Sync App Version button */}
            <button
              onClick={handleManualUpdate}
              disabled={isUpdating}
              title={`Versi Saat Ini: ${APP_CLIENT_VERSION}. Klik untuk membersihkan cache dan memuat versi terbaru aplikasi.`}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700 text-xs font-bold text-emerald-300 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Perbarui Versi</span>
            </button>

            {/* Admin Broadcast Update Button */}
            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={handleBroadcastUpdate}
                disabled={isBroadcasting}
                title="Kirim sinyal pembaruan instan ke semua perangkat checker/user yang sedang membuka aplikasi"
                className="hidden lg:flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#2A1718] hover:bg-[#451C1E] border border-[#7B1113] text-xs font-bold text-rose-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Radio className={`w-3.5 h-3.5 text-rose-400 ${isBroadcasting ? 'animate-pulse' : ''}`} />
                <span>Broadcast Update</span>
              </button>
            )}

            {/* Install App Button */}
            <button
              onClick={() => {
                alert('Cara Menginstal Aplikasi FMS KTU:\n\n1. Di Google Chrome / Edge (Desktop/Android):\n   - Klik menu titik tiga (...) di pojok kanan atas browser.\n   - Pilih "Instal Aplikasi FMS..." atau "Tambahkan ke Layar Utama".\n\n2. Di Safari (iPhone/iPad):\n   - Ketuk ikon Bagikan (Share) di bagian bawah.\n   - Pilih "Add to Home Screen" (Tambahkan ke Layar Utama).');
              }}
              title="Instal Aplikasi ke Perangkat"
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] border border-[#580A0B] text-xs font-bold text-amber-300 transition-colors cursor-pointer shadow-xs"
            >
              <Smartphone className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">Instal App</span>
            </button>

            {/* Audit log button for Admin */}
            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={onOpenAuditLogs}
                title="Lihat Log Audit Aktivitas"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1F2229] hover:bg-[#2A2E38] border border-[#2E323D] text-xs font-bold text-[#D8CEBF] hover:text-[#FAF7F2] transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span>Audit Log</span>
              </button>
            )}

            {/* User Profile & Logout */}
            {currentUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2.5 bg-[#1F2229] hover:bg-[#2A2E38] border border-[#2E323D] py-1.5 px-3 rounded-xl cursor-pointer transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#7B1113] border border-[#580A0B] flex items-center justify-center text-[#FAF7F2] font-black text-sm shrink-0">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-bold text-[#FAF7F2] leading-tight flex items-center gap-1.5">
                      {currentUser.name}
                      <ChevronDown className="w-3 h-3 text-[#D8CEBF]" />
                    </div>
                    <div className="mt-1">{getRoleBadge(currentUser.role)}</div>
                  </div>
                </button>

                {/* Dropdown Menu (Solid Cream Card) */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#FAF7F2] text-[#181A1F] rounded-xl shadow-xl border border-[#E2D7C5] py-2 z-50">
                    <div className="px-4 py-2 border-b border-[#E2D7C5] bg-[#F2EBDE]">
                      <div className="text-[10px] font-extrabold text-[#7B1113] uppercase tracking-wider">
                        Akun Sedang Aktif
                      </div>
                      <div className="font-extrabold text-[#181A1F] truncate">{currentUser.name}</div>
                      <div className="text-xs text-stone-600 font-mono">@{currentUser.username}</div>
                      <div className="mt-1.5">{getRoleBadge(currentUser.role)}</div>
                    </div>

                    <div className="p-1 space-y-1">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleManualUpdate();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-emerald-800 hover:bg-emerald-50 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Perbarui Aplikasi (Hapus Cache)</span>
                      </button>

                      {currentUser?.role === 'ADMIN' && (
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            handleBroadcastUpdate();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#7B1113] hover:bg-rose-50 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Radio className="w-3.5 h-3.5 text-[#7B1113]" />
                          <span>Updatekan Semua Device (Broadcast)</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#7B1113] hover:bg-[#F2EBDE] font-bold flex items-center gap-2 transition-colors cursor-pointer border-t border-[#E2D7C5] pt-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Keluar (Logout)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
