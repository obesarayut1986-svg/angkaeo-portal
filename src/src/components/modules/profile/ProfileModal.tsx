import React, { useState } from 'react';
import { KeyRound, User, Phone, Image, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile } = useAuth();

  const [username, setUsername] = useState(currentUser?.username || '');
  const [password, setPassword] = useState(currentUser?.password || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const res = await updateProfile({
      username: username.trim(),
      password: password.trim(),
      phone: phone.trim(),
      avatarUrl: avatarUrl.trim(),
    });

    setIsSaving(false);
    if (res.success) {
      setMessage({ text: 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว', type: 'success' });
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1200);
    } else {
      setMessage({ text: res.message || 'เกิดข้อผิดพลาดในการบันทึก', type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">แก้ไขข้อมูลส่วนตัว / เปลี่ยนรหัสผ่าน</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2 font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                : 'bg-rose-50 text-rose-800 border border-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3">
          {/* Avatar preview */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 border-2 border-blue-400 shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                  {currentUser.fullName.slice(0, 2)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block font-semibold text-slate-700 mb-1">
                ลิงก์รูปภาพประจำตัว (Avatar URL)
              </label>
              <input
                type="text"
                placeholder="วาง URL รูปภาพประจำตัว"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px]"
              />
              <div className="mt-1 flex gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')
                  }
                  className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                >
                  ใช้รูปตัวอย่าง 1
                </button>
                <span className="text-slate-400">•</span>
                <button
                  type="button"
                  onClick={() =>
                    setAvatarUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80')
                  }
                  className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                >
                  ใช้รูปตัวอย่าง 2
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ชื่อ - นามสกุล (กำหนดโดยระบบราชการ)
            </label>
            <input
              type="text"
              disabled
              value={currentUser.fullName}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ชื่อผู้ใช้ (Username) ใหม่ที่ต้องการ
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
            />
            <span className="text-[10px] text-slate-400">
              *เจ้าหน้าที่สามารถเปลี่ยน Username เองได้เพื่อความสะดวกในการเข้าสู่ระบบ
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              รหัสผ่านใหม่ (Password)
            </label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
            />
            <span className="text-[10px] text-slate-400">
              *เจ้าหน้าที่ควรเปลี่ยนรหัสผ่านเริ่มต้นหลังจาก Login ครั้งแรก
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow cursor-pointer"
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
