// app/tithe/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Banknote,
  Calendar,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Church,
  AlertCircle,
  Heart,
} from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  date: string;
}

export default function TithePage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const router = useRouter();

  const fetchTitheData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all transactions
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, type, date")
        .order("date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err: unknown) {
      console.error("Error fetching tithe data:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load financial data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      fetchTitheData();
    };
    checkAuth();
  }, [router, fetchTitheData]);

  // Group and calculate data by month for the selected year
  const yearlyData = useMemo(() => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    // Initialize monthly data
    const monthlyData = months.map((name, index) => ({
      monthIndex: index,
      name,
      income: 0,
      expenses: 0,
      netIncome: 0,
      tithe: 0,
    }));

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalNetIncome = 0;
    let totalTithe = 0;

    transactions.forEach((t) => {
      const tDate = new Date(t.date);
      if (tDate.getFullYear() === selectedYear) {
        const monthIndex = tDate.getMonth();

        if (t.type === "income") {
          monthlyData[monthIndex].income += t.amount;
          totalIncome += t.amount;
        } else if (t.type === "expense") {
          monthlyData[monthIndex].expenses += t.amount;
          totalExpenses += t.amount;
        }
      }
    });

    // Calculate net income and tithe for each month
    monthlyData.forEach((data) => {
      data.netIncome = data.income - data.expenses;
      data.tithe = data.netIncome > 0 ? data.netIncome * 0.1 : 0;

      totalNetIncome += data.netIncome;
      totalTithe += data.tithe;
    });

    return {
      months: monthlyData,
      totalIncome,
      totalExpenses,
      totalNetIncome,
      totalTithe,
    };
  }, [transactions, selectedYear]);

  // Get unique years from transactions for the filter
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    transactions.forEach((t) => {
      years.add(new Date(t.date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Banknote className="w-7 h-7 sm:w-8 sm:h-8 text-green-600 shrink-0" />
              Tithe Management
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Automatically calculated at 10% of your Net Income.
            </p>
          </div>

          {/* Year Filter */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full sm:w-40 px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 text-base"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Yearly Totals Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* Total Income */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Income ({selectedYear})
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(yearlyData.totalIncome)}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Expenses ({selectedYear})
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(yearlyData.totalExpenses)}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
                <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Net Income */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Net Income ({selectedYear})
                </p>
                <p
                  className={`text-xl sm:text-2xl font-bold mt-1 ${yearlyData.totalNetIncome >= 0 ? "text-gray-900 dark:text-white" : "text-red-600"}`}
                >
                  {formatCurrency(yearlyData.totalNetIncome)}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Total Tithe */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Tithe Due (10% of Net)
                </p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {formatCurrency(yearlyData.totalTithe)}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center shrink-0">
                <Church className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Scripture Banner */}
        <div className="bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-sm p-5 sm:p-6 mb-8 text-white">
          <div className="flex items-start gap-3 sm:gap-4">
            <Heart className="w-6 h-6 sm:w-8 sm:h-8 fill-white shrink-0 mt-1" />
            <div>
              <p className="text-base sm:text-lg font-serif italic leading-relaxed">
                &quot;Bring the whole tithe into the storehouse, that there may
                be food in my house. Test me in this,&quot; says the LORD
                Almighty, &quot;and see if I will not throw open the floodgates
                of heaven and pour out so much blessing that there will not be
                room enough to store it.&quot;
              </p>
              <p className="text-xs sm:text-sm font-medium opacity-90 mt-2 text-right">
                — Malachi 3:10
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600 shrink-0" />
              Monthly Breakdown ({selectedYear})
            </h2>
          </div>

          {/* DESKTOP TABLE (Hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-3">Month</th>
                  <th className="px-6 py-3 text-right">Income</th>
                  <th className="px-6 py-3 text-right">Expenses</th>
                  <th className="px-6 py-3 text-right">Net Income</th>
                  <th className="px-6 py-3 text-right font-bold text-purple-600 dark:text-purple-400">
                    Tithe (10%)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {yearlyData.months.map((data) => (
                  <tr
                    key={data.monthIndex}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {data.name}
                    </td>
                    <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">
                      {formatCurrency(data.income)}
                    </td>
                    <td className="px-6 py-4 text-right text-red-600 dark:text-red-400">
                      {formatCurrency(data.expenses)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-medium ${data.netIncome >= 0 ? "text-gray-900 dark:text-white" : "text-red-600"}`}
                    >
                      {formatCurrency(data.netIncome)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(data.tithe)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW (Hidden on desktop) */}
          <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {yearlyData.months.map((data) => (
              <div
                key={data.monthIndex}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                    {data.name}
                  </h3>
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                    Tithe: {formatCurrency(data.tithe)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                    <span className="block text-gray-500 dark:text-gray-400 mb-0.5">
                      Income
                    </span>
                    <span className="font-medium text-green-600 dark:text-green-400 block truncate">
                      {formatCurrency(data.income)}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                    <span className="block text-gray-500 dark:text-gray-400 mb-0.5">
                      Expenses
                    </span>
                    <span className="font-medium text-red-600 dark:text-red-400 block truncate">
                      {formatCurrency(data.expenses)}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                    <span className="block text-gray-500 dark:text-gray-400 mb-0.5">
                      Net Income
                    </span>
                    <span
                      className={`font-medium block truncate ${data.netIncome >= 0 ? "text-gray-900 dark:text-white" : "text-red-600"}`}
                    >
                      {formatCurrency(data.netIncome)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
