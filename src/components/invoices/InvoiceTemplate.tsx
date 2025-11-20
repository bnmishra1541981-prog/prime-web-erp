import { useRef, forwardRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import solviserLogo from '@/assets/solviser-logo.png';

interface InvoiceItem {
  description: string;
  hsn_sac?: string;
  quantity: number;
  unit?: string;
  no_of_pcs?: number;
  rate: number;
  amount: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
}

interface InvoiceProps {
  type: 'sales' | 'purchase';
  voucherNumber: string;
  voucherDate: string;
  dueDate?: string;
  referenceNumber?: string;
  referenceDate?: string;
  paymentTerms?: number;
  paymentMode?: string;
  truckNumber?: string;
  transportName?: string;
  transportGst?: string;
  lrNumber?: string;
  deliveryPlace?: string;
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    pan?: string;
    state?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
  };
  party: {
    name: string;
    address?: string;
    phone?: string;
    gstin?: string;
    state?: string;
  };
  items: InvoiceItem[];
  narration?: string;
  basicAmount?: number;
  otherCharges?: number;
  tcsRate?: number;
  tcsAmount?: number;
  tdsRate?: number;
  tdsAmount?: number;
  roundOff?: number;
  totalAmount: number;
  placeOfSupply?: string;
  billingAddress?: string;
  shippingAddress?: string;
}

