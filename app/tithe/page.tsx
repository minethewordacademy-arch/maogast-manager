'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Banknote, 
  Calendar, 
  Loader2, 
  TrendingUp,
  PieChart,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface TitheRecord {
  id: string;
  sector_id: string;
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  tithe_amount: number;
  month: string;
  created_at: string;
}

interface Sector {
  id: string;
  name: string;
}

export default function TithePage() {
  const [loading, setLoading] = useState(true);
  const [titheRecords, setTitheRecords] = useState<TitheRecord[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [totalTithe, setTotalTithe] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();

  // Define fetchTitheData BEFORE useEffect
  const fetchTitheData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch sectors
      const { data: sectorData, error: sectorError } = await supabase
        .from('sectors')
        .select('id, name');

      if (sectorError) throw new Error(sectorError.message);
      setSectors(sectorData || []);

      // Fetch tithe records
      const { data: titheData, error: titheError } = await supabase
        .from('tithe_records')
        .select('*')
        .order('month', { ascending: false });

      if (titheError) throw new Error(titheError.message);
      setTitheRecords(titheData || []);

      // Calculate total tithe
      const total = (titheData || []).reduce((sum, record) => sum + record.tithe_amount, 0);
      setTotalTithe(total);

    } catch (err: unknown) {
      console.error('Error fetching tithe data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tithe data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      fetchTitheData();
    };
    checkAuth();
  }, [router]);

  const handleGenerateTithe = async () => {
    try {
      setProcessingId('generate');
      setError(null);
      setSuccess(null);

      // Get all sectors
      const { data: sectorData, error: sectorError } = await supabase
        .from('sectors')
        .select('id, name');

      if (sectorError) throw new Error(sectorError.message);

      const startDate = new Date(selectedMonth);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      for (const sector of sectorData || []) {
        // Calculate revenue from commissions
        const { data: commData, error: commError } = await supabase
          .from('commissions')
          .select('amount')
          .eq('paid', true)
          .gte('created_at', startDate.toISOString())
          .lt('created_at', endDate.toISOString());

        if (commError) throw new Error(commError.message);

        // Calculate expenses
        const { data: expData, error: expError } = await supabase
          .from('expenses')
          .select('amount')
          .eq('sector_id', sector.id)
          .gte('date', startDate.toISOString())
          .lt('date', endDate.toISOString());

        if (expError) throw new Error(expError.message);

        const totalRevenue = (commData || []).reduce((sum, c) => sum + c.amount, 0);
        const totalExpenses = (expData || []).reduce((sum, e) => sum + e.amount, 0);
        const netIncome = totalRevenue - totalExpenses;
        const titheAmount = netIncome * 0.1; // 10%

        // Insert or update tithe record
        const { error: upsertError } = await supabase
          .from('tithe_records')
          .upsert({
            sector_id: sector.id,
            total_revenue: totalRevenue,
            total_expenses: totalExpenses,
            net_income: netIncome,
            tithe_amount: titheAmount,
            month: startDate.toISOString().slice(0, 7),
          }, { onConflict: 'sector_id, month' });

        if (upsertError) throw new Error(upsertError.message);
      }

      setSuccess('Tithe records generated successfully for ' + selectedMonth);
      fetchTitheData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate tithe records';
      setError(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRecords = titheRecords.filter(r => r.month === selectedMonth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-orange-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading tithe data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Banknote className="w-8 h-8 text-green-600" />
              Tithe Management
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Tracking and managing tithe contributions across all sectors
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5" />
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tithe</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  KES {totalTithe.toFixed(2)}
                </p>
              </div>
              <Banknote className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sectors</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {sectors.length}
                </p>
              </div>
              <PieChart className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Records</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {titheRecords.length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Growth</p>
                <p className="text-3xl font-bold text-green-600">
                  <TrendingUp className="w-8 h-8" />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Generate Tithe */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
              />
            </div>
            <button
              onClick={handleGenerateTithe}
              disabled={processingId === 'generate'}
              className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 whitespace-nowrap"
            >
              {processingId === 'generate' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </span>
              ) : (
                'Generate Tithe'
              )}
            </button>
          </div>
        </div>

        {/* Tithe Records */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tithe Records for {selectedMonth}
            </h2>
          </div>
          {filteredRecords.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
              No tithe records found for this month. Click &quot;Generate Tithe&quot; to calculate.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRecords.map((record) => (
                <div key={record.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {sectors.find(s => s.id === record.sector_id)?.name || 'Unknown Sector'}
                      </p>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <p>Revenue: KES {record.total_revenue.toFixed(2)}</p>
                        <p>Expenses: KES {record.total_expenses.toFixed(2)}</p>
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          Net Income: KES {record.net_income.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Tithe: KES {record.tithe_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}