import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { AttendanceReportViewModel, ReportColumn } from './reportEngine';
import { saveExcelFile, saveBlobFile } from './helpers';

/**
 * Sanitizes string for safe cross-platform filesystem filenames (Windows, Linux, macOS)
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Generates canonical base filename from report metadata
 */
export function getReportBaseFilename(report: AttendanceReportViewModel): string {
  const scopeTag = report.metadata.kelasLabel !== 'Seluruh Kelas'
    ? report.metadata.kelasLabel
    : 'Semua_Kelas';
  const typeTag = report.type.toLowerCase();
  const dateTag = (report.scope.date || report.scope.month || report.scope.startDate || 'rekap')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  
  return sanitizeFilename(`Laporan_${typeTag}_${scopeTag}_${dateTag}`);
}

/**
 * 1. EXCEL EXPORTER
 * Produces structured, styled, formatted Excel workbooks (.xlsx)
 */
export function exportReportToExcel(report: AttendanceReportViewModel): void {
  try {
    const wb = XLSX.utils.book_new();

    // Prepare table data from columns and rows
    const tableHeaders = report.columns.map((c) => c.label);
    const tableData: any[][] = [];

    // Header metadata block in spreadsheet
    const metaBlock: any[][] = [
      [report.metadata.schoolName.toUpperCase()],
      [report.metadata.reportTitle],
      [report.metadata.subtitle],
      [`Dicetak pada: ${report.metadata.generatedAt} | Oleh: ${report.metadata.generatedBy}`],
      [], // Empty row
    ];

    // Build data rows
    report.rows.forEach((row) => {
      const rowArr: any[] = [];
      report.columns.forEach((col) => {
        const val = row[col.id];
        rowArr.push(val !== undefined && val !== null ? val : '-');
      });
      tableData.push(rowArr);
    });

    // Summary block at bottom
    const summaryBlock: any[][] = [
      [], // Empty row
      ['RINGKASAN STATISTIK LAPORAN'],
      ['Total Siswa', report.summary.totalStudents],
      ['Hari Efektif Belajar', report.summary.expectedDays],
      ['Hari Tercatat', report.summary.recordedDays],
      ['Rata-rata Hari Tercatat', report.summary.averageRecordedDays !== undefined ? report.summary.averageRecordedDays : '-'],
      ['Total Presensi Tercatat', report.summary.totalExpectedEvents - report.summary.unfilledDays],
      ['Hadir', report.summary.totalHadir],
      ['Kesiangan', report.summary.totalKesiangan],
      ['Dispensasi', report.summary.totalDispensasi],
      ['Sakit', report.summary.totalSakit],
      ['Izin', report.summary.totalIzin],
      ['Alpha', report.summary.totalAlpa],
      ['Total Terhitung Hadir', report.summary.totalAttendedEvents],
      ['Belum Tercatat', report.summary.unfilledDays],
      ['Tingkat Kehadiran', report.summary.attendanceRateFormatted],
    ];

    const fullSheetData = [...metaBlock, tableHeaders, ...tableData, ...summaryBlock];
    const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

    // Auto calculate column widths
    const colWidths = report.columns.map((col) => {
      let maxLen = col.label.length;
      report.rows.forEach((r) => {
        const strVal = String(r[col.id] || '');
        if (strVal.length > maxLen) maxLen = strVal.length;
      });
      return { wch: Math.min(Math.max(maxLen + 3, col.width || 10), 45) };
    });
    ws['!cols'] = colWidths;

    const sheetName = sanitizeFilename(report.metadata.reportTitle.slice(0, 25)) || 'Rekap';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const filename = `${getReportBaseFilename(report)}.xlsx`;
    saveExcelFile(wb, filename);
  } catch (error) {
    console.error('Failed to export report to Excel:', error);
    throw new Error('Export Excel gagal diproses.');
  }
}

/**
 * 2. CSV EXPORTER
 * Produces clean UTF-8 encoded, properly escaped RFC 4180 CSV files
 */
