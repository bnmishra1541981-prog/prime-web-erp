import { forwardRef } from 'react';
import solviserLogo from '@/assets/solviser-logo.png';

interface LedgerEntry {
  ledgerName: string;
  groupName: string;
  amount: number;
}

interface ProfitLossPrintProps {
  company: {
    name: string;
    address?: string;
    gstin?: string;
    pan?: string;
  };
  fromDate: string;
  toDate: string;
  openingStock: LedgerEntry[];
  closingStock: LedgerEntry[];
  purchaseAccounts: LedgerEntry[];
  salesAccounts: LedgerEntry[];
  directExpenses: LedgerEntry[];
  indirectExpenses: LedgerEntry[];
  indirectIncomes: LedgerEntry[];
  grossProfit: number;
  netProfit: number;
}

export const ProfitLossPrint = forwardRef<HTMLDivElement, ProfitLossPrintProps>((props, ref) => {
  const { 
    company, 
    fromDate, 
    toDate, 
    openingStock,
    closingStock,
    purchaseAccounts,
    salesAccounts,
    directExpenses,
    indirectExpenses,
    indirectIncomes,
    grossProfit,
    netProfit
  } = props;

  const totalOpeningStock = openingStock.reduce((sum, item) => sum + item.amount, 0);
  const totalClosingStock = closingStock.reduce((sum, item) => sum + item.amount, 0);
  const totalPurchases = purchaseAccounts.reduce((sum, item) => sum + item.amount, 0);
  const totalSales = salesAccounts.reduce((sum, item) => sum + item.amount, 0);
  const totalDirectExpenses = directExpenses.reduce((sum, item) => sum + item.amount, 0);
  const totalIndirectExpenses = indirectExpenses.reduce((sum, item) => sum + item.amount, 0);
  const totalIndirectIncome = indirectIncomes.reduce((sum, item) => sum + item.amount, 0);

  const leftSubtotal = totalOpeningStock + totalPurchases + Math.max(0, grossProfit);
  const rightSubtotal = totalSales + totalDirectExpenses + totalClosingStock;
  const leftTotal = leftSubtotal + totalIndirectExpenses + Math.max(0, netProfit);
  const rightTotal = rightSubtotal + Math.max(0, grossProfit) + totalIndirectIncome;

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
          <div className="flex items-center justify-center gap-4 mb-2">
            <img src={solviserLogo} alt="Solviser" className="h-10" />
          </div>
          <h1 className="text-xl font-bold">{company.name}</h1>
          {company.address && <p className="text-xs mt-1">{company.address}</p>}
          <div className="flex justify-center gap-4 text-xs mt-1">
            {company.gstin && <span>GSTIN: {company.gstin}</span>}
            {company.pan && <span>PAN: {company.pan}</span>}
          </div>
        </div>

        <div className="bg-gray-200 p-3 text-center border-b-2 border-black">
          <h2 className="text-lg font-bold">PROFIT AND LOSS ACCOUNT</h2>
          <p className="text-xs mt-1">
            {new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to {new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 border-b-2 border-black min-h-[600px]">
          {/* Left Side - Expenditure */}
          <div className="border-r-2 border-black">
            <div className="bg-gray-100 p-2 border-b border-black">
              <h3 className="font-bold text-sm">EXPENDITURE</h3>
            </div>
            <div className=<div className="p-3 flex flex-col justify-between min-h-[650px]">

              {/* Opening Stock */}
              <div className="bg-yellow-100 px-2 py-1">
                <div className="flex justify-between font-bold text-xs">
                  <span>Opening Stock</span>
                  <span className="font-mono">{totalOpeningStock.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              {openingStock.map((item, idx) => (
                <div key={idx} className="px-4 py-0.5 flex justify-between text-xs italic">
                  <span className="text-gray-700">{item.ledgerName}</span>
                  <span className="font-mono">{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}

              {/* Purchase Accounts */}
              <div className="px-2 py-1 mt-1">
                <div className="flex justify-between font-bold text-xs">
                  <span>Purchase Accounts</span>
                  <span className="font-mono">{totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              {purchaseAccounts.map((item, idx) => (
                <div key={idx} className="px-4 py-0.5 flex justify-between text-xs italic">
                  <span className="text-gray-700">{item.ledgerName}</span>
                  <span className="font-mono">{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}

              {/* Gross Profit c/o */}
              {grossProfit > 0 && (
                <div className="px-2 py-1 mt-1 font-bold italic border-t border-black text-xs">
                  <div className="flex justify-between">
                    <span>Gross Profit c/o</span>
                    <span className="font-mono">{grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {/* Subtotal */}
              <div className="px-2 py-1 border-t-2 border-b border-black">
                <div className="flex justify-end font-bold text-xs">
                  <span className="font-mono">{leftSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Indirect Expenses */}
              <div className="px-2 py-1">
                <div className="flex justify-between font-bold text-xs">
                  <span>Indirect Expenses</span>
                  <span className="font-mono">{totalIndirectExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              {indirectExpenses.map((item, idx) => (
                <div key={idx} className="px-4 py-0.5 flex justify-between text-xs italic">
                  <span className="text-gray-700">{item.ledgerName}</span>
                  <span className="font-mono">{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}

              {/* Net Profit */}
              {netProfit > 0 && (
                <div className="px-2 py-1 mt-1 font-bold text-xs">
                  <div className="flex justify-between">
                    <span>Net Profit</span>
                    <span className="font-mono">{netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Income */}
          <div>
            <div className="bg-gray-100 p-2 border-b border-black">
              <h3 className="font-bold text-sm">INCOME</h3>
            </div>
            <div className="p-3">

              {/* Sales Accounts */}
              <div className="px-2 py-1">
                <div className="flex justify-between font-bold text-xs">
                  <span>Sales Accounts</span>
                  <span className="font-mono">{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              {salesAccounts.map((item, idx) => (
                <div key={idx} className="px-4 py-0.5 flex justify-between text-xs italic">
                  <span className="text-gray-700">{item.ledgerName}</span>
                  <span className="font-mono">{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}

              {/* Direct Expenses */}
              <div className="px-2 py-1 mt-1">
                <div className="flex justify-between font-bold text-xs">
                  <span>Direct Expenses</span>
                  <span className="font-mono">{totalDirectExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              {directExpenses.map((item, idx) => (
                <div key={idx} className="px-4 py-0.5 flex justify-between text-xs italic">
                  <span className="text-gray-700">{item.ledgerName}</span>
                  <span className="font-mono">{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}

              {/* Closing Stock */}
              <div className="px-2 py-1 mt-1">
                <div className="flex justify-between font-bold text-xs">
                  <span>Closing Stock</span>
                  <span className="font-mono">{totalClosingStock.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              {closingStock.map((item, idx) => (
                <div key={idx} className="px-4 py-0.5 flex justify-between text-xs italic">
                  <span className="text-gray-700">{item.ledgerName}</span>
                  <span className="font-mono">{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}

              {/* Subtotal */}
              <div className="px-2 py-1 border-t-2 border-b border-black">
                <div className="flex justify-end font-bold text-xs">
                  <span className="font-mono">{rightSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Gross Profit b/f */}
              {grossProfit > 0 && (
                <div className="px-2 py-1 font-bold italic text-xs">
                  <div className="flex justify-between">
                    <span>Gross Profit b/f</span>
                    <span className="font-mono">{grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {/* Indirect Incomes */}
              <div className="px-2 py-1">
                <div className="flex justify-between font-bold text-xs">
                  <span>Indirect Incomes</span>
                  <span className="font-mono">{totalIndirectIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              {indirectIncomes.map((item, idx) => (
                <div key={idx} className="px-4 py-0.5 flex justify-between text-xs italic">
                  <span className="text-gray-700">{item.ledgerName}</span>
                  <span className="font-mono">{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 border-b-2 border-black bg-gray-100">
          <div className="p-3 border-r-2 border-black">
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span className="font-mono">₹ {leftTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between min-h-[650px]">
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span className="font-mono">₹ {rightTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="p-3 border-b-2 border-black">
          <p className="text-xs">
            <strong>Total in Words:</strong> {numberToWords(Math.round(Math.max(leftTotal, rightTotal)))}
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

ProfitLossPrint.displayName = 'ProfitLossPrint';
