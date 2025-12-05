import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useGstinLookup, GstinData } from '@/hooks/useGstinLookup';
import { 
  Search, 
  FileText, 
  Building2, 
  CreditCard, 
  Scale, 
  Users, 
  Phone, 
  Mail, 
  MapPin,
  Loader2,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCheck
} from 'lucide-react';

interface ReportOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}

const reportOptions: ReportOption[] = [
  { id: 'company_details', name: 'Company Details', description: 'Basic company information', icon: <Building2 className="h-4 w-4" />, category: 'Company' },
  { id: 'gst_details', name: 'GST Details', description: 'GST registration & filing status', icon: <FileText className="h-4 w-4" />, category: 'Compliance' },
  { id: 'pan', name: 'PAN Verification', description: 'PAN card verification', icon: <CreditCard className="h-4 w-4" />, category: 'Identity' },
  { id: 'itr_info', name: 'ITR Information', description: 'Income tax return history', icon: <FileCheck className="h-4 w-4" />, category: 'Financial' },
  { id: 'charges', name: 'Charges', description: 'Registered charges on assets', icon: <AlertCircle className="h-4 w-4" />, category: 'Financial' },
  { id: 'litigation', name: 'Litigation', description: 'Court cases & legal matters', icon: <Scale className="h-4 w-4" />, category: 'Legal' },
  { id: 'commercial_cibil', name: 'Commercial CIBIL', description: 'Business credit score', icon: <CreditCard className="h-4 w-4" />, category: 'Credit' },
  { id: 'individual_cibil', name: 'Individual CIBIL', description: 'Director credit scores', icon: <CreditCard className="h-4 w-4" />, category: 'Credit' },
  { id: 'aadhaar', name: 'Aadhaar Verification', description: 'Aadhaar verification of directors', icon: <Users className="h-4 w-4" />, category: 'Identity' },
  { id: 'land_records', name: 'Land Records', description: 'Property ownership details', icon: <MapPin className="h-4 w-4" />, category: 'Assets' },
  { id: 'mobile_verification', name: 'Mobile Verification', description: 'Contact number verification', icon: <Phone className="h-4 w-4" />, category: 'Contact' },
  { id: 'director_pan', name: 'Director PAN', description: 'Directors PAN verification', icon: <CreditCard className="h-4 w-4" />, category: 'Identity' },
  { id: 'tan', name: 'TAN Verification', description: 'Tax deduction account number', icon: <FileText className="h-4 w-4" />, category: 'Compliance' },
  { id: 'contact_email', name: 'Contact Email', description: 'Email verification', icon: <Mail className="h-4 w-4" />, category: 'Contact' },
  { id: 'registered_address', name: 'Registered Address', description: 'Address verification', icon: <MapPin className="h-4 w-4" />, category: 'Contact' },
  { id: 'associated_companies', name: 'Associated Companies', description: 'Related business entities', icon: <Building2 className="h-4 w-4" />, category: 'Company' },
  { id: 'directors', name: 'All Company Directors', description: 'Director details & history', icon: <Users className="h-4 w-4" />, category: 'Company' },
];

