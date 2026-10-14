import * as XLSX from 'xlsx';
import {
  MaterialItem,
  MaterialTransaction,
  RepairItem,
  EDocument,
  LicenseApplication,
  Division,
} from '../types';

/**
 * Universal Excel exporter using xlsx library with UTF-8 support
 */
export function exportToExcel(
  data: Record<string, any>[],
  fileName: string,
  sheetName: string = 'Sheet1'
) {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Auto-fit column widths
    const maxCols = Object.keys(data[0] || {}).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...data.map((row) => String(row[key] ?? '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
    });
    worksheet['!cols'] = maxCols;

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    return true;
  } catch (error) {
    console.error('Failed to export Excel:', error);
    alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel');
    return false;
  }
}

/**
 * Export Material Inventory (พ.ด.๔)
 */
export function exportInventoryPD4ToExcel(
  materials: MaterialItem[],
  transactions: MaterialTransaction[],
  divisionName: string = 'สำนักปลัด'
) {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Material Master Ledger
  const ledgerData = materials.map((m, idx) => ({
    'ลำดับ': idx + 1,
    'รหัสวัสดุ': m.code,
    'ชื่อรายการวัสดุ': m.name,
    'หมวดหมู่': m.categoryName,
    'หน่วยนับ': m.unit,
    'ราคาต่อหน่วย (บาท)': m.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
    'ยอดคงเหลือในคลัง': m.currentStock,
    'จุดเตือนสั่งซื้อขั้นต่ำ': m.minStockAlert || 5,
    'มูลค่ารวมคงเหลือ (บาท)': (m.currentStock * m.unitPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 }),
    'สถานะพัสดุ': m.currentStock <= (m.minStockAlert || 5) ? 'สต็อกใกล้หมด/สั่งเพิ่ม' : 'ปกติ',
  }));

  const worksheet1 = XLSX.utils.json_to_sheet(ledgerData);

  // 2. Transactions History (รับเข้า-จ่ายออก)
  const txData = transactions.map((t, idx) => ({
    'ลำดับ': idx + 1,
    'วันที่ทำรายการ': t.transactionDate,
    'ประเภท': t.transactionType === 'in' ? 'รับเข้า (เพิ่มสต็อก)' : 'จ่ายออก (ตัดสต็อก)',
    'รหัสวัสดุ': t.materialId,
    'ชื่อวัสดุ': t.materialName,
    'จำนวน': t.quantity,
    'ราคาต่อหน่วย': t.unitPrice.toFixed(2),
    'รวมเป็นเงิน (บาท)': t.totalPrice.toFixed(2),
    'ผู้เบิก/ผู้ส่งมอบ': t.partyName || '-',
    'เลขที่เอกสาร/ใบเบิก': t.docNo || '-',
    'คงเหลือหลังทำรายการ': t.balanceQuantity,
    'สถานะอนุมัติ': t.status === 'approved' ? 'อนุมัติเรียบร้อย' : 'รออนุมัติ',
  }));

  const worksheet2 = XLSX.utils.json_to_sheet(txData);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet1, 'ทะเบียนคลังพัสดุ');
  XLSX.utils.book_append_sheet(workbook, worksheet2, 'ประวัติรับ-จ่าย_พด4');

  XLSX.writeFile(workbook, `แบบพด4_บัญชีวัสดุ_${divisionName}_${todayStr}.xlsx`);
}

/**
 * Export Repair Service Summary
 */
export function exportRepairsToExcel(repairs: RepairItem[]) {
  const todayStr = new Date().toISOString().split('T')[0];

  const data = repairs.map((r, idx) => ({
    'ลำดับ': idx + 1,
    'รหัสใบแจ้งซ่อม': r.ticketId,
    'วันที่แจ้ง': r.createdAt.split('T')[0],
    'ประเภทงาน': r.category,
    'ระดับความเร่งด่วน': r.urgency,
    'หมู่ที่': r.villageNo,
    'สถานที่/จุดสังเกต': r.locationAddress || `หมู่ที่ ${r.villageNo}`,
    'พิกัด ละติจูด': r.coordinates.lat,
    'พิกัด ลองจิจูด': r.coordinates.lng,
    'ผู้แจ้ง': r.reporterName,
    'เบอร์โทร': r.reporterPhone,
    'สถานะการซ่อม': r.status === 'completed' ? 'ซ่อมแซมเสร็จสิ้น' : r.status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ',
    'ช่างผู้รับผิดชอบ': r.assignedTechnician || 'ยังไม่มอบหมาย',
    'วันที่แล้วเสร็จ': r.repairedAt || '-',
  }));

  exportToExcel(data, `รายงานสรุปงานแจ้งซ่อมบำรุง_อบต_อ่างแก้ว_${todayStr}`, 'งานแจ้งซ่อม');
}

