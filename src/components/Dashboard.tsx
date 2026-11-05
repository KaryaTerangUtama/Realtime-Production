import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  Layers,
  HardHat,
  Calendar,
  PlusCircle,
  Clock,
  Sparkles,
  Award,
  Flame,
  Edit3,
  Check,
  BarChart2,
  Tag,
  UserCheck,
  UploadCloud,
  Database,
  Tv
} from 'lucide-react';
import { RitaseRecord, User, McrRecord } from '../types';
import { MastersData } from '../services/api';
import { McrPresentationModal } from './McrPresentationModal';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface DashboardProps {
  ritaseList: RitaseRecord[];
  mcrRecords?: McrRecord[];
  masters?: MastersData;
  onNavigateToInput: () => void;
  onNavigateToMcr?: () => void;
  currentUser: User | null;
}

type DateFilterPreset = 'today' | 'yesterday' | '7days' | 'month' | 'custom';

export const Dashboard: React.FC<DashboardProps> = ({
  ritaseList,
  mcrRecords = [],
  masters,
  onNavigateToInput,
  onNavigateToMcr,
  currentUser
}) => {
  const [filterPreset, setFilterPreset] = useState<DateFilterPreset>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [dataSource, setDataSource] = useState<'MCR' | 'CHECKER' | 'COMBINED'>('MCR');
  const [dashboardDate, setDashboardDate] = useState<string>('ALL');
  const [selectedHourlyJobCategory, setSelectedHourlyJobCategory] = useState<string>('ORE GETTING');
  const [activeShiftFilter, setActiveShiftFilter] = useState<'ALL' | 'SHIFT 1' | 'SHIFT 2'>('ALL');
  const [hoveredHourSlot, setHoveredHourSlot] = useState<string | null>(null);
  const [isPresentationOpen, setIsPresentationOpen] = useState<boolean>(false);

  const [dailyTargetPlanOverride, setDailyTargetPlanOverride] = useState<number | null>(() => {
    const saved = localStorage.getItem('ktu_daily_target_plan');
    return saved ? Number(saved) : null;
  });

  const [jobTargetOverrides, setJobTargetOverrides] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('ktu_job_target_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [editingJobName, setEditingJobName] = useState<string | null>(null);
  const [tempJobTarget, setTempJobTarget] = useState<string>('');

  const [hiddenJobCategories, setHiddenJobCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ktu_hidden_job_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('ktu_hidden_job_categories', JSON.stringify(hiddenJobCategories));
  }, [hiddenJobCategories]);

  const handleToggleHideJob = (jobName: string) => {
    const upper = jobName.toUpperCase();
    if (hiddenJobCategories.includes(upper)) {
      setHiddenJobCategories(hiddenJobCategories.filter((j) => j !== upper));
    } else {
      setHiddenJobCategories([...hiddenJobCategories, upper]);
    }
  };

  // Unified Job Categories combining Master Data and MCR query records
  const allJobCategories = useMemo(() => {
    const map = new Map<string, { id: string; nama_kegiatan: string; target_harian: number }>();

    // From masters
    masters?.job_categories?.forEach((j) => {
      map.set(j.nama_kegiatan.toUpperCase(), {
        id: j.id,
        nama_kegiatan: j.nama_kegiatan.toUpperCase(),
        target_harian: Number(j.target_harian) || 5000
      });
    });

    // From MCR records
    (mcrRecords || []).forEach((m, idx) => {
      const name = (m.job_category || '').toUpperCase();
      if (name && !map.has(name)) {
        map.set(name, {
          id: `MCR-JOB-${idx}`,
          nama_kegiatan: name,
          target_harian: 5000
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.nama_kegiatan.localeCompare(b.nama_kegiatan));
  }, [masters, mcrRecords]);

  // Daily Target Plan state derived from Master Data Job Categories and overrides
  const dailyTargetPlan = useMemo(() => {
    if (dailyTargetPlanOverride !== null) return dailyTargetPlanOverride;
    if (masters?.job_categories && masters.job_categories.length > 0) {
      const sum = masters.job_categories
        .filter((j: any) => j.status === 'ACTIVE')
        .reduce((acc: number, curr: any) => {
          const t = jobTargetOverrides[curr.nama_kegiatan.toUpperCase()] !== undefined
            ? jobTargetOverrides[curr.nama_kegiatan.toUpperCase()]
            : (Number(curr.target_harian) || 0);
          return acc + t;
        }, 0);
      if (sum > 0) return sum;
    }
    const saved = localStorage.getItem('ktu_daily_target_plan');
    return saved ? Number(saved) : 15000;
  }, [masters, dailyTargetPlanOverride, jobTargetOverrides]);

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(dailyTargetPlan.toString());

  const handleSaveTarget = () => {
    const val = Number(tempTarget);
    if (!isNaN(val) && val > 0) {
      setDailyTargetPlanOverride(val);
      localStorage.setItem('ktu_daily_target_plan', val.toString());
      setIsEditingTarget(false);
    }
  };

  const handleSaveJobTarget = (jobName: string) => {
    const val = Number(tempJobTarget);
    if (!isNaN(val) && val >= 0) {
      const updated = { ...jobTargetOverrides, [jobName.toUpperCase()]: val };
      setJobTargetOverrides(updated);
      localStorage.setItem('ktu_job_target_overrides', JSON.stringify(updated));
      setEditingJobName(null);
    }
  };

  const [isEditingHourlyCardTarget, setIsEditingHourlyCardTarget] = useState(false);
  const [tempHourlyCardTarget, setTempHourlyCardTarget] = useState<string>('');

  const currentJobTargetHarian = useMemo(() => {
    const selectedJobObj = masters?.job_categories?.find(j => j.nama_kegiatan.toUpperCase() === selectedHourlyJobCategory.toUpperCase());
    return selectedJobObj 
      ? (jobTargetOverrides[selectedJobObj.nama_kegiatan.toUpperCase()] !== undefined ? jobTargetOverrides[selectedJobObj.nama_kegiatan.toUpperCase()] : (Number(selectedJobObj.target_harian) || 0))
      : Math.round(dailyTargetPlan / Math.max(masters?.job_categories?.length || 1, 1));
  }, [jobTargetOverrides, masters, selectedHourlyJobCategory, dailyTargetPlan]);

  const currentJobTargetPerJam = Math.round(currentJobTargetHarian / 24);

  const handleSaveHourlyCardTarget = () => {
    const val = Number(tempHourlyCardTarget);
    if (!isNaN(val) && val >= 0) {
      const updated = { ...jobTargetOverrides, [selectedHourlyJobCategory.toUpperCase()]: val };
      setJobTargetOverrides(updated);
      localStorage.setItem('ktu_job_target_overrides', JSON.stringify(updated));
      setIsEditingHourlyCardTarget(false);
    }
  };


  // Get current date formatted
  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Filtered dataset according to preset
  const filteredData = useMemo(() => {
    const now = new Date();
    let data = ritaseList;
    switch (filterPreset) {
      case 'today':
        data = ritaseList.filter((r) => r.tanggal === todayStr);
        break;
      case 'yesterday':
        data = ritaseList.filter((r) => r.tanggal === yesterdayStr);
        break;
      case '7days': {
        const past7 = new Date();
        past7.setDate(now.getDate() - 7);
        const past7Str = past7.toISOString().split('T')[0];
        data = ritaseList.filter((r) => r.tanggal >= past7Str && r.tanggal <= todayStr);
        break;
      }
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        data = ritaseList.filter((r) => r.tanggal >= monthStart);
        break;
      }
      case 'custom': {
        if (!customStartDate && !customEndDate) data = ritaseList;
        else {
          data = ritaseList.filter((r) => {
            if (customStartDate && r.tanggal < customStartDate) return false;
            if (customEndDate && r.tanggal > customEndDate) return false;
            return true;
          });
        }
        break;
      }
    }

    if (activeShiftFilter === 'SHIFT 1') {
      data = data.filter((r) => {
        if (!r.waktu) return true;
        const [hStr] = r.waktu.split(':');
        const h = parseInt(hStr, 10);
        return !isNaN(h) && h >= 7 && h < 19;
      });
    } else if (activeShiftFilter === 'SHIFT 2') {
      data = data.filter((r) => {
        if (!r.waktu) return true;
        const [hStr] = r.waktu.split(':');
        const h = parseInt(hStr, 10);
        return !isNaN(h) && (h >= 19 || h < 7);
      });
    }
    return data;
  }, [ritaseList, filterPreset, todayStr, yesterdayStr, customStartDate, customEndDate, activeShiftFilter]);

  // Helper for flexible date matching between MCR ('1-Oct') and ISO/custom format ('2026-10-01')
  const matchMcrDate = (mcrDateStr: string, filterDateStr: string): boolean => {
    if (!filterDateStr || filterDateStr === 'ALL' || filterDateStr === 'all') return true;
    if (!mcrDateStr) return false;

    const mClean = mcrDateStr.trim().toLowerCase();
    const fClean = filterDateStr.trim().toLowerCase();
    if (mClean === fClean) return true;

    const parseToIso = (d: string): string | null => {
      const parts = d.split('-');
      if (parts.length === 2) {
        const day = parseInt(parts[0], 10);
        const mon = parts[1].toLowerCase();
        const monthMap: Record<string, string> = {
          jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
          jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
          okt: '10', ags: '08', agu: '08'
        };
        const m = monthMap[mon.slice(0, 3)];
        if (m && !isNaN(day)) {
          return `2026-${m}-${String(day).padStart(2, '0')}`;
        }
      }
      return null;
    };

    const mIso = parseToIso(mClean);
    const fIso = parseToIso(fClean);
    if (mIso && (mIso === fClean || mIso === fIso)) return true;
    if (fIso && (fIso === mClean || fIso === mIso)) return true;
    return false;
  };

  // Distinct dates in MCR records for quick chips
  const distinctMcrDates = useMemo(() => {
    const set = new Set<string>();
    (mcrRecords || []).forEach((r) => {
      if (r.tanggal) set.add(r.tanggal);
    });
    return Array.from(set).sort((a, b) => {
      const dayA = parseInt(a.split('-')[0], 10) || 0;
      const dayB = parseInt(b.split('-')[0], 10) || 0;
      return dayA - dayB;
    });
  }, [mcrRecords]);

  // Selected MCR Records for current date & shift
  const selectedMcrRecords = useMemo(() => {
    let list = (mcrRecords || []).filter((r) => matchMcrDate(r.tanggal, dashboardDate));
    if (activeShiftFilter === 'SHIFT 1') {
      list = list.filter((r) => (r.shift || '').toUpperCase() === 'DAY');
    } else if (activeShiftFilter === 'SHIFT 2') {
      list = list.filter((r) => (r.shift || '').toUpperCase() === 'NIGHT');
    }
    return list;
  }, [mcrRecords, dashboardDate, activeShiftFilter]);

  // Total MCR Stats (Tonnage computed directly from Product column)
  const totalMcrProduksi = useMemo(() => {
    return selectedMcrRecords.reduce((acc, curr) => {
      const ton = curr.total_product_tonase > 0
        ? curr.total_product_tonase
        : (Number(curr.product) || 0);
      return acc + (Number(ton) || 0);
    }, 0);
  }, [selectedMcrRecords]);

  const totalMcrRitase = useMemo(() => {
    return selectedMcrRecords.reduce((acc, curr) => acc + (Number(curr.ritase) || 0), 0);
  }, [selectedMcrRecords]);

  const activeMcrLoaders = useMemo(() => {
    return Array.from(new Set(selectedMcrRecords.map((r) => r.loader))).filter(Boolean);
  }, [selectedMcrRecords]);

  // Selected date specific calculations for primary cards (Checker data)
  const selectedDateRecords = useMemo(() => {
    let list = ritaseList;
    if (dashboardDate !== 'ALL') {
      list = list.filter((r) => matchMcrDate(r.tanggal, dashboardDate) || r.tanggal === dashboardDate);
    }
    if (activeShiftFilter === 'SHIFT 1') {
      list = list.filter((r) => {
        if (!r.waktu) return true;
        const [hStr] = r.waktu.split(':');
        const h = parseInt(hStr, 10);
        return !isNaN(h) && h >= 7 && h < 19;
      });
    } else if (activeShiftFilter === 'SHIFT 2') {
      list = list.filter((r) => {
        if (!r.waktu) return true;
        const [hStr] = r.waktu.split(':');
        const h = parseInt(hStr, 10);
        return !isNaN(h) && (h >= 19 || h < 7);
      });
    }
    return list;
  }, [ritaseList, dashboardDate, activeShiftFilter]);

  const totalRitaseToday = useMemo(() => {
    if (dataSource === 'MCR') return totalMcrRitase;
    if (dataSource === 'CHECKER') return selectedDateRecords.length;
    return totalMcrRitase + selectedDateRecords.length;
  }, [dataSource, totalMcrRitase, selectedDateRecords]);

  const totalProduksiToday = useMemo(() => {
    const checkerProd = selectedDateRecords.reduce((acc, curr) => acc + (Number(curr.produksi) || 0), 0);
    if (dataSource === 'MCR') return totalMcrProduksi;
    if (dataSource === 'CHECKER') return checkerProd;
    return totalMcrProduksi + checkerProd;
  }, [dataSource, totalMcrProduksi, selectedDateRecords]);

  const totalBucketToday = useMemo(() => {
    const checkerBucket = selectedDateRecords.reduce((acc, curr) => acc + (Number(curr.jumlah_bucket) || 0), 0);
    if (dataSource === 'MCR') return Math.round(totalMcrRitase * 7);
    if (dataSource === 'CHECKER') return checkerBucket;
    return checkerBucket + Math.round(totalMcrRitase * 7);
  }, [dataSource, totalMcrRitase, selectedDateRecords]);

  // Active units for selected date
  const activeCheckersToday = useMemo(() => {
    if (dataSource === 'MCR') return ['Mining Control Room (MCR)'];
    const chks = Array.from(new Set(selectedDateRecords.map((r) => r.checker_name))).filter(Boolean);
    if (dataSource === 'COMBINED') return Array.from(new Set(['MCR System', ...chks]));
    return chks;
  }, [dataSource, selectedDateRecords]);

  const activeDiggersToday = useMemo(() => {
    const checkerDig = Array.from(new Set(selectedDateRecords.map((r) => r.digger_unit))).filter(Boolean);
    if (dataSource === 'MCR') return activeMcrLoaders;
    if (dataSource === 'CHECKER') return checkerDig;
    return Array.from(new Set([...activeMcrLoaders, ...checkerDig]));
  }, [dataSource, activeMcrLoaders, selectedDateRecords]);

  const activeHaulersToday = useMemo(() => {
    const checkerHl = Array.from(new Set(selectedDateRecords.map((r) => r.hauler_unit))).filter(Boolean);
    if (dataSource === 'MCR') return ['DT Fleet (MCR)'];
    if (dataSource === 'CHECKER') return checkerHl;
    return Array.from(new Set(['DT Fleet (MCR)', ...checkerHl]));
  }, [dataSource, selectedDateRecords]);

  // Filtered view stats
  const totalRitaseFiltered = filteredData.length;
  const totalProduksiFiltered = filteredData.reduce((acc, curr) => acc + (Number(curr.produksi) || 0), 0);
  const totalBucketFiltered = filteredData.reduce((acc, curr) => acc + (Number(curr.jumlah_bucket) || 0), 0);

  // Chart data calculations
  const produksiPerJobCategory = useMemo(() => {
    const map = new Map<string, { ritase: number; produksi: number; bucket: number }>();

    if (dataSource === 'MCR' || dataSource === 'COMBINED') {
      selectedMcrRecords.forEach((r) => {
        const job = (r.job_category || 'ORE GETTING').toUpperCase();
        const prev = map.get(job) || { ritase: 0, produksi: 0, bucket: 0 };
        const ton = r.total_product_tonase > 0
          ? r.total_product_tonase
          : (Number(r.product) || 0);
        map.set(job, {
          ritase: prev.ritase + (Number(r.ritase) || 0),
          produksi: prev.produksi + ton,
          bucket: prev.bucket + Math.round((Number(r.ritase) || 0) * 7)
        });
      });
    }

    if (dataSource === 'CHECKER' || dataSource === 'COMBINED') {
      filteredData.forEach((r) => {
        const job = (r.job_category || 'ORE GETTING').toUpperCase();
        const prev = map.get(job) || { ritase: 0, produksi: 0, bucket: 0 };
        map.set(job, {
          ritase: prev.ritase + 1,
          produksi: prev.produksi + (Number(r.produksi) || 0),
          bucket: prev.bucket + (Number(r.jumlah_bucket) || 0)
        });
      });
    }

    return Array.from(map.entries())
      .map(([jobCategory, stat]) => ({ jobCategory, ...stat }))
      .sort((a, b) => b.produksi - a.produksi);
  }, [dataSource, selectedMcrRecords, filteredData]);

  const produksiPerDigger = useMemo(() => {
    const map = new Map<string, { ritase: number; produksi: number }>();

    if (dataSource === 'MCR' || dataSource === 'COMBINED') {
      selectedMcrRecords.forEach((r) => {
        const digger = r.loader || 'Unknown';
        const prev = map.get(digger) || { ritase: 0, produksi: 0 };
        const ton = r.total_product_tonase > 0
          ? r.total_product_tonase
          : (Number(r.product) || 0);
        map.set(digger, {
          ritase: prev.ritase + (Number(r.ritase) || 0),
          produksi: prev.produksi + ton
        });
      });
    }

    if (dataSource === 'CHECKER' || dataSource === 'COMBINED') {
      filteredData.forEach((r) => {
        const digger = r.digger_unit || 'Unknown';
        const prev = map.get(digger) || { ritase: 0, produksi: 0 };
        map.set(digger, {
          ritase: prev.ritase + 1,
          produksi: prev.produksi + (Number(r.produksi) || 0)
        });
      });
    }

    return Array.from(map.entries())
      .map(([digger, stat]) => ({ digger, ...stat }))
      .sort((a, b) => b.produksi - a.produksi);
  }, [dataSource, selectedMcrRecords, filteredData]);

  const produksiPerHauler = useMemo(() => {
    const map = new Map<string, { ritase: number; produksi: number }>();
    filteredData.forEach((r) => {
      const hauler = r.hauler_unit || 'Unknown';
      const prev = map.get(hauler) || { ritase: 0, produksi: 0 };
      map.set(hauler, {
        ritase: prev.ritase + 1,
        produksi: prev.produksi + (Number(r.produksi) || 0)
      });
    });
    return Array.from(map.entries())
      .map(([hauler, stat]) => ({ hauler, ...stat }))
      .sort((a, b) => b.produksi - a.produksi);
  }, [filteredData]);

  const produksiPerMaterial = useMemo(() => {
    const map = new Map<string, { ritase: number; produksi: number; satuan: string }>();
    filteredData.forEach((r) => {
      const mat = r.material || 'Lainnya';
      const prev = map.get(mat) || { ritase: 0, produksi: 0, satuan: r.satuan_produksi || 'BCM' };
      map.set(mat, {
        ritase: prev.ritase + 1,
        produksi: prev.produksi + (Number(r.produksi) || 0),
        satuan: r.satuan_produksi || prev.satuan
      });
    });
    return Array.from(map.entries())
      .map(([material, stat]) => ({ material, ...stat }))
      .sort((a, b) => b.produksi - a.produksi);
  }, [filteredData]);

  // Produksi & Ritase Berdasarkan Kode Lot / Tumpukan (Khusus kegiatan dengan kode lot terisi)
  const produksiPerLot = useMemo(() => {
    const map = new Map<string, { lot: string; ritase: number; produksi: number; bucket: number; jobCategories: Set<string> }>();
    filteredData.forEach((r) => {
      const lot = r.kode_lot && r.kode_lot.trim() ? r.kode_lot.trim() : '';
      if (!lot) return; // Only activities with lot code filled in
      const prev = map.get(lot) || { lot, ritase: 0, produksi: 0, bucket: 0, jobCategories: new Set() };
      prev.ritase += 1;
      prev.produksi += Number(r.produksi) || 0;
      prev.bucket += Number(r.jumlah_bucket) || 0;
      if (r.job_category) prev.jobCategories.add(r.job_category);
      map.set(lot, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.produksi - a.produksi);
  }, [filteredData]);

  const maxJobProd = useMemo(() => Math.max(...produksiPerJobCategory.map((j) => j.produksi), 1), [produksiPerJobCategory]);
  const maxDiggerProd = useMemo(() => Math.max(...produksiPerDigger.map((d) => d.produksi), 1), [produksiPerDigger]);
  const maxHaulerProd = useMemo(() => Math.max(...produksiPerHauler.map((h) => h.produksi), 1), [produksiPerHauler]);
  const maxMaterialProd = useMemo(() => Math.max(...produksiPerMaterial.map((m) => m.produksi), 1), [produksiPerMaterial]);

  // Hourly records filtered by selected Job Category
  const filteredHourlyRecords = useMemo(() => {
    return selectedDateRecords.filter(r => (r.job_category || 'ORE GETTING').toLowerCase() === selectedHourlyJobCategory.toLowerCase());
  }, [selectedDateRecords, selectedHourlyJobCategory]);

  // Hourly Day Shift (06:00 to 19:00)
  const hourlyDayShift = useMemo(() => {
    const hours = ['06-07', '07-08', '08-09', '09-10', '10-11', '11-12', '12-13', '13-14', '14-15', '15-16', '16-17', '17-18', '18-19'];
    const map = new Map<string, number>();
    hours.forEach(h => map.set(h, 0));

    filteredHourlyRecords.forEach(r => {
      if (!r.waktu) return;
      const [hStr] = r.waktu.split(':');
      const h = parseInt(hStr, 10);
      if (!isNaN(h) && h >= 6 && h < 19) {
        const slot = `${h.toString().padStart(2, '0')}-${(h + 1).toString().padStart(2, '0')}`;
        if (map.has(slot)) {
          map.set(slot, (map.get(slot) || 0) + (Number(r.produksi) || 0));
        }
      }
    });

    const selectedJobObj = masters?.job_categories?.find(j => j.nama_kegiatan.toUpperCase() === selectedHourlyJobCategory.toUpperCase());
    const jobTargetHarian = selectedJobObj 
      ? (jobTargetOverrides[selectedJobObj.nama_kegiatan.toUpperCase()] !== undefined ? jobTargetOverrides[selectedJobObj.nama_kegiatan.toUpperCase()] : (Number(selectedJobObj.target_harian) || 0))
      : Math.round(dailyTargetPlan / Math.max(masters?.job_categories?.length || 1, 1));
    const hourlyTarget = Math.round(jobTargetHarian / 24);

    return hours.map(slot => {
      const actual = map.get(slot) || 0;
      const target = hourlyTarget;
      const ach = target > 0 ? Math.round((actual / target) * 100) : 0;
      const diff = actual - target;
      return { slot, actual, target, ach, diff };
    });
  }, [filteredHourlyRecords, dailyTargetPlan, selectedHourlyJobCategory, jobTargetOverrides, masters]);

  // Hourly Night Shift (19:00 to 06:00)
  const hourlyNightShift = useMemo(() => {
    const hours = ['19-20', '20-21', '21-22', '22-23', '23-00', '00-01', '01-02', '02-03', '03-04', '04-05', '05-06'];
    const map = new Map<string, number>();
    hours.forEach(h => map.set(h, 0));

    filteredHourlyRecords.forEach(r => {
      if (!r.waktu) return;
      const [hStr] = r.waktu.split(':');
      const h = parseInt(hStr, 10);
      if (!isNaN(h)) {
        if (h >= 19 || h < 6) {
          const slot = h >= 19 ? `${h.toString().padStart(2, '0')}-${((h + 1) % 24).toString().padStart(2, '0')}` : `${h.toString().padStart(2, '0')}-${(h + 1).toString().padStart(2, '0')}`;
          if (map.has(slot)) {
            map.set(slot, (map.get(slot) || 0) + (Number(r.produksi) || 0));
          }
        }
      }
    });

    const selectedJobObj = masters?.job_categories?.find(j => j.nama_kegiatan.toUpperCase() === selectedHourlyJobCategory.toUpperCase());
    const jobTargetHarian = selectedJobObj 
      ? (jobTargetOverrides[selectedJobObj.nama_kegiatan.toUpperCase()] !== undefined ? jobTargetOverrides[selectedJobObj.nama_kegiatan.toUpperCase()] : (Number(selectedJobObj.target_harian) || 0))
      : Math.round(dailyTargetPlan / Math.max(masters?.job_categories?.length || 1, 1));
    const hourlyTarget = Math.round(jobTargetHarian / 24);

    return hours.map(slot => {
      const actual = map.get(slot) || 0;
      const target = hourlyTarget;
      const ach = target > 0 ? Math.round((actual / target) * 100) : 0;
      const diff = actual - target;
      return { slot, actual, target, ach, diff };
    });
  }, [filteredHourlyRecords, dailyTargetPlan, selectedHourlyJobCategory, jobTargetOverrides, masters]);

  const maxHourlyVal = useMemo(() => {
    const maxDay = Math.max(...hourlyDayShift.map(d => Math.max(d.actual, d.target)), 1);
    const maxNight = Math.max(...hourlyNightShift.map(d => Math.max(d.actual, d.target)), 1);
    return Math.max(maxDay, maxNight, 50);
  }, [hourlyDayShift, hourlyNightShift]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Quick Action */}
      <div className="bg-gradient-to-r from-[#14161B] via-[#1E222B] to-[#7B1113] rounded-3xl p-6 sm:p-7 shadow-xl border border-[#353A47] text-[#FAF7F2] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-[#7B1113] text-[#FAF7F2] border border-[#A51C1F]">
                <Flame className="w-4 h-4 fill-current text-amber-300 animate-pulse" /> PT. KARYA TERANG UTAMA
              </span>
              <span className="text-xs text-amber-200/90 font-bold">Real-Time Ritase</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2 drop-shadow-sm">
              Dashboard Monitoring Ritase & Produksi
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-1">
              Selamat datang, <strong className="text-amber-300">{currentUser?.name || 'User'}</strong>.
              Pantau Material Movement & rekapitulasi berdasarkan Kode Lot.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {onNavigateToMcr && (
            <button
              onClick={onNavigateToMcr}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[#7B1113] hover:bg-[#5E0B0C] text-amber-300 font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer shrink-0 border border-[#A51C1F] transform hover:scale-102"
            >
              <UploadCloud className="w-5 h-5" />
              <span>INPUT QUERY MCR</span>
            </button>
          )}

          {currentUser?.role !== 'VIEWER' && currentUser?.role !== 'PENGAWAS' && (
            <button
              onClick={onNavigateToInput}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#14161B] font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer shrink-0 border border-amber-500 transform hover:scale-102"
            >
              <PlusCircle className="w-5 h-5" />
              <span>CATAT RITASE BARU</span>
            </button>
          )}
        </div>
      </div>

      {/* DATA SOURCE SELECTOR (MCR QUERY VS CHECKER LAPANGAN) */}
      <div className="bg-[#FAF7F2] rounded-2xl p-4 shadow-xs border border-[#E2D7C5] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7B1113] text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#181A1F]">
                Sumber Data Dashboard:
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Kolom Product Terhubung
              </span>
            </div>
            <p className="text-[11px] text-stone-600 mt-0.5">
              {dataSource === 'MCR' ? (
                <span>
                  Menampilkan data dari <strong className="text-[#7B1113]">Query MCR</strong> (Tonnage diambil dari kolom{' '}
                  <strong className="text-emerald-700 font-mono font-bold">Product</strong>) &bull;{' '}
                  {(mcrRecords || []).length.toLocaleString('id-ID')} baris data
                </span>
              ) : dataSource === 'CHECKER' ? (
                <span>
                  Menampilkan data dari <strong className="text-[#7B1113]">Input Checker Lapangan</strong> &bull;{' '}
                  {ritaseList.length.toLocaleString('id-ID')} ritase tersimpan
                </span>
              ) : (
                <span>
                  Menampilkan gabungan data <strong className="text-[#7B1113]">Query MCR + Checker Lapangan</strong>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#EDE4D5] p-1 rounded-2xl border border-[#D6C7B2] w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={() => setDataSource('MCR')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              dataSource === 'MCR'
                ? 'bg-[#7B1113] text-amber-300 shadow-md ring-1 ring-[#5E0B0C]'
                : 'text-stone-700 hover:text-[#7B1113]'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>DATA MCR (KOLOM PRODUCT)</span>
            {(mcrRecords || []).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#14161B] text-amber-300">
                {(mcrRecords || []).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setDataSource('CHECKER')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              dataSource === 'CHECKER'
                ? 'bg-[#7B1113] text-amber-300 shadow-md ring-1 ring-[#5E0B0C]'
                : 'text-stone-700 hover:text-[#7B1113]'
            }`}
          >
            <HardHat className="w-4 h-4" />
            <span>CHECKER LAPANGAN</span>
          </button>

          <button
            onClick={() => setDataSource('COMBINED')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              dataSource === 'COMBINED'
                ? 'bg-[#7B1113] text-amber-300 shadow-md ring-1 ring-[#5E0B0C]'
                : 'text-stone-700 hover:text-[#7B1113]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>GABUNGAN</span>
          </button>
        </div>
      </div>

      {/* PILIHAN TANGGAL & SHIFT DASHBOARD */}
      <div className="bg-[#FAF7F2] rounded-2xl p-4 sm:p-5 shadow-xs border border-[#E2D7C5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#7B1113]" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#181A1F]">
              Pilih Tanggal & Shift Operasional
            </h3>
            <p className="text-[11px] text-stone-600">
              Menampilkan data untuk:{' '}
              <strong className="text-[#7B1113]">
                {dashboardDate === 'ALL'
                  ? `Semua Periode (${distinctMcrDates.length > 0 ? distinctMcrDates.join(', ') : 'Semua'})`
                  : `Tanggal ${dashboardDate}`}
              </strong>{' '}
              ({activeShiftFilter})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#EDE4D5] p-1 rounded-xl border border-[#D6C7B2]">
            {(['ALL', 'SHIFT 1', 'SHIFT 2'] as const).map((sh) => (
              <button
                key={sh}
                onClick={() => setActiveShiftFilter(sh)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  activeShiftFilter === sh
                    ? 'bg-[#7B1113] text-[#FAF7F2]'
                    : 'text-stone-700 hover:text-[#7B1113]'
                }`}
              >
                {sh}
              </button>
            ))}
          </div>

          <button
            onClick={() => setDashboardDate('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              dashboardDate === 'ALL'
                ? 'bg-[#7B1113] text-amber-300 border-[#580A0B]'
                : 'bg-[#EDE4D5] text-stone-700 hover:bg-[#E2D7C5] border-[#D6C7B2]'
            }`}
          >
            Semua Periode
          </button>

          {distinctMcrDates.length > 0 && (
            <select
              value={dashboardDate}
              onChange={(e) => setDashboardDate(e.target.value)}
              className="px-3 py-1.5 bg-[#EDE4D5] border border-[#D6C7B2] rounded-lg text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
            >
              <option value="ALL">Pilih Tanggal MCR (Semua)</option>
              {distinctMcrDates.map((d) => (
                <option key={d} value={d}>
                  Tanggal {d}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setDashboardDate(todayStr)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              dashboardDate === todayStr
                ? 'bg-[#7B1113] text-white border-[#580A0B]'
                : 'bg-[#EDE4D5] text-stone-700 hover:bg-[#E2D7C5] border-[#D6C7B2]'
            }`}
          >
            Hari Ini
          </button>

          <input
            type="date"
            value={dashboardDate === 'ALL' ? '' : dashboardDate}
            onChange={(e) => setDashboardDate(e.target.value)}
            className="px-3 py-1.5 bg-[#FAF7F2] border border-[#D6C7B2] rounded-lg text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
          />

          <button
            onClick={() => setIsPresentationOpen(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-[#14161B] to-[#7B1113] hover:from-black hover:to-[#5E0B0C] text-amber-300 transition-all cursor-pointer border border-[#A51C1F] shadow-sm flex items-center gap-1.5 transform hover:scale-102"
            title="Buka Mode Presentasi Layar Penuh dengan Jam Besar & Kalkulasi Per Job Category"
          >
            <Tv className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>MODE PRESENT</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD LAYOUT: CARD UTAMA MATERIAL MOVEMENT & SIDE TARGET CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* CARD UTAMA: MATERIAL MOVEMENT (VIBRANT DARK GRADIENT) */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#181A1F] via-[#242933] to-[#0D0E12] text-[#FAF7F2] p-6 sm:p-8 shadow-2xl border-2 border-amber-500/30 flex flex-col justify-between">
          <div className="absolute -right-8 -bottom-8 opacity-15 pointer-events-none">
            <Layers className="w-72 h-72 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="px-3.5 py-1.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> MATERIAL MOVEMENT (TOTAL PRODUKSI UTAMA)
              </span>
              <span className="text-xs text-amber-200/90 font-black">Tanggal: {dashboardDate}</span>
            </div>
            
            <div className="mt-5 flex flex-col sm:flex-row sm:items-baseline gap-4">
              <div>
                <span className="text-xs text-stone-400 font-bold uppercase tracking-wider block mb-1">Volume Aktual</span>
                <div className="text-5xl sm:text-6xl font-black text-amber-400 tracking-tight font-mono drop-shadow-md">
                  {totalProduksiToday.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="text-xl font-black text-white uppercase tracking-wider sm:pb-2">
                TON / BCM
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-4 border-t border-stone-800">
              <div className="bg-black/40 backdrop-blur-md p-3.5 rounded-2xl border border-stone-700/60 shadow-inner">
                <span className="text-[10px] text-stone-400 font-bold uppercase">Total Ritase</span>
                <div className="text-xl font-black text-white font-mono mt-0.5">{totalRitaseToday.toLocaleString('id-ID')} Rit</div>
              </div>
              <div className="bg-black/40 backdrop-blur-md p-3.5 rounded-2xl border border-stone-700/60 shadow-inner">
                <span className="text-[10px] text-stone-400 font-bold uppercase">Total Bucket</span>
                <div className="text-xl font-black text-amber-300 font-mono mt-0.5">{totalBucketToday.toLocaleString('id-ID')}</div>
              </div>
              <div className="bg-black/40 backdrop-blur-md p-3.5 rounded-2xl border border-stone-700/60 shadow-inner col-span-2 sm:col-span-1">
                <span className="text-[10px] text-stone-400 font-bold uppercase">Target Plan Harian</span>
                <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{dailyTargetPlan.toLocaleString('id-ID')} Ton</div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-stone-300 font-semibold gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Pencapaian: <strong className="text-amber-300 font-mono">{dailyTargetPlan > 0 ? Math.round((totalProduksiToday / dailyTargetPlan) * 100) : 0}%</strong> dari Target Plan</span>
            </div>
            <span className="font-black text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60">
              {activeDiggersToday.length} Digger &bull; {activeHaulersToday.length} Hauler Aktif
            </span>
          </div>
        </div>

        {/* SIDE CARD: OVERALL TARGET PLAN & EDIT */}
        <div className="bg-gradient-to-br from-[#FAF7F2] to-[#F3ECE0] rounded-3xl p-6 shadow-xl border-2 border-[#D8CABA] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-[#7B1113] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-700" /> TOTAL TARGET PLAN
              </span>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#7B1113] text-amber-300 border border-[#580A0B]">
                Admin Editable
              </span>
            </div>

            <div className="my-3">
              <div className="text-xs text-stone-600 font-bold">Target Harian Total:</div>
              <div className="text-3xl sm:text-4xl font-black text-[#181A1F] font-mono mt-1">
                {dailyTargetPlan.toLocaleString('id-ID')} <span className="text-sm font-bold text-stone-600">Ton</span>
              </div>
              <p className="text-[11px] text-stone-600 mt-1">
                Akumulasi target per Job Category di bawah.
              </p>
            </div>

            {isEditingTarget ? (
              <div className="space-y-2 mt-4 pt-3 border-t border-[#D8CABA]">
                <label className="block text-[10px] font-bold text-stone-700">Ubah Target Global (Ton):</label>
                <input
                  type="number"
                  value={tempTarget}
                  onChange={(e) => setTempTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D6C7B2] rounded-xl text-xs font-mono font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                  placeholder="Masukkan target..."
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveTarget}
                    className="flex-1 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Simpan
                  </button>
                  <button
                    onClick={() => setIsEditingTarget(false)}
                    className="py-1.5 px-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              currentUser?.role !== 'VIEWER' && currentUser?.role !== 'PENGAWAS' && (
                <button
                  onClick={() => {
                    setTempTarget(dailyTargetPlan.toString());
                    setIsEditingTarget(true);
                  }}
                  className="mt-4 w-full py-3 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] text-amber-300 font-black text-xs shadow-md cursor-pointer border border-[#580A0B] flex items-center justify-center gap-1.5 transition-all transform hover:scale-101"
                >
                  <Edit3 className="w-4 h-4" /> Ubah Target Global
                </button>
              )
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#D8CABA] flex items-center justify-between text-xs text-stone-700 font-bold">
            <span>Status Pencapaian:</span>
            <strong className={`font-mono text-sm px-2.5 py-0.5 rounded-lg ${totalProduksiToday >= dailyTargetPlan ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
              {dailyTargetPlan > 0 ? Math.round((totalProduksiToday / dailyTargetPlan) * 100) : 0}% Tercapai
            </strong>
          </div>
        </div>
      </div>

      {/* GRID KPI CARD LAINNYA (VIBRANT ACCENTS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#FAF7F2] to-[#F3ECE0] p-5 rounded-2xl border-2 border-[#E2D7C5] shadow-md flex flex-col justify-between border-t-4 border-t-[#7B1113]">
          <div>
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#181A1F]">Total Ritase Hari Ini</span>
              <Truck className="w-4 h-4 text-[#7B1113]" />
            </div>
            <div className="text-3xl font-black text-[#181A1F] font-mono">
              {totalRitaseToday.toLocaleString('id-ID')} <span className="text-xs font-bold text-stone-600">Rit</span>
            </div>
            <p className="text-[11px] text-stone-600 mt-1">Jumlah trip pengangkutan muatan</p>
          </div>
          <div className="mt-4 pt-2 border-t border-[#E2D7C5] text-[11px] text-stone-700 font-bold flex items-center justify-between">
            <span>Rata-rata Kapasitas:</span>
            <span className="font-mono text-[#7B1113] bg-rose-100 px-2 py-0.5 rounded border border-rose-200">{totalRitaseToday > 0 ? Math.round(totalProduksiToday / totalRitaseToday) : 0} Ton/rit</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#FAF7F2] to-[#F3ECE0] p-5 rounded-2xl border-2 border-[#E2D7C5] shadow-md flex flex-col justify-between border-t-4 border-t-amber-600">
          <div>
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#181A1F]">Total Checker Aktif</span>
              <UserCheck className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-3xl font-black text-[#181A1F] font-mono">
              {activeCheckersToday.length} <span className="text-xs font-bold text-stone-600">Checker</span>
            </div>
            <p className="text-[11px] text-stone-600 mt-1 truncate">
              {activeCheckersToday.length > 0 ? activeCheckersToday.join(', ') : 'Belum ada checker aktif'}
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-[#E2D7C5] text-[11px] text-stone-700 font-bold flex items-center justify-between">
            <span>Kehadiran Lapangan:</span>
            <span className="font-mono text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">Aktif Hari Ini</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#FAF7F2] to-[#F3ECE0] p-5 rounded-2xl border-2 border-[#E2D7C5] shadow-md flex flex-col justify-between border-t-4 border-t-emerald-600">
          <div>
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#181A1F]">Unit Digger Aktif</span>
              <HardHat className="w-4 h-4 text-emerald-800" />
            </div>
            <div className="text-3xl font-black text-[#181A1F] font-mono">
              {activeDiggersToday.length} <span className="text-xs font-bold text-stone-600">Unit</span>
            </div>
            <p className="text-[11px] text-stone-600 mt-1 truncate">
              {activeDiggersToday.length > 0 ? activeDiggersToday.join(', ') : 'Belum ada unit'}
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-[#E2D7C5] text-[11px] text-stone-700 font-bold flex items-center justify-between">
            <span>Status Armada:</span>
            <span className="font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">Beroperasi Normal</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#FAF7F2] to-[#F3ECE0] p-5 rounded-2xl border-2 border-[#E2D7C5] shadow-md flex flex-col justify-between border-t-4 border-t-indigo-600">
          <div>
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#181A1F]">Unit Hauler (DT) Aktif</span>
              <Truck className="w-4 h-4 text-indigo-800" />
            </div>
            <div className="text-3xl font-black text-[#181A1F] font-mono">
              {activeHaulersToday.length} <span className="text-xs font-bold text-stone-600">Unit</span>
            </div>
            <p className="text-[11px] text-stone-600 mt-1 truncate">
              {activeHaulersToday.length > 0 ? `${activeHaulersToday.length} unit dump truck hauling` : 'Belum ada unit'}
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-[#E2D7C5] text-[11px] text-stone-700 font-bold flex items-center justify-between">
            <span>Checker Bertugas:</span>
            <span className="font-mono text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">{activeCheckersToday.length} Checker</span>
          </div>
        </div>
      </div>

      {/* REKAPITULASI BERDASARKAN KODE LOT / TUMPUKAN (KHUSUS KEGIATAN DENGAN KODE LOT TERISI) */}
      <div className="bg-[#FAF7F2] rounded-3xl p-6 shadow-xs border border-[#E2D7C5] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#7B1113]" />
            <h3 className="text-sm font-black text-[#181A1F] uppercase tracking-wider">
              Rekapitulasi Ritase Berdasarkan Kode Lot / Tumpukan (Kegiatan Terkait) — {dashboardDate}
            </h3>
          </div>
          <span className="text-xs font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-xl border border-amber-300">
            🏷️ Khusus Kegiatan dengan Kode Lot Terisi
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {produksiPerLot.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-stone-400 bg-white rounded-2xl border border-[#E2D7C5]">
              Belum ada data ritase yang mengisi Kode Lot / Tumpukan pada periode ini.
            </div>
          ) : (
            produksiPerLot.map((item) => (
              <div key={item.lot} className="bg-white rounded-2xl p-5 shadow-xs border border-[#E2D7C5] border-t-4 border-t-emerald-700 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 font-black text-xs border border-emerald-300 font-mono">
                      🏷️ {item.lot}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-stone-500">
                      {item.jobCategories.size} Jenis Kegiatan
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 my-3">
                    <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#D8CABA]">
                      <span className="text-[10px] text-stone-500 font-bold uppercase">Jumlah Ritase</span>
                      <div className="text-xl font-black text-[#181A1F] font-mono mt-0.5">
                        {item.ritase.toLocaleString('id-ID')} <span className="text-xs font-semibold">Rit</span>
                      </div>
                    </div>

                    <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#D8CABA]">
                      <span className="text-[10px] text-stone-500 font-bold uppercase">Total Produksi</span>
                      <div className="text-xl font-black text-emerald-800 font-mono mt-0.5">
                        {item.produksi.toLocaleString('id-ID')} <span className="text-xs font-semibold">Ton</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-600 font-semibold flex items-center justify-between">
                    <span>Total Bucket: <strong className="font-mono text-[#181A1F]">{item.bucket.toLocaleString('id-ID')} bkt</strong></span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* GRAFIK VISUALISASI RECHARTS TREN PRODUKSI PER JAM */}
      <div className="bg-gradient-to-br from-white via-[#FAF7F2] to-[#F5EFE6] rounded-3xl p-6 shadow-xl border-2 border-[#E2D7C5] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2D7C5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7B1113] text-amber-300 flex items-center justify-center shadow-md">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#181A1F] uppercase tracking-wider">
                GRAFIK TREN PRODUKSI & RITASE PER JAM (RECHARTS)
              </h3>
              <p className="text-xs text-stone-600">
                Visualisasi produktivitas per jam untuk Job Category: <strong className="text-[#7B1113] font-bold">{selectedHourlyJobCategory}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedHourlyJobCategory}
              onChange={(e) => setSelectedHourlyJobCategory(e.target.value)}
              className="px-3.5 py-2 bg-white border-2 border-[#D6C7B2] rounded-xl text-xs font-black text-[#181A1F] focus:outline-none focus:border-[#7B1113] shadow-xs cursor-pointer"
            >
              {allJobCategories.map((j) => (
                <option key={j.id} value={j.nama_kegiatan}>
                  {j.nama_kegiatan}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full h-[320px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={[...hourlyDayShift, ...hourlyNightShift]} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2D7C5" vertical={false} />
              <XAxis 
                dataKey="slot" 
                tick={{ fill: '#444', fontSize: 11, fontWeight: 'bold' }} 
                stroke="#D6C7B2"
                angle={-30}
                textAnchor="end"
                height={40}
              />
              <YAxis 
                tick={{ fill: '#444', fontSize: 11, fontWeight: 'bold' }} 
                stroke="#D6C7B2" 
                unit=" Ton"
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#14161B', borderColor: '#7B1113', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                formatter={(value: any, name: any) => [
                  `${Number(value).toLocaleString('id-ID')} Ton`,
                  name === 'actual' ? 'Produksi Aktual' : 'Target per Jam'
                ]}
                labelStyle={{ color: '#FCD34D', fontWeight: 'bold', marginBottom: '4px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />
              <Bar dataKey="actual" name="Produksi Aktual (Ton)" fill="#7B1113" radius={[6, 6, 0, 0]} maxBarSize={45} />
              <Line type="monotone" dataKey="target" name="Target per Jam (Ton)" stroke="#D97706" strokeWidth={3} dot={{ r: 4, fill: '#D97706' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* INDEPENDENT EYE-CATCHING CARDS PER JOB CATEGORY */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#7B1113]" />
            <h3 className="text-sm font-black text-[#181A1F] uppercase tracking-wider">
              TARGET & PRODUKSI PER CARD JOB CATEGORY — {dashboardDate}
            </h3>
          </div>
        </div>

        {currentUser?.role === 'ADMIN' && hiddenJobCategories.length > 0 && (
          <div className="bg-amber-100 border border-amber-300 p-3 rounded-xl flex items-center justify-between text-xs font-bold text-amber-900">
            <span>Ada {hiddenJobCategories.length} card job yang disembunyikan oleh Admin.</span>
            <button
              onClick={() => setHiddenJobCategories([])}
              className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-amber-800"
            >
              Tampilkan Semua Kembali
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(!allJobCategories || allJobCategories.filter(j => currentUser?.role !== 'ADMIN' || !hiddenJobCategories.includes(j.nama_kegiatan.toUpperCase())).length === 0) ? (
            <div className="col-span-full py-8 text-center text-xs text-stone-400 bg-[#FAF7F2] rounded-2xl border border-[#E2D7C5]">
              Belum ada data Job Categories atau semua card sedang disembunyikan.
            </div>
          ) : (
            allJobCategories
              .filter((job) => currentUser?.role !== 'ADMIN' || !hiddenJobCategories.includes(job.nama_kegiatan.toUpperCase()))
              .map((job) => {
              const jobName = job.nama_kegiatan;
              const targetHarian = jobTargetOverrides[jobName.toUpperCase()] !== undefined
                ? jobTargetOverrides[jobName.toUpperCase()]
                : (job.target_harian || 5000);
              const targetPerJam = Math.round(targetHarian / 24);
              
              // 1. MCR Data for this job
              const mcrForJob = selectedMcrRecords.filter(r => (r.job_category || '').toUpperCase() === jobName.toUpperCase());
              const mcrJobProd = mcrForJob.reduce((acc, curr) => {
                const ton = curr.total_product_tonase > 0
                  ? curr.total_product_tonase
                  : (Number(curr.product) || 0);
                return acc + (Number(ton) || 0);
              }, 0);
              const mcrJobRitase = mcrForJob.reduce((acc, curr) => acc + (Number(curr.ritase) || 0), 0);
              const mcrJobLoaders = Array.from(new Set(mcrForJob.map(r => r.loader))).filter(Boolean);
              const mcrAvgTon = mcrJobRitase > 0 ? (mcrJobProd / mcrJobRitase).toFixed(2) : '0';

              // 2. Checker Data for this job
              const checkerForJob = selectedDateRecords.filter(r => (r.job_category || 'ORE GETTING').toUpperCase() === jobName.toUpperCase());
              const checkerJobProd = checkerForJob.reduce((acc, curr) => acc + (Number(curr.produksi) || 0), 0);
              const checkerJobRitase = checkerForJob.length;
              const checkerJobLoaders = Array.from(new Set(checkerForJob.map(r => r.digger_unit))).filter(Boolean);

              // Active values based on selected dataSource
              const actualProd = dataSource === 'MCR'
                ? mcrJobProd
                : dataSource === 'CHECKER'
                ? checkerJobProd
                : (mcrJobProd + checkerJobProd);

              const actualRitase = dataSource === 'MCR'
                ? mcrJobRitase
                : dataSource === 'CHECKER'
                ? checkerJobRitase
                : (mcrJobRitase + checkerJobRitase);

              const loadersList = dataSource === 'MCR'
                ? mcrJobLoaders
                : dataSource === 'CHECKER'
                ? checkerJobLoaders
                : Array.from(new Set([...mcrJobLoaders, ...checkerJobLoaders]));

              const ach = targetHarian > 0 ? Math.round((actualProd / targetHarian) * 100) : 0;
              const isEditing = editingJobName === jobName;

              const borderTopColor = ach >= 100 ? '#059669' : ach >= 75 ? '#D97706' : '#7B1113';
              const badgeTheme = ach >= 100 ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : ach >= 75 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-rose-100 text-rose-900 border-rose-300';

              return (
                <div
                  key={job.id}
                  className="bg-gradient-to-br from-white via-[#FAF7F2] to-[#F5EFE6] rounded-3xl p-6 shadow-lg border-2 border-[#E2D7C5] flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden border-t-4"
                  style={{ borderTopColor }}
                >
                  <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
                    <Layers className="w-36 h-36 text-[#7B1113]" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3.5 py-1.5 rounded-xl bg-[#14161B] text-amber-300 font-black text-xs shadow-sm border border-stone-800 tracking-wide uppercase">
                        {jobName}
                      </span>
                      <span className={`px-3 py-1 rounded-full font-black font-mono text-xs shadow-xs border ${badgeTheme}`}>
                        {ach}% Tercapai
                      </span>
                    </div>

                    {currentUser?.role === 'ADMIN' && (
                      <div className="mb-3 text-right">
                        <button
                          onClick={() => handleToggleHideJob(jobName)}
                          className="text-[10px] text-rose-700 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                        >
                          👁️ Sembunyikan Card Ini
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3.5 my-4">
                      <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-[#D8CABA] shadow-xs">
                        <span className="text-[10px] text-stone-500 font-black uppercase tracking-wider block mb-0.5">Aktual Produksi</span>
                        <div className="text-xl font-black text-emerald-800 font-mono">
                          {actualProd.toLocaleString('id-ID')} <span className="text-xs font-bold text-stone-600">Ton</span>
                        </div>
                        <span className="text-[10px] text-stone-500 font-semibold block mt-0.5">
                          {dataSource === 'MCR' ? '✨ Dari Kolom Product' : `${actualRitase.toLocaleString('id-ID')} Ritase`}
                        </span>
                      </div>

                      <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-[#D8CABA] shadow-xs">
                        <span className="text-[10px] text-stone-500 font-black uppercase tracking-wider block mb-0.5">Target Harian</span>
                        <div className="text-xl font-black text-[#7B1113] font-mono">
                          {targetHarian.toLocaleString('id-ID')} <span className="text-xs font-bold text-stone-600">Ton</span>
                        </div>
                        <span className="text-[10px] text-stone-500 font-semibold block mt-0.5">
                          Target/Jam: {targetPerJam.toLocaleString('id-ID')} T/j
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-stone-700 font-bold space-y-1 px-1 mb-2">
                      <div className="flex items-center justify-between">
                        <span>Total Ritase:</span>
                        <strong className="font-mono text-[#181A1F]">{actualRitase.toLocaleString('id-ID')} Rit</strong>
                      </div>
                      {dataSource === 'MCR' && mcrJobRitase > 0 && (
                        <div className="flex items-center justify-between text-emerald-700 font-semibold text-[10px]">
                          <span>Nilai Product/Rit:</span>
                          <strong className="font-mono">{mcrAvgTon} Ton/Rit</strong>
                        </div>
                      )}
                      {loadersList.length > 0 && (
                        <div className="flex items-center justify-between text-stone-600 text-[10px]">
                          <span>Loader:</span>
                          <span className="font-mono font-bold text-[#7B1113] truncate max-w-[150px]">
                            {loadersList.slice(0, 3).join(', ')}{loadersList.length > 3 ? ` +${loadersList.length - 3}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-stone-700 font-bold flex items-center justify-between px-1 mb-2">
                      <span>Target Per Jam: <strong className="font-mono text-[#181A1F]">{targetPerJam.toLocaleString('id-ID')} Ton/jam</strong></span>
                    </div>

                    {isEditing ? (
                      <div className="mt-4 pt-3 border-t border-[#D8CABA] space-y-2.5">
                        <label className="block text-[10px] font-black uppercase text-stone-700">Ubah Target Harian {jobName}:</label>
                        <input
                          type="number"
                          value={tempJobTarget}
                          onChange={(e) => setTempJobTarget(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border-2 border-[#D6C7B2] rounded-xl text-xs font-mono font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113] shadow-inner"
                          placeholder="Target Ton"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveJobTarget(jobName)}
                            className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black cursor-pointer flex items-center justify-center gap-1 shadow-md"
                          >
                            <Check className="w-3.5 h-3.5" /> Simpan Target
                          </button>
                          <button
                            onClick={() => setEditingJobName(null)}
                            className="py-2 px-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      currentUser?.role !== 'VIEWER' && currentUser?.role !== 'PENGAWAS' && (
                        <button
                          onClick={() => {
                            setEditingJobName(jobName);
                            setTempJobTarget(targetHarian.toString());
                          }}
                          className="mt-3 w-full py-2.5 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] text-amber-300 font-black text-xs cursor-pointer border border-[#580A0B] flex items-center justify-center gap-1.5 shadow-md transition-all transform hover:scale-101"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Ubah Target Card Ini
                        </button>
                      )
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#E2D7C5] w-full">
                    <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden border border-[#D8CABA] shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          ach >= 100 ? 'bg-emerald-600' : ach >= 75 ? 'bg-amber-500' : 'bg-[#7B1113]'
                        }`}
                        style={{ width: `${Math.min(ach, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FILTER TANGGAL DASHBOARD */}
      <div className="bg-[#FAF7F2] rounded-2xl p-4 sm:p-5 shadow-xs border border-[#E2D7C5] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#181A1F] uppercase tracking-wide flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#7B1113]" />
              Filter Periode Analisis Grafik & Statistik
            </h3>
            <p className="text-xs text-stone-600">
              Pilih rentang waktu untuk visualisasi produksi per checker, digger, hauler, dan material.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-[#EDE4D5] p-1.5 rounded-xl border border-[#E2D7C5]">
            {(
              [
                { id: 'today', label: 'Hari Ini' },
                { id: 'yesterday', label: 'Kemarin' },
                { id: '7days', label: '7 Hari' },
                { id: 'month', label: 'Bulan Ini' },
                { id: 'custom', label: 'Custom' }
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilterPreset(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterPreset === btn.id
                    ? 'bg-[#7B1113] text-[#FAF7F2] shadow-xs'
                    : 'text-[#181A1F] hover:text-[#7B1113] hover:bg-[#F5ECE0]'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {filterPreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#E2D7C5] text-xs">
            <span className="font-bold text-stone-700">Rentang Tanggal:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 bg-[#FAF7F2] border border-[#E2D7C5] rounded-lg text-xs focus:outline-none focus:border-[#7B1113]"
            />
            <span className="text-stone-500">s/d</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 bg-[#FAF7F2] border border-[#E2D7C5] rounded-lg text-xs focus:outline-none focus:border-[#7B1113]"
            />
          </div>
        )}

        <div className="bg-[#F3ECE0] rounded-xl p-3 border border-[#E2D7C5] grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-stone-600 font-semibold">Total Ritase Terfilter:</span>
            <div className="text-lg font-black text-[#7B1113] font-mono mt-0.5">
              {totalRitaseFiltered} Rit
            </div>
          </div>
          <div>
            <span className="text-stone-600 font-semibold">Total Produksi Terfilter:</span>
            <div className="text-lg font-black text-[#181A1F] font-mono mt-0.5">
              {totalProduksiFiltered.toLocaleString('id-ID')} Ton
            </div>
          </div>
          <div>
            <span className="text-stone-600 font-semibold">Total Bucket Terfilter:</span>
            <div className="text-lg font-black text-[#181A1F] font-mono mt-0.5">
              {totalBucketFiltered} Bucket
            </div>
          </div>
        </div>
      </div>

      {/* Mode Presentasi MCR (Jam Besar & Fullscreen Display) */}
      <McrPresentationModal
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        activeDataset={mcrRecords}
        selectedDate={dashboardDate}
        onChangeDate={setDashboardDate}
        selectedShift={activeShiftFilter === 'SHIFT 1' ? 'DAY' : activeShiftFilter === 'SHIFT 2' ? 'NIGHT' : 'ALL'}
        onChangeShift={(s) => setActiveShiftFilter(s === 'DAY' ? 'SHIFT 1' : s === 'NIGHT' ? 'SHIFT 2' : 'ALL')}
        distinctDates={distinctMcrDates}
        distinctShifts={['DAY', 'NIGHT']}
        currentUser={currentUser}
      />
    </div>
  );
};
