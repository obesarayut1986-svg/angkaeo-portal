import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Wrench,
  Boxes,
  FileCheck2,
  Clock,
  Check,
  X,
  Volume2,
  VolumeX,
  ChevronRight,
  ExternalLink,
  Smartphone,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getRepairs,
  getDocuments,
  getLicenseApplications,
  subscribeStorage,
} from '../../db/storage';
import { RepairItem, EDocument, LicenseApplication } from '../../types';
import { WebPushModal } from './WebPushModal';
import { updateAppBadge, playNotificationChime } from '../../utils/webNotificationService';

export interface AppNotification {
  id: string;
  category: 'repair' | 'document' | 'requisition' | 'license' | 'stock';
  title: string;
  description: string;
  timestamp: string;
  urgency: 'urgent' | 'high' | 'normal';
  targetTab: string;
  targetId?: string;
  isRead: boolean;
}

interface NotificationBellProps {
  onNavigateTab?: (tab: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigateTab }) => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isWebPushModalOpen, setIsWebPushModalOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('angkaeo_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [repairs, setRepairs] = useState<RepairItem[]>(getRepairs());
  const [documents, setDocuments] = useState<EDocument[]>(getDocuments());
  const [applications, setApplications] = useState<LicenseApplication[]>(getLicenseApplications());

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with storage
  useEffect(() => {
    const unsub = subscribeStorage(() => {
      setRepairs(getRepairs());
      setDocuments(getDocuments());
      setApplications(getLicenseApplications());
    });
    return unsub;
  }, []);

  // Save readIds to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('angkaeo_read_notifications', JSON.stringify(readIds));
    } catch {
      // storage unavailable
    }
  }, [readIds]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Build notifications dynamically based on current user role and live records
  const notifications = useMemo<AppNotification[]>(() => {
    const list: AppNotification[] = [];

    // 1. Repair alerts
    repairs.forEach((r) => {
      if (r.status === 'pending') {
        const isUrgent = r.urgency === 'ด่วนที่สุด';
        const isHigh = r.urgency === 'ด่วน';
        list.push({
          id: `repair-${r.id}`,
          category: 'repair',
          title: `เรื่องแจ้งซ่อมใหม่: ${r.category}`,
          description: `ม.${r.villageNo} ${r.locationAddress || ''} โดย ${r.reporterName}`,
          timestamp: r.createdAt.split('T')[0],
          urgency: isUrgent ? 'urgent' : isHigh ? 'high' : 'normal',
          targetTab: 'repairs',
          targetId: r.id,
          isRead: readIds.includes(`repair-${r.id}`),
        });
      }
    });

    // 2. E-Document alerts (สารบรรณหนังสือราชการ - เฉพาะกองที่เกี่ยวข้องและสารบรรณกลาง/ผู้บริหาร)
    documents.forEach((doc) => {
      const isForMyDiv =
        currentUser?.role === 'super_admin' ||
        currentUser?.role === 'central_saraban' ||
        currentUser?.role === 'executive' ||
        (currentUser?.divisionId && doc.dispatchedToDivisionId === currentUser.divisionId);

      if (isForMyDiv && (doc.status === 'dispatched' || doc.status === 'registered')) {
        list.push({
          id: `doc-${doc.id}`,
          category: 'document',
          title: `หนังสือราชการใหม่: ${doc.subject}`,
          description: `เลขที่ ${doc.receiptNo} จาก ${doc.fromOrg} (รอบปี พ.ศ. ${doc.fiscalYear || '2569'})`,
          timestamp: doc.bookDate || doc.receiveDate,
          urgency: doc.urgency === 'ด่วนที่สุด' || doc.urgency === 'ด่วนมาก' ? 'urgent' : 'normal',
          targetTab: 'edocument',
          targetId: doc.id,
          isRead: readIds.includes(`doc-${doc.id}`),
        });
      }
    });

    // 3. License applications (คำขอใบอนุญาตออนไลน์จากประชาชน)
    applications.forEach((app) => {
      if (app.status === 'submitted' || app.status === 'step1_approved') {
        list.push({
          id: `lic-${app.id}`,
          category: 'license',
          title: `คำขอใบอนุญาตออนไลน์ใหม่: ${app.applicantName}`,
          description: `${app.licenseTitle} (ขั้นตอนการตรวจเอกสาร)`,
          timestamp: app.submittedAt.split('T')[0],
          urgency: 'normal',
          targetTab: 'licenses',
          targetId: app.id,
          isRead: readIds.includes(`lic-${app.id}`),
        });
      }
    });

    // หมายเหตุ: ตัดระบบวัสดุ/พัสดุออกจากการแจ้งเตือนกระดิ่ง เพื่อไม่ให้ตัวเลขเยอะเกินไปและแจ้งเฉพาะผู้เกี่ยวข้องตามข้อกำหนด

    return list;
  }, [repairs, documents, applications, readIds, currentUser]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Web Badging API - Show real-time notification count on Phone Home Screen App Icon
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      if (unreadCount > 0) {
        (navigator as any).setAppBadge(unreadCount).catch(() => {});
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  }, [unreadCount]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.isRead);
    if (filter === 'urgent') return notifications.filter((n) => n.urgency === 'urgent' || n.urgency === 'high');
    return notifications;
  }, [notifications, filter]);

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(Array.from(new Set([...readIds, ...allIds])));
  };

  const handleItemClick = (n: AppNotification) => {
    if (!readIds.includes(n.id)) {
      setReadIds((prev) => [...prev, n.id]);
    }
    setIsOpen(false);
    if (onNavigateTab) {
      onNavigateTab(n.targetTab);
    }
  };

  const getCategoryIcon = (cat: AppNotification['category']) => {
    switch (cat) {
      case 'repair':
        return <Wrench className="w-4 h-4 text-amber-500" />;
      case 'document':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'requisition':
        return <Boxes className="w-4 h-4 text-emerald-500" />;
      case 'license':
        return <FileCheck2 className="w-4 h-4 text-indigo-500" />;
      case 'stock':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
        title="การแจ้งเตือนงานและคำขอ"
        aria-label="การแจ้งเตือน"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white font-black text-[10px] rounded-full flex items-center justify-center animate-pulse border-2 border-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fadeIn text-xs">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/10 rounded-lg">
                <Bell className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">ศูนย์แจ้งเตือนงาน</h3>
                <p className="text-[10px] text-blue-200">
                  {unreadCount > 0 ? `มี ${unreadCount} รายการที่ยังไม่ได้อ่าน` : 'ไม่มีรายการคั่งค้างใหม่'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsWebPushModalOpen(true);
                  setIsOpen(false);
                }}
                className="p-1 rounded-md text-blue-200 hover:text-white hover:bg-white/10 transition"
                title="ตั้งค่าแจ้งเตือน Web Push & ตัวเลขไอคอนมือถือ"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-300" />
              </button>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1 rounded-md text-blue-200 hover:text-white hover:bg-white/10 transition"
                title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียงแจ้งเตือน'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-[10px] font-bold transition cursor-pointer"
                >
                  อ่านทั้งหมด
                </button>
              )}
            </div>
          </div>

          {/* Web Push & App Badge Banner */}
          <div className="p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                <Smartphone className="w-4 h-4 text-blue-700" />
              </span>
              <div>
                <span className="font-bold text-[11px] text-blue-950 block leading-tight">
                  Web Push & ตัวเลขไอคอนมือถือ
                </span>
                <span className="text-[10px] text-blue-700 font-medium">ฟรี 100% ไม่จำกัด • ไม่ต้องง้อ LINE OA</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsWebPushModalOpen(true);
                setIsOpen(false);
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer shadow-2xs shrink-0"
            >
              ตั้งค่า / ทดสอบ
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center px-3 pt-2 pb-1 border-b border-slate-100 bg-slate-50 gap-1.5">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              ยังไม่อ่าน ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('urgent')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                filter === 'urgent'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              ด่วน / สำคัญ
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
                <p className="font-medium text-slate-600">ไม่มีการแจ้งเตือนในหมวดหมู่นี้</p>
                <p className="text-[11px]">ระบบทำงานเป็นปกติ ไม่มีงานคั่งค้าง</p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3 flex items-start gap-3 hover:bg-blue-50/70 transition cursor-pointer group ${
                    !n.isRead ? 'bg-amber-50/40 font-medium' : 'bg-white'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 shrink-0 group-hover:scale-105 transition">
                    {getCategoryIcon(n.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs truncate ${
                          !n.isRead ? 'font-bold text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {n.title}
                      </h4>
                      {n.urgency === 'urgent' && (
                        <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-300">
                          ด่วนที่สุด
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                      {n.description}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {n.timestamp}
                      </span>
                      <span className="text-blue-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                        เปิดดูงาน
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5 ring-2 ring-blue-100" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            onClick={() => {
              setIsWebPushModalOpen(true);
              setIsOpen(false);
            }}
            className="p-2.5 bg-slate-50 hover:bg-blue-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] text-slate-500 hover:text-blue-900 gap-1 cursor-pointer transition"
          >
            <span className="truncate flex items-center gap-1 font-medium">
              📱 รองรับ App Badge ตัวเลขแจ้งเตือนบนไอคอนมือถือ
            </span>
            <span className="text-blue-700 font-bold shrink-0 underline">
              คลิกเพื่อตั้งค่า & ทดสอบ
            </span>
          </div>
        </div>
      )}

      {/* Web Push Notification Modal */}
      <WebPushModal
        isOpen={isWebPushModalOpen}
        onClose={() => setIsWebPushModalOpen(false)}
        unreadCount={unreadCount}
      />
    </div>
  );
};
