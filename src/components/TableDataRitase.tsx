import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Eye,
  FileSpreadsheet,
  X,
  Check,
  AlertCircle,
  Truck,
  HardHat,
  RotateCcw
} from 'lucide-react';
import { RitaseRecord, User } from '../types';
import { MastersData } from '../services/api';

interface TableDataRitaseProps {
  ritaseList: RitaseRecord[];
  currentUser: User | null;
  masters: MastersData;
  onUpdateRitase: (id: string, record: Partial<RitaseRecord>) => Promise<boolean>;
  onDeleteRitase: (id: string) => Promise<boolean>;
  onNavigateToExport: () => void;
}

type SortField =
  | 'tanggal'
  | 'waktu'
  | 'checker_name'
  | 'digger_unit'
  | 'hauler_unit'
  | 'material'
  | 'kode_lot'
  | 'jumlah_bucket'
  | 'produksi'
  | 'created_at';

// Shift helper: Shift 1 (07:00 - 19:00), Shift 2 (19:00 - 07:00)
const getShiftInfo = (waktu: string) => {
  if (!waktu) return { label: 'Shift 1 (07:00 - 19:00)', code: 'shift1' };
  const [hStr] = waktu.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return { label: 'Shift 1 (07:00 - 19:00)', code: 'shift1' };
  if (h >= 7 && h < 19) {
    return { label: 'Shift 1 (07:00 - 19:00)', code: 'shift1' };
  } else {
    return { label: 'Shift 2 (19:00 - 07:00)', code: 'shift2' };
  }
};

