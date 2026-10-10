import React from 'react';
import {
  Bell,
  Calendar,
  Building2,
  Globe,
  Lock,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CmsSettings } from '../../types';

interface HeaderProps {
  cms: CmsSettings;
  activeView: string;
  isPublicMode: boolean;
  onTogglePublicMode: (publicMode: boolean) => void;
  onOpenProfile: () => void;
  onOpenLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cms,
  activeView,
  isPublicMode,
  onTogglePublicMode,
  onOpenProfile,
  onOpenLogin,
}) => {
  const { currentUser, logout, isAuthenticated } = useAuth();

  // Current Thai Date format (e.g. 8 ตุลาคม 2569)
  const today = new Date();
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  const thaiDateStr = `วัน${['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][today.getDay()]}ที่ ${today.getDate()} ${thaiMonths[today.getMonth()]} พ.ศ. ${today.getFullYear() + 543}`;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center justify-between px-4 lg:px-6 py-2.5">
        {/* Left Organization Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 text-sm md:text-base leading-tight font-heading">
                {cms.orgName}
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200 hidden sm:inline-block">
                ปีงบประมาณ {cms.currentFiscalYear || '2570'}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-none mt-0.5 hidden sm:block">
              {cms.orgSubName}
            </p>
          </div>
        </div>

        {/* Center / Portal Switcher */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-medium">
            <button
              onClick={() => onTogglePublicMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                isPublicMode
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>บริการประชาชน (Public)</span>
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  onOpenLogin();
                } else {
                  onTogglePublicMode(false);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                !isPublicMode
                  ? 'bg-indigo-900 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>ระบบภายในองค์กร (Intranet)</span>
            </button>
          </div>
        </div>

        {/* Right Info & User Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{thaiDateStr}</span>
          </div>

          {isAuthenticated && currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenProfile}
                type="button"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition text-left"
                title="คลิกเพื่อแก้ไขข้อมูลส่วนตัว / เปลี่ยนรหัสผ่าน"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-blue-400 bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-xs shrink-0">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.fullName.slice(0, 2)
                  )}
                </div>
                <div className="hidden md:block leading-tight">
                  <div className="text-xs font-semibold text-slate-800 line-clamp-1">{currentUser.fullName}</div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">{currentUser.position}</div>
                </div>
              </button>

              <button
                onClick={logout}
                type="button"
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="ออกจากระบบ"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>เข้าสู่ระบบเจ้าหน้าที่</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
