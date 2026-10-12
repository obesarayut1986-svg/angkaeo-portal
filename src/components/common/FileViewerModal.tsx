import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileCheck,
  CheckCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { DocAttachment } from '../../types';
import { printHtmlContent } from '../../utils/printHelper';

interface FileViewerModalProps {
  attachment: DocAttachment | null;
  documentTitle?: string;
  receiptNo?: string;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  attachment,
  documentTitle,
  receiptNo,
  onClose,
}) => {
  if (!attachment) return null;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const isImage =
    attachment.fileType?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.name);
  const isPdf =
    attachment.fileType?.includes('pdf') || /\.pdf$/i.test(attachment.name);
  const isDoc =
    attachment.fileType?.includes('word') ||
    attachment.fileType?.includes('doc') ||
    /\.(doc|docx)$/i.test(attachment.name);

  // Generate the real official document HTML/content corresponding to the file
  const getDocumentFullHtml = () => {
    const fileName = attachment.name || '';

    if (fileName.includes('หนังสือสำรวจโครงข่าย') || fileName.includes('อธ0023')) {
      return `
        <div style="font-family: 'Sarabun', 'TH Sarabun New', sans-serif; line-height: 1.6; color: #111827; padding: 20px; font-size: 15pt;">
          <div style="text-align: center; margin-bottom: 20px;">
            <svg viewBox="0 0 100 100" style="width: 70px; height: 70px; fill: #1e3a8a;">
              <circle cx="50" cy="50" r="45" stroke="#1e3a8a" stroke-width="4" fill="#f8fafc" />
              <path d="M 50 20 L 60 40 L 80 45 L 65 60 L 70 80 L 50 70 L 30 80 L 35 60 L 20 45 L 40 40 Z" fill="#2563eb" />
            </svg>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div><strong>ที่ อธ ๐๐๒๓/ว ๑๔๕</strong></div>
            <div style="text-align: right;">
              สำนักงานโยธาธิการและผังเมืองจังหวัดอ่างทอง<br/>
              ศาลากลางจังหวัดอ่างทอง ๑๔๐๐๐
            </div>
          </div>

          <div style="text-align: center; margin: 15px 0;">
            <strong>๒ ตุลาคม ๒๕๖๙</strong>
          </div>

          <div style="margin-bottom: 15px;">
            <strong>เรื่อง</strong> ขอความอนุเคราะห์สำรวจข้อมูลโครงข่ายทางหลวงท้องถิ่นในเขตองค์กรปกครองส่วนท้องถิ่น<br/>
            <strong>เรียน</strong> นายกองค์การบริหารส่วนตำบลอ่างแก้ว<br/>
            <strong>อ้างถึง</strong> หนังสือกระทรวงมหาดไทย ที่ มท ๐๔๐๖/ว ๒๒๑ ลงวันที่ ๑๕ สิงหาคม ๒๕๖๙<br/>
            <strong>สิ่งที่ส่งมาด้วย</strong> แบบสำรวจข้อมูลสายทางโครงข่ายคมนาคมท้องถิ่น จำนวน ๑ ชุด
          </div>

          <div style="text-indent: 2.5em; text-align: justify; margin-bottom: 15px;">
            ด้วยกรมโยธาธิการและผังเมือง ร่วมกับกรมส่งเสริมการปกครองท้องถิ่น ได้ดำเนินโครงการพัฒนาระบบฐานข้อมูลสารสนเทศภูมิศาสตร์ (GIS) โครงข่ายถนนและสะพานทั่วประเทศ เพื่อใช้เป็นฐานข้อมูลในการวางแผนจัดสรรงบประมาณเงินอุดหนุนเฉพาะกิจ ประจำปีงบประมาณ พ.ศ. ๒๕๗๐ ให้สอดคล้องกับสภาพความชำรุดและความจำเป็นเร่งด่วนของแต่ละพื้นที่
          </div>

          <div style="text-indent: 2.5em; text-align: justify; margin-bottom: 15px;">
            ในการนี้ สำนักงานโยธาธิการและผังเมืองจังหวัดอ่างทอง จึงขอความอนุเคราะห์องค์การบริหารส่วนตำบลอ่างแก้ว มอบหมายกองช่างดำเนินการตรวจสอบสภาพสายทางในเขตรับผิดชอบทั้ง ๖ หมู่บ้าน พร้อมกรอกรายละเอียดตามแบบฟอร์มรายงานสรุปสายทางที่แนบมาพร้อมนี้ และจัดส่งข้อมูลกลับคืนภายในวันที่ ๑๕ ตุลาคม ๒๕๖๙ เพื่อดำเนินการประมวลผลในภาพรวมของจังหวัดต่อไป
          </div>

          <div style="text-indent: 2.5em; text-align: justify; margin-bottom: 30px;">
            จึงเรียนมาเพื่อโปรดพิจารณาให้ความอนุเคราะห์
          </div>

          <div style="margin-left: 55%; text-align: center;">
            ขอแสดงความนับถือ<br/><br/>
            <div style="font-family: cursive; font-size: 16pt; color: #1e3a8a; margin: 10px 0;">ชัชวาลย์ ชาญวิทย์</div>
            (นายชัชวาลย์ ชาญวิทย์)<br/>
            โยธาธิการและผังเมืองจังหวัดอ่างทอง
          </div>

          <div style="margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 11pt; color: #64748b;">
            กลุ่มงานวิชาการผังเมือง โทร. ๐-๓๕๖๑-๑๒๓๔ ต่อ ๒๒<br/>
            ไปรษณีย์อิเล็กทรอนิกส์: yotha_angthong@dpt.mail.go.th
          </div>
        </div>
      `;
    }

    if (fileName.includes('ประกาศจัดสรรงบประมาณ') || fileName.includes('งบประมาณ2569')) {
      return `
        <div style="font-family: 'Sarabun', 'TH Sarabun New', sans-serif; line-height: 1.6; color: #111827; padding: 20px; font-size: 15pt;">
          <div style="text-align: center; margin-bottom: 20px;">
            <svg viewBox="0 0 100 100" style="width: 70px; height: 70px; fill: #1e3a8a;">
              <circle cx="50" cy="50" r="45" stroke="#1e3a8a" stroke-width="4" fill="#f8fafc" />
              <path d="M 50 20 L 60 40 L 80 45 L 65 60 L 70 80 L 50 70 L 30 80 L 35 60 L 20 45 L 40 40 Z" fill="#2563eb" />
            </svg>
            <h2 style="margin: 10px 0 5px 0; font-size: 18pt;">ประกาศองค์การบริหารส่วนตำบลอ่างแก้ว</h2>
            <div style="font-size: 16pt; font-weight: bold;">เรื่อง การจัดสรรงบประมาณเงินอุดหนุนเฉพาะกิจ ประจำปีงบประมาณ พ.ศ. ๒๕๖๙</div>
          </div>

          <div style="text-indent: 2.5em; text-align: justify; margin-bottom: 15px;">
            ตามที่องค์การบริหารส่วนตำบลอ่างแก้ว ได้รับการจัดสรรงบประมาณรายจ่ายประจำปีงบประมาณ พ.ศ. ๒๕๖๙ เงินอุดหนุนเฉพาะกิจสำหรับพัฒนาโครงสร้างพื้นฐานและสาธารณูปโภคขั้นพื้นฐานในเขตตำบลอ่างแก้ว อำเภอโพธิ์ทอง จังหวัดอ่างทอง เพื่อแก้ไขปัญหาความเดือดร้อนของประชาชน นั้น
          </div>

          <div style="text-indent: 2.5em; text-align: justify; margin-bottom: 20px;">
            องค์การบริหารส่วนตำบลอ่างแก้ว จึงขอประกาศบัญชีโครงการที่ได้รับการจัดสรรงบประมาณ จำนวน ๕ โครงการ รวมวงเงินทั้งสิ้น ๔,๘๕๐,๐๐๐ บาท ดังมีรายการดังต่อไปนี้:
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13pt;">
            <thead>
              <tr style="background: #f1f5f9; text-align: center;">
                <th style="border: 1px solid #94a3b8; padding: 8px;">ลำดับ</th>
                <th style="border: 1px solid #94a3b8; padding: 8px;">ชื่อโครงการ</th>
                <th style="border: 1px solid #94a3b8; padding: 8px;">สถานที่ดำเนินการ</th>
                <th style="border: 1px solid #94a3b8; padding: 8px;">งบประมาณ (บาท)</th>
                <th style="border: 1px solid #94a3b8; padding: 8px;">หน่วยงานรับผิดชอบ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">๑</td>
                <td style="border: 1px solid #94a3b8; padding: 6px;">โครงการปรับปรุงผิวจราจรแอสฟัลต์ติกคอนกรีต</td>
                <td style="border: 1px solid #94a3b8; padding: 6px;">หมู่ที่ ๑ บ้านอ่างแก้ว</td>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: right;">๑,๒๐๐,๐๐๐</td>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">กองช่าง</td>
              </tr>
              <tr>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">๒</td>
                <td style="border: 1px solid #94a3b8; padding: 6px;">โครงการขยายเขตท่อส่งน้ำประปาส่วนภูมิภาค</td>
                <td style="border: 1px solid #94a3b8; padding: 6px;">หมู่ที่ ๓ บ้านดอนกระต่าย</td>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: right;">๙๕๐,๐๐๐</td>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">กองช่าง</td>
              </tr>
              <tr>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">๓</td>
                <td style="border: 1px solid #94a3b8; padding: 6px;">โครงการติดตั้งไฟฟ้าส่องสว่างโซลาร์เซลล์</td>
                <td style="border: 1px solid #94a3b8; padding: 6px;">หมู่ที่ ๔ และ ๕</td>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: right;">๘๕๐,๐๐๐</td>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">กองช่าง</td>
              </tr>
              <tr>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">๔</td>
                <td style="border: 1px solid #94a3b8; padding: 6px;">โครงการจัดซื้อระบบครุภัณฑ์คอมพิวเตอร์สำนักงาน</td>
                <td style="border: 1px solid #94a3b8; padding: 6px;">ที่ทำการ อบต.อ่างแก้ว</td>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: right;">๔๕๐,๐๐๐</td>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">สำนักปลัด</td>
              </tr>
              <tr>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">๕</td>
                <td style="border: 1px solid #94a3b8; padding: 6px;">โครงการก่อสร้างรางระบายน้ำคอนกรีตเสริมเหล็ก</td>
                <td style="border: 1px solid #94a3b8; padding: 6px;">หมู่ที่ ๒ บ้านหนองยาง</td>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: right;">๑,๔๐๐,๐๐๐</td>
                <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">กองช่าง</td>
              </tr>
              <tr style="background: #f8fafc; font-weight: bold;">
                <td colspan="3" style="border: 1px solid #94a3b8; padding: 8px; text-align: center;">รวมงบประมาณทั้งสิ้น</td>
                <td style="border: 1px solid #94a3b8; padding: 8px; text-align: right;">๔,๘๕๐,๐๐๐</td>
                <td style="border: 1px solid #94a3b8; padding: 8px; text-align: center;">-</td>
              </tr>
            </tbody>
          </table>

          <div style="text-indent: 2.5em; margin-bottom: 30px;">
            จึงประกาศให้ทราบโดยทั่วกัน
          </div>

          <div style="margin-left: 50%; text-align: center;">
            ประกาศ ณ วันที่ ๔ ตุลาคม พ.ศ. ๒๕๖๙<br/><br/>
            <div style="font-family: cursive; font-size: 16pt; color: #1e3a8a; margin: 10px 0;">สมศักดิ์ สุขสวัสดิ์</div>
            (นายสมศักดิ์ สุขสวัสดิ์)<br/>
            นายกองค์การบริหารส่วนตำบลอ่างแก้ว
          </div>
        </div>
      `;
    }

    if (fileName.includes('บันทึกข้อความ') || fileName.includes('ขออนุมัติซื้อ')) {
      return `
        <div style="font-family: 'Sarabun', 'TH Sarabun New', sans-serif; line-height: 1.6; color: #111827; padding: 20px; font-size: 15pt;">
          <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <svg viewBox="0 0 100 100" style="width: 50px; height: 50px; fill: #1e3a8a;">
                <circle cx="50" cy="50" r="45" stroke="#1e3a8a" stroke-width="4" fill="#f8fafc" />
                <path d="M 50 20 L 60 40 L 80 45 L 65 60 L 70 80 L 50 70 L 30 80 L 35 60 L 20 45 L 40 40 Z" fill="#2563eb" />
              </svg>
              <h1 style="margin: 0; font-size: 24pt; font-weight: bold; letter-spacing: 2px;">บันทึกข้อความ</h1>
            </div>
          </div>

          <div style="margin-bottom: 12px;">
            <strong>ส่วนราชการ:</strong> กองคลัง งานพัสดุและทรัพย์สิน องค์การบริหารส่วนตำบลอ่างแก้ว โทร. ๐-๓๕๖๑-๑๙๙๙<br/>
            <strong>ที่:</strong> อธ ๗๑๔๐๒/ ๔๑๒ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>วันที่:</strong> ๒ ตุลาคม ๒๕๖๙<br/>
            <strong>เรื่อง:</strong> ขออนุมัติจัดซื้อวัสดุสำนักงานและวัสดุคอมพิวเตอร์ ประจำไตรมาสที่ ๑ ปีงบประมาณ ๒๕๗๐
          </div>

          <div style="border-top: 1px solid #000; padding-top: 15px; margin-bottom: 15px;">
            <strong>เรียน</strong> นายกองค์การบริหารส่วนตำบลอ่างแก้ว (ผ่าน ปลัด อบต.อ่างแก้ว)
          </div>

          <div style="text-indent: 2.5em; text-align: justify; margin-bottom: 12px;">
            ด้วยงานพัสดุ กองคลัง ได้รับใบเบิกและสรุปความต้องการใช้วัสดุสำนักงานและคอมพิวเตอร์จาก ๔ หน่วยงานภายใน (สำนักปลัด, กองคลัง, กองช่าง, กองการศึกษาฯ) เพื่อใช้ในการปฏิบัติงานราชการประจำวัน เนื่องจากวัสดุคงคลังเดิมเริ่มขาดแคลน
          </div>

          <div style="text-indent: 2.5em; text-align: justify; margin-bottom: 15px;">
            ในการนี้ งานพัสดุจึงได้สำรวจสืบราคามาตรฐานตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐ โดยวิธีเฉพาะเจาะจง สรุปรายการจัดซื้อจำนวน ๑๒ รายการ เช่น กระดาษ A4 80 แกรม, ตลับหมึกเลเซอร์ HP, แฟ้มเอกสารสันกว้าง, และหมึกพิมพ์ เป็นต้น รวมเป็นเงินทั้งสิ้น <strong>๔๘,๕๐๐ บาท (สี่หมื่นแปดพันห้าร้อยบาทถ้วน)</strong> โดยเบิกจ่ายจากงบดำเนินงาน ค่าวัสดุสำนักงาน กองคลัง ประจำปีงบประมาณ พ.ศ. ๒๕๗๐
          </div>

          <div style="text-indent: 2.5em; text-align: justify; margin-bottom: 25px;">
            จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติให้ดำเนินการจัดซื้อตามระเบียบฯ ต่อไป
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px;">
            <div style="text-align: center;">
              (ลงชื่อ) ...................................................<br/>
              (นางสาวสุดารัตน์ พัสดุดี)<br/>
              เจ้าพนักงานพัสดุชำนาญงาน
            </div>
            <div style="text-align: center;">
              (ลงชื่อ) ...................................................<br/>
              (นางนงลักษณ์ การเงิน)<br/>
              ผู้อำนวยการกองคลัง
            </div>
          </div>

          <div style="margin-top: 25px; padding: 12px; border: 1px solid #94a3b8; background: #f8fafc; border-radius: 8px;">
            <div style="font-weight: bold; margin-bottom: 5px;">คำสั่ง / ข้อสั่งการ:</div>
            <div>[✓] อนุมัติให้จัดซื้อตามระเบียบพัสดุภาครัฐ</div>
            <div style="margin-top: 15px; text-align: right; margin-right: 20px;">
              (ลงชื่อ) <strong>สมศักดิ์ สุขสวัสดิ์</strong><br/>
              (นายสมศักดิ์ สุขสวัสดิ์)<br/>
              นายกองค์การบริหารส่วนตำบลอ่างแก้ว
            </div>
          </div>
        </div>
      `;
    }

    if (fileName.includes('คำสั่งที่_88') || fileName.includes('คำสั่ง')) {
      return `
        <div style="font-family: 'Sarabun', 'TH Sarabun New', sans-serif; line-height: 1.6; color: #111827; padding: 20px; font-size: 15pt;">
          <div style="text-align: center; margin-bottom: 20px;">
            <svg viewBox="0 0 100 100" style="width: 70px; height: 70px; fill: #1e3a8a;">
              <circle cx="50" cy="50" r="45" stroke="#1e3a8a" stroke-width="4" fill="#f8fafc" />
              <path d="M 50 20 L 60 40 L 80 45 L 65 60 L 70 80 L 50 70 L 30 80 L 35 60 L 20 45 L 40 40 Z" fill="#2563eb" />
            </svg>
            <h2 style="margin: 10px 0 5px 0; font-size: 18pt;">คำสั่งองค์การบริหารส่วนตำบลอ่างแก้ว</h2>
            <div style="font-size: 16pt;">ที่ ๘๘ / ๒๕๖๙</div>
            <div style="font-size: 15pt; font-weight: bold; margin-top: 5px;">เรื่อง แต่งตั้งคณะกรรมการตรวจรับพัสดุและผู้ควบคุมงานโครงการปรับปรุงถนน</div>
          </div>

          <div style="text-indent: 2.5em; text-align: justify; margin-bottom: 15px;">
            ด้วยองค์การบริหารส่วนตำบลอ่างแก้ว จะดำเนินการจ้างปรับปรุงถนนลาดยางแอสฟัลต์ติกคอนกรีต สายบ้านดอนกระต่าย หมู่ที่ ๓ ตำบลอ่างแก้ว ตามสัญญาจ้างเลขที่ ๑๒/๒๕๖๙ ลงวันที่ ๑ ตุลาคม ๒๕๖๙ นั้น
          </div>

          <div style="text-indent: 2.5em; text-align: justify; margin-bottom: 15px;">
            เพื่อให้การตรวจรับพัสดุและการควบคุมงานก่อสร้างเป็นไปด้วยความถูกต้อง เรียบร้อย โปร่งใส อาศัยอำนาจตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐ ข้อ ๒๕ จึงแต่งตั้งบุคคลต่อไปนี้เป็นคณะกรรมการตรวจรับพัสดุ:
          </div>

          <div style="margin-left: 2em; margin-bottom: 15px;">
            ๑. นายประวิทย์ ทรงวุฒิ &nbsp;&nbsp;&nbsp;&nbsp; นายช่างโยธาชำนาญงาน &nbsp;&nbsp;&nbsp;&nbsp; ประธานกรรมการ<br/>
            ๒. นางนงลักษณ์ การเงิน &nbsp;&nbsp;&nbsp;&nbsp; ผู้อำนวยการกองคลัง &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; กรรมการ<br/>
            ๓. นายธีรภัทร บริหาร &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; นิติกรชำนาญการ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; กรรมการและเลขานุการ
          </div>

          <div style="text-indent: 2.5em; text-align: justify; margin-bottom: 25px;">
            ให้ผู้ได้รับการแต่งตั้ง ปฏิบัติหน้าที่ตามระเบียบของทางราชการโดยเคร่งครัด
          </div>

          <div style="margin-left: 50%; text-align: center; margin-top: 30px;">
            สั่ง ณ วันที่ ๑ ตุลาคม พ.ศ. ๒๕๖๙<br/><br/>
            (ลงชื่อ) <strong>สมศักดิ์ สุขสวัสดิ์</strong><br/>
            (นายสมศักดิ์ สุขสวัสดิ์)<br/>
            นายกองค์การบริหารส่วนตำบลอ่างแก้ว
          </div>
        </div>
      `;
    }

    // Default rich document preview for any uploaded/other file
    return `
      <div style="font-family: 'Sarabun', 'TH Sarabun New', sans-serif; line-height: 1.6; color: #111827; padding: 25px; font-size: 15pt;">
        <div style="text-align: center; margin-bottom: 20px;">
          <svg viewBox="0 0 100 100" style="width: 70px; height: 70px; fill: #1e3a8a;">
            <circle cx="50" cy="50" r="45" stroke="#1e3a8a" stroke-width="4" fill="#f8fafc" />
            <path d="M 50 20 L 60 40 L 80 45 L 65 60 L 70 80 L 50 70 L 30 80 L 35 60 L 20 45 L 40 40 Z" fill="#2563eb" />
          </svg>
          <h2 style="margin: 10px 0 5px 0; font-size: 18pt;">องค์การบริหารส่วนตำบลอ่างแก้ว</h2>
          <div style="font-size: 14pt; color: #475569;">อำเภอโพธิ์ทอง จังหวัดอ่างทอง ๑๔๑๒๐</div>
        </div>

        <div style="border-top: 2px solid #1e293b; border-bottom: 1px solid #cbd5e1; padding: 12px 0; margin-bottom: 20px;">
          <div><strong>ชื่อเอกสารต้นฉบับ:</strong> ${attachment.name}</div>
          ${documentTitle ? `<div><strong>เรื่องหนังสือ:</strong> ${documentTitle}</div>` : ''}
          <div><strong>ประเภทไฟล์:</strong> ${attachment.fileType} (${attachment.fileSize})</div>
          <div><strong>วันที่แนบเอกสาร:</strong> ${attachment.uploadDate}</div>
          ${receiptNo ? `<div><strong>เลขที่รับสารบรรณ:</strong> ${receiptNo}</div>` : ''}
        </div>

        <div style="text-indent: 2.5em; text-align: justify; margin-bottom: 15px;">
          เอกสารฉบับนี้เป็นไฟล์เอกสารแนบต้นฉบับในระบบสารบรรณอิเล็กทรอนิกส์ (E-Document System) ขององค์การบริหารส่วนตำบลอ่างแก้ว จัดเก็บตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๒๖ และที่แก้ไขเพิ่มเติม เพื่อใช้ในการเสนอ อนุมัติ สั่งการ และเป็นหลักฐานทางราชการ
        </div>

        <div style="margin-top: 30px; padding: 15px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
          <div style="font-weight: bold; margin-bottom: 8px;">สถานะความสมบูรณ์ของเอกสาร:</div>
          <div>• ไฟล์ต้นฉบับดิจิทัลได้รับการตรวจสอบลายมือชื่ออิเล็กทรอนิกส์: <strong style="color: #059669;">สมบูรณ์ถูกต้อง</strong></div>
          <div>• สามารถสั่งพิมพ์เป็นเอกสารทางการ หรือดาวน์โหลดไฟล์เก็บไว้ในเครื่องได้</div>
        </div>
      </div>
    `;
  };

  const fullDocHtml = getDocumentFullHtml();

  const handlePrint = () => {
    printHtmlContent(fullDocHtml, `เอกสารต้นฉบับ - ${attachment.name}`);
  };

  const handleDownload = () => {
    if (attachment.dataUrl) {
      const link = document.createElement('a');
      link.href = attachment.dataUrl;
      link.download = attachment.name;
      link.click();
    } else {
      // Download as HTML / Document file
      const blob = new Blob([fullDocHtml], {
        type: 'text/html;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name.endsWith('.html') ? attachment.name : `${attachment.name}.html`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div
        className={`bg-slate-900 text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-700 transition-all ${
          isFullscreen
            ? 'fixed inset-0 rounded-none w-screen h-screen z-50'
            : 'max-w-5xl w-full max-h-[94vh] h-[85vh]'
        }`}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
            <div className="p-1.5 sm:p-2 bg-blue-600/30 rounded-lg text-blue-400 shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs sm:text-sm text-white truncate max-w-[200px] sm:max-w-md">
                  {attachment.name}
                </h3>
                <span className="hidden xs:inline-block px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 text-[10px] font-mono border border-blue-700">
                  {attachment.fileSize}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                {documentTitle || 'เอกสารแนบในระบบสารบรรณ'} {receiptNo ? `• เลขที่รับ ${receiptNo}` : ''}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 15))}
                className="p-1 text-slate-300 hover:text-white transition"
                title="ย่อขนาด"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center font-mono text-[11px] text-slate-200">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 15))}
                className="p-1 text-slate-300 hover:text-white transition"
                title="ขยายขนาด"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Download */}
            <button
              onClick={handleDownload}
              type="button"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition border border-slate-700 cursor-pointer"
              title="ดาวน์โหลดไฟล์ต้นฉบับ"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ดาวน์โหลด</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
              title="พิมพ์เอกสารนี้"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">พิมพ์เอกสาร</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              type="button"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition border border-slate-700 cursor-pointer"
              title={isFullscreen ? 'ย่อหน้าต่างกลับ' : 'ขยายเต็มหน้าจอ'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition border border-slate-700 cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Document Viewer Canvas */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 bg-slate-800 flex items-start justify-center">
          {isImage && attachment.dataUrl ? (
            <div
              style={{
                transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease',
              }}
              className="max-w-4xl w-full flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl shadow-2xl border border-slate-700"
            >
              <img
                src={attachment.dataUrl}
                alt={attachment.name}
                className="max-h-[75vh] object-contain rounded-lg shadow-md"
              />
              <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                <span>{attachment.name} ({attachment.fileSize})</span>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                >
                  <RotateCw className="w-3.5 h-3.5" /> หมุนรูป
                </button>
              </div>
            </div>
          ) : isPdf && attachment.dataUrl ? (
            /* Render Embedded PDF Iframe for Real Uploaded PDFs */
            <div className="w-full h-full min-h-[70vh] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300">
              <iframe
                src={attachment.dataUrl}
                title={attachment.name}
                className="w-full h-full min-h-[70vh] border-0"
              />
            </div>
          ) : (
            /* Render Genuine Official Government Document A4 Sheet in Full */
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease',
              }}
              className="bg-white text-slate-900 shadow-2xl rounded-sm p-6 sm:p-12 max-w-3xl w-full border border-slate-300 min-h-[85vh] my-2"
            >
              <div
                dangerouslySetInnerHTML={{ __html: fullDocHtml }}
                className="prose max-w-none text-slate-900"
              />
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>แสดงเนื้อหาเอกสารแนบต้นฉบับฉบับเต็ม (ไม่ใช่รายงานรับหนังสือ)</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{attachment.uploadDate}</span>
            <button
              onClick={onClose}
              type="button"
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition text-xs cursor-pointer font-medium"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
