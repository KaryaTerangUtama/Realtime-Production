import React, { useState } from 'react';
import { History, X, Search, ShieldCheck, ArrowRight, Clock, UserCheck } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLog[];
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose, logs }) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase();
    return (
      log.details.toLowerCase().includes(q) ||
      log.user_name.toLowerCase().includes(q) ||
      log.entity.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.entity_id.toLowerCase().includes(q)
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#E8F5E9] text-emerald-900 border border-emerald-300">
            CREATE
          </span>
        );
      case 'UPDATE':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#FFF8E1] text-amber-900 border border-amber-300">
            UPDATE
          </span>
        );
      case 'DELETE':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#FFEBEE] text-rose-900 border border-rose-300">
            DELETE
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EDE4D5] text-[#181A1F] border border-[#D6C7B2]">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-2xl w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#14161B] p-5 text-[#FAF7F2] border-b-2 border-[#7B1113] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-sm font-black text-[#FAF7F2] tracking-wide">
                LOG AUDIT & JEJAK REKAM SISTEM
              </h3>
              <p className="text-xs text-[#D8CEBF]">
                Riwayat input ritase dan perubahan data PT. Karya Terang Utama
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#D8CEBF] hover:text-[#FAF7F2] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 bg-[#F5EFE6] border-b border-[#E2D7C5]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari audit log berdasarkan nama, entitas, ID atau deskripsi..."
              className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
            />
          </div>
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E2D7C5] p-3 space-y-1 bg-[#FAF7F2]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">
              Tidak ada log audit yang cocok.
            </div>
          ) : (
            filtered.map((log) => (
              <div key={log.id} className="py-3 px-3 space-y-1 text-xs hover:bg-[#EDE4D5] rounded-xl transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getActionBadge(log.action)}
                    <span className="font-mono font-bold text-stone-700">{log.entity}</span>
                    <span className="text-stone-400">&bull;</span>
                    <span className="font-black text-[#181A1F]">{log.user_name}</span>
                  </div>
                  <span className="text-[11px] text-stone-500 flex items-center gap-1 font-mono font-semibold">
                    <Clock className="w-3 h-3 text-[#7B1113]" />
                    {new Date(log.timestamp).toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="text-stone-700 pl-1 font-medium">{log.details}</p>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E2D7C5] bg-[#F5EFE6] flex items-center justify-between text-xs text-stone-600">
          <span className="font-semibold">Menampilkan {filtered.length} riwayat log aktivitas.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] rounded-xl font-bold cursor-pointer border border-[#580A0B]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
