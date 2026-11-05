import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Maximize2,
  Minimize2,
  X,
  Layers,
  Calendar,
  Activity,
  Edit3,
  Check,
  ShieldCheck,
  Lock,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Truck,
  HardHat,
  Award,
  Trophy,
  Zap,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { McrRecord, User } from '../types';
import { KTULogo } from './KTULogo';

interface McrPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDataset: McrRecord[];
  selectedDate: string;
  onChangeDate: (date: string) => void;
  selectedShift: string;
  onChangeShift: (shift: string) => void;
  distinctDates: string[];
  distinctShifts: string[];
  currentUser: User | null;
}

// Default baseline targets per job category if not customized
const DEFAULT_TARGETS: Record<string, number> = {
  'ORE GETTING': 350000,
  'FEEDING': 250000,
  'CATCHING': 250000,
  'SUPPLY JETTY': 220000,
  'STOCK CBX': 150000,
  'SUPPLY ICA': 120000,
  'DIRECT CATCHING': 50000,
  'HAULING ORE': 300000,
  'OVERBURDEN': 100000
};

const getJobCategoryColorTheme = (jobName: string) => {
  const upper = (jobName || '').toUpperCase();
  if (upper.includes('ORE')) {
    return {
      cardBg: 'bg-gradient-to-r from-[#1E1A12] via-[#14120D] to-[#2E2412]',
      border: 'border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)]',
      badge: 'bg-amber-500 text-black font-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.6)]',
      accent: 'text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.9)]',
      bar: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
    };
  } else if (upper.includes('FEEDING')) {
    return {
      cardBg: 'bg-gradient-to-r from-[#12221A] via-[#0F1713] to-[#163022]',
      border: 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.3)]',
      badge: 'bg-emerald-500 text-black font-black border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.6)]',
      accent: 'text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.9)]',
      bar: 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
    };
  } else if (upper.includes('CATCHING')) {
    return {
      cardBg: 'bg-gradient-to-r from-[#12202E] via-[#0E141C] to-[#152B3D]',
      border: 'border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.3)]',
      badge: 'bg-sky-500 text-black font-black border-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.6)]',
      accent: 'text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.9)]',
      bar: 'bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]'
    };
  } else if (upper.includes('SUPPLY')) {
    return {
      cardBg: 'bg-gradient-to-r from-[#20172B] via-[#130F1A] to-[#2B1E3D]',
      border: 'border-indigo-400 shadow-[0_0_25px_rgba(129,140,248,0.3)]',
      badge: 'bg-indigo-500 text-white font-black border-indigo-300 shadow-[0_0_12px_rgba(129,140,248,0.6)]',
      accent: 'text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.9)]',
      bar: 'bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.8)]'
    };
  } else if (upper.includes('STOCK')) {
    return {
      cardBg: 'bg-gradient-to-r from-[#2B171A] via-[#1A0F12] to-[#3D1E22]',
      border: 'border-rose-400 shadow-[0_0_25px_rgba(251,113,133,0.3)]',
      badge: 'bg-rose-500 text-white font-black border-rose-300 shadow-[0_0_12px_rgba(251,113,133,0.6)]',
      accent: 'text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.9)]',
      bar: 'bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.8)]'
    };
  } else {
    return {
      cardBg: 'bg-gradient-to-r from-[#261014] via-[#141215] to-[#3D1217]',
      border: 'border-[#A51C1F] shadow-[0_0_25px_rgba(165,28,31,0.35)]',
      badge: 'bg-[#7B1113] text-amber-300 font-black border-[#A51C1F] shadow-[0_0_12px_rgba(252,211,77,0.5)]',
      accent: 'text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.9)]',
      bar: 'bg-amber-400 shadow-[0_0_12px_rgba(252,211,77,0.8)]'
    };
  }
};

