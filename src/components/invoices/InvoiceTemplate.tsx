import { useRef, forwardRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceItem {
  description: string;
  hsn_sac?: string;
  quantity: number;
  unit?: string;
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
  totalAmount: number;
  placeOfSupply?: string;
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
    company,
    party,
    items,
    narration,
    totalAmount,
    placeOfSupply,
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
          <h1 className="text-2xl font-bold text-center">{company.name}</h1>
          {company.address && <p className="text-center text-sm">{company.address}</p>}
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
            {dueDate && <p className="text-sm"><strong>Due Date:</strong> {new Date(dueDate).toLocaleDateString('en-IN')}</p>}
            {referenceNumber && <p className="text-sm"><strong>Ref No:</strong> {referenceNumber}</p>}
            {referenceDate && <p className="text-sm"><strong>Ref Date:</strong> {new Date(referenceDate).toLocaleDateString('en-IN')}</p>}
          </div>
          <div className="p-3">
            {placeOfSupply && <p className="text-sm"><strong>Place of Supply:</strong> {placeOfSupply}</p>}
            <p className="text-sm"><strong>Terms:</strong> As per agreement</p>
          </div>
        </div>

        {/* Party Details */}
        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="p-3 border-r-2 border-black">
            <p className="text-sm font-bold mb-1">{type === 'sales' ? 'Bill To:' : 'Supplier Details:'}</p>
            <p className="text-sm font-semibold">{party.name}</p>
            {party.address && <p className="text-sm">{party.address}</p>}
            {party.gstin && <p className="text-sm"><strong>GSTIN:</strong> {party.gstin}</p>}
            {party.state && <p className="text-sm"><strong>State:</strong> {party.state}</p>}
            {party.phone && <p className="text-sm"><strong>Phone:</strong> {party.phone}</p>}
          </div>
          {shippingAddress && (
            <div className="p-3">
              <p className="text-sm font-bold mb-1">Ship To:</p>
              <p className="text-sm">{shippingAddress}</p>
            </div>
          )}
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border-2 border-black p-2 text-left text-xs">S.No</th>
              <th className="border-2 border-black p-2 text-left text-xs">Description of Goods</th>
              <th className="border-2 border-black p-2 text-left text-xs">HSN/SAC</th>
              <th className="border-2 border-black p-2 text-right text-xs">Qty</th>
              <th className="border-2 border-black p-2 text-left text-xs">Unit</th>
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
                <td className="border-2 border-black p-2 text-right text-xs">{item.quantity}</td>
                <td className="border-2 border-black p-2 text-xs">{item.unit || 'Nos'}</td>
                <td className="border-2 border-black p-2 text-right text-xs">₹{item.rate.toFixed(2)}</td>
                <td className="border-2 border-black p-2 text-right text-xs">₹{item.amount.toFixed(2)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={6} className="border-2 border-black p-2 text-right font-bold text-xs">Taxable Amount:</td>
              <td className="border-2 border-black p-2 text-right font-bold text-xs">₹{taxableAmount.toFixed(2)}</td>
            </tr>
            {cgstTotal > 0 && (
              <tr>
                <td colSpan={6} className="border-2 border-black p-2 text-right text-xs">CGST:</td>
                <td className="border-2 border-black p-2 text-right text-xs">₹{cgstTotal.toFixed(2)}</td>
              </tr>
            )}
            {sgstTotal > 0 && (
              <tr>
                <td colSpan={6} className="border-2 border-black p-2 text-right text-xs">SGST:</td>
                <td className="border-2 border-black p-2 text-right text-xs">₹{sgstTotal.toFixed(2)}</td>
              </tr>
            )}
            {igstTotal > 0 && (
              <tr>
                <td colSpan={6} className="border-2 border-black p-2 text-right text-xs">IGST:</td>
                <td className="border-2 border-black p-2 text-right text-xs">₹{igstTotal.toFixed(2)}</td>
              </tr>
            )}
            <tr className="bg-gray-100">
              <td colSpan={6} className="border-2 border-black p-2 text-right font-bold text-sm">Total Amount:</td>
              <td className="border-2 border-black p-2 text-right font-bold text-sm">₹{totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Amount in Words */}
        <div className="border-b-2 border-black p-3">
          <p className="text-sm"><strong>Amount in Words:</strong> {numberToWords(Math.round(totalAmount))}</p>
        </div>

        {/* Bank Details & Terms */}
        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="p-3 border-r-2 border-black">
            <p className="text-sm font-bold mb-2">Bank Details:</p>
            {company.bank_name && <p className="text-xs">Bank: {company.bank_name}</p>}
            {company.bank_account_number && <p className="text-xs">A/c No: {company.bank_account_number}</p>}
            {company.bank_ifsc && <p className="text-xs">IFSC: {company.bank_ifsc}</p>}
          </div>
          <div className="p-3">
            <p className="text-sm font-bold mb-2">Terms & Conditions:</p>
            <p className="text-xs">1. Goods once sold will not be taken back</p>
            <p className="text-xs">2. Interest @18% p.a. will be charged on delayed payments</p>
            <p className="text-xs">3. Subject to jurisdiction only</p>
          </div>
        </div>

        {/* Narration */}
        {narration && (
          <div className="border-b-2 border-black p-3">
            <p className="text-sm"><strong>Narration:</strong> {narration}</p>
          </div>
        )}

        {/* Footer */}
        <div className="grid grid-cols-2">
          <div className="p-3 border-r-2 border-black">
            <p className="text-xs">Receiver's Signature</p>
          </div>
          <div className="p-3 text-right">
            <p className="text-sm font-bold mb-8">For {company.name}</p>
            <p className="text-xs">Authorized Signatory</p>
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
