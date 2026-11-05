import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Filter,
  ArrowRight,
  Database,
  Trash2,
  RefreshCw,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Download,
  Tv,
  Clock,
  Maximize2,
  Calendar,
  Edit3,
  Check,
  X,
  Flame,
  AlertTriangle,
  Truck,
  HardHat,
  Trophy,
  Zap,
  BarChart3
} from 'lucide-react';
import { McrRecord, User } from '../types';
import { api } from '../services/api';
import { McrPresentationModal } from './McrPresentationModal';

interface FormInputMcrProps {
  currentUser: User | null;
  mcrRecords: McrRecord[];
  onRefreshMcr: () => Promise<void>;
  onNavigateToDashboard: () => void;
}

export const FormInputMcr: React.FC<FormInputMcrProps> = ({
  currentUser,
  mcrRecords,
  onRefreshMcr,
  onNavigateToDashboard
}) => {
  const [activeInputMode, setActiveInputMode] = useState<'upload' | 'preset' | 'paste'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Staged / newly parsed records before saving, or display currently saved records
  const [stagedRecords, setStagedRecords] = useState<McrRecord[] | null>(null);
  const [rawPastedText, setRawPastedText] = useState('');

  // Table & calculation filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState('ALL');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);

  // Target overrides synced with localStorage
  const [jobTargetOverrides, setJobTargetOverrides] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('ktu_job_target_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [editingJobName, setEditingJobName] = useState<string | null>(null);
  const [tempTargetInput, setTempTargetInput] = useState<string>('');

  const isAdmin = currentUser?.role === 'ADMIN';

  const defaultJobTargets: Record<string, number> = {
    'ORE GETTING': 350000,
    'FEEDING': 250000,
    'CATCHING': 250000,
    'SUPPLY JETTY': 220000,
    'STOCK CBX': 150000,
    'SUPPLY ICA': 120000,
    'DIRECT CATCHING': 50000
  };

  const getTargetForJob = (jobName: string): number => {
    const upper = jobName.trim().toUpperCase();
    if (jobTargetOverrides[upper] !== undefined && jobTargetOverrides[upper] > 0) {
      return jobTargetOverrides[upper];
    }
    if (defaultJobTargets[upper]) {
      return defaultJobTargets[upper];
    }
    return 100000;
  };

  const handleSaveTargetOverride = (jobName: string, val: number) => {
    if (!isAdmin) return;
    const upper = jobName.trim().toUpperCase();
    const updated = { ...jobTargetOverrides, [upper]: val };
    setJobTargetOverrides(updated);
    try {
      localStorage.setItem('ktu_job_target_overrides', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Error saving target override:', e);
    }
    setEditingJobName(null);
  };

  // The active dataset to show: staged if user just uploaded, or existing server records
  const activeDataset: McrRecord[] = stagedRecords || mcrRecords;

  // Distinct values for filter dropdowns
  const distinctJobCategories = useMemo(() => {
    return Array.from(new Set(activeDataset.map((r) => r.job_category).filter(Boolean))).sort();
  }, [activeDataset]);

  const distinctDates = useMemo(() => {
    return Array.from(new Set(activeDataset.map((r) => r.tanggal).filter(Boolean))).sort((a, b) => {
      const getDay = (str: string) => {
        const d = parseInt(str.split('-')[0], 10);
        return isNaN(d) ? 0 : d;
      };
      return getDay(a) - getDay(b);
    });
  }, [activeDataset]);

  const distinctShifts = useMemo(() => {
    return Array.from(new Set(activeDataset.map((r) => r.shift).filter(Boolean))).sort();
  }, [activeDataset]);

  // Dataset filtered by Date and Shift specifically for Job Category calculation cards
  const summaryDataset = useMemo(() => {
    return activeDataset.filter((r) => {
      if (selectedDateFilter !== 'ALL' && (r.tanggal || '').trim().toLowerCase() !== selectedDateFilter.trim().toLowerCase()) {
        return false;
      }
      if (selectedShiftFilter !== 'ALL' && (r.shift || '').trim().toUpperCase() !== selectedShiftFilter.trim().toUpperCase()) {
        return false;
      }
      return true;
    });
  }, [activeDataset, selectedDateFilter, selectedShiftFilter]);

  // Aggregate stats per Job Category based on Date & Shift filtered summaryDataset
  const summaryPerJobCategory = useMemo(() => {
    const map = new Map<
      string,
      { count: number; totalRitase: number; totalTonase: number; loaders: Set<string> }
    >();

    summaryDataset.forEach((r) => {
      const job = (r.job_category || 'UNASSIGNED').toUpperCase();
      const prev = map.get(job) || {
        count: 0,
        totalRitase: 0,
        totalTonase: 0,
        loaders: new Set<string>()
      };
      prev.count += 1;
      prev.totalRitase += Number(r.ritase) || 0;
      // Tonase taken directly from Product column (or total_product_tonase if summary query)
      const rowTonase =
        r.total_product_tonase > 0
          ? r.total_product_tonase
          : (Number(r.product) || 0);
      prev.totalTonase += Number(rowTonase) || 0;
      if (r.loader) prev.loaders.add(r.loader);
      map.set(job, prev);
    });

    return Array.from(map.entries())
      .map(([job, stat]) => ({
        job,
        count: stat.count,
        totalRitase: stat.totalRitase,
        totalTonase: Number(stat.totalTonase.toFixed(2)),
        loaderCount: stat.loaders.size,
        avgTonPerRit:
          stat.totalRitase > 0 ? Number((stat.totalTonase / stat.totalRitase).toFixed(2)) : 0
      }))
      .sort((a, b) => b.totalTonase - a.totalTonase);
  }, [summaryDataset]);

  const totalTonnageAll = useMemo(() => {
    return summaryPerJobCategory.reduce((acc, curr) => acc + curr.totalTonase, 0);
  }, [summaryPerJobCategory]);

  const totalRitaseAll = useMemo(() => {
    return summaryPerJobCategory.reduce((acc, curr) => acc + curr.totalRitase, 0);
  }, [summaryPerJobCategory]);

  // Aggregate stats per Digger (Loader / Excavator)
  const summaryPerDigger = useMemo(() => {
    const map = new Map<
      string,
      { count: number; totalRitase: number; totalTonase: number; type: string; jobs: Set<string> }
    >();

    summaryDataset.forEach((r) => {
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
  }, [summaryDataset]);

  // Aggregate stats per Hauler (Dump Truck / DT)
  const summaryPerHauler = useMemo(() => {
    const map = new Map<
      string,
      { count: number; totalRitase: number; totalTonase: number; type: string; loaders: Set<string> }
    >();

    summaryDataset.forEach((r) => {
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
  }, [summaryDataset]);

  // Filtered rows for preview table
  const filteredRecords = useMemo(() => {
    return activeDataset.filter((r) => {
      if (selectedJobFilter !== 'ALL' && (r.job_category || '').toUpperCase() !== selectedJobFilter.toUpperCase()) {
        return false;
      }
      if (selectedDateFilter !== 'ALL' && (r.tanggal || '') !== selectedDateFilter) {
        return false;
      }
      if (selectedShiftFilter !== 'ALL' && (r.shift || '').toUpperCase() !== selectedShiftFilter.toUpperCase()) {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          (r.job_category || '').toLowerCase().includes(q) ||
          (r.loader || '').toLowerCase().includes(q) ||
          (r.blok || '').toLowerCase().includes(q) ||
          (r.tanggal || '').toLowerCase().includes(q) ||
          (r.shift || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [activeDataset, selectedJobFilter, selectedDateFilter, selectedShiftFilter, searchTerm]);

  // Pagination
  const totalPages = Math.max(Math.ceil(filteredRecords.length / pageSize), 1);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Universal parser for CSV / TSV / Rows
  const parseRowsToMcrRecords = (rows: any[], sourceName: string): McrRecord[] => {
    if (!rows || rows.length === 0) return [];

    // Detect header row if rows are array of arrays
    let headers: string[] = [];
    let dataRows: any[] = [];

    if (Array.isArray(rows[0])) {
      headers = rows[0].map((h: any) => String(h || '').trim());
      dataRows = rows.slice(1);
    } else if (typeof rows[0] === 'object') {
      headers = Object.keys(rows[0]);
      dataRows = rows;
    }

    // Helper to find column index by potential names (normalizing whitespace/newlines)
    const norm = (s: any) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const findColKey = (keys: string[]): string | number => {
      for (const k of keys) {
        const target = norm(k);
        if (Array.isArray(rows[0])) {
          const idx = headers.findIndex((h) => norm(h) === target);
          if (idx !== -1) return idx;
        } else {
          const found = headers.find((h) => norm(h) === target);
          if (found) return found;
        }
      }
      return -1;
    };

    const jobCol = findColKey(['job category', 'jobcategory', 'job_category', 'kegiatan']);
    const prodCol = findColKey(['product', 'tonase', 'prod', 'total product']);
    const tglCol = findColKey(['tanggal', 'date', 'tgl']);
    const shiftCol = findColKey(['shift']);
    const loaderCol = findColKey(['loader', 'digger', 'unit loader']);
    const haulerCol = findColKey(['hauler', 'dt', 'dump truck', 'unit hauler', 'unit dt']);
    const typeLoaderCol = findColKey(['type loader', 'model loader', 'typeloader', 'model']);
    const typeHaulerCol = findColKey(['type hauler', 'model hauler', 'typehauler']);
    const blokCol = findColKey(['blok', 'pit', 'location', 'lokasi', 'from']);
    const ritCol = findColKey(['ritase', 'rit', 'total ritase']);
    const totalProdCol = findColKey(['total_product_tonase', 'total product tonase', 'total tonase', 'produksi']);
    const payloadCol = findColKey(['total_payload_dt', 'total payload dt', 'payload dt', 'payload']);
    const tripCol = findColKey(['trip_count', 'trip count', 'trip', 'trips']);

    const results: McrRecord[] = [];

    dataRows.forEach((row, idx) => {
      const getVal = (col: string | number) => {
        if (col === -1 || col === undefined) return '';
        if (typeof col === 'number') return row[col] !== undefined ? String(row[col]).trim() : '';
        return row[col] !== undefined ? String(row[col]).trim() : '';
      };

      const jobCategory = getVal(jobCol) || 'UNASSIGNED';
      if (!jobCategory || jobCategory.toLowerCase() === 'job category') return; // skip header repeat

      const product = parseFloat(getVal(prodCol)) || 0;
      const tanggal = getVal(tglCol) || '1-Oct';
      const shift = (getVal(shiftCol) || 'DAY').toUpperCase();
      const loader = getVal(loaderCol) || '-';
      const hauler = getVal(haulerCol) || '-';
      const typeLoader = getVal(typeLoaderCol) || '';
      const typeHauler = getVal(typeHaulerCol) || '';
      const blok = getVal(blokCol) || '-';
      const ritase = parseFloat(getVal(ritCol)) || 0;
      const rawTotalProd = parseFloat(getVal(totalProdCol));
      // In raw query files (like Book1), column 'Product' IS the total transaction tonnage of that row.
      // In summary query files, column 'Total_Product_Tonase' is present.
      const totalProductTonase = !isNaN(rawTotalProd) && rawTotalProd > 0
        ? rawTotalProd
        : product;
      const totalPayloadDt = parseFloat(getVal(payloadCol)) || 0;
      const tripCount = parseInt(getVal(tripCol), 10) || Math.round(ritase);

      results.push({
        id: `MCR-${Date.now().toString().slice(-6)}-${idx + 1}`,
        job_category: jobCategory.toUpperCase(),
        product,
        tanggal,
        shift,
        loader,
        hauler,
        type_loader: typeLoader,
        type_hauler: typeHauler,
        blok,
        ritase,
        total_product_tonase: totalProductTonase,
        total_payload_dt: totalPayloadDt,
        trip_count: tripCount,
        created_at: new Date().toISOString(),
        source: sourceName
      });
    });

    return results;
  };

  // Handle file drop / upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage({ type: 'info', text: `Membaca file ${file.name}...` });

    const reader = new FileReader();

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const workbook = XLSX.read(text, { type: 'string' });
          const sheetName = workbook.SheetNames[0];
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
          const parsed = parseRowsToMcrRecords(rows, file.name);

          if (parsed.length === 0) {
            setStatusMessage({ type: 'error', text: 'Tidak ada baris data valid yang terdeteksi dalam file.' });
          } else {
            setStagedRecords(parsed);
            setCurrentPage(1);
            setStatusMessage({
              type: 'success',
              text: `Berhasil mem-parsing ${parsed.length.toLocaleString('id-ID')} baris data MCR dari ${file.name}. Klik "Simpan ke Database" untuk menerapkan ke sistem.`
            });
          }
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: `Gagal membaca file CSV: ${err.message}` });
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    } else {
      // Excel binary (.xlsx, .xls)
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
          const parsed = parseRowsToMcrRecords(rows, file.name);

          if (parsed.length === 0) {
            setStatusMessage({ type: 'error', text: 'Tidak ada baris data valid yang terdeteksi dalam file Excel.' });
          } else {
            setStagedRecords(parsed);
            setCurrentPage(1);
            setStatusMessage({
              type: 'success',
              text: `Berhasil mem-parsing ${parsed.length.toLocaleString('id-ID')} baris data MCR dari ${file.name}. Klik "Simpan ke Database" untuk menerapkan ke sistem.`
            });
          }
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: `Gagal membaca file Excel: ${err.message}` });
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Handle Preset Loading
  const handleLoadPreset = async (fileName: string, label: string) => {
    setIsProcessing(true);
    setStatusMessage({ type: 'info', text: `Mengunduh dan memproses ${label}...` });
    try {
      const res = await fetch(`/assets/aistudio/${fileName}`);
      if (!res.ok) throw new Error('File preset tidak ditemukan di server.');
      const text = await res.text();
      const workbook = XLSX.read(text, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
      const parsed = parseRowsToMcrRecords(rows, fileName);

      if (parsed.length === 0) {
        throw new Error('Data dalam file kosong');
      }

      setStagedRecords(parsed);
      setCurrentPage(1);
      try {
        await api.saveMcrRecords(parsed, true, currentUser?.id, currentUser?.name);
        await onRefreshMcr();
        setStatusMessage({
          type: 'success',
          text: `Berhasil memuat dan menerapkan ${label} (${parsed.length.toLocaleString('id-ID')} baris) langsung ke database & Dashboard!`
        });
      } catch (saveErr) {
        setStatusMessage({
          type: 'success',
          text: `Berhasil mem-parsing preset ${label} (${parsed.length.toLocaleString('id-ID')} baris). Klik "Simpan ke Database" untuk menyimpan permanen.`
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Gagal memuat preset: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Pasted Text Parsing
  const handleProcessPastedText = () => {
    if (!rawPastedText.trim()) {
      setStatusMessage({ type: 'error', text: 'Silakan tempel teks query terlebih dahulu.' });
      return;
    }

    setIsProcessing(true);
    try {
      const workbook = XLSX.read(rawPastedText, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
      const parsed = parseRowsToMcrRecords(rows, 'Pasted Text');

      if (parsed.length === 0) {
        setStatusMessage({ type: 'error', text: 'Format teks tidak dikenali. Pastikan menyertakan baris header query.' });
      } else {
        setStagedRecords(parsed);
        setCurrentPage(1);
        setStatusMessage({
          type: 'success',
          text: `Berhasil mem-parsing ${parsed.length.toLocaleString('id-ID')} baris data query MCR. Klik "Simpan ke Database" untuk menerapkan ke sistem.`
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Gagal mem-parsing teks: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save to backend database
  const handleSaveToDatabase = async () => {
    if (!stagedRecords || stagedRecords.length === 0) {
      alert('Tidak ada data baru yang siap disimpan.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await api.saveMcrRecords(
        stagedRecords,
        true,
        currentUser?.id,
        currentUser?.name
      );
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Selamat! ${res.count.toLocaleString('id-ID')} baris data query MCR berhasil disimpan permanen ke server database.`
        });
        setStagedRecords(null);
        await onRefreshMcr();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Gagal menyimpan ke server: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Sync to Checker Ritase
  const handleSyncToRitase = async () => {
    const confirmSync = confirm(
      'Apakah Anda ingin menyinkronkan data MCR ini ke Data Ritase Checker Lapangan?\n\nSetiap baris MCR akan dikonversi menjadi entri ritase resmi.'
    );
    if (!confirmSync) return;

    setIsProcessing(true);
    try {
      const res = await api.syncMcrToRitase(currentUser?.id, currentUser?.name);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Berhasil menyinkronkan ${res.addedCount.toLocaleString('id-ID')} data MCR ke Data Ritase Checker!`
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Gagal sinkronisasi: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset / Clear MCR Data
  const handleClearMcr = async () => {
    const confirmClear = prompt('Ketik "RESET" untuk menghapus seluruh data query MCR:');
    if (confirmClear !== 'RESET') return;

    setIsProcessing(true);
    try {
      await api.clearMcrRecords(currentUser?.id, currentUser?.name);
      setStagedRecords([]);
      setStatusMessage({ type: 'info', text: 'Seluruh data query MCR berhasil dibersihkan.' });
      await onRefreshMcr();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Gagal membersihkan data MCR: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Export current view to Excel
  const handleExportExcel = () => {
    if (activeDataset.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(
      activeDataset.map((r) => ({
        'Job Category': r.job_category,
        Product: r.product,
        Tanggal: r.tanggal,
        Shift: r.shift,
        Loader: r.loader,
        Blok: r.blok,
        Ritase: r.ritase,
        'Total Product Tonase': r.total_product_tonase,
        'Total Payload DT': r.total_payload_dt || 0,
        'Trip Count': r.trip_count || 0
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Query_MCR');
    XLSX.writeFile(wb, `KTU_MCR_Query_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#14161B] via-[#1E222B] to-[#7B1113] rounded-3xl p-6 sm:p-8 shadow-xl border border-[#353A47] text-[#FAF7F2] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-[#7B1113] text-[#FAF7F2] border border-[#A51C1F]">
              <UploadCloud className="w-4 h-4 text-amber-300" /> INPUT BY MCR (MINING CONTROL ROOM)
            </span>
            <span className="text-xs text-amber-200/90 font-bold">Query Integration</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2 drop-shadow-sm">
            Import & Rekapitulasi Query Data MCR
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
            Upload file query ritase MCR (CSV/Excel). Tonnage dihitung dan diambil langsung dari kolom{' '}
            <strong className="text-amber-300 font-mono">Product</strong> untuk menyesuaikan kalkulasi aktual per Job
            Category di Dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={() => setIsPresentationOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#7B1113] hover:bg-[#5E0B0C] text-amber-300 font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer border border-[#A51C1F] transform hover:scale-102"
          >
            <Tv className="w-4 h-4" />
            <span>MODE PRESENT (JAM BESAR)</span>
          </button>

          <button
            onClick={onNavigateToDashboard}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#14161B] font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer border border-amber-500 transform hover:scale-102"
          >
            <span>LIHAT DASHBOARD</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 text-xs font-semibold shadow-xs transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : 'bg-indigo-50 text-indigo-900 border-indigo-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">{statusMessage.text}</div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-stone-400 hover:text-stone-700 cursor-pointer text-xs"
          >
            &times;
          </button>
        </div>
      )}

      {/* Input Selection Tabs */}
      <div className="bg-[#FAF7F2] rounded-3xl p-6 shadow-xs border border-[#E2D7C5] space-y-6">
        <div className="flex items-center justify-between border-b border-[#E2D7C5] pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#181A1F]">Metode Input Data Query:</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#EDE4D5] p-1 rounded-2xl border border-[#D6C7B2]">
            <button
              onClick={() => setActiveInputMode('upload')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeInputMode === 'upload'
                  ? 'bg-[#7B1113] text-[#FAF7F2] shadow-sm'
                  : 'text-stone-700 hover:text-[#7B1113]'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload CSV / Excel</span>
            </button>
            <button
              onClick={() => setActiveInputMode('preset')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeInputMode === 'preset'
                  ? 'bg-[#7B1113] text-[#FAF7F2] shadow-sm'
                  : 'text-stone-700 hover:text-[#7B1113]'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Muat Query Bawaan</span>
            </button>
            <button
              onClick={() => setActiveInputMode('paste')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeInputMode === 'paste'
                  ? 'bg-[#7B1113] text-[#FAF7F2] shadow-sm'
                  : 'text-stone-700 hover:text-[#7B1113]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Paste Teks Query</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Upload File */}
        {activeInputMode === 'upload' && (
          <div className="space-y-4">
            <label className="border-2 border-dashed border-[#C5B7A3] hover:border-[#7B1113] rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center gap-3 text-center cursor-pointer bg-white/70 hover:bg-white transition-all group shadow-xs">
              <input
                type="file"
                accept=".csv, .xlsx, .xls, .txt"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-[#7B1113] flex items-center justify-center group-hover:scale-110 transition-transform">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <span className="text-sm font-black text-[#181A1F] block">
                  Klik untuk pilih file atau seret file query ke sini
                </span>
                <span className="text-xs text-stone-500 mt-1 block">
                  Mendukung format .CSV, .XLSX, dan .XLS hasil export database MCR
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold bg-[#EDE4D5] text-[#181A1F] border border-[#D6C7B2]">
                Kolom terdeteksi otomatis: Job Category, Product, Tanggal, Shift, Loader, Blok, Ritase...
              </span>
            </label>
          </div>
        )}

        {/* Tab 2: Preset Files */}
        {activeInputMode === 'preset' && (
          <div className="space-y-4">
            <p className="text-xs text-stone-600 font-semibold">
              Pilih salah satu file query bawaan yang sudah tersedia di server untuk dimuat secara instan:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Preset 1: Book1 (27-Oct) */}
              <div className="bg-white p-5 rounded-2xl border-2 border-emerald-600 hover:border-[#7B1113] transition-all flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-black text-[10px] border border-emerald-300">
                      QUERY 27-OKT (BOOK 1)
                    </span>
                    <span className="text-[11px] font-mono text-stone-500 font-bold">1,735 Baris</span>
                  </div>
                  <h4 className="text-sm font-black text-[#181A1F]">
                    Query Harian 27-Oct (Book1.csv)
                  </h4>
                  <p className="text-xs text-stone-600 mt-1">
                    Data transaksi riil tanggal 27-Oct dari Book1: ORE GETTING (10.121,99 Ton, 426 Rit), FEEDING (15.914,82 Ton, 660 Rit), CATCHING (9.059,62 Ton), SUPPLY JETTY (6.538,41 Ton).
                  </p>
                  <div className="mt-3 text-[11px] text-emerald-900 font-mono font-semibold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    Total: 1,668 Rit &bull; 42,956.0 Ton Product
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleLoadPreset('Book1_a19ba2da.csv', 'Query Harian 27-Oct (Book1)')
                  }
                  disabled={isProcessing}
                  className="mt-4 w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm border border-emerald-900 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Muat Query 27-Okt (Book 1)
                </button>
              </div>

              {/* Preset 2: Summary 1-24 Okt */}
              <div className="bg-white p-5 rounded-2xl border-2 border-[#E2D7C5] hover:border-[#7B1113] transition-all flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#7B1113] text-amber-300 font-black text-[10px] border border-[#A51C1F]">
                      BULANAN (1-24 OKT)
                    </span>
                    <span className="text-[11px] font-mono text-stone-500 font-bold">2,306 Baris</span>
                  </div>
                  <h4 className="text-sm font-black text-[#181A1F]">
                    Query Summary Bulanan (1-24 Okt)
                  </h4>
                  <p className="text-xs text-stone-600 mt-1">
                    Rekapitulasi 1 bulan penuh (1 s/d 24 Oktober): ORE GETTING (338.480,4 Ton, 14.168 Rit), FEEDING (223.347,4 Ton, 9.138 Rit), dll.
                  </p>
                  <div className="mt-3 text-[11px] text-stone-600 font-mono font-semibold bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7C5]">
                    Total: 43,757 Rit &bull; 1,088,155 Ton Product
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleLoadPreset('query_summary_per_job_category_c500c7b2.csv', 'Query Summary Bulanan (1-24 Okt)')
                  }
                  disabled={isProcessing}
                  className="mt-4 w-full py-2.5 bg-[#7B1113] hover:bg-[#5E0B0C] text-amber-300 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm border border-[#580A0B] flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Muat Summary Bulanan
                </button>
              </div>

              {/* Preset 3: Detail Transaksi */}
              <div className="bg-white p-5 rounded-2xl border-2 border-[#E2D7C5] hover:border-[#7B1113] transition-all flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900 font-black text-[10px] border border-indigo-300">
                      RAW TRANSAKSI
                    </span>
                    <span className="text-[11px] font-mono text-stone-500 font-bold">28,731 Baris</span>
                  </div>
                  <h4 className="text-sm font-black text-[#181A1F]">
                    Query Detail Transaksi Per Ritase
                  </h4>
                  <p className="text-xs text-stone-600 mt-1">
                    Detail perorangan per ritase DT, Loader, pengawas, dan jarak hauling lengkap.
                  </p>
                  <div className="mt-3 text-[11px] text-stone-600 font-mono font-semibold bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7C5]">
                    Format: Tanggal, Time, Shift, Loader, DT...
                  </div>
                </div>
                <button
                  onClick={() => handleLoadPreset('query_5bc39c69.csv', 'Query Detail Transaksi')}
                  disabled={isProcessing}
                  className="mt-4 w-full py-2.5 bg-[#14161B] hover:bg-[#20242D] text-amber-300 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm border border-stone-800 flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Muat Query Raw Ini
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Paste Text */}
        {activeInputMode === 'paste' && (
          <div className="space-y-4">
            <label className="block text-xs font-bold text-stone-700">
              Tempel teks query (format CSV atau Tab-Separated dari Excel/SQL tool):
            </label>
            <textarea
              rows={7}
              value={rawPastedText}
              onChange={(e) => setRawPastedText(e.target.value)}
              placeholder="Job Category,Product,Tanggal,Shift,Loader,Blok,Ritase,Total_Product_Tonase,Total_Payload_DT,Trip_Count&#10;BARGING,21.54,1-Oct,NIGHT,B 23,BLOK UTARA,3.0,64.62,64.62,3&#10;..."
              className="w-full p-4 bg-white border border-[#D6C7B2] rounded-2xl text-xs font-mono text-[#181A1F] focus:outline-none focus:border-[#7B1113] leading-relaxed"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleProcessPastedText}
                disabled={isProcessing || !rawPastedText.trim()}
                className="px-6 py-2.5 bg-[#7B1113] hover:bg-[#5E0B0C] text-amber-300 font-black text-xs rounded-xl shadow-sm cursor-pointer border border-[#580A0B] flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Proses & Parse Teks Query</span>
              </button>
              <button
                onClick={() => setRawPastedText('')}
                className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Kosongkan
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KPI METRIC CARDS OF CURRENT LOADED / STAGED MCR DATA */}
      {activeDataset.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#181A1F] uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#7B1113]" /> RINGKASAN DATA QUERY MCR (BERDASARKAN KOLOM PRODUCT)
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                {stagedRecords
                  ? `⚡ Data baru diparsing (${stagedRecords.length.toLocaleString('id-ID')} baris) — belum disimpan permanen ke database.`
                  : `✅ Data aktif tersimpan di database (${mcrRecords.length.toLocaleString('id-ID')} baris).`}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {stagedRecords && (
                <button
                  onClick={handleSaveToDatabase}
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-md cursor-pointer border border-emerald-900 flex items-center gap-2 transition-all"
                >
                  <Database className="w-4 h-4" />
                  <span>SIMPAN KE DATABASE SERVER</span>
                </button>
              )}

              <button
                onClick={handleSyncToRitase}
                disabled={isProcessing}
                className="px-4 py-2.5 rounded-xl bg-[#14161B] hover:bg-[#20242D] text-amber-300 font-bold text-xs shadow-sm cursor-pointer border border-stone-800 flex items-center gap-1.5"
                title="Konversi entri MCR ke tabel Data Ritase"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sinkron ke Data Ritase</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#EDE4D5] text-[#181A1F] font-bold text-xs shadow-xs cursor-pointer border border-[#D6C7B2] flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#7B1113]" />
                <span>Export Excel</span>
              </button>

              {currentUser?.role === 'ADMIN' && (
                <button
                  onClick={handleClearMcr}
                  disabled={isProcessing}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs border border-rose-200 cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Data</span>
                </button>
              )}
            </div>
          </div>

          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#181A1F] to-[#242933] text-white p-5 rounded-2xl border-2 border-amber-500/40 shadow-lg">
              <span className="text-[10px] text-stone-400 font-black uppercase tracking-wider block">
                Total Tonase Product (MCR)
              </span>
              <div className="text-3xl font-black text-amber-400 font-mono mt-1">
                {totalTonnageAll.toLocaleString('id-ID')}
              </div>
              <span className="text-xs text-amber-200/90 font-bold mt-1 block">
                TON (Diambil dari Kolom Product)
              </span>
            </div>

            <div className="bg-[#FAF7F2] p-5 rounded-2xl border-2 border-[#E2D7C5] shadow-xs">
              <span className="text-[10px] text-stone-500 font-black uppercase tracking-wider block">
                Total Ritase MCR
              </span>
              <div className="text-3xl font-black text-[#181A1F] font-mono mt-1">
                {totalRitaseAll.toLocaleString('id-ID')}
              </div>
              <span className="text-xs text-stone-600 font-semibold mt-1 block">
                Rata-rata: {totalRitaseAll > 0 ? (totalTonnageAll / totalRitaseAll).toFixed(2) : 0} Ton / Rit
              </span>
            </div>

            <div className="bg-[#FAF7F2] p-5 rounded-2xl border-2 border-[#E2D7C5] shadow-xs">
              <span className="text-[10px] text-stone-500 font-black uppercase tracking-wider block">
                Total Baris Query
              </span>
              <div className="text-3xl font-black text-[#7B1113] font-mono mt-1">
                {activeDataset.length.toLocaleString('id-ID')}
              </div>
              <span className="text-xs text-stone-600 font-semibold mt-1 block">
                {distinctDates.length} Hari Operasional Terdeteksi
              </span>
            </div>

            <div className="bg-[#FAF7F2] p-5 rounded-2xl border-2 border-[#E2D7C5] shadow-xs">
              <span className="text-[10px] text-stone-500 font-black uppercase tracking-wider block">
                Job Categories Terlibat
              </span>
              <div className="text-3xl font-black text-emerald-800 font-mono mt-1">
                {summaryPerJobCategory.length}
              </div>
              <span className="text-xs text-stone-600 font-semibold mt-1 block">
                Kategori Kegiatan Tambang
              </span>
            </div>
          </div>

          {/* Breakdown Per Job Category Cards with Date & Shift Filters and Mode Present */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-[#E2D7C5] space-y-5">
            {/* Header & Filter Controls Bar */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[#E2D7C5]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#7B1113] text-amber-300">
                    <Layers className="w-4 h-4" />
                  </span>
                  <h4 className="text-sm font-black uppercase tracking-wider text-[#181A1F]">
                    Kalkulasi Tonnage & Ritase Per Job Category (Dari Kolom Product)
                  </h4>
                </div>
                <p className="text-xs text-stone-600 mt-1">
                  Kalkulasi tonase diambil langsung dari kolom <strong className="font-mono text-[#7B1113]">Product</strong>. Filter aktif: Tanggal <strong className="text-[#181A1F]">{selectedDateFilter === 'ALL' ? 'Semua' : selectedDateFilter}</strong> &bull; Shift <strong className="text-[#181A1F]">{selectedShiftFilter}</strong> ({totalTonnageAll.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Ton &bull; {totalRitaseAll.toLocaleString('id-ID')} Rit)
                </p>
              </div>

              {/* Filter Controls & Present Mode Button */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Shift Selector */}
                <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#D6C7B2]">
                  <span className="text-[10px] font-bold text-stone-500 px-2 uppercase">Shift:</span>
                  {(['ALL', 'DAY', 'NIGHT'] as const).map((sh) => (
                    <button
                      key={sh}
                      onClick={() => setSelectedShiftFilter(sh)}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        selectedShiftFilter === sh
                          ? 'bg-[#7B1113] text-amber-300 shadow-sm border border-[#580A0B]'
                          : 'text-stone-700 hover:text-[#7B1113]'
                      }`}
                    >
                      {sh === 'ALL' ? 'SEMUA' : sh}
                    </button>
                  ))}
                </div>

                {/* Date Dropdown */}
                <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#D6C7B2]">
                  <Calendar className="w-3.5 h-3.5 text-[#7B1113]" />
                  <select
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-[#181A1F] focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Semua Tanggal MCR</option>
                    {distinctDates.map((d) => (
                      <option key={d} value={d}>
                        Tanggal {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters if active */}
                {(selectedDateFilter !== 'ALL' || selectedShiftFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSelectedDateFilter('ALL');
                      setSelectedShiftFilter('ALL');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold transition-all cursor-pointer"
                    title="Reset Filter"
                  >
                    Reset
                  </button>
                )}

                {/* Big Button: MODE PRESENT (JAM BESAR) */}
                <button
                  onClick={() => setIsPresentationOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#14161B] to-[#7B1113] hover:from-black hover:to-[#5E0B0C] text-amber-300 font-black text-xs shadow-md cursor-pointer border border-[#A51C1F] flex items-center gap-2 transition-all transform hover:scale-102"
                >
                  <Tv className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>MODE PRESENT (JAM BESAR)</span>
                </button>
              </div>
            </div>

            {/* Quick Date Chips Bar if multiple dates exist */}
            {distinctDates.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[10px] font-bold text-stone-400 uppercase shrink-0">Pilih Cepat:</span>
                <button
                  onClick={() => setSelectedDateFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer border ${
                    selectedDateFilter === 'ALL'
                      ? 'bg-[#7B1113] text-amber-300 border-[#580A0B]'
                      : 'bg-[#FAF7F2] text-stone-700 hover:bg-[#EDE4D5] border-[#D6C7B2]'
                  }`}
                >
                  Semua Tanggal
                </button>
                {distinctDates.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDateFilter(d)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 transition-colors cursor-pointer border ${
                      selectedDateFilter === d
                        ? 'bg-[#7B1113] text-amber-300 border-[#580A0B]'
                        : 'bg-[#FAF7F2] text-stone-700 hover:bg-[#EDE4D5] border-[#D6C7B2]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {summaryPerJobCategory.map((item) => {
                const target = getTargetForJob(item.job);
                const achievedPercent = target > 0 ? (item.totalTonase / target) * 100 : 0;
                const isEditingThis = editingJobName === item.job;

                // Color Parameter: >=80% Hijau, 50-79.9% Kuning, <50% Merah
                const paramConfig =
                  achievedPercent >= 80
                    ? {
                        badge: 'text-emerald-700 bg-emerald-100 border border-emerald-300',
                        bar: 'bg-emerald-600',
                        text: 'text-emerald-700'
                      }
                    : achievedPercent >= 50
                    ? {
                        badge: 'text-amber-800 bg-amber-100 border border-amber-300',
                        bar: 'bg-amber-500',
                        text: 'text-amber-800'
                      }
                    : {
                        badge: 'text-rose-800 bg-rose-100 border border-rose-300',
                        bar: 'bg-[#7B1113]',
                        text: 'text-[#7B1113]'
                      };

                return (
                  <div
                    key={item.job}
                    className="bg-[#FAF7F2] p-5 rounded-3xl border border-[#E2D7C5] hover:border-[#7B1113] transition-all flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      {/* Top: Black Pill Badge + Percentage */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-3.5 py-1.5 rounded-xl bg-[#14161B] text-amber-300 font-black text-xs tracking-wider uppercase">
                          {item.job}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-mono font-black ${paramConfig.badge}`}
                          title={`Pencapaian: ${achievedPercent.toFixed(1)}% dari Target`}
                        >
                          {achievedPercent.toFixed(1)}%
                        </span>
                      </div>

                      {/* Target Row (Tambahan Target) */}
                      <div className="flex items-center justify-between text-xs text-stone-600 mb-2">
                        <span className="font-bold text-stone-500 uppercase text-[11px]">Target:</span>
                        <div className="flex items-center gap-1.5">
                          {isEditingThis ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={tempTargetInput}
                                onChange={(e) => setTempTargetInput(e.target.value)}
                                className="w-24 px-1.5 py-0.5 bg-white border border-[#7B1113] rounded font-mono font-bold text-xs"
                                placeholder="Ton"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = Number(tempTargetInput);
                                    if (!isNaN(val) && val > 0) handleSaveTargetOverride(item.job, val);
                                  } else if (e.key === 'Escape') {
                                    setEditingJobName(null);
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  const val = Number(tempTargetInput);
                                  if (!isNaN(val) && val > 0) handleSaveTargetOverride(item.job, val);
                                }}
                                className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingJobName(null)}
                                className="p-1 rounded bg-stone-300 text-stone-800 hover:bg-stone-400 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <strong className="font-mono text-[#181A1F] font-black text-sm">
                                {target.toLocaleString('id-ID')} Ton
                              </strong>
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    setEditingJobName(item.job);
                                    setTempTargetInput(target.toString());
                                  }}
                                  className="p-1 text-stone-400 hover:text-[#7B1113] rounded cursor-pointer transition-colors"
                                  title="Edit Target (Admin Only)"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar To Target */}
                      <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full ${paramConfig.bar} rounded-full transition-all`}
                          style={{ width: `${Math.min(achievedPercent, 100)}%` }}
                        ></div>
                      </div>

                      {/* Total Tonase Product Jumbo */}
                      <div className="my-2">
                        <span className="text-[11px] text-stone-500 font-bold uppercase tracking-wider block">
                          TOTAL TONASE PRODUCT:
                        </span>
                        <div className="text-3xl font-black text-[#7B1113] font-mono mt-1 leading-none">
                          {item.totalTonase.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                          <span className="text-sm font-semibold text-stone-600">Ton</span>
                        </div>
                      </div>

                      {/* Detail 3 Baris: Total Ritase, Rata-rata, Jumlah Loader */}
                      <div className="text-xs text-stone-600 font-semibold space-y-1.5 pt-3 border-t border-[#E2D7C5]">
                        <div className="flex justify-between">
                          <span>Total Ritase:</span>
                          <strong className="font-mono text-[#181A1F]">{item.totalRitase.toLocaleString('id-ID')} Rit</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Rata-rata:</span>
                          <strong className="font-mono text-[#181A1F]">{item.avgTonPerRit} Ton/Rit</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Jumlah Loader:</span>
                          <strong className="font-mono text-[#181A1F]">{item.loaderCount} Unit</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* EYE-CATCHING FLEET SUMMARY: DIGGER & HAULER LEADERBOARD */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-[#E2D7C5] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2D7C5]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-[#14161B] to-[#7B1113] text-amber-300">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-[#181A1F]">
                    Summary Performa Digger & Hauler (Loader & Dump Truck)
                  </h4>
                  <p className="text-xs text-stone-600">
                    Leaderboard produktivitas unit alat berat dan armada pengangkutan dari query MCR terfilter.
                  </p>
                </div>
              </div>

              {/* Quick KPI stats */}
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-[#FAF7F2] border border-[#E2D7C5] text-xs font-bold text-stone-700">
                  🚜 <strong className="text-[#14161B]">{summaryPerDigger.length}</strong> Loader
                </span>
                <span className="px-3 py-1 rounded-xl bg-[#FAF7F2] border border-[#E2D7C5] text-xs font-bold text-stone-700">
                  🚛 <strong className="text-[#14161B]">{summaryPerHauler.length}</strong> Dump Truck
                </span>
              </div>
            </div>

            {/* Split Grid: Digger on Left, Hauler on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* 1. DIGGER / LOADER SECTION */}
              <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#E2D7C5] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#7B1113] text-amber-300">
                      <HardHat className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black uppercase text-[#14161B]">
                        Alat Muat (Digger / Loader)
                      </h5>
                      <span className="text-[10px] text-stone-500 font-semibold">{summaryPerDigger.length} unit beroperasi</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#7B1113]">
                    Total: {summaryPerDigger.reduce((a, c) => a + c.totalTonase, 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Ton
                  </span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {summaryPerDigger.length === 0 ? (
                    <div className="text-center py-6 text-xs text-stone-400">Tidak ada data loader</div>
                  ) : (
                    summaryPerDigger.map((d, idx) => {
                      const pct = totalTonnageAll > 0 ? (d.totalTonase / totalTonnageAll) * 100 : 0;
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

                      return (
                        <div
                          key={d.digger}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            idx === 0
                              ? 'bg-gradient-to-r from-amber-50 to-white border-amber-300 shadow-xs'
                              : 'bg-white border-[#E2D7C5]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <span className="w-6 h-6 rounded-lg bg-[#14161B] text-amber-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                              {medal}
                            </span>
                            <div>
                              <div className="font-black text-xs text-[#181A1F] flex items-center gap-1">
                                <span>{d.digger}</span>
                                {d.type && (
                                  <span className="text-[9px] font-normal text-stone-500 px-1 bg-stone-100 rounded">
                                    {d.type}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-stone-500 block truncate max-w-[120px]">
                                {d.jobs || 'Operasional'}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 hidden sm:block">
                            <div className="flex justify-between text-[10px] text-stone-500 font-semibold mb-0.5">
                              <span>{pct.toFixed(1)}% Kontribusi</span>
                              <span>{d.totalRitase.toLocaleString('id-ID')} Rit</span>
                            </div>
                            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-[#7B1113] rounded-full"
                                style={{ width: `${Math.min(pct * 2.5, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 min-w-[85px]">
                            <div className="text-sm font-black font-mono text-[#7B1113] leading-none">
                              {d.totalTonase.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                              <span className="text-[10px] font-bold text-stone-500">Ton</span>
                            </div>
                            <span className="text-[10px] text-stone-500 font-mono">
                              {d.avgTonPerRit} T/Rit
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 2. HAULER / DUMP TRUCK SECTION */}
              <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#E2D7C5] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-700 text-white">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black uppercase text-[#14161B]">
                        Alat Angkut (Hauler / Dump Truck)
                      </h5>
                      <span className="text-[10px] text-stone-500 font-semibold">{summaryPerHauler.length} unit beroperasi</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-800">
                    Total: {totalRitaseAll.toLocaleString('id-ID')} Rit
                  </span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {summaryPerHauler.length === 0 ? (
                    <div className="text-center py-6 text-xs text-stone-400">Tidak ada data hauler</div>
                  ) : (
                    summaryPerHauler.map((h, idx) => {
                      const pct = totalTonnageAll > 0 ? (h.totalTonase / totalTonnageAll) * 100 : 0;
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

                      return (
                        <div
                          key={h.hauler}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            idx === 0
                              ? 'bg-gradient-to-r from-cyan-50 to-white border-cyan-300 shadow-xs'
                              : 'bg-white border-[#E2D7C5]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <span className="w-6 h-6 rounded-lg bg-[#14161B] text-cyan-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                              {medal}
                            </span>
                            <div>
                              <div className="font-black text-xs text-[#181A1F] flex items-center gap-1">
                                <span>{h.hauler}</span>
                                {h.type && (
                                  <span className="text-[9px] font-normal text-stone-500 px-1 bg-stone-100 rounded truncate max-w-[70px]">
                                    {h.type}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-stone-500 block">
                                Melayani {h.loaderCount} Loader
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 hidden sm:block">
                            <div className="flex justify-between text-[10px] text-stone-500 font-semibold mb-0.5">
                              <span>{h.totalRitase.toLocaleString('id-ID')} Ritase</span>
                              <span>{pct.toFixed(1)}% Vol</span>
                            </div>
                            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                                style={{ width: `${Math.min(pct * 8, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 min-w-[85px]">
                            <div className="text-sm font-black font-mono text-cyan-900 leading-none">
                              {h.totalTonase.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
                              <span className="text-[10px] font-bold text-stone-500">Ton</span>
                            </div>
                            <span className="text-[10px] text-stone-500 font-mono">
                              {h.avgTonPerRit} T/Rit
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Data Table Preview */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-[#E2D7C5] space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#7B1113]" />
                <h4 className="text-xs font-black uppercase tracking-wider text-[#181A1F]">
                  Tabel Preview Baris Query MCR ({filteredRecords.length.toLocaleString('id-ID')} baris)
                </h4>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cari loader, job, blok..."
                    className="pl-8 pr-3 py-1.5 bg-[#FAF7F2] border border-[#D6C7B2] rounded-xl text-xs font-medium text-[#181A1F] focus:outline-none focus:border-[#7B1113] w-48"
                  />
                </div>

                <select
                  value={selectedJobFilter}
                  onChange={(e) => {
                    setSelectedJobFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-[#FAF7F2] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                >
                  <option value="ALL">Semua Job Category</option>
                  {distinctJobCategories.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDateFilter}
                  onChange={(e) => {
                    setSelectedDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-[#FAF7F2] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                >
                  <option value="ALL">Semua Tanggal</option>
                  {distinctDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedShiftFilter}
                  onChange={(e) => {
                    setSelectedShiftFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-[#FAF7F2] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                >
                  <option value="ALL">Semua Shift</option>
                  <option value="DAY">DAY (Shift 1)</option>
                  <option value="NIGHT">NIGHT (Shift 2)</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-[#E2D7C5] rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#E2D7C5] text-stone-600 font-black uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3">No</th>
                    <th className="py-3 px-3">Job Category</th>
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3">Shift</th>
                    <th className="py-3 px-3">Loader</th>
                    <th className="py-3 px-3">Blok / Lokasi</th>
                    <th className="py-3 px-3 text-right">Ritase</th>
                    <th className="py-3 px-3 text-right">Product (Ton/Rit)</th>
                    <th className="py-3 px-3 text-right">Total Product Tonase (Ton)</th>
                    <th className="py-3 px-3 text-right">Trip Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-stone-400">
                        Tidak ada baris data yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r, i) => {
                      const rowNum = (currentPage - 1) * pageSize + i + 1;
                      const isNight = r.shift?.toUpperCase() === 'NIGHT';
                      return (
                        <tr key={r.id || i} className="hover:bg-amber-50/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-stone-500 text-[11px]">{rowNum}</td>
                          <td className="py-2.5 px-3 font-bold text-[#181A1F]">
                            <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-[10px] font-black uppercase">
                              {r.job_category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-stone-700">{r.tanggal}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isNight
                                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                  : 'bg-amber-100 text-amber-900 border border-amber-200'
                              }`}
                            >
                              {r.shift}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-black text-[#7B1113] font-mono">{r.loader}</td>
                          <td className="py-2.5 px-3 text-stone-600">{r.blok}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#181A1F]">
                            {r.ritase.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-stone-700">
                            {r.product > 0 ? r.product.toLocaleString('id-ID') : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-50/50">
                            {r.total_product_tonase.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-stone-500">
                            {r.trip_count || r.ritase}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2 text-xs text-stone-600 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-[#FAF7F2] border border-[#D6C7B2] rounded-lg font-bold text-[#181A1F]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>baris per halaman (Total: {filteredRecords.length.toLocaleString('id-ID')})</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg border border-[#D6C7B2] disabled:opacity-40 cursor-pointer hover:bg-stone-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono font-bold">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-[#D6C7B2] disabled:opacity-40 cursor-pointer hover:bg-stone-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Presentasi MCR (Jam Besar & Fullscreen Display) */}
      <McrPresentationModal
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        activeDataset={activeDataset}
        selectedDate={selectedDateFilter}
        onChangeDate={setSelectedDateFilter}
        selectedShift={selectedShiftFilter}
        onChangeShift={setSelectedShiftFilter}
        distinctDates={distinctDates}
        distinctShifts={distinctShifts}
        currentUser={currentUser}
      />
    </div>
  );
};
