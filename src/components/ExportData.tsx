import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle,
  FileText,
  Calendar,
  Layers,
  RotateCcw
} from 'lucide-react';
import { RitaseRecord } from '../types';
import { MastersData } from '../services/api';
import { AutoEmailReport } from './AutoEmailReport';

interface ExportDataProps {
  ritaseList: RitaseRecord[];
  masters: MastersData;
}

export const ExportData: React.FC<ExportDataProps> = ({ ritaseList, masters }) => {
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterChecker, setFilterChecker] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterDigger, setFilterDigger] = useState('');
  const [filterHauler, setFilterHauler] = useState('');
  const [filterKodeLot, setFilterKodeLot] = useState('');

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const availableLots = useMemo(() => {
    const set = new Set<string>();
    ritaseList.forEach((r) => {
      if (r.kode_lot && r.kode_lot.trim()) {
        set.add(r.kode_lot.trim().toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [ritaseList]);

  const resetFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterChecker('');
    setFilterMaterial('');
    setFilterDigger('');
    setFilterHauler('');
    setFilterKodeLot('');
  };

  const filteredData = useMemo(() => {
    return ritaseList.filter((r) => {
      if (filterStartDate && r.tanggal < filterStartDate) return false;
      if (filterEndDate && r.tanggal > filterEndDate) return false;
      if (filterChecker && r.checker_name.toLowerCase() !== filterChecker.toLowerCase()) return false;
      if (filterMaterial && r.material.toLowerCase() !== filterMaterial.toLowerCase()) return false;
      if (filterDigger && r.digger_unit.toLowerCase() !== filterDigger.toLowerCase()) return false;
      if (filterHauler && r.hauler_unit.toLowerCase() !== filterHauler.toLowerCase()) return false;
      if (filterKodeLot) {
        if (filterKodeLot === '__WITH_LOT__') {
          if (!r.kode_lot || r.kode_lot.trim().length === 0) return false;
        } else if (filterKodeLot === '__NO_LOT__') {
          if (r.kode_lot && r.kode_lot.trim().length > 0) return false;
        } else if ((r.kode_lot || '').toLowerCase() !== filterKodeLot.toLowerCase()) {
          return false;
        }
      }
      return true;
    });
  }, [
    ritaseList,
    filterStartDate,
    filterEndDate,
    filterChecker,
    filterMaterial,
    filterDigger,
    filterHauler,
    filterKodeLot
  ]);

  const totalFilteredRitase = filteredData.length;
  const totalFilteredProduksi = filteredData.reduce((acc, curr) => acc + (Number(curr.produksi) || 0), 0);
  const totalFilteredBucket = filteredData.reduce((acc, curr) => acc + (Number(curr.jumlah_bucket) || 0), 0);

  // Generate Excel (.xlsx) file
  const handleExportExcel = () => {
    setIsExporting(true);
    setExportSuccess(null);

    try {
      // 1. Prepare Data Ritase Sheet
      const sheetData = filteredData.map((item, idx) => ({
        'No': idx + 1,
        'ID Transaksi': item.id,
        'Tanggal': item.tanggal,
        'Waktu': item.waktu,
        'Checker': item.checker_name,
        'Digger': item.digger_unit,
        'Operator Digger': item.operator_digger || '-',
        'Hauler': item.hauler_unit,
        'Operator DT': item.operator_dt || '-',
        'From': item.from_location,
        'To': item.to_location,
        'Job Category': item.job_category || 'ORE GETTING',
        'Kode Lot / Tumpukan': item.kode_lot || '-',
        'Material': item.material,
        'Bucket': item.jumlah_bucket,
        'Bucket Factor': item.bucket_factor || 5,
        'Produksi': item.produksi,
        'Satuan': item.satuan_produksi,
        'User Input': item.user_name || item.created_by,
        'Catatan': item.catatan || '',
        'Created At': item.created_at
      }));

      // 2. Summary by Checker
      const checkerMap = new Map<string, { ritase: number; bucket: number; produksi: number }>();
      filteredData.forEach((r) => {
        const prev = checkerMap.get(r.checker_name) || { ritase: 0, bucket: 0, produksi: 0 };
        checkerMap.set(r.checker_name, {
          ritase: prev.ritase + 1,
          bucket: prev.bucket + (Number(r.jumlah_bucket) || 0),
          produksi: prev.produksi + (Number(r.produksi) || 0)
        });
      });
      const summaryCheckerData = Array.from(checkerMap.entries()).map(([name, stat], idx) => ({
        'No': idx + 1,
        'Nama Checker': name,
        'Total Ritase': stat.ritase,
        'Total Bucket': stat.bucket,
        'Total Produksi (Ton)': stat.produksi
      }));

      // 3. Summary by Unit (Digger & Hauler)
      const unitMap = new Map<string, { type: string; ritase: number; bucket: number; produksi: number }>();
      filteredData.forEach((r) => {
        if (r.digger_unit) {
          const key = `Digger: ${r.digger_unit}`;
          const prev = unitMap.get(key) || { type: 'Digger', ritase: 0, bucket: 0, produksi: 0 };
          unitMap.set(key, { ...prev, ritase: prev.ritase + 1, bucket: prev.bucket + (Number(r.jumlah_bucket) || 0), produksi: prev.produksi + (Number(r.produksi) || 0) });
        }
        if (r.hauler_unit) {
          const key = `Hauler: ${r.hauler_unit}`;
          const prev = unitMap.get(key) || { type: 'Hauler', ritase: 0, bucket: 0, produksi: 0 };
          unitMap.set(key, { ...prev, ritase: prev.ritase + 1, bucket: prev.bucket + (Number(r.jumlah_bucket) || 0), produksi: prev.produksi + (Number(r.produksi) || 0) });
        }
      });
      const summaryUnitData = Array.from(unitMap.entries()).map(([unit, stat], idx) => ({
        'No': idx + 1,
        'Tipe Unit': stat.type,
        'Nomor Unit': unit.replace(/^(Digger|Hauler): /, ''),
        'Total Ritase': stat.ritase,
        'Total Bucket': stat.bucket,
        'Total Produksi (Ton)': stat.produksi
      }));

      // 4. Summary by Job Category (Kegiatan)
      const jobMap = new Map<string, { ritase: number; bucket: number; produksi: number }>();
      filteredData.forEach((r) => {
        const job = r.job_category || 'ORE GETTING';
        const prev = jobMap.get(job) || { ritase: 0, bucket: 0, produksi: 0 };
        jobMap.set(job, {
          ritase: prev.ritase + 1,
          bucket: prev.bucket + (Number(r.jumlah_bucket) || 0),
          produksi: prev.produksi + (Number(r.produksi) || 0)
        });
      });
      const summaryJobData = Array.from(jobMap.entries()).map(([job, stat], idx) => ({
        'No': idx + 1,
        'Job Category / Kegiatan': job,
        'Total Ritase': stat.ritase,
        'Total Bucket': stat.bucket,
        'Total Produksi (Ton)': stat.produksi
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();

      const ws1 = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws1, 'DATA RITASE');

      const ws2 = XLSX.utils.json_to_sheet(summaryCheckerData);
      XLSX.utils.book_append_sheet(wb, ws2, 'REKAP CHECKER');

      const ws3 = XLSX.utils.json_to_sheet(summaryUnitData);
      XLSX.utils.book_append_sheet(wb, ws3, 'REKAP UNIT');

      const ws4 = XLSX.utils.json_to_sheet(summaryJobData);
      XLSX.utils.book_append_sheet(wb, ws4, 'REKAP KEGIATAN');

      // File name format
      const dateTag = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const filename = `KTU_FORM_CHECKER_RITASE_${dateTag}.xlsx`;

      // Trigger download
      XLSX.writeFile(wb, filename);

      setExportSuccess(`File Excel "${filename}" berhasil diexport dengan ${filteredData.length} baris data.`);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Gagal mengekspor file: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Generate CSV download
  const handleExportCSV = () => {
    try {
      const headers = [
        'No',
        'Tanggal',
        'Waktu',
        'Checker',
        'Digger',
        'Hauler',
        'From',
        'To',
        'Job Category',
        'Kode Lot',
        'Material',
        'Bucket',
        'Produksi',
        'Satuan',
        'User Input',
        'Catatan'
      ];

      const rows = filteredData.map((item, idx) => [
        idx + 1,
        `"${item.tanggal}"`,
        `"${item.waktu}"`,
        `"${item.checker_name}"`,
        `"${item.digger_unit}"`,
        `"${item.hauler_unit}"`,
        `"${item.from_location}"`,
        `"${item.to_location}"`,
        `"${item.job_category || 'ORE GETTING'}"`,
        `"${item.kode_lot || '-'}"`,
        `"${item.material}"`,
        item.jumlah_bucket,
        item.produksi,
        `"${item.satuan_produksi}"`,
        `"${item.user_name || item.created_by}"`,
        `"${(item.catatan || '').replace(/"/g, '""')}"`
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `KTU_DATA_RITASE_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSuccess('File CSV berhasil diunduh.');
    } catch (err: any) {
      alert('Gagal ekspor CSV: ' + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-[#FAF7F2] rounded-2xl p-6 shadow-xs border border-[#E2D7C5]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#7B1113]">
                  Pelaporan & Ekspor Data Tambang
                </span>
              </div>
              <h2 className="text-2xl font-black text-[#181A1F] tracking-tight mt-0.5">
                EXPORT DATA EXCEL & CSV
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
                PT. KARYA TERANG UTAMA &bull; Unduh data ritase checker lengkap dalam format resmi Microsoft Excel (.xlsx) atau CSV.
              </p>
            </div>
          </div>
        </div>
      </div>

      {exportSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3 shadow-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold">{exportSuccess}</span>
        </div>
      )}

      {/* Filter Options */}
      <div className="bg-[#FAF7F2] rounded-2xl p-6 shadow-xs border border-[#E2D7C5] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black text-[#181A1F] uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#7B1113]" />
            <span>Kustomisasi Filter Ekspor</span>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs font-bold text-[#7B1113] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filter
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-stone-700 mb-1 flex items-center justify-between">
              <span>Kode Lot</span>
              {filterKodeLot && (
                <button
                  type="button"
                  onClick={() => setFilterKodeLot('')}
                  className="text-[10px] text-[#7B1113] hover:underline"
                >
                  reset
                </button>
              )}
            </label>
            <select
              value={filterKodeLot}
              onChange={(e) => setFilterKodeLot(e.target.value)}
              className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
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
            <label className="block font-bold text-stone-700 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Checker</label>
            <select
              value={filterChecker}
              onChange={(e) => setFilterChecker(e.target.value)}
              className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
            >
              <option value="">Semua Checker</option>
              {masters.checkers.map((c) => (
                <option key={c.id} value={c.nama_checker}>
                  {c.nama_checker}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Material</label>
            <select
              value={filterMaterial}
              onChange={(e) => setFilterMaterial(e.target.value)}
              className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
            >
              <option value="">Semua Material</option>
              {masters.materials.map((m) => (
                <option key={m.id} value={m.nama_material}>
                  {m.nama_material}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Unit Digger</label>
            <select
              value={filterDigger}
              onChange={(e) => setFilterDigger(e.target.value)}
              className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
            >
              <option value="">Semua Digger</option>
              {masters.diggers.map((d) => (
                <option key={d.id} value={d.nomor_unit}>
                  {d.nomor_unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Unit Hauler</label>
            <select
              value={filterHauler}
              onChange={(e) => setFilterHauler(e.target.value)}
              className="w-full px-3 py-2 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
            >
              <option value="">Semua Hauler</option>
              {masters.haulers.map((h) => (
                <option key={h.id} value={h.nomor_unit}>
                  {h.nomor_unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data summary to be exported */}
        <div className="bg-[#EDE4D5] rounded-xl p-4 border border-[#D6C7B2] grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-stone-600 font-semibold">Data Siap Diexport:</span>
            <div className="text-xl font-black text-[#7B1113] font-mono mt-0.5">
              {totalFilteredRitase} Rit
            </div>
          </div>
          <div>
            <span className="text-stone-600 font-semibold">Total Produksi:</span>
            <div className="text-xl font-black text-[#181A1F] font-mono mt-0.5">
              {totalFilteredProduksi.toLocaleString('id-ID')} Ton
            </div>
          </div>
          <div>
            <span className="text-stone-600 font-semibold">Total Bucket:</span>
            <div className="text-xl font-black text-[#181A1F] font-mono mt-0.5">
              {totalFilteredBucket} Bucket
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-[#FAF7F2] rounded-2xl p-6 shadow-xs border border-[#E2D7C5] space-y-4">
        <h3 className="text-sm font-black text-[#181A1F] uppercase tracking-wide">
          Pilih Format Unduhan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Excel Button */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting || totalFilteredRitase === 0}
            className="p-5 rounded-2xl border-2 border-emerald-700 bg-[#E8F5E9] hover:bg-[#C8E6C9] text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
              </div>
              <Download className="w-4 h-4 text-emerald-800 group-hover:translate-y-0.5 transition-transform" />
            </div>
            <h4 className="text-base font-black text-emerald-950">
              Download File Excel (.xlsx)
            </h4>
            <p className="text-xs text-emerald-900 mt-1 font-medium">
              Format spreadsheet resmi lengkap dengan sheet <strong>DATA RITASE</strong> dan <strong>REKAP CHECKER</strong>.
            </p>
          </button>

          {/* CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={totalFilteredRitase === 0}
            className="p-5 rounded-2xl border-2 border-[#580A0B] bg-[#FDF0F0] hover:bg-[#F9DADA] text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#7B1113] text-white flex items-center justify-center shadow-xs">
                <FileText className="w-5 h-5 text-amber-200" />
              </div>
              <Download className="w-4 h-4 text-[#7B1113] group-hover:translate-y-0.5 transition-transform" />
            </div>
            <h4 className="text-base font-black text-[#580A0B]">
              Download File CSV (.csv)
            </h4>
            <p className="text-xs text-[#7B1113] mt-1 font-medium">
              File teks terpisah koma (Comma Separated Values) ringan untuk integrasi database atau software lain.
            </p>
          </button>
        </div>
      </div>

      {/* Auto Email Report Section */}
      <AutoEmailReport ritaseList={ritaseList} masters={masters} />
    </div>
  );
};
