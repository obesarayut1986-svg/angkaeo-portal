import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Shield,
  Phone,
  Plus,
  Trash2,
  Edit2,
  Users,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Info,
  Flame,
  Coffee,
  CheckCircle,
  X,
} from 'lucide-react';
import {
  DutyRosterEntry,
  OrganizationEvent,
  DutyShiftType,
  DutyOfficer,
} from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import {
  saveDutyRoster,
  deleteDutyRoster,
  saveEvent,
  deleteEvent,
  logPdpaAction,
} from '../../../db/storage';

interface CalendarModuleProps {
  dutyRosters: DutyRosterEntry[];
  events: OrganizationEvent[];
}

export const CalendarModule: React.FC<CalendarModuleProps> = ({
  dutyRosters,
  events,
}) => {
  const { currentUser, canAccess } = useAuth();

  // Current calendar month view state (October 2026 default)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // 0-indexed (9 = October)

  // Hover Tooltip state
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Modal State for adding Duty Roster (Central Saraban / HR only)
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [rosterDate, setRosterDate] = useState('2026-10-17');
  const [rosterShiftType, setRosterShiftType] = useState<DutyShiftType>('holiday');
  const [rosterOfficers, setRosterOfficers] = useState<DutyOfficer[]>([
    { name: '', position: '', phone: '', isLeader: true },
  ]);

  // Modal State for adding Event
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventDate, setEventDate] = useState('2026-10-20');
  const [eventTitle, setEventTitle] = useState('');
  const [eventLocation, setEventLocation] = useState('ห้องประชุม อบต.อ่างแก้ว');
  const [eventTimeRange, setEventTimeRange] = useState('09:00 - 12:00 น.');
  const [eventDescription, setEventDescription] = useState('');
  const [eventSummaryReport, setEventSummaryReport] = useState('');
  const [eventPhotos, setEventPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=500&auto=format&fit=crop&q=80',
  ]);

  // Selected date detail modal
  const [selectedDayDetails, setSelectedDayDetails] = useState<{
    dateStr: string;
    rosters: DutyRosterEntry[];
    events: OrganizationEvent[];
  } | null>(null);

  // Permission Check: Strictly Central Saraban or HR Staff or Super Admin
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isCentralSaraban = currentUser?.role === 'central_saraban';
  const isHrStaff = currentUser?.role === 'hr_staff';
  const canManageSchedule =
    isSuperAdmin ||
    isCentralSaraban ||
    isHrStaff ||
    canAccess('canManageDutyRoster');

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  // Generate calendar grid days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSaveRoster = (e: React.FormEvent) => {
    e.preventDefault();
    const validOfficers = rosterOfficers.filter((o) => o.name.trim());
    if (validOfficers.length === 0) {
      alert('กรุณากรอกรายชื่อผู้เข้าเวรอย่างน้อย 1 ท่าน');
      return;
    }

    const newRoster: DutyRosterEntry = {
      id: `roster-${Date.now()}`,
      dateStr: rosterDate,
      shiftType: rosterShiftType,
      shiftTitle:
        rosterShiftType === 'holiday'
          ? 'เวรวันหยุดราชการ'
          : 'เวรป้องกันและบรรเทาสาธารณภัย',
      timeRange:
        rosterShiftType === 'holiday'
          ? '08:30 - 16:30 น.'
          : '18:00 - 06:00 น.',
      divisionName: rosterShiftType === 'holiday' ? 'สำนักปลัด' : 'งานป้องกันฯ',
      officers: validOfficers,
      createdBy: currentUser?.fullName || 'สารบรรณกลาง/HR',
      updatedAt: new Date().toISOString().split('T')[0],
    };

    saveDutyRoster(newRoster);

    logPdpaAction(
      currentUser?.fullName || 'HR',
      currentUser?.role || 'hr_staff',
      'create',
      'duty_roster',
      newRoster.id,
      `จัดตารางเวร ${newRoster.shiftTitle} วันที่ ${newRoster.dateStr}`
    );

    setIsRosterModalOpen(false);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const newEvt: OrganizationEvent = {
      id: `evt-${Date.now()}`,
      dateStr: eventDate,
      title: eventTitle.trim(),
      location: eventLocation.trim(),
      timeRange: eventTimeRange.trim(),
      description: eventDescription.trim(),
      divisionName: currentUser?.divisionName || 'สำนักปลัด',
      photos: eventPhotos,
      summaryReport: eventSummaryReport.trim(),
      createdBy: currentUser?.fullName || 'สารบรรณกลาง',
    };

    saveEvent(newEvt);

    logPdpaAction(
      currentUser?.fullName || 'Admin',
      'staff',
      'create',
      'organization_event',
      newEvt.id,
      `เพิ่มกิจกรรมในปฏิทิน: ${newEvt.title}`
    );

    setIsEventModalOpen(false);
    setEventTitle('');
    setEventDescription('');
  };

  const handleMouseEnterCell = (e: React.MouseEvent, dateStr: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
    setHoveredDate(dateStr);
  };

  const handleMouseLeaveCell = () => {
    setHoveredDate(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                ปฏิทินกิจกรรมและตารางเวรปฏิบัติหน้าที่ (Intranet Calendar)
              </h2>
              <p className="text-xs text-slate-500">
                แสดงกิจกรรมองค์กรและเวรปฏิบัติหน้าที่ • ชี้เมาส์ (Hover) เพื่อดูรายชื่อและเบอร์โทรศัพท์ติดต่อเร่งด่วนทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManageSchedule ? (
              <>
                <button
                  onClick={() => setIsRosterModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>จัดเวรปฏิบัติหน้าที่</span>
                </button>
                <button
                  onClick={() => setIsEventModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มกิจกรรม / วาระงาน</span>
                </button>
              </>
            ) : (
              <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>จำกัดสิทธิ์แก้ไข: สารบรรณกลาง (สำนักปลัด) หรือ บุคลากร (HR) เท่านั้น</span>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs">
          <span className="font-semibold text-slate-700">สัญลักษณ์ในปฏิทิน:</span>
          <span className="flex items-center gap-1.5 text-blue-800">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span>เวรวันหยุดราชการ (08:30 - 16:30 น.)</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-800">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>เวรป้องกันและบรรเทาสาธารณภัย (18:00 - 06:00 น.)</span>
          </span>
          <span className="flex items-center gap-1.5 text-indigo-800">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span>กิจกรรม อบต. / การประชุม</span>
          </span>
        </div>
      </div>

      {/* Main Calendar Grid UI */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Month Navigation Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-base font-heading">
              {monthNames[currentMonth]} {currentYear + 543}
            </h3>
            <span className="text-xs text-blue-200 bg-blue-900/60 px-2.5 py-0.5 rounded-full border border-blue-400/30">
              ปีงบประมาณ {currentMonth >= 9 ? currentYear + 543 + 1 : currentYear + 543}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setCurrentYear(2026);
                setCurrentMonth(9);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition cursor-pointer"
            >
              เดือนปัจจุบัน
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-700 py-2.5">
          <div className="text-rose-600">อาทิตย์</div>
          <div>จันทร์</div>
          <div>อังคาร</div>
          <div>พุธ</div>
          <div>พฤหัสบดี</div>
          <div>ศุกร์</div>
          <div className="text-blue-600">เสาร์</div>
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 bg-slate-100">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[110px] bg-slate-50/50 p-2" />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayRosters = dutyRosters.filter((r) => r.dateStr === dateStr);
            const dayEvents = events.filter((e) => e.dateStr === dateStr);
            const isWeekend = (firstDayOfMonth + i) % 7 === 0 || (firstDayOfMonth + i) % 7 === 6;
            const hasData = dayRosters.length > 0 || dayEvents.length > 0;

            return (
              <div
                key={dateStr}
                onMouseEnter={(e) => hasData && handleMouseEnterCell(e, dateStr)}
                onMouseLeave={handleMouseLeaveCell}
                onClick={() =>
                  hasData &&
                  setSelectedDayDetails({
                    dateStr,
                    rosters: dayRosters,
                    events: dayEvents,
                  })
                }
                className={`min-h-[110px] p-2 bg-white transition hover:bg-blue-50/40 relative group ${
                  hasData ? 'cursor-pointer' : ''
                } ${isWeekend ? 'bg-slate-50/70' : ''}`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      dayNum === 8
                        ? 'bg-blue-600 text-white'
                        : isWeekend
                        ? 'text-rose-600 font-extrabold'
                        : 'text-slate-800'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayRosters.length > 0 && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded font-bold">
                      มีเวร
                    </span>
                  )}
                </div>

                {/* Badges for Rosters & Events */}
                <div className="space-y-1">
                  {dayRosters.map((roster) => (
                    <div
                      key={roster.id}
                      className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 ${
                        roster.shiftType === 'holiday'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : 'bg-amber-100 text-amber-950 border border-amber-200 font-bold'
                      }`}
                    >
                      {roster.shiftType === 'holiday' ? (
                        <Coffee className="w-2.5 h-2.5 shrink-0" />
                      ) : (
                        <Flame className="w-2.5 h-2.5 shrink-0" />
                      )}
                      <span className="truncate">
                        {roster.shiftType === 'holiday' ? 'เวรวันหยุด: ' : 'เวรป้องกัน: '}
                        {roster.officers[0]?.name.split(' ')[0]}
                      </span>
                    </div>
                  ))}

                  {dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium bg-indigo-100 text-indigo-900 border border-indigo-200"
                    >
                      ★ {evt.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SPECIAL REQUIREMENT: Mouse Hover Tooltip Popup displaying Officer names & Phone numbers */}
      {hoveredDate && (
        (() => {
          const dayRosters = dutyRosters.filter((r) => r.dateStr === hoveredDate);
          const dayEvents = events.filter((e) => e.dateStr === hoveredDate);

          if (dayRosters.length === 0 && dayEvents.length === 0) return null;

          return (
            <div
              className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 text-white rounded-2xl shadow-2xl p-4 text-xs max-w-xs w-72 border border-slate-700 backdrop-blur-md"
              style={{
                left: `${tooltipPos.x}px`,
                top: `${tooltipPos.y}px`,
              }}
            >
              <div className="font-bold text-amber-400 pb-1.5 border-b border-slate-800 flex items-center justify-between">
                <span>ตารางเวร & กิจกรรมวันที่ {hoveredDate}</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Duty Rosters with names and phone */}
              {dayRosters.length > 0 && (
                <div className="mt-2 space-y-2">
                  {dayRosters.map((roster) => (
                    <div key={roster.id} className="p-2 rounded-lg bg-slate-800/90 border border-slate-700">
                      <div className="font-bold text-blue-300 flex items-center gap-1">
                        {roster.shiftType === 'holiday' ? <Coffee className="w-3 h-3 text-blue-400" /> : <Flame className="w-3 h-3 text-amber-400" />}
                        <span>{roster.shiftTitle} ({roster.timeRange})</span>
                      </div>
                      <div className="mt-1 space-y-1">
                        {roster.officers.map((officer, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-200">
                              {officer.isLeader ? '★ ' : '• '}{officer.name}
                            </span>
                            <span className="font-mono text-emerald-400 flex items-center gap-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              {officer.phone}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Events */}
              {dayEvents.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-300">วาระงาน / กิจกรรม:</span>
                  {dayEvents.map((e) => (
                    <div key={e.id} className="text-[11px] text-slate-300">
                      • {e.title} ({e.timeRange})
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 pt-1 border-t border-slate-800/60 text-[10px] text-slate-400 text-center">
                *คลิกที่ช่องวันเพื่อดูรายละเอียดและบันทึกสรุปรายงาน
              </div>
            </div>
          );
        })()
      )}

      {/* Selected Day Details & Summary Report Modal */}
      {selectedDayDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-sm text-slate-900">
                รายละเอียดประจำวันที่ {selectedDayDetails.dateStr}
              </h3>
              <button onClick={() => setSelectedDayDetails(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            {/* Rosters */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>รายชื่อผู้เข้าเวรปฏิบัติหน้าที่ (สำหรับติดต่อเร่งด่วน)</span>
              </h4>
              {selectedDayDetails.rosters.map((roster) => (
                <div key={roster.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between font-bold text-blue-900">
                    <span>{roster.shiftTitle}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{roster.timeRange}</span>
                  </div>
                  <div className="space-y-1">
                    {roster.officers.map((officer, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-100">
                        <div>
                          <div className="font-medium text-slate-800">
                            {officer.isLeader && <span className="text-amber-600">★ </span>}
                            {officer.name}
                          </div>
                          <div className="text-[10px] text-slate-400">{officer.position}</div>
                        </div>
                        <a
                          href={`tel:${officer.phone}`}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-bold font-mono flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{officer.phone}</span>
                        </a>
                      </div>
                    ))}
                  </div>

                  {canManageSchedule && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          deleteDutyRoster(roster.id);
                          setSelectedDayDetails(null);
                        }}
                        className="text-rose-600 hover:text-rose-800 text-[11px] flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>ลบตารางเวรนี้</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Events */}
            {selectedDayDetails.events.length > 0 && (
              <div className="space-y-3 pt-3 border-t">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                  <span>กิจกรรมและสรุปรายงาน</span>
                </h4>
                {selectedDayDetails.events.map((evt) => (
                  <div key={evt.id} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2">
                    <div className="font-bold text-slate-900">{evt.title}</div>
                    <div className="text-[11px] text-slate-600">
                      สถานที่: {evt.location} • เวลา: {evt.timeRange}
                    </div>
                    <p className="text-slate-700">{evt.description}</p>
                    {evt.summaryReport && (
                      <div className="p-2 bg-white rounded border border-indigo-100 text-indigo-900">
                        <strong>สรุปผลกิจกรรม:</strong> {evt.summaryReport}
                      </div>
                    )}
                    {evt.photos.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {evt.photos.map((p, i) => (
                          <img key={i} src={p} alt="event" className="w-full aspect-video object-cover rounded-lg" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => setSelectedDayDetails(null)}
                className="px-4 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Duty Roster (Central Saraban / HR Only) */}
      {isRosterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  จัดตารางเวรปฏิบัติหน้าที่ (สารบรรณกลาง / HR)
                </h3>
                <p className="text-[11px] text-slate-500">
                  เวรวันหยุด: 08:30 - 16:30 น. • เวรป้องกันและบรรเทาสาธารณภัย: 18:00 - 06:00 น.
                </p>
              </div>
              <button onClick={() => setIsRosterModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveRoster} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">วันที่เข้าเวร</label>
                  <input
                    type="date"
                    required
                    value={rosterDate}
                    onChange={(e) => setRosterDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ประเภทเวร</label>
                  <select
                    value={rosterShiftType}
                    onChange={(e) => setRosterShiftType(e.target.value as DutyShiftType)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="holiday">เวรวันหยุดราชการ (08:30 - 16:30 น.)</option>
                    <option value="disaster_prevention">เวรป้องกันและบรรเทาสาธารณภัย (18:00 - 06:00 น.)</option>
                  </select>
                </div>
              </div>

              {/* Add Officers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-800">
                    รายชื่อผู้เข้าเวรและเบอร์โทรศัพท์ (สำหรับ Tooltip ติดต่อเร่งด่วน)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setRosterOfficers([
                        ...rosterOfficers,
                        { name: '', position: '', phone: '', isLeader: false },
                      ])
                    }
                    className="text-blue-600 hover:text-blue-800 font-bold"
                  >
                    + เพิ่มรายชื่อ
                  </button>
                </div>

                <div className="space-y-2">
                  {rosterOfficers.map((officer, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          required
                          placeholder="ชื่อ-นามสกุล ผู้เข้าเวร"
                          value={officer.name}
                          onChange={(e) => {
                            const updated = [...rosterOfficers];
                            updated[idx].name = e.target.value;
                            setRosterOfficers(updated);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                        <input
                          type="text"
                          placeholder="ตำแหน่ง"
                          value={officer.position}
                          onChange={(e) => {
                            const updated = [...rosterOfficers];
                            updated[idx].position = e.target.value;
                            setRosterOfficers(updated);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                        <input
                          type="tel"
                          required
                          placeholder="เบอร์โทรศัพท์ติดต่อ"
                          value={officer.phone}
                          onChange={(e) => {
                            const updated = [...rosterOfficers];
                            updated[idx].phone = e.target.value;
                            setRosterOfficers(updated);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={officer.isLeader}
                            onChange={(e) => {
                              const updated = [...rosterOfficers];
                              updated[idx].isLeader = e.target.checked;
                              setRosterOfficers(updated);
                            }}
                          />
                          <span>เป็นหัวหน้าเวร</span>
                        </label>
                        {rosterOfficers.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setRosterOfficers(rosterOfficers.filter((_, i) => i !== idx))
                            }
                            className="text-rose-500 hover:text-rose-700"
                          >
                            ลบรายชื่อนี้
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsRosterModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow"
                >
                  บันทึกตารางเวร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Event */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-sm text-slate-900">เพิ่มกิจกรรม อบต. / วาระงาน</h3>
              <button onClick={() => setIsEventModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่องาน / กิจกรรม</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ประชุมสภา อบต.อ่างแก้ว หรือ โครงการส่งเสริมสุขภาพ"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">วันที่</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ช่วงเวลา</label>
                  <input
                    type="text"
                    value={eventTimeRange}
                    onChange={(e) => setEventTimeRange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">สถานที่จัดงาน</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">รายละเอียด</label>
                <textarea
                  rows={2}
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">สรุปรายงานผล (ถ้ามี)</label>
                <textarea
                  rows={2}
                  placeholder="สรุปผลการจัดกิจกรรมหรือมติการประชุม..."
                  value={eventSummaryReport}
                  onChange={(e) => setEventSummaryReport(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-lg shadow"
                >
                  บันทึกกิจกรรม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
