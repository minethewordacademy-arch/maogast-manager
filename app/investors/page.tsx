"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  User,
  Banknote,
  FileText,
  Heart,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

interface Investor {
  id: string;
  auth_id: string;
  full_name: string;
  email: string;
  amount_invested: number;
  profit_percentage: number;
  agreement_text: string | null;
  created_at: string;
}

export default function InvestorsPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [currentInvestor, setCurrentInvestor] = useState<Investor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editInvestor, setEditInvestor] = useState<Investor | null>(null);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    amount_invested: "",
    profit_percentage: "",
    agreement_text: "",
    password: "Invest123", // Default password for new investors
  });

  const fetchInvestors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // 1. Check if user is admin (FIXED HERE)
      // Fetch ALL employee roles for this user
      const { data: adminData, error: adminError } = await supabase
        .from("employees")
        .select("role")
        .eq("auth_id", session.user.id);

      if (adminError) throw new Error(adminError.message);

      // Check if ANY of the user's roles is 'admin'
      const isUserAdmin = (adminData || []).some((emp) => emp.role === "admin");
      setIsAdmin(isUserAdmin);

      const query = supabase.from("investors").select("*");

      if (isUserAdmin) {
        // Admin sees all investors
        const { data, error } = await query.order("created_at", {
          ascending: false,
        });
        if (error) throw new Error(error.message);
        setInvestors(data || []);
      } else {
        // Investor sees only their own record
        const { data, error } = await query
          .eq("auth_id", session.user.id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        setCurrentInvestor(data);
        setInvestors(data ? [data] : []);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load investors data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInvestors();
  }, [fetchInvestors]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      email: "",
      full_name: "",
      amount_invested: "",
      profit_percentage: "",
      agreement_text: "",
      password: "Invest123",
    });
    setEditInvestor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!isAdmin) {
      setError("Only admins can manage investors.");
      setIsSubmitting(false);
      return;
    }

    try {
      let authId = editInvestor?.auth_id;

      if (!editInvestor) {
        // 1. Create the user in Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.signUp(
          {
            email: formData.email,
            password: formData.password,
          },
        );

        if (authError) throw new Error(authError.message);
        if (!authUser.user) throw new Error("Failed to create user");

        authId = authUser.user.id;
      }

      // 2. Upsert investor record
      const investorData = {
        auth_id: authId,
        email: formData.email,
        full_name: formData.full_name,
        amount_invested: parseFloat(formData.amount_invested),
        profit_percentage: parseFloat(formData.profit_percentage),
        agreement_text: formData.agreement_text || null,
      };

      const { error: investorError } = await supabase
        .from("investors")
        .upsert(investorData, { onConflict: "auth_id" });

      if (investorError) throw new Error(investorError.message);

      setSuccess(
        editInvestor
          ? "Investor updated successfully!"
          : "Investor added successfully!",
      );
      resetForm();
      setShowAddModal(false);
      fetchInvestors();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save investor";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this investor? This action cannot be undone.",
      )
    ) {
      return;
    }

    if (!isAdmin) {
      setError("Only admins can delete investors.");
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      // 1. Delete investor record
      const { error: investorError } = await supabase
        .from("investors")
        .delete()
        .eq("id", id);

      if (investorError) throw new Error(investorError.message);

      // Note: The auth user is not deleted here to keep the account available if needed.

      setSuccess("Investor deleted successfully.");
      fetchInvestors();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete investor";
      setError(errorMessage);
    }
  };

  const openEditModal = (investor: Investor) => {
    setEditInvestor(investor);
    setFormData({
      email: investor.email,
      full_name: investor.full_name,
      amount_invested: investor.amount_invested.toString(),
      profit_percentage: investor.profit_percentage.toString(),
      agreement_text: investor.agreement_text || "",
      password: "", // Password field is ignored on update
    });
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-orange-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading investors data...</span>
        </div>
      </div>
    );
  }

  // --- Investor View (Only one record) ---
  if (!isAdmin && currentInvestor) {
    const inv = currentInvestor;
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 relative overflow-hidden">
          {/* Decorative Top Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-orange-500 to-yellow-500" />

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-linear-to-br from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 rounded-full mb-4">
              <User className="w-10 h-10 text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome, {inv.full_name}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Thank you for being a valued partner in the journey of{" "}
              <strong>Maogast Softworks</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Banknote className="w-6 h-6 text-orange-600" />
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                  Investment Amount
                </h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                KES {inv.amount_invested.toLocaleString()}
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Banknote className="w-6 h-6 text-yellow-600" />
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                  Dividend Share
                </h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {inv.profit_percentage}%
              </p>
            </div>
          </div>

          {inv.agreement_text && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                  Agreement Overview
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {inv.agreement_text}
              </p>
            </div>
          )}

          <div className="bg-linear-to-r from-orange-500 to-yellow-500 rounded-lg p-6 text-white text-center">
            <Heart className="w-6 h-6 inline-block mb-2 fill-white" />
            <p className="font-medium">
              We are deeply grateful for your trust and partnership. Together,
              we will build a prosperous future. 🚀
            </p>
            <p className="text-sm opacity-90 mt-2">
              — The Maogast Softworks Team
            </p>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/settings")}
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              Go to Settings →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Admin View (Full Management) ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Investors Management
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage investors, their contributions, and agreements.
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Investor
          </button>
        </div>

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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">
                    Investor
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">
                    Investment (KES)
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">
                    Dividend %
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">
                    Agreement
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {investors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No investors yet. Click &quot;Add Investor&quot; to get
                      started.
                    </td>
                  </tr>
                ) : (
                  investors.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {inv.full_name}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {inv.email}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {inv.amount_invested.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {inv.profit_percentage}%
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {inv.agreement_text ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Has Agreement
                          </span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(inv)}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Add/Edit Investor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editInvestor ? "Edit Investor" : "Add New Investor"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                  setError(null);
                  setSuccess(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                  placeholder="investor@example.com"
                  required
                />
              </div>

              {!editInvestor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Temporary Password
                  </label>
                  <input
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                    placeholder="Default: Invest123"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Investment Amount (KES){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount_invested"
                  value={formData.amount_invested}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                  placeholder="e.g. 100000"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Profit/Dividend Percentage{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="profit_percentage"
                  value={formData.profit_percentage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                  placeholder="e.g. 10"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Agreement Terms (Optional)
                </label>
                <textarea
                  name="agreement_text"
                  value={formData.agreement_text}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                  placeholder="Summarize the agreement terms between Maogast and the investor..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                    setError(null);
                    setSuccess(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editInvestor ? "Updating..." : "Creating..."}
                    </span>
                  ) : editInvestor ? (
                    "Update Investor"
                  ) : (
                    "Add Investor"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
