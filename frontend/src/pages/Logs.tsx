import { useReadings } from "@/hooks/use-readings";
import { format } from "date-fns";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Filter, FileDown, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

export default function Logs() {
  const [filterPeriod, setFilterPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;
  const { toast } = useToast();

  const { data: readings, isLoading } = useReadings(filterPeriod, 200); // Increase limit to get more data

  const filteredData = readings?.filter(r => 
    r.sensorId?.toLowerCase().includes(search.toLowerCase()) ||
    format(new Date(r.timestamp), "yyyy-MM-dd HH:mm").includes(search)
  ) || [];

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getTempStatus = (temp: number) => {
    if (temp > 35) return <Badge variant="destructive">Critical</Badge>;
    if (temp > 30) return <Badge className="bg-orange-500 hover:bg-orange-600">Warning</Badge>;
    return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Normal</Badge>;
  };

  const handleExport = (type: 'csv' | 'excel' | 'pdf') => {
    if (!filteredData || filteredData.length === 0) {
      toast({
        title: "No data to export",
        description: "There is no reading data available for the selected period.",
        variant: "destructive"
      });
      return;
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `sensor_logs_${filterPeriod}_${timestamp}`;

    if (type === 'csv') {
      exportToCSV(filteredData, filename);
    } else if (type === 'excel') {
      exportToExcel(filteredData, filename);
    } else if (type === 'pdf') {
      exportToPDF(filteredData, filename);
    }

    toast({
      title: "Export Started",
      description: `Generating ${type.toUpperCase()} report from ${filteredData.length} records...`,
    });
  };

  const exportToCSV = (data: any[], filename: string) => {
    const headers = "Timestamp,Sensor ID,Temperature (°C),Humidity (%),Status\n";
    const rows = data.map(r => {
      const status = r.temperature > 35 ? 'Critical' : r.temperature > 30 ? 'Warning' : 'Normal';
      return `"${format(new Date(r.timestamp), "yyyy-MM-dd HH:mm:ss")}","${r.sensorId}",${r.temperature.toFixed(1)},${r.humidity.toFixed(1)},"${status}"`;
    }).join("\n");
    
    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `${filename}.csv`);
  };

  const exportToExcel = (data: any[], filename: string) => {
    // Create HTML table for Excel
    const headers = `<tr><th>Timestamp</th><th>Sensor ID</th><th>Temperature (°C)</th><th>Humidity (%)</th><th>Status</th></tr>`;
    const rows = data.map(r => {
      const status = r.temperature > 35 ? 'Critical' : r.temperature > 30 ? 'Warning' : 'Normal';
      return `<tr><td>${format(new Date(r.timestamp), "yyyy-MM-dd HH:mm:ss")}</td><td>${r.sensorId}</td><td>${r.temperature.toFixed(1)}</td><td>${r.humidity.toFixed(1)}</td><td>${status}</td></tr>`;
    }).join("");
    
    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .critical { background-color: #fee; }
            .warning { background-color: #fef3cd; }
            .normal { background-color: #d4edda; }
          </style>
        </head>
        <body>
          <h2>Sensor Data Logs - ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</h2>
          <p>Period: ${filterPeriod} | Total Records: ${data.length}</p>
          <table>${headers}${rows}</table>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    downloadFile(blob, `${filename}.xls`);
  };

  const exportToPDF = (data: any[], filename: string) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Smart Monitoring System', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('Sensor Data Report', 105, 30, { align: 'center' });
    
    // Report info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const reportDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const dateRange = data.length > 0 ? 
      `${format(new Date(data[data.length - 1].timestamp), 'yyyy-MM-dd')} to ${format(new Date(data[0].timestamp), 'yyyy-MM-dd')}` : 
      'N/A';
    
    doc.text(`Report Generated: ${reportDate}`, 20, 45);
    doc.text(`Period: ${filterPeriod.charAt(0).toUpperCase() + filterPeriod.slice(1)}`, 20, 52);
    doc.text(`Total Records: ${data.length}`, 20, 59);
    doc.text(`Date Range: ${dateRange}`, 20, 66);
    
    // Table headers
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    let yPos = 80;
    
    // Draw table headers
    doc.text('Timestamp', 20, yPos);
    doc.text('Sensor ID', 70, yPos);
    doc.text('Temp(°C)', 110, yPos);
    doc.text('Humidity(%)', 140, yPos);
    doc.text('Status', 175, yPos);
    
    // Draw header line
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 8;
    
    // Table data
    doc.setFont('helvetica', 'normal');
    data.forEach((r, index) => {
      if (yPos > 270) { // New page if needed
        doc.addPage();
        yPos = 20;
      }
      
      const status = r.temperature > 35 ? 'Critical' : r.temperature > 30 ? 'Warning' : 'Normal';
      
      doc.text(format(new Date(r.timestamp), "MM-dd HH:mm"), 20, yPos);
      doc.text(String(r.sensorId || 'N/A'), 70, yPos);
      doc.text(String(r.temperature.toFixed(1)), 110, yPos);
      doc.text(String(r.humidity.toFixed(1)), 140, yPos);
      doc.text(String(status), 175, yPos);
      
      yPos += 6;
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount} | Generated by Smart Monitoring System`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    // Save the PDF
    doc.save(`${filename}.pdf`);
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Data Logs</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Historical sensor readings and events.</p>
      </div>

      <div className="bg-card rounded-xl border border-border/50 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center mb-6">
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search logs..." 
                className="pl-9 bg-background text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-2 text-sm">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground text-xs sm:text-sm">Period:</span>
              <Select value={filterPeriod} onValueChange={(v: any) => setFilterPeriod(v)}>
                <SelectTrigger className="h-7 w-[80px] sm:w-[100px] border-none shadow-none p-0 focus:ring-0 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleExport('csv')}
                className="hover:bg-blue-50 hover:border-blue-200 flex-1 sm:flex-none"
              >
                <FileSpreadsheet className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleExport('excel')}
                className="hover:bg-green-50 hover:border-green-200 flex-1 sm:flex-none"
              >
                <FileText className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleExport('pdf')}
                className="hover:bg-red-50 hover:border-red-200 flex-1 sm:flex-none"
              >
                <Printer className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[180px] sm:w-[200px] text-xs sm:text-sm">Timestamp</TableHead>
                <TableHead className="text-xs sm:text-sm">Sensor ID</TableHead>
                <TableHead className="text-xs sm:text-sm">Temperature (°C)</TableHead>
                <TableHead className="text-xs sm:text-sm">Humidity (%)</TableHead>
                <TableHead className="text-right text-xs sm:text-sm">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No data found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(row.timestamp), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-medium text-xs sm:text-sm">{row.sensorId}</TableCell>
                    <TableCell className="font-bold text-xs sm:text-sm">{row.temperature.toFixed(1)}°C</TableCell>
                    <TableCell className="text-xs sm:text-sm">{row.humidity.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      {getTempStatus(row.temperature)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {paginatedData.length > 0 ? (page - 1) * itemsPerPage + 1 : 0} to {Math.min(page * itemsPerPage, filteredData.length)} of {filteredData.length} entries
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
