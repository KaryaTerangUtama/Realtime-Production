import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Clock, Send, CheckCircle, AlertCircle, Calendar, RefreshCw, ExternalLink } from 'lucide-react';
import { RitaseRecord } from '../types';
import { MastersData } from '../services/api';

interface AutoEmailReportProps {
  ritaseList: RitaseRecord[];
  masters: MastersData;
}

export const AutoEmailReport: React.FC<AutoEmailReportProps> = ({ ritaseList }) => {
  const targetEmail = 'yuliana.sastra@karyaterangutama.com';
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto Schedule State
  const [isAutoScheduleActive, setIsAutoScheduleActive] = useState<boolean>(() => {
    return localStorage.getItem('ktu_auto_email_schedule') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('ktu_auto_email_schedule', String(isAutoScheduleActive));
  }, [isAutoScheduleActive]);

  // Helper to determine shift
  const getShiftInfo = (waktu: string) => {
    if (!waktu) return { label: 'Shift 1 (07:00 - 19:00)', code: 'shift1' };
    const [hStr] = waktu.split(':');
    const h = parseInt(hStr, 10);
    if (!isNaN(h) && h >= 7 && h < 19) {
      return { label: 'Shift 1 (07:00 - 19:00)', code: 'shift1' };
    }
    return { label: 'Shift 2 (19:00 - 07:00)', code: 'shift2' };
  };

  // Filter records for selected date
  const dateRecords = useMemo(() => {
    return ritaseList.filter((r) => r.tanggal === selectedDate);
  }, [ritaseList, selectedDate]);

  // Separate Shift 1 and Shift 2
  const shift1Records = useMemo(() => {
    return dateRecords.filter((r) => getShiftInfo(r.waktu).code === 'shift1');
  }, [dateRecords]);

  const shift2Records = useMemo(() => {
    return dateRecords.filter((r) => getShiftInfo(r.waktu).code === 'shift2');
  }, [dateRecords]);

  // Stats
  const shift1Stats = useMemo(() => {
    return {
      count: shift1Records.length,
      bucket: shift1Records.reduce((acc, curr) => acc + (Number(curr.jumlah_bucket) || 0), 0),
      produksi: shift1Records.reduce((acc, curr) => acc + (Number(curr.produksi) || 0), 0)
    };
  }, [shift1Records]);

  const shift2Stats = useMemo(() => {
    return {
      count: shift2Records.length,
      bucket: shift2Records.reduce((acc, curr) => acc + (Number(curr.jumlah_bucket) || 0), 0),
      produksi: shift2Records.reduce((acc, curr) => acc + (Number(curr.produksi) || 0), 0)
    };
  }, [shift2Records]);

  // Handle Send Email via API
  const handleSendReport = async () => {
    setIsSending(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          subject: `Laporan Harian FMS KTU - Shift 1 & Shift 2 [${selectedDate}]`,
          date: selectedDate,
          shift1Stats,
          shift2Stats,
          userName: 'Yuliana Sastra'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim email');
      }

      setSuccessMsg(`Laporan Shift 1 & Shift 2 tanggal ${selectedDate} berhasil dikirim ke ${targetEmail}!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim email laporan.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Mailto Client dispatch as reliable fallback
  const handleOpenMailClient = () => {
    const subject = encodeURIComponent(`Laporan Harian FMS KTU - Shift 1 & Shift 2 [${selectedDate}]`);
    const bodyText = encodeURIComponent(
      `LAPORAN REKAPITULASI RITASE FMS - PT. KARYA TERANG UTAMA\n` +
      `Tanggal: ${selectedDate}\n\n` +
      `========================================\n` +
      `☀️ SHIFT 1 (07:00 - 19:00)\n` +
      `- Total Ritase: ${shift1Stats.count} Ritase\n` +
      `- Total Bucket: ${shift1Stats.bucket} Bucket\n` +
      `- Total Produksi: ${shift1Stats.produksi.toFixed(2)} Ton\n\n` +
      `🌙 SHIFT 2 (19:00 - 07:00)\n` +
      `- Total Ritase: ${shift2Stats.count} Ritase\n` +
      `- Total Bucket: ${shift2Stats.bucket} Bucket\n` +
      `- Total Produksi: ${shift2Stats.produksi.toFixed(2)} Ton\n` +
      `========================================\n\n` +
      `Kirim otomatis via Fleet Management System KTU.`
    );

    window.open(`mailto:${targetEmail}?subject=${subject}&body=${bodyText}`, '_blank');
  };

  return (
    <div className="bg-[#FAF7F2] rounded-3xl border-2 border-[#D8CABA] p-6 shadow-md space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2D7C5] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#7B1113] text-amber-300">
              <Mail className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-[#14161B]">
              PENGIRIMAN LAPORAN EMAIL OTOMATIS
            </h2>
          </div>
          <p className="text-xs text-stone-600 mt-1">
            Kirim rekapitulasi data ritase Shift 1 dan Shift 2 ke <strong>{targetEmail}</strong>.
          </p>
        </div>

        <div className="bg-[#EDE4D5] px-4 py-2 rounded-xl border border-[#D8CABA] text-xs font-mono font-bold text-stone-800">
          Tujuan: <span className="text-[#7B1113]">{targetEmail}</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-bold text-emerald-900">Berhasil Dikirim!</div>
            <div className="mt-0.5 text-emerald-800">{successMsg}</div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-bold text-rose-900">Perhatian:</div>
            <div className="mt-0.5 text-rose-800">{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Date & Auto Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#F7F2E8] p-4 rounded-2xl border border-[#E2D7C5]">
          <label className="block text-xs font-black text-stone-700 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#7B1113]" />
            Pilih Tanggal Laporan
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D8CABA] rounded-xl text-xs font-bold text-[#14161B] focus:outline-none focus:border-[#7B1113]"
          />
        </div>

        <div className="bg-[#F7F2E8] p-4 rounded-2xl border border-[#E2D7C5] flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-stone-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-700" />
              Jadwal Kirim Otomatis Harian
            </div>
            <p className="text-[11px] text-stone-600 mt-0.5">
              Kirim otomatis setiap jam 07:00 & 19:00
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAutoScheduleActive(!isAutoScheduleActive)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer border ${
              isAutoScheduleActive
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                : 'bg-stone-200 text-stone-700 border-stone-300'
            }`}
          >
            {isAutoScheduleActive ? '🟢 AKTIF' : '⚪ NONAKTIF'}
          </button>
        </div>
      </div>

      {/* Preview Stats Shift 1 & Shift 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Shift 1 Preview */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1">
              ☀️ SHIFT 1 (07:00 - 19:00)
            </span>
            <span className="text-xs font-mono font-bold text-amber-900">
              {shift1Stats.count} Ritase
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/60 text-xs">
            <div className="bg-white/80 p-2 rounded-xl border border-amber-200">
              <div className="text-[10px] text-amber-700 font-bold">Total Bucket</div>
              <div className="font-mono font-black text-sm text-stone-800">{shift1Stats.bucket}</div>
            </div>
            <div className="bg-white/80 p-2 rounded-xl border border-amber-200">
              <div className="text-[10px] text-amber-700 font-bold">Total Produksi</div>
              <div className="font-mono font-black text-sm text-[#7B1113]">{shift1Stats.produksi.toFixed(2)} Ton</div>
            </div>
          </div>
        </div>

        {/* Shift 2 Preview */}
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-900 bg-indigo-200/80 px-2.5 py-1 rounded-lg border border-indigo-300 flex items-center gap-1">
              🌙 SHIFT 2 (19:00 - 07:00)
            </span>
            <span className="text-xs font-mono font-bold text-indigo-900">
              {shift2Stats.count} Ritase
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-200/60 text-xs">
            <div className="bg-white/80 p-2 rounded-xl border border-indigo-200">
              <div className="text-[10px] text-indigo-700 font-bold">Total Bucket</div>
              <div className="font-mono font-black text-sm text-stone-800">{shift2Stats.bucket}</div>
            </div>
            <div className="bg-white/80 p-2 rounded-xl border border-indigo-200">
              <div className="text-[10px] text-indigo-700 font-bold">Total Produksi</div>
              <div className="font-mono font-black text-sm text-[#7B1113]">{shift2Stats.produksi.toFixed(2)} Ton</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleOpenMailClient}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#14161B] hover:bg-stone-800 text-amber-300 font-black text-xs shadow-md transition-colors cursor-pointer"
        >
          <ExternalLink className="w-4 h-4 text-amber-300" />
          <span>Buka Email Klien (1-Klik Kirim)</span>
        </button>

        <button
          type="button"
          onClick={handleSendReport}
          disabled={isSending}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#7B1113] hover:bg-[#580A0B] text-amber-300 font-black text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
        >
          {isSending ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
              <span>Mengirim ke {targetEmail}...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 text-amber-300" />
              <span>Kirim Laporan Otomatis (Server)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
