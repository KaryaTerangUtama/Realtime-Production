import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState<boolean>(true);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Cara Menginstal Aplikasi FMS KTU:\n\n1. Di Google Chrome / Edge (Desktop/Android):\n   - Klik menu titik tiga (...) di pojok kanan atas browser.\n   - Pilih "Instal Aplikasi FMS..." atau "Tambahkan ke Layar Utama".\n\n2. Di Safari (iPhone/iPad):\n   - Ketuk ikon Bagikan (Share) di bagian bawah.\n   - Pilih "Add to Home Screen" (Tambahkan ke Layar Utama).');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-[#14161B] text-[#FAF7F2] p-4 rounded-2xl shadow-2xl border-2 border-[#7B1113] max-w-sm flex items-center gap-4 animate-in slide-in-from-bottom-5">
      <div className="p-3 bg-[#7B1113] rounded-xl text-amber-300">
        <Smartphone className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h4 className="font-black text-xs uppercase tracking-wide text-amber-300">Instal Aplikasi FMS</h4>
        <p className="text-[11px] text-stone-300 mt-0.5">Pasang aplikasi ini di perangkat Anda untuk akses cepat seperti aplikasi native & offline.</p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-[#7B1113] hover:bg-[#5E0B0C] text-white font-bold text-[11px] rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 border border-[#580A0B]"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>Instal Sekarang</span>
          </button>
          <button
            onClick={() => setShowBanner(false)}
            className="px-2 py-1.5 text-stone-400 hover:text-white text-[11px] font-bold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
      <button
        onClick={() => setShowBanner(false)}
        className="absolute top-2 right-2 p-1 text-stone-400 hover:text-white cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
