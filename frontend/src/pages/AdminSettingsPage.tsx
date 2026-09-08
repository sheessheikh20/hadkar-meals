import React, { useState } from 'react';
import { Settings, Save, Bell, Sparkles } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [businessName, setBusinessName] = useState<string>('Hadkar Meals');
  const [tagline, setTagline] = useState<string>('Fresh Meals. Every Day.');
  const [subtagline, setSubtagline] = useState<string>('Ghar Ka Khana, Hostel Tak.');
  const [phone, setPhone] = useState<string>('+91 97027 62707');
  const [upiId, setUpiId] = useState<string>('umeshhadkar02-1@okicici');

  // WhatsApp template preview
  const [template, setTemplate] = useState<string>(
    `Hello {{name}} 👋\nYour Hadkar Meals bill for {{date}} is ready.\n🍱 Food Charges: ₹{{food_total}}\n➕ Extra Charges: ₹{{extra_total}}\n💰 Previous Balance: ₹{{previous_balance}}\nTotal Bill: ₹{{total}}\n✅ Paid: ₹{{paid}}\n🔴 Remaining Balance: ₹{{outstanding}}\nPlease clear your remaining balance.\nThank you! 🙏`
  );

  const [savedMsg, setSavedMsg] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const previewReplaced = template
    .replace('{{name}}', 'Mohammad Shees')
    .replace('{{date}}', 'September 2026')
    .replace('{{food_total}}', '2,110')
    .replace('{{extra_total}}', '85')
    .replace('{{previous_balance}}', '0')
    .replace('{{total}}', '2,195')
    .replace('{{paid}}', '1,500')
    .replace('{{outstanding}}', '695');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-600" />
          <span>System Settings & Templates</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Business details, payment IDs, and customizable WhatsApp/SMS notification templates
        </p>
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
          Settings saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Settings */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
            Business Information
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Primary Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Secondary Tagline</label>
            <input
              type="text"
              value={subtagline}
              onChange={(e) => setSubtagline(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Support Contact Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">UPI ID for Student Payments</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold font-mono"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs"
          >
            Save Business Info
          </button>
        </div>

        {/* WhatsApp Message Template */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
            WhatsApp Bill Message Template
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Template Editor (with dynamic variables)
            </label>
            <textarea
              rows={6}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Variables: {'{{name}}'}, {'{{date}}'}, {'{{food_total}}'}, {'{{extra_total}}'}, {'{{previous_balance}}'}, {'{{total}}'}, {'{{paid}}'}, {'{{outstanding}}'}
            </span>
          </div>

          {/* Live Preview */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              WhatsApp Message Preview
            </span>
            <pre className="text-xs whitespace-pre-wrap font-sans text-slate-800 bg-white p-3 rounded-xl border border-emerald-200">
              {previewReplaced}
            </pre>
          </div>
        </div>
      </form>
    </div>
  );
};
