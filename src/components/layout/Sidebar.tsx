import React from 'react';
import {
  Home,
  FileText,
  Wrench,
  FileCheck2,
  Calendar,
  Boxes,
  Users,
  Settings,
  Shield,
  KeyRound,
  Bell,
  LogOut,
  ChevronRight,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenProfile: () => void;
  pendingRepairsCount: number;
  pendingDocsCount: number;
  pendingLicensesCount: number;
  pendingMaterialsCount: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenProfile,
  pendingRepairsCount,
  pendingDocsCount,
  pendingLicensesCount,
  pendingMaterialsCount,
  isOpen = false,
  onClose,
}) => {
  const { currentUser, logout } = useAuth();

  if (!currentUser) return null;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'หน้าหลักภาพรวม',
      icon: Home,
      badge: null,
    },
    {
      id: 'edocument',
      label: 'ระบบสารบรรณอิเล็กทรอนิกส์',
      icon: FileText,
      badge: pendingDocsCount > 0 ? pendingDocsCount : null,
      badgeColor: 'bg-amber-400 text-amber-950',
    },
    {
      id: 'repairs',
      label: 'ระบบแจ้งซ่อมบำรุง',
      icon: Wrench,
      badge: pendingRepairsCount > 0 ? pendingRepairsCount : null,
      badgeColor: 'bg-rose-400 text-rose-950',
    },
    {
      id: 'licenses',
      label: 'ระบบขอใบอนุญาตออนไลน์',
      icon: FileCheck2,
      badge: pendingLicensesCount > 0 ? pendingLicensesCount : null,
      badgeColor: 'bg-emerald-400 text-emerald-950',
    },
    {
      id: 'calendar',
      label: 'ปฏิทินและเวรปฏิบัติหน้าที่',
      icon: Calendar,
      badge: null,
    },
    {
      id: 'inventory',
      label: 'ระบบทะเบียนและบัญชีวัสดุ (พ.ด.4)',
      icon: Boxes,
      badge: pendingMaterialsCount > 0 ? pendingMaterialsCount : null,
      badgeColor: 'bg-indigo-300 text-indigo-950',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`bg-gradient-to-b from-blue-900 via-indigo-950 to-slate-950 text-white flex flex-col shrink-0 shadow-2xl border-r border-blue-950 select-none z-50 transition-transform duration-300 ease-in-out ${
          isOpen
            ? 'fixed inset-y-0 left-0 w-72 max-w-[85vw] translate-x-0 lg:static lg:translate-x-0 lg:w-72 lg:flex'
            : 'hidden lg:flex lg:w-72 lg:static'
        }`}
      >
        {/* Top User Profile Box */}
        <div className="p-4 border-b border-indigo-900/60 bg-blue-950/40 relative">
          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="ปิดเมนู"
          >
            <X className="w-5 h-5 text-rose-300" />
          </button>

          <div className="flex items-center gap-3 pr-8 lg:pr-0">
            <div className="relative">
              <div className="w-13 h-13 rounded-2xl overflow-hidden border-2 border-blue-400/60 shadow-md bg-blue-800 flex items-center justify-center font-bold text-lg text-white">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentUser.fullName.slice(0, 2)
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-indigo-950 rounded-full" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-blue-200 uppercase tracking-wider font-medium">
                ยินดีต้อนรับ
              </div>
              <h2 className="font-bold text-sm text-white truncate leading-tight mt-0.5">
                {currentUser.fullName}
              </h2>
              <div className="text-xs text-blue-300 truncate mt-0.5 font-medium">
                {currentUser.divisionName}
              </div>
            </div>
          </div>

        {/* User Role Badge & Action pill */}
        <div className="mt-3 pt-3 border-t border-indigo-900/40 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-800/60 border border-blue-500/30 text-xs font-medium text-blue-200">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span className="truncate max-w-[130px]">{currentUser.position}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenProfile}
              type="button"
              className="p-1.5 rounded-lg bg-indigo-900/50 hover:bg-blue-600 text-blue-200 hover:text-white transition shadow-xs"
              title="เปลี่ยนรหัสผ่าน / แก้ไขโปรไฟล์"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
            <div className="relative p-1.5 rounded-lg bg-indigo-900/50 text-blue-200">
              <Bell className="w-3.5 h-3.5" />
              {(pendingDocsCount + pendingRepairsCount + pendingLicensesCount > 0) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-amber-950 font-bold text-[10px] rounded-full flex items-center justify-center">
                  {Math.min(9, pendingDocsCount + pendingRepairsCount + pendingLicensesCount)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-blue-300/80 uppercase">
          เมนูระบบงานภายใน
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onClose?.();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/40'
                  : 'text-blue-100/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-blue-300'
                  }`}
                />
                <span className="truncate text-left">{item.label}</span>
              </div>

              {item.badge !== null && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                    item.badgeColor || 'bg-blue-400 text-blue-950'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Administration Section (Only for Super Admin) */}
        {currentUser.role === 'super_admin' && (
          <div className="pt-3 mt-3 border-t border-indigo-900/50">
            <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>ผู้ดูแลระบบหลัก (Admin)</span>
            </div>
            <button
              onClick={() => {
                onSelectTab('admin_users');
                onClose?.();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                currentTab === 'admin_users'
                  ? 'bg-amber-600 text-white font-semibold shadow-lg shadow-amber-600/30'
                  : 'text-amber-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Users className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="truncate">จัดการผู้ใช้และสิทธิ์ย่อย</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>
            <button
              onClick={() => {
                onSelectTab('admin_cms');
                onClose?.();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group mt-1 ${
                currentTab === 'admin_cms'
                  ? 'bg-amber-600 text-white font-semibold shadow-lg shadow-amber-600/30'
                  : 'text-amber-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Settings className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="truncate">ตั้งค่าเว็บไซต์ CMS, หมู่บ้าน & PDPA</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 bg-black/30 border-t border-indigo-950/80 space-y-2 text-xs">
        <button
          onClick={() => {
            onOpenProfile();
            onClose?.();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-blue-200 hover:bg-white/5 hover:text-white transition"
        >
          <KeyRound className="w-4 h-4 text-blue-400" />
          <span>แก้ไขข้อมูลส่วนตัว / รหัสผ่าน</span>
        </button>

        <button
          onClick={() => {
            logout();
            onClose?.();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-300 hover:bg-rose-500/20 hover:text-rose-100 transition font-medium"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>ออกจากระบบ</span>
        </button>

        <div className="px-2 pt-1 text-[11px] text-slate-400/80 flex items-center justify-between">
          <span>อบต.อ่างแก้ว จ.อ่างทอง</span>
          <span className="font-mono">v2.5.0</span>
        </div>
      </div>
    </aside>
  </>
  );
};
