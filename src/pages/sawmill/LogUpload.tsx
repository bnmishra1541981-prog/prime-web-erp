import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Upload, FileSpreadsheet, Download, Trash2, Check, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

interface ParsedLog {
  tag_no: string;
  girth_inch: number;
  length_meter: number;
  cft: number;
  purchase_rate: number;
  total_amount: number;
  supplier_name: string;
  lot_no: string;
  valid: boolean;
  error?: string;
}

// CFT = (Girth × Girth × Length_ft) / 2304
const calculateCFT = (girthInch: number, lengthMeter: number): number => {
  const lengthFeet = lengthMeter * 3.28084;
  return (girthInch * girthInch * lengthFeet) / 2304;
};

const LogUpload = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [sawMills, setSawMills] = useState<any[]>([]);
  const [selectedMill, setSelectedMill] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedLog[]>([]);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user]);

  useEffect(() => {
    if (selectedCompany) fetchSawMills();
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data && data.length > 0) {
      setCompanies(data);
      setSelectedCompany(data[0].id);
    }
    setLoading(false);
  };

  const fetchSawMills = async () => {
    const { data } = await supabase
      .from("saw_mills")
      .select("id, name")
      .eq("company_id", selectedCompany)
      .eq("is_active", true)
      .order("name");
    setSawMills(data || []);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Tag No", "Girth (Inches)", "Length (Meter)", "CFT (Optional)", "Purchase Rate/CFT", "Supplier Name", "Lot No"],
      ["LOG-001", 48, 3.5, "", 250, "Supplier A", "LOT-01"],
      ["LOG-002", 52, 4.0, "", 260, "Supplier A", "LOT-01"],
    ]);
    ws["!cols"] = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Log Purchase");
    XLSX.writeFile(wb, "log_purchase_template.xlsx");
    toast.success("Template downloaded");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const parsed: ParsedLog[] = rows.map((row) => {
        const tagNo = String(row["Tag No"] || row["tag_no"] || row["Tag"] || "").trim();
        const girthInch = parseFloat(row["Girth (Inches)"] || row["girth_inch"] || row["Girth"] || 0);
        const lengthMeter = parseFloat(row["Length (Meter)"] || row["length_meter"] || row["Length"] || 0);
        const providedCFT = parseFloat(row["CFT (Optional)"] || row["CFT"] || row["cft"] || 0);
        const rate = parseFloat(row["Purchase Rate/CFT"] || row["purchase_rate"] || row["Rate"] || 0);
        const supplier = String(row["Supplier Name"] || row["supplier_name"] || row["Supplier"] || "").trim();
        const lotNo = String(row["Lot No"] || row["lot_no"] || row["Lot"] || "").trim();

        const cft = providedCFT > 0 ? providedCFT : calculateCFT(girthInch, lengthMeter);
        const totalAmount = cft * rate;

        let valid = true;
        let error = "";
        if (!tagNo) { valid = false; error = "Tag No required"; }
        else if (!girthInch || girthInch <= 0) { valid = false; error = "Invalid Girth"; }
        else if (!lengthMeter || lengthMeter <= 0) { valid = false; error = "Invalid Length"; }

        return { tag_no: tagNo, girth_inch: girthInch, length_meter: lengthMeter, cft, purchase_rate: rate, total_amount: totalAmount, supplier_name: supplier, lot_no: lotNo, valid, error };
      });

      setParsedData(parsed);
      toast.success(`${parsed.length} rows parsed from ${file.name}`);
    };
    reader.readAsBinaryString(file);
  };

  const removeRow = (index: number) => {
    setParsedData((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadToDb = async () => {
    const validRows = parsedData.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error("No valid rows to upload");
      return;
    }

    setUploading(true);
    try {
      const payload = validRows.map((row) => ({
        company_id: selectedCompany,
        saw_mill_id: selectedMill || null,
        tag_number: row.tag_no,
        girth_cm: row.girth_inch * 2.54, // Convert inch to cm for storage
        girth_inch: row.girth_inch,
        length_meter: row.length_meter,
        cft: row.cft,
        purchase_rate: row.purchase_rate,
        total_amount: row.total_amount,
        supplier_name: row.supplier_name || null,
        lot_no: row.lot_no || null,
        grade: "A",
        status: "available",
        created_by: user!.id,
      }));

      const { error } = await supabase.from("sawmill_logs").insert(payload);
      if (error) {
        if (error.message.includes("unique") || error.message.includes("duplicate")) {
          toast.error("Some tag numbers already exist in the system");
        } else {
          throw error;
        }
      } else {
        toast.success(`${validRows.length} logs uploaded successfully!`);
        setParsedData([]);
        setFileName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setUploading(false);
  };

  const validCount = parsedData.filter((r) => r.valid).length;
  const invalidCount = parsedData.filter((r) => !r.valid).length;
  const totalCFT = parsedData.filter((r) => r.valid).reduce((sum, r) => sum + r.cft, 0);
  const totalAmount = parsedData.filter((r) => r.valid).reduce((sum, r) => sum + r.total_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Log Purchase Upload</h1>
          <p className="text-muted-foreground">Upload bulk log purchase data via Excel</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Upload
          </CardTitle>
          <CardDescription>
            Upload Excel file with log purchase data. CFT will be auto-calculated if not provided.
            <br />
            <span className="font-medium">Formula: CFT = (Girth² × Length in feet) / 2304</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Saw Mill (Optional)</Label>
              <Select value={selectedMill} onValueChange={setSelectedMill}>
                <SelectTrigger>
                  <SelectValue placeholder="All Mills" />
                </SelectTrigger>
                <SelectContent>
                  {sawMills.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Upload Excel File</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={downloadTemplate} className="w-full">
                <Download className="h-4 w-4 mr-1" /> Download Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parsed Data Preview */}
      {parsedData.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Rows</p>
                <p className="text-2xl font-bold">{parsedData.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Valid</p>
                <p className="text-2xl font-bold text-green-600">{validCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total CFT</p>
                <p className="text-2xl font-bold">{totalCFT.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">₹{totalAmount.toFixed(0)}</p>
              </CardContent>
            </Card>
          </div>

          {invalidCount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">{invalidCount} rows have errors and will be skipped</span>
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Preview Data - {fileName}</CardTitle>
              <Button onClick={handleUploadToDb} disabled={uploading || validCount === 0}>
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Upload {validCount} Logs
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Tag No</TableHead>
                      <TableHead>Girth (inch)</TableHead>
                      <TableHead>Length (m)</TableHead>
                      <TableHead>CFT</TableHead>
                      <TableHead>Rate/CFT</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Lot</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row, i) => (
                      <TableRow key={i} className={!row.valid ? "bg-destructive/5" : ""}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{row.tag_no}</TableCell>
                        <TableCell>{row.girth_inch}</TableCell>
                        <TableCell>{row.length_meter}</TableCell>
                        <TableCell>{row.cft.toFixed(3)}</TableCell>
                        <TableCell>₹{row.purchase_rate}</TableCell>
                        <TableCell>₹{row.total_amount.toFixed(0)}</TableCell>
                        <TableCell>{row.supplier_name || "-"}</TableCell>
                        <TableCell>{row.lot_no || "-"}</TableCell>
                        <TableCell>
                          {row.valid ? (
                            <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" /> Valid</Badge>
                          ) : (
                            <Badge variant="destructive">{row.error}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeRow(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default LogUpload;
