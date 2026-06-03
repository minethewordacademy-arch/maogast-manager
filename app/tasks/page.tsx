'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Search,
  BarChart,
  TrendingUp
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'in-progress' | 'completed' | 'declined';
  declined_reason?: string | null;
  due_date: string | null;
  created_at: string;
  sector_id: string;
  employee_id: string;
  client_name?: string | null;
  client_contact?: string | null;
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
  sector_id: string;
  role: string;
  commission_rate: number;
}

interface Sector {
  id: string;
  name: string;
}

export default function TasksPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSector, setFilterSector] = useState<string>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');

  const router = useRouter();

  // Define fetchData BEFORE useEffect
  const fetchData = useCallback(async (authId: string) => {
  try {
    setLoading(true);
    setError(null);

    // Fetch current employee
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('auth_id', authId);

    if (empError) throw new Error(empError.message);
    if (!empData || empData.length === 0) {
      router.push('/login');
      return;
    }

    const currentEmployee = empData[0];
    setIsAdmin(currentEmployee.role === 'admin');

    // Fetch sectors
    const { data: sectorData, error: sectorError } = await supabase
      .from('sectors')
      .select('id, name');

    if (sectorError) throw new Error(sectorError.message);
    setSectors(sectorData || []);

    // Fetch all employees (for admin filter)
    const { data: allEmpData, error: allEmpError } = await supabase
      .from('employees')
      .select('*')
      .eq('sector_id', currentEmployee.sector_id);

    if (allEmpError) throw new Error(allEmpError.message);
    setEmployees(allEmpData || []);

    // Fetch tasks
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      // For employees, show only their tasks
      const employeeIds = empData.map(e => e.id);
      query = query.in('employee_id', employeeIds);
    }

    const { data: taskData, error: taskError } = await query;

    if (taskError) throw new Error(taskError.message);
    setTasks(taskData || []);

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
}, [isAdmin, router]);

  useEffect(() => {
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    fetchData(session.user.id);
  };
  checkAuth();
}, [router, fetchData]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search filter
      const matchesSearch = 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.client_name && task.client_name.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;

      // Sector filter
      const matchesSector = filterSector === 'all' || task.sector_id === filterSector;

      // Employee filter (admin only)
      const matchesEmployee = !isAdmin || filterEmployee === 'all' || task.employee_id === filterEmployee;

      return matchesSearch && matchesStatus && matchesSector && matchesEmployee;
    });
  }, [tasks, searchTerm, filterStatus, filterSector, filterEmployee, isAdmin]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in-progress': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'declined': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const approved = tasks.filter(t => t.status === 'approved').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const declined = tasks.filter(t => t.status === 'declined').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, pending, inProgress, approved, completed, declined, completionRate };
  }, [tasks]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-orange-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading tasks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Tasks
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {isAdmin ? 'Overview of all tasks across all sectors' : 'Track your work and progress'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <BarChart className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-purple-600">{stats.inProgress}</p>
              </div>
              <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Approved</p>
                <p className="text-2xl font-bold text-blue-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">{stats.completionRate}%</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks by title, description, or client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="declined">Declined</option>
              </select>
              <select
                value={filterSector}
                onChange={(e) => setFilterSector(e.target.value)}
                className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
              >
                <option value="all">All Sectors</option>
                {sectors.map(sector => (
                  <option key={sector.id} value={sector.id}>{sector.name}</option>
                ))}
              </select>
              {isAdmin && (
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700"
                >
                  <option value="all">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Task</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Sector</th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Assigned To</th>
                  )}
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Due Date</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No tasks found. Adjust your filters or create a new task.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{task.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {task.description}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                        {task.status === 'declined' && task.declined_reason && (
                          <div className="mt-1 text-xs text-red-500 truncate max-w-xs">
                            Reason: {task.declined_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {sectors.find(s => s.id === task.sector_id)?.name || 'Unknown'}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {employees.find(e => e.id === task.employee_id)?.full_name || 'Unknown'}
                        </td>
                      )}
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {task.client_name || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}