export function exportReportToCSV(report: AttendanceReportViewModel): void {
  try {
    const escapeCsvCell = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = [];

    // Metadata lines
    lines.push(escapeCsvCell(report.metadata.schoolName));
    lines.push(escapeCsvCell(report.metadata.reportTitle));
    lines.push(escapeCsvCell(report.metadata.subtitle));
    lines.push(escapeCsvCell(`Generated: ${report.metadata.generatedAt} by ${report.metadata.generatedBy}`));
    lines.push(''); // blank line

    // Header line
    const headerLine = report.columns.map((c) => escapeCsvCell(c.label)).join(',');
    lines.push(headerLine);

    // Data lines
    report.rows.forEach((row) => {
      const line = report.columns
        .map((col) => {
          const val = row[col.id];
          return escapeCsvCell(val !== undefined && val !== null ? val : '-');
        })
        .join(',');
      lines.push(line);
    });

    // Summary lines
    lines.push('');
    lines.push('--- RINGKASAN STATISTIK ---');
    lines.push(`Total Siswa,${report.summary.totalStudents}`);
    lines.push(`Hari Efektif,${report.summary.expectedDays}`);
    lines.push(`Hari Tercatat,${report.summary.recordedDays}`);
    lines.push(`Rata-rata Hari Tercatat,${report.summary.averageRecordedDays !== undefined ? report.summary.averageRecordedDays : '-'}`);
    lines.push(`Total Presensi Tercatat,${report.summary.totalExpectedEvents - report.summary.unfilledDays}`);
    lines.push(`Hadir,${report.summary.totalHadir}`);
    lines.push(`Kesiangan,${report.summary.totalKesiangan}`);
    lines.push(`Dispensasi,${report.summary.totalDispensasi}`);
    lines.push(`Sakit,${report.summary.totalSakit}`);
    lines.push(`Izin,${report.summary.totalIzin}`);
    lines.push(`Alpha,${report.summary.totalAlpa}`);
    lines.push(`Total Terhitung Hadir,${report.summary.totalAttendedEvents}`);
    lines.push(`Belum Tercatat,${report.summary.unfilledDays}`);
    lines.push(`Tingkat Kehadiran,${report.summary.attendanceRateFormatted}`);

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const filename = `${getReportBaseFilename(report)}.csv`;
    saveBlobFile(csvContent, filename, 'text/csv;charset=utf-8;');
  } catch (error) {
    console.error('Failed to export report to CSV:', error);
    throw new Error('Export CSV gagal diproses.');
  }
}

/**
 * 3. PDF EXPORTER
 * Produces high-fidelity, paginated, styled PDF reports with official school headers
 */
