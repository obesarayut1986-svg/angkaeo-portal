import React, { useState } from 'react';
import {
  Users,
  Shield,
  Settings,
  ShieldCheck,
  UserPlus,
  Edit2,
  Trash2,
  Ban,
  CheckCircle,
  Download,
  Upload,
  RefreshCw,
  Lock,
  Globe,
  Database,
  FileText,
  Key,
  Building,
  Plus,
  MapPin,
  AlertTriangle,
  Server,
  Code,
  Copy,
  Check,
  BookOpen,
  ExternalLink,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import { User, UserRole, Division, Village, CmsSettings, PdpaAccessLog } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import {
  saveUser,
  deleteUser,
  toggleUserStatus,
  saveCmsSettings,
  exportEntireDatabaseJson,
  importEntireDatabaseJson,
  resetDatabaseToDefault,
  logPdpaAction,
  getPdpaLogs,
  getVillages,
  saveVillage,
  deleteVillage,
  resetVillagesToDefault,
} from '../../../db/storage';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  testSupabaseConnection,
} from '../../../db/supabaseClient';

interface AdminManagementProps {
  users: User[];
  divisions: Division[];
  cms: CmsSettings;
  pdpaLogs: PdpaAccessLog[];
  villages?: Village[];
  initialSubTab?: 'users' | 'villages' | 'cms' | 'pdpa' | 'backup' | 'line_oa';
}

