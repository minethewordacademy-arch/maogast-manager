'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, 
  AlertCircle, 
  User,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'in-progress' | 'completed' | 'declined';
  due_date: string | null;
  created_at: string;
  sector_id: string;
  employee_id: string;
  client_name?: string | null;
  employee: {
    id: string;
    full_name: string;
  } | null;
}

export default function SectorTasksPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchSectorTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 2. Get ALL employee records for this user (handles multi-sector)
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, sector_id')
        .eq('auth_id', session.user.id);

      if (empError) throw new Error(empError.message);
      if (!empData || empData.length === 0) {
        router.push('/login');
        return;
      }

      // Get all sector IDs the user belongs to
      const sectorIds = empData.map(e => e.sector_id);

      // 3. Fetch ALL tasks for these sectors (including those created by others)
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          employee:employees(id, full_name)
        `)
        .in('sector_id', sectorIds)
        .order('created_at', { ascending: false });

      if (taskError) throw new Error(taskError.message);
      setTasks(taskData || []);

    } catch (err: unknown) {
      console.error('Error fetching sector tasks:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sector tasks';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSectorTasks();
  }, [fetchSectorTasks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in-progress': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'declined': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-orange-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading sector tasks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sector Team Tasks
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View all tasks across your sector to see what your team is working on.
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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Task</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Assigned To</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Due Date</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No tasks found in your sector. It&apos;s a clean slate!
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{task.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {task.description}
                        </div>
                        {task.client_name && (
                          <div className="text-xs text-blue-500 mt-1">
                            Client: {task.client_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {task.employee?.full_name || 'Unknown Employee'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {new Date(task.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>👁️ You are viewing these tasks in read-only mode. Only the assigned employee can update them.</p>
        </div>
      </div>
    </div>
  );
}