const InvoicePrint = forwardRef<HTMLDivElement, InvoiceProps>((props, ref) => {
  const {
    type,
    voucherNumber,
    voucherDate,
    dueDate,
    referenceNumber,
    referenceDate,
    paymentTerms,
    paymentMode,
    truckNumber,
    transportName,
    transportGst,
    lrNumber,
    deliveryPlace,
    company,
    party,
    items,
    narration,
    basicAmount,
    otherCharges,
    tcsRate,
    tcsAmount,
    tdsRate,
    tdsAmount,
    roundOff,
    totalAmount,
    placeOfSupply,
    billingAddress,
    shippingAddress,
  } = props;

  const taxableAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const cgstTotal = items.reduce((sum, item) => sum + (item.cgst_amount || 0), 0);
  const sgstTotal = items.reduce((sum, item) => sum + (item.sgst_amount || 0), 0);
  const igstTotal = items.reduce((sum, item) => sum + (item.igst_amount || 0), 0);

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
    <div ref={ref} className="bg-white p-8 text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="border-2 border-black mb-4">
        <div className="bg-gray-100 p-3 border-b-2 border-black">
          <div className="flex items-center justify-between mb-2">
            <img src={solviserLogo} alt="Solviser" className="h-12" />
            <div className="text-right flex-1 ml-4">
              <h1 className="text-2xl font-bold">{company.name}</h1>
              {company.address && <p className="text-sm">{company.address}</p>}
            </div>
          </div>
          <div className="flex justify-center gap-4 text-xs mt-1">
            {company.phone && <span>Ph: {company.phone}</span>}
            {company.email && <span>Email: {company.email}</span>}
          </div>
          <div className="flex justify-center gap-4 text-xs font-semibold">
            {company.gstin && <span>GSTIN: {company.gstin}</span>}
            {company.pan && <span>PAN: {company.pan}</span>}
            {company.state && <span>State: {company.state}</span>}
          </div>
        </div>

        <div className="bg-gray-200 p-2 text-center border-b-2 border-black">
          <h2 className="text-xl font-bold">{type === 'sales' ? 'TAX INVOICE' : 'PURCHASE INVOICE'}</h2>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="p-3 border-r-2 border-black">
            <p className="text-sm"><strong>Invoice No:</strong> {voucherNumber}</p>
            <p className="text-sm"><strong>Invoice Date:</strong> {new Date(voucherDate).toLocaleDateString('en-IN')}</p>
            {referenceNumber && <p className="text-sm"><strong>PO No:</strong> {referenceNumber}</p>}
            {referenceDate && <p className="text-sm"><strong>PO Date:</strong> {new Date(referenceDate).toLocaleDateString('en-IN')}</p>}
          </div>
          <div className="p-3">
            {paymentTerms !== undefined && paymentTerms > 0 && (
              <p className="text-sm"><strong>Payment Terms:</strong> {paymentTerms} Days</p>
            )}
            {paymentMode && <p className="text-sm"><strong>Mode:</strong> {paymentMode}</p>}
            {placeOfSupply && <p className="text-sm"><strong>Place of Supply:</strong> {placeOfSupply}</p>}
          </div>
        </div>

        {/* Transport Details */}
        {(truckNumber || transportName || lrNumber || deliveryPlace) && (
          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="p-3 border-r-2 border-black">
              <p className="text-sm font-bold mb-1">Dispatch Details:</p>
              {truckNumber && <p className="text-xs"><strong>Truck No:</strong> {truckNumber}</p>}
              {transportName && <p className="text-xs"><strong>Transport:</strong> {transportName}</p>}
              {transportGst && <p className="text-xs"><strong>Transport GST:</strong> {transportGst}</p>}
            </div>
            <div className="p-3">
              {lrNumber && <p className="text-xs"><strong>LR No:</strong> {lrNumber}</p>}
              {deliveryPlace && <p className="text-xs"><strong>Delivery Place:</strong> {deliveryPlace}</p>}
            </div>
          </div>
        )}

        {/* Party Details */}
        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="p-3 border-r-2 border-black">
            <p className="text-sm font-bold mb-1">Bill To:</p>
            <p className="text-sm font-semibold">{party.name}</p>
            {billingAddress && <p className="text-sm">{billingAddress}</p>}
            {party.gstin && <p className="text-sm"><strong>GSTIN:</strong> {party.gstin}</p>}
            {party.state && <p className="text-sm"><strong>State:</strong> {party.state}</p>}
            {party.phone && <p className="text-sm"><strong>Phone:</strong> {party.phone}</p>}
          </div>
          <div className="p-3">
            <p className="text-sm font-bold mb-1">Ship To:</p>
            <p className="text-sm">{shippingAddress || billingAddress || 'Same as Bill To'}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border-2 border-black p-2 text-left text-xs">Sr.</th>
              <th className="border-2 border-black p-2 text-left text-xs">Item Name</th>
              <th className="border-2 border-black p-2 text-left text-xs">HSN Code</th>
              <th className="border-2 border-black p-2 text-left text-xs">UoM</th>
              <th className="border-2 border-black p-2 text-right text-xs">No. Pcs</th>
              <th className="border-2 border-black p-2 text-right text-xs">Qty</th>
              <th className="border-2 border-black p-2 text-right text-xs">Rate</th>
              <th className="border-2 border-black p-2 text-right text-xs">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="border-2 border-black p-2 text-xs">{index + 1}</td>
                <td className="border-2 border-black p-2 text-xs">{item.description}</td>
                <td className="border-2 border-black p-2 text-xs">{item.hsn_sac || '-'}</td>
                <td className="border-2 border-black p-2 text-xs">{item.unit || 'Nos'}</td>
                <td className="border-2 border-black p-2 text-right text-xs">{item.no_of_pcs || 1}</td>
                <td className="border-2 border-black p-2 text-right text-xs">{item.quantity}</td>
                <td className="border-2 border-black p-2 text-right text-xs">₹{item.rate.toFixed(2)}</td>
                <td className="border-2 border-black p-2 text-right text-xs">₹{item.amount.toFixed(2)}</td>
              </tr>
            ))}
            
            {/* Tax Slab Section */}
            <tr className="bg-gray-50">
              <td colSpan={7} className="border-2 border-black p-2 text-right font-bold text-xs">Basic Amount:</td>
              <td className="border-2 border-black p-2 text-right font-bold text-xs">₹{(basicAmount || taxableAmount).toFixed(2)}</td>
            </tr>
            
            {cgstTotal > 0 && (
              <tr>
                <td colSpan={7} className="border-2 border-black p-2 text-right text-xs">
                  CGST {items[0]?.cgst_rate ? `@ ${items[0].cgst_rate}%` : ''}:
                </td>
                <td className="border-2 border-black p-2 text-right text-xs">₹{cgstTotal.toFixed(2)}</td>
              </tr>
            )}
            {sgstTotal > 0 && (
              <tr>
                <td colSpan={7} className="border-2 border-black p-2 text-right text-xs">
                  SGST {items[0]?.sgst_rate ? `@ ${items[0].sgst_rate}%` : ''}:
                </td>
                <td className="border-2 border-black p-2 text-right text-xs">₹{sgstTotal.toFixed(2)}</td>
              </tr>
            )}
            {igstTotal > 0 && (
              <tr>
                <td colSpan={7} className="border-2 border-black p-2 text-right text-xs">
                  IGST {items[0]?.igst_rate ? `@ ${items[0].igst_rate}%` : ''}:
                </td>
                <td className="border-2 border-black p-2 text-right text-xs">₹{igstTotal.toFixed(2)}</td>
              </tr>
            )}
            
            {otherCharges !== undefined && otherCharges > 0 && (
              <tr>
                <td colSpan={7} className="border-2 border-black p-2 text-right text-xs">Other Charges:</td>
                <td className="border-2 border-black p-2 text-right text-xs">₹{otherCharges.toFixed(2)}</td>
              </tr>
            )}
            
            {tcsAmount !== undefined && tcsAmount > 0 && (
              <tr>
                <td colSpan={7} className="border-2 border-black p-2 text-right text-xs">
                  TCS {tcsRate ? `@ ${tcsRate}%` : ''}:
                </td>
                <td className="border-2 border-black p-2 text-right text-xs">₹{tcsAmount.toFixed(2)}</td>
              </tr>
            )}
            
            {tdsAmount !== undefined && tdsAmount > 0 && (
              <tr>
                <td colSpan={7} className="border-2 border-black p-2 text-right text-xs">
                  TDS {tdsRate ? `@ ${tdsRate}%` : ''}:
                </td>
                <td className="border-2 border-black p-2 text-right text-xs text-destructive">-₹{tdsAmount.toFixed(2)}</td>
              </tr>
            )}
            
            {roundOff !== undefined && roundOff !== 0 && (
              <tr>
                <td colSpan={7} className="border-2 border-black p-2 text-right text-xs">Round Off:</td>
                <td className="border-2 border-black p-2 text-right text-xs">
                  {roundOff >= 0 ? '+' : ''}₹{roundOff.toFixed(2)}
                </td>
              </tr>
            )}
            
            <tr className="bg-gray-100">
              <td colSpan={7} className="border-2 border-black p-2 text-right font-bold text-sm">Grand Total:</td>
              <td className="border-2 border-black p-2 text-right font-bold text-sm">₹{totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Amount in Words */}
        <div className="border-b-2 border-black p-3">
          <p className="text-sm">
            <strong>Amount in Words (Figures & Words):</strong> ₹{totalAmount.toFixed(2)} - {numberToWords(Math.round(totalAmount))}
          </p>
        </div>

        {/* Bank Details & Company Info */}
        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="p-3 border-r-2 border-black">
            <p className="text-sm font-bold mb-2">Bank Details:</p>
            {company.bank_name && <p className="text-xs">Bank: {company.bank_name}</p>}
            {company.bank_account_number && <p className="text-xs">A/c No: {company.bank_account_number}</p>}
            {company.bank_ifsc && <p className="text-xs">IFSC: {company.bank_ifsc}</p>}
            {company.pan && (
              <p className="text-xs mt-2"><strong>Company PAN:</strong> {company.pan}</p>
            )}
          </div>
          <div className="p-3">
            <p className="text-sm font-bold mb-2">Terms & Conditions:</p>
            <p className="text-xs">1. Goods once sold will not be taken back</p>
            <p className="text-xs">2. Interest @18% p.a. will be charged on delayed payments</p>
            <p className="text-xs">3. Subject to jurisdiction only</p>
            <p className="text-xs">4. All disputes subject to local jurisdiction</p>
          </div>
        </div>

        {/* Narration */}
        {narration && (
          <div className="border-b-2 border-black p-3">
            <p className="text-sm"><strong>Narration:</strong> {narration}</p>
          </div>
        )}

        {/* Footer - Signatures */}
        <div className="grid grid-cols-2">
          <div className="p-3 border-r-2 border-black">
            <p className="text-xs font-bold mb-1">Receiver's Signature:</p>
            <div className="h-16 border-b border-dashed border-gray-400 mb-2"></div>
            <p className="text-xs">Name & Date</p>
          </div>
          <div className="p-3 text-right">
            <p className="text-sm font-bold mb-1">For {company.name}</p>
            <div className="h-16 mb-2 flex items-end justify-end">
              <div className="border-t border-black w-32 pt-1">
                <p className="text-xs">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-gray-600 mt-4">
        This is a computer-generated invoice and does not require a signature
      </div>
    </div>
  );
});

InvoicePrint.displayName = 'InvoicePrint';

export const InvoiceTemplate = (props: InvoiceProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`Invoice-${props.voucherNumber}.pdf`);
  };

  return (
    <Card className="p-6">
      <div className="flex gap-2 mb-4 print:hidden">
        <Button onClick={handlePrint} variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print Invoice
        </Button>
        <Button onClick={handleDownloadPDF} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>
      <InvoicePrint ref={printRef} {...props} />
    </Card>
  );
};
