import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { MonthlyBill } from '../types';
import { PrintableBillModal } from '../components/PrintableBillModal';
import {
  Receipt,
  Download,
  Printer,
  ChevronRight,
  Sparkles,
  IndianRupee,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDateDDMMYYYY, formatMonthYearDDMMYYYY } from '../utils/dateUtils';

export const StudentBillsPage: React.FC = () => {
  const [currentBill, setCurrentBill] = useState<MonthlyBill | null>(null);
  const [billHistory, setBillHistory] = useState<MonthlyBill[]>([]);
  const [selectedBillForModal, setSelectedBillForModal] = useState<MonthlyBill | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([api.getMyBill(), api.getMyBillHistory()])
      .then(([curr, hist]) => {
        setCurrentBill(curr);
        setBillHistory(hist);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadPdf = async (bill: MonthlyBill) => {
    try {
      setDownloadingPdf(true);
      await api.downloadInvoicePdf(bill.studentId, bill.monthYear);
    } catch (e: any) {
      alert(e.message || 'Failed to download PDF invoice');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
          <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
          <span>My Monthly Bills</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Automatic billing calculation, payment verification, and official PDF invoices
        </p>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-100 animate-pulse rounded-3xl border border-slate-200" />
      ) : !currentBill ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center text-2xl mx-auto">
            📅
          </div>
          <h3 className="font-bold text-slate-800 text-base">No Bill Generated Yet</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Your monthly statement will be generated automatically at the end of the billing cycle.
          </p>
          <div className="pt-2">
            <Link
              to="/student/ledger"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              <span>View Transaction History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-7 shadow-sm space-y-5">
          {/* Bill Top Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                Current Billing Cycle
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
                {formatMonthYearDDMMYYYY(currentBill.monthYear)}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide border ${
                  currentBill.status === 'PAID' || Number(currentBill.outstandingBalance || 0) <= 0
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                }`}
              >
                {currentBill.status === 'PAID' || Number(currentBill.outstandingBalance || 0) <= 0 ? '🟢 PAID' : '🔴 UNPAID'}
              </span>
            </div>
          </div>

          {/* Formula Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-100">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block uppercase">
                Food Charges
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5 block">
                ₹{Number(currentBill.foodCharges).toFixed(2)}
              </span>
            </div>

            <div className="bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-100">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block uppercase">
                ➕ Extra Charges
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5 block">
                ₹{Number(currentBill.extraCharges).toFixed(2)}
              </span>
            </div>

            <div className="bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-100">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block uppercase">
                💰 Prev Balance
              </span>
              <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5 block">
                ₹{Number(currentBill.previousBalance).toFixed(2)}
              </span>
            </div>

            <div className="bg-orange-50 p-3 sm:p-3.5 rounded-2xl border border-orange-200">
              <span className="text-[10px] sm:text-[11px] font-semibold text-orange-700 block uppercase">
                Total Bill
              </span>
              <span className="text-base sm:text-lg font-black text-orange-950 mt-0.5 block">
                ₹{Number(currentBill.totalAmount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Paid vs Outstanding Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between sm:justify-start sm:gap-4 border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
              <div>
                <span className="text-xs text-emerald-800 font-bold uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Amount Paid
                </span>
                <span className="text-xl font-extrabold text-emerald-700 mt-0.5 block">
                  ₹{Number(currentBill.paidAmount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-start sm:gap-4">
              <div>
                <span className="text-xs text-red-800 font-bold uppercase flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-red-600" />
                  Remaining Balance
                </span>
                <span className="text-2xl font-black text-red-600 mt-0.5 block">
                  ₹{Number(currentBill.outstandingBalance).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-2">
            <button
              onClick={() => setSelectedBillForModal(currentBill)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>View & Print Invoice</span>
            </button>

            <button
              onClick={() => handleDownloadPdf(currentBill)}
              disabled={downloadingPdf}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 shadow-xs"
            >
              <Download className="w-4 h-4 text-orange-600" />
              <span>{downloadingPdf ? 'Downloading...' : 'Download Official PDF'}</span>
            </button>

            <Link
              to="/student/ledger"
              className="px-4 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors sm:ml-auto"
            >
              <span>View Transaction History</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* UPI Payment Instructions Card with Demo QR Code */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-amber-950 flex flex-col sm:flex-row items-center gap-4 sm:gap-5 text-xs shadow-xs">
        <img
          src="/assets/hadkar_upi_qr.jpg"
          alt="Hadkar Meals UPI QR"
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-amber-200 bg-white object-contain p-1 shrink-0 shadow-xs"
        />
        <div className="space-y-2 flex-1 w-full text-center sm:text-left">
          <h3 className="font-black text-sm text-amber-950 flex items-center justify-center sm:justify-start gap-1.5">
            <IndianRupee className="w-4 h-4 text-orange-600" />
            <span>How to Pay Your Tiffin Bill</span>
          </h3>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span>Transfer via UPI to:</span>
            <button
              onClick={() => copyToClipboard('hadkarmeals@okaxis')}
              className="inline-flex items-center gap-1.5 font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-amber-300 text-slate-900 hover:bg-amber-100/50 transition-colors cursor-pointer"
              title="Click to copy UPI ID"
            >
              <span>hadkarmeals@okaxis</span>
              <span className="text-[10px] text-orange-600 font-sans font-bold">
                {copiedUpi ? '✓ Copied!' : '📋 Copy'}
              </span>
            </button>
          </div>
          <p className="text-slate-600">
            Or scan the QR code directly from Google Pay, PhonePe, Paytm, or BHIM.
          </p>
          <p className="text-[11px] text-amber-800">
            Once paid, kitchen admin will verify your payment and mark your status as <strong>PAID</strong>.
          </p>
        </div>
      </div>

      {/* Bill History */}
      {billHistory.length > 1 && (
        <div className="space-y-3">
          <h3 className="font-bold text-base text-slate-900">Previous Monthly Bills</h3>
          <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {billHistory.map((b) => (
              <div key={b.id} className="p-4 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 text-sm block">{formatMonthYearDDMMYYYY(b.monthYear)}</span>
                  <span className="text-slate-500">
                    Total: ₹{Number(b.totalAmount).toFixed(2)} • Paid: ₹{Number(b.paidAmount).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-red-600">Balance: ₹{Number(b.outstandingBalance).toFixed(2)}</span>
                  <button
                    onClick={() => setSelectedBillForModal(b)}
                    className="p-1.5 rounded-lg border hover:bg-slate-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Printable Invoice Modal */}
      <PrintableBillModal
        bill={selectedBillForModal}
        isOpen={!!selectedBillForModal}
        onClose={() => setSelectedBillForModal(null)}
      />
    </div>
  );
};
