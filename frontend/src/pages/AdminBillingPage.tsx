import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { MonthlyBill, BillStatus, Hostel } from '../types';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { AddExtraChargeModal } from '../components/AddExtraChargeModal';
import { PrintableBillModal } from '../components/PrintableBillModal';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import {
  FileSpreadsheet,
  PhoneCall,
  MessageCircle,
  IndianRupee,
  Printer,
  Search,
  RefreshCw,
  Sparkles,
  MapPin,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  ExternalLink,
  X,
  FileText
} from 'lucide-react';

export const AdminBillingPage: React.FC = () => {
  const currentYearMonth = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7);
  const [month, setMonth] = useState<string>(currentYearMonth);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<BillStatus | ''>('');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'location' | 'outstanding'>('name');

  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null);

  // Modals state
  const [paymentModalData, setPaymentModalData] = useState<{ id: number; name: string; outstanding: number } | null>(null);
  const [extraModalData, setExtraModalData] = useState<{ id: number; name: string } | null>(null);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<MonthlyBill | null>(null);
  const [selectedBillForWhatsApp, setSelectedBillForWhatsApp] = useState<MonthlyBill | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  const loadBills = async () => {
    setLoading(true);
    try {
      const data = await api.getBillingSheet(
        month,
        selectedHostelId !== '' ? Number(selectedHostelId) : undefined,
        statusFilter !== '' ? statusFilter : undefined,
        search.trim() || undefined
      );
      setBills(data);
    } catch (e) {
      console.error('Failed to load bills', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getHostels().then(setHostels).catch(console.error);
  }, []);

  useEffect(() => {
    loadBills();
  }, [month, selectedHostelId, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadBills();
  };

  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      await api.generateAllBills(month);
      await loadBills();
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkAsPaid = async (billId: number) => {
    setMarkingPaidId(billId);
    try {
      await api.markBillAsPaid(billId);
      await loadBills();
    } catch (e: any) {
      alert(e.message || 'Failed to mark as paid');
    } finally {
      setMarkingPaidId(null);
    }
  };

  // Trigger PDF download for student
  const downloadBillPdf = async (studentId: number, studentName: string, monthYear: string) => {
    setDownloadingPdf(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/billing/pdf/${studentId}?month=${monthYear}`, {
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
      link.download = `HadkarMeals_Invoice_${studentName.replace(/\s+/g, '_')}_${monthYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('PDF download error:', err);
      alert('Could not download PDF automatically: ' + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const changeMonth = (offset: number) => {
    const [y, m] = month.split('-').map(Number);
    const date = new Date(y, m - 1 + offset, 1);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    setMonth(`${newY}-${newM}`);
  };

  const totalOutstanding = bills.reduce((acc, b) => acc + Number(b.outstandingBalance || 0), 0);
  const totalPaid = bills.reduce((acc, b) => acc + Number(b.paidAmount || 0), 0);
  const totalBilled = bills.reduce((acc, b) => acc + Number(b.totalAmount || 0), 0);

  // Sorting
  const sortedBills = [...bills].sort((a, b) => {
    if (sortBy === 'location') {
      return (a.hostelName || '').localeCompare(b.hostelName || '');
    } else if (sortBy === 'outstanding') {
      return Number(b.outstandingBalance) - Number(a.outstandingBalance);
    }
    return (a.studentName || '').localeCompare(b.studentName || '');
  });

  // Construct complete WhatsApp Invoice message for selected bill
  const getWhatsAppMessageText = (b: MonthlyBill): string => {
    if (b.whatsappMessage) return b.whatsappMessage;
    const isPaid = Number(b.outstandingBalance) <= 0;
    const statusText = isPaid ? 'PAID' : 'UNPAID';
    const envApiUrl = (import.meta as any).env?.VITE_API_URL;
    const backendBase = envApiUrl
      ? envApiUrl.replace(/\/api\/?$/, '')
      : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'http://localhost:8081');
    const frontendBase = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5174';

    return `🍱 *HADKAR MEALS - MONTHLY DINNER INVOICE*\n👤 *Customer:* ${b.studentName}\n📍 *Hostel:* ${b.hostelName}\n📅 *Billing Month:* ${b.monthYear}\n\n*Bill Breakdown:*\n🍱 Food Charges: ₹${b.foodCharges}\n➕ Extra Charges: ₹${b.extraCharges}\n💰 Previous Balance: ₹${b.previousBalance}\n─────────────────────\n*Total Bill:* ₹${b.totalAmount}\n*Paid Amount:* ₹${b.paidAmount}\n*Status:* ${statusText}\n*🔴 Net Balance Due:* ₹${b.outstandingBalance}\n\n📄 *Download Monthly Invoice PDF:*\n${backendBase}/api/billing/pdf/${b.studentId}?month=${b.monthYear}\n\n💳 *UPI ID:* umeshhadkar02-1@okicici\n📞 *Contact / Phone:* +91 97027 62707\n📲 *Direct UPI Pay:* upi://pay?pa=umeshhadkar02-1@okicici&pn=HadkarMeals&am=${b.outstandingBalance}\n🖼️ *Scan UPI QR Code:* ${frontendBase}/assets/hadkar_upi_qr.jpg\n\nPlease share payment confirmation screenshot once done. Thank you! 🙏`;
  };

  const handleOpenWhatsApp = (b: MonthlyBill) => {
    // Also trigger the PDF download so user has the PDF ready to attach if needed
    downloadBillPdf(b.studentId, b.studentName, b.monthYear);

    const cleanPhone = b.phoneNumber.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : '91' + cleanPhone;
    const text = getWhatsAppMessageText(b);
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-brand-600" />
            <span>Monthly Billing Sheet</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Customer billing ledger, monthly invoice PDFs, UPI WhatsApp dispatch & 1-click Paid verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadBills}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleGenerateAll}
            disabled={generating}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/30 flex items-center gap-1.5 transition-all disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{generating ? 'Calculating...' : 'Recalculate All Bills'}</span>
          </button>
        </div>
      </div>

      {/* Month Switcher & Totals Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Month Selector */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center min-w-[140px]">
            <span className="text-lg sm:text-xl font-black text-slate-900 capitalize">
              {new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <button
            onClick={() => changeMonth(1)}
            className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Summary Metrics */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-8 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 w-full md:w-auto">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Billed</span>
            <span className="text-lg font-black text-slate-900">₹{totalBilled.toFixed(0)}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Paid / Collected</span>
            <span className="text-lg font-black text-emerald-600">₹{totalPaid.toFixed(0)}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Pending Dues</span>
            <span className="text-lg font-black text-red-600">₹{totalOutstanding.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar: Location, Binary Status (PAID / UNPAID), Search, Sort */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Location filter */}
          <div className="relative">
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <select
              value={selectedHostelId}
              onChange={(e) => setSelectedHostelId(e.target.value === '' ? '' : Number(e.target.value))}
              className="pl-8 pr-3 py-2 text-xs font-bold text-slate-800 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Locations ({hostels.length})</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Strictly Binary Status Filter: PAID or UNPAID */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs font-bold text-slate-800 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Bills (Paid & Unpaid)</option>
            <option value="UNPAID">🔴 UNPAID (Has Pending Dues)</option>
            <option value="PAID">🟢 PAID (Fully Cleared)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-xs font-bold text-slate-800 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="name">Sort by Name</option>
            <option value="location">Sort by Location</option>
            <option value="outstanding">Sort by Pending Due (Highest)</option>
          </select>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-64 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name..."
            className="w-full pl-8 pr-3 py-2 text-xs font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </form>
      </div>

      {/* Spreadsheet Billing Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Delivery Location</th>
                <th className="py-3.5 px-4 text-right">Food Charges</th>
                <th className="py-3.5 px-4 text-right">Extras</th>
                <th className="py-3.5 px-4 text-right">Previous Due</th>
                <th className="py-3.5 px-4 text-right">Total Bill</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">1-Click Verification</th>
                <th className="py-3.5 px-4 text-right">Send Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400 font-bold">
                    Loading billing records...
                  </td>
                </tr>
              ) : sortedBills.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400 font-medium">
                    No billing records found for this month ({month}). Click "Recalculate All Bills" to generate.
                  </td>
                </tr>
              ) : (
                sortedBills.map((b) => {
                  const isPaid = b.status === 'PAID' || Number(b.outstandingBalance || 0) <= 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block text-sm">{b.studentName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{b.phoneNumber}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                          <span>{b.hostelName}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                        ₹{Number(b.foodCharges || 0).toFixed(0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                        ₹{Number(b.extraCharges || 0).toFixed(0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                        ₹{Number(b.previousBalance || 0).toFixed(0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        ₹{Number(b.totalAmount || 0).toFixed(0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        ₹{Number(b.paidAmount || 0).toFixed(0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black">
                        <span className={!isPaid ? 'text-red-600 text-sm' : 'text-emerald-700'}>
                          ₹{Number(b.outstandingBalance || 0).toFixed(0)}
                        </span>
                      </td>

                      {/* STRICTLY BINARY STATUS: 🟢 PAID or 🔴 UNPAID */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isPaid ? '🟢 PAID' : '🔴 UNPAID'}
                        </span>
                      </td>

                      {/* 1-CLICK MARK AS PAID TICK BUTTON */}
                      <td className="py-3.5 px-4 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Cleared</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkAsPaid(b.id)}
                            disabled={markingPaidId === b.id}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-3 py-1 rounded-lg shadow-xs transition-all disabled:opacity-50"
                            title="Mark this customer's bill as fully paid"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{markingPaidId === b.id ? 'Saving...' : 'Mark Paid'}</span>
                          </button>
                        )}
                      </td>

                      {/* ACTIONS: Send on WhatsApp, View/Download PDF, Call */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Call */}
                          <a
                            href={`tel:${b.phoneNumber}`}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="Call Customer"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </a>

                          {/* Primary: Send on WhatsApp Modal */}
                          <button
                            onClick={() => setSelectedBillForWhatsApp(b)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                            title="Send Monthly Invoice on WhatsApp with PDF, QR Code & UPI"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>

                          {/* Print / View PDF Invoice */}
                          <button
                            onClick={() => setSelectedBillForPrint(b)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                            title="View / Print PDF Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── HIGH-END MODAL: SEND MONTHLY INVOICE ON WHATSAPP ── */}
      {selectedBillForWhatsApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Send Monthly Invoice on WhatsApp</h3>
                  <p className="text-xs text-slate-500">Invoice PDF, UPI QR code, UPI ID & Phone text</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBillForWhatsApp(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Dues Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-900 block">{selectedBillForWhatsApp.studentName}</span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {selectedBillForWhatsApp.hostelName} • {selectedBillForWhatsApp.phoneNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Pending Balance</span>
                <span className="text-lg font-black text-red-600">
                  ₹{Number(selectedBillForWhatsApp.outstandingBalance || 0).toFixed(0)}
                </span>
              </div>
            </div>

            {/* 1. Monthly Invoice PDF Box */}
            <div className="p-3.5 rounded-2xl bg-brand-50/60 border border-brand-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-brand-950 block truncate">
                    {selectedBillForWhatsApp.studentName.split(' ')[0]}_Monthly_Invoice_{selectedBillForWhatsApp.monthYear}.pdf
                  </span>
                  <span className="text-[10px] font-medium text-brand-700">Official Hadkar Meals PDF Invoice</span>
                </div>
              </div>

              <button
                onClick={() => downloadBillPdf(selectedBillForWhatsApp.studentId, selectedBillForWhatsApp.studentName, selectedBillForWhatsApp.monthYear)}
                disabled={downloadingPdf}
                className="px-3 py-1.5 rounded-xl bg-white border border-brand-300 hover:bg-brand-50 text-brand-900 text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-2xs transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-brand-600" />
                <span>{downloadingPdf ? 'Downloading...' : 'Download PDF'}</span>
              </button>
            </div>

            {/* 2. QR Code & UPI Text Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-4">
              <img
                src="/assets/hadkar_upi_qr.jpg"
                alt="Hadkar Meals UPI QR"
                className="w-24 h-24 rounded-xl border border-slate-200 bg-white object-contain p-1 shrink-0 shadow-2xs"
              />
              <div className="space-y-1.5 min-w-0 flex-1 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">UPI ID (Text Format)</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-black text-brand-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      hadkarmeals@okaxis
                    </span>
                    <button
                      onClick={() => handleCopyText('hadkarmeals@okaxis')}
                      className="text-slate-400 hover:text-slate-700 p-1"
                      title="Copy UPI ID"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Contact Phone Number</span>
                  <span className="font-mono font-bold text-slate-800">+91 97027 62707</span>
                </div>
              </div>
            </div>

            {/* 3. WhatsApp Message Preview Box */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span>Message Sent to Customer</span>
                <button
                  onClick={() => handleCopyText(getWhatsAppMessageText(selectedBillForWhatsApp))}
                  className="text-brand-600 hover:underline flex items-center gap-1 normal-case font-bold"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Full Message</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-slate-900 text-slate-200 rounded-2xl text-[11px] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed border border-slate-800">
                {getWhatsAppMessageText(selectedBillForWhatsApp)}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => handleOpenWhatsApp(selectedBillForWhatsApp)}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Open WhatsApp & Send Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleMarkAsPaid(selectedBillForWhatsApp.id);
                  setSelectedBillForWhatsApp(null);
                }}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Mark Paid</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Bill Modal (With working PDF download) */}
      <PrintableBillModal
        bill={selectedBillForPrint}
        isOpen={!!selectedBillForPrint}
        onClose={() => setSelectedBillForPrint(null)}
      />

      {/* Record Payment Modal */}
      {paymentModalData && (
        <RecordPaymentModal
          studentId={paymentModalData.id}
          studentName={paymentModalData.name}
          outstandingBalance={paymentModalData.outstanding}
          isOpen={!!paymentModalData}
          onClose={() => setPaymentModalData(null)}
          onSuccess={loadBills}
        />
      )}

      {/* Add Extra Charge Modal */}
      {extraModalData && (
        <AddExtraChargeModal
          studentId={extraModalData.id}
          studentName={extraModalData.name}
          isOpen={!!extraModalData}
          onClose={() => setExtraModalData(null)}
          onSuccess={loadBills}
        />
      )}
    </div>
  );
};

export default AdminBillingPage;
