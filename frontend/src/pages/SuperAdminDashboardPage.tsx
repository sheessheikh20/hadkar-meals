import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { MenuItem, Hostel, MenuItemCategory } from '../types';
import {
  UtensilsCrossed,
  MapPin,
  Shield,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
  Edit2,
  Sparkles,
  Search
} from 'lucide-react';

export const SuperAdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DISHES' | 'LOCATIONS' | 'CLIENT' | 'SYSTEM'>('DISHES');

  // Menu items state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [dishSearch, setDishSearch] = useState('');
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [dishName, setDishName] = useState('');
  const [dishCategory, setDishCategory] = useState<MenuItemCategory>('SABZI');
  const [dishDescription, setDishDescription] = useState('');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Hostels state
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [hostelSearch, setHostelSearch] = useState('');
  const [showAddHostelModal, setShowAddHostelModal] = useState(false);
  const [hostelName, setHostelName] = useState('');
  const [hostelAddress, setHostelAddress] = useState('');

  // Client management state
  const [clientPassword, setClientPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Status & loading
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog();
    loadHostels();
  }, []);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const items = await api.getMenuItems();
      setMenuItems(items);
    } catch (e) {
      console.error('Failed to load menu items', e);
    } finally {
      setLoading(false);
    }
  };

  const loadHostels = async () => {
    try {
      const data = await api.getHostels();
      setHostels(data);
    } catch (e) {
      console.error('Failed to load hostels', e);
    }
  };

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim()) return;

    try {
      setLoading(true);
      if (editingItem) {
        await api.updateMenuItem(editingItem.id, {
          name: dishName.trim(),
          category: dishCategory,
          description: dishDescription.trim() || undefined,
        });
        setActionMessage(`Updated "${dishName}" successfully!`);
      } else {
        await api.createMenuItem({
          name: dishName.trim(),
          category: dishCategory,
          description: dishDescription.trim() || undefined,
        });
        setActionMessage(`Added new dish "${dishName}" to master catalog!`);
      }

      setDishName('');
      setDishDescription('');
      setEditingItem(null);
      setShowAddDishModal(false);
      await loadCatalog();
    } catch (err: any) {
      alert(err.message || 'Failed to save menu item');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDish = async (id: number) => {
    try {
      await api.toggleMenuItem(id);
      await loadCatalog();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDeleteDish = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from master catalog?`)) return;
    try {
      await api.deleteMenuItem(id);
      setActionMessage(`Deleted "${name}" from catalog.`);
      await loadCatalog();
    } catch (err: any) {
      alert(err.message || 'Failed to delete menu item');
    }
  };

  const handleCreateHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostelName.trim()) return;

    try {
      setLoading(true);
      await api.createHostel({
        name: hostelName.trim(),
        address: hostelAddress.trim() || undefined,
      });
      setActionMessage(`Added delivery location "${hostelName}"!`);
      setHostelName('');
      setHostelAddress('');
      setShowAddHostelModal(false);
      await loadHostels();
    } catch (err: any) {
      alert(err.message || 'Failed to add hostel');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHostel = async (id: number) => {
    try {
      await api.toggleHostel(id);
      await loadHostels();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle hostel');
    }
  };

  const handleDeleteHostel = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete location "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteHostel(id);
      setActionMessage(`Deleted location "${name}" from service areas.`);
      await loadHostels();
    } catch (err: any) {
      alert(err.message || 'Failed to delete location');
    }
  };

  const handleResetClientPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientPassword || clientPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.resetClientPassword('admin@hadkarmeals.com', clientPassword);
      setPasswordSuccess(res.message);
      setClientPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to reset client password');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter((i) => {
    const matchesCategory = selectedCategory === 'ALL' || i.category === selectedCategory;
    const matchesSearch = !dishSearch.trim() ||
      i.name.toLowerCase().includes(dishSearch.toLowerCase().trim()) ||
      (i.description && i.description.toLowerCase().includes(dishSearch.toLowerCase().trim()));
    return matchesCategory && matchesSearch;
  });

  const filteredHostels = hostels.filter((h) => {
    if (!hostelSearch.trim()) return true;
    const q = hostelSearch.toLowerCase().trim();
    return h.name.toLowerCase().includes(q) || (h.address && h.address.toLowerCase().includes(q));
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* System Admin Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl mb-8 flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-2xl">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">System & Catalog Configuration</h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider">
                Admin Access
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">
              Manage master dishes catalog, service locations, and database configurations.
            </p>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 sm:gap-4 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('DISHES')}
          className={`py-3 px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'DISHES'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Master Dishes Catalog ({menuItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LOCATIONS')}
          className={`py-3 px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'LOCATIONS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Service Locations ({hostels.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CLIENT')}
          className={`py-3 px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'CLIENT'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Client Admin Account</span>
        </button>

        <button
          onClick={() => setActiveTab('SYSTEM')}
          className={`py-3 px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'SYSTEM'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>System & Database</span>
        </button>
      </div>

      {/* TAB 1: MASTER DISHES CATALOG */}
      {activeTab === 'DISHES' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="relative min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={dishSearch}
                  onChange={(e) => setDishSearch(e.target.value)}
                  placeholder="Search master dishes..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap items-center gap-1.5">
                {['ALL', 'SABZI', 'DAL', 'ROTI', 'RICE', 'DESSERT', 'EXTRA'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-indigo-100 text-indigo-800 font-black shadow-xs'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'ALL' ? `All Items (${menuItems.length})` : cat}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setEditingItem(null);
                setDishName('');
                setDishCategory('SABZI');
                setDishDescription('');
                setShowAddDishModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Master Dish</span>
            </button>
          </div>

          {/* Dishes Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3">Dish Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-medium">
                      No dishes found in this category. Click "Add New Master Dish" above.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 text-sm">
                        {item.name}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.category === 'SABZI'
                            ? 'bg-amber-100 text-amber-800'
                            : item.category === 'DAL'
                            ? 'bg-orange-100 text-orange-800'
                            : item.category === 'ROTI'
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.category === 'RICE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {item.description || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleDish(item.id)}
                          className={`flex items-center gap-1 font-bold ${
                            item.active ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {item.active ? (
                            <>
                              <ToggleRight className="w-5 h-5 text-emerald-600" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-5 h-5 text-slate-400" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setDishName(item.name);
                            setDishCategory(item.category);
                            setDishDescription(item.description || '');
                            setShowAddDishModal(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit Dish"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDish(item.id, item.name)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Dish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SERVICE LOCATIONS */}
      {activeTab === 'LOCATIONS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Delivery Locations ({hostels.length})</h3>
                <p className="text-xs text-slate-500">
                  Hostels & serviced residences
                </p>
              </div>
              <div className="relative min-w-[200px] max-w-xs sm:ml-4">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={hostelSearch}
                  onChange={(e) => setHostelSearch(e.target.value)}
                  placeholder="Search locations..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>
            </div>

            <button
              onClick={() => setShowAddHostelModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Location</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHostels.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No delivery locations match your search.
              </div>
            ) : (
              filteredHostels.map((h) => (
              <div key={h.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-slate-900 text-base flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-brand-600" />
                      {h.name}
                    </span>
                    <button
                      onClick={() => handleToggleHostel(h.id)}
                      className={`text-xs font-bold ${h.active ? 'text-emerald-600' : 'text-slate-400'}`}
                    >
                      {h.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{h.address || 'Standard Delivery Area'}</p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                   <span className="text-slate-400">ID: #{h.id}</span>
                   <div className="flex items-center gap-3">
                     <button
                       onClick={() => handleToggleHostel(h.id)}
                       className="font-bold text-indigo-600 hover:underline"
                     >
                       Toggle Active
                     </button>
                     <button
                       onClick={() => handleDeleteHostel(h.id, h.name)}
                       className="font-bold text-red-500 hover:underline flex items-center gap-1"
                     >
                       <Trash2 className="w-3 h-3" />
                       Delete
                     </button>
                   </div>
                 </div>
              </div>
            )))}
          </div>
        </div>
      )}

      {/* TAB 3: CLIENT ADMIN ACCOUNT */}
      {activeTab === 'CLIENT' && (
        <div className="max-w-2xl bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900">Client Admin (Tiffin Owner)</h3>
            <p className="text-xs text-slate-500 mt-1">
              The client uses this account to log in to the daily operations portal (menu scheduling, live orders, kitchen prep, and billing).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-bold text-slate-600">Client Login Email:</span>
              <span className="font-mono font-bold text-slate-900">admin@hadkarmeals.com</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-bold text-slate-600">Registered Phone:</span>
              <span className="font-mono font-bold text-slate-900">+91 1234567890</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-bold text-slate-600">Operations Portal URL:</span>
              <span className="font-mono text-brand-600">/admin/dashboard</span>
            </div>
          </div>

          <form onSubmit={handleResetClientPassword} className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <span>Reset Client Password</span>
            </h4>
            <p className="text-xs text-slate-500">
              If your client forgets their login password, set a new password here immediately:
            </p>

            <div className="flex gap-3">
              <input
                type="text"
                required
                value={clientPassword}
                onChange={(e) => setClientPassword(e.target.value)}
                placeholder="Enter new password (e.g. admin123)"
                className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-60"
              >
                {loading ? 'Saving...' : 'Update Password'}
              </button>
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{passwordSuccess}</span>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 4: SYSTEM & DATABASE */}
      {activeTab === 'SYSTEM' && (
        <div className="max-w-2xl bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-slate-900">System Infrastructure</h3>
          <p className="text-xs text-slate-500">
            Current deployment details for the Hadkar Meals system.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-600">Database Engine:</span>
              <span className="font-bold text-slate-900">SQLite (3.45.1.0) with WAL Mode</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-600">Database Path:</span>
              <span className="font-mono text-slate-900">./data/hadkarmeals.db</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-600">Backend Port:</span>
              <span className="font-mono text-slate-900">8081 (Spring Boot 3.3.4)</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-600">Frontend Port:</span>
              <span className="font-mono text-slate-900">5174 (React + Vite)</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <span className="font-bold text-indigo-900">Developer Master User:</span>
              <span className="font-mono font-bold text-indigo-700">0987654321 / developer@hadkarmeals.com</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-600">Operational Hours:</span>
              <span className="font-bold text-slate-900">Dinner Only (7:00 PM – 8:00 PM default window)</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT MASTER DISH */}
      {showAddDishModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-scaleUp">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              {editingItem ? 'Edit Master Dish' : 'Add New Master Dish'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Dishes added here are available for the client to offer in daily dinner menus.
            </p>

            <form onSubmit={handleCreateDish} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Dish Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  placeholder="e.g. Palak Paneer, Rajma Masala, Malai Kofta"
                  className="w-full px-4 py-2.5 text-xs font-bold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={dishCategory}
                  onChange={(e) => setDishCategory(e.target.value as MenuItemCategory)}
                  className="w-full px-4 py-2.5 text-xs font-bold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="SABZI">🥘 SABZI (Vegetable / Gravy / Curry)</option>
                  <option value="DAL">🍲 DAL (Tadka, Fry, Makhani)</option>
                  <option value="ROTI">🫓 ROTI (Phulka, Chapati, Paratha)</option>
                  <option value="RICE">🍚 RICE (Jeera Rice, Steamed, Pulao)</option>
                  <option value="SALAD">🥗 SALAD / RAITA</option>
                  <option value="DESSERT">🍨 DESSERT (Gulab Jamun, Kheer)</option>
                  <option value="EXTRA">➕ EXTRA / SPECIAL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={dishDescription}
                  onChange={(e) => setDishDescription(e.target.value)}
                  placeholder="e.g. Rich spinach puree with fresh cottage cheese"
                  className="w-full px-4 py-2.5 text-xs font-medium text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDishModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-60"
                >
                  {loading ? 'Saving...' : editingItem ? 'Save Changes' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SERVICE LOCATION */}
      {showAddHostelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-scaleUp">
            <h3 className="text-lg font-black text-slate-900 mb-1">Add Delivery Location</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter hostel or location name where Hadkar Meals will deliver tiffins.
            </p>

            <form onSubmit={handleCreateHostel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Hostel / Location Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={hostelName}
                  onChange={(e) => setHostelName(e.target.value)}
                  placeholder="e.g. Mahadev Hostel, Shanti Niwas"
                  className="w-full px-4 py-2.5 text-xs font-bold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Address / Landmark <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={hostelAddress}
                  onChange={(e) => setHostelAddress(e.target.value)}
                  placeholder="e.g. Near City Engineering College"
                  className="w-full px-4 py-2.5 text-xs font-medium text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddHostelModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-60"
                >
                  {loading ? 'Adding...' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default SuperAdminDashboardPage;
