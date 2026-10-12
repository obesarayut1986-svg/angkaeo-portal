import React, { useState } from 'react';
import { Lock, User, KeyRound, AlertCircle, X, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getUsers } from '../../../db/storage';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const res = await login(username, password);
    setIsLoading(false);

    if (res.success) {
      onClose();
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(res.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleQuickSelect = (u: string, p: string = 'password123') => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold font-heading">
            เข้าสู่ระบบเจ้าหน้าที่ (Intranet อบต.อ่างแก้ว)
          </h3>
          <p className="text-xs text-blue-200 mt-0.5">
            ระบบความปลอดภัยเฉพาะบุคลากรภายในองค์กร
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="กรอก Username ของท่าน"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 text-xs"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ Intranet'}</span>
            </button>
          </form>

          {/* Quick Evaluator Role Selector (Collapsible for privacy & testing) */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDemoAccounts(!showDemoAccounts)}
              className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>บัญชีทดสอบระบบ 4 กอง (คลิกเพื่อ{showDemoAccounts ? 'ซ่อน' : 'แสดง'})</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {showDemoAccounts ? '▲ ซ่อน' : '▼ คลิกเลือก'}
              </span>
            </button>

            {showDemoAccounts && (
              <div className="mt-2.5 space-y-2.5 max-h-60 overflow-y-auto p-1 bg-slate-50/70 rounded-xl border border-slate-200">
                {/* 1. สำนักปลัด */}
                <div>
                  <div className="text-[10px] font-bold text-blue-900 uppercase tracking-wider px-1 mb-1 flex items-center justify-between">
                    <span>1. สำนักปลัด (รหัส ปล)</span>
                    <span className="text-[9px] text-slate-400 font-normal">เบิก / อนุมัติ / จ่ายตัดสต็อก</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('staff_palad')}
                      className={`p-1.5 rounded-lg border text-left transition ${
                        username === 'staff_palad' ? 'bg-blue-100 border-blue-400 font-bold' : 'bg-white border-slate-200'
                      }`}
                      title="ผู้เบิก (Requester): เขียนใบเบิก เช่น เบิกกระดาษ 2 รีม"
                    >
                      <div className="font-semibold text-slate-800 truncate">จนท.วิเคราะห์</div>
                      <div className="text-[9px] text-slate-400">ผู้เบิก</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('palad')}
                      className={`p-1.5 rounded-lg border text-left transition ${
                        username === 'palad' ? 'bg-indigo-100 border-indigo-400 font-bold' : 'bg-white border-slate-200'
                      }`}
                      title="Approver: หัวหน้าสำนักปลัด อนุมัติคำขอเบิก"
                    >
                      <div className="font-semibold text-slate-800 truncate">ปลัด อบต.</div>
                      <div className="text-[9px] text-slate-400">ผู้อนุมัติ (หน.กอง)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('stock_palad')}
                      className={`p-1.5 rounded-lg border text-left transition ${
                        username === 'stock_palad' ? 'bg-emerald-100 border-emerald-400 font-bold' : 'bg-white border-slate-200'
                      }`}
                      title="Dispenser: จนท.พัสดุสำนักปลัด จ่ายของและตัดสต็อก"
                    >
                      <div className="font-semibold text-slate-800 truncate">จนท.พัสดุ สป.</div>
                      <div className="text-[9px] text-slate-400">จ่าย/ตัดสต็อก</div>
                    </button>
                  </div>
                </div>

                {/* 2. กองคลัง */}
                <div>
                  <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider px-1 mb-1 flex items-center justify-between">
                    <span>2. กองคลัง (รหัส คล)</span>
                    <span className="text-[9px] text-slate-400 font-normal">แยกคลังของตนเอง</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('staff_klang')}
                      className={`p-1.5 rounded-lg border text-left transition ${
                        username === 'staff_klang' ? 'bg-emerald-100 border-emerald-400 font-bold' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 truncate">จนท.จัดเก็บ</div>
                      <div className="text-[9px] text-slate-400">ผู้เบิก</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('dir_klang')}
                      className={`p-1.5 rounded-lg border text-left transition ${
                        username === 'dir_klang' ? 'bg-emerald-100 border-emerald-400 font-bold' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 truncate">ผอ.กองคลัง</div>
                      <div className="text-[9px] text-slate-400">ผู้อนุมัติ (หน.กอง)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('stock_klang')}
                      className={`p-1.5 rounded-lg border text-left transition ${
                        username === 'stock_klang' ? 'bg-emerald-100 border-emerald-400 font-bold' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 truncate">จนท.พัสดุคลัง</div>
                      <div className="text-[9px] text-slate-400">จ่าย/ตัดสต็อก</div>
                    </button>
                  </div>
                </div>

                {/* 3. กองช่าง */}
                <div>
                  <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider px-1 mb-1 flex items-center justify-between">
                    <span>3. กองช่าง (รหัส ชง)</span>
                    <span className="text-[9px] text-slate-400 font-normal">แยกคลังของตนเอง</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('technician')}
                      className={`p-1.5 rounded-lg border text-left transition ${
                        username === 'technician' ? 'bg-amber-100 border-amber-400 font-bold' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 truncate">นายช่างโยธา</div>
                      <div className="text-[9px] text-slate-400">ผู้เบิก</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('dir_chang')}
                      className={`p-1.5 rounded-lg border text-left transition ${
                        username === 'dir_chang' ? 'bg-amber-100 border-amber-400 font-bold' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 truncate">ผอ.กองช่าง</div>
                      <div className="text-[9px] text-slate-400">ผู้อนุมัติ (หน.กอง)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('stock_chang')}
                      className={`p-1.5 rounded-lg border text-left transition ${
                        username === 'stock_chang' ? 'bg-amber-100 border-amber-400 font-bold' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 truncate">จนท.พัสดุช่าง</div>
                      <div className="text-[9px] text-slate-400">จ่าย/ตัดสต็อก</div>
                    </button>
                  </div>
                </div>

                {/* 4. กองการศึกษา */}
                <div>
                  <div className="text-[10px] font-bold text-purple-900 uppercase tracking-wider px-1 mb-1 flex items-center justify-between">
                    <span>4. กองการศึกษาฯ (รหัส ศษ)</span>
                    <span className="text-[9px] text-slate-400 font-normal">แยกคลังของตนเอง</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('staff_edu')}
                      className={`p-1.5 rounded-lg border text-left transition ${
                        username === 'staff_edu' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 truncate">นักวิชาการศึกษา</div>
                      <div className="text-[9px] text-slate-400">ผู้เบิก</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('dir_edu')}
                      className={`p-1.5 rounded-lg border text-left transition ${
                        username === 'dir_edu' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 truncate">ผอ.กองการศึกษา</div>
                      <div className="text-[9px] text-slate-400">ผู้อนุมัติ (หน.กอง)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('stock_edu')}
                      className={`p-1.5 rounded-lg border text-left transition ${
                        username === 'stock_edu' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 truncate">จนท.พัสดุศึกษา</div>
                      <div className="text-[9px] text-slate-400">จ่าย/ตัดสต็อก</div>
                    </button>
                  </div>
                </div>

                {/* ผู้ดูแลระบบหลัก & ผู้บริหาร */}
                <div className="pt-1 border-t border-slate-200 grid grid-cols-3 gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('admin')}
                    className={`p-1.5 rounded-lg border text-left transition ${
                      username === 'admin' ? 'bg-slate-800 text-white font-bold' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="font-semibold truncate">Super Admin</div>
                    <div className="text-[9px] opacity-70">ผู้ดูแลระบบ</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('mayor')}
                    className={`p-1.5 rounded-lg border text-left transition ${
                      username === 'mayor' ? 'bg-slate-800 text-white font-bold' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="font-semibold truncate">นายก อบต.</div>
                    <div className="text-[9px] opacity-70">ผู้บริหาร</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelect('saraban')}
                    className={`p-1.5 rounded-lg border text-left transition ${
                      username === 'saraban' ? 'bg-slate-800 text-white font-bold' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="font-semibold truncate">สารบรรณกลาง</div>
                    <div className="text-[9px] opacity-70">ลงรับ/ส่งต่อ</div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Security policy footnote: strictly no public registration */}
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500 text-[10px] text-center">
            *ข้อกำหนดความปลอดภัย: ระบบไม่อนุญาตให้บุคคลภายนอกสมัครสมาชิกเอง บัญชีทั้งหมดได้รับการแต่งตั้งและควบคุมสิทธิ์ตามสายงาน
          </div>
        </div>
      </div>
    </div>
  );
};
