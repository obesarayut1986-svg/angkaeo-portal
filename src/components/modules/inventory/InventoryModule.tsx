import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  CheckCircle,
  FileSpreadsheet,
  Printer,
  Building2,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  FolderPlus,
  Download,
  Share2,
  FileText,
  Trash2,
} from 'lucide-react';
import {
  MaterialItem,
  MaterialTransaction,
  MaterialRequisition,
  MaterialCategory,
  Division,
  StockTransactionType,
} from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import {
  saveMaterial,
  deleteMaterial,
  createMaterialTransaction,
  approveMaterialTransaction,
  addMaterialCategory,
  deleteMaterialCategory,
  addDivision,
  logPdpaAction,
  getMaterialRequisitions,
} from '../../../db/storage';
import { RequisitionSection } from './RequisitionSection';

interface InventoryModuleProps {
  materials: MaterialItem[];
  transactions: MaterialTransaction[];
  requisitions?: MaterialRequisition[];
  categories: MaterialCategory[];
  divisions: Division[];
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  materials,
  transactions,
  requisitions,
  categories,
  divisions,
}) => {
  const { currentUser, canAccess } = useAuth();

  const [activeTab, setActiveTab] = useState<'requisitions' | 'items' | 'transactions' | 'pd4_report'>('requisitions');
  const allRequisitions = requisitions || getMaterialRequisitions();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Strict division locking for non-super_admins
  const userDivId = currentUser?.divisionId || divisions[0]?.id || 'div-palad';
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>(
    isSuperAdmin ? (divisions[0]?.id || 'div-palad') : userDivId
  );

  React.useEffect(() => {
    if (!isSuperAdmin && currentUser?.divisionId) {
      setSelectedDivisionId(currentUser.divisionId);
    }
  }, [currentUser, isSuperAdmin]);

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'day' | 'month' | 'fiscal_year'>('fiscal_year');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('2570');
  const [isCustomFiscalYear, setIsCustomFiscalYear] = useState(false);

  // Print & Export filters for Form พ.ด.4 (บัญชีวัสดุ)
  const [printCategory, setPrintCategory] = useState<string>('all');
  const [printMaterialId, setPrintMaterialId] = useState<string>('all');
  const [printMode, setPrintMode] = useState<'batch_cards' | 'combined'>('batch_cards');

  // Modals
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [isAddDivModalOpen, setIsAddDivModalOpen] = useState(false);

  // New Category & Division Form
  const [newCatName, setNewCatName] = useState('');
  const [newDivName, setNewDivName] = useState('');
  const [newDivCode, setNewDivCode] = useState('');
  const [newDivDirector, setNewDivDirector] = useState('');

  // New Item Form
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(categories[0]?.name || 'วัสดุสำนักงาน');
  const [isCustomNewItemCategory, setIsCustomNewItemCategory] = useState(false);
  const [customNewItemCategoryName, setCustomNewItemCategoryName] = useState('');
  const [newItemSize, setNewItemSize] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('ด้าม');
  const [newItemUnitPrice, setNewItemUnitPrice] = useState<number>(10);
  const [newItemInitialStock, setNewItemInitialStock] = useState<number>(0);

  // New Transaction Form (In / Out / Cross-Division)
  const [txType, setTxType] = useState<StockTransactionType>('out');
  const [txMaterialId, setTxMaterialId] = useState<string>('');
  const [isReceivingNewMaterial, setIsReceivingNewMaterial] = useState(false);
  const [txDocNo, setTxDocNo] = useState('');
  const [txPartyName, setTxPartyName] = useState('');
  const [txPartyDropdown, setTxPartyDropdown] = useState('');
  const [txQuantity, setTxQuantity] = useState<number>(1);
  const [txBorrowingDivId, setTxBorrowingDivId] = useState<string>('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  // Permissions check based on roles and access rights
  const isDivisionStockOfficer =
    currentUser?.role === 'division_stock_officer' ||
    currentUser?.role === 'division_admin' ||
    canAccess('canManageInventory') ||
    canAccess('canManageDivisionStock') ||
    canAccess('canDispenseMaterial') ||
    isSuperAdmin;

  const isDivisionDirector =
    currentUser?.role === 'division_director' ||
    currentUser?.role === 'executive' ||
    canAccess('canApproveInventory') ||
    canAccess('canApproveRequisition') ||
    isSuperAdmin;

  const isDivisionAdmin = isDivisionStockOfficer;
  const isStaff = currentUser?.role === 'staff' || canAccess('canRequestMaterial');

  // Prevent requesters / external users from viewing officer/director internal tabs
  React.useEffect(() => {
    if (!isDivisionAdmin && !isDivisionDirector && (activeTab === 'transactions' || activeTab === 'pd4_report')) {
      setActiveTab('requisitions');
    }
  }, [isDivisionAdmin, isDivisionDirector, activeTab]);

  // Filtered materials by current active division
  const currentDivMaterials = materials.filter((m) => {
    if (selectedDivisionId && m.divisionId !== selectedDivisionId) return false;
    if (filterCategory !== 'all' && m.categoryName !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !m.code.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Filtered transactions for selected division & period
  const currentDivTxs = transactions.filter((tx) => {
    if (selectedDivisionId && tx.divisionId !== selectedDivisionId && tx.borrowingDivisionId !== selectedDivisionId) {
      return false;
    }
    if (selectedFiscalYear && selectedFiscalYear !== 'all' && tx.fiscalYear !== selectedFiscalYear) return false;
    return true;
  });

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    let finalCategory = newItemCategory;
    if (isCustomNewItemCategory && customNewItemCategoryName.trim()) {
      const savedCat = addMaterialCategory(customNewItemCategoryName.trim());
      finalCategory = savedCat.name;
      logPdpaAction(
        currentUser?.fullName || 'เจ้าหน้าที่พัสดุ',
        'division_admin',
        'create',
        'material_category',
        savedCat.id,
        `สร้างหมวดหมู่วัสดุใหม่: ${savedCat.name}`
      );
    }

    const div = divisions.find((d) => d.id === selectedDivisionId) || divisions[0];
    const code = `ว.${div.code}-${Date.now().toString().slice(-3)}`;

    saveMaterial({
      id: `mat-${Date.now()}`,
      divisionId: div.id,
      divisionName: div.name,
      code,
      name: newItemName.trim(),
      categoryName: finalCategory,
      sizeOrSpec: newItemSize.trim(),
      unit: newItemUnit.trim() || 'หน่วย',
      currentStock: newItemInitialStock,
      unitPrice: newItemUnitPrice,
      createdAt: new Date().toISOString().split('T')[0],
    });

    logPdpaAction(
      currentUser?.fullName || 'แอดมินกอง',
      'division_admin',
      'create',
      'inventory_material',
      code,
      `เพิ่มวัสดุใหม่เข้ากอง: ${newItemName} (${div.name}) หมวด: ${finalCategory}`
    );

    setIsAddItemModalOpen(false);
    setNewItemName('');
    setNewItemSize('');
    setIsCustomNewItemCategory(false);
    setCustomNewItemCategoryName('');
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const div = divisions.find((d) => d.id === selectedDivisionId) || divisions[0];

    let targetMat: MaterialItem | undefined;

    // Requirement 1: Adding a new material directly as part of receiving inventory
    if (isReceivingNewMaterial && txType === 'in') {
      if (!newItemName.trim()) {
        alert('กรุณากรอกชื่อวัสดุใหม่');
        return;
      }
      let finalCategory = newItemCategory;
      if (isCustomNewItemCategory && customNewItemCategoryName.trim()) {
        const savedCat = addMaterialCategory(customNewItemCategoryName.trim());
        finalCategory = savedCat.name;
      }
      const code = `ว.${div.code}-${Date.now().toString().slice(-4)}`;
      targetMat = {
        id: `mat-${Date.now()}`,
        divisionId: div.id,
        divisionName: div.name,
        code,
        name: newItemName.trim(),
        categoryName: finalCategory,
        sizeOrSpec: newItemSize.trim(),
        unit: newItemUnit.trim() || 'หน่วย',
        currentStock: 0, // will be increased by the transaction below
        unitPrice: newItemUnitPrice,
        createdAt: new Date().toISOString().split('T')[0],
      };
      saveMaterial(targetMat);

      logPdpaAction(
        currentUser?.fullName || 'เจ้าหน้าที่พัสดุ',
        'division_admin',
        'create',
        'inventory_material',
        code,
        `รับเข้าพัสดุและเพิ่มวัสดุใหม่เข้าคลัง: ${newItemName} (${div.name}) หมวด: ${finalCategory}`
      );
    } else {
      targetMat = materials.find((m) => m.id === txMaterialId);
      if (!targetMat) {
        alert('กรุณาเลือกวัสดุ');
        return;
      }
    }

    const party = txPartyName.trim() || txPartyDropdown.trim() || 'ร้านค้า/เจ้าหน้าที่';
    const autoApprove = isDivisionDirector; // If Director creates, auto approve

    createMaterialTransaction(
      {
        docNo: txDocNo.trim() || `บ${txType === 'in' ? 'ก' : 'ข'}.${selectedFiscalYear}/${Date.now().toString().slice(-4)}`,
        materialId: targetMat.id,
        materialName: targetMat.name,
        divisionId: targetMat.divisionId,
        borrowingDivisionId: txBorrowingDivId || undefined,
        transactionType: txType,
        partyName: party,
        quantity: txQuantity,
        unitPrice: targetMat.unitPrice,
        totalPrice: txQuantity * targetMat.unitPrice,
        transactionDate: txDate,
        fiscalYear: selectedFiscalYear,
        approvedBy: autoApprove ? `${currentUser?.fullName} (${currentUser?.position})` : undefined,
        status: autoApprove ? 'approved' : 'pending_approval',
        note: txBorrowingDivId ? `เบิกข้ามกองโดย ${divisions.find(d => d.id === txBorrowingDivId)?.name}` : undefined,
      },
      autoApprove
    );

    logPdpaAction(
      currentUser?.fullName || 'เจ้าหน้าที่',
      'staff',
      'create',
      'material_transaction',
      targetMat.code,
      `${txType === 'in' ? 'รับเข้า' : 'เบิกจ่าย'} ${targetMat.name} จำนวน ${txQuantity} ${targetMat.unit}`
    );

    setIsAddTxModalOpen(false);
    setIsReceivingNewMaterial(false);
    setTxDocNo('');
    setTxPartyName('');
    setNewItemName('');
    setNewItemSize('');
  };

  const handleApproveTx = (txId: string) => {
    approveMaterialTransaction(
      txId,
      `${currentUser?.fullName} (${currentUser?.position})`
    );

    logPdpaAction(
      currentUser?.fullName || 'ผอ.กอง',
      'division_director',
      'update',
      'material_tx_approval',
      txId,
      `ผอ.กอง อนุมัติการเบิกจ่ายวัสดุ และระบบตัดสต็อกอัตโนมัติแล้ว`
    );
  };

  // Export to Excel / CSV / Google Sheets formatted
  const handleExportCsv = () => {
    const headers = ['วันที่', 'เลขที่เอกสาร', 'รับ/จ่าย จาก/ให้', 'รายการวัสดุ', 'จำนวน', 'ราคาต่อหน่วย', 'รวมเป็นเงิน', 'ยอดคงเหลือ', 'สถานะ'];
    const rows = currentDivTxs.map((t) => [
      t.transactionDate,
      `"${t.docNo}"`,
      `"${t.partyName}"`,
      `"${t.materialName}"`,
      t.quantity,
      t.unitPrice,
      t.totalPrice,
      t.balanceQuantity,
      t.status === 'approved' ? 'อนุมัติแล้ว' : 'รออนุมัติ',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `แบบบัญชีวัสดุ_พด4_อบตอ่างแก้ว_${selectedFiscalYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                ระบบทะเบียนและบัญชีวัสดุ (ตามระเบียบพัสดุ พ.ด.4)
              </h2>
              <p className="text-xs text-slate-500">
                แยกตาม 4 กองหลักและกองที่เพิ่มใหม่ • ผู้อำนวยการกองอนุมัติเบิก • ระบบตัดสต็อกอัตโนมัติ • พิมพ์รายงาน พ.ด.4 และ Export Excel / Google Sheets
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {isDivisionAdmin && (
              <button
                onClick={() => {
                  setTxType('in');
                  if (materials.length > 0) {
                    setTxMaterialId(materials[0].id);
                  }
                  setIsReceivingNewMaterial(false);
                  setIsAddTxModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition"
                title="รับเข้าพัสดุเข้าคลัง พร้อมสร้างรายการวัสดุใหม่ได้ทันที"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>รับเข้าพัสดุ (พร้อมเพิ่มวัสดุใหม่)</span>
              </button>
            )}

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition"
              title="ส่งออกรายงาน Excel / CSV เพื่อนำเข้า Google Sheets"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel / Sheets</span>
            </button>
          </div>
        </div>

        {/* Division Selector Tabs (4 Main Divisions + Add New Division) */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 mr-2 flex items-center gap-1">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>{isSuperAdmin ? 'สลับคลัง 4 กอง:' : 'คลังพัสดุประจำกอง:'}</span>
            </span>
            {isSuperAdmin ? (
              divisions.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDivisionId(d.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    selectedDivisionId === d.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span className="font-bold opacity-80">{d.shortCode || d.code}:</span>
                  <span>{d.name}</span>
                </button>
              ))
            ) : (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                <span>{divisions.find(d => d.id === selectedDivisionId)?.name || currentUser?.divisionName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-200/60 text-blue-900 font-mono">
                  {divisions.find(d => d.id === selectedDivisionId)?.shortCode || 'ปล'}
                </span>
              </span>
            )}
            {isSuperAdmin && (
              <button
                onClick={() => setIsAddDivModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-dashed border-slate-300 text-blue-600 hover:bg-blue-50 transition cursor-pointer"
              >
                + เพิ่มกองใหม่
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="bg-slate-100 p-1 rounded-xl flex flex-wrap items-center text-xs font-semibold gap-1">
            <button
              onClick={() => setActiveTab('requisitions')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'requisitions'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1. ขอเบิก & อนุมัติพัสดุ</span>
              {allRequisitions.filter(r => r.status === 'pending_approver' || r.status === 'pending_dispense').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'items'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. ทะเบียนคลังพัสดุประจำกอง
            </button>
            {(isDivisionAdmin || isDivisionDirector) && (
              <>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activeTab === 'transactions'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  3. บันทึกรับเข้า-จ่ายออก (จนท./ผอ.)
                </button>
                <button
                  onClick={() => setActiveTab('pd4_report')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                    activeTab === 'pd4_report'
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>4. แบบ พ.ด.4 บัญชีวัสดุ</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================= TAB 0: REQUISITIONS (NEW WORKFLOW) ================= */}
      {activeTab === 'requisitions' && (
        <RequisitionSection
          materials={materials}
          requisitions={allRequisitions}
          divisions={divisions}
          selectedDivisionId={selectedDivisionId}
          onSelectDivision={(id) => setSelectedDivisionId(id)}
        />
      )}

      {/* ================= TAB 1: MATERIAL ITEMS LIST ================= */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อวัสดุ หรือ รหัสพัสดุ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
              />
            </div>

            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none"
              >
                <option value="all">ประเภทวัสดุ: ทั้งหมด</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2">
              {isDivisionAdmin && (
                <>
                  <button
                    onClick={() => setIsAddCatModalOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>+ เพิ่มประเภทวัสดุ</span>
                  </button>
                  <button
                    onClick={() => {
                      setTxType('in');
                      setIsReceivingNewMaterial(true);
                      setIsAddTxModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    title="การเพิ่มวัสดุใหม่จะรวมอยู่ในเมนูรับเข้าวัสดุ เพื่อตรวจรับพัสดุเข้าคลังอย่างถูกต้อง"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>+ รับเข้าพัสดุ / เพิ่มวัสดุใหม่</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">รหัสพัสดุ</th>
                    <th className="py-3 px-4">ชื่อวัสดุ</th>
                    <th className="py-3 px-4">ประเภทวัสดุ</th>
                    <th className="py-3 px-4">ขนาดหรือลักษณะ</th>
                    <th className="py-3 px-4">หน่วยนับ</th>
                    <th className="py-3 px-4 text-right">ราคาต่อหน่วย</th>
                    <th className="py-3 px-4 text-right">ยอดคงเหลือ</th>
                    <th className="py-3 px-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentDivMaterials.map((mat) => (
                    <tr key={mat.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">{mat.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{mat.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {mat.categoryName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{mat.sizeOrSpec || '-'}</td>
                      <td className="py-3 px-4">{mat.unit}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {mat.unitPrice.toLocaleString()} ฿
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-mono font-black text-sm ${
                            mat.currentStock <= (mat.minStockAlert || 5)
                              ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded'
                              : 'text-emerald-700'
                          }`}
                        >
                          {mat.currentStock} {mat.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setTxMaterialId(mat.id);
                            setIsAddTxModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] transition cursor-pointer"
                        >
                          รับเข้า/จ่ายออก
                        </button>
                        {isDivisionAdmin && (
                          <button
                            onClick={() => {
                              if (window.confirm(`ต้องการลบวัสดุ "${mat.name}" ออกจากคลัง?`)) {
                                deleteMaterial(mat.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="ลบวัสดุ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ================= TAB 2: TRANSACTIONS & DIRECTOR APPROVAL ================= */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                ประวัติรายการรับ - เบิกจ่ายวัสดุ และการอนุมัติของผู้อำนวยการกอง
              </h3>
              <p className="text-xs text-slate-500">
                ผู้อำนวยการกองเป็นผู้อนุมัติทุกครั้ง • เมื่ออนุมัติแล้วระบบจะทำการตัดสต็อกรับ/จ่ายอัตโนมัติ
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">ปีงบประมาณ:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {['2570', '2569', 'all'].map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setSelectedFiscalYear(yr)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      selectedFiscalYear === yr
                        ? 'bg-white text-blue-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {yr === 'all' ? 'ทุกปีงบฯ' : `ปี ${yr}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">วันที่</th>
                  <th className="py-3 px-4">เลขที่เอกสาร</th>
                  <th className="py-3 px-4">ประเภท</th>
                  <th className="py-3 px-4">รายการวัสดุ</th>
                  <th className="py-3 px-4">รับจาก / จ่ายให้</th>
                  <th className="py-3 px-4 text-right">จำนวน</th>
                  <th className="py-3 px-4 text-right">รวมเงิน (บาท)</th>
                  <th className="py-3 px-4">สถานะ & ผู้อนุมัติ</th>
                  <th className="py-3 px-4 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentDivTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-slate-600">{tx.transactionDate}</td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">{tx.docNo}</td>
                    <td className="py-3 px-4">
                      {tx.transactionType === 'in' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                          <ArrowDownLeft className="w-3 h-3" /> รับเข้า
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-bold">
                          <ArrowUpRight className="w-3 h-3" /> เบิกจ่าย
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{tx.materialName}</td>
                    <td className="py-3 px-4">
                      <div className="text-slate-900">{tx.partyName}</div>
                      {tx.note && <div className="text-[10px] text-slate-400 italic">{tx.note}</div>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{tx.quantity}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {tx.totalPrice.toLocaleString()} ฿
                    </td>
                    <td className="py-3 px-4">
                      {tx.status === 'approved' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle className="w-3.5 h-3.5" /> อนุมัติแล้ว (ตัดสต็อกแล้ว)
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">โดย: {tx.approvedBy}</div>
                        </div>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                          รอ ผอ.กอง อนุมัติ
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {tx.status !== 'approved' && isDivisionDirector && (
                        <button
                          onClick={() => handleApproveTx(tx.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs cursor-pointer"
                        >
                          อนุมัติเบิกจ่าย
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: OFFICIAL FORM พ.ด.4 PRINT VIEW ================= */}
      {activeTab === 'pd4_report' && (() => {
        const selectedDiv = divisions.find((d) => d.id === selectedDivisionId) || divisions[0];

        // Filter materials based on print category & specific material item choice
        const printableMaterials = materials.filter((m) => {
          if (selectedDivisionId && m.divisionId !== selectedDivisionId) return false;
          if (printCategory !== 'all' && m.categoryName !== printCategory) return false;
          if (printMaterialId !== 'all' && m.id !== printMaterialId) return false;
          return true;
        });

        // Handler to export Excel with Table Borders (แบบ พ.ด.๔ มีตารางออกมาให้ด้วย)
        const handleExportPd4Excel = () => {
          const divName = selectedDiv?.name || 'องค์การบริหารส่วนตำบลอ่างแก้ว';

          let sheetsHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
              <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
              <!--[if gte mso 9]>
              <xml>
                <x:ExcelWorkbook>
                  <x:ExcelWorksheets>
                    <x:ExcelWorksheet>
                      <x:Name>บัญชีวัสดุ_พด4</x:Name>
                      <x:WorksheetOptions>
                        <x:DisplayGridlines/>
                      </x:WorksheetOptions>
                    </x:ExcelWorksheet>
                  </x:ExcelWorksheets>
                </x:ExcelWorkbook>
              </xml>
              <![endif]-->
              <style>
                body { font-family: 'Sarabun', 'TH Sarabun New', Tahoma, sans-serif; font-size: 11pt; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 25px; }
                th { background-color: #e2e8f0; color: #0f172a; font-weight: bold; text-align: center; border: 1px solid #000000; padding: 6px; font-size: 10pt; }
                td { border: 1px solid #000000; padding: 5px 6px; vertical-align: middle; font-size: 10pt; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .text-bold { font-weight: bold; }
              </style>
            </head>
            <body>
          `;

          printableMaterials.forEach((mat) => {
            const matTxs = currentDivTxs.filter((t) => t.materialId === mat.id);
            // แสดงจากบนลงล่าง รายการใดทำก่อนให้อยู่ด้านบน (เรียงตามวันที่จากอดีตไปหาปัจจุบัน)
            const sortedMatTxs = [...matTxs].sort((a, b) => {
              const tA = new Date(a.transactionDate).getTime();
              const tB = new Date(b.transactionDate).getTime();
              if (tA !== tB) return tA - tB;
              return a.id.localeCompare(b.id);
            });

            sheetsHtml += `
              <table border="1" style="border-collapse: collapse; width: 100%; border: 1px solid #000000;">
                <tr>
                  <td colspan="11" align="right" style="border: none; font-size: 10pt; font-weight: bold;">แบบ พ.ด.๔</td>
                </tr>
                <tr>
                  <td colspan="11" align="center" style="border: none; font-size: 16pt; font-weight: bold; padding: 4px;">บัญชีวัสดุ</td>
                </tr>
                <tr>
                  <td colspan="11" align="center" style="border: none; font-size: 12pt; font-weight: bold;">${divName} องค์การบริหารส่วนตำบลอ่างแก้ว</td>
                </tr>
                <tr>
                  <td colspan="11" align="center" style="border: none; font-size: 11pt; color: #334155; padding-bottom: 10px;">อำเภอโพธิ์ทอง จังหวัดอ่างทอง • ประจำปีงบประมาณ พ.ศ. ${selectedFiscalYear}</td>
                </tr>
                
                <tr style="background-color: #f8fafc;">
                  <td colspan="3" style="border: 1px solid #000000;"><strong>ประเภทวัสดุ:</strong> ${mat.categoryName}</td>
                  <td colspan="5" style="border: 1px solid #000000;"><strong>ชื่อหรือชนิดพัสดุ:</strong> ${mat.name}</td>
                  <td colspan="3" style="border: 1px solid #000000;"><strong>รหัสพัสดุ:</strong> ${mat.code}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td colspan="3" style="border: 1px solid #000000;"><strong>ขนาดหรือลักษณะ:</strong> ${mat.sizeOrSpec || '-'}</td>
                  <td colspan="3" style="border: 1px solid #000000;"><strong>หน่วยนับ:</strong> ${mat.unit}</td>
                  <td colspan="3" style="border: 1px solid #000000;"><strong>ที่เก็บ:</strong> ${mat.storageLocation || `คลังพัสดุ ${divName}`}</td>
                  <td colspan="2" style="border: 1px solid #000000;"><strong>จำนวนสูง/ต่ำ:</strong> ${mat.maxStock || 100} / ${mat.minStock || 10}</td>
                </tr>

                <!-- Header with explicit borders for Excel -->
                <tr style="background-color: #e2e8f0;">
                  <th rowspan="2" style="border: 1px solid #000000; text-align: center;">วัน เดือน ปี</th>
                  <th rowspan="2" style="border: 1px solid #000000; text-align: center;">รับจาก / จ่ายให้</th>
                  <th rowspan="2" style="border: 1px solid #000000; text-align: center;">เลขที่เอกสาร</th>
                  <th rowspan="2" style="border: 1px solid #000000; text-align: center;">ราคาต่อหน่วย (บาท)</th>
                  <th colspan="2" style="border: 1px solid #000000; text-align: center;">รับ</th>
                  <th colspan="2" style="border: 1px solid #000000; text-align: center;">จ่าย</th>
                  <th colspan="2" style="border: 1px solid #000000; text-align: center;">คงเหลือ</th>
                  <th rowspan="2" style="border: 1px solid #000000; text-align: center;">ลายมือชื่อ</th>
                </tr>
                <tr style="background-color: #e2e8f0;">
                  <th style="border: 1px solid #000000; text-align: center;">จำนวน</th>
                  <th style="border: 1px solid #000000; text-align: center;">จำนวนเงิน</th>
                  <th style="border: 1px solid #000000; text-align: center;">จำนวน</th>
                  <th style="border: 1px solid #000000; text-align: center;">จำนวนเงิน</th>
                  <th style="border: 1px solid #000000; text-align: center;">จำนวน</th>
                  <th style="border: 1px solid #000000; text-align: center;">จำนวนเงิน</th>
                </tr>
            `;

            if (sortedMatTxs.length === 0) {
              sheetsHtml += `
                <tr>
                  <td colspan="11" align="center" style="border: 1px solid #000000; padding: 12px; color: #64748b;">ยังไม่มีรายการเคลื่อนไหวรับ-จ่ายในงวดนี้</td>
                </tr>
              `;
            } else {
              sortedMatTxs.forEach((t) => {
                const isIn = t.transactionType === 'in';
                const inQty = isIn ? t.quantity : '-';
                const inTotal = isIn ? t.totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';
                const outQty = !isIn ? t.quantity : '-';
                const outTotal = !isIn ? t.totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';
                const balQty = t.balanceQuantity;
                const balTotal = (t.balanceQuantity * t.unitPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 });
                const signatory = t.signatoryName || t.partyName || '';

                sheetsHtml += `
                  <tr>
                    <td align="center" style="border: 1px solid #000000;">${t.transactionDate}</td>
                    <td style="border: 1px solid #000000;">${t.partyName}</td>
                    <td align="center" style="border: 1px solid #000000;">${t.docNo}</td>
                    <td align="right" style="border: 1px solid #000000;">${t.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    <td align="center" style="border: 1px solid #000000;">${inQty}</td>
                    <td align="right" style="border: 1px solid #000000;">${inTotal}</td>
                    <td align="center" style="border: 1px solid #000000;">${outQty}</td>
                    <td align="right" style="border: 1px solid #000000;">${outTotal}</td>
                    <td align="center" style="border: 1px solid #000000; font-weight: bold;">${balQty}</td>
                    <td align="right" style="border: 1px solid #000000; font-weight: bold;">${balTotal}</td>
                    <td align="center" style="border: 1px solid #000000;">${signatory}</td>
                  </tr>
                `;
              });
            }

            sheetsHtml += `
                <tr><td colspan="11" style="border: none; height: 15px;"></td></tr>
                <tr>
                  <td colspan="5" align="center" style="border: none; padding-top: 15px;">
                    ลงชื่อ........................................................เจ้าหน้าที่พัสดุ<br/>
                    (${currentUser?.fullName || 'เจ้าพนักงานพัสดุ'})<br/>
                    วันที่ ${new Date().toLocaleDateString('th-TH')}
                  </td>
                  <td colspan="6" align="center" style="border: none; padding-top: 15px;">
                    ลงชื่อ........................................................ผู้อำนวยการกอง<br/>
                    (${selectedDiv?.directorName || 'ผู้อำนวยการกอง'})<br/>
                    ผู้อนุมัติการเบิกจ่าย
                  </td>
                </tr>
                <tr><td colspan="11" style="border: none; height: 25px;"></td></tr>
              </table>
            `;
          });

          sheetsHtml += `</body></html>`;

          const blob = new Blob([sheetsHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const catSuffix = printCategory !== 'all' ? `_${printCategory}` : '';
          a.download = `ตารางบัญชีวัสดุ_พด4_${divName}${catSuffix}_${selectedFiscalYear}.xls`;
          a.click();
          URL.revokeObjectURL(url);
        };

        // Handler to export CSV with UTF-8 BOM
        const handleExportPd4Csv = () => {
          let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel Thai support
          const divName = selectedDiv?.name || 'องค์การบริหารส่วนตำบลอ่างแก้ว';

          printableMaterials.forEach((mat) => {
            const matTxs = currentDivTxs.filter((t) => t.materialId === mat.id);
            // รายการใดทำก่อนให้อยู่ด้านบน
            const sortedMatTxs = [...matTxs].sort((a, b) => {
              const tA = new Date(a.transactionDate).getTime();
              const tB = new Date(b.transactionDate).getTime();
              if (tA !== tB) return tA - tB;
              return a.id.localeCompare(b.id);
            });

            csv += `แบบ พ.ด.๔ บัญชีวัสดุ\n`;
            csv += `ส่วนราชการ,${divName} องค์การบริหารส่วนตำบลอ่างแก้ว อำเภอโพธิ์ทอง จังหวัดอ่างทอง\n`;
            csv += `ประจำปีงบประมาณ พ.ศ.,${selectedFiscalYear}\n`;
            csv += `ประเภทวัสดุ,${mat.categoryName},ชื่อหรือชนิดพัสดุ,${mat.name}\n`;
            csv += `รหัสพัสดุ,${mat.code},ขนาดหรือลักษณะ,${mat.sizeOrSpec || '-'}\n`;
            csv += `หน่วยนับ,${mat.unit},ที่เก็บ,${mat.storageLocation || `คลังพัสดุ ${divName}`}\n`;
            csv += `จำนวนอย่างสูง,${mat.maxStock || 100},จำนวนอย่างต่ำ,${mat.minStock || 10}\n\n`;

            // Table headers with swapped columns & signature at the end
            csv += `วัน เดือน ปี,รับจาก / จ่ายให้,เลขที่เอกสาร,ราคาต่อหน่วย (บาท),จำนวนรับ,จำนวนเงินรับ,จำนวนจ่าย,จำนวนเงินจ่าย,จำนวนคงเหลือ,จำนวนเงินคงเหลือ,ลายมือชื่อ\n`;

            sortedMatTxs.forEach((t) => {
              const isIn = t.transactionType === 'in';
              const inQty = isIn ? t.quantity : '';
              const inTotal = isIn ? t.totalPrice : '';
              const outQty = !isIn ? t.quantity : '';
              const outTotal = !isIn ? t.totalPrice : '';
              const balQty = t.balanceQuantity;
              const balTotal = t.balanceQuantity * t.unitPrice;
              const signatory = t.signatoryName || t.partyName || '';

              csv += `"${t.transactionDate}","${t.partyName.replace(/"/g, '""')}","${t.docNo}",${t.unitPrice},"${inQty}","${inTotal}","${outQty}","${outTotal}",${balQty},${balTotal},"${signatory.replace(/"/g, '""')}"\n`;
            });

            csv += `\n\n`;
          });

          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const catSuffix = printCategory !== 'all' ? `_${printCategory}` : '';
          a.download = `บัญชีวัสดุ_พด4_${divName}${catSuffix}_${selectedFiscalYear}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6">
            {/* Control & Filter Panel (Hidden in print) */}
            <div className="no-print bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    <span>รายงานบัญชีวัสดุ (แบบ พ.ด.๔ ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างฯ)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    แสดงรายการจากบนลงล่าง รายการใดทำก่อนอยู่ด้านบน • Export Excel มีตารางสมบูรณ์
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportPd4Excel}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                    title="ดาวน์โหลดไฟล์ Excel (.xls) พร้อมตารางเส้นขอบครบถ้วน"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export Excel (มีตาราง)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPd4Csv}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
                    title="ดาวน์โหลดไฟล์ CSV สำหรับ Google Sheets"
                  >
                    <Download className="w-4 h-4" />
                    <span>CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>สั่งพิมพ์แบบฟอร์ม พ.ด.๔</span>
                  </button>
                </div>
              </div>

              {/* Filters for print & export */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เลือกประเภทวัสดุ (Category)
                  </label>
                  <select
                    value={printCategory}
                    onChange={(e) => {
                      setPrintCategory(e.target.value);
                      setPrintMaterialId('all'); // Reset item filter when category changes
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="all">-- ทุกประเภทวัสดุ --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เลือกรายการพัสดุ (Material Item)
                  </label>
                  <select
                    value={printMaterialId}
                    onChange={(e) => setPrintMaterialId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="all">
                      -- ทุกรายการพัสดุ ({materials.filter(m => (selectedDivisionId ? m.divisionId === selectedDivisionId : true) && (printCategory !== 'all' ? m.categoryName === printCategory : true)).length} รายการ) --
                    </option>
                    {materials
                      .filter((m) => {
                        if (selectedDivisionId && m.divisionId !== selectedDivisionId) return false;
                        if (printCategory !== 'all' && m.categoryName !== printCategory) return false;
                        return true;
                      })
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.code} - {m.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      ปีงบประมาณ
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomFiscalYear(!isCustomFiscalYear)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                    >
                      {isCustomFiscalYear ? '← เลือกปีงบฯ' : '✏️ ระบุปีเอง'}
                    </button>
                  </div>
                  {!isCustomFiscalYear ? (
                    <select
                      value={['2570', '2571', '2572', '2569', '2568', '2567'].includes(selectedFiscalYear) ? selectedFiscalYear : 'custom'}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomFiscalYear(true);
                        } else {
                          setSelectedFiscalYear(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      <option value="2570">ปีงบประมาณ 2570 (ปัจจุบัน)</option>
                      <option value="2571">ปีงบประมาณ 2571</option>
                      <option value="2572">ปีงบประมาณ 2572</option>
                      <option value="2569">ปีงบประมาณ 2569</option>
                      <option value="2568">ปีงบประมาณ 2568</option>
                      <option value="2567">ปีงบประมาณ 2567</option>
                      <option value="custom">✏️ ระบุปีงบประมาณเอง...</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="เช่น 2570 หรือ 2573"
                        value={selectedFiscalYear === 'all' ? '2570' : selectedFiscalYear}
                        onChange={(e) => setSelectedFiscalYear(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-blue-400 bg-blue-50/50 font-bold font-mono text-xs"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    โหมดการพิมพ์
                  </label>
                  <select
                    value={printMode}
                    onChange={(e) => setPrintMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="batch_cards">พิมพ์แยกบัตรคุมพัสดุทีละรายการ (1 ใบต่อ 1 รายการ)</option>
                    <option value="combined">พิมพ์รวมทุกรายการในตารางเดียว</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Official Printable Sheets */}
            {printableMaterials.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs">
                ไม่พบรายการพัสดุตรงตามเงื่อนไขที่เลือก โปรดเปลี่ยนประเภทวัสดุหรือกอง/สำนัก
              </div>
            ) : (
              printableMaterials.map((mat, matIdx) => {
                const matTxs = currentDivTxs.filter((t) => t.materialId === mat.id);
                // แสดงจากบนลงล่าง รายการใดทำก่อนให้อยู่ด้านบน
                const sortedMatTxs = [...matTxs].sort((a, b) => {
                  const tA = new Date(a.transactionDate).getTime();
                  const tB = new Date(b.transactionDate).getTime();
                  if (tA !== tB) return tA - tB;
                  return a.id.localeCompare(b.id);
                });

                return (
                  <div
                    key={mat.id}
                    className={`border border-slate-300 p-6 sm:p-8 rounded-xl bg-white print:border-none print:p-0 ${
                      matIdx < printableMaterials.length - 1 ? 'print:break-after-page' : ''
                    } mb-8`}
                  >
                    {/* Header */}
                    <div className="text-right text-xs font-mono font-bold text-slate-600 mb-1">
                      แบบ พ.ด.๔
                    </div>
                    <div className="text-center space-y-1 mb-4">
                      <h2 className="text-xl font-bold font-heading text-slate-900 tracking-wider">
                        บัญชีวัสดุ
                      </h2>
                      <div className="text-xs font-semibold text-slate-800">
                        {selectedDiv?.name} องค์การบริหารส่วนตำบลอ่างแก้ว
                      </div>
                      <div className="text-xs text-slate-600">
                        อำเภอโพธิ์ทอง จังหวัดอ่างทอง • ประจำปีงบประมาณ พ.ศ. {selectedFiscalYear}
                      </div>
                    </div>

                    {/* ข้อมูลรายการพัสดุแสดงไว้ด้านบนตามข้อกำหนด */}
                    <div className="border border-slate-800 p-3 mb-4 rounded-lg bg-slate-50/50 text-xs text-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-2 leading-relaxed">
                      <div>
                        <span className="text-slate-600">ประเภทวัสดุ:</span>{' '}
                        <strong>{mat.categoryName}</strong>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-600">ชื่อหรือชนิดพัสดุ / รายการ:</span>{' '}
                        <strong className="text-blue-950 font-bold">{mat.name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-600">รหัสพัสดุ:</span>{' '}
                        <strong className="font-mono">{mat.code}</strong>
                      </div>
                      <div>
                        <span className="text-slate-600">ขนาดหรือลักษณะ:</span>{' '}
                        <span>{mat.sizeOrSpec || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">หน่วยนับ:</span>{' '}
                        <strong>{mat.unit}</strong>
                      </div>
                      <div>
                        <span className="text-slate-600">ที่เก็บ:</span>{' '}
                        <span>{mat.storageLocation || `คลังพัสดุ ${selectedDiv?.name}`}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">จำนวนอย่างสูง / อย่างต่ำ:</span>{' '}
                        <span>{mat.maxStock || 100} / {mat.minStock || 10} {mat.unit}</span>
                      </div>
                    </div>

                    {/* Print Table (ตัดรายการพัสดุออก, สลับเลขที่เอกสารกับรับจาก/จ่ายให้, เพิ่มช่องลายมือชื่อท้ายสุด) */}
                    <table className="w-full text-xs text-left border-collapse border border-slate-800 print-table">
                      <thead>
                        <tr className="bg-slate-100 text-slate-900 text-center font-bold">
                          <th className="border border-slate-800 p-2 w-24" rowSpan={2}>วัน เดือน ปี</th>
                          <th className="border border-slate-800 p-2" rowSpan={2}>รับจาก / จ่ายให้</th>
                          <th className="border border-slate-800 p-2 w-28" rowSpan={2}>เลขที่เอกสาร</th>
                          <th className="border border-slate-800 p-2 w-24" rowSpan={2}>ราคาต่อหน่วย (บาท)</th>
                          <th className="border border-slate-800 p-2" colSpan={2}>รับ</th>
                          <th className="border border-slate-800 p-2" colSpan={2}>จ่าย</th>
                          <th className="border border-slate-800 p-2" colSpan={2}>คงเหลือ</th>
                          <th className="border border-slate-800 p-2 w-24" rowSpan={2}>ลายมือชื่อ</th>
                        </tr>
                        <tr className="bg-slate-100 text-slate-900 text-center font-bold">
                          <th className="border border-slate-800 p-1 w-12">จำนวน</th>
                          <th className="border border-slate-800 p-1 w-16">จำนวนเงิน</th>
                          <th className="border border-slate-800 p-1 w-12">จำนวน</th>
                          <th className="border border-slate-800 p-1 w-16">จำนวนเงิน</th>
                          <th className="border border-slate-800 p-1 w-12">จำนวน</th>
                          <th className="border border-slate-800 p-1 w-16">จำนวนเงิน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedMatTxs.map((t, idx) => {
                          const isIn = t.transactionType === 'in';
                          return (
                            <tr key={idx} className="text-slate-800">
                              <td className="border border-slate-800 p-1.5 text-center font-mono">{t.transactionDate}</td>
                              <td className="border border-slate-800 p-1.5 font-medium">{t.partyName}</td>
                              <td className="border border-slate-800 p-1.5 font-mono text-center">{t.docNo}</td>
                              <td className="border border-slate-800 p-1.5 text-right font-mono">{t.unitPrice.toLocaleString()}</td>

                              {/* IN */}
                              <td className="border border-slate-800 p-1.5 text-center font-mono">
                                {isIn ? t.quantity : '-'}
                              </td>
                              <td className="border border-slate-800 p-1.5 text-right font-mono">
                                {isIn ? t.totalPrice.toLocaleString() : '-'}
                              </td>

                              {/* OUT */}
                              <td className="border border-slate-800 p-1.5 text-center font-mono">
                                {!isIn ? t.quantity : '-'}
                              </td>
                              <td className="border border-slate-800 p-1.5 text-right font-mono">
                                {!isIn ? t.totalPrice.toLocaleString() : '-'}
                              </td>

                              {/* BALANCE */}
                              <td className="border border-slate-800 p-1.5 text-center font-mono font-bold">
                                {t.balanceQuantity}
                              </td>
                              <td className="border border-slate-800 p-1.5 text-right font-mono font-bold">
                                {(t.balanceQuantity * t.unitPrice).toLocaleString()}
                              </td>

                              {/* ลายมือชื่อ (ช่องท้ายสุดตามข้อกำหนด) */}
                              <td className="border border-slate-800 p-1.5 text-center text-[11px] font-sans">
                                {t.signatoryName || t.partyName || '....................'}
                              </td>
                            </tr>
                          );
                        })}
                        {sortedMatTxs.length === 0 && (
                          <tr>
                            <td colSpan={11} className="border border-slate-800 p-4 text-center text-slate-400">
                              ยังไม่มีรายการเคลื่อนไหวรับ-จ่ายในงวดนี้
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Official Signatures */}
                    <div className="grid grid-cols-2 gap-8 mt-10 pt-4 text-center text-xs text-slate-800">
                      <div>
                        <p>ลงชื่อ........................................................เจ้าหน้าที่พัสดุ</p>
                        <p className="mt-1">({currentUser?.fullName || 'เจ้าพนักงานพัสดุ'})</p>
                        <p className="text-[11px] text-slate-500">วันที่ {new Date().toLocaleDateString('th-TH')}</p>
                      </div>

                      <div>
                        <p>ลงชื่อ........................................................ผู้อำนวยการกอง</p>
                        <p className="mt-1">
                          ({selectedDiv?.directorName || 'ผู้อำนวยการกอง'})
                        </p>
                        <p className="text-[11px] text-slate-500">ผู้อนุมัติการเบิกจ่าย</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })()}

      {/* Modal: Add Material Item */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900">เพิ่มรายการวัสดุใหม่เข้าสู่กอง</h3>
            <form onSubmit={handleSaveItem} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อวัสดุ <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ปากกาลูกลื่นสีน้ำเงิน 0.5 มม."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    ประเภทวัสดุ <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomNewItemCategory(!isCustomNewItemCategory);
                      if (!isCustomNewItemCategory) {
                        setCustomNewItemCategoryName('');
                      }
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                  >
                    {isCustomNewItemCategory ? '← เลือกจากประเภทที่มีอยู่' : '+ พิมพ์ประเภทใหม่เอง'}
                  </button>
                </div>

                {!isCustomNewItemCategory ? (
                  <select
                    value={newItemCategory}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setIsCustomNewItemCategory(true);
                        setCustomNewItemCategoryName('');
                      } else {
                        setNewItemCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    <option value="__add_new__">+ เพิ่ม/พิมพ์ประเภทใหม่เอง...</option>
                  </select>
                ) : (
                  <div className="space-y-1.5 p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                    <div className="text-[11px] font-semibold text-blue-800">
                      ระบุชื่อประเภทวัสดุใหม่ (ระบบจะบันทึกประเภทนี้ไว้ใช้อัตโนมัติ):
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="เช่น วัสดุก่อสร้าง, วัสดุการเกษตร, วัสดุยานพาหนะ, วัสดุคอมพิวเตอร์"
                      value={customNewItemCategoryName}
                      onChange={(e) => setCustomNewItemCategoryName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-blue-300 bg-white font-medium text-xs"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ขนาดหรือลักษณะ (เว้นไว้ได้)
                </label>
                <input
                  type="text"
                  placeholder="เช่น หัวขนาด 0.5 มม. หรือ ขนาด A4 หนา 80 แกรม"
                  value={newItemSize}
                  onChange={(e) => setNewItemSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">หน่วยนับ</label>
                  <input
                    type="text"
                    required
                    placeholder="ด้าม / กล่อง / รีม"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ราคา/หน่วย</label>
                  <input
                    type="number"
                    required
                    value={newItemUnitPrice}
                    onChange={(e) => setNewItemUnitPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ยอดเริ่มต้น</label>
                  <input
                    type="number"
                    value={newItemInitialStock}
                    onChange={(e) => setNewItemInitialStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow"
                >
                  บันทึกรายการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Stock Transaction (In / Out / Cross-Division) */}
      {isAddTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900">
              บันทึกรายการ รับเข้า / เบิกจ่ายวัสดุ
            </h3>
            <form onSubmit={handleSaveTransaction} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ประเภทรายการ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType('out')}
                    className={`py-2 rounded-lg border text-xs font-bold cursor-pointer ${
                      txType === 'out'
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    เบิกจ่ายวัสดุ (ตัดจ่าย)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('in')}
                    className={`py-2 rounded-lg border text-xs font-bold cursor-pointer ${
                      txType === 'in'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    รับเข้าวัสดุ (เพิ่มสต็อก)
                  </button>
                </div>
              </div>

              {/* Material Selection or Add New Material during Inbound Intake */}
              {txType === 'in' ? (
                <div className="space-y-2 p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">
                      การระบุรายการวัสดุรับเข้า:
                    </label>
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-300">
                      <button
                        type="button"
                        onClick={() => setIsReceivingNewMaterial(false)}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                          !isReceivingNewMaterial
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        เลือกวัสดุที่มีอยู่เดิม
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsReceivingNewMaterial(true)}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer flex items-center gap-1 ${
                          isReceivingNewMaterial
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-emerald-700 hover:text-emerald-900'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>เพิ่มวัสดุใหม่เข้าคลัง</span>
                      </button>
                    </div>
                  </div>

                  {!isReceivingNewMaterial ? (
                    <div>
                      <select
                        value={txMaterialId}
                        onChange={(e) => setTxMaterialId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        {materials.filter(m => m.divisionId === selectedDivisionId).length === 0 ? (
                          <option value="">-- ยังไม่มีวัสดุในกองนี้ กรุณากดปุ่มเพิ่มวัสดุใหม่ด้านบน --</option>
                        ) : (
                          materials
                            .filter(m => m.divisionId === selectedDivisionId)
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                [{m.code}] {m.name} (คงเหลือ: {m.currentStock} {m.unit}) - @{m.unitPrice} ฿
                              </option>
                            ))
                        )}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-1">
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-[11px]">
                        ✨ <strong>เพิ่มวัสดุใหม่:</strong> ระบบจะบันทึกเพิ่มรหัสวัสดุใหม่เข้าทะเบียนคลัง และบันทึกยอดรับเข้าสต็อกพร้อมกันในขั้นตอนเดียว
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          ชื่อรายการวัสดุใหม่ <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required={isReceivingNewMaterial}
                          placeholder="เช่น แฟ้มสันกว้าง 3 นิ้ว F4, ปากกาลูกลื่นสีน้ำเงิน"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-semibold text-slate-700">หมวดหมู่วัสดุ</label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomNewItemCategory(!isCustomNewItemCategory);
                              if (!isCustomNewItemCategory) setCustomNewItemCategoryName('');
                            }}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer underline flex items-center gap-0.5"
                          >
                            {isCustomNewItemCategory ? '← เลือกจากหมวดเดิม' : '➕ เพิ่มประเภทใหม่'}
                          </button>
                        </div>
                        {isCustomNewItemCategory ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              required={isReceivingNewMaterial && isCustomNewItemCategory}
                              placeholder="พิมพ์ชื่อประเภทวัสดุใหม่ เช่น วัสดุยานพาหนะ, วัสดุไฟฟ้า..."
                              value={customNewItemCategoryName}
                              onChange={(e) => setCustomNewItemCategoryName(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-blue-400 bg-blue-50/70 text-blue-900 font-medium text-xs focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-[10px] text-blue-700">
                              * ระบบจะบันทึกประเภทนี้เข้าสู่ระบบอัตโนมัติ เพื่อให้เลือกได้ในครั้งต่อไป
                            </p>
                          </div>
                        ) : (
                          <select
                            value={newItemCategory}
                            onChange={(e) => {
                              if (e.target.value === '__add_new__') {
                                setIsCustomNewItemCategory(true);
                                setCustomNewItemCategoryName('');
                              } else {
                                setNewItemCategory(e.target.value);
                              }
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                            <option value="__add_new__">➕ เพิ่มประเภทวัสดุใหม่...</option>
                          </select>
                        )}
                      </div>


                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">หน่วยนับ <span className="text-rose-600">*</span></label>
                          <input
                            type="text"
                            required={isReceivingNewMaterial}
                            placeholder="รีม / เล่ม / ด้าม / กล่อง"
                            value={newItemUnit}
                            onChange={(e) => setNewItemUnit(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">ขนาด / ลักษณะ</label>
                          <input
                            type="text"
                            placeholder="เช่น A4 หรือ 0.5 มม."
                            value={newItemSize}
                            onChange={(e) => setNewItemSize(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">ราคาต่อหน่วย (บาท) <span className="text-rose-600">*</span></label>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            required={isReceivingNewMaterial}
                            value={newItemUnitPrice}
                            onChange={(e) => setNewItemUnitPrice(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เลือกวัสดุที่จะตัดจ่าย</label>
                  <select
                    value={txMaterialId}
                    onChange={(e) => setTxMaterialId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {materials
                      .filter(m => m.divisionId === selectedDivisionId)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          [{m.code}] {m.name} (คงเหลือ: {m.currentStock} {m.unit})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Requirement: Default to current division, but support Cross-Division borrowing */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  การเบิกข้ามกอง (ถ้ามี)
                </label>
                <select
                  value={txBorrowingDivId}
                  onChange={(e) => setTxBorrowingDivId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">-- เบิกใช้ภายในกองตนเองตามปกติ --</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>เบิกข้ามกองไปใช้ที่: {d.name}</option>
                  ))}
                </select>
              </div>

              {/* Requirement: Dropdown + Text input for party (รับจากร้าน... หรือ จ่ายให้ใคร เช่น นักวิชาการจัดเก็บรายได้) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {txType === 'in' ? 'รับจากร้านค้า / แหล่งที่มา' : 'จ่ายให้ใคร (ชื่อและตำแหน่ง)'}
                </label>
                <div className="space-y-1.5">
                  <select
                    value={txPartyDropdown}
                    onChange={(e) => {
                      setTxPartyDropdown(e.target.value);
                      if (e.target.value) setTxPartyName(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">-- เลือกจากรายการที่ใช้บ่อย --</option>
                    {txType === 'in' ? (
                      <>
                        <option value="ร้านโพธิ์ทองเครื่องเขียนและอุปกรณ์">ร้านโพธิ์ทองเครื่องเขียนและอุปกรณ์</option>
                        <option value="ห้างหุ้นส่วนจำกัด อ่างทองวิศวกรรมไฟฟ้า">ห้างหุ้นส่วนจำกัด อ่างทองวิศวกรรมไฟฟ้า</option>
                        <option value="บริษัท สยามซัพพลายเซ็นเตอร์ จำกัด">บริษัท สยามซัพพลายเซ็นเตอร์ จำกัด</option>
                      </>
                    ) : (
                      <>
                        <option value="นายอานนท์ มั่นคง (นักวิชาการจัดเก็บรายได้)">นายอานนท์ มั่นคง (นักวิชาการจัดเก็บรายได้)</option>
                        <option value="นายสมชาย ขยันซ่อม (นายช่างโยธา)">นายสมชาย ขยันซ่อม (นายช่างโยธา)</option>
                        <option value="น.ส.วิภาดา สารบรรณ (เจ้าพนักงานธุรการ)">น.ส.วิภาดา สารบรรณ (เจ้าพนักงานธุรการ)</option>
                        <option value="น.ส.กมลวรรณ บุญมี (เจ้าพนักงานบุคคล)">น.ส.กมลวรรณ บุญมี (เจ้าพนักงานบุคคล)</option>
                      </>
                    )}
                  </select>
                  <input
                    type="text"
                    required
                    placeholder={txType === 'in' ? 'ระบุชื่อร้านค้า เช่น หจก. อ่างทองการค้า' : 'ระบุชื่อผู้เบิก เช่น นาย... ตำแหน่ง...'}
                    value={txPartyName}
                    onChange={(e) => setTxPartyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เลขที่เอกสาร</label>
                  <input
                    type="text"
                    placeholder="เช่น บข.สป 02/2569"
                    value={txDocNo}
                    onChange={(e) => setTxDocNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">จำนวนที่ทำรายการ</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={txQuantity}
                    onChange={(e) => setTxQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">วันที่ทำรายการ</label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddTxModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow"
                >
                  บันทึกรายการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Category */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900">เพิ่มประเภทวัสดุใหม่</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newCatName.trim()) {
                  addMaterialCategory(newCatName.trim());
                  setIsAddCatModalOpen(false);
                  setNewCatName('');
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อประเภทวัสดุ</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น วัสดุยานพาหนะและขนส่ง หรือ วัสดุการเกษตร"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsAddCatModalOpen(false)} className="px-3 py-1.5 border rounded-lg">ยกเลิก</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-lg">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Division */}
      {isAddDivModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900">เพิ่มกอง / สำนักใหม่ในระบบ</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newDivName.trim()) {
                  addDivision(newDivName.trim(), newDivCode.trim() || 'กข', newDivDirector.trim());
                  setIsAddDivModalOpen(false);
                  setNewDivName('');
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อกอง / ฝ่าย</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น กองสาธารณสุขและสิ่งแวดล้อม"
                  value={newDivName}
                  onChange={(e) => setNewDivName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">รหัสย่อ</label>
                <input
                  type="text"
                  placeholder="เช่น กส"
                  value={newDivCode}
                  onChange={(e) => setNewDivCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อผู้อำนวยการกอง</label>
                <input
                  type="text"
                  placeholder="เช่น นายมานพ สุขภาพดี"
                  value={newDivDirector}
                  onChange={(e) => setNewDivDirector(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsAddDivModalOpen(false)} className="px-3 py-1.5 border rounded-lg">ยกเลิก</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-lg">บันทึกกองใหม่</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
