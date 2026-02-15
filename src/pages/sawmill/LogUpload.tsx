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
  sn: number;
  barcode: string;
  lot: string;
  grade: string;
  len: number;
  sed: number;
  cbm: number;
  girth_inch: number;
  girth_cm: number;
  cft: number;
  valid: boolean;
  error?: string;
}

// CBM to CFT conversion: 1 CBM = 35.3147 CFT
const cbmToCft = (cbm: number): number => cbm * 35.3147;

// CFT = (Girth_inch² × Length_ft) / 2304
const calculateCFT = (girthInch: number, lengthMeter: number): number => {
  const lengthFeet = lengthMeter * 3.28084;
  return (girthInch * girthInch * lengthFeet) / 2304;
};

// SED (cm) to Girth (inch): SED is diameter in cm, Girth = π × diameter, convert to inches
const sedToGirthInch = (sedCm: number): number => {
  return (Math.PI * sedCm) / 2.54;
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
      ["SN", "Barcode", "LOT", "Grade", "LEN", "SED", "CBM"],
      [1, "FOBE74924", "8", "KI", 3.0, 76, 1.733],
      [2, "FOBE74925", "8", "A", 4.8, 38, 0.433],
      [3, "FOBE74926", "8", "K", 3.6, 54, 0.875],
    ]);
    ws["!cols"] = [
      { wch: 8 }, { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Log Purchase");
    XLSX.writeFile(wb, "log_purchase_template.xlsx");
    toast.success("Template downloaded");
  };

  const cleanNumericValue = (val: any): number => {
    if (val === null || val === undefined || val === "") return 0;
    const str = String(val).replace(/[$,₹\s]/g, "");
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const findHeaderRowIndex = (sheet: XLSX.WorkSheet): number => {
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
    for (let r = range.s.r; r <= Math.min(range.e.r, 20); r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        if (cell) {
          const val = String(cell.v || "").toLowerCase().trim();
          if (val === "barcode" || val === "tag no" || val === "tag") {
            return r;
          }
        }
      }
    }
    return 0;
  };

  const normalize = (s: string) => s.toLowerCase().replace(/[_\s.]+/g, "").trim();

  const findVal = (row: any, aliases: string[]): any => {
    const normalizedAliases = aliases.map(normalize);
    for (const key of Object.keys(row)) {
      const nk = normalize(key);
      if (normalizedAliases.includes(nk)) return row[key];
    }
    for (const key of Object.keys(row)) {
      const nk = normalize(key);
      for (const alias of normalizedAliases) {
        if (nk.startsWith(alias) || nk.includes(alias)) return row[key];
      }
    }
    return "";
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

      // Find the actual header row dynamically
      const headerRowIndex = findHeaderRowIndex(sheet);
      const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
      range.s.r = headerRowIndex;
      sheet["!ref"] = XLSX.utils.encode_range(range);

      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const parsed: ParsedLog[] = [];
      let snCounter = 0;

      for (const row of rows) {
        const barcode = String(findVal(row, ["Barcode", "barcode", "Tag No", "tag_no", "Tag"])).trim();

        if (!barcode || normalize(barcode) === "barcode" || normalize(barcode) === "tagno" || normalize(barcode) === "sn") continue;
        if (/^[A-Za-z\s]+$/.test(barcode)) continue;

        snCounter++;
        const sn = cleanNumericValue(findVal(row, ["SN", "sn", "S.No", "Sr"])) || snCounter;
        const lot = String(findVal(row, ["LOT", "Lot", "lot_no", "Lot No"]) || "").trim();
        const grade = String(findVal(row, ["Grade", "grade"]) || "A").trim();
        const len = cleanNumericValue(findVal(row, ["LEN", "Len", "Length", "Length (Meter)", "length_meter", "Sale Len"]));
        const sed = cleanNumericValue(findVal(row, ["SED", "Sed"]));
        const cbmProvided = cleanNumericValue(findVal(row, ["CBM", "Cbm", "cbm"]));

        const girthInch = sedToGirthInch(sed);
        const girthCm = sed * Math.PI;

        let cft = 0;
        if (cbmProvided > 0) {
          cft = cbmToCft(cbmProvided);
        } else {
          cft = calculateCFT(girthInch, len);
        }

        let valid = true;
        let error = "";
        if (!barcode) { valid = false; error = "Barcode required"; }
        else if (!sed || sed <= 0) { valid = false; error = "Invalid SED"; }
        else if (!len || len <= 0) { valid = false; error = "Invalid Length"; }

        parsed.push({
          sn,
          barcode,
          lot,
          grade,
          len,
          sed,
          cbm: cbmProvided,
          girth_inch: girthInch,
          girth_cm: girthCm,
          cft,
          valid,
          error,
        });
      }

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
        tag_number: row.barcode,
        girth_cm: row.girth_cm,
        girth_inch: row.girth_inch,
        length_meter: row.len,
        cft: row.cft,
        purchase_rate: 0,
        total_amount: 0,
        supplier_name: null,
        lot_no: row.lot || null,
        grade: row.grade || "A",
        status: "available",
        created_by: user!.id,
      }));

      const { error } = await supabase.from("sawmill_logs").insert(payload);
      if (error) {
        if (error.message.includes("unique") || error.message.includes("duplicate")) {
          toast.error("Some barcodes already exist in the system");
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
  const totalCBM = parsedData.filter((r) => r.valid).reduce((sum, r) => sum + r.cbm, 0);
  const totalCFT = parsedData.filter((r) => r.valid).reduce((sum, r) => sum + r.cft, 0);

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
          <p className="text-muted-foreground">Upload bulk log purchase data via Excel (SN, Barcode, LOT, Grade, LEN, SED, CBM)</p>
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
            Upload Excel file with columns: <strong>SN, Barcode, LOT, Grade, LEN (meters), SED (cm diameter), CBM</strong>
            <br />
            <span className="font-medium">SED = Small End Diameter (cm). System converts to Girth & calculates CFT automatically.</span>
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
                <p className="text-sm text-muted-foreground">Total CBM</p>
                <p className="text-2xl font-bold">{totalCBM.toFixed(3)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total CFT</p>
                <p className="text-2xl font-bold">{totalCFT.toFixed(2)}</p>
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
                      <TableHead>SN</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead>LOT</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>LEN (m)</TableHead>
                      <TableHead>SED (cm)</TableHead>
                      <TableHead>CBM</TableHead>
                      <TableHead>CFT</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row, i) => (
                      <TableRow key={i} className={!row.valid ? "bg-destructive/5" : ""}>
                        <TableCell>{row.sn}</TableCell>
                        <TableCell className="font-medium">{row.barcode}</TableCell>
                        <TableCell>{row.lot || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.grade}</Badge>
                        </TableCell>
                        <TableCell>{row.len}</TableCell>
                        <TableCell>{row.sed}</TableCell>
                        <TableCell>{row.cbm > 0 ? row.cbm.toFixed(3) : "-"}</TableCell>
                        <TableCell>{row.cft.toFixed(3)}</TableCell>
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
