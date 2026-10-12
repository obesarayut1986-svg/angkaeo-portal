/**
 * Safe printing utility for AI Studio and web browsers.
 * Avoids browser freezes by safely opening a print window or fallback.
 */
export function printHtmlContent(htmlBody: string, title: string = 'พิมพ์เอกสาร - อบต.อ่างแก้ว'): void {
  try {
    // Open clean print window
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${title}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
            <style>
              @page {
                size: A4 portrait;
                margin: 15mm;
              }
              body {
                font-family: 'Sarabun', 'TH Sarabun New', sans-serif, system-ui;
                color: #111827;
                background: #ffffff;
                margin: 0;
                padding: 15px;
                font-size: 13pt;
                line-height: 1.5;
              }
              .print-container {
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
              }
              .header-center {
                text-align: center;
                margin-bottom: 20px;
              }
              .garuda {
                width: 65px;
                height: auto;
                margin: 0 auto 10px auto;
                display: block;
              }
              .org-title {
                font-size: 16pt;
                font-weight: bold;
                margin: 0;
              }
              .org-sub {
                font-size: 13pt;
                color: #374151;
                margin-top: 4px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 16px 0;
                font-size: 12pt;
              }
              table, th, td {
                border: 1px solid #333333;
              }
              th {
                background-color: #f3f4f6;
                padding: 7px 5px;
                font-weight: bold;
                text-align: center;
              }
              td {
                padding: 7px 5px;
                vertical-align: top;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .signatures-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-top: 35px;
                page-break-inside: avoid;
              }
              .sig-box {
                text-align: center;
                font-size: 12pt;
                padding: 10px;
              }
              .sig-line {
                margin-top: 40px;
                border-bottom: 1px dotted #4b5563;
                width: 70%;
                margin-left: auto;
                margin-right: auto;
              }
              .badge {
                display: inline-block;
                padding: 3px 8px;
                border: 1px solid #9ca3af;
                border-radius: 4px;
                font-size: 11pt;
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              ${htmlBody}
            </div>
            <script>
              window.onload = function() {
                window.focus();
                setTimeout(function() {
                  window.print();
                }, 300);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  } catch (err) {
    console.warn('Print helper fallback:', err);
    window.print();
  }
}