export function exportReportToPDF(report: AttendanceReportViewModel): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const isWide = report.columns.length > 6 || report.type === 'WEEKLY' || report.type === 'MONTHLY';
      const doc = new jsPDF({
        orientation: isWide ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;

      let currentY = margin;

      const drawHeader = (isFirstPage: boolean) => {
        if (isFirstPage) {
          // School Header
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.setTextColor(30, 41, 59);
          doc.text(report.metadata.schoolName.toUpperCase(), margin, currentY);
          currentY += 5;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(report.metadata.alamat || 'Sistem Informasi Presensi Digital Sekolah', margin, currentY);
          currentY += 4;

          // Divider rule
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.5);
          doc.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 6;

          // Report Title
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(15, 23, 42);
          doc.text(report.metadata.reportTitle, margin, currentY);
          currentY += 5;

          // Metadata badges
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text(report.metadata.subtitle, margin, currentY);
          currentY += 4;

          const metaString = `Dicetak: ${report.metadata.generatedAt} | Operator: ${report.metadata.generatedBy}`;
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(metaString, margin, currentY);
          currentY += 6;

          // Summary Mini KPI Bar
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(margin, currentY, contentWidth, 10, 1.5, 1.5, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);

          const kpis = [
            `Total: ${report.summary.totalStudents} Siswa`,
            `Hadir: ${report.summary.totalHadir}`,
            `Sakit: ${report.summary.totalSakit}`,
            `Izin: ${report.summary.totalIzin}`,
            `Alpa: ${report.summary.totalAlpa}`,
            `Kesiangan: ${report.summary.totalKesiangan}`,
            `Kehadiran: ${report.summary.attendanceRateFormatted}`,
          ];

          const kpiStep = contentWidth / kpis.length;
          kpis.forEach((kpi, kIdx) => {
            doc.text(kpi, margin + kIdx * kpiStep + 2, currentY + 6.5);
          });

          currentY += 13;
        } else {
          // Minimal header on subsequent pages
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`${report.metadata.reportTitle} - ${report.metadata.kelasLabel} (Lanjutan)`, margin, currentY);
          currentY += 5;
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 4;
        }
      };

      drawHeader(true);

      // Compute Column Proportions
      const rawColWeights = report.columns.map((c) => c.width || 12);
      const totalWeight = rawColWeights.reduce((a, b) => a + b, 0);
      const colWidths = rawColWeights.map((w) => (w / totalWeight) * contentWidth);

      // Table Header Drawer
      const drawTableHeader = () => {
        doc.setFillColor(30, 41, 59); // Slate-800
        doc.rect(margin, currentY, contentWidth, 7, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);

        let curX = margin;
        report.columns.forEach((col, idx) => {
          const w = colWidths[idx];
          const text = col.label;
          if (col.align === 'center') {
            doc.text(text, curX + w / 2, currentY + 4.8, { align: 'center' });
          } else if (col.align === 'right') {
            doc.text(text, curX + w - 2, currentY + 4.8, { align: 'right' });
          } else {
            doc.text(text, curX + 2, currentY + 4.8);
          }
          curX += w;
        });

        currentY += 7;
      };

      drawTableHeader();

      // Render Rows
      const rowHeight = 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      report.rows.forEach((row, rIdx) => {
        // Page break check
        if (currentY + rowHeight > pageHeight - 18) {
          doc.addPage();
          currentY = margin;
          drawHeader(false);
          drawTableHeader();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
        }

        // Alternating row background
        if (rIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
        }

        // Row border
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(margin, currentY + rowHeight, margin + contentWidth, currentY + rowHeight);

        let curX = margin;
        report.columns.forEach((col, cIdx) => {
          const w = colWidths[cIdx];
          let val = String(row[col.id] !== undefined && row[col.id] !== null ? row[col.id] : '-');

          // Truncate if too long for column width
          const maxChars = Math.floor(w / 1.8);
          if (val.length > maxChars && maxChars > 3) {
            val = val.substring(0, maxChars - 2) + '..';
          }

          if (col.id === 'status' || col.id.startsWith('day_')) {
            if (val === 'H' || val === 'Hadir') doc.setTextColor(16, 185, 129); // emerald
            else if (val === 'S' || val === 'Sakit') doc.setTextColor(79, 70, 229); // indigo
            else if (val === 'I' || val === 'Izin') doc.setTextColor(217, 119, 6); // amber
            else if (val === 'A' || val === 'Alpa' || val === 'Alpha') doc.setTextColor(225, 29, 72); // rose
            else if (val === 'K' || val === 'Kesiangan') doc.setTextColor(234, 88, 12); // orange
            else if (val === 'D' || val === 'Dispensasi') doc.setTextColor(147, 51, 234); // purple
            else doc.setTextColor(71, 85, 105);
          } else {
            doc.setTextColor(30, 41, 59);
          }

          if (col.align === 'center') {
            doc.text(val, curX + w / 2, currentY + 4.2, { align: 'center' });
          } else if (col.align === 'right') {
            doc.text(val, curX + w - 2, currentY + 4.2, { align: 'right' });
          } else {
            doc.text(val, curX + 2, currentY + 4.2);
          }

          curX += w;
        });

        currentY += rowHeight;
      });

      // Page numbers on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Halaman ${i} dari ${totalPages} - ${report.metadata.schoolName}`,
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        );
      }

      const filename = `${getReportBaseFilename(report)}.pdf`;
      doc.save(filename);
      resolve();
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      reject(new Error('Export PDF gagal diproses.'));
    }
  });
}
