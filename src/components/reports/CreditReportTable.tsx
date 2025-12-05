import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CreditReportTableProps {
  reportId: string;
  data: any;
}

export const CreditReportTable = ({ reportId, data }: CreditReportTableProps) => {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-sm text-muted-foreground">No data available</p>;
  }

  // Render simple key-value pairs
  const renderKeyValueTable = (obj: Record<string, any>, excludeKeys: string[] = []) => {
    const entries = Object.entries(obj).filter(([key]) => !excludeKeys.includes(key));
    
    return (
      <Table>
        <TableBody>
          {entries.map(([key, value]) => (
            <TableRow key={key}>
              <TableCell className="font-medium text-muted-foreground w-1/3 capitalize">
                {formatKey(key)}
              </TableCell>
              <TableCell>{formatValue(value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Format key from camelCase to readable text
  const formatKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Format value for display
  const formatValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') {
      return value ? (
        <Badge variant="default" className="bg-green-500">Yes</Badge>
      ) : (
        <Badge variant="secondary">No</Badge>
      );
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Render array as table
  const renderArrayTable = (arr: any[], columns: string[]) => {
    if (!arr || arr.length === 0) return <p className="text-sm text-muted-foreground">No records found</p>;
    
    return (
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead key={col} className="capitalize">{formatKey(col)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {arr.map((item, idx) => (
              <TableRow key={idx}>
                {columns.map(col => (
                  <TableCell key={col}>{formatValue(item[col])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Render based on report type
  switch (reportId) {
    case 'company_details':
      return renderKeyValueTable(data);

    case 'gst_details':
      return renderKeyValueTable(data);

    case 'pan':
      return renderKeyValueTable(data);

    case 'itr_info':
      return renderKeyValueTable(data);

    case 'charges':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Total Charges</TableCell>
                <TableCell>{data.totalCharges}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Active Charges</TableCell>
                <TableCell>{data.activeCharges}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Satisfied Charges</TableCell>
                <TableCell>{data.satisfiedCharges}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.chargeDetails && data.chargeDetails.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Charge Details</h4>
              {renderArrayTable(data.chargeDetails, ['holder', 'amount', 'status', 'date'])}
            </div>
          )}
        </div>
      );

    case 'litigation':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Total Cases</TableCell>
                <TableCell>{data.totalCases}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Pending Cases</TableCell>
                <TableCell>{data.pendingCases}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Resolved Cases</TableCell>
                <TableCell>{data.resolvedCases}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.caseDetails && data.caseDetails.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Case Details</h4>
              {renderArrayTable(data.caseDetails, ['court', 'type', 'status', 'year'])}
            </div>
          )}
        </div>
      );

    case 'commercial_cibil':
      return (
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium text-muted-foreground w-1/3">Score</TableCell>
              <TableCell>
                <Badge variant={data.score >= 700 ? 'default' : 'secondary'} className={data.score >= 700 ? 'bg-green-500' : ''}>
                  {data.score}
                </Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-muted-foreground">Rating</TableCell>
              <TableCell>{data.rating}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-muted-foreground">Credit Limit</TableCell>
              <TableCell>{data.creditLimit}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-muted-foreground">Utilization Rate</TableCell>
              <TableCell>{data.utilizationRate}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

    case 'individual_cibil':
      return (
        <div>
          <h4 className="text-sm font-medium mb-2">Director Credit Scores</h4>
          {renderArrayTable(data.directors || [], ['name', 'score', 'status'])}
        </div>
      );

    case 'aadhaar':
      return (
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium text-muted-foreground w-1/3">Verified</TableCell>
              <TableCell>
                <Badge variant={data.verified ? 'default' : 'secondary'} className={data.verified ? 'bg-green-500' : ''}>
                  {data.verified ? 'Yes' : 'No'}
                </Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium text-muted-foreground">Directors Verified</TableCell>
              <TableCell>{data.directorsVerified} / {data.totalDirectors}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

    case 'land_records':
      return renderKeyValueTable(data);

    case 'mobile_verification':
      return renderKeyValueTable(data);

    case 'director_pan':
      return (
        <div>
          <h4 className="text-sm font-medium mb-2">Director PAN Details</h4>
          {renderArrayTable(data.directors || [], ['name', 'pan', 'status'])}
        </div>
      );

    case 'tan':
      return renderKeyValueTable(data);

    case 'contact_email':
      return renderKeyValueTable(data);

    case 'registered_address':
      return renderKeyValueTable(data);

    case 'associated_companies':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Total Associated</TableCell>
                <TableCell>{data.totalAssociated}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.companies && data.companies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Associated Companies</h4>
              {renderArrayTable(data.companies, ['name', 'relation', 'status'])}
            </div>
          )}
        </div>
      );

    case 'directors':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Total Directors</TableCell>
                <TableCell>{data.totalDirectors}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Active Directors</TableCell>
                <TableCell>{data.activeDirectors}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.directors && data.directors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Director Details</h4>
              {renderArrayTable(data.directors, ['din', 'name', 'designation', 'appointmentDate'])}
            </div>
          )}
        </div>
      );

    case 'court_cases':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Total Cases</TableCell>
                <TableCell>{data.totalCases}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Pending Cases</TableCell>
                <TableCell><Badge variant="destructive">{data.pendingCases}</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Disposed Cases</TableCell>
                <TableCell>{data.disposedCases}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.caseDetails && data.caseDetails.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Case Details</h4>
              {renderArrayTable(data.caseDetails, ['caseNumber', 'court', 'caseType', 'status', 'filingDate'])}
            </div>
          )}
        </div>
      );

    case 'bank_defaults':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Total Defaults</TableCell>
                <TableCell>{data.totalDefaults}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">NPA Status</TableCell>
                <TableCell><Badge variant={data.npaStatus === 'Yes' ? 'destructive' : 'default'} className={data.npaStatus === 'No' ? 'bg-green-500' : ''}>{data.npaStatus}</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Wilful Defaulter</TableCell>
                <TableCell><Badge variant={data.wilfulDefaulter === 'Yes' ? 'destructive' : 'default'} className={data.wilfulDefaulter === 'No' ? 'bg-green-500' : ''}>{data.wilfulDefaulter}</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.defaults && data.defaults.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Default Details</h4>
              {renderArrayTable(data.defaults, ['bank', 'loanType', 'sanctionedAmount', 'outstandingAmount', 'status'])}
            </div>
          )}
        </div>
      );

    case 'emi_details':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Total Loans</TableCell>
                <TableCell>{data.totalLoans}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Active Loans</TableCell>
                <TableCell>{data.activeLoans}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Total EMI Delays</TableCell>
                <TableCell><Badge variant={data.totalEmiDelays > 0 ? 'secondary' : 'default'}>{data.totalEmiDelays}</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Unpaid EMIs</TableCell>
                <TableCell><Badge variant={data.unpaidEmis > 0 ? 'destructive' : 'default'} className={data.unpaidEmis === 0 ? 'bg-green-500' : ''}>{data.unpaidEmis}</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.loanDetails && data.loanDetails.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Loan Details</h4>
              {renderArrayTable(data.loanDetails, ['lender', 'loanType', 'emiAmount', 'delayedEmis', 'unpaidEmis', 'status'])}
            </div>
          )}
        </div>
      );

    case 'immovable_property':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Total Properties</TableCell>
                <TableCell>{data.totalProperties}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Total Value</TableCell>
                <TableCell className="font-semibold">{data.totalValue}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.properties && data.properties.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Property Details</h4>
              {renderArrayTable(data.properties, ['type', 'location', 'area', 'value', 'mortgaged'])}
            </div>
          )}
        </div>
      );

    case 'vehicles':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Total Vehicles</TableCell>
                <TableCell>{data.totalVehicles}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Total Value</TableCell>
                <TableCell className="font-semibold">{data.totalValue}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.vehicles && data.vehicles.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Vehicle Details</h4>
              {renderArrayTable(data.vehicles, ['type', 'registrationNo', 'make', 'model', 'value', 'financed'])}
            </div>
          )}
        </div>
      );

    case 'assets':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Total Assets</TableCell>
                <TableCell className="font-semibold">{data.totalAssets}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Fixed Assets</TableCell>
                <TableCell>{data.fixedAssets}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Current Assets</TableCell>
                <TableCell>{data.currentAssets}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.assetBreakdown && data.assetBreakdown.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Asset Breakdown</h4>
              {renderArrayTable(data.assetBreakdown, ['category', 'value', 'percentage'])}
            </div>
          )}
        </div>
      );

    case 'party_receivables':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Total Receivables</TableCell>
                <TableCell className="font-semibold">{data.totalReceivables}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Overdue Amount</TableCell>
                <TableCell><Badge variant="destructive">{data.overdue}</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.parties && data.parties.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Receivable Details (Lena Hai)</h4>
              {renderArrayTable(data.parties, ['partyName', 'totalAmount', 'dueDate', 'overduedays', 'status'])}
            </div>
          )}
        </div>
      );

    case 'party_payables':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Total Payables</TableCell>
                <TableCell className="font-semibold">{data.totalPayables}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Overdue Amount</TableCell>
                <TableCell><Badge variant="destructive">{data.overdue}</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.parties && data.parties.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Payable Details (Dena Hai)</h4>
              {renderArrayTable(data.parties, ['partyName', 'totalAmount', 'dueDate', 'overduedays', 'status'])}
            </div>
          )}
        </div>
      );

    case 'udyam':
      return renderKeyValueTable(data);

    case 'blocklist':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Is Blocklisted</TableCell>
                <TableCell><Badge variant={data.isBlocklisted ? 'destructive' : 'default'} className={!data.isBlocklisted ? 'bg-green-500' : ''}>{data.isBlocklisted ? 'Yes' : 'No'}</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Is Blacklisted</TableCell>
                <TableCell><Badge variant={data.isBlacklisted ? 'destructive' : 'default'} className={!data.isBlacklisted ? 'bg-green-500' : ''}>{data.isBlacklisted ? 'Yes' : 'No'}</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.checkSources && data.checkSources.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Verification Sources</h4>
              {renderArrayTable(data.checkSources, ['source', 'status', 'checkedOn'])}
            </div>
          )}
        </div>
      );

    case 'contract_defaults':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Total Contracts</TableCell>
                <TableCell>{data.totalContracts}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Completed</TableCell>
                <TableCell>{data.completedContracts}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Defaulted</TableCell>
                <TableCell><Badge variant={data.defaultedContracts > 0 ? 'destructive' : 'default'}>{data.defaultedContracts}</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Ongoing</TableCell>
                <TableCell>{data.ongoingContracts}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.defaults && data.defaults.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Default Details</h4>
              {renderArrayTable(data.defaults, ['contractWith', 'contractValue', 'defaultAmount', 'reason', 'status'])}
            </div>
          )}
        </div>
      );

    case 'disputes':
      return (
        <div className="space-y-4">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-1/3">Total Disputes</TableCell>
                <TableCell>{data.totalDisputes}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Pending Disputes</TableCell>
                <TableCell><Badge variant={data.pendingDisputes > 0 ? 'destructive' : 'default'}>{data.pendingDisputes}</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Resolved Disputes</TableCell>
                <TableCell>{data.resolvedDisputes}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Total Delays</TableCell>
                <TableCell>{data.totalDelays}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {data.disputes && data.disputes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Dispute Details</h4>
              {renderArrayTable(data.disputes, ['disputeWith', 'type', 'amount', 'status'])}
            </div>
          )}
          {data.delays && data.delays.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Delay Report</h4>
              {renderArrayTable(data.delays, ['project', 'expectedDate', 'actualDate', 'delayDays', 'reason'])}
            </div>
          )}
        </div>
      );

    default:
      return renderKeyValueTable(data);
  }
};
