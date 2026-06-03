'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { 
  UserCircle, 
  Building2, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Lock,
  Settings as SettingsIcon,
} from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  role: string;
  sector_id: string | null;
  commission_rate: number;
  phone: string | null;
}

interface Sector {
  id: string;
  name: string;
}

interface CompanySettings {
  id: string;
  company_name: string;
  paybill_number: string;
  bank_account: string;
  default_commission_rate: number;
  tithe_percentage: number;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'company'>('profile');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    paybill_number: '',
    bank_account: '',
    default_commission_rate: 0,
    tithe_percentage: 0,
  });

  const router = useRouter();

  const fetchData = useCallback(async (authId: string) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get ALL employee records for this auth_id (handles multi-sector users)
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_id', authId);

      if (empError) throw new Error(empError.message);
      if (!empData || empData.length === 0) {
        router.push('/login');
        return;
      }

      // Use the first record for the UI (Profile, Role, Sector display)
      const primaryEmployee = empData[0];
      setEmployee(primaryEmployee);
      setIsAdmin(primaryEmployee.role === 'admin');
      setProfileForm({
        full_name: primaryEmployee.full_name || '',
        phone: primaryEmployee.phone || '',
      });

      // 2. Fetch sectors (for display)
      const { data: sectorData, error: sectorError } = await supabase
        .from('sectors')
        .select('id, name');

      if (sectorError) throw new Error(sectorError.message);
      setSectors(sectorData || []);

      // 3. If admin, fetch company settings safely using maybeSingle()
      if (primaryEmployee.role === 'admin') {
        const { data: settingsData, error: settingsError } = await supabase
          .from('company_settings')
          .select('*')
          .maybeSingle(); // Prevents crashes on duplicate rows

        if (settingsError) throw new Error(settingsError.message);
        setCompanySettings(settingsData);
        setCompanyForm({
          company_name: settingsData?.company_name || '',
          paybill_number: settingsData?.paybill_number || '',
          bank_account: settingsData?.bank_account || '',
          default_commission_rate: settingsData?.default_commission_rate || 0,
          tithe_percentage: settingsData?.tithe_percentage || 10,
        });
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      fetchData(session.user.id);
    };
    checkAuth();
  }, [router, fetchData]);

  // --- Update Profile ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!user) return;

    try {
      // Update ALL employee records for this authenticated user (handles multi-sector)
      const { error } = await supabase
        .from('employees')
        .update({
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim() || null,
        })
        .eq('auth_id', user.id); // Updates all sector rows for this user

      if (error) throw new Error(error.message);
      setSuccess('Profile updated successfully.');
      fetchData(user.id);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Update Password ---
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw new Error(error.message);
      setSuccess('Password updated successfully.');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update password';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Update Company Settings ---
  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!companySettings) return;

    try {
      const { error } = await supabase
        .from('company_settings')
        .update({
          company_name: companyForm.company_name.trim(),
          paybill_number: companyForm.paybill_number.trim(),
          bank_account: companyForm.bank_account.trim(),
          default_commission_rate: Number(companyForm.default_commission_rate),
          tithe_percentage: Number(companyForm.tithe_percentage),
          updated_at: new Date().toISOString(),
        })
        .eq('id', companySettings.id);

      if (error) throw new Error(error.message);
      setSuccess('Company settings updated successfully.');
      fetchData(user!.id);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update company settings';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-orange-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-orange-600" />
            Settings
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your account and company preferences.
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>{success}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <UserCircle className="w-5 h-5" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'security'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Lock className="w-5 h-5" />
              Security
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('company')}
                className={`flex items-center gap-2 pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'company'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Building2 className="w-5 h-5" />
                Company
              </button>
            )}
          </nav>
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email (Read-Only)
                    </label>
                    <input
                      type="email"
                      value={employee?.email || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                      placeholder="+254 712 345 678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sector
                    </label>
                    <input
                      type="text"
                      value={sectors.find(s => s.id === employee?.sector_id)?.name || 'Not Assigned'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role
                    </label>
                    <input
                      type="text"
                      value={employee?.role || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Commission Rate (KES)
                    </label>
                    <input
                      type="text"
                      value={`KES ${employee?.commission_rate || 0}`}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Profile
                </button>
              </div>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Change Password
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  Update Password
                </button>
              </div>
            </form>
          )}

          {/* Company Tab (Admin Only) */}
          {activeTab === 'company' && isAdmin && (
            <form onSubmit={handleUpdateCompany} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Company Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyForm.company_name}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Paybill Number
                    </label>
                    <input
                      type="text"
                      value={companyForm.paybill_number}
                      onChange={(e) => setCompanyForm({ ...companyForm, paybill_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                      placeholder="e.g. 522533"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bank Account
                    </label>
                    <input
                      type="text"
                      value={companyForm.bank_account}
                      onChange={(e) => setCompanyForm({ ...companyForm, bank_account: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                      placeholder="e.g. KCB Bank - 1352136236"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Default Commission Rate (KES)
                    </label>
                    <input
                      type="number"
                      value={companyForm.default_commission_rate}
                      onChange={(e) => setCompanyForm({ ...companyForm, default_commission_rate: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tithe Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={companyForm.tithe_percentage}
                      onChange={(e) => setCompanyForm({ ...companyForm, tithe_percentage: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  Update Company Settings
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}