export const McrPresentationModal: React.FC<McrPresentationModalProps> = ({
  isOpen,
  onClose,
  activeDataset,
  selectedDate,
  onChangeDate,
  selectedShift,
  onChangeShift,
  distinctDates,
  distinctShifts,
  currentUser
}) => {
  // Live Clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'JOB' | 'FLEET'>('JOB');

  // Admin Target Overrides (persisted in localStorage)
  const [targetOverrides, setTargetOverrides] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('ktu_job_target_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Inline editing state for Admin
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [tempEditValue, setTempEditValue] = useState<string>('');
  const [showBatchTargetModal, setShowBatchTargetModal] = useState<boolean>(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Sync targets with localStorage updates across tabs/windows
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('ktu_job_target_overrides');
        if (saved) {
          setTargetOverrides(JSON.parse(saved));
        }
      } catch {
        // ignore error
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Handle ESC key to exit
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showBatchTargetModal) {
          setShowBatchTargetModal(false);
        } else if (editingJob) {
          setEditingJob(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showBatchTargetModal, editingJob]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Save Target Handler for Admin
  const handleSaveTarget = (jobName: string, value: number) => {
    if (!isAdmin) return;
    const upper = jobName.trim().toUpperCase();
    const updated = { ...targetOverrides, [upper]: value };
    setTargetOverrides(updated);
    try {
      localStorage.setItem('ktu_job_target_overrides', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to save target override:', e);
    }
    setEditingJob(null);
  };

  // Get effective target for a given job category
  const getEffectiveTarget = (jobName: string): number => {
    const upper = jobName.trim().toUpperCase();
    if (targetOverrides[upper] !== undefined && targetOverrides[upper] > 0) {
      return targetOverrides[upper];
    }
    if (DEFAULT_TARGETS[upper]) {
      return DEFAULT_TARGETS[upper];
    }
    return 100000;
  };

  // Filtered dataset according to selectedDate & selectedShift
  const filteredDataset = useMemo(() => {
    return activeDataset.filter((r) => {
      if (selectedDate !== 'ALL' && (r.tanggal || '').trim().toLowerCase() !== selectedDate.trim().toLowerCase()) {
        return false;
      }
      if (selectedShift !== 'ALL' && (r.shift || '').trim().toUpperCase() !== selectedShift.trim().toUpperCase()) {
        return false;
      }
      return true;
    });
  }, [activeDataset, selectedDate, selectedShift]);

  // Aggregate stats per Job Category
  const summaryPerJobCategory = useMemo(() => {
    const map = new Map<
      string,
      { count: number; totalRitase: number; totalTonase: number; loaders: Set<string> }
    >();

    filteredDataset.forEach((r) => {
      const job = (r.job_category || 'UNASSIGNED').toUpperCase();
      const prev = map.get(job) || {
        count: 0,
        totalRitase: 0,
        totalTonase: 0,
        loaders: new Set<string>()
      };
      prev.count += 1;
      prev.totalRitase += Number(r.ritase) || 0;
      const rowTonase =
        r.total_product_tonase > 0
          ? r.total_product_tonase
          : (Number(r.product) || 0);
      prev.totalTonase += Number(rowTonase) || 0;
      if (r.loader) prev.loaders.add(r.loader);
      map.set(job, prev);
    });

    return Array.from(map.entries())
      .map(([job, stat]) => {
        const target = getEffectiveTarget(job);
        const achievedPercent = target > 0 ? (stat.totalTonase / target) * 100 : 0;
        return {
          job,
          count: stat.count,
          totalRitase: stat.totalRitase,
          totalTonase: Number(stat.totalTonase.toFixed(2)),
          loaderCount: stat.loaders.size,
          avgTonPerRit:
            stat.totalRitase > 0 ? Number((stat.totalTonase / stat.totalRitase).toFixed(2)) : 0,
          target,
          achievedPercent
        };
      })
      .sort((a, b) => b.totalTonase - a.totalTonase);
  }, [filteredDataset, targetOverrides]);

  // 1. SUMMARY DIGGER (LOADER / EXCAVATOR)
  const summaryPerDigger = useMemo(() => {
    const map = new Map<
      string,
      { count: number; totalRitase: number; totalTonase: number; type: string; jobs: Set<string> }
    >();

    filteredDataset.forEach((r) => {
      const digger = (r.loader || '-').trim();
      if (!digger || digger === '-') return;
      const prev = map.get(digger) || {
        count: 0,
        totalRitase: 0,
        totalTonase: 0,
        type: r.type_loader || '',
        jobs: new Set<string>()
      };
      prev.count += 1;
      prev.totalRitase += Number(r.ritase) || 0;
      const rowTonase =
        r.total_product_tonase > 0
          ? r.total_product_tonase
          : (Number(r.product) || 0);
      prev.totalTonase += Number(rowTonase) || 0;
      if (r.type_loader && !prev.type) prev.type = r.type_loader;
      if (r.job_category) prev.jobs.add(r.job_category);
      map.set(digger, prev);
    });

    return Array.from(map.entries())
      .map(([digger, stat]) => ({
        digger,
        type: stat.type,
        count: stat.count,
        totalRitase: stat.totalRitase,
        totalTonase: Number(stat.totalTonase.toFixed(2)),
        avgTonPerRit:
          stat.totalRitase > 0 ? Number((stat.totalTonase / stat.totalRitase).toFixed(2)) : 0,
        jobCount: stat.jobs.size,
        jobs: Array.from(stat.jobs).join(', ')
      }))
      .sort((a, b) => b.totalTonase - a.totalTonase);
  }, [filteredDataset]);

  // 2. SUMMARY HAULER (DUMP TRUCK / DT)
  const summaryPerHauler = useMemo(() => {
    const map = new Map<
      string,
      { count: number; totalRitase: number; totalTonase: number; type: string; loaders: Set<string> }
    >();

    filteredDataset.forEach((r) => {
      const hauler = (r.hauler || '-').trim();
      if (!hauler || hauler === '-') return;
      const prev = map.get(hauler) || {
        count: 0,
        totalRitase: 0,
        totalTonase: 0,
        type: r.type_hauler || '',
        loaders: new Set<string>()
      };
      prev.count += 1;
      prev.totalRitase += Number(r.ritase) || 0;
      const rowTonase =
        r.total_product_tonase > 0
          ? r.total_product_tonase
          : (Number(r.product) || 0);
      prev.totalTonase += Number(rowTonase) || 0;
      if (r.type_hauler && !prev.type) prev.type = r.type_hauler;
      if (r.loader) prev.loaders.add(r.loader);
      map.set(hauler, prev);
    });

    return Array.from(map.entries())
      .map(([hauler, stat]) => ({
        hauler,
        type: stat.type,
        count: stat.count,
        totalRitase: stat.totalRitase,
        totalTonase: Number(stat.totalTonase.toFixed(2)),
        avgTonPerRit:
          stat.totalRitase > 0 ? Number((stat.totalTonase / stat.totalRitase).toFixed(2)) : 0,
        loaderCount: stat.loaders.size
      }))
      .sort((a, b) => b.totalTonase - a.totalTonase);
  }, [filteredDataset]);

  const totalTonnageAll = useMemo(() => {
    return summaryPerJobCategory.reduce((acc, curr) => acc + curr.totalTonase, 0);
  }, [summaryPerJobCategory]);

  const totalTargetAll = useMemo(() => {
    return summaryPerJobCategory.reduce((acc, curr) => acc + curr.target, 0);
  }, [summaryPerJobCategory]);

  const overallAchievedPercent = totalTargetAll > 0 ? (totalTonnageAll / totalTargetAll) * 100 : 0;

  const totalRitaseAll = useMemo(() => {
    return summaryPerJobCategory.reduce((acc, curr) => acc + curr.totalRitase, 0);
  }, [summaryPerJobCategory]);

  const avgTonPerRitAll = totalRitaseAll > 0 ? (totalTonnageAll / totalRitaseAll).toFixed(2) : '0.00';

  // Live Time Strings
  const timeString = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const dateString = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Current operational shift indicator based on current hour
  const currentLiveShift = useMemo(() => {
    const hour = currentTime.getHours();
    return hour >= 7 && hour < 19 ? 'SHIFT 1 (DAY)' : 'SHIFT 2 (NIGHT)';
  }, [currentTime]);

  // Parameter Color Logic:
  // >= 80%: Hijau
  // 50% - 79.9%: Kuning
  // < 50%: Merah
  const getParamStatus = (pct: number) => {
    if (pct >= 80) {
      return {
        level: 'HIJAU',
        label: 'Optimal (≥80%)',
        badge: 'bg-emerald-600 text-white border border-emerald-400',
        bar: 'bg-emerald-500',
        text: 'text-emerald-700',
        cardBorder: 'border-emerald-300 hover:border-emerald-500',
        cardBg: 'bg-gradient-to-b from-[#FAF7F2] to-[#F1F9F3]',
        icon: CheckCircle2
      };
    }
    if (pct >= 50) {
      return {
        level: 'KUNING',
        label: 'Perhatian (50-80%)',
        badge: 'bg-amber-500 text-stone-950 border border-amber-600',
        bar: 'bg-amber-500',
        text: 'text-amber-800',
        cardBorder: 'border-amber-300 hover:border-amber-500',
        cardBg: 'bg-gradient-to-b from-[#FAF7F2] to-[#FDF8ED]',
        icon: AlertTriangle
      };
    }
    return {
      level: 'MERAH',
      label: 'Kritis (<50%)',
      badge: 'bg-[#7B1113] text-white border border-[#A51C1F]',
      bar: 'bg-[#7B1113]',
      text: 'text-[#7B1113]',
      cardBorder: 'border-rose-300 hover:border-[#7B1113]',
      cardBg: 'bg-gradient-to-b from-[#FAF7F2] to-[#FDF1F1]',
      icon: Flame
    };
  };

  const overallParam = getParamStatus(overallAchievedPercent);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#F4EFE6] text-[#181A1F] h-screen max-h-screen overflow-hidden flex flex-col font-sans select-none selection:bg-[#7B1113] selection:text-white p-3 sm:p-4">
      {/* 1. TOP HEADER BAR */}
      <header className="shrink-0 bg-white rounded-2xl border border-[#E2D7C5] px-4 py-2 flex items-center justify-between gap-3 shadow-xs mb-2.5">
        {/* Left: Branding */}
        <div className="flex items-center gap-2.5">
          <KTULogo className="h-8 w-auto rounded border border-[#D6C7B2]" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black tracking-wider uppercase text-[#7B1113]">
                PT. KARYA TERANG UTAMA
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#14161B] text-amber-300">
                <Activity className="w-2.5 h-2.5 text-emerald-400 animate-pulse" /> MODE PRESENT MCR
              </span>
            </div>
            <h1 className="text-xs sm:text-sm font-black text-[#14161B] tracking-tight">
              MONITORING PENCAPAIAN TONASE & FLEET CONTROL
            </h1>
          </div>
        </div>

        {/* Center: View Switcher (Job Category vs Fleet Digger & Hauler) & Filters */}
        <div className="flex items-center gap-2">
          {/* View Switcher Buttons */}
          <div className="flex items-center bg-[#14161B] p-0.5 rounded-xl border border-stone-800 shadow-xs">
            <button
              onClick={() => setActiveView('JOB')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'JOB'
                  ? 'bg-[#7B1113] text-amber-300 shadow-sm'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Job Category</span>
            </button>
            <button
              onClick={() => setActiveView('FLEET')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'FLEET'
                  ? 'bg-[#7B1113] text-amber-300 shadow-sm'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Digger & Hauler</span>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded-full font-mono">
                {summaryPerDigger.length + summaryPerHauler.length}
              </span>
            </button>
          </div>

          {/* Shift Filter */}
          <div className="flex items-center gap-0.5 bg-[#FAF7F2] p-0.5 rounded-lg border border-[#D6C7B2]">
            <span className="text-[10px] font-bold text-stone-500 px-1.5 uppercase">Shift:</span>
            {(['ALL', 'DAY', 'NIGHT'] as const).map((sh) => (
              <button
                key={sh}
                onClick={() => onChangeShift(sh)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-black transition-all cursor-pointer ${
                  selectedShift === sh
                    ? 'bg-[#7B1113] text-amber-300 shadow-xs'
                    : 'text-stone-700 hover:text-[#7B1113]'
                }`}
              >
                {sh === 'ALL' ? 'SEMUA' : sh}
              </button>
            ))}
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-1 bg-[#FAF7F2] px-2 py-0.5 rounded-lg border border-[#D6C7B2]">
            <Calendar className="w-3.5 h-3.5 text-[#7B1113]" />
            <select
              value={selectedDate}
              onChange={(e) => onChangeDate(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-[#181A1F] focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">Semua Tanggal MCR</option>
              {distinctDates.map((d) => (
                <option key={d} value={d}>
                  Tanggal {d}
                </option>
              ))}
            </select>
          </div>

          {/* Admin Target Manager Button */}
          {isAdmin && (
            <button
              onClick={() => setShowBatchTargetModal(true)}
              className="px-2 py-1 rounded-lg bg-[#FAF7F2] hover:bg-[#EDE4D5] text-[#7B1113] border border-[#7B1113]/30 text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              title="Kelola Target (Admin)"
            >
              <SlidersHorizontal className="w-3 h-3 text-[#7B1113]" />
              <span className="hidden xl:inline">Target</span>
            </button>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <span className="hidden 2xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Admin
            </span>
          ) : (
            <span className="hidden 2xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-200 text-stone-700 border border-stone-300">
              <Lock className="w-3 h-3 text-stone-500" /> Viewer
            </span>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-white hover:bg-[#FAF7F2] text-stone-700 border border-[#D6C7B2] transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] text-amber-200 border border-[#A51C1F] transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs"
            title="Keluar (ESC)"
          >
            <X className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* 2. HERO / JAM BESAR (JUMBO) & KPI BAR (~120px) */}
      <section className="shrink-0 bg-gradient-to-r from-[#14161B] via-[#241014] to-[#7B1113] text-white rounded-3xl p-3.5 sm:p-4 shadow-lg border border-[#5E0B0C] flex flex-col lg:flex-row items-center justify-between gap-3 mb-2.5">
        {/* JAM BESAR DIGITAL JUMBO */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">
                JAM OPERASIONAL LIVE
              </span>
              <span className="text-stone-400 text-xs">&bull;</span>
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-stone-900/90 text-white border border-stone-700">
                {currentLiveShift}
              </span>
            </div>

            {/* JAM BESAR JUMBO TEXT (LEBIH BESAR LAGI) */}
            <div className="text-6xl sm:text-7xl md:text-8xl xl:text-9xl font-black font-mono tracking-tighter text-amber-300 drop-shadow-[0_0_55px_rgba(252,211,77,0.7)] leading-none my-1">
              {timeString}
            </div>

            <div className="text-xs sm:text-sm font-bold text-stone-300">
              {dateString}
            </div>
          </div>
        </div>

        {/* FLEET QUICK SUMMARY PILLS (EYE-CATCHING DIGGER & HAULER HIGHLIGHTS - DIBESARKAN) */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-end">
          {/* Quick Digger Counter Card */}
          <button
            onClick={() => setActiveView('FLEET')}
            className="bg-[#12141C]/90 hover:bg-[#1A1D27] px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl border-2 border-amber-500/40 hover:border-amber-400 flex items-center gap-3.5 cursor-pointer transition-all text-left group shadow-lg"
          >
            <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 group-hover:scale-110 transition-transform shadow-inner">
              <HardHat className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <span className="text-[11px] sm:text-xs font-black uppercase text-amber-200/90 block tracking-wider">
                DIGGER (LOADER)
              </span>
              <div className="text-xl sm:text-2xl lg:text-3xl font-black font-mono text-amber-300 leading-tight">
                {summaryPerDigger.length} <span className="text-xs sm:text-sm font-bold text-stone-300">Unit Aktif</span>
              </div>
              <span className="text-[11px] sm:text-xs text-stone-300 font-bold block truncate max-w-[150px] mt-0.5">
                Top: <span className="text-white font-extrabold">{summaryPerDigger[0]?.digger || '-'}</span>
              </span>
            </div>
          </button>

          {/* Quick Hauler Counter Card */}
          <button
            onClick={() => setActiveView('FLEET')}
            className="bg-[#12141C]/90 hover:bg-[#1A1D27] px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl border-2 border-cyan-500/40 hover:border-cyan-400 flex items-center gap-3.5 cursor-pointer transition-all text-left group shadow-lg"
          >
            <div className="p-2.5 sm:p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 group-hover:scale-110 transition-transform shadow-inner">
              <Truck className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <span className="text-[11px] sm:text-xs font-black uppercase text-cyan-200/90 block tracking-wider">
                HAULER (DUMP TRUCK)
              </span>
              <div className="text-xl sm:text-2xl lg:text-3xl font-black font-mono text-cyan-300 leading-tight">
                {summaryPerHauler.length} <span className="text-xs sm:text-sm font-bold text-stone-300">Unit Aktif</span>
              </div>
              <span className="text-[11px] sm:text-xs text-stone-300 font-bold block truncate max-w-[150px] mt-0.5">
                Top: <span className="text-white font-extrabold">{summaryPerHauler[0]?.hauler || '-'}</span>
              </span>
            </div>
          </button>

          {/* Total Tonase Product */}
          <div className="bg-[#12141C]/90 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl border-2 border-stone-700/80 text-right min-w-[150px] sm:min-w-[180px] shadow-lg flex flex-col justify-center">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-stone-300 block">
              TOTAL TONASE PRODUCT
            </span>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black font-mono text-emerald-400 leading-tight drop-shadow-[0_0_20px_rgba(52,211,153,0.35)] my-0.5">
              {totalTonnageAll.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              <span className="text-xs sm:text-sm font-bold text-stone-300 ml-1">Ton</span>
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-stone-300 block">
              Target: <span className="text-white font-extrabold">{totalTargetAll.toLocaleString('id-ID')} Ton</span>
            </span>
          </div>

          {/* % Pencapaian Total Parameter Badge */}
          <div className={`px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl border-2 flex flex-col justify-center items-center min-w-[140px] sm:min-w-[170px] ${overallParam.badge} shadow-xl`}>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider opacity-95 block">
              % PENCAPAIAN TOTAL
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono leading-none my-1 tracking-tight drop-shadow-sm">
              {overallAchievedPercent.toFixed(1)}%
            </div>
            <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-black/40 border border-white/20 mt-0.5">
              {overallParam.label}
            </span>
          </div>
        </div>
      </section>

      {/* 3. MAIN CONTENT: DYNAMIC VIEW (JOB CATEGORY vs SUMMARY DIGGER & HAULER) */}
      <main className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
        {activeView === 'JOB' ? (
          /* ================= VIEW 1: JOB CATEGORY CARDS ================= */
          summaryPerJobCategory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl border border-[#E2D7C5] p-8 text-center space-y-3">
              <Layers className="w-12 h-12 text-stone-400" />
              <h3 className="text-base font-bold text-stone-700">Tidak ada data untuk filter ini</h3>
              <button
                onClick={() => {
                  onChangeDate('ALL');
                  onChangeShift('ALL');
                }}
                className="px-4 py-2 rounded-xl bg-[#7B1113] text-amber-300 font-black text-xs cursor-pointer shadow-xs border border-[#A51C1F]"
              >
                Reset ke Semua Data
              </button>
            </div>
          ) : (
            <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-1">
              {summaryPerJobCategory.map((item) => {
                const theme = getJobCategoryColorTheme(item.job);
                const param = getParamStatus(item.achievedPercent);
                const isCurrentlyEditing = editingJob === item.job;

                return (
                  <div
                    key={item.job}
                    className={`${theme.cardBg} ${theme.border} p-4 rounded-2xl border-2 transition-all flex flex-col justify-between shadow-xl relative backdrop-blur-md`}
                  >
                    {/* Top Header: Badge + % Achievement Target */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-3 py-1 rounded-xl ${theme.badge} font-black text-xs tracking-wider uppercase truncate shadow-md`}>
                        {item.job}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${param.badge} shadow-sm`}
                        title={`Pencapaian: ${item.achievedPercent.toFixed(1)}% dari Target`}
                      >
                        {item.achievedPercent.toFixed(1)}% Target
                      </span>
                    </div>

                    {/* Target & Total Tonase Product */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs text-stone-300 bg-black/40 px-3 py-1.5 rounded-xl border border-stone-700/60">
                        <span className="font-bold uppercase text-[10px] text-stone-400">
                          Target:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isCurrentlyEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={tempEditValue}
                                onChange={(e) => setTempEditValue(e.target.value)}
                                className="w-20 px-1.5 py-0.5 bg-stone-900 text-yellow-300 border border-amber-500 rounded font-mono font-bold text-xs"
                                placeholder="Ton"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = Number(tempEditValue);
                                    if (!isNaN(val) && val > 0) handleSaveTarget(item.job, val);
                                  } else if (e.key === 'Escape') {
                                    setEditingJob(null);
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  const val = Number(tempEditValue);
                                  if (!isNaN(val) && val > 0) handleSaveTarget(item.job, val);
                                }}
                                className="p-1 rounded bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700"
                                title="Simpan"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingJob(null)}
                                className="p-1 rounded bg-stone-700 text-stone-300 cursor-pointer hover:bg-stone-600"
                                title="Batal"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <strong className="font-mono text-stone-200 font-black text-xs">
                                {item.target.toLocaleString('id-ID')} Ton
                              </strong>
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    setEditingJob(item.job);
                                    setTempEditValue(item.target.toString());
                                  }}
                                  className="p-0.5 text-stone-400 hover:text-amber-300 rounded cursor-pointer transition-colors"
                                  title="Edit Target (Admin Only)"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Total Tonase Product (Jumbo Neon Yellow) */}
                      <div className="bg-black/30 p-3 rounded-xl border border-stone-800">
                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                          TOTAL TONASE PRODUCT:
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.9)] font-mono mt-0.5 leading-none">
                          {item.totalTonase.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                          <span className="text-xs font-semibold text-stone-300">Ton</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${theme.bar} rounded-full transition-all`}
                          style={{ width: `${Math.min(item.achievedPercent, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Bottom 3-Column Breakdown */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-800 text-center">
                      <div className="bg-black/40 p-2 rounded-xl border border-stone-800">
                        <span className="text-[9px] text-stone-400 font-bold uppercase block">TOTAL RITASE</span>
                        <div className="text-xs sm:text-sm font-black font-mono text-stone-200 mt-0.5">
                          {item.totalRitase.toLocaleString('id-ID')} <span className="text-[10px] text-stone-400 font-semibold">Rit</span>
                        </div>
                      </div>

                      <div className="bg-black/40 p-2 rounded-xl border border-stone-800">
                        <span className="text-[9px] text-stone-400 font-bold uppercase block">RATA-RATA</span>
                        <div className="text-xs sm:text-sm font-black font-mono text-stone-200 mt-0.5">
                          {item.avgTonPerRit} <span className="text-[10px] text-stone-400 font-semibold">T/Rit</span>
                        </div>
                      </div>

                      <div className="bg-black/40 p-2 rounded-xl border border-stone-800">
                        <span className="text-[9px] text-stone-400 font-bold uppercase block">LOADER</span>
                        <div className="text-xs sm:text-sm font-black font-mono text-amber-300 mt-0.5">
                          {item.loaderCount} <span className="text-[10px] text-stone-400 font-semibold">Unit</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Query Info */}
                    <div className="flex items-center justify-between text-[10px] text-stone-400 pt-2 mt-1 border-t border-stone-800/80">
                      <span>{item.count} baris query</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        ✓ Terverifikasi
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ================= VIEW 2: EYE-CATCHING DIGGER & HAULER SUMMARY ================= */
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-3.5 overflow-hidden">
            {/* LEFT COLUMN: DIGGER (LOADER / EXCAVATOR) LEADERBOARD */}
            <div className="bg-white rounded-3xl p-4 border border-[#E2D7C5] shadow-xs flex flex-col justify-between overflow-hidden">
              {/* Header Digger */}
              <div className="shrink-0 flex items-center justify-between pb-2.5 border-b border-[#E2D7C5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#7B1113] text-amber-300">
                    <HardHat className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase text-[#14161B] tracking-wider">
                      Summary Digger / Loader ({summaryPerDigger.length} Unit Aktif)
                    </h3>
                    <p className="text-[10px] text-stone-500">Performa excavator & wheel loader berdasarkan tonase product</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-bold text-stone-400 block uppercase">Total Digger Ton</span>
                  <span className="text-sm font-mono font-black text-[#7B1113]">
                    {summaryPerDigger.reduce((a, c) => a + c.totalTonase, 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </div>
              </div>

              {/* Digger List (Fitted) */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 py-2 pr-1">
                {summaryPerDigger.map((d, index) => {
                  const pctOfDigger = totalTonnageAll > 0 ? (d.totalTonase / totalTonnageAll) * 100 : 0;
                  const isTop3 = index < 3;
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

                  return (
                    <div
                      key={d.digger}
                      className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        index === 0
                          ? 'bg-gradient-to-r from-amber-50 to-[#FAF7F2] border-amber-300 shadow-xs'
                          : isTop3
                          ? 'bg-[#FAF7F2] border-[#E2D7C5]'
                          : 'bg-white border-stone-200'
                      }`}
                    >
                      {/* Rank & Unit */}
                      <div className="flex items-center gap-2.5 min-w-[130px]">
                        <span className="w-7 h-7 rounded-xl bg-[#14161B] text-amber-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                          {medal}
                        </span>
                        <div>
                          <div className="font-black text-xs text-[#14161B] flex items-center gap-1">
                            <span>{d.digger}</span>
                            {d.type && (
                              <span className="text-[9px] font-semibold text-stone-400 px-1 rounded bg-stone-100">
                                {d.type}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-stone-500 truncate block max-w-[130px]">
                            {d.jobs || 'Operasional'}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar Tonase */}
                      <div className="flex-1 hidden sm:block">
                        <div className="flex justify-between text-[9px] font-bold text-stone-500 mb-0.5">
                          <span>Kontribusi: {pctOfDigger.toFixed(1)}%</span>
                          <span>{d.totalRitase.toLocaleString('id-ID')} Rit</span>
                        </div>
                        <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-[#7B1113] rounded-full"
                            style={{ width: `${Math.min(pctOfDigger * 2.5, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Tonase Jumbo */}
                      <div className="text-right shrink-0 min-w-[90px]">
                        <div className="text-sm font-black font-mono text-[#7B1113] leading-tight">
                          {d.totalTonase.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          <span className="text-[10px] font-bold text-stone-500 ml-1">T</span>
                        </div>
                        <span className="text-[9px] font-mono text-stone-500">
                          {d.avgTonPerRit} T/Rit
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Digger Footer Mini */}
              <div className="shrink-0 pt-2 border-t border-[#E2D7C5] flex items-center justify-between text-[10px] text-stone-500 font-semibold">
                <span>Top Loader: <strong className="text-[#14161B]">{summaryPerDigger[0]?.digger || '-'}</strong> ({summaryPerDigger[0]?.totalTonase.toLocaleString('id-ID')} Ton)</span>
                <span>Rata-rata Kapasitas: <strong className="text-[#14161B] font-mono">{avgTonPerRitAll} Ton/Rit</strong></span>
              </div>
            </div>

            {/* RIGHT COLUMN: HAULER (DUMP TRUCK / DT) LEADERBOARD */}
            <div className="bg-white rounded-3xl p-4 border border-[#E2D7C5] shadow-xs flex flex-col justify-between overflow-hidden">
              {/* Header Hauler */}
              <div className="shrink-0 flex items-center justify-between pb-2.5 border-b border-[#E2D7C5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-700 text-white">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase text-[#14161B] tracking-wider">
                      Summary Hauler / Dump Truck ({summaryPerHauler.length} Unit Aktif)
                    </h3>
                    <p className="text-[10px] text-stone-500">Performa armada hauling DT berdasarkan ritase & tonase product</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-bold text-stone-400 block uppercase">Total Ritase DT</span>
                  <span className="text-sm font-mono font-black text-cyan-800">
                    {totalRitaseAll.toLocaleString('id-ID')} Rit
                  </span>
                </div>
              </div>

              {/* Hauler List (Fitted) */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 py-2 pr-1">
                {summaryPerHauler.map((h, index) => {
                  const pctOfTotal = totalTonnageAll > 0 ? (h.totalTonase / totalTonnageAll) * 100 : 0;
                  const isTop3 = index < 3;
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

                  return (
                    <div
                      key={h.hauler}
                      className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        index === 0
                          ? 'bg-gradient-to-r from-cyan-50 to-[#FAF7F2] border-cyan-300 shadow-xs'
                          : isTop3
                          ? 'bg-[#FAF7F2] border-[#E2D7C5]'
                          : 'bg-white border-stone-200'
                      }`}
                    >
                      {/* Rank & Unit */}
                      <div className="flex items-center gap-2.5 min-w-[130px]">
                        <span className="w-7 h-7 rounded-xl bg-[#14161B] text-cyan-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                          {medal}
                        </span>
                        <div>
                          <div className="font-black text-xs text-[#14161B] flex items-center gap-1">
                            <span>{h.hauler}</span>
                            {h.type && (
                              <span className="text-[9px] font-semibold text-stone-400 px-1 rounded bg-stone-100 truncate max-w-[70px]">
                                {h.type}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-stone-500 block">
                            Melayani {h.loaderCount} Loader
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar Ritase */}
                      <div className="flex-1 hidden sm:block">
                        <div className="flex justify-between text-[9px] font-bold text-stone-500 mb-0.5">
                          <span>{h.totalRitase.toLocaleString('id-ID')} Ritase</span>
                          <span>{pctOfTotal.toFixed(1)}% Vol</span>
                        </div>
                        <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                            style={{ width: `${Math.min(pctOfTotal * 8, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Tonase Jumbo */}
                      <div className="text-right shrink-0 min-w-[90px]">
                        <div className="text-sm font-black font-mono text-cyan-900 leading-tight">
                          {h.totalTonase.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          <span className="text-[10px] font-bold text-stone-500 ml-1">T</span>
                        </div>
                        <span className="text-[9px] font-mono text-stone-500">
                          {h.avgTonPerRit} T/Rit
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hauler Footer Mini */}
              <div className="shrink-0 pt-2 border-t border-[#E2D7C5] flex items-center justify-between text-[10px] text-stone-500 font-semibold">
                <span>Top DT: <strong className="text-[#14161B]">{summaryPerHauler[0]?.hauler || '-'}</strong> ({summaryPerHauler[0]?.totalRitase} Rit)</span>
                <span>Total Unit Aktif: <strong className="text-[#14161B] font-mono">{summaryPerHauler.length} Dump Truck</strong></span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. FOOTER INFO */}
      <footer className="shrink-0 pt-2 flex items-center justify-between text-[11px] text-stone-500 font-semibold">
        <div className="flex items-center gap-2">
          <span>PT. Karya Terang Utama &bull; Checker Ritase & MCR Control</span>
          <span>&bull;</span>
          <span>Tekan <kbd className="px-1 py-0.2 rounded bg-white border border-[#D6C7B2] text-[10px] text-stone-700">ESC</kbd> untuk keluar mode present</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-stone-600">
            Tampilan Aktif: <strong className="text-[#7B1113] uppercase">{activeView === 'JOB' ? 'Job Category' : 'Summary Digger & Hauler'}</strong>
          </span>
          {isAdmin ? (
            <span className="text-emerald-700 font-bold flex items-center gap-1 text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5" /> Admin
            </span>
          ) : (
            <span className="text-stone-500 flex items-center gap-1 text-[10px]">
              <Lock className="w-3.5 h-3.5" /> Viewer
            </span>
          )}
        </div>
      </footer>

      {/* MODAL KELOLA TARGET BATCH UNTUK ADMIN */}
      {showBatchTargetModal && isAdmin && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full border border-[#D6C7B2] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2D7C5] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#7B1113] text-amber-300">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#14161B]">Kelola Target Per Job Category</h3>
                  <p className="text-xs text-stone-500">Edit target tonase acuan pencapaian (Admin Only)</p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchTargetModal(false)}
                className="p-1 rounded-lg hover:bg-stone-200 text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {summaryPerJobCategory.map((item) => {
                const currentVal = getEffectiveTarget(item.job);
                return (
                  <div
                    key={item.job}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E2D7C5]"
                  >
                    <div>
                      <span className="text-xs font-black uppercase text-[#14161B]">{item.job}</span>
                      <div className="text-[10px] text-stone-500">
                        Aktual: <strong className="font-mono text-[#7B1113]">{item.totalTonase.toLocaleString('id-ID')} Ton</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        defaultValue={currentVal}
                        id={`target-batch-${item.job}`}
                        className="w-28 px-2 py-1 bg-[#FAF7F2] border border-[#D6C7B2] rounded-lg text-xs font-mono font-bold text-right focus:outline-none focus:border-[#7B1113]"
                      />
                      <span className="text-xs font-bold text-stone-500">Ton</span>
                      <button
                        onClick={() => {
                          const inputEl = document.getElementById(`target-batch-${item.job}`) as HTMLInputElement;
                          const val = Number(inputEl?.value);
                          if (!isNaN(val) && val > 0) {
                            handleSaveTarget(item.job, val);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#7B1113] hover:bg-[#5E0B0C] text-amber-200 text-xs font-black cursor-pointer shadow-xs"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#E2D7C5] flex justify-end">
              <button
                onClick={() => setShowBatchTargetModal(false)}
                className="px-4 py-2 rounded-xl bg-[#14161B] text-amber-300 font-black text-xs cursor-pointer shadow-xs"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
