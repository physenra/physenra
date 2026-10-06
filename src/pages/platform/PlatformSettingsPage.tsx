import React, { useEffect, useState } from 'react';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import {
  Settings,
  CheckCircle2,
  Key,
  Calendar,
  Clock,
  Save,
  Shield,
} from 'lucide-react';

export const PlatformSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Form local state
  const [paystackKey, setPaystackKey] = useState<string>('');
  const [trialDays, setTrialDays] = useState<number>(14);
  const [graceDays, setGraceDays] = useState<number>(7);
  const [saving, setSaving] = useState<boolean>(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await saasSubscriptionService.getPlatformSettings();

      data.forEach((s) => {
        if (s.key === 'paystack_public_key' && typeof s.value === 'string') {
          setPaystackKey(s.value);
        }
        if (s.key === 'trial_period_days' && typeof s.value === 'number') {
          setTrialDays(s.value);
        }
        if (s.key === 'grace_period_days' && typeof s.value === 'number') {
          setGraceDays(s.value);
        }
      });
    } catch (err: unknown) {
      console.error('Failed to load platform settings:', err);
      setError(err instanceof Error ? err.message : 'Error fetching settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(null);

      await Promise.all([
        saasSubscriptionService.updatePlatformSetting('paystack_public_key', paystackKey, 'Paystack public API key'),
        saasSubscriptionService.updatePlatformSetting('trial_period_days', trialDays, 'Evaluation trial duration'),
        saasSubscriptionService.updatePlatformSetting('grace_period_days', graceDays, 'Failed billing grace period'),
      ]);

      setSaveSuccess('Platform settings updated successfully.');
      await fetchSettings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-400" />
          Global Platform Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure default evaluation parameters, gateway integrations, and dunning rules.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
          Loading settings...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Payment Gateway Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              Paystack Gateway Integration
            </h2>
            <p className="text-xs text-slate-400">
              Public API key used for initializing client checkout sessions.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Paystack Public Key
              </label>
              <input
                type="text"
                value={paystackKey}
                onChange={(e) => setPaystackKey(e.target.value)}
                placeholder="pk_test_..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* SaaS Lifecycle Defaults */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              Default Evaluation & Dunning Policies
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Default Trial Duration for New Plans (Days)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={trialDays}
                  onChange={(e) => setTrialDays(parseInt(e.target.value, 10) || 14)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Sets default trial days for newly configured plans. Does not retroactively alter active practice trials.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Grace Period (Days Post-Failure)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={graceDays}
                  onChange={(e) => setGraceDays(parseInt(e.target.value, 10) || 7)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Settings...' : 'Save Platform Settings'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
