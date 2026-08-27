import { useAppStore } from './store/appStore';
import { toast } from 'sonner';

interface HeaderDefinition {
  key: string;
  label: string;
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

  const columnHeaders = headers || Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
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

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - ${timestamp}</title>
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
            text-align: left;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            padding: 7px 10px;
            border: 1px solid #e2e8f0;
            color: #334155;
            font-size: 10px;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 24px;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            color: #94a3b8;
            font-size: 9px;
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div>
            <h1 class="brand-title">EzEv <span>Ops</span></h1>
            <div class="doc-subtitle">${title} — ${subtitle}</div>
          </div>
          <div class="meta-box">
            <div><strong>Generated:</strong> ${timestamp}</div>
            <div><strong>System:</strong> Mumbai Fleet Command (Live)</div>
            <div><strong>Total Records:</strong> ${rows.length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) =>
                  `<tr>${r
                    .map((cell) => `<td>${cell === null || cell === undefined ? '-' : cell}</td>`)
                    .join('')}</tr>`
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>EzEv Electric Mobility Fleet Operations & Governance System</div>
          <div>Confidential & Proprietary Operations Document</div>
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
        parts: state.parts,
        hub_part_stock: state.hubStock,
        job_cards: state.jobCards,
        part_usage_logs: state.partUsageLogs,
        refunds: state.refunds,
        objectives: state.objectives,
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
