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

          {/* Quick Evaluator Role Selector (Convenient testing of all roles) */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                บัญชีทดสอบบทบาทต่างๆ (คลิกเพื่อเลือกทันที):
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickSelect('admin')}
                className={`p-2 rounded-lg border text-left transition ${
                  username === 'admin' ? 'bg-amber-50 border-amber-300 font-bold' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-slate-900 font-semibold">1. ผู้ดูแลระบบหลัก (Super Admin)</div>
                <div className="text-[10px] text-slate-400 font-mono">admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('saraban')}
                className={`p-2 rounded-lg border text-left transition ${
                  username === 'saraban' ? 'bg-blue-50 border-blue-300 font-bold' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-slate-900 font-semibold">2. สารบรรณกลาง สำนักปลัด</div>
                <div className="text-[10px] text-slate-400 font-mono">saraban</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('mayor')}
                className={`p-2 rounded-lg border text-left transition ${
                  username === 'mayor' ? 'bg-purple-50 border-purple-300 font-bold' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-slate-900 font-semibold">3. นายก อบต. (อนุมัติขั้น 2)</div>
                <div className="text-[10px] text-slate-400 font-mono">mayor</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('dir_chang')}
                className={`p-2 rounded-lg border text-left transition ${
                  username === 'dir_chang' ? 'bg-emerald-50 border-emerald-300 font-bold' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-slate-900 font-semibold">4. ผอ.กองช่าง (อนุมัติขั้น 1)</div>
                <div className="text-[10px] text-slate-400 font-mono">dir_chang</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('admin_chang')}
                className={`p-2 rounded-lg border text-left transition ${
                  username === 'admin_chang' ? 'bg-blue-50 border-blue-300 font-bold' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-slate-900 font-semibold">5. สารบรรณกองช่าง (กดรับหนังสือ)</div>
                <div className="text-[10px] text-slate-400 font-mono">admin_chang</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('technician')}
                className={`p-2 rounded-lg border text-left transition ${
                  username === 'technician' ? 'bg-amber-50 border-amber-300 font-bold' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-slate-900 font-semibold">6. นายช่างโยธา (อัปเดตงานซ่อม)</div>
                <div className="text-[10px] text-slate-400 font-mono">technician</div>
              </button>
            </div>
          </div>

          {/* Security policy footnote: strictly no public registration */}
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500 text-[10px] text-center">
            *ข้อกำหนดความปลอดภัย: ระบบไม่อนุญาตให้บุคคลภายนอกสมัครสมาชิกเอง บัญชีทั้งหมดต้องได้รับการแต่งตั้งและสร้างโดย Super Admin เท่านั้น
          </div>
        </div>
      </div>
    </div>
  );
};
