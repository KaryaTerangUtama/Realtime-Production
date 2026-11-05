import React, { useState, useEffect } from 'react';
import {
  HardHat,
  Truck,
  UserCheck,
  Layers,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  AlertCircle,
  X,
  Power,
  Calculator,
  Upload
} from 'lucide-react';
import { MastersData } from '../services/api';
import { User } from '../types';

interface MasterDataProps {
  masters: MastersData;
  currentUser: User | null;
  onCreateMaster: (type: string, payload: any) => Promise<boolean>;
  onUpdateMaster: (type: string, id: string, payload: any) => Promise<boolean>;
  onDeleteMaster: (type: string, id: string) => Promise<boolean>;
}

type MasterTab = 'diggers' | 'haulers' | 'checkers' | 'materials' | 'locations' | 'bucket_factors' | 'job_categories' | 'digger_hauler_mapping';

export const MasterData: React.FC<MasterDataProps> = ({
  masters,
  currentUser,
  onCreateMaster,
  onUpdateMaster,
  onDeleteMaster
}) => {
  const [activeTab, setActiveTab] = useState<MasterTab>('diggers');
  const [search, setSearch] = useState('');

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState<any>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveBanner, setSaveBanner] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkLocationModal, setBulkLocationModal] = useState(false);
  const [bulkLocationText, setBulkLocationText] = useState('');
  const [bulkBucketModal, setBulkBucketModal] = useState(false);
  const [bulkBucketText, setBulkBucketText] = useState('');
  const [bulkHaulerModal, setBulkHaulerModal] = useState(false);
  const [bulkHaulerText, setBulkHaulerText] = useState('');
  const [bulkCheckerModal, setBulkCheckerModal] = useState(false);
  const [bulkCheckerText, setBulkCheckerText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const SESSION_KEY_DIGGER_HAULER_MAP = 'ktu_fms_digger_hauler_map';
  const [diggerHaulerMap, setDiggerHaulerMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY_DIGGER_HAULER_MAP);
      if (saved) {
        const parsed = JSON.parse(saved);
        const normalized: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (Array.isArray(v)) normalized[k] = v;
          else if (typeof v === 'string') normalized[k] = [v];
        }
        return normalized;
      }
      return {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(SESSION_KEY_DIGGER_HAULER_MAP, JSON.stringify(diggerHaulerMap));
  }, [diggerHaulerMap]);

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} item master terpilih?`)) return;
    setIsProcessing(true);
    try {
      for (const id of selectedIds) {
        await onDeleteMaster(activeTab, id);
      }
      setSelectedIds([]);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus item terpilih');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkImportDiggers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const lines = bulkText.split('\n');
      let addedCount = 0;
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(/\t|,| {2,}/).map(s => s.trim()).filter(Boolean);
        if (parts.length >= 1) {
          const nomor_unit = parts[0];
          const model = parts.slice(1).join(' ') || 'Standard Model';
          const existing = masters.diggers.find(d => d.nomor_unit.toLowerCase() === nomor_unit.toLowerCase());
          if (!existing) {
            await onCreateMaster('diggers', {
              nomor_unit,
              model,
              bucket_factor: 2.0,
              status: 'ACTIVE',
              adminUserId: currentUser?.id,
              adminUserName: currentUser?.name
            });
            addedCount++;
          }
        }
      }
      setBulkModal(false);
      setBulkText('');
      alert(`Berhasil mengimpor ${addedCount} unit digger baru secara massal!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal melakukan bulk import');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkImportLocations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkLocationText.trim()) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const lines = bulkLocationText.split('\n');
      let addedCount = 0;
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(/\t|,| {2,}/).map(s => s.trim()).filter(Boolean);
        if (parts.length >= 1) {
          const nama_location = parts[0].toUpperCase();
          const tipe = parts[1] ? parts[1].toUpperCase() : 'BOTH';
          const existing = masters.locations.find(l => l.nama_location.toLowerCase() === nama_location.toLowerCase());
          if (!existing) {
            await onCreateMaster('locations', {
              nama_location,
              tipe: ['FROM', 'TO', 'BOTH'].includes(tipe) ? tipe : 'BOTH',
              status: 'ACTIVE',
              adminUserId: currentUser?.id,
              adminUserName: currentUser?.name
            });
            addedCount++;
          }
        }
      }
      setBulkLocationModal(false);
      setBulkLocationText('');
      alert(`Berhasil mengimpor ${addedCount} lokasi baru secara massal!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal melakukan bulk import lokasi');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkImportHaulers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkHaulerText.trim()) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const lines = bulkHaulerText.split('\n');
      let addedCount = 0;
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(/\t|,| {2,}/).map(s => s.trim()).filter(Boolean);
        if (parts.length >= 1) {
          const nomor_unit = parts[0];
          const kapasitas = parts.slice(1).join(' ') || '100 Ton';
          const existing = masters.haulers.find(h => h.nomor_unit.toLowerCase() === nomor_unit.toLowerCase());
          if (!existing) {
            await onCreateMaster('haulers', {
              nomor_unit,
              kapasitas,
              status: 'ACTIVE',
              adminUserId: currentUser?.id,
              adminUserName: currentUser?.name
            });
            addedCount++;
          }
        }
      }
      setBulkHaulerModal(false);
      setBulkHaulerText('');
      alert(`Berhasil mengimpor ${addedCount} unit hauler baru secara massal!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal melakukan bulk import hauler');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkImportCheckers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCheckerText.trim()) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const lines = bulkCheckerText.split('\n');
      let addedCount = 0;
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(/\t|,| {2,}/).map(s => s.trim()).filter(Boolean);
        if (parts.length >= 1) {
          const nama_checker = parts[0];
          const no_badge = parts[1] || `CH-${Date.now().toString().slice(-4)}`;
          const existing = masters.checkers.find(c => c.nama_checker.toLowerCase() === nama_checker.toLowerCase());
          if (!existing) {
            await onCreateMaster('checkers', {
              nama_checker,
              no_badge,
              status: 'ACTIVE',
              adminUserId: currentUser?.id,
              adminUserName: currentUser?.name
            });
            addedCount++;
          }
        }
      }
      setBulkCheckerModal(false);
      setBulkCheckerText('');
      alert(`Berhasil mengimpor ${addedCount} checker baru secara massal!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal melakukan bulk import checker');
    } finally {
      setIsProcessing(false);
    }
  };
  const downloadBucketFactorTemplate = () => {
    const templateContent = `Nomor Unit\tWBX\tCBX\tCrushing\tFLG
EXCA 296 LA\t2.16\t1.92\t0\t0
EXCA 297 LA\t2.16\t1.92\t0\t0
EXCA 300 LA\t1.80\t1.60\t0\t0
B 01\t3.59\t3.47\t3.69\t3.59
B 02\t3.59\t2.59\t3.69\t3.59
WL 07\t4.99\t5.49\t4.99\t5.075`;

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_bucket_factor.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBulkBucketText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkImportBucketFactors = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkBucketText.trim()) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const lines = bulkBucketText.split('\n');
      let updatedCount = 0;
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(/\t|,| {2,}/).map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const nomor_unit = parts[0];
          const wbx = Number(parts[1]) || 0;
          const cbx = Number(parts[2]) || wbx;
          const crushing = Number(parts[3]) || 0;
          const flg = Number(parts[4]) || wbx;

          const digger = masters.diggers.find(d => d.nomor_unit.toLowerCase() === nomor_unit.toLowerCase());
          if (digger) {
            await onUpdateMaster('diggers', digger.id, {
              ...digger,
              bucket_factors: {
                WBX: wbx,
                CBX: cbx,
                Crushing: crushing,
                FLG: flg
              },
              bucket_factor: cbx || wbx || 5.0,
              adminUserId: currentUser?.id,
              adminUserName: currentUser?.name
            });
            updatedCount++;
          }
        }
      }
      setBulkBucketModal(false);
      setBulkBucketText('');
      alert(`Berhasil memperbarui bucket factor untuk ${updatedCount} unit secara massal!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal melakukan bulk import bucket factor');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinishSave = () => {
    setSaveBanner(true);
    setTimeout(() => {
      setSaveBanner(false);
    }, 4000);
  };

  const resetForm = () => {
    setFormData({
      status: 'ACTIVE',
      satuan: 'Ton',
      tipe: 'BOTH'
    });
    setErrorMsg(null);
  };

  const openCreate = () => {
    resetForm();
    setCreateModal(true);
  };

  const openEdit = (item: any) => {
    setSelectedItem(item);
    setFormData({
      ...item,
      bf_wbx: item.bucket_factors?.WBX ?? item.bucket_factor ?? 0,
      bf_cbx: item.bucket_factors?.CBX ?? item.bucket_factor ?? 0,
      bf_crushing: item.bucket_factors?.Crushing ?? item.bucket_factor ?? 0,
      bf_flg: item.bucket_factors?.FLG ?? item.bucket_factor ?? 0,
    });
    setErrorMsg(null);
    setEditModal(true);
  };

  const openDelete = (item: any) => {
    setSelectedItem(item);
    setDeleteModal(true);
  };

  const handleToggleStatus = async (item: any) => {
    const nextStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await onUpdateMaster(activeTab, item.id, {
      ...item,
      status: nextStatus,
      adminUserId: currentUser?.id,
      adminUserName: currentUser?.name
    });
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const ok = await onCreateMaster(activeTab, {
        ...formData,
        adminUserId: currentUser?.id,
        adminUserName: currentUser?.name
      });
      if (ok) {
        setCreateModal(false);
        resetForm();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan item');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      let payload = { ...formData };
      let targetTab = activeTab;
      if (activeTab === 'bucket_factors') {
        targetTab = 'diggers';
        payload.bucket_factors = {
          WBX: Number(payload.bf_wbx) || 0,
          CBX: Number(payload.bf_cbx) || 0,
          Crushing: Number(payload.bf_crushing) || 0,
          FLG: Number(payload.bf_flg) || 0,
        };
        payload.bucket_factor = Number(payload.bf_cbx) || Number(payload.bf_wbx) || 5.0;
      }
      const ok = await onUpdateMaster(targetTab, selectedItem.id, {
        ...payload,
        adminUserId: currentUser?.id,
        adminUserName: currentUser?.name
      });
      if (ok) {
        setEditModal(false);
        setSelectedItem(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui item');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
      const ok = await onDeleteMaster(activeTab, selectedItem.id);
      if (ok) {
        setDeleteModal(false);
        setSelectedItem(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Get current list filtered by search
  const currentList = activeTab === 'bucket_factors' ? masters.diggers : (activeTab === 'digger_hauler_mapping' ? [] : ((masters as any)[activeTab] || []));
  const filteredList = currentList.filter((item: any) => {
    const q = search.toLowerCase();
    const name = item.nomor_unit || item.nama_checker || item.nama_material || item.nama_location || item.nama_kegiatan || '';
    const extra = item.model || item.kapasitas || item.no_badge || item.satuan || item.tipe || item.target_harian?.toString() || '';
    return name.toLowerCase().includes(q) || extra.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12">
      {saveBanner && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-900 font-bold text-xs sm:text-sm flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-black uppercase tracking-wide">Update Master Data Selesai & Tersimpan!</p>
              <p className="text-xs text-emerald-700 font-normal">Semua perubahan master unit, checker, material, dan bucket factor telah disimpan secara permanen dan disinkronkan ke sistem FMS PT. Karya Terang Utama.</p>
            </div>
          </div>
          <button
            onClick={() => setSaveBanner(false)}
            className="p-1 text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#FAF7F2] rounded-2xl p-5 shadow-xs border border-[#E2D7C5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 bg-[#E5C992] px-2.5 py-0.5 rounded-md border border-[#D1B378]">
                Akses Khusus Administrator
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#181A1F] tracking-tight mt-1">
              PENGELOLAAN MASTER DATA
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Kelola master unit digger, hauler, checker, material, lokasi, dan matriks bucket factor PT. Karya Terang Utama.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] font-bold text-xs shadow-xs transition-colors cursor-pointer border border-[#580A0B]"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>TAMBAH MASTER BARU</span>
          </button>
          {activeTab === 'diggers' && (
            <button
              onClick={() => setBulkModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-[#FAF7F2] font-bold text-xs shadow-xs transition-colors cursor-pointer border border-amber-900"
            >
              <Upload className="w-4 h-4 text-amber-300" />
              <span>BULK IMPORT DIGGER</span>
            </button>
          )}
          {activeTab === 'haulers' && (
            <button
              onClick={() => setBulkHaulerModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-[#FAF7F2] font-bold text-xs shadow-xs transition-colors cursor-pointer border border-amber-900"
            >
              <Upload className="w-4 h-4 text-amber-300" />
              <span>BULK IMPORT HAULER</span>
            </button>
          )}
          {activeTab === 'checkers' && (
            <button
              onClick={() => setBulkCheckerModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-[#FAF7F2] font-bold text-xs shadow-xs transition-colors cursor-pointer border border-amber-900"
            >
              <Upload className="w-4 h-4 text-amber-300" />
              <span>BULK IMPORT CHECKER</span>
            </button>
          )}
          {activeTab === 'locations' && (
            <button
              onClick={() => setBulkLocationModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-[#FAF7F2] font-bold text-xs shadow-xs transition-colors cursor-pointer border border-amber-900"
            >
              <Upload className="w-4 h-4 text-amber-300" />
              <span>BULK IMPORT LOCATION</span>
            </button>
          )}
          {activeTab === 'bucket_factors' && (
            <button
              onClick={() => setBulkBucketModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-[#FAF7F2] font-bold text-xs shadow-xs transition-colors cursor-pointer border border-amber-900"
            >
              <Upload className="w-4 h-4 text-amber-300" />
              <span>BULK IMPORT BUCKET FACTOR</span>
            </button>
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
            onClick={handleFinishSave}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-[#FAF7F2] font-bold text-xs shadow-xs transition-colors cursor-pointer border border-emerald-900"
          >
            <CheckCircle className="w-4 h-4 text-amber-300" />
            <span>SELESAI & SIMPAN MASTER</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-[#E2D7C5] overflow-x-auto pb-1">
        {[
          { id: 'diggers' as MasterTab, label: 'MASTER DIGGER', icon: HardHat, count: masters.diggers.length },
          { id: 'haulers' as MasterTab, label: 'MASTER HAULER', icon: Truck, count: masters.haulers.length },
          { id: 'checkers' as MasterTab, label: 'MASTER CHECKER', icon: UserCheck, count: masters.checkers.length },
          { id: 'materials' as MasterTab, label: 'MASTER MATERIAL', icon: Layers, count: masters.materials.length },
          { id: 'locations' as MasterTab, label: 'MASTER LOCATION', icon: MapPin, count: masters.locations.length },
          { id: 'bucket_factors' as MasterTab, label: 'MASTER BUCKET FACTOR', icon: Calculator, count: masters.diggers.length },
          { id: 'job_categories' as MasterTab, label: 'JOB CATEGORIES & TARGETS', icon: Layers, count: (masters.job_categories || []).length },
          { id: 'digger_hauler_mapping' as MasterTab, label: 'MAPPING DIGGER-HAULER', icon: Truck, count: masters.diggers.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch('');
                setSelectedIds([]);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#7B1113] text-[#FAF7F2] border-t-2 border-x-2 border-[#580A0B] shadow-xs'
                  : 'text-[#181A1F] hover:text-[#7B1113] hover:bg-[#EDE4D5]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-[#7B1113]'}`} />
              <span>{tab.label}</span>
              <span className={`ml-1 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                isActive ? 'bg-[#14161B] text-amber-300' : 'bg-[#EDE4D5] text-[#181A1F]'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === 'digger_hauler_mapping' ? (
        <div className="bg-[#FAF7F2] rounded-2xl shadow-xs border border-[#E2D7C5] p-6 space-y-4">
          <div className="border-b border-[#D8CABA] pb-3">
            <h3 className="text-sm font-black text-[#14161B] uppercase">Master Digger-Hauler Assignment Mapping</h3>
            <p className="text-xs text-stone-600">Atur unit Dump Truck (Hauler) yang ditugaskan dan diizinkan untuk setiap unit Digger sebagai referensi master.</p>
          </div>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {masters.diggers.map((d) => {
              const assigned = diggerHaulerMap[d.nomor_unit] || [];
              return (
                <div key={d.id} className="p-4 bg-white rounded-2xl border border-[#D8CABA] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardHat className="w-4 h-4 text-amber-700" />
                      <span className="font-black text-xs text-[#14161B]">{d.nomor_unit}</span>
                      <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        {d.model || 'Digger'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#7B1113] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {assigned.length} Hauler Terasosiasi
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-100">
                    {masters.haulers.map((h) => {
                      const isMapped = assigned.includes(h.nomor_unit);
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            const newAssigned = isMapped
                              ? assigned.filter(u => u !== h.nomor_unit)
                              : [...assigned, h.nomor_unit];
                            setDiggerHaulerMap({
                              ...diggerHaulerMap,
                              [d.nomor_unit]: newAssigned
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                            isMapped
                              ? 'bg-[#14161B] text-[#FAF7F2] border-stone-800 shadow-xs'
                              : 'bg-[#FAF7F2] text-stone-700 border-[#D8CABA] hover:bg-stone-100'
                          }`}
                        >
                          <Truck className={`w-3.5 h-3.5 ${isMapped ? 'text-amber-300' : 'text-stone-400'}`} />
                          <span>{h.nomor_unit}</span>
                          <span className="text-[10px] font-mono">{isMapped ? '✓' : '+'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[#FAF7F2] rounded-2xl shadow-xs border border-[#E2D7C5] overflow-hidden">
        <div className="p-4 border-b border-[#E2D7C5] bg-[#F5EFE6] flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari dalam master data ini..."
              className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
            />
          </div>
          <span className="text-xs text-stone-600 font-bold">
            Total <strong className="text-[#181A1F]">{filteredList.length}</strong> item
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#14161B] text-[#FAF7F2] uppercase font-black border-b border-[#282A32]">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filteredList.map((item: any) => item.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="rounded border-[#D6C7B2] text-[#7B1113] focus:ring-[#7B1113] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 w-12 text-center">NO</th>
                <th className="py-3 px-4">ID</th>
                {activeTab === 'diggers' && (
                  <>
                    <th className="py-3 px-4">NOMOR UNIT</th>
                    <th className="py-3 px-4">MODEL / SPESIFIKASI</th>
                  </>
                )}
                {activeTab === 'haulers' && (
                  <>
                    <th className="py-3 px-4">NOMOR UNIT</th>
                    <th className="py-3 px-4">KAPASITAS</th>
                  </>
                )}
                {activeTab === 'checkers' && (
                  <>
                    <th className="py-3 px-4">NAMA CHECKER</th>
                    <th className="py-3 px-4">NO BADGE / ID CHECKER</th>
                  </>
                )}
                {activeTab === 'materials' && (
                  <>
                    <th className="py-3 px-4">NAMA MATERIAL</th>
                    <th className="py-3 px-4">SATUAN STANDAR</th>
                  </>
                )}
                {activeTab === 'bucket_factors' && (
                  <>
                    <th className="py-3 px-4">NOMOR UNIT</th>
                    <th className="py-3 px-4">MODEL / ALAT</th>
                    <th className="py-3 px-4 text-center">WBX (Ton)</th>
                    <th className="py-3 px-4 text-center">CBX (Ton)</th>
                    <th className="py-3 px-4 text-center">CRUSHING (Ton)</th>
                    <th className="py-3 px-4 text-center">FLG (Ton)</th>
                  </>
                )}
                {activeTab === 'job_categories' && (
                  <>
                    <th className="py-3 px-4">NAMA KEGIATAN</th>
                    <th className="py-3 px-4 text-right">TARGET HARIAN (TON)</th>
                    <th className="py-3 px-4 text-right">TARGET PER JAM (TON)</th>
                  </>
                )}
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2D7C5]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-400">
                    Tidak ada item master data ditemukan.
                  </td>
                </tr>
              ) : (
                filteredList.map((item: any, idx: number) => {
                  const isActive = item.status === 'ACTIVE';
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#EDE4D5] transition-colors odd:bg-[#FAF7F2] even:bg-[#F5EFE6] ${
                        !isActive ? 'opacity-60 bg-stone-100' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, item.id]);
                            } else {
                              setSelectedIds(selectedIds.filter(id => id !== item.id));
                            }
                          }}
                          className="rounded border-[#D6C7B2] text-[#7B1113] focus:ring-[#7B1113] cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-stone-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-stone-600">
                        {item.id}
                      </td>

                      {activeTab === 'diggers' && (
                        <>
                          <td className="py-3 px-4 font-black text-[#181A1F] text-sm">
                            <span className="px-2 py-0.5 rounded bg-[#EDE4D5] border border-[#D6C7B2]">
                              {item.nomor_unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-stone-700 font-medium">{item.model || '-'}</td>
                        </>
                      )}
                      {activeTab === 'haulers' && (
                        <>
                          <td className="py-3 px-4 font-black text-sm">
                            <span className="px-2 py-0.5 rounded bg-[#14161B] text-[#FAF7F2] font-mono text-xs">
                              {item.nomor_unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-stone-700 font-medium">{item.kapasitas || '-'}</td>
                        </>
                      )}
                      {activeTab === 'checkers' && (
                        <>
                          <td className="py-3 px-4 font-black text-[#181A1F] text-sm">
                            {item.nama_checker}
                          </td>
                          <td className="py-3 px-4 text-stone-600 font-mono font-bold">
                            {item.no_badge || '-'}
                          </td>
                        </>
                      )}
                      {activeTab === 'materials' && (
                        <>
                          <td className="py-3 px-4 font-black text-[#7B1113] text-sm">
                            <span className="px-2 py-0.5 rounded bg-[#EDE4D5] border border-[#D6C7B2]">
                              {item.nama_material}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-black text-emerald-800">
                            {item.satuan}
                          </td>
                        </>
                      )}
                      {activeTab === 'job_categories' && (
                        <>
                          <td className="py-3 px-4 font-black text-[#181A1F] text-sm">
                            <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              {item.nama_kegiatan}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-[#7B1113]">
                            {(item.target_harian || 0).toLocaleString('id-ID')} Ton
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-stone-700">
                            {Math.round((item.target_harian || 0) / 24).toLocaleString('id-ID')} Ton/jam
                          </td>
                        </>
                      )}
                      {activeTab === 'bucket_factors' && (
                        <>
                          <td className="py-3 px-4 font-black text-[#181A1F] text-sm">
                            <span className="px-2 py-0.5 rounded bg-[#EDE4D5] border border-[#D6C7B2]">
                              {item.nomor_unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-stone-700 font-medium">{item.model || '-'}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-[#7B1113]">
                            {item.bucket_factors?.WBX !== undefined ? item.bucket_factors.WBX : '-'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-[#7B1113]">
                            {item.bucket_factors?.CBX !== undefined ? item.bucket_factors.CBX : '-'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-[#7B1113]">
                            {item.bucket_factors?.Crushing !== undefined ? item.bucket_factors.Crushing : '-'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-[#7B1113]">
                            {item.bucket_factors?.FLG !== undefined ? item.bucket_factors.FLG : '-'}
                          </td>
                        </>
                      )}

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          title="Klik untuk ubah status Active/Inactive"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-[#E8F5E9] text-emerald-900 border border-emerald-300 hover:bg-[#C8E6C9]'
                              : 'bg-stone-200 text-stone-700 border border-stone-300 hover:bg-stone-300'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{item.status}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(item)}
                            title="Edit Master Data"
                            className="p-1.5 rounded-lg hover:bg-amber-200/60 text-amber-800 transition-colors cursor-pointer border border-transparent hover:border-amber-400"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDelete(item)}
                            title="Hapus Master Data"
                            className="p-1.5 rounded-lg hover:bg-rose-200/60 text-[#7B1113] transition-colors cursor-pointer border border-transparent hover:border-rose-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* CREATE MODAL */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
          <form
            onSubmit={handleSaveCreate}
            className="bg-[#FAF7F2] rounded-3xl max-w-md w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden"
          >
            <div className="bg-[#14161B] p-5 border-b-2 border-[#7B1113] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#FAF7F2] uppercase tracking-wide">
                Tambah {activeTab.slice(0, -1)} Baru
              </h3>
              <button
                type="button"
                onClick={() => setCreateModal(false)}
                className="p-1 text-[#D8CEBF] hover:text-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs bg-[#FAF7F2]">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs border border-rose-200 rounded-xl">
                  {errorMsg}
                </div>
              )}

              {(activeTab === 'diggers' || activeTab === 'haulers') && (
                <div>
                  <label className="font-bold text-stone-700 block mb-1">
                    Nomor Unit (Contoh: {activeTab === 'diggers' ? 'EX-005' : 'HL-007'}) <span className="text-[#7B1113]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nomor_unit || ''}
                    onChange={(e) => setFormData({ ...formData, nomor_unit: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] uppercase focus:outline-none focus:border-[#7B1113]"
                  />
                </div>
              )}

              {activeTab === 'diggers' && (
                <>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Model / Tipe Unit</label>
                    <input
                      type="text"
                      placeholder="Contoh: Komatsu PC2000"
                      value={formData.model || ''}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                    />
                  </div>
                </>
              )}

              {activeTab === 'haulers' && (
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Kapasitas</label>
                  <input
                    type="text"
                    placeholder="Contoh: 100 Ton"
                    value={formData.kapasitas || ''}
                    onChange={(e) => setFormData({ ...formData, kapasitas: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                  />
                </div>
              )}

              {activeTab === 'checkers' && (
                <>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Nama Checker <span className="text-[#7B1113]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nama lengkap checker..."
                      value={formData.nama_checker || ''}
                      onChange={(e) => setFormData({ ...formData, nama_checker: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] font-bold focus:outline-none focus:border-[#7B1113]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">No Badge / ID Pegawai</label>
                    <input
                      type="text"
                      placeholder="KTU-CHK-06"
                      value={formData.no_badge || ''}
                      onChange={(e) => setFormData({ ...formData, no_badge: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                    />
                  </div>
                </>
              )}

              {activeTab === 'materials' && (
                <>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Nama Material <span className="text-[#7B1113]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Cbx, Wbx, FLG, Crushing Stock, OB, dll"
                      value={formData.nama_material || ''}
                      onChange={(e) => setFormData({ ...formData, nama_material: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Satuan Standar</label>
                    <input
                      type="text"
                      disabled
                      value="Ton"
                      className="w-full px-3 py-2.5 bg-[#E5DAC8] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] font-bold cursor-not-allowed"
                    />
                  </div>
                </>
              )}

              {activeTab === 'locations' && (
                <>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Nama Lokasi <span className="text-[#7B1113]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: PIT D, DISPOSAL C..."
                      value={formData.nama_location || ''}
                      onChange={(e) => setFormData({ ...formData, nama_location: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] uppercase focus:outline-none focus:border-[#7B1113]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Tipe Lokasi</label>
                    <select
                      value={formData.tipe || 'BOTH'}
                      onChange={(e) => setFormData({ ...formData, tipe: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] font-bold focus:outline-none focus:border-[#7B1113]"
                    >
                      <option value="FROM">FROM (Lokasi Asal / Loading Point Saja)</option>
                      <option value="TO">TO (Lokasi Tujuan / Dumping Point Saja)</option>
                      <option value="BOTH">BOTH (Bisa Asal maupun Tujuan)</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'job_categories' && (
                <>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Nama Kegiatan (Job Category) <span className="text-[#7B1113]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: ORE GETTING, BARGING..."
                      value={formData.nama_kegiatan || ''}
                      onChange={(e) => setFormData({ ...formData, nama_kegiatan: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] uppercase focus:outline-none focus:border-[#7B1113]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      Target Harian (Ton) <span className="text-[#7B1113]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="10000"
                      value={formData.target_harian ?? 5000}
                      onChange={(e) => setFormData({ ...formData, target_harian: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="font-bold text-stone-700 block mb-1">Status Awal</label>
                <select
                  value={formData.status || 'ACTIVE'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] font-bold focus:outline-none focus:border-[#7B1113]"
                >
                  <option value="ACTIVE">ACTIVE (Dapat dipilih di form ritase)</option>
                  <option value="INACTIVE">INACTIVE (Disembunyikan dari form)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2D7C5]">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="px-4 py-2.5 border border-[#D6C7B2] bg-[#EDE4D5] rounded-xl text-xs font-bold text-[#181A1F] hover:bg-[#E2D7C5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] text-xs font-bold rounded-xl disabled:opacity-50 border border-[#580A0B] cursor-pointer"
                >
                  {isProcessing ? 'Menyimpan...' : 'Simpan Master Data'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
          <form
            onSubmit={handleSaveEdit}
            className="bg-[#FAF7F2] rounded-3xl max-w-md w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden"
          >
            <div className="bg-[#14161B] p-5 border-b-2 border-[#7B1113] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#FAF7F2] uppercase tracking-wide">
                Edit {activeTab.slice(0, -1)}: {selectedItem.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditModal(false)}
                className="p-1 text-[#D8CEBF] hover:text-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs bg-[#FAF7F2]">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs border border-rose-200 rounded-xl">
                  {errorMsg}
                </div>
              )}

              {(activeTab === 'diggers' || activeTab === 'haulers') && (
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Nomor Unit</label>
                  <input
                    type="text"
                    required
                    value={formData.nomor_unit || ''}
                    onChange={(e) => setFormData({ ...formData, nomor_unit: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] uppercase focus:outline-none focus:border-[#7B1113]"
                  />
                </div>
              )}

              {activeTab === 'bucket_factors' && (
                <>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-bold mb-2">
                    Edit Bucket Factor untuk Unit: <span className="font-mono text-[#7B1113]">{formData.nomor_unit}</span> ({formData.model})
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">WBX (Ton)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.bf_wbx ?? ''}
                        onChange={(e) => setFormData({ ...formData, bf_wbx: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">CBX (Ton)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.bf_cbx ?? ''}
                        onChange={(e) => setFormData({ ...formData, bf_cbx: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Crushing (Ton)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.bf_crushing ?? ''}
                        onChange={(e) => setFormData({ ...formData, bf_crushing: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">FLG (Ton)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.bf_flg ?? ''}
                        onChange={(e) => setFormData({ ...formData, bf_flg: e.target.value })}
                        className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'diggers' && (
                <>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Model / Tipe Unit</label>
                    <input
                      type="text"
                      value={formData.model || ''}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                    />
                  </div>
                </>
              )}

              {activeTab === 'haulers' && (
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Kapasitas</label>
                  <input
                    type="text"
                    value={formData.kapasitas || ''}
                    onChange={(e) => setFormData({ ...formData, kapasitas: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                  />
                </div>
              )}

              {activeTab === 'checkers' && (
                <>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Nama Checker</label>
                    <input
                      type="text"
                      required
                      value={formData.nama_checker || ''}
                      onChange={(e) => setFormData({ ...formData, nama_checker: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] font-bold focus:outline-none focus:border-[#7B1113]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">No Badge</label>
                    <input
                      type="text"
                      value={formData.no_badge || ''}
                      onChange={(e) => setFormData({ ...formData, no_badge: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                    />
                  </div>
                </>
              )}

              {activeTab === 'materials' && (
                <>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Nama Material</label>
                    <input
                      type="text"
                      required
                      value={formData.nama_material || ''}
                      onChange={(e) => setFormData({ ...formData, nama_material: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Satuan Standar</label>
                    <input
                      type="text"
                      disabled
                      value="Ton"
                      className="w-full px-3 py-2.5 bg-[#E5DAC8] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] font-bold cursor-not-allowed"
                    />
                  </div>
                </>
              )}

              {activeTab === 'locations' && (
                <>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Nama Lokasi</label>
                    <input
                      type="text"
                      required
                      value={formData.nama_location || ''}
                      onChange={(e) => setFormData({ ...formData, nama_location: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] uppercase focus:outline-none focus:border-[#7B1113]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Tipe Lokasi</label>
                    <select
                      value={formData.tipe || 'BOTH'}
                      onChange={(e) => setFormData({ ...formData, tipe: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                    >
                      <option value="FROM">FROM</option>
                      <option value="TO">TO</option>
                      <option value="BOTH">BOTH</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="font-bold text-stone-700 block mb-1">Status</label>
                <select
                  value={formData.status || 'ACTIVE'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2D7C5]">
                <button
                  type="button"
                  onClick={() => setEditModal(false)}
                  className="px-4 py-2.5 border border-[#D6C7B2] bg-[#EDE4D5] rounded-xl text-xs font-bold text-[#181A1F] hover:bg-[#E2D7C5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] text-xs font-bold rounded-xl disabled:opacity-50 border border-[#580A0B] cursor-pointer"
                >
                  {isProcessing ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-md w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-[#7B1113] flex items-center justify-center mx-auto border border-rose-300">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-[#181A1F]">
                Hapus Item Master?
              </h3>
              <p className="text-xs text-stone-600 mt-1">
                Apakah Anda yakin ingin menghapus {activeTab.slice(0, -1)}{' '}
                <strong className="text-[#181A1F]">
                  {selectedItem.nomor_unit || selectedItem.nama_checker || selectedItem.nama_material || selectedItem.nama_location}
                </strong>
                ? Item yang telah digunakan dalam ritase lampau sebaiknya diubah status menjadi <strong>INACTIVE</strong> daripada dihapus.
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
                className="px-5 py-2.5 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] text-xs font-bold disabled:opacity-50 border border-[#580A0B] cursor-pointer"
              >
                {isProcessing ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK IMPORT BUCKET FACTOR MODAL */}
      {bulkBucketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
          <form
            onSubmit={handleBulkImportBucketFactors}
            className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden"
          >
            <div className="bg-[#14161B] p-5 border-b-2 border-[#7B1113] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#FAF7F2] uppercase tracking-wide flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-300" />
                <span>Bulk Import Matriks Bucket Factor (Unit & Material)</span>
              </h3>
              <button
                type="button"
                onClick={() => setBulkBucketModal(false)}
                className="p-1 text-[#D8CEBF] hover:text-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs bg-[#FAF7F2]">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs border border-rose-200 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div>
                  <p className="font-bold text-amber-900 text-xs">Gunakan Template CSV</p>
                  <p className="text-[11px] text-amber-800">Unduh template, isi nilai bucket factor per material, lalu unggah file atau tempel isinya.</p>
                </div>
                <button
                  type="button"
                  onClick={downloadBucketFactorTemplate}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Download Template</span>
                </button>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Upload File CSV / TXT Template
                </label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-stone-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#EDE4D5] file:text-[#181A1F] hover:file:bg-[#E2D7C5] cursor-pointer"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Atau Tempel Matriks Bucket Factor (Format: <code className="bg-stone-200 px-1 py-0.5 rounded text-rose-800">NomorUnit [Tab] WBX [Tab] CBX [Tab] Crushing [Tab] FLG</code> per baris)
                </label>
                <textarea
                  rows={6}
                  placeholder={`Contoh:\nEXCA 296 LA\t2.16\t1.92\t0\t0\nEXCA 300 LA\t1.80\t1.60\t0\t0`}
                  value={bulkBucketText}
                  onChange={(e) => setBulkBucketText(e.target.value)}
                  className="w-full p-3 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                ></textarea>
                <p className="text-[11px] text-stone-500 mt-1">
                  Sistem akan memperbarui nilai matriks bucket factor per material untuk setiap unit Digger/Alat secara massal.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2D7C5]">
                <button
                  type="button"
                  onClick={() => setBulkBucketModal(false)}
                  className="px-4 py-2.5 border border-[#D6C7B2] bg-[#EDE4D5] rounded-xl text-xs font-bold text-[#181A1F] hover:bg-[#E2D7C5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] text-xs font-bold rounded-xl disabled:opacity-50 border border-[#580A0B] cursor-pointer"
                >
                  {isProcessing ? 'Memperbarui...' : 'Proses Bulk Import Bucket Factor'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* BULK IMPORT LOCATION MODAL */}
      {bulkLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
          <form
            onSubmit={handleBulkImportLocations}
            className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden"
          >
            <div className="bg-[#14161B] p-5 border-b-2 border-[#7B1113] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#FAF7F2] uppercase tracking-wide flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-300" />
                <span>Bulk Import Master Location (Lokasi Asal/Tujuan)</span>
              </h3>
              <button
                type="button"
                onClick={() => setBulkLocationModal(false)}
                className="p-1 text-[#D8CEBF] hover:text-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs bg-[#FAF7F2]">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs border border-rose-200 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Tempel Daftar Lokasi (Format: <code className="bg-stone-200 px-1 py-0.5 rounded text-rose-800">Nama Lokasi [Tab/Spasi] Tipe (FROM/TO/BOTH)</code> per baris)
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder={`Contoh:\nJETTY ANTAM\tBOTH\nSUJIMAN\tBOTH\nICA\tTO\nPIT SELATAN\tFROM`}
                  value={bulkLocationText}
                  onChange={(e) => setBulkLocationText(e.target.value)}
                  className="w-full p-3 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                ></textarea>
                <p className="text-[11px] text-stone-500 mt-1">
                  Sistem akan otomatis memparsing setiap baris dan memasukkannya ke Master Location sekaligus.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2D7C5]">
                <button
                  type="button"
                  onClick={() => setBulkLocationModal(false)}
                  className="px-4 py-2.5 border border-[#D6C7B2] bg-[#EDE4D5] rounded-xl text-xs font-bold text-[#181A1F] hover:bg-[#E2D7C5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] text-xs font-bold rounded-xl disabled:opacity-50 border border-[#580A0B] cursor-pointer"
                >
                  {isProcessing ? 'Mengimpor...' : 'Proses Bulk Import Lokasi'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
          <form
            onSubmit={handleBulkImportDiggers}
            className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden"
          >
            <div className="bg-[#14161B] p-5 border-b-2 border-[#7B1113] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#FAF7F2] uppercase tracking-wide flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-300" />
                <span>Bulk Import Master Digger (Unit & Model)</span>
              </h3>
              <button
                type="button"
                onClick={() => setBulkModal(false)}
                className="p-1 text-[#D8CEBF] hover:text-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs bg-[#FAF7F2]">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs border border-rose-200 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Tempel Daftar Unit & Model (Format: <code className="bg-stone-200 px-1 py-0.5 rounded text-rose-800">Nomor Unit [Tab/Spasi] Model</code> per baris)
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder={`Contoh:\nEXCA 296 LA\tZX 210 LC - 5G\nEXCA 297 LA\tZX 210 LC - 5G\nEXCA 300 LA\tPC 200 - 10 MO`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full p-3 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                ></textarea>
                <p className="text-[11px] text-stone-500 mt-1">
                  Sistem akan otomatis memparsing setiap baris dan memasukkannya ke Master Digger sekaligus. Unit yang sudah ada tidak akan diduplikasi.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2D7C5]">
                <button
                  type="button"
                  onClick={() => setBulkModal(false)}
                  className="px-4 py-2.5 border border-[#D6C7B2] bg-[#EDE4D5] rounded-xl text-xs font-bold text-[#181A1F] hover:bg-[#E2D7C5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] text-xs font-bold rounded-xl disabled:opacity-50 border border-[#580A0B] cursor-pointer"
                >
                  {isProcessing ? 'Mengimpor...' : 'Proses Bulk Import'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* BULK IMPORT HAULER MODAL */}
      {bulkHaulerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
          <form
            onSubmit={handleBulkImportHaulers}
            className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden"
          >
            <div className="bg-[#14161B] p-5 border-b-2 border-[#7B1113] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#FAF7F2] uppercase tracking-wide flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-300" />
                <span>Bulk Import Master Hauler (DT Unit & Kapasitas)</span>
              </h3>
              <button
                type="button"
                onClick={() => setBulkHaulerModal(false)}
                className="p-1 text-[#D8CEBF] hover:text-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs bg-[#FAF7F2]">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs border border-rose-200 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Tempel Daftar Hauler (Format: <code className="bg-stone-200 px-1 py-0.5 rounded text-rose-800">Nomor Unit [Tab/Spasi] Kapasitas</code> per baris)
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder={`Contoh:\nHL-001\t100 Ton\nHL-002\t100 Ton\nHL-003\t60 Ton`}
                  value={bulkHaulerText}
                  onChange={(e) => setBulkHaulerText(e.target.value)}
                  className="w-full p-3 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                ></textarea>
                <p className="text-[11px] text-stone-500 mt-1">
                  Sistem akan otomatis memparsing setiap baris dan memasukkannya ke Master Hauler sekaligus.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2D7C5]">
                <button
                  type="button"
                  onClick={() => setBulkHaulerModal(false)}
                  className="px-4 py-2.5 border border-[#D6C7B2] bg-[#EDE4D5] rounded-xl text-xs font-bold text-[#181A1F] hover:bg-[#E2D7C5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] text-xs font-bold rounded-xl disabled:opacity-50 border border-[#580A0B] cursor-pointer"
                >
                  {isProcessing ? 'Mengimpor...' : 'Proses Bulk Import Hauler'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* BULK IMPORT CHECKER MODAL */}
      {bulkCheckerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
          <form
            onSubmit={handleBulkImportCheckers}
            className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden"
          >
            <div className="bg-[#14161B] p-5 border-b-2 border-[#7B1113] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#FAF7F2] uppercase tracking-wide flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-300" />
                <span>Bulk Import Master Checker (Nama & No Badge)</span>
              </h3>
              <button
                type="button"
                onClick={() => setBulkCheckerModal(false)}
                className="p-1 text-[#D8CEBF] hover:text-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs bg-[#FAF7F2]">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs border border-rose-200 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Tempel Daftar Checker (Format: <code className="bg-stone-200 px-1 py-0.5 rounded text-rose-800">Nama Checker [Tab/Spasi] No Badge</code> per baris)
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder={`Contoh:\nAndi Saputra\tCH-001\nBudi Santoso\tCH-002\nCitra Lestari\tCH-003`}
                  value={bulkCheckerText}
                  onChange={(e) => setBulkCheckerText(e.target.value)}
                  className="w-full p-3 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                ></textarea>
                <p className="text-[11px] text-stone-500 mt-1">
                  Sistem akan otomatis memparsing setiap baris dan memasukkannya ke Master Checker sekaligus.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2D7C5]">
                <button
                  type="button"
                  onClick={() => setBulkCheckerModal(false)}
                  className="px-4 py-2.5 border border-[#D6C7B2] bg-[#EDE4D5] rounded-xl text-xs font-bold text-[#181A1F] hover:bg-[#E2D7C5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] text-xs font-bold rounded-xl disabled:opacity-50 border border-[#580A0B] cursor-pointer"
                >
                  {isProcessing ? 'Mengimpor...' : 'Proses Bulk Import Checker'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
