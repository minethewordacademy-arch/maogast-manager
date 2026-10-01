// app/team/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
  Mail,
  Lock,
  User as UserIcon,
  AlertTriangle,
} from 'lucide-react';

interface Employee {
  id: string;
  auth_id: string;
  full_name: string;
  email: string;
  role: string;
  sector_id: string;
  commission_rate: number;
  status: 'pending' | 'approved' | 'declined';
  phone: string | null;
  created_at: string;
}

interface Sector {
  id: string;
  name: string;
}

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  sector_id: '',
  role: 'employee',
  commission_rate: 500,
};

export default function TeamPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [isCreating, setIsCreating] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({
    role: 'employee',
    sector_id: '',
    commission_rate: 0,
    status: 'approved' as 'pending' | 'approved' | 'declined',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      setCurrentUserId(session.user.id);

      // Verify admin (only approved admin counts)
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('role, status')
        .eq('auth_id', session.user.id);

      if (empError) throw empError;
      const isUserAdmin = (empData || []).some(
        (e) => e.role === 'admin' && e.status === 'approved'
      );

      if (!isUserAdmin) {
        router.push('/dashboard');
        return;
      }
      setIsAdmin(true);

      // Fetch all employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      // Fetch sectors
      const { data: sectorData, error: sectorError } = await supabase
        .from('sectors')
        .select('id, name')
        .order('name');

      if (sectorError) throw sectorError;
      setSectors(sectorData || []);
      if (sectorData && sectorData.length > 0) {
        setFormData((prev) => ({ ...prev, sector_id: sectorData[0].id }));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // Approve or Decline a pending employee
  const handleApproveDecline = async (
    employee: Employee,
    newStatus: 'approved' | 'declined'
  ) => {
    try {
      setProcessingId(employee.id);
      setError(null);
      setSuccess(null);

      const { error } = await supabase
        .from('employees')
        .update({ status: newStatus })
        .eq('id', employee.id);

      if (error) throw error;

      setSuccess(
        newStatus === 'approved'
          ? `${employee.full_name} approved successfully.`
          : `${employee.full_name}'s request was declined.`
      );
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  // Create new employee via API route
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    if (!formData.email || !formData.password || !formData.full_name || !formData.sector_id) {
      setError('Please fill in all required fields.');
      setIsCreating(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsCreating(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/create-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          full_name: formData.full_name.trim(),
          sector_id: formData.sector_id,
          role: formData.role,
          commission_rate: Number(formData.commission_rate),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create employee');
      }

      setSuccess(`${formData.full_name} added to the team successfully.`);
      setShowCreateModal(false);
      setFormData({ ...emptyForm, sector_id: sectors[0]?.id || '' });
      await fetchData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
    } finally {
      setIsCreating(false);
    }
  };

  // Open edit modal
  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditForm({
      role: emp.role,
      sector_id: emp.sector_id,
      commission_rate: emp.commission_rate,
      status: emp.status,
    });
    setShowEditModal(true);
  };

  // Save edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          role: editForm.role,
          sector_id: editForm.sector_id,
          commission_rate: Number(editForm.commission_rate),
          status: editForm.status,
        })
        .eq('id', editingEmployee.id);

      if (error) throw error;

      setSuccess(`${editingEmployee.full_name}'s details updated.`);
      setShowEditModal(false);
      setEditingEmployee(null);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update employee');
    } finally {
      setIsSaving(false);
    }
  };

  // Open delete confirmation
  const openDeleteModal = (emp: Employee) => {
    if (emp.auth_id === currentUserId) {
      setError("You can't delete your own account. Ask another admin.");
      setTimeout(() => setError(null), 4000);
      return;
    }
    setEmployeeToDelete(emp);
    setShowDeleteModal(true);
    setError(null);
  };

  // Confirm delete — calls the API route so both auth user & employee row are removed
  const handleDelete = async () => {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/delete-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeToDelete.id,
          auth_id: employeeToDelete.auth_id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete team member');
      }

      setSuccess(`${employeeToDelete.full_name} has been removed from the team.`);
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
      await fetchData();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete team member';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Split lists
  const pendingEmployees = useMemo(
    () => employees.filter((e) => e.status === 'pending'),
    [employees]
  );
  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'approved'),
    [employees]
  );
  const declinedEmployees = useMemo(
    () => employees.filter((e) => e.status === 'declined'),
    [employees]
  );

  const getSectorName = (sectorId: string) =>
    sectors.find((s) => s.id === sectorId)?.name || 'Unassigned';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-orange-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading team...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 shrink-0" />
              Team Management
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Approve new members, assign sectors & roles, manage permissions.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors shadow-sm"
          >
            <UserPlus className="w-5 h-5" />
            Add Team Member
          </button>
        </div>

        {/* Feedback */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Pending Approvals */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-yellow-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              Pending Requests
            </h2>
            {pendingEmployees.length > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                {pendingEmployees.length}
              </span>
            )}
          </div>

          {pendingEmployees.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 text-sm">
              No pending requests right now.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 border-yellow-500 p-4 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center shrink-0">
                        <UserIcon className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {emp.full_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {emp.email}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Requested {new Date(emp.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveDecline(emp, 'declined')}
                        disabled={processingId === emp.id}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 transition-colors"
                      >
                        {processingId === emp.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <UserX className="w-4 h-4" />
                            Decline
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleApproveDecline(emp, 'approved')}
                        disabled={processingId === emp.id}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 transition-colors"
                      >
                        {processingId === emp.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4" />
                            Approve
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Team Members */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-green-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              Team Members
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({activeEmployees.length})
            </span>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Sector</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3 text-right">Rate (KES)</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {activeEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No approved team members yet.
                    </td>
                  </tr>
                ) : (
                  activeEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {emp.full_name}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {emp.email}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {getSectorName(emp.sector_id)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          emp.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {emp.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">
                        {emp.commission_rate.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(emp)}
                            disabled={emp.auth_id === currentUserId}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={
                              emp.auth_id === currentUserId
                                ? "You can't delete yourself"
                                : "Delete"
                            }
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

          {/* MOBILE CARDS */}
          <div className="md:hidden space-y-3">
            {activeEmployees.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 text-sm">
                No approved team members yet.
              </div>
            ) : (
              activeEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center shrink-0">
                        <UserIcon className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {emp.full_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {emp.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(emp)}
                        disabled={emp.auth_id === currentUserId}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={
                          emp.auth_id === currentUserId
                            ? "You can't delete yourself"
                            : "Delete"
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                      <span className="block text-gray-500 dark:text-gray-400 mb-0.5">Sector</span>
                      <span className="font-medium text-gray-900 dark:text-white truncate block">
                        {getSectorName(emp.sector_id)}
                      </span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                      <span className="block text-gray-500 dark:text-gray-400 mb-0.5">Role</span>
                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                        {emp.role}
                      </span>
                    </div>
                    <div className="col-span-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                      <span className="block text-gray-500 dark:text-gray-400 mb-0.5">Commission Rate</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        KES {emp.commission_rate.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Declined (collapsed history) */}
        {declinedEmployees.length > 0 && (
          <div>
            <details className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <summary className="px-4 sm:px-6 py-4 cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-500" />
                Declined Requests ({declinedEmployees.length})
              </summary>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {declinedEmployees.map((emp) => (
                  <div key={emp.id} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                        {emp.full_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {emp.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveDecline(emp, 'approved')}
                        disabled={processingId === emp.id}
                        className="text-xs px-3 py-1.5 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {processingId === emp.id ? '...' : 'Re-approve'}
                      </button>
                      <button
                        onClick={() => openDeleteModal(emp)}
                        disabled={emp.auth_id === currentUserId}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* ======================================================
          CREATE TEAM MEMBER MODAL
      ====================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                Add Team Member
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ ...emptyForm, sector_id: sectors[0]?.id || '' });
                  setError(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg p-3">
              The account will be created and <strong>auto-approved</strong>. Share the temporary password with them securely.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-base"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-base"
                    placeholder="jane@maogast.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Temporary Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-base"
                    placeholder="Min 6 characters"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sector <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.sector_id}
                  onChange={(e) => setFormData({ ...formData, sector_id: e.target.value })}
                  className="w-full px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-base"
                >
                  <option value="">Select a sector</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-base"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Commission (KES)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) })}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-base"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ ...emptyForm, sector_id: sectors[0]?.id || '' });
                    setError(null);
                  }}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-md disabled:opacity-50 transition-colors"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create Member
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          EDIT EMPLOYEE MODAL
      ====================================================== */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  Edit {editingEmployee.full_name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {editingEmployee.email}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEmployee(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      status: e.target.value as 'pending' | 'approved' | 'declined',
                    })
                  }
                  className="w-full px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-base"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="declined">Declined</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sector
                </label>
                <select
                  value={editForm.sector_id}
                  onChange={(e) => setEditForm({ ...editForm, sector_id: e.target.value })}
                  className="w-full px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-base"
                >
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-base"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Commission (KES)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.commission_rate}
                    onChange={(e) => setEditForm({ ...editForm, commission_rate: Number(e.target.value) })}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-base"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEmployee(null);
                  }}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-md disabled:opacity-50 transition-colors"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          DELETE TEAM MEMBER MODAL
      ====================================================== */}
      {showDeleteModal && employeeToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-2xl max-w-sm w-full p-5 sm:p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Delete Team Member?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This will <strong className="text-red-600 dark:text-red-400">permanently remove</strong> their account and login access. This cannot be undone.
              </p>

              {/* Preview of who is being deleted */}
              <div className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-6 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
                    <UserIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {employeeToDelete.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {employeeToDelete.email}
                    </p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Role</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {employeeToDelete.role}
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-500 dark:text-gray-400">Sector</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getSectorName(employeeToDelete.sector_id)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setEmployeeToDelete(null);
                }}
                disabled={isDeleting}
                className="w-full sm:w-auto flex-1 px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 transition-colors"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Member
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}