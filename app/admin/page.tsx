'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { 
  Users, 
  Banknote, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  LogOut,
  Trash2,
  Eye,
  User as UserIcon,
  Phone,
  X,
} from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  role: string;
  commission_rate: number;
}

interface Commission {
  id: string;
  employee_id: string;
  task_id: string;
  amount: number;
  paid: boolean;
  created_at: string;
  employee: Employee | null;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'in-progress' | 'completed' | 'declined';
  declined_reason?: string | null;
  due_date: string | null;
  created_at: string;
  employee_id: string;
  sector_id: string;
  employee: Employee | null;
  client_name?: string | null;
  client_contact?: string | null;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // New state for delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter state
  const [filterSectorId, setFilterSectorId] = useState<string>('all');
  const [availableSectors, setAvailableSectors] = useState<{id: string; name: string}[]>([]);

  const router = useRouter();

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // 1. Get ALL employee records for the admin (all sectors)
      const { data: adminData, error: adminError } = await supabase
        .from('employees')
        .select('*')
        .eq('auth_id', session.user.id);

      if (adminError) throw new Error(adminError.message);
      if (!adminData || adminData.length === 0 || adminData[0].role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      setIsAdmin(true);

      // 2. Get all sector IDs the admin belongs to
      const sectorIds = adminData.map((a) => a.sector_id);

      // 3. Fetch all employees in ALL these sectors
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .in('sector_id', sectorIds);

      if (empError) throw new Error(empError.message);
      setEmployees(empData || []);

      // 4. Fetch all tasks in ALL these sectors
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*, employee:employees(*)')
        .in('sector_id', sectorIds)
        .order('created_at', { ascending: false });

      if (taskError) throw new Error(taskError.message);
      setTasks(taskData || []);

      // 5. Fetch all commissions for all employees in these sectors
      const employeeIds = (empData || []).map(e => e.id);
      if (employeeIds.length > 0) {
        const { data: commData, error: commError } = await supabase
          .from('commissions')
          .select('*, employee:employees(*)')
          .in('employee_id', employeeIds)
          .order('created_at', { ascending: false });

        if (commError) throw new Error(commError.message);
        setCommissions(commData || []);
      }

      // 6. Fetch sector names for the filter dropdown
      const sectorNamePromises = sectorIds.map(async (id) => {
        const { data } = await supabase
          .from('sectors')
          .select('name')
          .eq('id', id)
          .single();
        return { id, name: data?.name || 'Unknown' };
      });
      const sectorNames = await Promise.all(sectorNamePromises);
      setAvailableSectors(sectorNames);

    } catch (err: unknown) {
      console.error('Admin fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load admin data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAdminData();
  }, [fetchAdminData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleUpdateRate = async (employeeId: string, newRate: number) => {
    try {
      setProcessingId(employeeId);
      setError(null);
      setSuccess(null);

      const { error } = await supabase
        .from('employees')
        .update({ commission_rate: newRate })
        .eq('id', employeeId);

      if (error) throw new Error(error.message);

      setSuccess(`Commission rate updated successfully.`);
      await fetchAdminData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update rate';
      setError(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkPaid = async (commissionId: string) => {
    try {
      setProcessingId(commissionId);
      setError(null);
      setSuccess(null);

      const { error } = await supabase
        .from('commissions')
        .update({ paid: true })
        .eq('id', commissionId);

      if (error) throw new Error(error.message);

      setSuccess('Commission marked as paid.');
      await fetchAdminData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark paid';
      setError(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAdminTaskAction = async (taskId: string, action: 'approved' | 'declined' | 'finalized') => {
    try {
      setProcessingId(taskId);
      setError(null);
      setSuccess(null);

      const statusMap: Record<string, Task['status']> = {
        'approved': 'approved',
        'declined': 'declined',
        'finalized': 'completed',
      };
      const updates: Partial<Task> = { status: statusMap[action] };

      if (action === 'declined') {
        const reason = prompt('Please enter the reason for declining this task:');
        if (reason === null) {
          setProcessingId(null);
          return;
        }
        updates.declined_reason = reason;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw new Error(error.message);

      setSuccess(`Task ${action} successfully.`);
      
      if (action === 'finalized') {
        const { data: taskData } = await supabase
          .from('tasks')
          .select('employee_id')
          .eq('id', taskId)
          .single();
        
        if (taskData) {
          const { data: empData } = await supabase
            .from('employees')
            .select('commission_rate')
            .eq('id', taskData.employee_id)
            .single();
            
          if (empData && empData.commission_rate > 0) {
            await supabase
              .from('commissions')
              .insert({
                employee_id: taskData.employee_id,
                task_id: taskId,
                amount: empData.commission_rate,
                paid: false,
              });
          }
        }
      }

      await fetchAdminData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      setError(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDelete);

      if (error) throw error;

      setSuccess('Task deleted successfully.');
      await fetchAdminData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setTaskToDelete(null);
    }
  };

  const openViewModal = (task: Task) => {
    setSelectedTask(task);
    setShowViewModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-orange-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading Admin Panel...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 bg-red-50 dark:bg-red-900/20 rounded-lg max-w-md">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-orange-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Admin Panel
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
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

        <div className="space-y-8">
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" />
                Employee Commission Rates
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Adjust the commission rate for each employee. Changes apply to future tasks.
              </p>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {employees.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No employees found in this sector.
                </div>
              ) : (
                employees.map((emp) => (
                  <div key={emp.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{emp.full_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{emp.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded">
                        {emp.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Rate:</span>
                        <input
                          type="number"
                          defaultValue={emp.commission_rate}
                          className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                          id={`rate-${emp.id}`}
                        />
                        <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">KES</span>
                      </div>
                      <button
                        onClick={() => {
                          const input = document.getElementById(`rate-${emp.id}`) as HTMLInputElement;
                          const newRate = parseFloat(input.value);
                          if (!isNaN(newRate) && newRate >= 0) {
                            handleUpdateRate(emp.id, newRate);
                          }
                        }}
                        disabled={processingId === emp.id}
                        className="px-3 py-1.5 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-md disabled:opacity-50 flex items-center gap-1"
                      >
                        {processingId === emp.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Update'
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-green-600" />
                Pending Commissions
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Mark commissions as paid once the employee receives payment.
              </p>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {commissions.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No commissions recorded yet.
                </div>
              ) : (
                commissions.map((comm) => (
                  <div key={comm.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {comm.employee?.full_name || 'Unknown Employee'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Amount: <span className="font-bold text-gray-900 dark:text-white">KES {comm.amount}</span>
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Earned: {new Date(comm.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        comm.paid 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {comm.paid ? 'Paid' : 'Pending'}
                      </span>
                      {!comm.paid && (
                        <button
                          onClick={() => handleMarkPaid(comm.id)}
                          disabled={processingId === comm.id}
                          className="ml-3 px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                        >
                          {processingId === comm.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Mark Paid'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-purple-600" />
                All Tasks in Sector
              </h2>
            </div>

            {/* Sector Filter Dropdown */}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Sector
              </label>
              <select
                value={filterSectorId}
                onChange={(e) => setFilterSectorId(e.target.value)}
                className="w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
              >
                <option value="all">All Sectors</option>
                {availableSectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {tasks.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No tasks in this sector.
                </div>
              ) : (
                tasks
                  .filter(task => filterSectorId === 'all' || task.sector_id === filterSectorId)
                  .map((task) => (
                    <div key={task.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{task.description}</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                              {task.employee?.full_name || 'Unassigned'}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded ${
                              task.status === 'completed' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : task.status === 'approved'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                : task.status === 'in-progress'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                                : task.status === 'declined'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            }`}>
                              {task.status}
                            </span>
                            {task.due_date && (
                              <span className="text-gray-400 dark:text-gray-500">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                            {task.status === 'declined' && task.declined_reason && (
                              <span className="text-xs text-red-500 ml-2">
                                Reason: {task.declined_reason}
                              </span>
                            )}
                            {task.client_name && (
                              <span className="text-xs text-blue-500 ml-2">
                                Client: {task.client_name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => openViewModal(task)}
                            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="px-2 py-1 text-sm text-red-600 hover:text-red-800 transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {task.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAdminTaskAction(task.id, 'approved')}
                                disabled={processingId === task.id}
                                className="px-3 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAdminTaskAction(task.id, 'declined')}
                                disabled={processingId === task.id}
                                className="px-3 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                          
                          {task.status === 'completed' && (
                            <button
                              onClick={() => handleAdminTaskAction(task.id, 'finalized')}
                              disabled={processingId === task.id}
                              className="px-3 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
                            >
                              Finalize & Pay
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* View Task Modal */}
      {showViewModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Task Details
              </h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedTask(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Title
                </label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedTask.title}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Description
                </label>
                <p className="text-gray-700 dark:text-gray-300">
                  {selectedTask.description || "No description provided."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Status
                </label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedTask.status === "completed"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      : selectedTask.status === "approved"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                      : selectedTask.status === "in-progress"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                      : selectedTask.status === "declined"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                  }`}
                >
                  {selectedTask.status}
                </span>
              </div>

              {selectedTask.due_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Due Date
                  </label>
                  <p className="text-gray-700 dark:text-gray-300">
                    {new Date(selectedTask.due_date).toLocaleDateString()}
                  </p>
                </div>
              )}

              {selectedTask.client_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Client Name
                  </label>
                  <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    {selectedTask.client_name}
                  </p>
                </div>
              )}

              {selectedTask.client_contact && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Client Contact
                  </label>
                  <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {selectedTask.client_contact}
                  </p>
                </div>
              )}

              {selectedTask.status === 'declined' && selectedTask.declined_reason && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    Decline Reason
                  </label>
                  <p className="text-red-600 dark:text-red-400">
                    {selectedTask.declined_reason}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Created
                </label>
                <p className="text-gray-700 dark:text-gray-300">
                  {new Date(selectedTask.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedTask(null);
                }}
                className="px-4 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Task
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}