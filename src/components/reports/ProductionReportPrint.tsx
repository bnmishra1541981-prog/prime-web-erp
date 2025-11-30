import { forwardRef } from 'react';
import { format } from 'date-fns';

interface MachineProduction {
  machine_name: string;
  machine_code: string;
  total_quantity: number;
  entry_count: number;
  total_wastage: number;
}

interface SizeProduction {
  size: string;
  total_quantity: number;
  entry_count: number;
  order_count: number;
}

interface OrderProduction {
  order_no: string;
  customer_name: string;
  product: string;
  ordered_quantity: number;
  produced_quantity: number;
  dispatched_quantity: number;
  balance_quantity: number;
}

interface ProductionReportPrintProps {
  reportType: 'machine' | 'size' | 'order';
  dateFrom: string;
  dateTo: string;
  machineData?: MachineProduction[];
  sizeData?: SizeProduction[];
  orderData?: OrderProduction[];
}

export const ProductionReportPrint = forwardRef<HTMLDivElement, ProductionReportPrintProps>(
  ({ reportType, dateFrom, dateTo, machineData, sizeData, orderData }, ref) => {
    const getReportTitle = () => {
      switch (reportType) {
        case 'machine':
          return 'Machine-wise Production Report';
        case 'size':
          return 'Size-wise Production Report';
        case 'order':
          return 'Order-wise Production Report';
        default:
          return 'Production Report';
      }
    };

    return (
      <div ref={ref} className="bg-white p-8 print:p-4">
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {getReportTitle()}
          </h1>
          <p className="text-sm text-gray-600">
            Period: {format(new Date(dateFrom), 'dd MMM yyyy')} to{' '}
            {format(new Date(dateTo), 'dd MMM yyyy')}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}
          </p>
        </div>

        {/* Machine Report */}
        {reportType === 'machine' && machineData && (
          <div>
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Machine Name
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Machine Code
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">
                    Total Quantity
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">
                    Entries
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">
                    Wastage
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">
                    Efficiency %
                  </th>
                </tr>
              </thead>
              <tbody>
                {machineData.map((machine, idx) => {
                  const efficiency =
                    machine.total_quantity > 0
                      ? ((machine.total_quantity - machine.total_wastage) /
                          machine.total_quantity) *
                        100
                      : 0;
                  return (
                    <tr key={idx}>
                      <td className="border border-gray-300 px-4 py-2">
                        {machine.machine_name}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {machine.machine_code}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {machine.total_quantity.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {machine.entry_count}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {machine.total_wastage.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                        {efficiency.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={2} className="border border-gray-300 px-4 py-2">
                    Total
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {machineData
                      .reduce((sum, m) => sum + m.total_quantity, 0)
                      .toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {machineData.reduce((sum, m) => sum + m.entry_count, 0)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {machineData
                      .reduce((sum, m) => sum + m.total_wastage, 0)
                      .toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-4 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Size Report */}
        {reportType === 'size' && sizeData && (
          <div>
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Size/Dimension
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">
                    Total Quantity
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">
                    Number of Entries
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">
                    Avg per Entry
                  </th>
                </tr>
              </thead>
              <tbody>
                {sizeData.map((size, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 px-4 py-2">
                      {size.size}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {size.total_quantity.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {size.entry_count}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {(size.total_quantity / size.entry_count).toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td className="border border-gray-300 px-4 py-2">Total</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {sizeData
                      .reduce((sum, s) => sum + s.total_quantity, 0)
                      .toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {sizeData.reduce((sum, s) => sum + s.entry_count, 0)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Order Report */}
        {reportType === 'order' && orderData && (
          <div>
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">
                    Order No
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left">
                    Customer
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left">
                    Product
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right">
                    Ordered
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right">
                    Produced
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right">
                    Dispatched
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right">
                    Balance
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-right">
                    Completion
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderData.map((order, idx) => {
                  const completion =
                    (order.produced_quantity / order.ordered_quantity) * 100;
                  return (
                    <tr key={idx}>
                      <td className="border border-gray-300 px-3 py-2">
                        {order.order_no}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {order.customer_name}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {order.product}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right">
                        {order.ordered_quantity.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                        {order.produced_quantity.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                        {order.dispatched_quantity.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                        {order.balance_quantity.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                        {completion.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={3} className="border border-gray-300 px-3 py-2">
                    Total
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {orderData
                      .reduce((sum, o) => sum + o.ordered_quantity, 0)
                      .toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {orderData
                      .reduce((sum, o) => sum + o.produced_quantity, 0)
                      .toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {orderData
                      .reduce((sum, o) => sum + o.dispatched_quantity, 0)
                      .toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {orderData
                      .reduce((sum, o) => sum + o.balance_quantity, 0)
                      .toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600">
          <div className="flex justify-between">
            <div>
              <p className="font-semibold">Prepared By:</p>
              <p className="mt-8">_______________________</p>
            </div>
            <div>
              <p className="font-semibold">Authorized Signatory:</p>
              <p className="mt-8">_______________________</p>
            </div>
          </div>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .no-print {
              display: none !important;
            }
            @page {
              margin: 1cm;
            }
          }
        `}</style>
      </div>
    );
  }
);

ProductionReportPrint.displayName = 'ProductionReportPrint';
