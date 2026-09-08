import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Student, Hostel, Order } from '../types';
import { Users, MapPin, PhoneCall, MessageCircle, Search, ShoppingBag, X } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

export const AdminStudentsPage: React.FC = () => {
  const [tab, setTab] = useState<'STUDENTS' | 'LOCATIONS'>('STUDENTS');
  const [students, setStudents] = useState<Student[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedHostelFilter, setSelectedHostelFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  // Customer order history modal
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentOrders, setStudentOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, hData] = await Promise.all([
        api.getStudents(search.trim() || undefined),
        api.getHostels(),
      ]);
      setStudents(sData);
      setHostels(hData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleToggleStatus = async (studentId: number, currentActive: boolean) => {
    const action = currentActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this customer?`)) return;

    try {
      await api.updateStudentStatus(studentId, !currentActive);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to update status');
    }
  };

  const handleOpenOrdersModal = async (student: Student) => {
    setSelectedStudent(student);
    setLoadingOrders(true);
    try {
      const orders = await api.getStudentOrdersAdmin(student.id);
      setStudentOrders(orders);
    } catch (e) {
      console.error('Failed to load customer orders', e);
      setStudentOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (selectedHostelFilter === 'ALL') return true;
    return s.hostel?.name === selectedHostelFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            <span>Customers & Service Locations</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Customer directory, delivery locations (e.g. Mahadev Hostel), and active status controls
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setTab('STUDENTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === 'STUDENTS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Customers Roster ({students.length})
          </button>
          <button
            onClick={() => setTab('LOCATIONS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === 'LOCATIONS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Service Locations ({hostels.length})
          </button>
        </div>
      </div>

      {tab === 'STUDENTS' ? (
        <div className="space-y-4">
          {/* Search bar & Location Filter Chips */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers by name, mobile number, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs font-medium focus:outline-none"
              />
            </div>

            {/* Location filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedHostelFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedHostelFilter === 'ALL'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Locations ({students.length})
              </button>
              {hostels.map((h) => {
                const count = students.filter((s) => s.hostel?.id === h.id).length;
                return (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHostelFilter(h.name)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      selectedHostelFilter === h.name
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {h.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4">Service Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No customers found matching the search or location filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-900">{s.fullName}</td>
                        <td className="py-3 px-4 font-mono">{s.phoneNumber}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{s.hostel ? s.hostel.name : 'Unassigned'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              s.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {s.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenOrdersModal(s)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-1"
                              title="View Past Orders"
                            >
                              <ShoppingBag className="w-3.5 h-3.5 text-brand-600" />
                              <span>Orders</span>
                            </button>
                            <a
                              href={`tel:${s.phoneNumber}`}
                              className="p-1.5 rounded-lg border hover:bg-slate-50 text-emerald-600"
                              title="Call"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`https://wa.me/91${s.phoneNumber.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg border hover:bg-slate-50 text-emerald-600"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleToggleStatus(s.id, s.active)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                s.active
                                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {s.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Service Locations Tab */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Service Locations Info Notice */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center gap-2.5 text-xs text-slate-700">
            <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
            <span>Hostels and delivery locations are configured centrally by the system developer.</span>
          </div>

          {/* Existing Service Locations List */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-600" />
              <span>Current Service Locations</span>
            </h3>

            <div className="space-y-2">
              {hostels.map((h) => {
                const count = students.filter((s) => s.hostel?.id === h.id).length;
                return (
                  <div key={h.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">{h.name}</span>
                      <span className="text-slate-500 block text-[11px] mt-0.5">{h.address || 'No landmark specified'}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-[11px] font-bold">
                      {count} {count === 1 ? 'customer' : 'customers'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER ORDERS MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col animate-scaleUp">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-brand-600" />
                  <span>Order History for {selectedStudent.fullName}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mobile: +91 {selectedStudent.phoneNumber} • Location: {selectedStudent.hostel?.name || 'Unassigned'}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3">
              {loadingOrders ? (
                <div className="p-8 text-center text-xs text-slate-400 font-semibold">Loading orders...</div>
              ) : studentOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No dinner orders placed yet by this customer.</div>
              ) : (
                studentOrders.map((o) => (
                  <div key={o.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-slate-400">#{o.id}</span>
                        <span className="font-black text-slate-900 text-sm">
                          {formatDateDDMMYYYY(o.orderDate)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          o.orderType === 'FULL' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                        }`}>
                          {o.orderType} DINNER
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium">
                        Sabzi: <strong className="text-slate-900">{o.selectedSabzi || 'Daily Special'}</strong>
                        {o.extraRotis && o.extraRotis > 0 ? (
                          <span className="text-brand-600 font-bold ml-2">({o.extraRotis} Extra Rotis)</span>
                        ) : null}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-slate-900 block">
                        ₹{Number(o.priceAtOrder).toFixed(2)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        o.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudentsPage;

