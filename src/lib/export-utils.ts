import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type ExportData = Record<string, any>[];

export const exportToPDF = (title: string, data: ExportData, headers: string[]) => {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  // Prepare data for table
  const tableData = data.map((row) => headers.map((header) => row[header]));

  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 35,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [124, 58, 237], textColor: 255 }, // Purple-600
    alternateRowStyles: { fillColor: [249, 250, 251] }, // Gray-50
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
};

export const exportToExcel = (title: string, data: ExportData, _headers?: string[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  
  XLSX.writeFile(workbook, `${title.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
};
