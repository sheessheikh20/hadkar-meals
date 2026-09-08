import React, { useState } from 'react';
import { MonthlyBill } from '../types';
import { X, Printer, Download, CheckCircle2, Loader2, IndianRupee } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

interface Props {
  bill: MonthlyBill | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintableBillModal: React.FC<Props> = ({ bill, isOpen, onClose }) => {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/billing/pdf/${bill.studentId}?month=${bill.monthYear}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF from server.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `HadkarMeals_Bill_${bill.studentName.replace(/\s+/g, '_')}_${bill.monthYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.warn('Backend PDF fetch fallback to print dialog:', err);
      // Fallback to browser print/save as PDF
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const cleanMonthDisplay = bill.monthYear ? formatDateDDMMYYYY(`${bill.monthYear}-01`).slice(3) : '—'; // e.g. 09/2026

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white print:hidden">
          <span className="font-black text-sm flex items-center gap-2">
            <span>🍱</span>
            <span>Monthly Dinner Tiffin Bill Invoice</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white text-xs font-bold transition-all disabled:opacity-60 shadow-md shadow-brand-600/30"
              title="Download PDF file"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
              title="Print or Save via Browser"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Section */}
        <div id="printable-section" className="p-6 sm:p-8 overflow-y-auto bg-white text-slate-800 text-sm">
          {/* Header */}
          <div className="text-center border-b border-slate-200 pb-6 mb-6">
            <div className="inline-flex items-center gap-2 text-2xl font-black text-slate-900">
              <span>🍱 HADKAR <span className="text-brand-600">MEALS</span></span>
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              Fresh Meals. Every Day. • Ghar Ka Khana, Hostel Tak.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Phone: +91 97027 62707 • UPI ID: umeshhadkar02-1@okicici
            </p>
          </div>

          {/* Title bar */}
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Details</span>
              <h3 className="font-extrabold text-lg text-slate-900">{bill.studentName}</h3>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                Delivery Location: {bill.hostelName}
              </p>
              <p className="text-xs text-slate-500">Phone: {bill.phoneNumber}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billing Month</span>
              <p className="font-extrabold text-lg text-brand-600">{cleanMonthDisplay} ({bill.monthYear})</p>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                bill.status === 'PAID'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {bill.status === 'PAID' ? '✓ PAID' : bill.status}
              </span>
            </div>
          </div>

          {/* Charges Table */}
          <table className="w-full text-left border-collapse mb-6">
            <thead>
              <tr className="border-b-2 border-slate-200 text-xs font-bold uppercase text-slate-600 bg-slate-50">
                <th className="py-3 px-4">Item & Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3.5 px-4">
                  <span className="font-bold text-slate-800">Daily Dinner Tiffin Meal Charges</span>
                  <p className="text-xs text-slate-500">Includes all confirmed dinner orders with chosen sabzi</p>
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-slate-900">₹{Number(bill.foodCharges).toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4">
                  <span className="font-bold text-slate-800">Extra Rotis & Add-ons</span>
                  <p className="text-xs text-slate-500">Extra rotis ordered @ ₹6/pc and extras</p>
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-slate-900">₹{Number(bill.extraCharges).toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4">
                  <span className="font-bold text-slate-800">Previous Month Outstanding Balance</span>
                  <p className="text-xs text-slate-500">Carried forward dues</p>
                </td>
                <td className="py-3.5 px-4 text-right font-bold text-slate-900">₹{Number(bill.previousBalance).toFixed(2)}</td>
              </tr>
              <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                <td className="py-3.5 px-4 text-sm">TOTAL BILL AMOUNT</td>
                <td className="py-3.5 px-4 text-right text-base">₹{Number(bill.totalAmount).toFixed(2)}</td>
              </tr>
              <tr className="text-emerald-700 font-bold">
                <td className="py-3 px-4">Paid / Credited Amount</td>
                <td className="py-3 px-4 text-right">(-) ₹{Number(bill.paidAmount).toFixed(2)}</td>
              </tr>
              <tr className="bg-red-50 text-red-900 font-black border-t-2 border-red-200">
                <td className="py-4 px-4 text-base">NET REMAINING BALANCE DUE</td>
                <td className="py-4 px-4 text-right text-xl text-red-600">₹{Number(bill.outstandingBalance).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Payment Info & QR Instructions */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
            <p className="font-black text-slate-900">Payment Instructions:</p>
            <p className="text-slate-600">• Pay via UPI: <strong className="text-brand-700 font-mono font-bold">umeshhadkar02-1@okicici</strong></p>
            <p className="text-slate-600">• Or pay via Cash directly to the Hadkar Meals service desk.</p>
            <p className="text-slate-600">• After paying, share screenshot on WhatsApp to <strong>+91 97027 62707</strong>.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PrintableBillModal;