export const TableDataRitase: React.FC<TableDataRitaseProps> = ({
  ritaseList,
  currentUser,
  masters,
  onUpdateRitase,
  onDeleteRitase,
  onNavigateToExport
}) => {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterChecker, setFilterChecker] = useState('');
  const [filterDigger, setFilterDigger] = useState('');
  const [filterHauler, setFilterHauler] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterJobCategory, setFilterJobCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterShift, setFilterShift] = useState<'all' | 'shift1' | 'shift2'>('all');
  const [filterKodeLot, setFilterKodeLot] = useState('');
  const [onlyMyData, setOnlyMyData] = useState(currentUser?.role === 'CHECKER');

  const availableLots = useMemo(() => {
    const set = new Set<string>();
    ritaseList.forEach((r) => {
      if (r.kode_lot && r.kode_lot.trim()) {
        set.add(r.kode_lot.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [ritaseList]);


  // Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Modals
  const [selectedRecord, setSelectedRecord] = useState<RitaseRecord | null>(null);
  const [viewDetailModal, setViewDetailModal] = useState<boolean>(false);
  const [editModal, setEditModal] = useState<boolean>(false);
  const [deleteModal, setDeleteModal] = useState<boolean>(false);

  const [editForm, setEditForm] = useState<Partial<RitaseRecord>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} data ritase terpilih?`)) return;
    setIsProcessing(true);
    try {
      for (const id of selectedIds) {
        await onDeleteRitase(id);
      }
      setSelectedIds([]);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus data terpilih');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = paginatedRecords.map((r) => r.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...allIds])));
    } else {
      const pageIds = new Set(paginatedRecords.map((r) => r.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'MCR';

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterDate('');
    setFilterChecker('');
    setFilterDigger('');
    setFilterHauler('');
    setFilterMaterial('');
    setFilterJobCategory('');
    setFilterFrom('');
    setFilterTo('');
    setFilterKodeLot('');
    setFilterShift('all');
    setCurrentPage(1);
  };

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    let result = [...ritaseList];

    // Filter Checker role restriction
    if (onlyMyData && currentUser) {
      result = result.filter(
        (r) =>
          r.user_id === currentUser.id ||
          r.checker_name.toLowerCase() === currentUser.name.toLowerCase()
      );
    }

    // Text search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.digger_unit.toLowerCase().includes(q) ||
          r.hauler_unit.toLowerCase().includes(q) ||
          (r.operator_digger && r.operator_digger.toLowerCase().includes(q)) ||
          (r.operator_dt && r.operator_dt.toLowerCase().includes(q)) ||
          r.checker_name.toLowerCase().includes(q) ||
          r.from_location.toLowerCase().includes(q) ||
          r.to_location.toLowerCase().includes(q) ||
          r.material.toLowerCase().includes(q) ||
          (r.kode_lot && r.kode_lot.toLowerCase().includes(q)) ||
          (r.catatan && r.catatan.toLowerCase().includes(q)) ||
          r.user_name.toLowerCase().includes(q)
      );
    }

    // Individual Column Filters
    if (filterDate) {
      result = result.filter((r) => r.tanggal === filterDate);
    }
    if (filterShift === 'shift1') {
      result = result.filter((r) => getShiftInfo(r.waktu).code === 'shift1');
    } else if (filterShift === 'shift2') {
      result = result.filter((r) => getShiftInfo(r.waktu).code === 'shift2');
    }
    if (filterChecker) {
      result = result.filter((r) => r.checker_name.toLowerCase() === filterChecker.toLowerCase());
    }
    if (filterDigger) {
      result = result.filter((r) => r.digger_unit.toLowerCase() === filterDigger.toLowerCase());
    }
    if (filterHauler) {
      result = result.filter((r) => r.hauler_unit.toLowerCase() === filterHauler.toLowerCase());
    }
    if (filterMaterial) {
      result = result.filter((r) => r.material.toLowerCase() === filterMaterial.toLowerCase());
    }
    if (filterJobCategory) {
      result = result.filter((r) => (r.job_category || 'ORE GETTING').toLowerCase() === filterJobCategory.toLowerCase());
    }
    if (filterFrom) {
      result = result.filter((r) => r.from_location.toLowerCase() === filterFrom.toLowerCase());
    }
    if (filterTo) {
      result = result.filter((r) => r.to_location.toLowerCase() === filterTo.toLowerCase());
    }
    if (filterKodeLot) {
      if (filterKodeLot === '__WITH_LOT__') {
        result = result.filter((r) => Boolean(r.kode_lot && r.kode_lot.trim().length > 0));
      } else if (filterKodeLot === '__NO_LOT__') {
        result = result.filter((r) => !r.kode_lot || r.kode_lot.trim().length === 0);
      } else {
        result = result.filter((r) => r.kode_lot && r.kode_lot.toLowerCase() === filterKodeLot.toLowerCase());
      }
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'jumlah_bucket' || sortField === 'produksi') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    ritaseList,
    onlyMyData,
    currentUser,
    searchTerm,
    filterDate,
    filterShift,
    filterChecker,
    filterDigger,
    filterHauler,
    filterMaterial,
    filterJobCategory,
    filterFrom,
    filterTo,
    filterKodeLot,
    sortField,
    sortAsc
  ]);

  const filteredTotals = useMemo(() => {
    const totalRit = filteredRecords.length;
    const totalProd = filteredRecords.reduce((acc, curr) => acc + (Number(curr.produksi) || 0), 0);
    const totalBkt = filteredRecords.reduce((acc, curr) => acc + (Number(curr.jumlah_bucket) || 0), 0);
    return { totalRit, totalProd, totalBkt };
  }, [filteredRecords]);

  // Pagination calculation
  const totalItems = filteredRecords.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Open Edit Modal (Admin only)
  const openEdit = (record: RitaseRecord) => {
    setSelectedRecord(record);
    setEditForm({ ...record });
    setEditError(null);
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRecord) return;
    if (!editForm.digger_unit || !editForm.hauler_unit || !editForm.from_location || !editForm.to_location) {
      setEditError('Semua field unit dan lokasi wajib diisi.');
      return;
    }
    if (editForm.from_location.toUpperCase() === editForm.to_location.toUpperCase()) {
      setEditError('Lokasi FROM dan TO tidak boleh sama.');
      return;
    }
    if (!editForm.jumlah_bucket || Number(editForm.jumlah_bucket) <= 0) {
      setEditError('Jumlah bucket harus angka > 0.');
      return;
    }
    if (!editForm.produksi || Number(editForm.produksi) <= 0) {
      setEditError('Jumlah produksi harus angka > 0.');
      return;
    }

    setIsProcessing(true);
    try {
      const ok = await onUpdateRitase(selectedRecord.id, {
        ...editForm,
        jumlah_bucket: Number(editForm.jumlah_bucket),
        produksi: Number(editForm.produksi)
      });
      if (ok) {
        setEditModal(false);
        setSelectedRecord(null);
      }
    } catch (err: any) {
      setEditError(err.message || 'Gagal menyimpan perubahan');
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Delete Modal
  const openDelete = (record: RitaseRecord) => {
    setSelectedRecord(record);
    setDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRecord) return;
    setIsProcessing(true);
    try {
      const ok = await onDeleteRitase(selectedRecord.id);
      if (ok) {
        setDeleteModal(false);
        setSelectedRecord(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Section */}
      <div className="bg-[#FAF7F2] rounded-2xl p-5 shadow-xs border border-[#E2D7C5] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 bg-[#E5C992] px-2.5 py-0.5 rounded-md border border-[#D1B378]">
                Database Ritase Terpusat
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#181A1F] tracking-tight mt-1">
              DATA RITASE CHECKER
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Daftar seluruh input ritase dari seluruh checker di lapangan dengan pencarian, filter, dan sorting lengkap.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {currentUser?.role === 'CHECKER' && (
            <label className="flex items-center gap-2 text-xs font-bold text-[#181A1F] bg-[#EDE4D5] px-3.5 py-2 rounded-xl border border-[#D6C7B2] cursor-pointer">
              <input
                type="checkbox"
                checked={onlyMyData}
                onChange={(e) => setOnlyMyData(e.target.checked)}
                className="rounded text-[#7B1113] focus:ring-[#7B1113]"
              />
              <span>Tampilkan Hanya Data Saya</span>
            </label>
          )}

          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer border border-rose-900"
            >
              <Trash2 className="w-4 h-4 text-amber-300" />
              <span>HAPUS TERPILIH ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={onNavigateToExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-[#FAF7F2] font-bold text-xs shadow-xs transition-colors cursor-pointer border border-emerald-900"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>EXPORT EXCEL</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-[#FAF7F2] rounded-2xl p-5 shadow-xs border border-[#E2D7C5] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black text-[#181A1F] uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#7B1113]" />
            <span>Pencarian & Filter Kolom</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setFilterShift(filterShift === 'shift1' ? 'all' : 'shift1');
                setCurrentPage(1);
              }}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs ${
                filterShift === 'shift1'
                  ? 'bg-amber-600 text-white border-amber-800'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
              }`}
              title="Filter Shift 1 (07:00 - 19:00)"
            >
              ☀️ Shift 1 (07:00-19:00)
            </button>
            <button
              onClick={() => {
                setFilterShift(filterShift === 'shift2' ? 'all' : 'shift2');
                setCurrentPage(1);
              }}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs ${
                filterShift === 'shift2'
                  ? 'bg-[#7B1113] text-[#FAF7F2] border-[#5E0B0C]'
                  : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border-indigo-200'
              }`}
              title="Filter Shift 2 (19:00 - 07:00)"
            >
              🌙 Shift 2 (19:00-07:00)
            </button>
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-[#7B1113] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          </div>
        </div>

        {/* Global Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari ID, Nomor Unit Digger, Hauler, Checker, Lokasi, Catatan..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#FAF7F2] border border-[#E2D7C5] rounded-xl text-sm text-[#181A1F] focus:outline-none focus:border-[#7B1113] focus:ring-1 focus:ring-[#7B1113] transition-all"
          />
        </div>

        {/* Multi-Column Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center justify-between">
              <span>Kode Lot</span>
              {filterKodeLot && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterKodeLot('');
                    setCurrentPage(1);
                  }}
                  className="text-[9px] text-[#7B1113] hover:underline cursor-pointer"
                >
                  reset
                </button>
              )}
            </label>
            <select
              value={filterKodeLot}
              onChange={(e) => {
                setFilterKodeLot(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#E2D7C5] rounded-lg text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
            >
              <option value="">Semua Lot</option>
              <option value="__WITH_LOT__">🏷️ Memiliki Lot</option>
              <option value="__NO_LOT__">Tanpa Lot (-)</option>
              {availableLots.length > 0 && <option disabled>──────────</option>}
              {availableLots.map((lot) => (
                <option key={lot} value={lot}>
                  {lot}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">Tanggal</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#E2D7C5] rounded-lg text-xs text-[#181A1F]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">Checker</label>
            <select
              value={filterChecker}
              onChange={(e) => {
                setFilterChecker(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#E2D7C5] rounded-lg text-xs text-[#181A1F]"
            >
              <option value="">Semua</option>
              {masters.checkers.map((c) => (
                <option key={c.id} value={c.nama_checker}>
                  {c.nama_checker}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">Digger</label>
            <select
              value={filterDigger}
              onChange={(e) => {
                setFilterDigger(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#E2D7C5] rounded-lg text-xs text-[#181A1F]"
            >
              <option value="">Semua</option>
              {masters.diggers.map((d) => (
                <option key={d.id} value={d.nomor_unit}>
                  {d.nomor_unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">Hauler</label>
            <select
              value={filterHauler}
              onChange={(e) => {
                setFilterHauler(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#E2D7C5] rounded-lg text-xs text-[#181A1F]"
            >
              <option value="">Semua</option>
              {masters.haulers.map((h) => (
                <option key={h.id} value={h.nomor_unit}>
                  {h.nomor_unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">Material</label>
            <select
              value={filterMaterial}
              onChange={(e) => {
                setFilterMaterial(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#E2D7C5] rounded-lg text-xs text-[#181A1F]"
            >
              <option value="">Semua</option>
              {masters.materials.map((m) => (
                <option key={m.id} value={m.nama_material}>
                  {m.nama_material}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">Job Category</label>
            <select
              value={filterJobCategory}
              onChange={(e) => {
                setFilterJobCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#E2D7C5] rounded-lg text-xs text-[#181A1F]"
            >
              <option value="">Semua</option>
              {[
                'ORE GETTING',
                'FEEDING',
                'CATCHING',
                'DIRECT ICA',
                'DIRECT CATCHING',
                'SUPPLY ICA',
                'SUPPLY JETTY',
                'BARGING',
                'DIRECT BARGING'
              ].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">FROM</label>
            <select
              value={filterFrom}
              onChange={(e) => {
                setFilterFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#E2D7C5] rounded-lg text-xs text-[#181A1F]"
            >
              <option value="">Semua</option>
              {masters.locations
                .filter((l) => l.tipe === 'FROM' || l.tipe === 'BOTH')
                .map((l) => (
                  <option key={l.id} value={l.nama_location}>
                    {l.nama_location}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">TO</label>
            <select
              value={filterTo}
              onChange={(e) => {
                setFilterTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#E2D7C5] rounded-lg text-xs text-[#181A1F]"
            >
              <option value="">Semua</option>
              {masters.locations
                .filter((l) => l.tipe === 'TO' || l.tipe === 'BOTH')
                .map((l) => (
                  <option key={l.id} value={l.nama_location}>
                    {l.nama_location}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Filtered Totals Summary Bar */}
        <div className="bg-[#F3ECE0] rounded-xl p-3.5 border border-[#E2D7C5] grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
          <div className="bg-white/80 p-2 rounded-lg border border-[#D8CABA]">
            <span className="text-stone-600 font-bold block">Total Ritase Terfilter:</span>
            <div className="text-base font-black text-[#7B1113] font-mono mt-0.5">
              {filteredTotals.totalRit.toLocaleString('id-ID')} Rit
            </div>
          </div>
          <div className="bg-white/80 p-2 rounded-lg border border-[#D8CABA]">
            <span className="text-stone-600 font-bold block">Total Produksi Terfilter:</span>
            <div className="text-base font-black text-emerald-800 font-mono mt-0.5">
              {filteredTotals.totalProd.toLocaleString('id-ID')} Ton
            </div>
          </div>
          <div className="bg-white/80 p-2 rounded-lg border border-[#D8CABA]">
            <span className="text-stone-600 font-bold block">Total Bucket Terfilter:</span>
            <div className="text-base font-black text-[#181A1F] font-mono mt-0.5">
              {filteredTotals.totalBkt.toLocaleString('id-ID')} Bucket
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#FAF7F2] rounded-2xl shadow-xs border border-[#E2D7C5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#14161B] text-[#FAF7F2] border-b-2 border-[#7B1113] select-none">
              <tr>
                <th className="py-3.5 px-3 font-extrabold text-center w-10">
                  <input
                    type="checkbox"
                    checked={paginatedRecords.length > 0 && paginatedRecords.every((r) => selectedIds.includes(r.id))}
                    onChange={handleSelectAll}
                    className="rounded text-[#7B1113] focus:ring-[#7B1113] cursor-pointer"
                    title="Pilih semua di halaman ini"
                  />
                </th>
                <th className="py-3.5 px-3 font-extrabold text-center w-12 text-[#E5C992]">NO</th>
                <th
                  onClick={() => handleSort('tanggal')}
                  className="py-3.5 px-3 font-extrabold cursor-pointer hover:bg-[#20232B] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>TANGGAL</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-300" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('waktu')}
                  className="py-3.5 px-3 font-extrabold cursor-pointer hover:bg-[#20232B] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>WAKTU</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-300" />
                  </div>
                </th>
                <th className="py-3.5 px-3 font-extrabold text-[#E5C992]">SHIFT</th>
                <th
                  onClick={() => handleSort('checker_name')}
                  className="py-3.5 px-3 font-extrabold cursor-pointer hover:bg-[#20232B] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>CHECKER</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-300" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('digger_unit')}
                  className="py-3.5 px-3 font-extrabold cursor-pointer hover:bg-[#20232B] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>DIGGER & OPERATOR</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-300" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('hauler_unit')}
                  className="py-3.5 px-3 font-extrabold cursor-pointer hover:bg-[#20232B] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>HAULER & OPERATOR DT</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-300" />
                  </div>
                </th>
                <th className="py-3.5 px-3 font-extrabold">FROM</th>
                <th className="py-3.5 px-3 font-extrabold">TO</th>
                <th className="py-3.5 px-3 font-extrabold">JOB CATEGORY</th>
                <th
                  onClick={() => handleSort('kode_lot')}
                  className="py-3.5 px-3 font-extrabold cursor-pointer hover:bg-[#20232B] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>KODE LOT</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-300" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('material')}
                  className="py-3.5 px-3 font-extrabold cursor-pointer hover:bg-[#20232B] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>MATERIAL</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-300" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('jumlah_bucket')}
                  className="py-3.5 px-3 font-extrabold text-right cursor-pointer hover:bg-[#20232B] transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>BUCKET</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-300" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('produksi')}
                  className="py-3.5 px-3 font-extrabold text-right cursor-pointer hover:bg-[#20232B] transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>PRODUKSI</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-300" />
                  </div>
                </th>
                <th className="py-3.5 px-3 font-extrabold">SATUAN</th>
                <th className="py-3.5 px-3 font-extrabold">USER INPUT</th>
                <th className="py-3.5 px-4 font-extrabold text-center">ACTION</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-12 text-center text-slate-400 text-sm">
                    Tidak ada data ritase yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item, index) => {
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#EFE7DA] transition-colors group odd:bg-[#FAF7F2] even:bg-[#F5EFE6]"
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleToggleSelect(item.id)}
                          className="rounded text-[#7B1113] focus:ring-[#7B1113] cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-stone-400">
                        {rowNumber}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#181A1F]">
                        {item.tanggal}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-stone-600">
                        {item.waktu}
                      </td>
                      <td className="py-3 px-3 font-medium">
                        {(() => {
                          const s = getShiftInfo(item.waktu);
                          return (
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border inline-block ${s.code === 'shift1' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-indigo-100 text-indigo-900 border-indigo-300'}`}>
                              {s.code === 'shift1' ? '☀️ Shift 1' : '🌙 Shift 2'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#181A1F]">
                        {item.checker_name}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#181A1F]">
                        <div className="flex flex-col">
                          <span className="px-2 py-0.5 rounded bg-[#EDE4D5] border border-[#D6C7B2] font-black text-xs text-[#181A1F] inline-block w-fit">
                            {item.digger_unit}
                          </span>
                          {item.operator_digger && (
                            <span className="text-[10px] text-amber-900 font-semibold mt-0.5 truncate max-w-[120px]">
                              👤 {item.operator_digger}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold">
                        <div className="flex flex-col">
                          {item.hauler_unit ? (
                            <span className="px-2 py-0.5 rounded bg-[#14161B] text-[#FAF7F2] font-mono text-[11px] inline-block w-fit">
                              {item.hauler_unit}
                            </span>
                          ) : (
                            <span className="text-stone-400 text-xs italic">-</span>
                          )}
                          {item.operator_dt && (
                            <span className="text-[10px] text-stone-600 font-semibold mt-0.5 truncate max-w-[120px]">
                              🚚 {item.operator_dt}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-stone-700 font-medium">
                        {item.from_location}
                      </td>
                      <td className="py-3 px-3 text-stone-700 font-medium">
                        {item.to_location}
                      </td>
                      <td className="py-3 px-3 font-bold">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-900 border border-amber-300">
                          {item.job_category || 'ORE GETTING'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        {item.kode_lot ? (
                          <span className="px-2 py-0.5 rounded text-[11px] bg-amber-100 text-amber-900 border border-amber-300 inline-block font-semibold">
                            {item.kode_lot}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-xs italic">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-bold">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-[#EDE4D5] text-[#7B1113] border border-[#D6C7B2]">
                          {item.material}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-stone-700">
                        {item.jumlah_bucket}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-[#7B1113]">
                        {item.produksi.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 font-bold text-stone-600">
                        {item.satuan_produksi}
                      </td>
                      <td className="py-3 px-3 text-stone-600 font-medium">
                        {item.user_name || item.created_by}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedRecord(item);
                              setViewDetailModal(true);
                            }}
                            title="Lihat Detail Lengkap"
                            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canEdit && (
                            <>
                              <button
                                onClick={() => openEdit(item)}
                                title="Edit Data (Admin)"
                                className="p-1.5 rounded-md hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDelete(item)}
                                title="Hapus Data (Admin)"
                                className="p-1.5 rounded-md hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Summary Bar */}
        <div className="p-4 bg-[#F5EFE6] border-t border-[#E2D7C5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600">
          <div>
            Menampilkan{' '}
            <strong className="text-[#181A1F]">
              {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            -{' '}
            <strong className="text-[#181A1F]">
              {Math.min(currentPage * pageSize, totalItems)}
            </strong>{' '}
            dari <strong className="text-[#181A1F]">{totalItems}</strong> data ritase
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Baris per halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#FAF7F2] border border-[#D6C7B2] rounded-lg px-2 py-1 text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-[#D6C7B2] bg-[#EDE4D5] hover:bg-[#E2D7C5] text-[#181A1F] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-bold text-[#181A1F]">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg border border-[#D6C7B2] bg-[#EDE4D5] hover:bg-[#E2D7C5] text-[#181A1F] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {viewDetailModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden space-y-0">
            <div className="bg-[#14161B] p-5 border-b-2 border-[#7B1113] flex items-center justify-between text-[#FAF7F2]">
              <div>
                <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider block">
                  Detail Transaksi Ritase
                </span>
                <h3 className="text-lg font-black text-[#FAF7F2] font-mono mt-0.5">
                  {selectedRecord.id}
                </h3>
              </div>
              <button
                onClick={() => setViewDetailModal(false)}
                className="p-1.5 rounded-lg text-[#D8CEBF] hover:text-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#F5EFE6] p-2.5 rounded-xl border border-[#D6C7B2]">
                  <span className="text-stone-500 font-bold block text-[10px]">TANGGAL & WAKTU</span>
                  <span className="font-bold text-[#181A1F] text-sm">
                    {selectedRecord.tanggal} ({selectedRecord.waktu})
                  </span>
                </div>
                <div className="bg-[#F5EFE6] p-2.5 rounded-xl border border-[#D6C7B2]">
                  <span className="text-stone-500 font-bold block text-[10px]">CHECKER</span>
                  <span className="font-bold text-[#181A1F] text-sm">
                    {selectedRecord.checker_name}
                  </span>
                </div>
                <div className="bg-[#F5EFE6] p-2.5 rounded-xl border border-[#D6C7B2]">
                  <span className="text-stone-500 font-bold block text-[10px]">DIGGER & OPERATOR</span>
                  <span className="font-bold text-amber-900 text-sm">
                    {selectedRecord.digger_unit}
                  </span>
                  {selectedRecord.operator_digger && (
                    <span className="text-xs text-stone-700 block font-medium mt-0.5">
                      Op: {selectedRecord.operator_digger}
                    </span>
                  )}
                </div>
                <div className="bg-[#F5EFE6] p-2.5 rounded-xl border border-[#D6C7B2]">
                  <span className="text-stone-500 font-bold block text-[10px]">HAULER (DT) & DRIVER</span>
                  <span className="font-bold text-blue-900 text-sm">
                    {selectedRecord.hauler_unit}
                  </span>
                  {selectedRecord.operator_dt && (
                    <span className="text-xs text-stone-700 block font-medium mt-0.5">
                      Driver: {selectedRecord.operator_dt}
                    </span>
                  )}
                </div>
                <div className="bg-[#F5EFE6] p-2.5 rounded-xl border border-[#D6C7B2]">
                  <span className="text-stone-500 font-bold block text-[10px]">RUTE HAULING</span>
                  <span className="font-bold text-[#181A1F]">
                    {selectedRecord.from_location} &rarr; {selectedRecord.to_location}
                  </span>
                </div>
                <div className="bg-[#F5EFE6] p-2.5 rounded-xl border border-[#D6C7B2]">
                  <span className="text-stone-500 font-bold block text-[10px]">JOB CATEGORY</span>
                  <span className="font-bold text-[#181A1F]">
                    {selectedRecord.job_category || 'ORE GETTING'}
                  </span>
                </div>
                <div className="bg-[#F5EFE6] p-2.5 rounded-xl border border-[#D6C7B2]">
                  <span className="text-stone-500 font-bold block text-[10px]">KODE LOT</span>
                  <span className="font-bold text-amber-900 font-mono">
                    {selectedRecord.kode_lot || '-'}
                  </span>
                </div>
                <div className="bg-[#F5EFE6] p-2.5 rounded-xl border border-[#D6C7B2]">
                  <span className="text-stone-500 font-bold block text-[10px]">MATERIAL</span>
                  <span className="font-bold text-[#7B1113]">
                    {selectedRecord.material}
                  </span>
                </div>
                <div className="bg-[#F5EFE6] p-2.5 rounded-xl border border-[#D6C7B2]">
                  <span className="text-stone-500 font-bold block text-[10px]">JUMLAH BUCKET</span>
                  <span className="font-bold text-[#181A1F] text-sm font-mono">
                    {selectedRecord.jumlah_bucket} Bucket
                  </span>
                </div>
                <div className="bg-[#F5EFE6] p-2.5 rounded-xl border border-[#D6C7B2]">
                  <span className="text-stone-500 font-bold block text-[10px]">TOTAL PRODUKSI</span>
                  <span className="font-bold text-[#7B1113] text-sm font-mono">
                    {selectedRecord.produksi} {selectedRecord.satuan_produksi}
                  </span>
                </div>
              </div>

              {selectedRecord.catatan && (
                <div className="bg-[#EDE4D5] p-3 rounded-xl border border-[#D6C7B2] text-xs">
                  <span className="font-bold text-[#7B1113] block text-[10px] uppercase">Catatan Operasional:</span>
                  <p className="text-stone-700 mt-0.5">{selectedRecord.catatan}</p>
                </div>
              )}

              {/* Audit Tracking Info (Req 14) */}
              <div className="pt-3 border-t border-[#E2D7C5] text-[11px] text-stone-600 space-y-1 bg-[#F5EFE6] p-3 rounded-xl border border-[#D6C7B2]">
                <div>
                  <strong className="text-[#181A1F]">Dibuat oleh:</strong> {selectedRecord.created_by} pada{' '}
                  {new Date(selectedRecord.created_at).toLocaleString('id-ID')}
                </div>
                {selectedRecord.updated_by && (
                  <div>
                    <strong className="text-[#181A1F]">Terakhir diupdate oleh:</strong> {selectedRecord.updated_by} pada{' '}
                    {new Date(selectedRecord.updated_at).toLocaleString('id-ID')}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setViewDetailModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] text-xs font-bold border border-[#580A0B] cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL (ADMIN ONLY) */}
      {editModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#14161B] p-5 border-b-2 border-[#7B1113] flex items-center justify-between text-[#FAF7F2]">
              <div>
                <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider block">
                  Edit Data Ritase (Admin)
                </span>
                <h3 className="text-lg font-black text-[#FAF7F2] font-mono mt-0.5">
                  {selectedRecord.id}
                </h3>
              </div>
              <button
                onClick={() => setEditModal(false)}
                className="p-1.5 rounded-lg text-[#D8CEBF] hover:text-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs overflow-y-auto flex-1 bg-[#FAF7F2]">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 mb-1 block">Tanggal</label>
                  <input
                    type="date"
                    value={editForm.tanggal || ''}
                    onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 mb-1 block">Waktu (HH:MM)</label>
                  <input
                    type="text"
                    value={editForm.waktu || ''}
                    onChange={(e) => setEditForm({ ...editForm, waktu: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 mb-1 block">Job Category</label>
                <select
                  value={editForm.job_category || 'ORE GETTING'}
                  onChange={(e) => setEditForm({ ...editForm, job_category: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                >
                  {[
                    'ORE GETTING',
                    'FEEDING',
                    'CATCHING',
                    'DIRECT ICA',
                    'DIRECT CATCHING',
                    'SUPPLY ICA',
                    'SUPPLY JETTY',
                    'BARGING',
                    'DIRECT BARGING'
                  ].map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 mb-1 block">Checker</label>
                <select
                  value={editForm.checker_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, checker_name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                >
                  {masters.checkers.map((c) => (
                    <option key={c.id} value={c.nama_checker}>
                      {c.nama_checker}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 mb-1 block">Unit Digger</label>
                  <select
                    value={editForm.digger_unit || ''}
                    onChange={(e) => setEditForm({ ...editForm, digger_unit: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                  >
                    {masters.diggers.map((d) => (
                      <option key={d.id} value={d.nomor_unit}>
                        {d.nomor_unit} {d.model ? `(${d.model})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-700 mb-1 block">Unit Hauler</label>
                  <select
                    value={editForm.hauler_unit || ''}
                    onChange={(e) => setEditForm({ ...editForm, hauler_unit: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                  >
                    {masters.haulers.map((h) => (
                      <option key={h.id} value={h.nomor_unit}>
                        {h.nomor_unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 mb-1 block">Nama Operator Digger</label>
                  <input
                    type="text"
                    value={editForm.operator_digger || ''}
                    onChange={(e) => setEditForm({ ...editForm, operator_digger: e.target.value })}
                    placeholder="Nama operator excavator"
                    className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 mb-1 block">Nama Operator DT</label>
                  <input
                    type="text"
                    value={editForm.operator_dt || ''}
                    onChange={(e) => setEditForm({ ...editForm, operator_dt: e.target.value })}
                    placeholder="Nama supir dump truck"
                    className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 mb-1 block">FROM</label>
                  <select
                    value={editForm.from_location || ''}
                    onChange={(e) => setEditForm({ ...editForm, from_location: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                  >
                    {masters.locations
                      .filter((l) => l.tipe === 'FROM' || l.tipe === 'BOTH')
                      .map((l) => (
                        <option key={l.id} value={l.nama_location}>
                          {l.nama_location}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-700 mb-1 block">TO</label>
                  <select
                    value={editForm.to_location || ''}
                    onChange={(e) => setEditForm({ ...editForm, to_location: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                  >
                    {masters.locations
                      .filter((l) => l.tipe === 'TO' || l.tipe === 'BOTH')
                      .map((l) => (
                        <option key={l.id} value={l.nama_location}>
                          {l.nama_location}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-stone-700 mb-1 block">Material</label>
                  <select
                    value={editForm.material || ''}
                    onChange={(e) => {
                      const matName = e.target.value;
                      const foundMat = masters.materials.find((m) => m.nama_material.toLowerCase() === matName.toLowerCase());
                      setEditForm({
                        ...editForm,
                        material: matName,
                        satuan_produksi: foundMat ? foundMat.satuan : (editForm.satuan_produksi || 'Ton')
                      });
                    }}
                    className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                  >
                    {masters.materials.map((m) => (
                      <option key={m.id} value={m.nama_material}>
                        {m.nama_material} ({m.satuan})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-700 mb-1 block">Bucket</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.jumlah_bucket || ''}
                    onChange={(e) => setEditForm({ ...editForm, jumlah_bucket: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 mb-1 block">
                    Produksi ({editForm.satuan_produksi || 'Ton'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={editForm.produksi || ''}
                    onChange={(e) => setEditForm({ ...editForm, produksi: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 mb-1 block">Kode Lot / Tumpukan</label>
                <input
                  type="text"
                  value={editForm.kode_lot || ''}
                  onChange={(e) => setEditForm({ ...editForm, kode_lot: e.target.value })}
                  placeholder="Kode Lot / Tumpukan..."
                  className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 mb-1 block">Catatan</label>
                <textarea
                  rows={2}
                  value={editForm.catatan || ''}
                  onChange={(e) => setEditForm({ ...editForm, catatan: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E2D7C5] bg-[#F5EFE6]">
              <button
                type="button"
                onClick={() => setEditModal(false)}
                className="px-4 py-2.5 rounded-xl border border-[#D6C7B2] bg-[#EDE4D5] text-[#181A1F] text-xs font-bold hover:bg-[#E2D7C5] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSaveEdit}
                className="px-5 py-2.5 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] text-xs font-bold transition-colors disabled:opacity-50 border border-[#580A0B] cursor-pointer"
              >
                {isProcessing ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL (ADMIN ONLY) */}
      {deleteModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-md w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-[#7B1113] flex items-center justify-center mx-auto border border-rose-300">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-[#181A1F]">
                Konfirmasi Hapus Ritase?
              </h3>
              <p className="text-xs text-stone-600 mt-1">
                Data ritase <strong className="font-mono text-[#181A1F]">{selectedRecord.id}</strong> ({selectedRecord.digger_unit} - {selectedRecord.hauler_unit}, {selectedRecord.produksi} {selectedRecord.satuan_produksi}) akan dihapus secara permanen dari server database.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t border-[#E2D7C5]">
              <button
                type="button"
                onClick={() => setDeleteModal(false)}
                className="px-5 py-2.5 rounded-xl border border-[#D6C7B2] bg-[#EDE4D5] text-[#181A1F] text-xs font-bold hover:bg-[#E2D7C5] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50 border border-[#580A0B]"
              >
                {isProcessing ? 'Menghapus...' : 'Ya, Hapus Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
