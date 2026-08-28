import { toast } from 'sonner';

export interface HeaderDefinition {
  key: string;
  label: string;
}

export interface ColumnDefinition {
  header: string;
  dataKey: string;
}

/**
 * HTML Entity escaping to protect PDF print previews against HTML/script injection
 */
function escapeHTML(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Clean and escape values for CSV / TSV formatting
 */
function escapeCSVValue(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (typeof val === 'object') {
    str = JSON.stringify(val);
  }
  // Neutralize CSV Formula Injection (CWE-1236)
  if (/^[=+@\-\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export data array to CSV file download.
 * Polymorphic: accepts either (filename, rows, headers) OR (rows, filename, headers).
 */
export function exportToCSV(
  arg1: string | Record<string, any>[],
  arg2?: string | Record<string, any>[],
  headers?: HeaderDefinition[]
) {
  let filename = 'export';
  let rows: Record<string, any>[] = [];

  if (typeof arg1 === 'string') {
    filename = arg1;
    rows = Array.isArray(arg2) ? arg2 : [];
  } else if (Array.isArray(arg1)) {
    rows = arg1;
    filename = typeof arg2 === 'string' ? arg2 : 'export';
  }

  if (!rows || rows.length === 0) {
    toast.error('No data available to export.');
    return;
  }

  // Union of all keys across rows if headers not provided
  const allKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
  const columnHeaders = headers || allKeys.map((k) => ({ key: k, label: k }));
  const headerLine = columnHeaders.map((h) => escapeCSVValue(h.label)).join(',');
  const dataLines = rows.map((row) =>
    columnHeaders.map((h) => escapeCSVValue(row ? row[h.key] : '')).join(',')
  );

  const csvContent = [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${(filename || 'export').replace(/\.csv$/, '')}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success(`Exported ${rows.length} rows to CSV!`);
}

/**
 * Export data array to Excel-compatible CSV file download
 */
export function exportToExcel(
  arg1: string | Record<string, any>[],
  arg2?: string | Record<string, any>[],
  headers?: HeaderDefinition[]
) {
  exportToCSV(arg1 as any, arg2 as any, headers);
}

/**
 * Generate a clean, styled, printable PDF / Print Document with EzEv branding
 * Polymorphic: Supports standard signature, column object array signature, and subtitle variants.
 */
export function exportToPDF(
  title: string,
  arg2: string | string[] | ColumnDefinition[],
  arg3?: string[] | (string | number)[][] | Record<string, any>[],
  arg4?: (string | number)[][] | Record<string, any>[] | string,
  arg5?: string
) {
  let subtitle = 'Operations Report & Audit Ledger';
  let headerLabels: string[] = [];
  let rowCells: (string | number)[][] = [];

  // Case 1: Standard (title, subtitle, headers, rows, filename)
  if (typeof arg2 === 'string' && Array.isArray(arg3) && Array.isArray(arg4)) {
    subtitle = arg2;
    headerLabels = (arg3 as string[]).map((h) => (typeof h === 'string' ? h : String((h as any)?.label || (h as any)?.header || '')));
    const rawRows = arg4 as any[];

    if (rawRows.length > 0 && Array.isArray(rawRows[0])) {
      rowCells = rawRows;
    } else {
      rowCells = rawRows.map((r) => headerLabels.map((h) => (r ? r[h] ?? (typeof h === 'string' ? r[h.toLowerCase()] : '') ?? '' : '')));
    }
  }
  // Case 2: (title, columns, rows, filename)
  else if (Array.isArray(arg2) && Array.isArray(arg3)) {
    const rawCols = arg2 as any[];
    const rawRows = arg3 as any[];

    // Extract headers and map keys
    if (rawCols.length > 0 && typeof rawCols[0] === 'object' && ('header' in rawCols[0] || 'label' in rawCols[0])) {
      headerLabels = rawCols.map((c) => c?.header || c?.label || c?.key || '');
      const keys = rawCols.map((c) => c?.dataKey || c?.key || c?.header || '');

      if (rawRows.length > 0 && Array.isArray(rawRows[0])) {
        rowCells = rawRows;
      } else {
        rowCells = rawRows.map((r) => keys.map((k) => (r ? r[k] ?? '' : '')));
      }
    } else {
      headerLabels = rawCols.map((c) => String(c));
      if (rawRows.length > 0 && Array.isArray(rawRows[0])) {
        rowCells = rawRows;
      } else {
        rowCells = rawRows.map((r) => headerLabels.map((h) => (r ? r[h] ?? (typeof h === 'string' ? r[h.toLowerCase()] : '') ?? '' : '')));
      }
    }
  }

  if (!rowCells || rowCells.length === 0) {
    toast.error('No data available to export to PDF.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Pop-up blocked. Please allow pop-ups to generate PDF.');
    return;
  }

  const timestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const safeTitle = escapeHTML(title);
  const safeSubtitle = escapeHTML(subtitle);

  const headerHtml = headerLabels.map((h) => `<th>${escapeHTML(h)}</th>`).join('');
  const rowsHtml = rowCells
    .map(
      (r, idx) =>
        `<tr class="${idx % 2 === 1 ? 'even' : ''}">${r
          .map((cell) => `<td>${escapeHTML(cell)}</td>`)
          .join('')}</tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${safeTitle} - ${timestamp}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #09090b;
            background: #ffffff;
            margin: 0;
            padding: 20px;
            font-size: 11px;
          }
          .header-banner {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }
          .brand-title span {
            color: #2563eb;
          }
          .doc-subtitle {
            font-size: 12px;
            color: #475569;
            margin-top: 3px;
          }
          .meta-box {
            text-align: right;
            font-size: 10px;
            color: #64748b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th {
            background-color: #f1f5f9;
            color: #1e293b;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9.5px;
            letter-spacing: 0.05em;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            text-align: left;
          }
          td {
            padding: 7px 10px;
            border: 1px solid #e2e8f0;
            color: #334155;
            font-size: 10.5px;
          }
          tr.even {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: #94a3b8;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div>
            <h1 class="brand-title">Ez<span>Ev</span> Operations & Logistics</h1>
            <div class="doc-subtitle">${safeTitle} • ${safeSubtitle}</div>
          </div>
          <div class="meta-box">
            <div><strong>Generated:</strong> ${timestamp}</div>
            <div><strong>Scope:</strong> Mumbai Regional Fleet Network</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>${headerHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>EzEv Mumbai • Confidential Internal Operations System</div>
          <div>Total Records: ${rowCells.length}</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Export full state backup JSON with integrity metadata (Backup 4.1, 4.6)
 */
export function exportFullDatabaseBackup() {
  const { useAppStore } = require('./store/appStore');
  const state = useAppStore.getState();

  const counts = {
    hubs: state.hubs?.length || 0,
    vehicles: state.vehicles?.length || 0,
    parts: state.parts?.length || 0,
    hubStock: state.hubStock?.length || 0,
    jobCards: state.jobCards?.length || 0,
    refunds: state.refunds?.length || 0,
    objectives: state.objectives?.length || 0,
    milestones: state.milestones?.length || 0,
    tasks: state.tasks?.length || 0,
    dailyShiftLogs: state.dailyShiftLogs?.length || 0,
    sops: state.sops?.length || 0,
    teamNotes: state.teamNotes?.length || 0,
  };

  const backupData = {
    metadata: {
      exported_at: new Date().toISOString(),
      version: '1.2.0',
      system: 'EzEv Mumbai Fleet Operations Platform',
      record_counts: counts,
      exported_by: state.currentUser?.email || 'Operations Staff',
    },
    hubs: state.hubs || [],
    vehicles: state.vehicles || [],
    parts: state.parts || [],
    hubStock: state.hubStock || [],
    jobCards: state.jobCards || [],
    refunds: state.refunds || [],
    objectives: state.objectives || [],
    milestones: state.milestones || [],
    tasks: state.tasks || [],
    dailyShiftLogs: state.dailyShiftLogs || [],
    chatChannels: state.chatChannels || [],
    channelMessages: state.channelMessages || [],
    sops: state.sops || [],
    teamNotes: state.teamNotes || [],
    blockedUsers: state.blockedUsers || [],
    staffProfiles: state.staffProfiles || [],
  };

  const jsonContent = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ezev_full_database_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success('Full database snapshot backup downloaded with integrity manifest!');
}
