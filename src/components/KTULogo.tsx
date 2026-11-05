import React from 'react';

interface KTULogoProps {
  className?: string;
  variant?: 'original' | 'on-dark' | 'on-cream' | 'monochrome';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const KTULogo: React.FC<KTULogoProps> = ({
  className = '',
  variant = 'original',
  size = 'md',
  showText = false
}) => {
  // Size presets
  const sizeClasses = {
    xs: 'h-6',
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-13',
    xl: 'h-16'
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div className={`${sizeClasses} flex items-center justify-center shrink-0`}>
        <img
          src="/logo_ktu.svg"
          alt="PT. KARYA TERANG UTAMA Logo"
          className="h-full w-auto object-contain drop-shadow-xs"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/logo_ktu.png';
          }}
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`text-[10px] font-black uppercase tracking-widest ${variant === 'on-dark' ? 'text-amber-300' : 'text-[#7B1113]'}`}>
            MINING & HAULING
          </span>
          <span className={`text-base font-black tracking-tight ${variant === 'on-dark' ? 'text-[#FAF7F2]' : 'text-[#181A1F]'}`}>
            PT. KARYA TERANG UTAMA
          </span>
        </div>
      )}
    </div>
  );
};

export default KTULogo;
