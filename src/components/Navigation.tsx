import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Table,
  Database,
  Users,
  FileSpreadsheet,
  UploadCloud
} from 'lucide-react';
import { UserRole } from '../types';

export type NavTab =
  | 'dashboard'
  | 'input_ritase'
  | 'input_mcr'
  | 'data_ritase'
  | 'master_data'
  | 'user_management'
  | 'export_data';

interface NavigationProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  userRole?: UserRole;
  ritaseCountToday?: number;
  mcrRecordCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  userRole = 'CHECKER',
  ritaseCountToday = 0,
  mcrRecordCount = 0
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'DASHBOARD',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'MCR', 'VIEWER', 'CHECKER', 'PENGAWAS']
    },
    {
      id: 'input_ritase' as NavTab,
      label: 'INPUT RITASE',
      icon: PlusCircle,
      badge: 'Baru',
      badgeColor: 'bg-emerald-700 text-white',
      roles: ['ADMIN', 'CHECKER', 'MCR']
    },
    {
      id: 'input_mcr' as NavTab,
      label: 'INPUT BY MCR',
      icon: UploadCloud,
      badge: 'Query',
      badgeColor: 'bg-[#7B1113] text-amber-300 border border-[#A51C1F]',
      roles: ['ADMIN', 'MCR', 'VIEWER', 'CHECKER', 'PENGAWAS']
    },
    {
      id: 'data_ritase' as NavTab,
      label: 'DATA RITASE',
      icon: Table,
      roles: ['ADMIN', 'MCR', 'CHECKER', 'VIEWER', 'PENGAWAS']
    },

    {
      id: 'master_data' as NavTab,
      label: 'MASTER DATA',
      icon: Database,
      badge: 'Admin',
      badgeColor: 'bg-[#14161B] text-amber-300 border border-[#2D3039]',
      roles: ['ADMIN', 'MCR']
    },
    {
      id: 'user_management' as NavTab,
      label: 'USER MANAGEMENT',
      icon: Users,
      badge: 'Admin',
      badgeColor: 'bg-[#14161B] text-amber-300 border border-[#2D3039]',
      roles: ['ADMIN', 'MCR']
    },
    {
      id: 'export_data' as NavTab,
      label: 'EXPORT EXCEL',
      icon: FileSpreadsheet,
      roles: ['ADMIN', 'MCR']
    }
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <nav className="bg-[#FAF7F2] border-b border-[#E2D7C5] shadow-xs sticky top-20 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2.5 scrollbar-none">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#7B1113] text-[#FAF7F2] shadow-sm ring-1 ring-[#5E0B0C]'
                    : 'text-[#181A1F] hover:text-[#7B1113] hover:bg-[#EFE7DA] border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-[#7B1113]'}`} />
                <span>{item.label}</span>
                {item.id === 'data_ritase' && ritaseCountToday > 0 && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? 'bg-[#14161B] text-amber-300' : 'bg-[#E5DAC8] text-[#181A1F]'
                    }`}
                  >
                    {ritaseCountToday}
                  </span>
                )}
                {item.badge && item.id !== 'data_ritase' && (
                  <span
                    className={`hidden lg:inline-block ml-1 px-1.5 py-0.2 rounded text-[10px] uppercase font-bold tracking-wider ${
                      item.badgeColor || 'bg-[#E5DAC8] text-[#181A1F]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
