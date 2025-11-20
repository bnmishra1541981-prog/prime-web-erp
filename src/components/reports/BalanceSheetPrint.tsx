import { forwardRef } from 'react';

interface BalanceSheetData {
  ledgerName: string;
  groupName: string;
  amount: number;
}

interface BalanceSheetPrintProps {
  company: {
    name: string;
    address?: string;
    gstin?: string;
    pan?: string;
  };
  asOfDate: string;
  liabilities: BalanceSheetData[];
  assets: BalanceSheetData[];
  totalLiabilities: number;
  totalAssets: number;
  difference: number;
}

export const BalanceSheetPrint = forwardRef<HTMLDivElement, BalanceSheetPrintProps>((props, ref) => {
  const { company, asOfDate, liabilities, assets, totalLiabilities, totalAssets, difference } = props;

  const groupByCategory = (data: BalanceSheetData[]) => {
    const grouped = new Map<string, BalanceSheetData[]>();
    data.forEach(item => {
      const existing = grouped.get(item.groupName) || [];
      existing.push(item);
      grouped.set(item.groupName, existing);
    });
    return grouped;
  };

  const liabilityGroups = groupByCategory(liabilities);
  const assetGroups = groupByCategory(assets);

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';
    
    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
    };

    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;

    let result = '';
    if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
    if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
    if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
    if (remainder > 0) result += convertLessThanThousand(remainder);

    return result.trim() + ' Rupees Only';
  };

  return (
    <div ref={ref} className="bg-white p-8 text-black" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>
      {/* Header */}
      <div className="border-2 border-black">
        <div className="bg-gray-100 p-4 border-b-2 border-black text-center">
          <h1 className="text-xl font-bold">{company.name}</h1>
          {company.address && <p className="text-xs mt-1">{company.address}</p>}
          <div className="flex justify-center gap-4 text-xs mt-1">
            {company.gstin && <span>GSTIN: {company.gstin}</span>}
            {company.pan && <span>PAN: {company.pan}</span>}
          </div>
        </div>

        <div className="bg-gray-200 p-3 text-center border-b-2 border-black">
          <h2 className="text-lg font-bold">BALANCE SHEET</h2>
          <p className="text-xs mt-1">As on {new Date(asOfDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 border-b-2 border-black min-h-[600px]">
          {/* Liabilities Side */}
          <div className="border-r-2 border-black">
            <div className="bg-gray-100 p-2 border-b border-black">
              <h3 className="font-bold text-sm">LIABILITIES</h3>
            </div>
            <div className="p-3">
              <table className="w-full text-xs">
                <tbody>
                  {Array.from(liabilityGroups.entries()).map(([groupName, items], groupIndex) => (
                    <tr key={groupIndex}>
                      <td colSpan={2} className="py-1">
                        <div className="font-semibold mb-1">{groupName}</div>
                        {items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex justify-between pl-4 py-0.5">
                            <span className="text-gray-700">{item.ledgerName}</span>
                            <span className="font-mono">{item.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between pl-4 py-0.5 font-semibold border-t border-gray-300 mt-1">
                          <span>Total {groupName}</span>
                          <span className="font-mono">
                            {items.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {difference < 0 && (
                    <tr>
                      <td colSpan={2} className="py-1">
                        <div className="font-bold text-green-700 flex justify-between">
                          <span>Profit for the Year</span>
                          <span className="font-mono">{Math.abs(difference).toFixed(2)}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assets Side */}
          <div>
            <div className="bg-gray-100 p-2 border-b border-black">
              <h3 className="font-bold text-sm">ASSETS</h3>
            </div>
            <div className="p-3">
              <table className="w-full text-xs">
                <tbody>
                  {Array.from(assetGroups.entries()).map(([groupName, items], groupIndex) => (
                    <tr key={groupIndex}>
                      <td colSpan={2} className="py-1">
                        <div className="font-semibold mb-1">{groupName}</div>
                        {items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex justify-between pl-4 py-0.5">
                            <span className="text-gray-700">{item.ledgerName}</span>
                            <span className="font-mono">{item.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between pl-4 py-0.5 font-semibold border-t border-gray-300 mt-1">
                          <span>Total {groupName}</span>
                          <span className="font-mono">
                            {items.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {difference > 0 && (
                    <tr>
                      <td colSpan={2} className="py-1">
                        <div className="font-bold text-red-700 flex justify-between">
                          <span>Loss for the Year</span>
                          <span className="font-mono">{difference.toFixed(2)}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 border-b-2 border-black bg-gray-100">
          <div className="p-3 border-r-2 border-black">
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span className="font-mono">
                ₹ {(totalLiabilities + (difference < 0 ? Math.abs(difference) : 0)).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="p-3">
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span className="font-mono">
                ₹ {(totalAssets + (difference > 0 ? difference : 0)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="p-3 border-b-2 border-black">
          <p className="text-xs">
            <strong>Total in Words:</strong> {numberToWords(Math.round(Math.max(totalLiabilities + (difference < 0 ? Math.abs(difference) : 0), totalAssets + (difference > 0 ? difference : 0))))}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-8 mt-8">
            <div>
              <p className="text-xs">Prepared By</p>
              <div className="border-t border-black mt-8 pt-1">
                <p className="text-xs">Accountant</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs">For {company.name}</p>
              <div className="border-t border-black mt-8 pt-1 inline-block min-w-[150px]">
                <p className="text-xs">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-gray-600 mt-4">
        This is a computer-generated report and does not require a signature
      </div>
    </div>
  );
});

BalanceSheetPrint.displayName = 'BalanceSheetPrint';
