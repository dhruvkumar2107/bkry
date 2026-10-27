import { useEffect, useState } from 'react';
import { Save, Megaphone, FileText, HelpCircle, Shield, Share2, Plus, Trash2, Globe } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { PageLoader, Field } from '../../components/ui.jsx';

const TABS = [
  { key: 'announcement', label: 'Announcement Bar', icon: Megaphone },
  { key: 'about', label: 'About Us', icon: FileText },
  { key: 'policies', label: 'Policies & Legal', icon: Shield },
  { key: 'faqs', label: 'FAQs', icon: HelpCircle },
  { key: 'social', label: 'Social & Footer', icon: Share2 },
  { key: 'seo', label: 'SEO Settings', icon: Globe },
];

export default function WebsiteContent() {
  const [tab, setTab] = useState('announcement');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/settings');
      setSettings(data.settings);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/admin/settings', settings);
      setSettings(data.settings);
      toast.success('Website content saved successfully! 🎉');
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const update = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // FAQ helpers
  const faqs = Array.isArray(settings?.faqList) ? settings.faqList : [];
  const addFaq = () => {
    update('faqList', [...faqs, { question: '', answer: '' }]);
  };
  const updateFaq = (index, field, val) => {
    const next = [...faqs];
    next[index] = { ...next[index], [field]: val };
    update('faqList', next);
  };
  const removeFaq = (index) => {
    update('faqList', faqs.filter((_, i) => i !== index));
  };

  if (loading) return <PageLoader label="Loading website content settings…" />;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-brand text-2xl font-bold text-slate-800">Website Content & Pages</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your announcement banner, About Us, policies, FAQs, SEO, and footer text without code edits.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary"
        >
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              tab === key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Tab: Announcement Bar */}
      {tab === 'announcement' && (
        <div className="card space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-semibold text-slate-800">Top Header Announcement Bar</h2>
              <p className="text-xs text-slate-400">
                Display a highlighted promotional message or alert across the very top of your storefront.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-slate-700">
              <input
                type="checkbox"
                checked={!!settings.announcementBarActive}
                onChange={(e) => update('announcementBarActive', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Active
            </label>
          </div>

          <Field label="Announcement Text">
            <input
              className="input"
              value={settings.announcementBarText || ''}
              onChange={(e) => update('announcementBarText', e.target.value)}
              placeholder="e.g. Festive Offer: Flat 15% off on orders above ₹800! Use code FESTIVE15"
            />
          </Field>

          <Field label="Destination Link (optional)">
            <input
              className="input"
              value={settings.announcementBarLink || ''}
              onChange={(e) => update('announcementBarLink', e.target.value)}
              placeholder="e.g. /products or /category/special-sweets"
            />
          </Field>

          {/* Live Preview */}
          {settings.announcementBarActive && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <span className="block text-xs font-semibold text-brand-700 uppercase tracking-wide mb-1">
                Live Preview
              </span>
              <div className="rounded-lg bg-brand-700 px-3 py-1.5 text-center text-xs font-medium text-white">
                {settings.announcementBarText || 'Announcement text goes here'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: About Us */}
      {tab === 'about' && (
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold text-slate-800">About Us Page</h2>
          <p className="text-xs text-slate-400">
            Tell your story, your sweets heritage, pure ghee ingredients, and bakery tradition.
          </p>

          <Field label="Page Title">
            <input
              className="input"
              value={settings.aboutUsTitle || ''}
              onChange={(e) => update('aboutUsTitle', e.target.value)}
              placeholder="About Chotulal Sweets"
            />
          </Field>

          <Field label="About Us Content">
            <textarea
              className="input font-sans text-sm leading-relaxed"
              rows={10}
              value={settings.aboutUsContent || ''}
              onChange={(e) => update('aboutUsContent', e.target.value)}
              placeholder="Write your story here…"
            />
          </Field>
        </div>
      )}

      {/* Tab: Policies & Legal */}
      {tab === 'policies' && (
        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <h2 className="font-semibold text-slate-800">Delivery & Shipping Policy</h2>
            <p className="text-xs text-slate-400">
              Details on packaging, dispatch times, serviceable zones, and delivery expectations.
            </p>
            <textarea
              className="input text-sm leading-relaxed"
              rows={6}
              value={settings.deliveryPolicy || ''}
              onChange={(e) => update('deliveryPolicy', e.target.value)}
              placeholder="Delivery policy details…"
            />
          </div>

          <div className="card space-y-4 p-6">
            <h2 className="font-semibold text-slate-800">Return & Refund Policy</h2>
            <p className="text-xs text-slate-400">
              Rules regarding perishable items, damage claims, report windows, and refunds.
            </p>
            <textarea
              className="input text-sm leading-relaxed"
              rows={6}
              value={settings.returnPolicy || ''}
              onChange={(e) => update('returnPolicy', e.target.value)}
              placeholder="Return and refund rules…"
            />
          </div>

          <div className="card space-y-4 p-6">
            <h2 className="font-semibold text-slate-800">Terms & Conditions</h2>
            <p className="text-xs text-slate-400">
              Website usage, ordering rules, pricing disclaimers, and customer commitments.
            </p>
            <textarea
              className="input text-sm leading-relaxed"
              rows={6}
              value={settings.termsConditions || ''}
              onChange={(e) => update('termsConditions', e.target.value)}
              placeholder="Terms of service…"
            />
          </div>

          <div className="card space-y-4 p-6">
            <h2 className="font-semibold text-slate-800">Privacy Policy</h2>
            <p className="text-xs text-slate-400">
              How customer phone numbers, addresses, and order histories are handled and secured.
            </p>
            <textarea
              className="input text-sm leading-relaxed"
              rows={6}
              value={settings.privacyPolicy || ''}
              onChange={(e) => update('privacyPolicy', e.target.value)}
              placeholder="Privacy policy details…"
            />
          </div>
        </div>
      )}

      {/* Tab: FAQs */}
      {tab === 'faqs' && (
        <div className="card space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-semibold text-slate-800">Frequently Asked Questions</h2>
              <p className="text-xs text-slate-400">
                Answer customer queries about pure ghee purity, delivery times, bulk orders, and payment.
              </p>
            </div>
            <button
              type="button"
              onClick={addFaq}
              className="btn-outline py-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Question
            </button>
          </div>

          <div className="space-y-4">
            {faqs.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No FAQs added yet. Click &quot;Add Question&quot; to create one.
              </p>
            ) : (
              faqs.map((f, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Q #{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeFaq(i)}
                      className="text-slate-400 hover:text-red-600 transition"
                      aria-label="Remove question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Field label="Question">
                    <input
                      className="input bg-white"
                      value={f.question || ''}
                      onChange={(e) => updateFaq(i, 'question', e.target.value)}
                      placeholder="e.g. Do you deliver fresh sweets daily?"
                    />
                  </Field>
                  <Field label="Answer">
                    <textarea
                      className="input bg-white"
                      rows={3}
                      value={f.answer || ''}
                      onChange={(e) => updateFaq(i, 'answer', e.target.value)}
                      placeholder="e.g. Yes, all sweets are prepared fresh each morning."
                    />
                  </Field>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Social & Footer */}
      {tab === 'social' && (
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold text-slate-800">Footer Text & Social Links</h2>
          <p className="text-xs text-slate-400">
            Customize social channels and the explanatory note displayed in the website footer.
          </p>

          <Field label="Custom Footer Note (optional)">
            <input
              className="input"
              value={settings.footerText || ''}
              onChange={(e) => update('footerText', e.target.value)}
              placeholder="e.g. FSSAI Licensed Confectionery · Traditional Indian Sweets since 1985"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            <Field label="Instagram Profile URL">
              <input
                className="input"
                value={settings.socialInstagram || ''}
                onChange={(e) => update('socialInstagram', e.target.value)}
                placeholder="https://instagram.com/chotulalsweets"
              />
            </Field>

            <Field label="Facebook Page URL">
              <input
                className="input"
                value={settings.socialFacebook || ''}
                onChange={(e) => update('socialFacebook', e.target.value)}
                placeholder="https://facebook.com/chotulalsweets"
              />
            </Field>

            <Field label="WhatsApp Contact Number">
              <input
                className="input"
                value={settings.socialWhatsapp || ''}
                onChange={(e) => update('socialWhatsapp', e.target.value)}
                placeholder="+91 97418 57227"
              />
            </Field>

            <Field label="Twitter / X Profile URL">
              <input
                className="input"
                value={settings.socialTwitter || ''}
                onChange={(e) => update('socialTwitter', e.target.value)}
                placeholder="https://x.com/chotulalsweets"
              />
            </Field>
          </div>
        </div>
      )}

      {/* Tab: SEO Settings */}
      {tab === 'seo' && (
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold text-slate-800">Search Engine Optimization (SEO)</h2>
          <p className="text-xs text-slate-400">
            Control search engine titles, snippets, and keywords to maximize storefront discoverability.
          </p>

          <Field label="Website Meta Title">
            <input
              className="input"
              value={settings.metaTitle || ''}
              onChange={(e) => update('metaTitle', e.target.value)}
              placeholder="Chotulal Sweets - Pure Ghee Sweets & Savouries"
            />
          </Field>

          <Field label="Meta Description">
            <textarea
              className="input"
              rows={3}
              value={settings.metaDescription || ''}
              onChange={(e) => update('metaDescription', e.target.value)}
              placeholder="Order fresh handcrafted Indian sweets, pure ghee delicacies, crispy namkeen, and festival gift packs online from Chotulal Sweets."
            />
          </Field>

          <Field label="Meta Keywords">
            <input
              className="input"
              value={settings.metaKeywords || ''}
              onChange={(e) => update('metaKeywords', e.target.value)}
              placeholder="sweets, mithai, kaju katli, peda, laddu, namkeen, bijapur"
            />
          </Field>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary px-6 py-2.5"
        >
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
