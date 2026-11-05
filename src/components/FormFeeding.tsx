import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  HardHat,
  MapPin,
  Layers,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  RotateCcw
} from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { MastersData } from '../services/api';
import { User, RitaseRecord } from '../types';

interface FormFeedingProps {
  masters: MastersData;
  currentUser: User | null;
  ritaseList?: RitaseRecord[];
  onSubmit: (record: Partial<RitaseRecord>) => Promise<boolean>;
  onSuccessNavigate?: () => void;
}

export const FormFeeding: React.FC<FormFeedingProps> = ({
  masters,
  currentUser,
  ritaseList,
  onSubmit,
  onSuccessNavigate
}) => {
  const getTodayDateStr = () => new Date().toISOString().split('T')[0];
  const getCurrentLiveTimeStr = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const [tanggal, setTanggal] = useState<string>(getTodayDateStr());
  const [waktu, setWaktu] = useState<string>(getCurrentLiveTimeStr());
  const [checkerName, setCheckerName] = useState<string>('');
  const [diggerUnit, setDiggerUnit] = useState<string>('');
  const [haulerUnit, setHaulerUnit] = useState<string>('');
  const [operatorDigger, setOperatorDigger] = useState<string>('');
  const [operatorDt, setOperatorDt] = useState<string>('');

  // Form selections for Feeding
  const [fromPit, setFromPit] = useState<'PIT SELATAN' | 'PIT UTARA'>('PIT SELATAN');
  const [dumpingStock, setDumpingStock] = useState<'ETO SELATAN' | 'ETO UTARA'>('ETO SELATAN');
  const [material, setMaterial] = useState<string>('Wbx');
  const [jumlahBucket, setJumlahBucket] = useState<number>(5);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setWaktu(getCurrentLiveTimeStr());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Set default checker
  useEffect(() => {
    if (currentUser) {
      const match = masters.checkers.find(
        (c) =>
          c.nama_checker.toLowerCase() === currentUser.name.toLowerCase() &&
          c.status === 'ACTIVE'
      );
      if (match) {
        setCheckerName(match.nama_checker);
      } else if (currentUser.role === 'CHECKER') {
        setCheckerName(currentUser.name);
      }
    }
  }, [currentUser, masters.checkers]);

  const activeDiggers = useMemo(
    () => masters.diggers.filter((d) => d.status === 'ACTIVE'),
    [masters.diggers]
  );
  const activeHaulers = useMemo(
    () => masters.haulers.filter((h) => h.status === 'ACTIVE'),
    [masters.haulers]
  );
  const activeCheckers = useMemo(
    () => masters.checkers.filter((c) => c.status === 'ACTIVE'),
    [masters.checkers]
  );
  const activeMaterials = useMemo(
    () => masters.materials.filter((m) => m.status === 'ACTIVE'),
    [masters.materials]
  );

  // Selected Digger & Bucket Factor
  const selectedDigger = useMemo(() => {
    return masters.diggers.find((d) => d.nomor_unit === diggerUnit);
  }, [masters.diggers, diggerUnit]);

  const currentBucketFactor = useMemo(() => {
    if (!selectedDigger) return 3.0;
    const cleanMat = material.toUpperCase();
    if (selectedDigger.bucket_factors && typeof selectedDigger.bucket_factors === 'object') {
      if (cleanMat.includes('WBX') && selectedDigger.bucket_factors.WBX !== undefined) return selectedDigger.bucket_factors.WBX;
      if (cleanMat.includes('CBX') && selectedDigger.bucket_factors.CBX !== undefined) return selectedDigger.bucket_factors.CBX;
      if (cleanMat.includes('CRUSH') && selectedDigger.bucket_factors.Crushing !== undefined) return selectedDigger.bucket_factors.Crushing;
      if (cleanMat.includes('FLG') && selectedDigger.bucket_factors.FLG !== undefined) return selectedDigger.bucket_factors.FLG;
    }
    return selectedDigger.bucket_factor || 3.0;
  }, [selectedDigger, material]);

  const handleQuickSubmitWP = async (wpNumber: number) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!checkerName.trim()) {
      setErrorMsg('Nama Checker wajib dipilih!');
      return;
    }
    if (!diggerUnit.trim()) {
      setErrorMsg('Nomor Unit Digger wajib dipilih!');
      return;
    }
    if (!haulerUnit.trim()) {
      setErrorMsg('Nomor Unit Hauler (DT) wajib dipilih!');
      return;
    }

    const calculatedProduksi = Number((jumlahBucket * currentBucketFactor).toFixed(2));
    const wpName = `WP ${wpNumber}`;
    const catatanFinal = `Feeding ${wpName}`;

    const payload: Partial<RitaseRecord> = {
      tanggal,
      waktu,
      checker_name: checkerName,
      user_id: currentUser?.id || 'USR-001',
      user_name: currentUser?.name || checkerName,
      digger_unit: diggerUnit,
      hauler_unit: haulerUnit,
      operator_digger: operatorDigger.trim() || 'Operator Digger',
      operator_dt: operatorDt.trim() || 'Driver DT',
      from_location: fromPit,
      to_location: dumpingStock,
      material,
      job_category: 'FEEDING',
      jumlah_bucket: Number(jumlahBucket),
      produksi: calculatedProduksi,
      satuan_produksi: 'Ton',
      catatan: catatanFinal
    };

    setIsSubmitting(true);
    try {
      const ok = await onSubmit(payload);
      if (ok) {
        setSuccessMsg(`Berhasil Submit Feeding ${wpName} (${calculatedProduksi} Ton)!`);
        setHaulerUnit(''); // reset hauler for next fast entry
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg('Gagal menyimpan data ritase feeding');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header Card */}
      <div className="bg-[#FAF7F2] rounded-2xl p-5 sm:p-6 shadow-xs border border-[#E2D7C5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 bg-[#E5C992] px-2.5 py-0.5 rounded-md border border-[#D1B378]">
            Quick Sheet Mode
          </span>
          <h2 className="text-2xl font-black text-[#181A1F] tracking-tight mt-1 flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#7B1113]" />
            INPUT RITASE FEEDING (1-CLICK WP 1 - 10)
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Pilih Pit Asal, Dumping Stock, lalu klik tombol WP (1 s.d. 10) di bawah untuk langsung mencatat ritase 1-klik.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form Body */}
      <div className="bg-[#FAF7F2] rounded-3xl shadow-md border-2 border-[#E2D7C5] overflow-hidden">
        <div className="bg-[#14161B] px-6 py-4 text-[#FAF7F2] border-b-4 border-[#7B1113] flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-[#E5C992]">
            Formulir Kilat Feeding Tambang
          </span>
          <div className="flex items-center gap-2 font-mono text-xs text-amber-300">
            <Clock className="w-3.5 h-3.5" />
            <span>{waktu}</span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Row 1: Checker & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-black text-stone-800 mb-1">
                Nama Checker <span className="text-[#7B1113]">*</span>
              </label>
              <SearchableSelect
                options={activeCheckers.map((c) => ({
                  value: c.nama_checker,
                  label: c.nama_checker,
                  subLabel: c.no_badge,
                  badge: 'Checker'
                }))}
                value={checkerName}
                onChange={(val) => setCheckerName(val)}
                placeholder="Pilih Checker..."
                searchPlaceholder="Cari nama checker..."
              />
            </div>

            <div>
              <label className="block font-black text-stone-800 mb-1">
                Tanggal Operasional <span className="text-[#7B1113]">*</span>
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#D8CABA] rounded-xl text-xs font-bold text-[#14161B]"
              />
            </div>
          </div>

          {/* Row 2: Digger & Hauler Units */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#F7F2E8] p-4 rounded-2xl border border-[#E2D7C5]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-black text-[#14161B] flex items-center gap-1.5">
                  <HardHat className="w-4 h-4 text-amber-700" />
                  Unit Digger <span className="text-[#7B1113]">*</span>
                </label>
                {selectedDigger && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#7B1113] text-white">
                    BF: {currentBucketFactor} Ton
                  </span>
                )}
              </div>
              <SearchableSelect
                options={activeDiggers.map((d) => ({
                  value: d.nomor_unit,
                  label: d.nomor_unit,
                  subLabel: d.model || undefined,
                  badge: 'Digger'
                }))}
                value={diggerUnit}
                onChange={(val) => setDiggerUnit(val)}
                placeholder="Pilih Unit Digger..."
                searchPlaceholder="Cari digger..."
              />
              <div className="mt-2.5">
                <input
                  type="text"
                  value={operatorDigger}
                  onChange={(e) => setOperatorDigger(e.target.value)}
                  placeholder="Operator Digger (Opsional)..."
                  className="w-full px-3 py-1.5 bg-white border border-[#D8CABA] rounded-xl text-xs font-bold text-[#14161B]"
                />
              </div>
            </div>

            <div className="bg-[#F7F2E8] p-4 rounded-2xl border border-[#E2D7C5]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-black text-[#14161B] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#14161B]" />
                  Unit Hauler (Dump Truck) <span className="text-[#7B1113]">*</span>
                </label>
              </div>
              <SearchableSelect
                options={activeHaulers.map((h) => ({
                  value: h.nomor_unit,
                  label: h.nomor_unit,
                  subLabel: h.kapasitas || undefined,
                  badge: 'DT'
                }))}
                value={haulerUnit}
                onChange={(val) => setHaulerUnit(val)}
                placeholder="Pilih Unit Hauler (DT)..."
                searchPlaceholder="Cari hauler..."
              />
              <div className="mt-2.5">
                <input
                  type="text"
                  value={operatorDt}
                  onChange={(e) => setOperatorDt(e.target.value)}
                  placeholder="Driver DT / Hauler (Opsional)..."
                  className="w-full px-3 py-1.5 bg-white border border-[#D8CABA] rounded-xl text-xs font-bold text-[#14161B]"
                />
              </div>
            </div>
          </div>

          {/* Row 3: From (Pit Selatan / Utara) & Dumping Stock (Eto Selatan / Utara) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#EDE4D5] p-4 rounded-2xl border border-[#D6C7B2]">
              <label className="block font-black text-[#14161B] mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-700" />
                FROM (Asal Pit) <span className="text-[#7B1113]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['PIT SELATAN', 'PIT UTARA'] as const).map((pit) => (
                  <button
                    key={pit}
                    type="button"
                    onClick={() => setFromPit(pit)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      fromPit === pit
                        ? 'bg-[#14161B] text-[#FAF7F2] border-black shadow-md'
                        : 'bg-[#FAF7F2] text-[#14161B] border-[#D8CABA] hover:bg-white'
                    }`}
                  >
                    {pit}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#EDE4D5] p-4 rounded-2xl border border-[#D6C7B2]">
              <label className="block font-black text-[#14161B] mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#7B1113]" />
                Dumping Stock (TO) <span className="text-[#7B1113]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['ETO SELATAN', 'ETO UTARA'] as const).map((eto) => (
                  <button
                    key={eto}
                    type="button"
                    onClick={() => setDumpingStock(eto)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      dumpingStock === eto
                        ? 'bg-[#7B1113] text-[#FAF7F2] border-[#580A0B] shadow-md'
                        : 'bg-[#FAF7F2] text-[#14161B] border-[#D8CABA] hover:bg-white'
                    }`}
                  >
                    {eto}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4: Material & Bucket Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-black text-stone-800 mb-1">
                Jenis Material <span className="text-[#7B1113]">*</span>
              </label>
              <SearchableSelect
                options={activeMaterials.map((m) => ({
                  value: m.nama_material,
                  label: m.nama_material,
                  badge: m.satuan
                }))}
                value={material}
                onChange={(val) => setMaterial(val)}
                placeholder="Pilih Material..."
                searchPlaceholder="Cari material..."
              />
            </div>

            <div>
              <label className="block font-black text-stone-800 mb-1">
                Jumlah Bucket per Ritase <span className="text-[#7B1113]">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={jumlahBucket}
                  onChange={(e) => setJumlahBucket(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8CABA] rounded-xl text-xs font-mono font-black text-[#14161B]"
                />
                <div className="bg-[#EDE4D5] px-3.5 py-2.5 rounded-xl border border-[#D6C7B2] text-right shrink-0">
                  <div className="text-[10px] font-bold text-stone-500">Estimasi</div>
                  <div className="font-mono font-black text-[#7B1113]">
                    {(jumlahBucket * currentBucketFactor).toFixed(2)} Ton
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: WP 1 s.d. WP 10 (1-Click Submit Grid) */}
          <div className="pt-4 border-t-2 border-[#E2D7C5]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#7B1113] flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600 animate-pulse" />
                Pilih WP (1 - 10) — 1 Klik Langsung Submit Ritase Feeding:
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((wpNum) => (
                <button
                  key={wpNum}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickSubmitWP(wpNum)}
                  className="py-4 px-3 rounded-2xl bg-[#7B1113] hover:bg-[#5E0B0C] active:scale-95 text-[#FAF7F2] border-2 border-[#580A0B] shadow-sm font-black text-sm sm:text-base flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="text-amber-300 font-mono text-[10px]">FEEDING</span>
                  <span>WP {wpNum}</span>
                  <span className="text-[9px] font-normal text-stone-300">1-Klik Submit</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
