import React, { useState } from 'react';
import {
  FileCheck2,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Printer,
  Sparkles,
  Building2,
  Clock,
  ShieldCheck,
  Award,
} from 'lucide-react';
import {
  LicenseApplication,
  LicenseTypeConfig,
  Division,
  DynamicFormField,
  DynamicFieldType,
} from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import {
  reviewLicenseStep1,
  approveLicenseStep2,
  saveLicenseType,
  logPdpaAction,
} from '../../../db/storage';

interface LicenseModuleProps {
  applications: LicenseApplication[];
  licenseTypes: LicenseTypeConfig[];
  divisions: Division[];
}

export const LicenseModule: React.FC<LicenseModuleProps> = ({
  applications,
  licenseTypes,
  divisions,
}) => {
  const { currentUser, canAccess } = useAuth();

  const [activeTab, setActiveTab] = useState<'applications' | 'form_builder'>('applications');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDivision, setFilterDivision] = useState<string>('all');

  // Review & Approval Modals
  const [reviewModalApp, setReviewModalApp] = useState<LicenseApplication | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [viewLicenseCertApp, setViewLicenseCertApp] = useState<LicenseApplication | null>(null);

  // Dynamic Form Builder State (Admin)
  const [isNewTypeModalOpen, setIsNewTypeModalOpen] = useState(false);
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderCode, setBuilderCode] = useState('');
  const [builderDivId, setBuilderDivId] = useState(divisions[0]?.id || '');
  const [builderDescription, setBuilderDescription] = useState('');
  const [builderFee, setBuilderFee] = useState(100);
  const [builderDays, setBuilderDays] = useState(7);
  const [builderDocs, setBuilderDocs] = useState<string[]>([
    'สำเนาบัตรประจำตัวประชาชน',
    'สำเนาทะเบียนบ้าน',
  ]);
  const [builderNewDocInput, setBuilderNewDocInput] = useState('');
  const [builderFields, setBuilderFields] = useState<DynamicFormField[]>([
    {
      id: `f_${Date.now()}`,
      label: 'รายละเอียดสถานที่ยื่นขอ',
      fieldType: 'text',
      required: true,
      placeholder: 'ระบุสถานที่ตั้ง',
    },
  ]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<DynamicFieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(true);
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // Permissions check
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canStep1 =
    isSuperAdmin ||
    currentUser?.role === 'division_director' ||
    canAccess('canApproveLicenseStep1');
  const canStep2 =
    isSuperAdmin ||
    currentUser?.role === 'executive' ||
    canAccess('canApproveLicenseStep2');
  const canManageBuilder =
    isSuperAdmin || canAccess('canManageLicenseForms');

  // Filter applications
  const filteredApps = applications.filter((app) => {
    if (filterStatus !== 'all' && app.status !== filterStatus) return false;
    if (filterDivision !== 'all' && app.divisionId !== filterDivision) return false;
    return true;
  });

  const handleStep1Submit = (approved: boolean) => {
    if (!reviewModalApp) return;

    reviewLicenseStep1(
      reviewModalApp.id,
      `${currentUser?.fullName} (${currentUser?.position})`,
      approved,
      reviewComment.trim() || (approved ? 'ตรวจสอบเอกสารครบถ้วน เห็นควรเสนออนุมัติ' : 'เอกสารไม่ถูกต้องครบถ้วน')
    );

    logPdpaAction(
      currentUser?.fullName || 'หัวหน้ากอง',
      currentUser?.role || 'division_director',
      'update',
      'license_review_step1',
      reviewModalApp.applicationNo,
      `พิจารณาคำขอใบอนุญาตขั้นที่ 1: ${approved ? 'เห็นชอบ' : 'ไม่อนุมัติ'}`
    );

    setReviewModalApp(null);
    setReviewComment('');
  };

  const handleStep2Submit = (approved: boolean) => {
    if (!reviewModalApp) return;

    const certNo = `อบต.อก-อนุมัติ.${Date.now().toString().slice(-4)}/2569`;

    approveLicenseStep2(
      reviewModalApp.id,
      `${currentUser?.fullName} (${currentUser?.position})`,
      approved,
      reviewComment.trim() || (approved ? 'อนุมัติออกใบอนุญาตตามระเบียบ' : 'ไม่อนุมัติ'),
      certNo
    );

    logPdpaAction(
      currentUser?.fullName || 'ผู้บริหาร',
      currentUser?.role || 'executive',
      'update',
      'license_approval_step2',
      reviewModalApp.applicationNo,
      `ลงนามอนุมัติออกใบอนุญาตขั้นที่ 2: ${approved ? 'อนุมัติ (เลขที่ ' + certNo + ')' : 'ไม่อนุมัติ'}`
    );

    setReviewModalApp(null);
    setReviewComment('');
  };

  const handleAddFieldToBuilder = () => {
    if (!newFieldLabel.trim()) return;

    const options =
      newFieldType === 'select' || newFieldType === 'radio'
        ? newFieldOptions
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const field: DynamicFormField = {
      id: `f_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: newFieldLabel.trim(),
      fieldType: newFieldType,
      required: newFieldRequired,
      options,
    };

    setBuilderFields([...builderFields, field]);
    setNewFieldLabel('');
    setNewFieldOptions('');
  };

  const handleSaveNewLicenseType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderTitle.trim()) return;

    const targetDiv = divisions.find((d) => d.id === builderDivId);

    const newConfig: LicenseTypeConfig = {
      id: `lic-${Date.now()}`,
      code: builderCode.trim() || `LIC-${Date.now().toString().slice(-4)}`,
      title: builderTitle.trim(),
      divisionId: builderDivId,
      divisionName: targetDiv?.name || 'กองช่าง',
      description: builderDescription.trim(),
      fee: builderFee,
      estimatedDays: builderDays,
      requiredDocuments: builderDocs,
      customFields: builderFields,
      isActive: true,
    };

    saveLicenseType(newConfig);

    logPdpaAction(
      currentUser?.fullName || 'Admin',
      'super_admin',
      'create',
      'license_form_builder',
      newConfig.id,
      `สร้างแบบฟอร์มใบอนุญาตใหม่: ${newConfig.title}`
    );

    setIsNewTypeModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                ระบบอนุมัติใบอนุญาตออนไลน์ (E-License 2-Step Approval)
              </h2>
              <p className="text-xs text-slate-500">
                กระบวนการอนุมัติ 2 ขั้นตอน (หัวหน้ากองเห็นชอบ ➔ นายก/ปลัด ลงนามออกใบอนุญาต) พร้อมตัวสร้างฟอร์มอิสระ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
              <button
                onClick={() => setActiveTab('applications')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'applications'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รายการคำขอใบอนุญาต
              </button>
              {canManageBuilder && (
                <button
                  onClick={() => setActiveTab('form_builder')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                    activeTab === 'form_builder'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ตัวสร้างฟอร์มใบอนุญาต (Dynamic Builder)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= TAB 1: APPLICATIONS LIST & 2-STEP APPROVAL ================= */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
              >
                <option value="all">สถานะ: ทั้งหมด</option>
                <option value="submitted">ยื่นคำขอใหม่ (รอขั้น 1)</option>
                <option value="step1_approved">ผ่านขั้น 1 (รอผู้บริหารอนุมัติขั้น 2)</option>
                <option value="step2_approved">อนุมัติออกใบอนุญาตแล้ว</option>
                <option value="step1_rejected">ไม่ผ่านขั้น 1</option>
                <option value="step2_rejected">ไม่อนุมัติ (ขั้น 2)</option>
              </select>
            </div>

            <div>
              <select
                value={filterDivision}
                onChange={(e) => setFilterDivision(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
              >
                <option value="all">กองผู้รับผิดชอบ: ทั้งหมด</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">เลขที่คำขอ</th>
                    <th className="py-3 px-4">ประเภทใบอนุญาต</th>
                    <th className="py-3 px-4">ผู้ยื่นคำขอ</th>
                    <th className="py-3 px-4">วันที่ยื่น</th>
                    <th className="py-3 px-4">ขั้นที่ 1 (หัวหน้ากอง)</th>
                    <th className="py-3 px-4">ขั้นที่ 2 (ปลัด/นายก)</th>
                    <th className="py-3 px-4">สถานะรวม</th>
                    <th className="py-3 px-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">
                        {app.applicationNo}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {app.licenseTitle}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800">{app.applicantName}</div>
                        <div className="text-[11px] text-slate-400">เลขบัตร: {app.applicantCitizenId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{app.submittedAt}</td>

                      {/* Step 1 Review info */}
                      <td className="py-3 px-4">
                        {app.step1Review ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              app.step1Review.approved
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {app.step1Review.approved ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {app.step1Review.approved ? 'เห็นชอบ' : 'ไม่เห็นชอบ'}
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium">
                            รอตรวจสอบ
                          </span>
                        )}
                      </td>

                      {/* Step 2 Review info */}
                      <td className="py-3 px-4">
                        {app.step2Approval ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              app.step2Approval.approved
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {app.step2Approval.approved ? <Award className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {app.step2Approval.approved ? 'อนุมัติออกใบ' : 'ไม่อนุมัติ'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">
                            {app.status === 'step1_approved' ? 'รอลงนาม' : '-'}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            app.status === 'step2_approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status === 'step1_approved'
                              ? 'bg-blue-100 text-blue-800'
                              : app.status === 'step1_rejected' || app.status === 'step2_rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {app.status === 'step2_approved'
                            ? 'อนุมัติแล้ว'
                            : app.status === 'step1_approved'
                            ? 'ผ่านขั้น 1'
                            : app.status.includes('rejected')
                            ? 'ปฏิเสธ'
                            : 'ยื่นคำขอใหม่'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1">
                        {/* Step 1 Approval Button */}
                        {canStep1 && app.status === 'submitted' && (
                          <button
                            onClick={() => setReviewModalApp(app)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] shadow-xs cursor-pointer"
                          >
                            ตรวจขั้นที่ 1
                          </button>
                        )}

                        {/* Step 2 Approval Button */}
                        {canStep2 && app.status === 'step1_approved' && (
                          <button
                            onClick={() => setReviewModalApp(app)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs cursor-pointer"
                          >
                            ลงนามอนุมัติ (ขั้น 2)
                          </button>
                        )}

                        {/* Print / View Certificate if approved */}
                        {app.status === 'step2_approved' && (
                          <button
                            onClick={() => setViewLicenseCertApp(app)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg text-[11px] cursor-pointer"
                          >
                            พิมพ์ใบอนุญาต
                          </button>
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

      {/* ================= TAB 2: DYNAMIC FORM BUILDER (ADMIN) ================= */}
      {activeTab === 'form_builder' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                ตัวจัดการและเพิ่มประเภทใบอนุญาต (Dynamic Form Builder)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin สามารถกำหนดประเภทใบอนุญาตใหม่ เพิ่มฟีลด์ข้อมูล และกำหนดเอกสารบังคับแนบได้เองโดยไม่ต้องเขียนโค้ดเพิ่ม
              </p>
            </div>
            <button
              onClick={() => setIsNewTypeModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มประเภทใบอนุญาตใหม่</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {licenseTypes.map((config) => (
              <div
                key={config.id}
                className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {config.code}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 font-heading mt-1">
                      {config.title}
                    </h4>
                    <span className="text-xs text-slate-500">
                      กองผู้รับผิดชอบ: <strong>{config.divisionName}</strong>
                    </span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    เปิดใช้งาน
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{config.description}</p>

                {/* Custom Fields defined */}
                <div>
                  <h5 className="text-xs font-bold text-slate-800 mb-1.5">
                    ฟีลด์ข้อมูลที่ต้องกรอก ({config.customFields.length} ฟีลด์):
                  </h5>
                  <div className="space-y-1">
                    {config.customFields.map((f) => (
                      <div
                        key={f.id}
                        className="text-[11px] bg-slate-50 px-2.5 py-1 rounded border border-slate-200 flex items-center justify-between text-slate-700"
                      >
                        <span>
                          {f.label} {f.required && <span className="text-rose-500">*</span>}
                        </span>
                        <span className="font-mono text-slate-400">[{f.fieldType}]</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Required Documents */}
                <div>
                  <h5 className="text-xs font-bold text-slate-800 mb-1.5">
                    เอกสารที่บังคับแนบ ({config.requiredDocuments.length} รายการ):
                  </h5>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                    {config.requiredDocuments.map((doc, i) => (
                      <li key={i}>{doc}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Review & Approval Workflow (Step 1 or Step 2) */}
      {reviewModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {reviewModalApp.status === 'submitted'
                    ? 'การพิจารณาขั้นที่ 1 (หัวหน้าฝ่าย/กอง)'
                    : 'การลงนามอนุมัติขั้นที่ 2 (ปลัด/นายก อบต.)'}
                </h3>
                <span className="text-xs text-blue-900 font-mono font-bold">
                  {reviewModalApp.applicationNo} • {reviewModalApp.licenseTitle}
                </span>
              </div>
              <button onClick={() => setReviewModalApp(null)}><XCircle className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div><strong>ผู้ยื่นคำขอ:</strong> {reviewModalApp.applicantName} (โทร: {reviewModalApp.applicantPhone})</div>
              <div><strong>เลขบัตรประชาชน:</strong> {reviewModalApp.applicantCitizenId}</div>
              <div><strong>ที่อยู่:</strong> {reviewModalApp.applicantAddress}</div>
            </div>

            {/* Custom Field Values */}
            <div>
              <h4 className="font-bold text-slate-800 mb-1.5">ข้อมูลที่ผู้ขอยื่นกรอก:</h4>
              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {Object.entries(reviewModalApp.formValues).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500 font-medium">{k}:</span>
                    <span className="font-semibold text-slate-800">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Attached docs */}
            <div>
              <h4 className="font-bold text-slate-800 mb-1">เอกสารหลักฐานแนบ:</h4>
              <div className="space-y-1">
                {reviewModalApp.attachedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded border bg-white">
                    <span className="text-slate-700">{f.docName}</span>
                    <span className="text-[11px] text-emerald-600 font-semibold">✓ แนบครบถ้วน</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ความเห็นประกอบการพิจารณา
              </label>
              <textarea
                rows={2}
                placeholder="ระบุข้อสังเกตหรือเงื่อนไขการอนุญาต..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() =>
                  reviewModalApp.status === 'submitted'
                    ? handleStep1Submit(false)
                    : handleStep2Submit(false)
                }
                className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold rounded-lg cursor-pointer"
              >
                ไม่อนุมัติ / ตีกลับ
              </button>

              <button
                type="button"
                onClick={() =>
                  reviewModalApp.status === 'submitted'
                    ? handleStep1Submit(true)
                    : handleStep2Submit(true)
                }
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow cursor-pointer"
              >
                {reviewModalApp.status === 'submitted'
                  ? 'เห็นชอบ (ส่งต่อผู้บริหารขั้น 2)'
                  : 'อนุมัติออกใบอนุญาตอิเล็กทรอนิกส์'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View & Print Electronic License Certificate */}
      {viewLicenseCertApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-slate-200 space-y-6 text-xs text-slate-800">
            <div className="text-center border-b-2 border-slate-900 pb-4">
              <div className="inline-block p-2 rounded-full bg-blue-50 mb-2">
                <Award className="w-10 h-10 text-blue-900 mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                ใบอนุญาตอิเล็กทรอนิกส์ (e-License)
              </h3>
              <p className="text-xs text-slate-600">องค์การบริหารส่วนตำบลอ่างแก้ว อำเภอโพธิ์ทอง จังหวัดอ่างทอง</p>
              <div className="mt-2 inline-block px-3 py-1 bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold font-mono rounded">
                เลขที่ใบอนุญาต: {viewLicenseCertApp.step2Approval?.licenseCertNo}
              </div>
            </div>

            <div className="space-y-3 leading-relaxed text-slate-700">
              <p>
                ใบอนุญาตฉบับนี้ออกให้แก่ <strong>{viewLicenseCertApp.applicantName}</strong> (เลขประจำตัวประชาชน {viewLicenseCertApp.applicantCitizenId}) อยู่บ้านเลขที่ {viewLicenseCertApp.applicantAddress}
              </p>
              <p>
                ได้รับอนุญาตให้ดำเนินการตาม: <strong>{viewLicenseCertApp.licenseTitle}</strong> ในเขตพื้นที่องค์การบริหารส่วนตำบลอ่างแก้ว อำเภอโพธิ์ทอง จังหวัดอ่างทอง
              </p>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <strong>เงื่อนไขการอนุญาต:</strong> {viewLicenseCertApp.step2Approval?.comment || 'ให้ปฏิบัติตามกฎหมายและระเบียบของราชการอย่างเคร่งครัด'}
              </div>
            </div>

            <div className="pt-6 border-t flex items-end justify-between text-center">
              <div className="text-[11px] text-slate-500 text-left">
                <div>ออกให้ ณ วันที่: {viewLicenseCertApp.step2Approval?.issuedDate}</div>
                <div>ตราประทับอิเล็กทรอนิกส์ e-Seal อบต.อ่างแก้ว</div>
              </div>

              <div>
                <div className="font-bold text-slate-900">
                  {viewLicenseCertApp.step2Approval?.approverName}
                </div>
                <div className="text-slate-500 text-[11px]">นายกองค์การบริหารส่วนตำบลอ่างแก้ว</div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold"
              >
                <Printer className="w-4 h-4" />
                <span>สั่งพิมพ์ใบอนุญาต</span>
              </button>
              <button
                type="button"
                onClick={() => setViewLicenseCertApp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Admin Dynamic Form Builder (Add New License Type) */}
      {isNewTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>สร้างประเภทใบอนุญาตใหม่ (Dynamic Form Builder)</span>
              </h3>
              <button onClick={() => setIsNewTypeModalOpen(false)}><XCircle className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveNewLicenseType} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อใบอนุญาตใหม่ <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ใบอนุญาตจัดตั้งตลาดเอกชน หรือ ใบอนุญาตจำหน่ายสุรา/ยาสูบ"
                    value={builderTitle}
                    onChange={(e) => setBuilderTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">รหัสประเภท</label>
                  <input
                    type="text"
                    placeholder="เช่น MKT-01"
                    value={builderCode}
                    onChange={(e) => setBuilderCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">กองผู้รับผิดชอบ</label>
                  <select
                    value={builderDivId}
                    onChange={(e) => setBuilderDivId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">คำอธิบาย</label>
                  <input
                    type="text"
                    placeholder="คำอธิบายกฎหมายหรือข้อกำหนดที่เกี่ยวข้อง"
                    value={builderDescription}
                    onChange={(e) => setBuilderDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ค่าธรรมเนียม (บาท)</label>
                  <input
                    type="number"
                    value={builderFee}
                    onChange={(e) => setBuilderFee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ระยะเวลาดำเนินงาน (วัน)</label>
                  <input
                    type="number"
                    value={builderDays}
                    onChange={(e) => setBuilderDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* Add Custom Fields dynamically */}
              <div className="pt-3 border-t">
                <h4 className="font-bold text-slate-800 mb-2">1. สร้างฟีลด์ข้อมูลให้ประชาชนกรอก:</h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="ชื่อฟีลด์ เช่น ขนาดพื้นที่..."
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="text">ข้อความสั้น (Text)</option>
                      <option value="number">ตัวเลข (Number)</option>
                      <option value="textarea">ข้อความยาว (Textarea)</option>
                      <option value="select">ตัวเลือกแบบ Dropdown</option>
                      <option value="radio">ตัวเลือกแบบ Radio</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddFieldToBuilder}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                    >
                      + เพิ่มฟีลด์
                    </button>
                  </div>
                  {(newFieldType === 'select' || newFieldType === 'radio') && (
                    <input
                      type="text"
                      placeholder="ใส่ตัวเลือก คั่นด้วยเครื่องหมายจุลภาค เช่น ตัวเลือก1, ตัวเลือก2"
                      value={newFieldOptions}
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  )}
                </div>

                <div className="mt-2 space-y-1">
                  {builderFields.map((f, i) => (
                    <div key={f.id} className="flex items-center justify-between p-2 bg-white border rounded">
                      <span>{f.label} ({f.fieldType})</span>
                      <button
                        type="button"
                        onClick={() => setBuilderFields(builderFields.filter((_, idx) => idx !== i))}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Required Documents */}
              <div className="pt-3 border-t">
                <h4 className="font-bold text-slate-800 mb-2">2. กำหนดเอกสารที่ประชาชนต้องแนบ:</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="เช่น โฉนดที่ดิน หรือ แผนผังอาคาร..."
                    value={builderNewDocInput}
                    onChange={(e) => setBuilderNewDocInput(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (builderNewDocInput.trim()) {
                        setBuilderDocs([...builderDocs, builderNewDocInput.trim()]);
                        setBuilderNewDocInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-black text-white rounded-lg font-bold"
                  >
                    + เพิ่มเอกสาร
                  </button>
                </div>

                <div className="mt-2 space-y-1">
                  {builderDocs.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white border rounded">
                      <span>{d}</span>
                      <button
                        type="button"
                        onClick={() => setBuilderDocs(builderDocs.filter((_, idx) => idx !== i))}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewTypeModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow"
                >
                  บันทึกแบบฟอร์มใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
