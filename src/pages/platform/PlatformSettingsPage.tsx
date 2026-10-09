import React, { useEffect, useState } from 'react';
import { saasSubscriptionService } from '../../services/saasSubscriptionService';
import type { BankTransferConfig } from '../../types/models';
import {
  Settings,
  CheckCircle2,
  Key,
  Calendar,
  Clock,
  Save,
  Shield,
  Building2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
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

  // Bank Transfer Configuration State
  const [bankConfig, setBankConfig] = useState<BankTransferConfig | null>(null);
  const [bankName, setBankName] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [paymentInstructions, setPaymentInstructions] = useState<string>('');
  const [bankSaving, setBankSaving] = useState<boolean>(false);
  const [bankSuccessMessage, setBankSuccessMessage] = useState<string | null>(null);
  const [bankErrorMessage, setBankErrorMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, bankData] = await Promise.all([
        saasSubscriptionService.getPlatformSettings(),
        saasSubscriptionService.getBankTransferConfigAdmin().catch(() => null),
      ]);

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

      if (bankData) {
        setBankConfig(bankData);
        setBankName(bankData.bank_name || '');
        setAccountName(bankData.account_name || '');
        setAccountNumber(bankData.account_number || '');
        setPaymentInstructions(bankData.payment_instructions || '');
      } else {
        setBankConfig(null);
        setBankName('');
        setAccountName('');
        setAccountNumber('');
        setPaymentInstructions('');
      }
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

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBankSaving(true);
      setBankSuccessMessage(null);
      setBankErrorMessage(null);

      if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
        throw new Error('Bank name, account name, and account number are all required.');
      }

      const updated = await saasSubscriptionService.updateBankTransferConfig({
        bank_name: bankName.trim(),
        account_name: accountName.trim(),
        account_number: accountNumber.trim(),
        payment_instructions: paymentInstructions.trim(),
      });

      setBankConfig(updated);
      setBankSuccessMessage(
        'Receiving bank details saved. Payment method is set to UNVERIFIED and DISABLED until explicit admin verification.'
      );
    } catch (err: unknown) {
      setBankErrorMessage(err instanceof Error ? err.message : 'Failed to update bank details');
    } finally {
      setBankSaving(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    try {
      setBankSaving(true);
      setBankSuccessMessage(null);
      setBankErrorMessage(null);

      const updated = await saasSubscriptionService.verifyAndEnableBankTransferConfig(true);
      setBankConfig(updated);
      setBankSuccessMessage(
        'Bank account details verified and Bank Transfer payment method ENABLED for practice SaaS subscriptions.'
      );
    } catch (err: unknown) {
      setBankErrorMessage(err instanceof Error ? err.message : 'Failed to verify bank details');
    } finally {
      setBankSaving(false);
    }
  };

  const handleDisableBankTransfer = async () => {
    try {
      setBankSaving(true);
      setBankSuccessMessage(null);
      setBankErrorMessage(null);

      const updated = await saasSubscriptionService.verifyAndEnableBankTransferConfig(false);
      setBankConfig(updated);
      setBankSuccessMessage('Bank Transfer payment method has been DISABLED.');
    } catch (err: unknown) {
      setBankErrorMessage(err instanceof Error ? err.message : 'Failed to disable bank transfer');
    } finally {
      setBankSaving(false);
    }
  };

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

      {/* 2. Manual Bank Transfer Receiving Account Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-400" />
              SaaS Manual Bank Transfer Receiving Account
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Physenra official receiving bank account for practice SaaS subscription payments.
            </p>
          </div>

          {/* Availability & Verification Badge */}
          <div>
            {!bankConfig?.bank_name || !bankConfig?.account_number ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Configuration Pending (Disabled)
              </span>
            ) : !bankConfig.is_verified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Unverified (Disabled)
              </span>
            ) : bankConfig.is_enabled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verified & Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Verified (Disabled by Admin)
              </span>
            )}
          </div>
        </div>

        {bankSuccessMessage && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{bankSuccessMessage}</span>
          </div>
        )}

        {bankErrorMessage && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{bankErrorMessage}</span>
          </div>
        )}

        {/* Informational Guidance Notice */}
        <div className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-white flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-teal-400" />
            Strict Financial Separation & Operational Policy:
          </p>
          <p className="text-slate-400">
            Bank Transfer remains strictly <strong>disabled</strong> in production until an authorized Platform Admin configures genuine Physenra corporate account details and explicitly verifies them. Modifying account details automatically resets verification and disables the payment method.
          </p>
        </div>

        <form onSubmit={handleSaveBankDetails} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Access Bank, Zenith Bank"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Account Name
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Physenra Health Technologies Ltd"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Account Number (10 Digits)
              </label>
              <input
                type="text"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="0123456789"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Payment Instructions / Narration Rule
              </label>
              <input
                type="text"
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="e.g. Include your Practice Name or PHY-BTR reference"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="text-xs text-slate-500">
              {bankConfig?.verified_at ? (
                <span>
                  Last verified: {new Date(bankConfig.verified_at).toLocaleDateString()}
                </span>
              ) : (
                <span>Verification pending. Feature will not appear in checkout until verified.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={bankSaving}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
              >
                {bankSaving ? 'Saving...' : 'Save Account Details'}
              </button>

              {bankConfig?.is_verified && bankConfig?.is_enabled ? (
                <button
                  type="button"
                  onClick={handleDisableBankTransfer}
                  disabled={bankSaving}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Disable Bank Transfer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleVerifyAndEnable}
                  disabled={bankSaving || !bankName.trim() || !accountName.trim() || accountNumber.trim().length < 10}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify & Enable</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
