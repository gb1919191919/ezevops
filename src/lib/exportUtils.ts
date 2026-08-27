import { useAppStore } from './store/appStore';
import { toast } from 'sonner';

interface HeaderDefinition {
  key: string;
  label: string;
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
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export data array to CSV file download
 */
export function exportToCSV(
  filename: string,
  rows: Record<string, any>[],
  headers?: HeaderDefinition[]
) {
  if (!rows || rows.length === 0) {
    toast.error('No data available to export.');
    return;
  }

  // Union of all keys across rows if headers not provided
  const allKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const columnHeaders = headers || allKeys.map((k) => ({ key: k, label: k }));
  const headerLine = columnHeaders.map((h) => escapeCSVValue(h.label)).join(',');
  const dataLines = rows.map((row) =>
    columnHeaders.map((h) => escapeCSVValue(row[h.key])).join(',')
  );

  const csvContent = [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\.csv$/, '')}_${new Date().toISOString().slice(0, 10)}.csv`);
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
  filename: string,
  rows: Record<string, any>[],
  headers?: HeaderDefinition[]
) {
  exportToCSV(filename, rows, headers);
}

/**
 * Generate a clean, styled, printable PDF / Print Document with EzEv branding
 */
export function exportToPDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  filename?: string
) {
  if (!rows || rows.length === 0) {
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

  const headerHtml = headers.map((h) => `<th>${escapeHTML(h)}</th>`).join('');
  const rowsHtml = rows
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
          .meta-box strong {
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 11px;
          }
          th {
            background-color: #f1f5f9;
            color: #334155;
            text-align: left;
            padding: 8px 10px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1.5px solid #cbd5e1;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
            vertical-align: top;
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
            font-size: 9px;
            color: #94a3b8;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div>
            <h1 class="brand-title">EzEv <span>Operations Mumbai</span></h1>
            <div class="doc-subtitle">${safeTitle} &bull; ${safeSubtitle}</div>
          </div>
          <div class="meta-box">
            <div>Generated: <strong>${timestamp}</strong></div>
            <div>Total Records: <strong>${rows.length}</strong></div>
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
          <div>EzEv Fleet Management System &bull; Confidential & Internal Operations</div>
          <div>Page 1 of 1</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  toast.success('Generated printable PDF report!');
}

/**
 * Generate full database backup JSON containing all modules
 */
export function exportFullDatabaseBackup() {
  try {
    const state = useAppStore.getState();
    const backupData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      system: 'EzEv Ops Mumbai Fleet Command',
      tables: {
        hubs: state.hubs,
        vehicles: state.vehicles,
        inspections: state.inspections || [],
        parts: state.parts,
        hub_part_stock: state.hubStock,
        job_cards: state.jobCards,
        part_usage_logs: state.partUsageLogs,
        refunds: state.refunds,
        objectives: state.objectives,
        milestones: state.milestones || [],
        tasks: state.tasks,
        sops: state.sops,
        team_notes: state.teamNotes,
        daily_shift_logs: state.dailyShiftLogs || [],
        chat_channels: state.chatChannels || [],
        channel_messages: state.channelMessages || [],
        blocked_users: state.blockedUsers,
        staff_profiles: state.staffProfiles,
        custom_roles: state.customRoles,
        audit_logs: state.auditLogs,
      },
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ezev_ops_full_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Full Database Backup JSON generated successfully!');
  } catch (err: any) {
    toast.error('Failed to generate database backup', { description: err.message });
  }
}