/**
 * Export E-Documents Saraban Log
 */
export function exportDocumentsToExcel(docs: EDocument[]) {
  const todayStr = new Date().toISOString().split('T')[0];

  const data = docs.map((d, idx) => ({
    'ลำดับ': idx + 1,
    'เลขทะเบียนรับกลาง': d.receiptNo,
    'เลขทะเบียนรับกอง': d.divisionReceiptNo || '-',
    'เลขที่หนังสือ': d.bookNo,
    'ลงวันที่': d.bookDate,
    'วันที่ลงรับ': d.receiveDate,
    'จากหน่วยงาน': d.fromOrg,
    'ถึง': d.toOrg,
    'เรื่อง': d.subject,
    'ชั้นความเร็ว': d.urgency,
    'ชั้นความลับ': d.secrecy,
    'กองที่รับผิดชอบ': d.dispatchedToDivisionName || 'ยังไม่จ่าย',
    'สถานะ': d.status === 'acknowledged' ? 'รับหนังสือแล้ว' : d.status === 'dispatched' ? 'จ่ายหนังสือแล้ว' : 'ลงทะเบียนรับ',
  }));

  exportToExcel(data, `ทะเบียนสารบรรณอิเล็กทรอนิกส์_อบต_อ่างแก้ว_${todayStr}`, 'ทะเบียนรับส่งหนังสือ');
}

/**
 * Export Executive KPI Summary
 */
export function exportExecutiveKpiToExcel(
  repairs: RepairItem[],
  materials: MaterialItem[],
  divisions: Division[],
  docs: EDocument[],
  apps: LicenseApplication[]
) {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Division Material Valuation
  const divSummary = divisions.map((div) => {
    const divMats = materials.filter((m) => m.divisionId === div.id);
    const totalItems = divMats.length;
    const totalValue = divMats.reduce((sum, m) => sum + m.currentStock * m.unitPrice, 0);
    const lowStockCount = divMats.filter((m) => m.currentStock <= (m.minStockAlert || 5)).length;
    return {
      'สำนัก/กอง': div.name,
      'จำนวนรายการพัสดุ (ชนิด)': totalItems,
      'มูลค่าพัสดุคงคลังรวม (บาท)': totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
      'รายการที่สต็อกใกล้หมด': lowStockCount,
    };
  });

  // 2. Repair Resolution Performance
  const completedRepairs = repairs.filter((r) => r.status === 'completed').length;
  const inProgressRepairs = repairs.filter((r) => r.status === 'in_progress').length;
  const pendingRepairs = repairs.filter((r) => r.status === 'pending').length;
  const resolutionRate = repairs.length > 0 ? ((completedRepairs / repairs.length) * 100).toFixed(1) : '100';

  const repairSummary = [
    { 'ตัวชี้วัด (KPI)': 'จำนวนเรื่องร้องเรียน/แจ้งซ่อมทั้งหมด', 'ค่าสถิติ': repairs.length },
    { 'ตัวชี้วัด (KPI)': 'ซ่อมแซมเสร็จสิ้นแล้ว (Resolved)', 'ค่าสถิติ': completedRepairs },
    { 'ตัวชี้วัด (KPI)': 'กำลังดำเนินการ (In Progress)', 'ค่าสถิติ': inProgressRepairs },
    { 'ตัวชี้วัด (KPI)': 'รอดำเนินการ (Pending)', 'ค่าสถิติ': pendingRepairs },
    { 'ตัวชี้วัด (KPI)': 'อัตราความสำเร็จในการแก้ไขปัญหา (% Resolved)', 'ค่าสถิติ': `${resolutionRate}%` },
    { 'ตัวชี้วัด (KPI)': 'คำขอใบอนุญาตที่อนุมัติแล้ว', 'ค่าสถิติ': apps.filter((a) => a.status === 'step2_approved').length },
    { 'ตัวชี้วัด (KPI)': 'หนังสือราชการทั้งหมดในระบบ', 'ค่าสถิติ': docs.length },
  ];

  const workbook = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(divSummary);
  const ws2 = XLSX.utils.json_to_sheet(repairSummary);

  XLSX.utils.book_append_sheet(workbook, ws1, 'สรุปมูลค่าพัสดุ4กอง');
  XLSX.utils.book_append_sheet(workbook, ws2, 'ดัชนีชี้วัดKPIภาพรวม');

  XLSX.writeFile(workbook, `รายงานสรุปผู้บริหาร_Executive_BI_${todayStr}.xlsx`);
}