export const AdminManagement: React.FC<AdminManagementProps> = ({
  users,
  divisions,
  cms,
  pdpaLogs,
  villages,
  initialSubTab,
}) => {
  const { currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'villages' | 'cms' | 'pdpa' | 'backup' | 'line_oa'>(
    initialSubTab || 'users'
  );

  // LINE Official Account (LINE Messaging API) Settings & Simulator
  const [lineChannelToken, setLineChannelToken] = useState(() => {
    return localStorage.getItem('angkaeo_line_channel_token') || '';
  });
  const [lineTargetId, setLineTargetId] = useState(() => {
    return localStorage.getItem('angkaeo_line_target_id') || '';
  });
  const [lineTestType, setLineTestType] = useState<'repair' | 'requisition' | 'edocument'>('repair');
  const [lineTestStatus, setLineTestStatus] = useState<string | null>(null);

  // Village State
  const [villagesList, setVillagesList] = useState<Village[]>(villages || getVillages());
  const [isVillageModalOpen, setIsVillageModalOpen] = useState(false);
  const [editingVillage, setEditingVillage] = useState<Village | null>(null);
  const [vilNo, setVilNo] = useState<number>(1);
  const [vilName, setVilName] = useState('');
  const [vilDesc, setVilDesc] = useState('');
  const [vilLat, setVilLat] = useState<number>(14.654922);
  const [vilLng, setVilLng] = useState<number>(100.393166);

  // User Add/Edit modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('password123');
  const [formFullName, setFormFullName] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formDivisionId, setFormDivisionId] = useState(divisions[0]?.id || '');
  const [formRole, setFormRole] = useState<UserRole>('staff');
  const [formPhone, setFormPhone] = useState('');
  const [formPermissions, setFormPermissions] = useState<User['permissions']>({
    canUseSarabanCentral: false,
    canUseSarabanDivision: true,
    canEditSarabanReceiptNo: false,
    canManageRepairs: false,
    canApproveLicenseStep1: false,
    canApproveLicenseStep2: false,
    canManageLicenseForms: false,
    canManageDutyRoster: false,
    canManageInventory: false,
    canApproveInventory: false,
    canManageUsers: false,
    canManageCms: false,
  });

  // CMS Settings form state
  const [cmsOrgName, setCmsOrgName] = useState(cms.orgName);
  const [cmsOrgSubName, setCmsOrgSubName] = useState(cms.orgSubName);
  const [cmsFiscalYear, setCmsFiscalYear] = useState(cms.currentFiscalYear || '2570');
  const [cmsPhone, setCmsPhone] = useState(cms.phone);
  const [cmsEmail, setCmsEmail] = useState(cms.email);
  const [cmsAnnouncement, setCmsAnnouncement] = useState(cms.announcementText);
  const [cmsHeroSubtitle, setCmsHeroSubtitle] = useState(cms.heroSubtitle);
  const [cmsSuccessMessage, setCmsSuccessMessage] = useState(false);

  // Backup & Restore & DB Connection
  const [importJsonText, setImportJsonText] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlSchemaModal, setShowSqlSchemaModal] = useState(false);
  const [showSupabaseGuideModal, setShowSupabaseGuideModal] = useState(false);

  // Supabase In-App Connection State
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(() => getSupabaseCredentials().url);
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(() => getSupabaseCredentials().key);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<{
    success: boolean;
    message: string;
    tablesFound?: boolean;
  } | null>(null);

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestStatus(null);
    const res = await testSupabaseConnection(supabaseUrlInput, supabaseKeyInput);
    setSupabaseTestStatus(res);
    setIsTestingSupabase(false);
  };

  const handleSaveSupabase = () => {
    if (!supabaseUrlInput.trim() || !supabaseKeyInput.trim()) {
      alert('กรุณากรอกทั้ง Project URL และ API Key ให้ครบถ้วน');
      return;
    }
    saveSupabaseCredentials(supabaseUrlInput, supabaseKeyInput);
    alert('บันทึกการตั้งค่าเชื่อมต่อ Supabase สำเร็จแล้ว!');
  };

  const handleClearSupabase = () => {
    clearSupabaseCredentials();
    setSupabaseUrlInput('');
    setSupabaseKeyInput('');
    setSupabaseTestStatus(null);
    alert('ล้างการตั้งค่า Supabase เรียบร้อยแล้ว');
  };

  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center space-y-3">
        <Lock className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-base text-slate-900">พื้นที่จำกัดสิทธิ์เฉพาะผู้ดูแลระบบหลัก (Super Admin)</h3>
        <p className="text-xs text-slate-500">บัญชีของคุณไม่มีสิทธิ์ในการเข้าถึงการจัดการผู้ใช้และการตั้งค่าระบบ</p>
      </div>
    );
  }

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormPassword('password123');
    setFormFullName('');
    setFormPosition('');
    setFormDivisionId(divisions[0]?.id || '');
    setFormRole('staff');
    setFormPhone('');
    setFormPermissions({
      canUseSarabanCentral: false,
      canUseSarabanDivision: true,
      canEditSarabanReceiptNo: false,
      canManageRepairs: false,
      canApproveLicenseStep1: false,
      canApproveLicenseStep2: false,
      canManageLicenseForms: false,
      canManageDutyRoster: false,
      canManageInventory: false,
      canApproveInventory: false,
      canManageUsers: false,
      canManageCms: false,
    });
    setIsAddUserModalOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormPassword(user.password || '');
    setFormFullName(user.fullName);
    setFormPosition(user.position);
    setFormDivisionId(user.divisionId);
    setFormRole(user.role);
    setFormPhone(user.phone);
    setFormPermissions({ ...user.permissions });
    setIsAddUserModalOpen(true);
  };

  const handleSaveUserForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formFullName.trim()) return;

    const div = divisions.find((d) => d.id === formDivisionId) || divisions[0];

    const newUserObj: User = {
      id: editingUser ? editingUser.id : `user-${Date.now()}`,
      username: formUsername.trim().toLowerCase(),
      password: formPassword.trim() || 'password123',
      fullName: formFullName.trim(),
      position: formPosition.trim(),
      divisionId: div.id,
      divisionName: div.name,
      role: formRole,
      phone: formPhone.trim(),
      avatarUrl: editingUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      permissions: formPermissions,
      isActive: editingUser ? editingUser.isActive : true,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    saveUser(newUserObj);

    logPdpaAction(
      currentUser.fullName,
      'super_admin',
      editingUser ? 'update' : 'create',
      'user_account',
      newUserObj.id,
      `${editingUser ? 'แก้ไขข้อมูลผู้ใช้' : 'สร้างบัญชีเจ้าหน้าที่ใหม่'}: ${newUserObj.fullName} (${newUserObj.position})`
    );

    setIsAddUserModalOpen(false);
  };

  const handleSaveCms = (e: React.FormEvent) => {
    e.preventDefault();
    saveCmsSettings({
      ...cms,
      orgName: cmsOrgName.trim(),
      orgSubName: cmsOrgSubName.trim(),
      currentFiscalYear: cmsFiscalYear.trim() || '2570',
      phone: cmsPhone.trim(),
      email: cmsEmail.trim(),
      announcementText: cmsAnnouncement.trim(),
      heroSubtitle: cmsHeroSubtitle.trim(),
    });

    logPdpaAction(
      currentUser.fullName,
      'super_admin',
      'update',
      'cms_settings',
      'global',
      'อัปเดตการตั้งค่าเว็บไซต์และข้อความหัวเรื่อง CMS'
    );

    setCmsSuccessMessage(true);
    setTimeout(() => setCmsSuccessMessage(false), 3000);
  };

  const handleExportDatabase = () => {
    const jsonStr = exportEntireDatabaseJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `angkaeo_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportDatabase = () => {
    if (!importJsonText.trim()) return;
    const ok = importEntireDatabaseJson(importJsonText.trim());
    if (ok) {
      alert('นำเข้าฐานข้อมูลสำเร็จ ระบบรีเฟรชข้อมูลเรียบร้อยแล้ว');
      setImportJsonText('');
    } else {
      alert('รูปแบบไฟล์ JSON ไม่ถูกต้อง โปรดตรวจสอบอีกครั้ง');
    }
  };

  // Village Handlers
  const handleOpenAddVillage = () => {
    setEditingVillage(null);
    const nextNo = villagesList.length > 0 ? Math.max(...villagesList.map((v) => v.no)) + 1 : 1;
    setVilNo(nextNo);
    setVilName(`หมู่ที่ ${nextNo} `);
    setVilDesc('');
    setVilLat(14.654922);
    setVilLng(100.393166);
    setIsVillageModalOpen(true);
  };

  const handleOpenEditVillage = (v: Village) => {
    setEditingVillage(v);
    setVilNo(v.no);
    setVilName(v.name);
    setVilDesc(v.description || '');
    setVilLat(v.lat);
    setVilLng(v.lng);
    setIsVillageModalOpen(true);
  };

  const handleSaveVillageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vilName.trim()) return;

    const savedVil: Village = {
      id: editingVillage ? editingVillage.id : `vil-${Date.now()}`,
      no: vilNo,
      name: vilName.trim(),
      description: vilDesc.trim(),
      lat: Number(vilLat) || 14.6852,
      lng: Number(vilLng) || 100.3521,
    };

    saveVillage(savedVil);
    setVillagesList(getVillages());
    setIsVillageModalOpen(false);

    logPdpaAction(
      currentUser?.fullName || 'ผู้ดูแลระบบ',
      'super_admin',
      editingVillage ? 'update' : 'create',
      'village_config',
      `vil-${vilNo}`,
      `${editingVillage ? 'แก้ไข' : 'เพิ่ม'}ข้อมูลหมู่บ้าน: ${vilName.trim()}`
    );
  };

  const handleDeleteVillageAction = (vil: Village) => {
    if (confirm(`คุณแน่ใจว่าต้องการลบข้อมูล "${vil.name}" หรือไม่?`)) {
      deleteVillage(vil.id);
      setVillagesList(getVillages());
      logPdpaAction(
        currentUser?.fullName || 'ผู้ดูแลระบบ',
        'super_admin',
        'delete',
        'village_config',
        vil.id,
        `ลบหมู่บ้าน ${vil.name}`
      );
    }
  };

  const handleResetVillagesAction = () => {
    if (confirm('คุณต้องการรีเซ็ตข้อมูลหมู่บ้านกลับเป็นค่าเริ่มต้นหรือไม่? ข้อมูลที่เพิ่มเองจะถูกลบ')) {
      resetVillagesToDefault();
      setVillagesList(getVillages());
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                ศูนย์ควบคุมและจัดการระบบหลัก (Super Admin Dashboard)
              </h2>
              <p className="text-xs text-slate-500">
                จัดการบัญชีเจ้าหน้าที่ • กำหนดหมู่บ้านในตำบล • กำหนดสิทธิ์ย่อย • ตั้งค่า CMS • ตรวจสอบ PDPA • สำรองฐานข้อมูลฟรี
              </p>
            </div>
          </div>

          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('users')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubTab === 'users'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              จัดการผู้ใช้ & สิทธิ์ย่อย
            </button>
            <button
              onClick={() => {
                setVillagesList(getVillages());
                setActiveSubTab('villages');
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                activeSubTab === 'villages'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>จัดการหมู่บ้าน ({villagesList.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('cms')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubTab === 'cms'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ตั้งค่าเว็บไซต์ CMS
            </button>
            <button
              onClick={() => setActiveSubTab('pdpa')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubTab === 'pdpa'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              PDPA Audit Logs
            </button>
            <button
              onClick={() => setActiveSubTab('backup')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSubTab === 'backup'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              สำรอง & เชื่อมต่อฐานข้อมูลจริง
            </button>
            <button
              onClick={() => setActiveSubTab('line_oa')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                activeSubTab === 'line_oa'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>LINE OA (แทน Notify)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= SUBTAB 1: USER MANAGEMENT & GRANULAR PERMISSIONS ================= */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                รายชื่อเจ้าหน้าที่ภายในองค์กรทั้งหมด ({users.length} บัญชี)
              </h3>
              <p className="text-xs text-slate-500">
                ระบบปิดการสมัครสมาชิกทั่วไป • แอดมินหลักเป็นผู้เดียวที่มีสิทธิ์เพิ่มและระงับบัญชีเจ้าหน้าที่
              </p>
            </div>
            <button
              onClick={handleOpenAddUser}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>เพิ่มบัญชีเจ้าหน้าที่ใหม่</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">เจ้าหน้าที่</th>
                    <th className="py-3 px-4">ชื่อผู้ใช้ (Username)</th>
                    <th className="py-3 px-4">ตำแหน่ง</th>
                    <th className="py-3 px-4">กอง / สำนัก</th>
                    <th className="py-3 px-4">บทบาท (Role)</th>
                    <th className="py-3 px-4">สิทธิ์เข้าใช้โมดูล</th>
                    <th className="py-3 px-4">สถานะ</th>
                    <th className="py-3 px-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="flex items-center justify-center w-full h-full font-bold text-slate-600">
                                {u.fullName.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.fullName}</div>
                            <div className="text-[11px] text-slate-400">{u.phone || 'ไม่มีเบอร์โทร'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">{u.username}</td>
                      <td className="py-3 px-4 text-slate-700">{u.position}</td>
                      <td className="py-3 px-4 text-slate-700">{u.divisionName}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
                          {u.role}
                        </span>
                      </td>
                      {/* Granular permissions preview */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {u.permissions.canUseSarabanCentral && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-50 text-blue-800 border border-blue-200">
                              สารบรรณกลาง
                            </span>
                          )}
                          {u.permissions.canEditSarabanReceiptNo && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                              แก้เลขรับ
                            </span>
                          )}
                          {u.permissions.canManageRepairs && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-50 text-rose-800 border border-rose-200">
                              จัดการช่าง
                            </span>
                          )}
                          {u.permissions.canApproveLicenseStep1 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                              อนุมัติขั้น 1
                            </span>
                          )}
                          {u.permissions.canApproveLicenseStep2 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-50 text-purple-800 border border-purple-200">
                              อนุมัติขั้น 2
                            </span>
                          )}
                          {u.permissions.canManageInventory && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200">
                              พัสดุ
                            </span>
                          )}
                          {u.permissions.canApproveInventory && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-teal-50 text-teal-800 border border-teal-200">
                              อนุมัติเบิกพัสดุ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {u.isActive ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[11px]">
                            ใช้งานปกติ
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-bold text-[11px]">
                            ระงับการใช้งาน
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="แก้ไขข้อมูลและสิทธิ์"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.role !== 'super_admin' && (
                          <>
                            <button
                              onClick={() => toggleUserStatus(u.id)}
                              className={`p-1.5 rounded-lg transition ${
                                u.isActive
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={u.isActive ? 'ระงับการใช้งาน' : 'ปลดการระงับ'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`คุณแน่ใจว่าต้องการลบบัญชี ${u.fullName} หรือไม่?`)) {
                                  deleteUser(u.id);
                                }
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="ลบบัญชี"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBTAB: VILLAGE MANAGEMENT ================= */}
      {activeSubTab === 'villages' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <span>กำหนดข้อมูลหมู่บ้าน ตำบลอ่างแก้ว อำเภอโพธิ์ทอง ({villagesList.length} หมู่บ้าน)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                แอดมินสามารถเพิ่ม แก้ไขชื่อ หรือลบหมู่บ้าน เพื่อให้ข้อมูลถูกต้องตรงตามความเป็นจริงในพื้นที่ตำบลอ่างแก้ว โดยข้อมูลหมู่บ้านนี้จะเชื่อมโยงไปยังระบบแจ้งซ่อมของประชาชนและระบบงานของช่างทันที
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetVillagesAction}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                title="รีเซ็ตคืนค่าเริ่มต้น"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>คืนค่าเริ่มต้น</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddVillage}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มหมู่บ้านใหม่</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-24">หมู่ที่</th>
                    <th className="py-3 px-4">ชื่อหมู่บ้าน (เป็นทางการ / ในพื้นที่)</th>
                    <th className="py-3 px-4">จุดสังเกต / คำอธิบายสถานที่</th>
                    <th className="py-3 px-4">พิกัดแผนที่ (Latitude, Longitude)</th>
                    <th className="py-3 px-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {villagesList.map((vil) => (
                    <tr key={vil.id || vil.no} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-black text-blue-900 font-mono text-sm">
                        ม.{vil.no}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {vil.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {vil.description || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {vil.lat.toFixed(4)}, {vil.lng.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditVillage(vil)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="แก้ไขข้อมูลหมู่บ้าน"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVillageAction(vil)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="ลบหมู่บ้าน"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {villagesList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        ยังไม่มีข้อมูลหมู่บ้าน กดปุ่ม &quot;เพิ่มหมู่บ้านใหม่&quot; หรือ &quot;คืนค่าเริ่มต้น&quot; เพื่อเริ่มต้นใช้งาน
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUBTAB 2: CMS SETTINGS ================= */}
      {activeSubTab === 'cms' && (
        <form onSubmit={handleSaveCms} className="bg-white rounded-2xl p-8 shadow-xs border border-slate-200 space-y-6 text-xs max-w-3xl">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="font-bold text-base text-slate-900 font-heading">
              ตั้งค่าข้อมูลหัวเว็บไซต์และประชาสัมพันธ์ (CMS Settings)
            </h3>
            <p className="text-xs text-slate-500">
              Admin สามารถเปลี่ยนชื่อหน่วยงาน คำโปรย และข้อความข่าวสารหน้าแรกได้โดยไม่ต้องแก้โค้ด
            </p>
          </div>

          {cmsSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>บันทึกการตั้งค่า CMS เรียบร้อยแล้ว</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 p-4 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-700" />
                  <span>ปีงบประมาณหลักของระบบ (Current Fiscal Year)</span>
                  <span className="text-rose-600">*</span>
                </label>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 w-fit">
                  เริ่ม 1 ต.ค. 2569 คือปีงบประมาณ 2570
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="text"
                  required
                  placeholder="เช่น 2570"
                  value={cmsFiscalYear}
                  onChange={(e) => setCmsFiscalYear(e.target.value)}
                  className="w-full sm:w-44 px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-sm bg-white text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  เปลี่ยนปีงบประมาณที่นี่ จะมีผลอัปเดตแสดงที่แถบด้านบน (Header), หน้าแรก (Dashboard), เลขที่รับสารบรรณ, ทะเบียนแจ้งซ่อม และใบอนุญาตทันที
                </p>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">ชื่อหน่วยงาน (อบต.)</label>
              <input
                type="text"
                required
                value={cmsOrgName}
                onChange={(e) => setCmsOrgName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">ตำบล / อำเภอ / จังหวัด</label>
              <input
                type="text"
                value={cmsOrgSubName}
                onChange={(e) => setCmsOrgSubName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
              <input
                type="text"
                value={cmsPhone}
                onChange={(e) => setCmsPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">อีเมลติดต่อราชการ</label>
              <input
                type="email"
                value={cmsEmail}
                onChange={(e) => setCmsEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">ข้อความประชาสัมพันธ์หัวเว็บไซต์</label>
              <textarea
                rows={2}
                value={cmsAnnouncement}
                onChange={(e) => setCmsAnnouncement(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">คำบรรยายหน้ารับบริการประชาชน (Hero Subtitle)</label>
              <textarea
                rows={2}
                value={cmsHeroSubtitle}
                onChange={(e) => setCmsHeroSubtitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow cursor-pointer"
            >
              บันทึกการตั้งค่า CMS
            </button>
          </div>
        </form>
      )}

      {/* ================= SUBTAB 3: PDPA ACCESS AUDIT LOGS ================= */}
      {activeSubTab === 'pdpa' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>บันทึกการเข้าถึงข้อมูลตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA Audit Trail)</span>
              </h3>
              <p className="text-xs text-slate-500">
                เก็บบันทึกประวัติการสร้าง แก้ไข ตรวจสอบ หรือส่งออกข้อมูลส่วนบุคคลของประชาชนและเจ้าหน้าที่
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">วันเวลา (Timestamp)</th>
                  <th className="py-3 px-4">ผู้กระทำ (Actor)</th>
                  <th className="py-3 px-4">การกระทำ (Action)</th>
                  <th className="py-3 px-4">เป้าหมาย (Resource)</th>
                  <th className="py-3 px-4">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pdpaLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{log.actorName}</div>
                      <div className="text-[10px] text-slate-400">({log.actorRole})</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {log.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-blue-900">{log.targetResource}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-md">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SUBTAB 4: FREE BACKUP & RESTORE ================= */}
      {activeSubTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">สำรองข้อมูลทั้งระบบ (Export Database)</h3>
                <p className="text-xs text-slate-500">ดาวน์โหลดเป็นไฟล์ JSON เก็บไว้ในเครื่องฟรี 100%</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ไฟล์สำรองจะบรรจุข้อมูลทั้งหมด ได้แก่ ทะเบียนสารบรรณ, ประวัติงานแจ้งซ่อม, ใบอนุญาต, ปฏิทินเวร, บัญชีวัสดุ พ.ด.4 และรายชื่อเจ้าหน้าที่
            </p>
            <button
              onClick={handleExportDatabase}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดไฟล์ JSON สำรองข้อมูล</span>
            </button>
          </div>

          {/* Import */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">นำเข้า / กู้คืนข้อมูล (Import JSON)</h3>
                <p className="text-xs text-slate-500">วางโค้ด JSON ที่ได้จากการสำรองข้อมูลเพื่อกู้คืน</p>
              </div>
            </div>
            <textarea
              rows={3}
              placeholder="วาง JSON ที่คัดลอกมาที่นี่..."
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-300"
            />
            <button
              onClick={handleImportDatabase}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>กู้คืนข้อมูลจาก JSON</span>
            </button>
          </div>

          {/* Production Database & Deployment Guide */}
          <div className="md:col-span-2 bg-slate-900 text-white rounded-2xl p-6 sm:p-8 space-y-6 shadow-md border border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white font-heading">
                    คู่มือและขั้นตอนการต่อฐานข้อมูลจริงเพื่อใช้งานจริง (Production Setup Guide)
                  </h3>
                  <p className="text-xs text-slate-400">
                    สำหรับผู้ดูแลระบบไอที อบต.อ่างแก้ว ในการเชื่อมต่อ PostgreSQL, Cloud SQL, Supabase หรือ Firebase
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlSchemaModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer shrink-0"
              >
                <Code className="w-4 h-4" />
                <span>ดู & คัดลอก SQL DDL Schema</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Option 1: PostgreSQL / Cloud SQL */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-300">1. PostgreSQL / Cloud SQL</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">แนะนำสูงสุด</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  เหมาะกับงานราชการและระบบสารบรรณ/บัญชีวัสดุ รองรับ ACID Transaction และความถูกต้องของข้อมูล
                </p>
                <div className="p-2.5 bg-black/40 rounded-lg font-mono text-[11px] text-blue-200 break-all">
                  DATABASE_URL="postgresql://user:pass@host:5432/angkaeo_db"
                </div>
              </div>

              {/* Option 2: Supabase / Cloud Managed */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">2. Supabase / Free Cloud DB</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">ฟรี & ติดตั้งไว</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    มีแดชบอร์ดจัดการตารางออนไลน์ พร้อม REST API และ Realtime ในตัว ไม่ต้องติดตั้งเซิร์ฟเวอร์เอง เหมาะสำหรับมือใหม่ที่สุด
                  </p>
                  <div className="p-2.5 bg-black/40 rounded-lg font-mono text-[11px] text-amber-200 break-all">
                    VITE_SUPABASE_URL="https://xxx.supabase.co"
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSupabaseGuideModal(true)}
                  className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-center text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-slate-950 shrink-0" />
                  <span>ดูคู่มือแนวทางที่ 2 ฉบับมือใหม่ (5 ขั้นตอน)</span>
                </button>
              </div>

              {/* Option 3: Local Server & Docker */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-300">3. เครื่อง Server ใน อบต. (Docker)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-bold">Intranet ปลอดภัย</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  สำหรับ อบต.อ่างแก้ว ที่ต้องการให้ข้อมูลวิ่งภายใน LAN สำนักงาน 100% ปลอดภัยตามระเบียบความมั่นคงปลอดภัย
                </p>
                <div className="p-2.5 bg-black/40 rounded-lg font-mono text-[11px] text-purple-200 break-all">
                  docker run -d -p 5432:5432 -e POSTGRES_DB=angkaeo postgres:16
                </div>
              </div>
            </div>

            {/* Step-by-Step Deployment Instructions */}
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3 text-xs">
              <h4 className="font-bold text-slate-200 flex items-center gap-2">
                <span>📋 ขั้นตอนการนำระบบขึ้นใช้งานจริง (Production Deployment Steps):</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-white">ส่งออกข้อมูลเริ่มต้น:</strong> กดปุ่ม &quot;ดาวน์โหลดไฟล์ JSON สำรองข้อมูล&quot; ด้านบนเพื่อเก็บข้อมูลโครงสร้างตั้งต้นทั้งหมดไว้
                </li>
                <li>
                  <strong className="text-white">สร้างตารางในฐานข้อมูล:</strong> กดปุ่ม &quot;ดู & คัดลอก SQL DDL Schema&quot; ด้านบน แล้วนำไปรันใน PostgreSQL (pgAdmin / DBeaver / Supabase SQL Editor) เพื่อสร้างตารางจริง
                </li>
                <li>
                  <strong className="text-white">เชื่อมต่อ API Server:</strong> สร้าง API Endpoint (Express / Fastify / Next.js) ที่อ่านเขียนฐานข้อมูลจริง และชี้ Frontend มาที่ URL ของ API ผ่านไฟล์ <code className="bg-black/50 px-1 py-0.5 rounded text-blue-300 font-mono">.env</code>
                </li>
                <li>
                  <strong className="text-white">Build & Deploy:</strong> รันคำสั่ง <code className="bg-black/50 px-1 py-0.5 rounded text-amber-300 font-mono">npm run build</code> แล้วนำโฟลเดอร์ <code className="font-mono text-slate-200">dist</code> ไปวางบน Web Server (เช่น Nginx, Apache หรือ Cloud Run)
                </li>
              </ol>
            </div>
          </div>

          {/* Reset Demo Data */}
          <div className="md:col-span-2 bg-rose-50 border border-rose-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-rose-900 text-sm">รีเซ็ตข้อมูลตัวอย่างกลับสู่ค่าเริ่มต้น (Reset Demo Data)</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                คืนค่าข้อมูลตัวอย่าง อบต.อ่างแก้ว ทั้งระบบให้เหมือนเปิดระบบครั้งแรก
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับสู่ค่าเริ่มต้นตัวอย่าง อบต.อ่างแก้ว หรือไม่?')) {
                  resetDatabaseToDefault();
                  window.location.reload();
                }
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              <span>รีเซ็ตข้อมูลตัวอย่าง</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= SUBTAB 6: LINE OFFICIAL ACCOUNT (LINE MESSAGING API) ================= */}
      {activeSubTab === 'line_oa' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Status Clarification Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800/60 relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-rose-500 text-white font-black text-xs">
                  ⚠️ ประกาศสำคัญเกี่ยวกับ LINE
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-xs border border-emerald-400/30">
                  มาตรฐานใหม่: LINE Messaging API
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-white">
                ระบบแจ้งเตือนผ่าน LINE Official Account (LINE Messaging API)
              </h3>

              <div className="p-4 bg-rose-500/15 border border-rose-400/40 rounded-2xl text-xs sm:text-sm text-rose-100 leading-relaxed space-y-2">
                <p>
                  <strong>สถานะ LINE Notify:</strong> บริการ <strong>LINE Notify ได้ยุติการให้บริการอย่างเป็นทางการ (End of Life) ทั่วโลก เมื่อวันที่ 31 มีนาคม 2025</strong> โดย LINE Corporation ได้ปิดเซิร์ฟเวอร์และยกเลิกการออก Access Token ทั้งหมด
                </p>
                <p className="text-xs text-rose-200">
                  <strong>แนวทางปฏิบัติใหม่ของ อบต.อ่างแก้ว:</strong> เปลี่ยนมาใช้ <strong>LINE Official Account (LINE OA) ผ่าน Messaging API</strong> ซึ่งเป็นมาตรฐานทางการเดียวที่ LINE รองรับในปัจจุบัน สามารถส่งแจ้งเตือนทั้งรายบุคคลและเข้ากลุ่มงานช่าง/ผู้บริหาร พร้อมการแสดงผลแบบ Flex Message สวยงามเป็นมืออาชีพ
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Configuration & Step-by-Step Guide */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-base text-slate-900 font-heading">
                    ตั้งค่าการเชื่อมต่อ LINE Messaging API
                  </h4>
                  <p className="text-xs text-slate-500">
                    นำข้อมูลจาก LINE Developers Console มาบันทึกในระบบ
                  </p>
                </div>
                <a
                  href="https://developers.line.biz/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <span>LINE Developers</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Channel Access Token (Long-lived)
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiJ9.xxxxxxxxxxxxxxxxx..."
                    value={lineChannelToken}
                    onChange={(e) => {
                      setLineChannelToken(e.target.value);
                      localStorage.setItem('angkaeo_line_channel_token', e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    คัดลอกได้จากแท็บ &quot;Messaging API&quot; ใน LINE Developers Console
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ปลายทางผู้รับ (User ID หรือ Group ID ของกลุ่มงาน อบต.)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Cxxxxxxxxxxxxxx (Group ID) หรือ Uxxxxxxxxxxxxxx (User ID)"
                    value={lineTargetId}
                    onChange={(e) => {
                      setLineTargetId(e.target.value);
                      localStorage.setItem('angkaeo_line_target_id', e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    ID ของกลุ่มไลน์ช่าง หรือ ID ของ ผอ.กอง ที่ต้องการส่งข้อความเตือน
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-800">
                    ขั้นตอนการเปิดใช้งาน LINE OA ฟรีสำหรับ อบต.อ่างแก้ว (3 ขั้นตอน):
                  </span>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>สร้างบัญชี LINE Official Account ที่ <a href="https://manager.line.biz/" target="_blank" rel="noreferrer" className="text-emerald-600 font-semibold underline">manager.line.biz</a> (ฟรี)</li>
                    <li>เข้าสู่ระบบ <a href="https://developers.line.biz/" target="_blank" rel="noreferrer" className="text-emerald-600 font-semibold underline">developers.line.biz</a> แล้วกดสร้าง Provider & Messaging API Channel</li>
                    <li>ที่แท็บ Messaging API กด Issue คัดลอก &quot;Channel Access Token&quot; มาใส่ในช่องด้านบน</li>
                  </ol>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('angkaeo_line_channel_token', lineChannelToken);
                      localStorage.setItem('angkaeo_line_target_id', lineTargetId);
                      setLineTestStatus('บันทึกการตั้งค่า LINE สำเร็จเรียบร้อยแล้ว!');
                      setTimeout(() => setLineTestStatus(null), 4000);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    บันทึกการตั้งค่า
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLineTestStatus('กำลังจำลองการส่งแจ้งเตือน Flex Message ไปยัง LINE OA...');
                      setTimeout(() => {
                        setLineTestStatus('✅ จำลองการส่งสำเร็จ: Flex Message พร้อมส่งไปยังกลุ่มไลน์ของ อบต.อ่างแก้ว เรียบร้อย!');
                        setTimeout(() => setLineTestStatus(null), 5000);
                      }, 1000);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition cursor-pointer"
                  >
                    ทดสอบส่งข้อความจำลอง
                  </button>
                </div>

                {lineTestStatus && (
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-medium">
                    {lineTestStatus}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Modern Flex Message Preview Mockup */}
            <div className="bg-slate-100 rounded-3xl p-6 border border-slate-200 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    ตัวอย่างหน้าจอแจ้งเตือนจริงใน LINE (Flex Message Preview)
                  </span>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setLineTestType('repair')}
                      className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                        lineTestType === 'repair' ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                      }`}
                    >
                      งานแจ้งซ่อม
                    </button>
                    <button
                      type="button"
                      onClick={() => setLineTestType('requisition')}
                      className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                        lineTestType === 'requisition' ? 'bg-blue-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      เบิกพัสดุ
                    </button>
                    <button
                      type="button"
                      onClick={() => setLineTestType('edocument')}
                      className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                        lineTestType === 'edocument' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      สารบรรณ
                    </button>
                  </div>
                </div>

                {/* Simulated LINE Chat Screen */}
                <div className="mt-4 max-w-sm mx-auto bg-[#849ebf] p-4 rounded-3xl shadow-inner space-y-3">
                  <div className="text-center text-[10px] text-white/80 font-medium">
                    วันนี้ 12:45 น.
                  </div>

                  {/* Flex Message Bubble */}
                  <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-200 text-xs">
                    {/* Bubble Header */}
                    <div className="p-3 bg-blue-900 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center">
                          อบต
                        </span>
                        <span className="font-bold text-xs">อบต.อ่างแก้ว แจ้งเตือน</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white">
                        {lineTestType === 'repair' ? 'ด่วนที่สุด' : 'รอพิจารณา'}
                      </span>
                    </div>

                    {/* Bubble Body */}
                    <div className="p-3.5 space-y-2 text-slate-800">
                      {lineTestType === 'repair' && (
                        <>
                          <h5 className="font-bold text-sm text-slate-900">
                            🛠️ มีเรื่องแจ้งซ่อมสาธารณูปโภคใหม่
                          </h5>
                          <div className="space-y-1 text-[11px] text-slate-600">
                            <div><strong>ประเภท:</strong> ไฟฟ้าสาธารณะดับ ไฟทาง</div>
                            <div><strong>สถานที่:</strong> หมู่ 3 ซอยวัดอ่างแก้ว (GPS: 14.654, 100.393)</div>
                            <div><strong>ผู้แจ้ง:</strong> นายสมชาย ใจดี (081-234-5678)</div>
                            <div><strong>เวลาที่แจ้ง:</strong> 13 ต.ค. 2569 เวลา 12:40 น.</div>
                          </div>
                        </>
                      )}

                      {lineTestType === 'requisition' && (
                        <>
                          <h5 className="font-bold text-sm text-slate-900">
                            📦 ใบขอเบิกพัสดุรอ ผอ.กอง อนุมัติ
                          </h5>
                          <div className="space-y-1 text-[11px] text-slate-600">
                            <div><strong>เลขที่ใบเบิก:</strong> REQ-ปล-2570/004</div>
                            <div><strong>ผู้ขอเบิก:</strong> นางสาวรัตนา มีสุข (สำนักปลัด)</div>
                            <div><strong>รายการ:</strong> แฟ้มเอกสารสันกว้าง 3 นิ้ว (จำนวน 5 แฟ้ม)</div>
                            <div><strong>สถานะ:</strong> รอ ผอ.กอง พิจารณาลงนามอนุมัติ</div>
                          </div>
                        </>
                      )}

                      {lineTestType === 'edocument' && (
                        <>
                          <h5 className="font-bold text-sm text-slate-900">
                            📄 หนังสือราชการด่วนที่สุดเข้าใหม่
                          </h5>
                          <div className="space-y-1 text-[11px] text-slate-600">
                            <div><strong>เลขที่รับกลาง:</strong> 128/2570</div>
                            <div><strong>จาก:</strong> ที่ว่าการอำเภอโพธิ์ทอง</div>
                            <div><strong>เรื่อง:</strong> มาตรการเตรียมความพร้อมรับมือน้ำท่วมฉับพลัน</div>
                            <div><strong>จ่ายให้:</strong> สำนักปลัด และ กองช่าง</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Bubble Footer Action Button */}
                    <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
                      <button
                        type="button"
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                      >
                        แตะเพื่อเปิดระบบงาน อบต.
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
                <span className="font-bold text-slate-700">ข้อดีของ LINE Official Account Messaging API:</span>
                <p>• ไม่ถูกปิดบริการ (เป็นระบบหลักทางการของ LINE ในปัจจุบัน)</p>
                <p>• รองรับปุ่มกดเปิดลิงก์เข้าไปยังหน้างานโดยตรง</p>
                <p>• แยกการแจ้งเตือนตามกอง (กองช่าง, สำนักปลัด, ผอ.กอง) ได้อย่างแม่นยำ</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View & Copy SQL DDL Schema for PostgreSQL / Cloud SQL */}
      {showSqlSchemaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 space-y-4 text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    SQL DDL Schema สำหรับ PostgreSQL & Cloud SQL
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    โครงสร้างตารางฐานข้อมูลจริงสำหรับระบบสารสนเทศ อบต.อ่างแก้ว
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlSchemaModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl">
              <span className="text-[11px] text-slate-600 font-medium">
                คัดลอกคำสั่ง SQL ไปรันใน Query Tool (pgAdmin / Supabase / Cloud SQL)
              </span>
              <button
                type="button"
                onClick={() => {
                  const sqlScript = `-- ========================================================
-- ฐานข้อมูลระบบสารสนเทศภายใน อบต.อ่างแก้ว (PostgreSQL / Cloud SQL Schema)
-- องค์การบริหารส่วนตำบลอ่างแก้ว อำเภอโพธิ์ทอง จังหวัดอ่างทอง
-- ========================================================

CREATE TABLE IF NOT EXISTS divisions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    director_name VARCHAR(255),
    director_position VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS villages (
    id VARCHAR(50) PRIMARY KEY,
    no INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    lat NUMERIC(10, 6) DEFAULT 14.6500,
    lng NUMERIC(10, 6) DEFAULT 100.3500
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    division_id VARCHAR(50) REFERENCES divisions(id),
    role VARCHAR(50) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(50) PRIMARY KEY,
    receipt_no VARCHAR(100) NOT NULL,
    doc_no VARCHAR(100) NOT NULL,
    fiscal_year VARCHAR(10) NOT NULL,
    registered_at DATE NOT NULL,
    registered_time VARCHAR(20),
    sender_org VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    doc_type VARCHAR(50) NOT NULL,
    urgency VARCHAR(50) NOT NULL,
    secret_level VARCHAR(50) NOT NULL,
    assigned_division_id VARCHAR(50) REFERENCES divisions(id),
    status VARCHAR(50) NOT NULL,
    registered_by VARCHAR(255),
    attached_files JSONB DEFAULT '[]',
    timeline JSONB DEFAULT '[]',
    audit_logs JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repairs (
    id VARCHAR(50) PRIMARY KEY,
    ticket_id VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    village_no INT NOT NULL,
    location_address TEXT NOT NULL,
    lat NUMERIC(10, 6),
    lng NUMERIC(10, 6),
    urgency VARCHAR(50) NOT NULL,
    reporter_name VARCHAR(255) NOT NULL,
    reporter_phone VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    assigned_technician VARCHAR(255),
    completion_notes TEXT,
    photos JSONB DEFAULT '[]',
    completion_photos JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS license_applications (
    id VARCHAR(50) PRIMARY KEY,
    application_no VARCHAR(100) UNIQUE NOT NULL,
    license_type_id VARCHAR(50) NOT NULL,
    license_title VARCHAR(255) NOT NULL,
    division_id VARCHAR(50) REFERENCES divisions(id),
    applicant_citizen_id VARCHAR(50) NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_phone VARCHAR(50),
    applicant_address TEXT,
    field_values JSONB DEFAULT '{}',
    attached_files JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'submitted',
    step1_review JSONB,
    step2_approval JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS materials (
    id VARCHAR(50) PRIMARY KEY,
    division_id VARCHAR(50) REFERENCES divisions(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    size_or_spec VARCHAR(255),
    unit VARCHAR(50) NOT NULL,
    current_stock NUMERIC(10, 2) DEFAULT 0,
    unit_price NUMERIC(12, 2) DEFAULT 0,
    min_stock_alert NUMERIC(10, 2) DEFAULT 5,
    storage_location VARCHAR(255),
    created_at DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS material_transactions (
    id VARCHAR(50) PRIMARY KEY,
    doc_no VARCHAR(100) NOT NULL,
    material_id VARCHAR(50) REFERENCES materials(id),
    material_name VARCHAR(255) NOT NULL,
    division_id VARCHAR(50) REFERENCES divisions(id),
    borrowing_division_id VARCHAR(50),
    transaction_type VARCHAR(20) NOT NULL,
    party_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(14, 2) NOT NULL,
    balance_quantity NUMERIC(10, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    fiscal_year VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,
    approved_by VARCHAR(255),
    signatory_name VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pdpa_access_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_resource VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    details TEXT
);`;
                  navigator.clipboard.writeText(sqlScript);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 3000);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  copiedSql
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? 'คัดลอกสำเร็จแล้ว!' : 'คัดลอก SQL ทั้งหมด'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-xl text-slate-200 font-mono text-[11px] leading-relaxed border border-slate-800">
              <pre className="whitespace-pre font-mono">
{`-- ========================================================
-- ฐานข้อมูลระบบสารสนเทศภายใน อบต.อ่างแก้ว (PostgreSQL / Cloud SQL Schema)
-- องค์การบริหารส่วนตำบลอ่างแก้ว อำเภอโพธิ์ทอง จังหวัดอ่างทอง
-- ========================================================

CREATE TABLE IF NOT EXISTS divisions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    director_name VARCHAR(255),
    director_position VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS villages (
    id VARCHAR(50) PRIMARY KEY,
    no INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    lat NUMERIC(10, 6) DEFAULT 14.6500,
    lng NUMERIC(10, 6) DEFAULT 100.3500
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    division_id VARCHAR(50) REFERENCES divisions(id),
    role VARCHAR(50) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(50) PRIMARY KEY,
    receipt_no VARCHAR(100) NOT NULL,
    doc_no VARCHAR(100) NOT NULL,
    fiscal_year VARCHAR(10) NOT NULL,
    registered_at DATE NOT NULL,
    registered_time VARCHAR(20),
    sender_org VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    doc_type VARCHAR(50) NOT NULL,
    urgency VARCHAR(50) NOT NULL,
    secret_level VARCHAR(50) NOT NULL,
    assigned_division_id VARCHAR(50) REFERENCES divisions(id),
    status VARCHAR(50) NOT NULL,
    registered_by VARCHAR(255),
    attached_files JSONB DEFAULT '[]',
    timeline JSONB DEFAULT '[]',
    audit_logs JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS repairs (
    id VARCHAR(50) PRIMARY KEY,
    ticket_id VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    village_no INT NOT NULL,
    location_address TEXT NOT NULL,
    lat NUMERIC(10, 6),
    lng NUMERIC(10, 6),
    urgency VARCHAR(50) NOT NULL,
    reporter_name VARCHAR(255) NOT NULL,
    reporter_phone VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    assigned_technician VARCHAR(255),
    completion_notes TEXT,
    photos JSONB DEFAULT '[]',
    completion_photos JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS license_applications (
    id VARCHAR(50) PRIMARY KEY,
    application_no VARCHAR(100) UNIQUE NOT NULL,
    license_type_id VARCHAR(50) NOT NULL,
    license_title VARCHAR(255) NOT NULL,
    division_id VARCHAR(50) REFERENCES divisions(id),
    applicant_citizen_id VARCHAR(50) NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_phone VARCHAR(50),
    applicant_address TEXT,
    field_values JSONB DEFAULT '{}',
    attached_files JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'submitted',
    step1_review JSONB,
    step2_approval JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS materials (
    id VARCHAR(50) PRIMARY KEY,
    division_id VARCHAR(50) REFERENCES divisions(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    size_or_spec VARCHAR(255),
    unit VARCHAR(50) NOT NULL,
    current_stock NUMERIC(10, 2) DEFAULT 0,
    unit_price NUMERIC(12, 2) DEFAULT 0,
    min_stock_alert NUMERIC(10, 2) DEFAULT 5,
    storage_location VARCHAR(255),
    created_at DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS material_transactions (
    id VARCHAR(50) PRIMARY KEY,
    doc_no VARCHAR(100) NOT NULL,
    material_id VARCHAR(50) REFERENCES materials(id),
    material_name VARCHAR(255) NOT NULL,
    division_id VARCHAR(50) REFERENCES divisions(id),
    borrowing_division_id VARCHAR(50),
    transaction_type VARCHAR(20) NOT NULL,
    party_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(14, 2) NOT NULL,
    balance_quantity NUMERIC(10, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    fiscal_year VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,
    approved_by VARCHAR(255),
    signatory_name VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pdpa_access_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_resource VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    details TEXT
);`}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowSqlSchemaModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Beginner Guide for Option 2 (Supabase & Production Deployment) */}
      {showSupabaseGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-5 sm:p-6 border border-slate-200 space-y-4 text-xs max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-700 rounded-xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 font-heading">
                      คู่มือแนวทางที่ 2: เชื่อมต่อ Supabase & นำขึ้นใช้งานจริง (ฉบับมือใหม่ 100%)
                    </h3>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ฟรี 100% ตลอดชีพ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    ขั้นตอนแบบจับมือทำทีละคลิก สำหรับผู้ดูแลระบบ อบต.อ่างแก้ว ที่เพิ่งเคยทำครั้งแรก ไม่ต้องมีพื้นฐานเซิร์ฟเวอร์
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupabaseGuideModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 font-bold text-base"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-slate-700">
              {/* Highlight Intro Box */}
              <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-xl border border-amber-200 text-amber-950 space-y-1.5">
                <div className="font-bold text-xs flex items-center gap-2 text-amber-900">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>ทำไมแนวทางที่ 2 (Supabase + Vercel) ถึงเหมาะกับคนเพิ่งเคยทำครั้งแรกที่สุด?</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  1. <strong>ไม่ต้องซื้อเครื่อง Server:</strong> ไม่ต้องเสียเงินซื้อเครื่องแม่ข่ายหรือจ่ายค่าไฟเปิดเครื่องทิ้งไว้ที่ อบต.<br />
                  2. <strong>ฟรี 100% ไม่ต้องผูกบัตรเครดิต:</strong> ทั้ง Supabase (ฐานข้อมูล) และ Vercel (เว็บโฮสติ้ง) มีแพ็กเกจฟรีสำหรับองค์กรและระบบราชการท้องถิ่น<br />
                  3. <strong>มีหน้าจอจัดการข้อมูลเหมือน Excel:</strong> ล็อกอินเข้าดูข้อมูล แก้ไขประวัติงานแจ้งซ่อม หรือคืนค่าผ่านหน้าเว็บได้ทันที ใช้งานง่ายมาก
                </p>
              </div>

              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">
                    1
                  </span>
                  <span>ขั้นตอนที่ 1: สมัครใช้งาน Supabase และสร้าง Project ใหม่ (ใช้เวลา 2 นาที)</span>
                </div>
                <div className="pl-7 space-y-2 text-[11px] text-slate-600 leading-relaxed">
                  <p>1.1 เข้าไปที่เว็บไซต์ <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a></p>
                  <p>1.2 คลิกปุ่มสีเขียว <strong>&quot;Start your project&quot;</strong> แล้วกดลงชื่อเข้าใช้ด้วยบัญชี Google หรือ GitHub</p>
                  <p>1.3 ในหน้าหลัก ให้คลิกปุ่ม <strong>&quot;+ New project&quot;</strong></p>
                  <p>1.4 กรอกข้อมูลเบื้องต้น:</p>
                  <ul className="list-disc list-inside pl-2 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800">
                    <li><strong>Name:</strong> angkaeo-portal</li>
                    <li><strong>Database Password:</strong> ตั้งรหัสผ่านที่ปลอดภัย (จดบันทึกเก็บไว้ เช่น AngKaeo@2570Db)</li>
                    <li><strong>Region:</strong> เลือก <strong>Singapore (Southeast Asia)</strong> เพื่อให้ระบบในไทยตอบสนองไวที่สุด</li>
                    <li><strong>Pricing Plan:</strong> เลือก <strong>Free ($0/month)</strong></li>
                  </ul>
                  <p>1.5 คลิกปุ่ม <strong>&quot;Create new project&quot;</strong> แล้วรอระบบเตรียมฐานข้อมูลประมาณ 1-2 นาที</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">
                      2
                    </span>
                    <span>ขั้นตอนที่ 2: รันคำสั่ง SQL สร้างตารางข้อมูลทั้งหมด (เพียงคลิกเดียว)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSqlSchemaModal(true);
                      setShowSupabaseGuideModal(false);
                    }}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Code className="w-3 h-3" />
                    <span>ไปหน้าคัดลอก SQL Schema</span>
                  </button>
                </div>
                <div className="pl-7 space-y-2 text-[11px] text-slate-600 leading-relaxed">
                  <p>2.1 ในหน้าแดชบอร์ด Supabase เมนูด้านซ้าย ให้คลิกไอคอน <strong>&quot;SQL Editor&quot;</strong> (สัญลักษณ์ &gt;_ )</p>
                  <p>2.2 คลิกปุ่มสีเขียว <strong>&quot;+ New query&quot;</strong> ตรงกลางหน้าจอ</p>
                  <p>2.3 กดปุ่มสีน้ำเงิน <strong>&quot;ไปหน้าคัดลอก SQL Schema&quot;</strong> หรือกดปุ่ม <strong>&quot;ดู &amp; คัดลอก SQL DDL Schema&quot;</strong> ในระบบนี้ แล้วกด <strong>คัดลอก SQL ทั้งหมด</strong></p>
                  <p>2.4 นำคำสั่ง SQL ที่คัดลอก มาวาง (Paste) ลงในช่อง SQL Editor ของ Supabase</p>
                  <p>2.5 กดปุ่มสีเขียว <strong>&quot;RUN&quot;</strong> ที่มุมขวาล่าง — ระบบจะสร้างตารางทั้งหมด (users, documents, repairs, licenses, inventory ฯลฯ) ครบถ้วนทันที!</p>
                </div>
              </div>

              {/* Step 3: Find Project URL & API Key */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">
                    3
                  </span>
                  <span>ขั้นตอนที่ 3: รับ Project URL และ API Key สำหรับเชื่อมต่อ (วิธีหาสำหรับมือใหม่)</span>
                </div>

                {/* Important Alert Box for Finding URL */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-[11px] text-amber-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800 text-xs">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>❓ กรณีหา &quot;Project URL&quot; ในเมนูของ Supabase ไม่เจอ — ให้ใช้วิธีนี้ (ง่ายที่สุด 100%):</span>
                  </div>
                  <div className="space-y-1.5 pl-2 leading-relaxed">
                    <p>
                      <strong>วิธีที่ 1 (ดูจากช่อง Address Bar ของบราวเซอร์ด้านบนสุด - ง่ายที่สุด ไม่ต้องหาในเมนู):</strong><br />
                      สังเกตที่ช่องพิมพ์ที่อยู่เว็บไซต์ด้านบนของ Google Chrome หรือเว็บบราวเซอร์ของคุณขณะเปิดหน้า Supabase อยู่ จะมี URL หน้าตาแบบนี้:<br />
                      <code className="bg-white px-2 py-0.5 rounded border border-amber-300 font-mono text-amber-950 block my-1">
                        https://supabase.com/dashboard/project/<span className="text-blue-700 font-bold underline">[รหัสภาษาอังกฤษประมาณ 20 ตัว]</span>
                      </code>
                      นำรหัสดังกล่าวมาต่อท้ายด้วย <code className="font-mono font-bold text-slate-900">.supabase.co</code> จะได้ <strong>Project URL</strong> ทันที เช่น:<br />
                      ถ้ารหัสในบราวเซอร์คือ <code className="font-mono text-blue-700">qwertyyuiopasdfg</code> ➡️ Project URL คือ <code className="font-mono font-bold text-emerald-800">https://qwertyyuiopasdfg.supabase.co</code>
                    </p>
                    <p>
                      <strong>วิธีที่ 2 (ปุ่มลัด &quot;Connect&quot; บนหัวหน้าจอ Supabase):</strong><br />
                      ที่แถบด้านบนสุดของหน้าแดชบอร์ด Supabase (ข้างๆ ชื่อโปรเจกต์) จะมีปุ่มสีเขียวหรือสีดำเขียนว่า <strong>&quot;Connect&quot;</strong> ให้คลิกปุ่มนั้น ➔ เลือกแท็บ <strong>&quot;App Frameworks&quot;</strong> ➔ จะมีค่า <code>SUPABASE_URL</code> และ <code>SUPABASE_ANON_KEY</code> ให้กด Copy ได้ทันที
                    </p>
                    <p>
                      <strong>วิธีที่ 3 (ผ่านเมนู Settings ของ Supabase รูปแบบปัจจุบัน):</strong><br />
                      คลิกไอคอนรูปฟันเฟือง ⚙️ <strong>&quot;Project Settings&quot;</strong> ที่มุมซ้ายล่างสุด ➔ เลือกเมนู <strong>&quot;Data API&quot;</strong> (หรือ <strong>&quot;API&quot;</strong>) ➔ จะเห็นช่อง <strong>&quot;Project URL&quot;</strong> และใต้ลงมาจะมีช่อง <strong>&quot;Project API keys (anon / public)&quot;</strong> ให้กดปุ่ม <strong>Reveal</strong> หรือ <strong>Copy</strong>
                    </p>
                  </div>
                </div>

                <div className="pl-7 space-y-2 text-[11px] text-slate-600 leading-relaxed">
                  <p>สรุป 2 ค่าที่คุณต้องคัดลอกเก็บไว้:</p>
                  <div className="space-y-1.5 bg-slate-900 p-3 rounded-lg text-slate-200 font-mono text-[11px]">
                    <div>
                      <span className="text-amber-400 font-bold">1. Project URL:</span>{' '}
                      <span className="text-slate-300">https://xxxxxxxxxxxxxxxx.supabase.co</span>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-bold">2. API Key (anon / public):</span>{' '}
                      <span className="text-slate-300">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (รหัสสตริงยาวๆ)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Configure in Code & In-App Tester */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">
                    4
                  </span>
                  <span>ขั้นตอนที่ 4: ตั้งค่าในโค้ดเว็บไซต์ อย่างละเอียด (เลือกวิธีที่สะดวกได้เลย)</span>
                </div>

                {/* Sub-method A: In-App Direct Connector & Tester */}
                <div className="p-4 bg-white rounded-xl border border-blue-200 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-blue-600" />
                      <span>วิธีที่ 4.1: ทดสอบและบันทึกเชื่อมต่อผ่านหน้าเว็บนี้ได้ทันที (ไม่ต้องแก้ไฟล์)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                      แนะนำสำหรับมือใหม่
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    วาง Project URL และ anon API Key ที่ได้จากขั้นตอนที่ 3 ลงใน 2 ช่องนี้ แล้วกดปุ่ม <strong>&quot;ทดสอบการเชื่อมต่อ&quot;</strong> ระบบจะทำการตรวจสอบความถูกต้องของฐานข้อมูล Supabase ให้ทันที
                  </p>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Supabase Project URL:
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น https://abcdefghijkl.supabase.co"
                        value={supabaseUrlInput}
                        onChange={(e) => setSupabaseUrlInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Supabase API Key (anon / public):
                      </label>
                      <input
                        type="password"
                        placeholder="เช่น eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={supabaseKeyInput}
                        onChange={(e) => setSupabaseKeyInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {supabaseTestStatus && (
                    <div
                      className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                        supabaseTestStatus.success
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          : 'bg-rose-50 text-rose-900 border-rose-300'
                      }`}
                    >
                      {supabaseTestStatus.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p>{supabaseTestStatus.message}</p>
                        {supabaseTestStatus.tablesFound === false && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowSqlSchemaModal(true);
                              setShowSupabaseGuideModal(false);
                            }}
                            className="mt-1.5 px-3 py-1 bg-amber-600 text-white rounded text-[11px] font-bold hover:bg-amber-700"
                          >
                            คลิกที่นี่เพื่อไปคัดลอก SQL DDL Schema แล้วนำไปรันใน Supabase
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isTestingSupabase}
                      onClick={handleTestSupabase}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                      <span>{isTestingSupabase ? 'กำลังตรวจสอบการเชื่อมต่อ...' : 'ทดสอบการเชื่อมต่อ (Test Connection)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSupabase}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>บันทึกการตั้งค่าใช้งานในระบบ</span>
                    </button>
                    {(supabaseUrlInput || supabaseKeyInput) && (
                      <button
                        type="button"
                        onClick={handleClearSupabase}
                        className="px-3 py-2 text-slate-500 hover:text-rose-600 text-xs rounded-lg border border-slate-300 hover:border-rose-300 cursor-pointer"
                      >
                        ล้างค่า
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-method B: Environment File (.env) in Code */}
                <div className="p-3 bg-slate-100 rounded-xl space-y-2 text-[11px]">
                  <span className="font-bold text-slate-800">
                    วิธีที่ 4.2: ตั้งค่าผ่านไฟล์ .env ในโค้ดเว็บไซต์ (สำหรับผู้พัฒนาหรือนำขึ้น Vercel)
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    1. ที่โฟลเดอร์หลักของโปรเจกต์ (โฟลเดอร์เดียวกับที่มีไฟล์ <code>package.json</code>) คลิกขวาสร้างไฟล์ใหม่ชื่อ <strong>.env</strong> (มีจุดนำหน้า)<br />
                    2. เปิดไฟล์ <code>.env</code> แล้ววางโค้ด 3 บรรทัดนี้:
                  </p>
                  <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] space-y-1">
                    <p className="text-slate-400"># การเชื่อมต่อฐานข้อมูลจริง Supabase สำหรับ อบต.อ่างแก้ว</p>
                    <p><span className="text-blue-300">VITE_SUPABASE_URL</span>=<span className="text-amber-300">{supabaseUrlInput || 'https://xxxxxxxxxxxxxxxx.supabase.co'}</span></p>
                    <p><span className="text-blue-300">VITE_SUPABASE_ANON_KEY</span>=<span className="text-emerald-300">{supabaseKeyInput || 'ใส่คีย์_anon_public_ที่คัดลอกมา'}</span></p>
                    <p><span className="text-blue-300">VITE_DEFAULT_FISCAL_YEAR</span>=<span className="text-amber-300">2570</span></p>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    3. กดบันทึกไฟล์ (Save) แล้วทำการรีสตาร์ตเซิร์ฟเวอร์ด้วยคำสั่ง <code>npm run dev</code> ใหม่หนึ่งครั้ง เพื่อให้โค้ดโหลดค่าจากไฟล์ .env
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">
                    5
                  </span>
                  <span>ขั้นตอนที่ 5: นำขึ้นใช้งานจริงบนอินเทอร์เน็ตฟรี 100% (Vercel) ให้ประชาชนและเจ้าหน้าที่เข้าใช้งานได้ตลอด 24 ชม.</span>
                </div>
                <div className="pl-7 space-y-2 text-[11px] text-slate-600 leading-relaxed">
                  <p>5.1 เข้าไปที่เว็บไซต์ <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5">vercel.com <ExternalLink className="w-3 h-3" /></a> แล้วสมัครด้วยบัญชี GitHub หรือ Google ฟรี</p>
                  <p>5.2 <strong>ดาวน์โหลดโค้ดระบบทั้งหมดของ อบต.อ่างแก้ว:</strong> คลิกปุ่มสีเขียวด้านล่างนี้เพื่อดาวน์โหลดไฟล์ Zip ทั้งหมดของเว็บไซต์:</p>
                  <div className="my-2 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                        <Download className="w-4 h-4 text-emerald-700" />
                        ไฟล์โค้ดระบบ อบต.อ่างแก้ว (angkaeo-source-code.zip)
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        รวมไฟล์ src, index.html, package.json, vite.config.ts พร้อมอัปโหลดขึ้น GitHub ทันที
                      </p>
                    </div>
                    <a
                      href="/angkaeo-source-code.zip"
                      download="angkaeo-source-code.zip"
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลดไฟล์ Zip โค้ดทั้งหมด</span>
                    </a>
                  </div>
                  <p>5.3 ใน GitHub ที่สร้างไว้ ให้คลิก <strong>&quot;uploading an existing file&quot;</strong> แล้วแตกไฟล์ Zip ลากโฟลเดอร์ src และไฟล์ทั้งหมดไปวาง แล้วกด Commit</p>
                  <p>5.4 บน Vercel เลือก Import โปรเจกต์จาก GitHub นั้น</p>
                  <p>5.3 ในส่วน <strong>Environment Variables</strong> ให้เพิ่มตัวแปร <code className="font-mono bg-slate-200 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> และ <code className="font-mono bg-slate-200 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> ตามขั้นตอนที่ 4</p>
                  <p>5.4 คลิกปุ่ม <strong>&quot;Deploy&quot;</strong></p>
                  <p>5.5 รอประมาณ 1 นาที คุณจะได้ลิงก์เว็บไซต์จริง เช่น <code className="text-blue-700 font-bold font-mono">https://angkaeo.vercel.app</code> ที่เปิดใช้งานได้ทันที มีกุญแจเขียว SSL (https://) ฟรี ปลอดภัยตามมาตรฐานความมั่นคงปลอดภัยภาครัฐ</p>
                  <p className="text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    💡 หาก อบต. มีชื่อโดเมนเป็นของตนเอง เช่น <strong>angkaeo.go.th</strong> สามารถเข้าไปที่เมนู Settings -&gt; Domains บน Vercel แล้วพิมพ์ชื่อโดเมนเข้าไปได้ฟรี ไม่เสียค่าบริการเพิ่มเติม
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <span className="text-[11px] text-slate-500">
                หากต้องการสำรองข้อมูลไว้ก่อน ให้กดปุ่ม &quot;ดาวน์โหลดไฟล์ JSON สำรองข้อมูล&quot;
              </span>
              <button
                type="button"
                onClick={() => setShowSupabaseGuideModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                เข้าใจแล้ว ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit User with Granular Module Permissions */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-sm text-slate-900">
                {editingUser ? 'แก้ไขข้อมูลเจ้าหน้าที่ & สิทธิ์ย่อย' : 'เพิ่มบัญชีรายชื่อเจ้าหน้าที่ใหม่ (Provisioning)'}
              </h3>
              <button onClick={() => setIsAddUserModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveUserForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อ - นามสกุล <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น นายวีระศักดิ์ มั่นคง"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ตำแหน่ง</label>
                  <input
                    type="text"
                    placeholder="เช่น นักวิเคราะห์นโยบายและแผนปฏิบัติการ"
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อผู้ใช้ (Username) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น weerasak"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    รหัสผ่านเริ่มต้น (Default Password)
                  </label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">สังกัด กอง / สำนัก</label>
                  <select
                    value={formDivisionId}
                    onChange={(e) => setFormDivisionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">บทบาทหลัก (Role)</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="staff">เจ้าหน้าที่ทั่วไป (Staff)</option>
                    <option value="central_saraban">สารบรรณกลาง สำนักปลัด (ลงทะเบียนรับ-ส่ง)</option>
                    <option value="division_admin">สารบรรณกอง / แอดมินกอง (กดรับหนังสือ / ดูแลพัสดุกอง)</option>
                    <option value="division_director">ผู้อำนวยการกอง (อนุมัติเบิกพัสดุ / อนุมัติใบอนุญาตขั้น 1)</option>
                    <option value="technician">นายช่าง / ผู้ปฏิบัติงานซ่อม (กองช่าง)</option>
                    <option value="executive">ผู้บริหาร (นายก อบต. / ปลัด อบต.)</option>
                    <option value="hr_staff">เจ้าหน้าที่ฝ่ายบุคคล (HR)</option>
                    <option value="super_admin">ผู้ดูแลระบบหลัก (Super Admin)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="tel"
                    placeholder="เช่น 081-234-5678"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              {/* Requirement: Granular Module Permissions checkbox matrix */}
              <div className="pt-3 border-t">
                <h4 className="font-bold text-slate-800 mb-2">
                  กำหนดสิทธิ์เข้าใช้ระบบย่อย (Granular Module Permissions):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canUseSarabanCentral}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canUseSarabanCentral: e.target.checked })
                      }
                    />
                    <span>สิทธิ์ลงรับ-ส่งหนังสือ สารบรรณกลาง</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canEditSarabanReceiptNo}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canEditSarabanReceiptNo: e.target.checked })
                      }
                    />
                    <span className="text-amber-800 font-semibold">สิทธิ์พิเศษแก้ไขเลขที่รับสารบรรณ</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canManageRepairs}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canManageRepairs: e.target.checked })
                      }
                    />
                    <span>สิทธิ์จัดการงานซ่อม/บันทึกงานช่าง</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canApproveLicenseStep1}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canApproveLicenseStep1: e.target.checked })
                      }
                    />
                    <span>สิทธิ์พิจารณาใบอนุญาตขั้น 1 (หัวหน้ากอง)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canApproveLicenseStep2}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canApproveLicenseStep2: e.target.checked })
                      }
                    />
                    <span>สิทธิ์อนุมัติใบอนุญาตขั้น 2 (ปลัด/นายก)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canManageLicenseForms}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canManageLicenseForms: e.target.checked })
                      }
                    />
                    <span>สิทธิ์สร้างฟอร์มใบอนุญาต (Builder)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canManageDutyRoster}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canManageDutyRoster: e.target.checked })
                      }
                    />
                    <span>สิทธิ์จัดตารางเวรปฏิบัติหน้าที่ (HR/สารบรรณ)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canManageInventory}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canManageInventory: e.target.checked })
                      }
                    />
                    <span>สิทธิ์แอดมินพัสดุกอง (เพิ่ม/ตัดสต็อก)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canApproveInventory}
                      onChange={(e) =>
                        setFormPermissions({ ...formPermissions, canApproveInventory: e.target.checked })
                      }
                    />
                    <span>สิทธิ์ผู้อำนวยการกอง อนุมัติเบิกพัสดุ</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow"
                >
                  บันทึกบัญชีผู้ใช้
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Village */}
      {isVillageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                <span>{editingVillage ? 'แก้ไขข้อมูลหมู่บ้าน' : 'เพิ่มหมู่บ้านใหม่ (ตำบลอ่างแก้ว)'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsVillageModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVillageSubmit} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    หมู่ที่ <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={vilNo}
                    onChange={(e) => setVilNo(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อหมู่บ้าน <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น หมู่ที่ 1 บ้านอ่างแก้ว"
                    value={vilName}
                    onChange={(e) => setVilName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  จุดสังเกต / สถานที่สำคัญในหมู่บ้าน
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ที่ทำการ อบต., วัดอ่างแก้ว, โรงเรียน, ป้อมยาม, คลองชลประทาน"
                  value={vilDesc}
                  onChange={(e) => setVilDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ละติจูด (Lat)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={vilLat}
                    onChange={(e) => setVilLat(parseFloat(e.target.value) || 14.6852)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ลองจิจูด (Lng)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={vilLng}
                    onChange={(e) => setVilLng(parseFloat(e.target.value) || 100.3521)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl text-[11px] flex items-start gap-1.5 border border-blue-200">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  การเพิ่มหรือแก้ไขหมู่บ้านนี้จะมีผลทันทีในฟอร์มแจ้งซ่อมของประชาชนและระบบงานของกองช่าง
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsVillageModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs transition"
                >
                  บันทึกข้อมูลหมู่บ้าน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
