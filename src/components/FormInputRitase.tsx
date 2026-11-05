import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  HardHat,
  UserCheck,
  MapPin,
  Layers,
  FileText,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  RotateCcw,
  Sparkles,
  Smartphone,
  Monitor,
  Info,
  User,
  Zap,
  Check,
  ArrowRight,
  Calculator,
  Plus,
  Minus
} from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { MastersData } from '../services/api';
import { User as UserType, RitaseRecord } from '../types';

interface FormInputRitaseProps {
  masters: MastersData;
  currentUser: UserType | null;
  ritaseList?: RitaseRecord[];
  onSubmit: (record: Partial<RitaseRecord>) => Promise<boolean>;
  onSuccessNavigate?: () => void;
}

export const FormInputRitase: React.FC<FormInputRitaseProps> = ({
  masters,
  currentUser,
  ritaseList,
  onSubmit,
  onSuccessNavigate
}) => {
  // Mobile Portrait View Mode toggle (Default: true for high-speed mobile ergonomics)
  const [isPortraitMobileView, setIsPortraitMobileView] = useState<boolean>(true);

  // Current date & live clock with HH:mm:ss
  const getTodayDateStr = () => new Date().toISOString().split('T')[0];
  const getCurrentLiveTimeStr = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const [tanggal, setTanggal] = useState<string>(getTodayDateStr());
  const [liveClock, setLiveClock] = useState<string>(getCurrentLiveTimeStr());
  const [waktu, setWaktu] = useState<string>(getCurrentLiveTimeStr());
  const [isAutoTime, setIsAutoTime] = useState<boolean>(true);

  // Session Storage Keys for Auto-fill Operator (Digger & DT)
  const SESSION_KEY_OP_DIGGER = 'ktu_fms_session_op_digger';
  const SESSION_KEY_OP_DT = 'ktu_fms_session_op_dt';
  const SESSION_KEY_LAST_DIGGER = 'ktu_fms_session_last_digger';
  const SESSION_KEY_LAST_FROM = 'ktu_fms_session_last_from';
  const SESSION_KEY_LAST_TO = 'ktu_fms_session_last_to';
  const SESSION_KEY_LAST_LOT = 'ktu_fms_session_last_lot';

  // Fleet Session Storage & State
  const SESSION_KEY_FLEET_DIGGERS = 'ktu_fms_fleet_diggers';
  const SESSION_KEY_FLEET_HAULERS = 'ktu_fms_fleet_haulers';

  const [fleetDiggers, setFleetDiggers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY_FLEET_DIGGERS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [fleetHaulers, setFleetHaulers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY_FLEET_HAULERS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showFleetModal, setShowFleetModal] = useState<boolean>(false);

  const SESSION_KEY_DIGGER_OPS = 'ktu_fms_digger_operators';
  const [diggerOperators, setDiggerOperators] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY_DIGGER_OPS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(SESSION_KEY_DIGGER_OPS, JSON.stringify(diggerOperators));
  }, [diggerOperators]);

  useEffect(() => {
    localStorage.setItem(SESSION_KEY_FLEET_DIGGERS, JSON.stringify(fleetDiggers));
  }, [fleetDiggers]);

  useEffect(() => {
    localStorage.setItem(SESSION_KEY_FLEET_HAULERS, JSON.stringify(fleetHaulers));
  }, [fleetHaulers]);

  const SESSION_KEY_DIGGER_HAULER_MAP = 'ktu_fms_digger_hauler_map';
  const [diggerHaulerMap, setDiggerHaulerMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY_DIGGER_HAULER_MAP);
      if (saved) {
        const parsed = JSON.parse(saved);
        const normalized: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (Array.isArray(v)) {
            normalized[k] = v;
          } else if (typeof v === 'string') {
            normalized[k] = [v];
          }
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

  // Form State
  const [checkerName, setCheckerName] = useState<string>('');
  const [diggerUnit, setDiggerUnit] = useState<string>('');
  const [haulerUnit, setHaulerUnit] = useState<string>('');

  useEffect(() => {
    if (diggerUnit && haulerUnit) {
      setDiggerHaulerMap((prev) => {
        const existing = prev[diggerUnit] || [];
        if (!existing.includes(haulerUnit)) {
          return { ...prev, [diggerUnit]: [...existing, haulerUnit] };
        }
        return prev;
      });
    }
  }, [diggerUnit, haulerUnit]);
  const [operatorDigger, setOperatorDigger] = useState<string>('');
  const [operatorDt, setOperatorDt] = useState<string>('');
  const [fromLocation, setFromLocation] = useState<string>('');
  const [toLocation, setToLocation] = useState<string>('');
  const [material, setMaterial] = useState<string>('Wbx');
  const [jobCategory, setJobCategory] = useState<string>('');
  const [kodeLot, setKodeLot] = useState<string>('');
  const [jumlahBucket, setJumlahBucket] = useState<number>(5);
  const [produksi, setProduksi] = useState<number>(15);
  const [satuanProduksi, setSatuanProduksi] = useState<string>('Ton'); // All units Ton
  const [catatan, setCatatan] = useState<string>('');

  useEffect(() => {
    if (jobCategory === 'FEEDING') {
      setKodeLot('');
    }
  }, [jobCategory]);

  // Today count by selected checker name and lot breakdown
  const myTodayRitaseList = useMemo(() => {
    if (!ritaseList) return [];
    const name = (checkerName || currentUser?.name || '').toLowerCase();
    if (!name) return [];
    return ritaseList.filter(
      (r) => r.tanggal === tanggal && r.checker_name.toLowerCase() === name
    );
  }, [ritaseList, tanggal, checkerName, currentUser]);

  const myTodayCount = myTodayRitaseList.length;

  const lotCounts = useMemo(() => {
    const counts: { [lot: string]: number } = {};
    myTodayRitaseList.forEach((r) => {
      const lot = r.kode_lot ? r.kode_lot.trim() : '';
      if (lot) {
        counts[lot] = (counts[lot] || 0) + 1;
      }
    });
    return counts;
  }, [myTodayRitaseList]);

  // Status & Notifications
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);

  // Live second-by-second ticking for automatic submission time
  useEffect(() => {
    const timer = setInterval(() => {
      const nowStr = getCurrentLiveTimeStr();
      setLiveClock(nowStr);
      if (isAutoTime) {
        setWaktu(nowStr);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isAutoTime]);

  // Load Session memory on initial mount
  useEffect(() => {
    const savedOpDigger = localStorage.getItem(SESSION_KEY_OP_DIGGER);
    const savedOpDt = localStorage.getItem(SESSION_KEY_OP_DT);
    const savedDigger = localStorage.getItem(SESSION_KEY_LAST_DIGGER);
    const savedFrom = localStorage.getItem(SESSION_KEY_LAST_FROM);
    const savedTo = localStorage.getItem(SESSION_KEY_LAST_TO);

    if (savedOpDigger) setOperatorDigger(savedOpDigger);
    if (savedOpDt) setOperatorDt(savedOpDt);
    if (savedDigger && !diggerUnit) setDiggerUnit(savedDigger);
    if (savedFrom && !fromLocation) setFromLocation(savedFrom);
    if (savedTo && !toLocation) setToLocation(savedTo);
    const savedLot = localStorage.getItem(SESSION_KEY_LAST_LOT);
    if (savedLot && !kodeLot) setKodeLot(savedLot);
  }, []);

  // Set default checker to logged in user if applicable
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

  // Auto select WP 1-10 when Job Category is FEEDING or CATCHING
  useEffect(() => {
    if (jobCategory === 'FEEDING' || jobCategory === 'CATCHING') {
      setToLocation('WP 1-10');
    }
  }, [jobCategory]);

  // Active filters for selects
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
  const activeLocationsFrom = useMemo(
    () => masters.locations.filter((l) => l.status === 'ACTIVE' && (l.tipe === 'FROM' || l.tipe === 'BOTH')),
    [masters.locations]
  );
  const activeLocationsTo = useMemo(
    () => masters.locations.filter((l) => l.status === 'ACTIVE' && (l.tipe === 'TO' || l.tipe === 'BOTH')),
    [masters.locations]
  );

  // Selected Digger Object
  const selectedDigger = useMemo(() => {
    return masters.diggers.find((d) => d.nomor_unit === diggerUnit);
  }, [masters.diggers, diggerUnit]);

  // Bucket Factor calculation based on Unit AND Material (WBX, CBX, Crushing, FLG)
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

  // Recalculate production whenever digger, material, or bucket count changes
  useEffect(() => {
    if (jumlahBucket > 0) {
      const calcProd = Number((jumlahBucket * currentBucketFactor).toFixed(2));
      setProduksi(calcProd);
    }
  }, [jumlahBucket, currentBucketFactor, diggerUnit, material]);

  const handleMaterialChange = (newMat: string) => {
    setMaterial(newMat);
    setSatuanProduksi('Ton'); // All units Ton
  };

  const handleBucketChange = (newBucket: number) => {
    if (newBucket < 1) newBucket = 1;
    setJumlahBucket(newBucket);
    const calcProd = Number((newBucket * currentBucketFactor).toFixed(2));
    setProduksi(calcProd);
  };

  const handleResetSessionOperators = () => {
    localStorage.removeItem(SESSION_KEY_OP_DIGGER);
    localStorage.removeItem(SESSION_KEY_OP_DT);
    setOperatorDigger('');
    setOperatorDt('');
  };

  const handleResetForm = () => {
    setHaulerUnit('');
    setCatatan('');
    setErrorMsg(null);
    setWaktu(getCurrentLiveTimeStr());
  };

  const [feedingFrom, setFeedingFrom] = useState<'PIT SELATAN' | 'PIT UTARA' | 'STOCK ETO'>('PIT SELATAN');
  const [dumpingStock, setDumpingStock] = useState<string>('ETO SELATAN');
  const [catchingType, setCatchingType] = useState<'OVERSIZE' | 'UNDERSIZE'>('OVERSIZE');

  const validate = (): string | null => {
    if (!checkerName.trim()) return 'Nama Checker wajib dipilih!';
    if (!jobCategory) return 'Job Category wajib dipilih!';

    if (jobCategory.includes('JETTY') || jobCategory.includes('BARGING') || jobCategory.includes('CATCHING') || jobCategory.includes('SUPPLY')) {
      if (!kodeLot.trim()) return 'Kode Tumpukan / Kode Lot wajib diisi untuk kegiatan ini!';
    }

    const isFeedingPit = jobCategory === 'FEEDING' && feedingFrom !== 'STOCK ETO';
    if (!isFeedingPit) {
      if (!diggerUnit.trim()) return 'Nomor Unit Digger wajib dipilih!';
      if (!haulerUnit.trim()) return 'Nomor Unit Hauler (DT) wajib dipilih!';
    }
    if (!material.trim()) return 'Material wajib dipilih!';

    if (jobCategory === 'FEEDING') {
      if (!dumpingStock) return 'Dumping Stock (TO) / WP wajib dipilih!';
      if (dumpingStock === 'STOCK ETO' && feedingFrom === 'STOCK ETO') {
        return 'Jika Dumping Stock Stock ETO, Asal (FROM) harus Pit Selatan atau Pit Utara!';
      }
    } else {
      if (!fromLocation.trim()) return 'Lokasi (FROM) wajib dipilih!';
      if (!toLocation.trim()) return 'Lokasi (TO) wajib dipilih!';
      if (fromLocation.trim().toUpperCase() === toLocation.trim().toUpperCase()) {
        return 'Lokasi FROM dan TO tidak boleh sama!';
      }
    }

    if (!jumlahBucket || Number(jumlahBucket) <= 0) {
      return 'Jumlah Bucket harus berupa angka positif (> 0)!';
    }
    if (!produksi || Number(produksi) <= 0) {
      return 'Jumlah Produksi harus berupa angka positif (> 0)!';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const isFeedingPit = jobCategory === 'FEEDING' && feedingFrom !== 'STOCK ETO';

    const error = validate();
    if (error) {
      setErrorMsg(error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const submitTime = isAutoTime ? getCurrentLiveTimeStr() : waktu;

      if (operatorDigger.trim()) {
        localStorage.setItem(SESSION_KEY_OP_DIGGER, operatorDigger.trim());
      }
      if (operatorDt.trim()) {
        localStorage.setItem(SESSION_KEY_OP_DT, operatorDt.trim());
      }
      if (diggerUnit.trim()) {
        localStorage.setItem(SESSION_KEY_LAST_DIGGER, diggerUnit.trim());
      }
      if (fromLocation.trim()) {
        localStorage.setItem(SESSION_KEY_LAST_FROM, fromLocation.trim());
      }
      if (toLocation.trim()) {
        localStorage.setItem(SESSION_KEY_LAST_TO, toLocation.trim());
      }
      if (kodeLot.trim()) {
        localStorage.setItem(SESSION_KEY_LAST_LOT, kodeLot.trim());
      }

      let finalFrom = fromLocation.trim();
      let finalTo = toLocation.trim();
      let finalCatatan = catatan.trim();

      if (jobCategory === 'FEEDING') {
        finalFrom = feedingFrom;
        finalTo = dumpingStock;
        finalCatatan = 'Feeding';
      } else if (jobCategory === 'CATCHING') {
        finalCatatan = finalCatatan ? `${catchingType}, ${finalCatatan}` : catchingType;
      }

      const ok = await onSubmit({
        tanggal,
        waktu: submitTime,
        checker_name: checkerName.trim(),
        user_id: currentUser?.id || 'UNKNOWN',
        user_name: currentUser?.name || checkerName.trim(),
        digger_unit: isFeedingPit ? '' : diggerUnit.trim(),
        hauler_unit: isFeedingPit ? '' : haulerUnit.trim(),
        operator_digger: isFeedingPit ? '' : operatorDigger.trim(),
        operator_dt: isFeedingPit ? '' : operatorDt.trim(),
        from_location: finalFrom,
        to_location: finalTo,
        material: material.trim(),
        job_category: jobCategory,
        jumlah_bucket: Number(jumlahBucket),
        bucket_factor: currentBucketFactor,
        produksi: Number(produksi),
        satuan_produksi: 'Ton',
        kode_lot: jobCategory === 'FEEDING' ? undefined : (kodeLot.trim() ? kodeLot.trim() : undefined),
        catatan: finalCatatan
      });

      if (ok) {
        setSuccessMsg(`Ritase berhasil disimpan! Waktu Submit: ${submitTime}`);
        setLastSubmittedId(`RIT-${Date.now().toString().slice(-4)}`);
        handleResetForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan ritase. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickNoteChips = [
    'Jalan Licin / Hujan',
    'Antrian Front Pemuatan',
    'Prepare Front',
    'Perbaikan Hauling Road',
    'Material Keras',
    'Dusty / Berdebu'
  ];

  const quickBucketNumbers = [4, 5, 6, 7, 8];

  return (
    <div className={`mx-auto pb-28 transition-all duration-300 ${isPortraitMobileView ? 'max-w-md' : 'max-w-3xl'}`}>
      {/* View Switcher: HP Portrait vs Tampilan Lebar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#7B1113] bg-[#EFE4D2] px-2.5 py-1 rounded-md border border-[#D8CABA]">
            FLEET MANAGEMENT SYSTEM
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsPortraitMobileView(!isPortraitMobileView)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FAF7F2] hover:bg-[#EFE4D2] text-[#14161B] border border-[#D8CABA] shadow-2xs transition-colors cursor-pointer"
          title="Ganti Mode Tampilan"
        >
          {isPortraitMobileView ? (
            <>
              <Monitor className="w-3.5 h-3.5 text-[#7B1113]" />
              <span>Tampilan Lebar</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-[#7B1113]" />
              <span>Mode HP Portrait</span>
            </>
          )}
        </button>
      </div>

      {/* SMARTPHONE PORTRAIT SHELL CONTAINER */}
      <div className={`bg-[#FAF7F2] rounded-3xl border-2 border-[#D8CABA] shadow-md overflow-hidden ${
        isPortraitMobileView ? 'ring-8 ring-stone-900/10' : ''
      }`}>
        {/* Mobile Phone Portrait Top Header (NO LOGO HERE - ONLY HEADER HAS LOGO) */}
        <div className="bg-[#14161B] text-[#FAF7F2] p-4 border-b-4 border-[#7B1113] relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-extrabold tracking-wider uppercase text-amber-300">
                  FMS &bull; PT. KARYA TERANG UTAMA
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight text-[#FAF7F2] mt-0.5">
                FORM INPUT RITASE
              </h1>
            </div>

            {/* Live Clock HH:mm:ss Indicator */}
            <div className="bg-[#1F2229] border border-[#333846] px-2.5 py-1 rounded-xl text-right shrink-0">
              <div className="flex items-center justify-end gap-1 text-[9px] text-[#D8CEBF] font-semibold">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Waktu Submit:</span>
              </div>
              <div className="font-mono text-xs sm:text-sm font-black text-amber-400">
                {liveClock}
              </div>
            </div>
          </div>
        </div>

        {/* Today's Submitted Count Badge for Checker & Lot Breakdown */}
        <div className="bg-[#EDE4D5] px-4 py-2.5 border-b border-[#D8CABA] space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-700">
              Total Ritase {checkerName ? `(${checkerName})` : 'Anda'} Diinput Hari Ini:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#7B1113] text-amber-300 font-mono font-black text-xs">
              {myTodayCount} Ritase
            </span>
          </div>
          {Object.keys(lotCounts).length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-[#D8CABA]/60">
              <span className="text-[9px] font-black uppercase text-stone-500 mr-0.5">Per Lot:</span>
              {Object.entries(lotCounts).map(([lot, count]) => (
                <span key={lot} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white text-stone-800 border border-[#D6C7B2] font-mono font-bold text-[10px]">
                  <span className="text-[#7B1113]">🏷️ {lot}:</span>
                  <span className="text-emerald-800">{count} Rit</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="m-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start gap-2.5 shadow-xs animate-in fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-bold text-emerald-900">Ritase Berhasil Disimpan!</div>
              <p className="mt-0.5 text-emerald-800">{successMsg}</p>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-bold px-1.5 py-0.5"
            >
              &times;
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="m-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 flex items-start gap-2.5 shadow-xs animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-bold text-rose-900">Periksa Kembali Input:</div>
              <p className="mt-0.5 text-rose-800">{errorMsg}</p>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-xs text-rose-800 hover:text-rose-950 font-bold px-1.5 py-0.5"
            >
              &times;
            </button>
          </div>
        )}

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="divide-y divide-[#E2D7C5]">
          {/* SECTION 1: WAKTU & CHECKER */}
          <div className="p-4 bg-[#F7F2E8]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#14161B] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#7B1113]" />
                1. CHECKER & WAKTU SUBMIT
              </span>
              <button
                type="button"
                onClick={() => setIsAutoTime(!isAutoTime)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                  isAutoTime
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {isAutoTime ? '⚡ Waktu Otomatis' : '✏️ Waktu Manual'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Nama Checker <span className="text-[#7B1113]">*</span>
                </label>
                <SearchableSelect
                  options={activeCheckers.map((c) => ({
                    value: c.nama_checker,
                    label: c.nama_checker,
                    badge: 'Checker'
                  }))}
                  value={checkerName}
                  onChange={(val) => setCheckerName(val)}
                  placeholder="Pilih Nama Checker..."
                  searchPlaceholder="Cari nama checker..."
                  icon={<UserCheck className="w-4 h-4 text-[#7B1113]" />}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center justify-between">
                  <span>Waktu Submit (HH:MM:SS)</span>
                  <span className="text-[9px] text-[#7B1113] font-black">
                    {isAutoTime ? 'Real-Time Auto' : 'Manual'}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-1/2 px-2.5 py-2 bg-[#FAF7F2] border border-[#D8CABA] rounded-xl text-xs font-bold text-[#14161B] focus:outline-none focus:border-[#7B1113]"
                    required
                  />
                  <div className="w-1/2 relative">
                    <input
                      type="text"
                      value={isAutoTime ? liveClock : waktu}
                      disabled={isAutoTime}
                      onChange={(e) => setWaktu(e.target.value)}
                      placeholder="HH:MM:SS"
                      className={`w-full px-2.5 py-2 border rounded-xl text-xs font-mono font-bold focus:outline-none ${
                        isAutoTime
                          ? 'bg-[#EDE4D5] text-[#14161B] border-[#D8CABA] font-black cursor-not-allowed'
                          : 'bg-[#FAF7F2] text-[#14161B] border-[#7B1113]'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: ALAT BERAT & NAMA OPERATOR */}
          {(jobCategory !== 'FEEDING' || feedingFrom === 'STOCK ETO') && (
            <div className="p-4 bg-[#FAF7F2]">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#14161B] flex items-center gap-1.5">
                  <HardHat className="w-3.5 h-3.5 text-amber-700" />
                  2. UNIT ALAT & OPERATOR
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFleetModal(true)}
                    className="px-2.5 py-1 bg-[#7B1113] text-[#FAF7F2] rounded-lg font-black text-[10px] hover:bg-[#580A0B] cursor-pointer shadow-sm flex items-center gap-1"
                  >
                    ⚙️ Pilih/Atur Unit Armada ({fleetDiggers.length} Digger, {fleetHaulers.length} DT)
                  </button>
                  {(operatorDigger || operatorDt) && (
                    <button
                      type="button"
                      onClick={handleResetSessionOperators}
                      className="text-[10px] text-stone-600 hover:text-[#7B1113] font-bold flex items-center gap-1 cursor-pointer"
                      title="Kosongkan nama operator tersimpan"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3.5">
                {/* DIGGER UNIT & OPERATOR DIGGER */}
                <div className="bg-[#F7F2E8] p-3 rounded-2xl border border-[#E2D7C5]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-black text-[#14161B] flex items-center gap-1.5">
                      <HardHat className="w-3.5 h-3.5 text-amber-700" />
                      NOMOR UNIT DIGGER <span className="text-[#7B1113]">*</span>
                    </label>
                    {diggerUnit && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#7B1113] text-[#FAF7F2]">
                        Dipilih: {diggerUnit} {selectedDigger ? `(BF: ${currentBucketFactor} Ton)` : ''}
                      </span>
                    )}
                  </div>

                  {fleetDiggers.length === 0 ? (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center space-y-2">
                      <p className="text-xs font-bold text-amber-900">Belum ada Unit Digger yang dipilih untuk shift ini.</p>
                      <button
                        type="button"
                        onClick={() => setShowFleetModal(true)}
                        className="px-3 py-1.5 bg-[#7B1113] text-[#FAF7F2] rounded-lg text-xs font-black cursor-pointer inline-flex items-center gap-1"
                      >
                        ⚙️ Pilih Unit Digger Aktif Sekarang
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1 bg-white rounded-xl border border-[#D8CABA]">
                      {activeDiggers
                        .filter((d) => fleetDiggers.includes(d.nomor_unit))
                        .map((d) => {
                          const isSelected = diggerUnit === d.nomor_unit;
                          return (
                              <button
                              key={d.id || d.nomor_unit}
                              type="button"
                              onClick={() => {
                                setDiggerUnit(d.nomor_unit);
                                if (diggerOperators[d.nomor_unit]) {
                                  setOperatorDigger(diggerOperators[d.nomor_unit]);
                                }
                                const assignedHaulers = diggerHaulerMap[d.nomor_unit] || [];
                                if (assignedHaulers.length > 0 && fleetHaulers.includes(assignedHaulers[0])) {
                                  setHaulerUnit(assignedHaulers[0]);
                                } else {
                                  setHaulerUnit('');
                                }
                              }}
                              className={`py-2 px-2.5 rounded-xl transition-all cursor-pointer border font-black text-xs text-center flex flex-col items-center justify-center gap-0.5 ${
                                isSelected
                                  ? 'bg-[#7B1113] text-[#FAF7F2] border-[#580A0B] shadow-md scale-102'
                                  : 'bg-[#FAF7F2] hover:bg-[#EDE4D5] text-[#14161B] border-[#D8CABA]'
                              }`}
                            >
                              <span className="truncate w-full">{d.nomor_unit}</span>
                              <span className={`text-[8px] font-mono font-bold ${isSelected ? 'text-[#FAF7F2]/90' : 'text-stone-500'}`}>
                                {isSelected ? '✓ DIPILIH' : (d.model || 'Digger')}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}

                  <div className="mt-2.5 pt-2 border-t border-[#E2D7C5]/60">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-stone-700 flex items-center gap-1">
                        <User className="w-3 h-3 text-stone-500" />
                        Nama Operator Digger {diggerUnit ? `(Unit ${diggerUnit})` : ''}
                      </label>
                      {diggerUnit && diggerOperators[diggerUnit] && (
                        <span className="text-[9px] font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                          ✓ Otomatis dari Pilihan Unit
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={operatorDigger}
                      onChange={(e) => setOperatorDigger(e.target.value)}
                      placeholder="Pilih No Digger di atas untuk auto-fill operator..."
                      className="w-full px-3 py-1.5 bg-[#FAF7F2] border border-[#D8CABA] rounded-xl text-xs font-bold text-[#14161B] placeholder:font-normal focus:outline-none focus:border-[#7B1113]"
                    />
                  </div>
                </div>

                {/* HAULER (DT) UNIT & OPERATOR DT */}
                <div className="bg-[#F7F2E8] p-3 rounded-2xl border border-[#E2D7C5]">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-black text-[#14161B] flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#14161B]" />
                      NOMOR UNIT HAULER (DUMP TRUCK) <span className="text-[#7B1113]">*</span>
                    </label>
                    {haulerUnit && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#14161B] text-[#FAF7F2]">
                        Dipilih: {haulerUnit}
                      </span>
                    )}
                  </div>

                  {!diggerUnit ? (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                      <p className="text-xs font-bold text-amber-900">⚠️ Silakan pilih Unit Digger di atas terlebih dahulu untuk menampilkan Unit Hauler (DT) yang terasosiasi.</p>
                    </div>
                  ) : (
                    (() => {
                      const assignedHaulerNames = diggerHaulerMap[diggerUnit] || [];
                      const assignedHaulersList = activeHaulers.filter((h) => assignedHaulerNames.includes(h.nomor_unit));

                      if (assignedHaulersList.length === 0) {
                        return (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center space-y-2">
                            <p className="text-xs font-bold text-amber-900">Belum ada Hauler yang di-mapping untuk Digger {diggerUnit}.</p>
                            <button
                              type="button"
                              onClick={() => setShowFleetModal(true)}
                              className="px-3 py-1.5 bg-[#7B1113] text-[#FAF7F2] rounded-lg text-xs font-black cursor-pointer inline-flex items-center gap-1"
                            >
                              ⚙️ Atur Mapping Hauler untuk Digger ini
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-1 bg-white rounded-xl border border-[#D8CABA]">
                          {assignedHaulersList.map((h) => {
                            const isSelected = haulerUnit === h.nomor_unit;
                            return (
                              <button
                                key={h.id || h.nomor_unit}
                                type="button"
                                onClick={() => setHaulerUnit(h.nomor_unit)}
                                className={`py-2 px-2 rounded-xl transition-all cursor-pointer border font-black text-xs text-center flex flex-col items-center justify-center gap-0.5 ${
                                  isSelected
                                    ? 'bg-[#14161B] text-[#FAF7F2] border-stone-800 shadow-md scale-102'
                                    : 'bg-[#FAF7F2] hover:bg-[#EDE4D5] text-[#14161B] border-[#D8CABA]'
                                }`}
                              >
                                <span className="truncate w-full">{h.nomor_unit}</span>
                                <span className={`text-[8px] font-mono font-bold ${isSelected ? 'text-[#FAF7F2]/90' : 'text-stone-500'}`}>
                                  {isSelected ? '✓ DIPILIH' : (h.kapasitas || 'DT')}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}

                  <div className="mt-2.5 pt-2 border-t border-[#E2D7C5]/60">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-stone-700 flex items-center gap-1">
                        <User className="w-3 h-3 text-stone-500" />
                        Nama Operator / Driver DT
                      </label>
                    </div>
                    <input
                      type="text"
                      value={operatorDt}
                      onChange={(e) => setOperatorDt(e.target.value)}
                      placeholder="Contoh: Dandi Arwanda, Julfandi..."
                      className="w-full px-3 py-1.5 bg-[#FAF7F2] border border-[#D8CABA] rounded-xl text-xs font-bold text-[#14161B] placeholder:font-normal focus:outline-none focus:border-[#7B1113]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FLEET CONFIGURATION MODAL */}
          {showFleetModal && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full p-6 border border-[#D8CABA] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-[#D8CABA]">
                  <div>
                    <h3 className="text-sm font-black text-[#14161B] uppercase">Atur Unit Armada Aktif (Shift Ini)</h3>
                    <p className="text-[11px] text-stone-600">Pilih unit Digger & Hauler yang beroperasi agar muncul sebagai kotak pilihan cepat.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFleetModal(false)}
                    className="w-8 h-8 rounded-full bg-[#EDE4D5] hover:bg-[#D8CABA] font-black text-xs text-[#14161B] flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Diggers selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-[#14161B] flex items-center gap-1.5">
                    <HardHat className="w-4 h-4 text-amber-700" /> Pilih Unit Digger Aktif & Masukkan Nama Operatornya:
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-white rounded-xl border border-[#D8CABA]">
                    {activeDiggers.map((d) => {
                      const isChecked = fleetDiggers.includes(d.nomor_unit);
                      return (
                        <div key={d.id || d.nomor_unit} className={`p-2.5 rounded-xl border transition-all ${isChecked ? 'bg-amber-50 border-[#7B1113]' : 'bg-[#FAF7F2] border-[#D8CABA]'}`}>
                          <button
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setFleetDiggers(fleetDiggers.filter(u => u !== d.nomor_unit));
                              } else {
                                setFleetDiggers([...fleetDiggers, d.nomor_unit]);
                              }
                            }}
                            className={`w-full py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                              isChecked
                                ? 'bg-[#7B1113] text-[#FAF7F2]'
                                : 'bg-white text-stone-800 hover:bg-stone-100'
                            }`}
                          >
                            <span>{d.nomor_unit} ({d.model || 'Excavator'})</span>
                            <span className="text-[10px] font-mono">{isChecked ? '✓ Terpilih' : '+ Pilih'}</span>
                          </button>

                          {isChecked && (
                            <div className="mt-2 pt-2 border-t border-amber-200">
                              <label className="block text-[10px] font-bold text-stone-700 mb-1">
                                Nama Operator {d.nomor_unit}:
                              </label>
                              <input
                                type="text"
                                value={diggerOperators[d.nomor_unit] || ''}
                                onChange={(e) => {
                                  setDiggerOperators({
                                    ...diggerOperators,
                                    [d.nomor_unit]: e.target.value
                                  });
                                }}
                                placeholder={`Masukkan nama operator ${d.nomor_unit}...`}
                                className="w-full px-2.5 py-1.5 bg-white border border-[#D8CABA] rounded-lg text-xs font-bold text-[#14161B] focus:outline-none focus:border-[#7B1113]"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>



                {/* Digger - Hauler Mapping Configuration Section */}
                <div className="space-y-2 pt-3 border-t border-[#D8CABA]">
                  <label className="block text-xs font-black text-[#14161B] flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#7B1113]" /> Mapping Hauler untuk Digger Terpilih (Digger-Hauler Master):
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto p-2 bg-white rounded-xl border border-[#D8CABA]">
                    {fleetDiggers.length === 0 ? (
                      <p className="text-xs text-stone-500 text-center py-2">Pilih unit digger aktif di atas terlebih dahulu.</p>
                    ) : (
                      fleetDiggers.map((dNum) => {
                        const assigned = diggerHaulerMap[dNum] || [];
                        return (
                          <div key={dNum} className="p-2.5 bg-[#FAF7F2] rounded-xl border border-[#D8CABA] space-y-1.5">
                            <div className="font-black text-xs text-[#7B1113]">Digger: {dNum} (Pilih Hauler Terasosiasi)</div>
                            <div className="flex flex-wrap gap-1">
                              {activeHaulers.map((h) => {
                                const isMapped = assigned.includes(h.nomor_unit);
                                return (
                                  <button
                                    key={h.nomor_unit}
                                    type="button"
                                    onClick={() => {
                                      const newAssigned = isMapped
                                        ? assigned.filter(u => u !== h.nomor_unit)
                                        : [...assigned, h.nomor_unit];
                                      setDiggerHaulerMap({
                                        ...diggerHaulerMap,
                                        [dNum]: newAssigned
                                      });
                                    }}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                      isMapped
                                        ? 'bg-[#14161B] text-[#FAF7F2] border-stone-800'
                                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                                    }`}
                                  >
                                    {h.nomor_unit} {isMapped ? '✓' : ''}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFleetModal(false)}
                    className="px-5 py-2.5 bg-[#7B1113] text-[#FAF7F2] rounded-xl font-black text-xs hover:bg-[#580A0B] cursor-pointer shadow-md"
                  >
                    Selesai & Simpan Armada
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: RUTE (FROM & TO) / FEEDING & CATCHING SHEET */}
          <div className="p-4 bg-[#F7F2E8]">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#14161B] flex items-center gap-1.5 mb-2.5">
              <MapPin className="w-3.5 h-3.5 text-[#7B1113]" />
              3. RUTE & 1-KLIK WP 1-10 SHEET
            </span>

            {jobCategory === 'FEEDING' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* From Pit / Stock */}
                  <div className="bg-[#EDE4D5] p-3.5 rounded-2xl border border-[#D6C7B2] space-y-3">
                    <label className="block font-black text-[#14161B] text-xs flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      FROM (Asal Pit / Stock) <span className="text-[#7B1113]">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {(['PIT SELATAN', 'PIT UTARA', 'STOCK ETO'] as const).map((pit) => (
                        <button
                          key={pit}
                          type="button"
                          onClick={() => {
                            if (dumpingStock === 'STOCK ETO' && pit === 'STOCK ETO') {
                              setErrorMsg('Jika Dumping Stock Stock ETO, Asal tidak boleh Stock ETO!');
                              return;
                            }
                            setErrorMsg(null);
                            setFeedingFrom(pit);
                            if (pit !== 'STOCK ETO') {
                              setDiggerUnit('');
                              setHaulerUnit('');
                            }
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border text-center ${
                            feedingFrom === pit
                              ? 'bg-[#14161B] text-[#FAF7F2] border-black shadow-sm'
                              : 'bg-[#FAF7F2] text-[#14161B] border-[#D8CABA] hover:bg-white'
                          }`}
                        >
                          {pit}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2.5"></div>
                  </div>

                  {/* Dumping Stock (TO) / WP */}
                  <div className="bg-[#EDE4D5] p-3.5 rounded-2xl border border-[#D6C7B2] sm:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block font-black text-[#14161B] text-xs flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#7B1113]" />
                        Dumping Stock (TO) / WP <span className="text-[#7B1113]">*</span>
                      </label>
                      {dumpingStock && (
                        <span className="text-xs font-mono font-black text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md border border-amber-300">
                          TO Dipilih: {dumpingStock}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {/* ETO Choices */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                        {(['ETO SELATAN', 'ETO UTARA', 'STOCK ETO'] as const).map((eto) => (
                          <button
                            key={eto}
                            type="button"
                            onClick={() => {
                              if (eto === 'STOCK ETO' && feedingFrom === 'STOCK ETO') {
                                setErrorMsg('Jika Dumping Stock Stock ETO, Asal (FROM) harus Pit Selatan atau Pit Utara!');
                                return;
                              }
                              setErrorMsg(null);
                              setDumpingStock(eto);
                            }}
                            className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border text-center ${
                              dumpingStock === eto
                                ? 'bg-[#7B1113] text-[#FAF7F2] border-[#580A0B] shadow-sm'
                                : 'bg-[#FAF7F2] text-[#14161B] border-[#D8CABA] hover:bg-white'
                            }`}
                          >
                            {eto}
                          </button>
                        ))}
                      </div>

                      {/* WP 1-10 Choices */}
                      <div>
                        <div className="text-[11px] font-black text-[#7B1113] mb-1.5 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-600" />
                          Atau Pilih Tujuan WP (1 - 10):
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((wpNum) => {
                            const wpName = `WP ${wpNum}`;
                            return (
                              <button
                                key={wpNum}
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => {
                                  setErrorMsg(null);
                                  setDumpingStock(wpName);
                                }}
                                className={`py-2.5 px-2 rounded-xl transition-all cursor-pointer border font-black text-xs text-center flex flex-col items-center justify-center gap-0.5 ${
                                  dumpingStock === wpName
                                    ? 'bg-amber-400 text-stone-900 border-amber-600 shadow-md scale-105'
                                    : 'bg-[#FAF7F2] hover:bg-white text-[#14161B] border-[#D8CABA]'
                                }`}
                              >
                                <span>{wpName}</span>
                                <span className="text-[8px] font-mono font-bold opacity-80">
                                  {dumpingStock === wpName ? '✓ DIPILIH TO' : 'PILIH WP'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {jobCategory === 'CATCHING' && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300">
                    <label className="block font-black text-amber-900 mb-2.5 text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      Kategori Catching — Pilih Oversize / Undersize <span className="text-[#7B1113]">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(['OVERSIZE', 'UNDERSIZE'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setCatchingType(opt)}
                          className={`py-3.5 px-6 rounded-2xl text-sm font-black transition-all cursor-pointer border shadow-sm ${
                            catchingType === opt
                              ? 'bg-[#7B1113] text-[#FAF7F2] border-[#580A0B] scale-102'
                              : 'bg-[#FAF7F2] text-amber-900 border-amber-300 hover:bg-white'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      FROM (Lokasi Asal) <span className="text-[#7B1113]">*</span>
                    </label>
                    <SearchableSelect
                      options={activeLocationsFrom.map((loc) => ({
                        value: loc.nama_location,
                        label: loc.nama_location,
                        subLabel: 'Asal',
                        badge: 'Origin'
                      }))}
                      value={fromLocation}
                      onChange={(val) => setFromLocation(val)}
                      placeholder="Pilih Asal (EFO HG 1, EFO SELATAN)..."
                      searchPlaceholder="Cari lokasi asal..."
                      icon={<MapPin className="w-4 h-4 text-emerald-700" />}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      TO (Lokasi Tujuan) <span className="text-[#7B1113]">*</span>
                    </label>
                    <SearchableSelect
                      options={activeLocationsTo.map((loc) => ({
                        value: loc.nama_location,
                        label: loc.nama_location,
                        subLabel: 'Tujuan',
                        badge: 'Destination'
                      }))}
                      value={toLocation}
                      onChange={(val) => setToLocation(val)}
                      placeholder="Pilih Tujuan (JETTY ANTAM, ICA)..."
                      searchPlaceholder="Cari lokasi tujuan..."
                      icon={<MapPin className="w-4 h-4 text-[#7B1113]" />}
                    />
                  </div>
                </div>
              </div>
            )}

            {!['FEEDING', 'CATCHING'].includes(jobCategory) && fromLocation && toLocation && fromLocation.toUpperCase() === toLocation.toUpperCase() && (
              <p className="text-xs text-[#7B1113] font-bold mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Lokasi FROM dan TO tidak boleh sama!
              </p>
            )}
          </div>

          {/* SECTION 4: JOB CATEGORY, MATERIAL, BUCKET & PRODUKSI (SATUAN TON) */}
          <div className="p-4 bg-[#FAF7F2]">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#14161B] flex items-center gap-1.5 mb-2.5">
              <Layers className="w-3.5 h-3.5 text-[#7B1113]" />
              4. JOB CATEGORY, MATERIAL & PRODUKSI
            </span>

            <div className="mb-3">
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Job Category <span className="text-[#7B1113]">*</span>
              </label>
              <select
                value={jobCategory}
                onChange={(e) => setJobCategory(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#D8CABA] rounded-xl text-xs font-bold text-[#14161B] focus:outline-none focus:border-[#7B1113]"
                required
              >
                <option value="" disabled>
                  -- Pilih Job Category --
                </option>
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

            {jobCategory !== 'FEEDING' && (
              <div className="mb-3 animate-in fade-in">
                <label className="block text-[11px] font-bold text-[#7B1113] mb-1">
                  Kode Tumpukan / Kode Lot { (jobCategory.includes('JETTY') || jobCategory.includes('BARGING') || jobCategory.includes('CATCHING') || jobCategory.includes('SUPPLY')) && <span className="text-[#7B1113]">*</span> }
                </label>
                <input
                  type="text"
                  value={kodeLot}
                  onChange={(e) => setKodeLot(e.target.value)}
                  placeholder="Contoh: LOT-A1 / TUMPUKAN-03..."
                  className="w-full p-2.5 bg-white border-2 border-[#7B1113]/30 rounded-xl text-xs font-bold text-[#14161B] focus:outline-none focus:border-[#7B1113]"
                  required={jobCategory.includes('JETTY') || jobCategory.includes('BARGING') || jobCategory.includes('CATCHING') || jobCategory.includes('SUPPLY')}
                />
              </div>
            )}

            {jobCategory !== 'FEEDING' && (
              <>
                <div className="mb-3">
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Jenis Material <span className="text-[#7B1113]">*</span>
                  </label>
                  <SearchableSelect
                    options={activeMaterials.map((m) => ({
                      value: m.nama_material,
                      label: m.nama_material,
                      badge: m.satuan
                    }))}
                    value={material}
                    onChange={handleMaterialChange}
                    placeholder="Pilih Material (Wbx, Cbx, Crushing, FLG)..."
                    searchPlaceholder="Cari material..."
                    icon={<Layers className="w-4 h-4 text-amber-700" />}
                  />
                </div>

                <div className="bg-[#F7F2E8] p-3.5 rounded-2xl border border-[#E2D7C5] space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-black text-[#14161B]">
                        JUMLAH BUCKET <span className="text-[#7B1113]">*</span>
                      </label>
                      <span className="text-[10px] text-stone-600 font-semibold">
                        Ketuk angka atau tombol +/-
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleBucketChange(jumlahBucket - 1)}
                        className="w-10 h-10 rounded-xl bg-[#EDE4D5] hover:bg-[#E2D7C5] active:scale-95 border border-[#D8CABA] flex items-center justify-center font-bold text-lg text-[#14161B] cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={jumlahBucket}
                          onChange={(e) => handleBucketChange(Number(e.target.value))}
                          className="w-full text-center py-2 bg-[#FAF7F2] border-2 border-[#D8CABA] rounded-xl text-lg font-mono font-black text-[#14161B] focus:border-[#7B1113] focus:outline-none"
                          required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-500">
                          Bucket
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleBucketChange(jumlahBucket + 1)}
                        className="w-10 h-10 rounded-xl bg-[#EDE4D5] hover:bg-[#E2D7C5] active:scale-95 border border-[#D8CABA] flex items-center justify-center font-bold text-lg text-[#14161B] cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2">
                      {quickBucketNumbers.map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleBucketChange(num)}
                          className={`flex-1 py-1 text-xs font-black rounded-lg border transition-colors cursor-pointer ${
                            jumlahBucket === num
                              ? 'bg-[#7B1113] text-[#FAF7F2] border-[#580A0B]'
                              : 'bg-[#FAF7F2] hover:bg-[#EDE4D5] text-[#14161B] border-[#D8CABA]'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* RUMUS KALKULASI OTOMATIS: BUCKET * BUCKET FACTOR (TON) */}
                  <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#D8CABA]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-extrabold text-[#7B1113] uppercase flex items-center gap-1">
                        <Calculator className="w-3.5 h-3.5" />
                        Kalkulasi Produksi Ton
                      </span>
                      <span className="text-[10px] font-bold text-stone-600">
                        Satuan: <strong>Ton</strong>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#F7F2E8] border border-[#E2D7C5] font-mono">
                      <div className="text-stone-700">
                        <strong>{jumlahBucket}</strong> Bkt &times; <strong>{currentBucketFactor}</strong> BF ({material})
                      </div>
                      <div className="text-sm font-black text-[#7B1113]">
                        = {produksi} Ton
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-stone-500">
                      <span>Unit: <strong>{diggerUnit || '-'}</strong></span>
                      <span>Bucket Factor: <strong>{currentBucketFactor}</strong></span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* SECTION 5: CATATAN (PREPARE FRONT) */}
          {!['FEEDING', 'CATCHING'].includes(jobCategory) && (
            <div className="p-4 bg-[#F7F2E8]">
              <label className="block text-[11px] font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-stone-500" />
                Catatan Khusus Lapangan <span className="text-stone-400 font-normal">(Opsional)</span>
              </label>

              {jobCategory === 'CATCHING' && material === 'Wbx' && (
                <div className="mb-2.5 p-3 bg-amber-50 border border-amber-300 rounded-xl">
                  <p className="text-[11px] font-black text-amber-900 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-700" /> Keterangan Catching (Wbx): Pilih Kategori
                  </p>
                  <div className="flex items-center gap-2">
                    {['OVERSIZE', 'UNDERSIZE'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCatatan(opt)}
                        className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                          catatan === opt
                            ? 'bg-[#7B1113] text-[#FAF7F2] border-[#580A0B] shadow-sm'
                            : 'bg-[#FAF7F2] text-[#14161B] border-[#D8CABA] hover:bg-[#EDE4D5]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Delay, antrian front, prepare front, jalan licin..."
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D8CABA] rounded-xl text-xs text-[#14161B] focus:outline-none focus:border-[#7B1113]"
              />

              <div className="flex flex-wrap items-center gap-1 mt-2">
                {quickNoteChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setCatatan(catatan ? `${catatan}, ${chip}` : chip)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-[#FAF7F2] hover:bg-[#EDE4D5] border border-[#D8CABA] text-[#14161B] font-medium transition-colors cursor-pointer"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 6: ACTIONS */}
          <div className="p-4 bg-[#FAF7F2] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-3.5 py-2.5 rounded-xl border border-[#D8CABA] bg-[#EDE4D5] hover:bg-[#E2D7C5] text-[#14161B] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
              Reset
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-6 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] border border-[#580A0B] text-[#FAF7F2] font-black text-sm tracking-wide shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>MENYIMPAN...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-amber-300" />
                  <span>SUBMIT RITASE ({liveClock})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* STICKY BOTTOM SUBMIT BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#14161B]/95 backdrop-blur-md border-t-2 border-[#7B1113] p-2.5 sm:hidden shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2.5">
          <div className="flex flex-col text-left pl-1">
            <span className="text-[10px] text-stone-400 font-mono">
              Auto: <span className="text-amber-400 font-bold">{liveClock}</span>
            </span>
            <span className="text-[11px] text-[#FAF7F2] font-black truncate max-w-[130px]">
              {diggerUnit || 'Digger'} &rarr; {haulerUnit || 'DT'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] font-black text-xs tracking-wider border border-[#580A0B] shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
          >
            {isSubmitting ? (
              <span>MENYIMPAN...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-amber-300" />
                <span>SUBMIT RITASE CEPAT</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