const MSMECreditReport = () => {
  const [gstin, setGstin] = useState('');
  const [companyData, setCompanyData] = useState<GstinData | null>(null);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const { fetchGstinDetails, loading: gstinLoading } = useGstinLookup();

  const handleGstinSearch = async () => {
    if (!gstin || gstin.length !== 15) {
      toast.error('Please enter a valid 15-character GSTIN');
      return;
    }
    
    const data = await fetchGstinDetails(gstin);
    if (data) {
      setCompanyData(data);
      setSelectedReports([]);
      setReportGenerated(false);
      setGeneratedReport(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReports(reportOptions.map(r => r.id));
    } else {
      setSelectedReports([]);
    }
  };

  const handleReportToggle = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const generateReport = async () => {
    if (selectedReports.length === 0) {
      toast.error('Please select at least one report');
      return;
    }

    setIsGenerating(true);
    
    // Simulate API calls for each selected report
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate mock report data
    const mockReport = {
      generatedAt: new Date().toISOString(),
      company: companyData,
      reports: selectedReports.map(reportId => {
        const option = reportOptions.find(r => r.id === reportId);
        return {
          id: reportId,
          name: option?.name,
          status: 'success',
          data: getMockReportData(reportId, companyData)
        };
      })
    };

    setGeneratedReport(mockReport);
    setReportGenerated(true);
    setIsGenerating(false);
    toast.success('Master Credit Report generated successfully!');
  };

  const getMockReportData = (reportId: string, company: GstinData | null) => {
    const mockData: Record<string, any> = {
      company_details: {
        legalName: company?.legal_name || company?.name,
        tradeName: company?.trade_name,
        constitutionOfBusiness: company?.constitution_of_business,
        businessNature: company?.business_nature,
        registrationDate: company?.registration_date,
        status: company?.gstn_status || 'Active'
      },
      gst_details: {
        gstin: company?.gstin,
        status: company?.gstn_status || 'Active',
        stateJurisdiction: company?.state_jurisdiction,
        taxpayerType: company?.taxpayer_type,
        lastFilingDate: '2024-10-15',
        complianceRating: 'Good'
      },
      pan: {
        panNumber: company?.gstin?.substring(2, 12) || 'AAACX0000X',
        status: 'Valid',
        name: company?.legal_name || company?.name,
        category: 'Company'
      },
      itr_info: {
        lastFiledYear: 'AY 2024-25',
        filingStatus: 'Filed',
        totalIncome: '₹ 45,00,000',
        taxPaid: '₹ 12,50,000'
      },
      charges: {
        totalCharges: 2,
        activeCharges: 1,
        satisfiedCharges: 1,
        chargeDetails: [
          { holder: 'SBI Bank', amount: '₹ 50,00,000', status: 'Open', date: '2022-03-15' },
          { holder: 'HDFC Bank', amount: '₹ 25,00,000', status: 'Satisfied', date: '2020-06-20' }
        ]
      },
      litigation: {
        totalCases: 1,
        pendingCases: 0,
        resolvedCases: 1,
        caseDetails: [{ court: 'NCLT Mumbai', type: 'Civil', status: 'Resolved', year: '2021' }]
      },
      commercial_cibil: {
        score: 720,
        rating: 'Good',
        creditLimit: '₹ 2,00,00,000',
        utilizationRate: '45%'
      },
      individual_cibil: {
        directors: [
          { name: 'Director 1', score: 750, status: 'Excellent' },
          { name: 'Director 2', score: 680, status: 'Good' }
        ]
      },
      aadhaar: {
        verified: true,
        directorsVerified: 2,
        totalDirectors: 2
      },
      land_records: {
        propertiesOwned: 3,
        totalValue: '₹ 5,00,00,000',
        encumberedProperties: 1
      },
      mobile_verification: {
        primaryMobile: '+91 98XXXXXXXX',
        verified: true,
        linkedToDirector: 'Director 1'
      },
      director_pan: {
        directors: [
          { name: 'Director 1', pan: 'AAAPL0000A', status: 'Valid' },
          { name: 'Director 2', pan: 'BBBPM0000B', status: 'Valid' }
        ]
      },
      tan: {
        tanNumber: 'DELX00000X',
        status: 'Active',
        lastTdsFilingDate: '2024-09-30'
      },
      contact_email: {
        primaryEmail: 'contact@company.com',
        verified: true,
        domain: company?.name?.toLowerCase().replace(/\s/g, '') + '.com'
      },
      registered_address: {
        address: company?.address || `${company?.building_name}, ${company?.street}, ${company?.locality}`,
        city: company?.city,
        state: company?.state,
        pincode: company?.pincode,
        verified: true
      },
      associated_companies: {
        totalAssociated: 3,
        companies: [
          { name: 'Subsidiary Corp Pvt Ltd', relation: 'Subsidiary', status: 'Active' },
          { name: 'Partner Industries', relation: 'Associate', status: 'Active' },
          { name: 'Holding Company Ltd', relation: 'Holding', status: 'Active' }
        ]
      },
      directors: {
        totalDirectors: 2,
        activeDirectors: 2,
        directors: [
          { din: '00000001', name: 'Director 1', designation: 'Managing Director', appointmentDate: '2018-04-01' },
          { din: '00000002', name: 'Director 2', designation: 'Director', appointmentDate: '2019-06-15' }
        ]
      }
    };
    return mockData[reportId] || {};
  };

  const groupedReports = reportOptions.reduce((acc, report) => {
    if (!acc[report.category]) acc[report.category] = [];
    acc[report.category].push(report);
    return acc;
  }, {} as Record<string, ReportOption[]>);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">MSME's Master Credit Report</h1>
        <p className="text-muted-foreground">Generate comprehensive credit reports for MSMEs with a single click</p>
      </div>

      {/* GSTIN Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Company Lookup
          </CardTitle>
          <CardDescription>Enter the company's GSTIN to fetch details from GSTN</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="gstin" className="sr-only">GSTIN</Label>
              <Input
                id="gstin"
                placeholder="Enter 15-character GSTIN (e.g., 29AABCT1332L1ZB)"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                maxLength={15}
                className="uppercase"
              />
            </div>
            <Button onClick={handleGstinSearch} disabled={gstinLoading || gstin.length !== 15}>
              {gstinLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Fetch Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Company Details Card */}
      {companyData && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {companyData.legal_name || companyData.name}
            </CardTitle>
            {companyData.trade_name && (
              <CardDescription>Trade Name: {companyData.trade_name}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">GSTIN:</span>
                <span className="ml-2 font-medium">{companyData.gstin}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={companyData.gstn_status === 'Active' ? 'default' : 'secondary'} className="ml-2">
                  {companyData.gstn_status || 'Active'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">State:</span>
                <span className="ml-2 font-medium">{companyData.state}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Constitution:</span>
                <span className="ml-2 font-medium">{companyData.constitution_of_business}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Registration Date:</span>
                <span className="ml-2 font-medium">{companyData.registration_date}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Taxpayer Type:</span>
                <span className="ml-2 font-medium">{companyData.taxpayer_type}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Selection Section */}
      {companyData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-4">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Report Selection
              </span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="selectAll"
                  checked={selectedReports.length === reportOptions.length}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="selectAll" className="text-sm font-normal cursor-pointer">
                  Select All ({selectedReports.length}/{reportOptions.length})
                </Label>
              </div>
            </CardTitle>
            <CardDescription>Choose the reports you want to include in the master credit report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(groupedReports).map(([category, reports]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">{category}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {reports.map(report => (
                    <div
                      key={report.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedReports.includes(report.id) 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleReportToggle(report.id)}
                    >
                      <Checkbox
                        checked={selectedReports.includes(report.id)}
                        onCheckedChange={() => handleReportToggle(report.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {report.icon}
                          <span className="font-medium text-sm">{report.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="mt-4" />
              </div>
            ))}

            <Button 
              onClick={generateReport} 
              disabled={isGenerating || selectedReports.length === 0}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Master Credit Report ({selectedReports.length} reports)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generated Report Display */}
      {reportGenerated && generatedReport && (
        <Card className="border-green-500/20 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Master Credit Report Generated
            </CardTitle>
            <CardDescription>
              Generated on {new Date(generatedReport.generatedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedReport.reports.map((report: any) => (
              <Card key={report.id}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {reportOptions.find(r => r.id === report.id)?.icon}
                    {report.name}
                    <Badge variant="outline" className="ml-auto">
                      {report.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                    {JSON.stringify(report.data, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Email Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MSMECreditReport;
