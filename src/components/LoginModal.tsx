import React, { useState } from 'react';
import { LogIn, AlertCircle, KeyRound, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface LoginModalProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  onDirectSelectUser: (user: User) => void;
  availableUsers: User[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onLogin
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const playLoginSuccessSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      playTone(523.25, 0, 0.15); // C5
      playTone(659.25, 0.12, 0.15); // E5
      playTone(783.99, 0.24, 0.3); // G5
    } catch (err) {
      // Audio context error ignored
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Username dan password wajib diisi');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const ok = await onLogin(username.trim(), password);
      if (ok) {
        playLoginSuccessSound();
      } else {
        setErrorMsg('Username atau password salah.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal login ke sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-md w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden">
        {/* Header with KTU Logo */}
        <div className="bg-[#14161B] p-6 text-center border-b-4 border-[#7B1113]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#E5C992] bg-[#1F2229] border border-[#2E323D] px-2.5 py-0.5 rounded">
              PT. KARYA TERANG UTAMA
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight mt-2 text-[#FAF7F2]">
            FORM CHECKER RITASE
          </h2>
          <p className="text-xs text-[#D8CEBF] mt-1 font-medium">
            Silakan masuk untuk mencatat atau memonitor ritase operasional tambang
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 bg-[#FAF7F2]">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Username / Email</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin / checker1 / viewer"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#FAF7F2] border border-[#E2D7C5] rounded-xl text-sm text-[#181A1F] font-bold focus:outline-none focus:border-[#7B1113] focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#FAF7F2] border border-[#E2D7C5] rounded-xl text-sm text-[#181A1F] font-mono font-bold focus:outline-none focus:border-[#7B1113] focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] border border-[#580A0B] text-[#FAF7F2] font-black text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-amber-300" />
                  <span>MASUK KE SISTEM</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
