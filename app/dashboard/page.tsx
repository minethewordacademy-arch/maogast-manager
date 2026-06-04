"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import {
  CheckCircle,
  Clock,
  Plus,
  X,
  Loader2,
  Banknote,
  Pencil,
  Trash2,
  Eye,
  User as UserIcon,
  Phone,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "approved" | "in-progress" | "completed" | "declined";
  declined_reason?: string | null;
  due_date: string | null;
  created_at: string;
  sector_id: string | null;
  project_id: string | null;
  employee_id: string | null;
  commission_earned: number | null;
  client_name?: string | null;
  client_contact?: string | null;
}

interface Project {
  id: string;
  description: string;
  sector_id: string;
  client_id: string | null;
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
  sector_id: string;
  role: string;
  commission_rate: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [allEmployeeRecords, setAllEmployeeRecords] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sectorOptions, setSectorOptions] = useState<{ id: string; name: string }[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [pendingCount, setPendingCount] = useState(0);
  const [totalCommissionEarned, setTotalCommissionEarned] = useState(0);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalMessage, setModalMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // New task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [projectInput, setProjectInput] = useState("");
  const [selectedSectorId, setSelectedSectorId] = useState("");

  // New client fields for when a new project is created
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");

  const router = useRouter();

  const fetchTasks = async (authId: string) => {
    try {
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("auth_id", authId);

      if (empError) throw empError;
      
      if (!empData || empData.length === 0) {
        setLoading(false);
        return;
      }

      setAllEmployeeRecords(empData);
      const primaryEmployee = empData[0];
      setEmployee(primaryEmployee);

      const sectors: { id: string; name: string }[] = [];
      for (const emp of empData) {
        const { data: sectorData } = await supabase
          .from("sectors")
          .select("name")
          .eq("id", emp.sector_id)
          .single();
        
        if (sectorData) {
          sectors.push({
            id: emp.sector_id,
            name: sectorData.name,
          });
        }
      }
      setSectorOptions(sectors);
      if (sectors.length > 0) {
        setSelectedSectorId(sectors[0].id);
      }

      const employeeIds = empData.map((e) => e.id);

      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .in("employee_id", employeeIds)
        .order("created_at", { ascending: false });

      if (taskError) throw taskError;
      setTasks(taskData || []);

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("id, description, sector_id, client_id")
        .eq("sector_id", primaryEmployee.sector_id);

      if (projectError) throw projectError;
      setProjects(projectData || []);

      setPendingCount(
        (taskData || []).filter(
          (t) => t.status === "pending" || t.status === "in-progress" || t.status === "approved",
        ).length,
      );

      if (primaryEmployee.role === "admin") {
        const { data: sectorEmployees, error: secEmpError } = await supabase
          .from("employees")
          .select("id")
          .eq("sector_id", primaryEmployee.sector_id);

        if (secEmpError) throw secEmpError;

        const empIds = sectorEmployees?.map((e) => e.id) || [];
        if (empIds.length > 0) {
          const { data: commData, error: commError } = await supabase
            .from("commissions")
            .select("amount")
            .in("employee_id", empIds);

          if (commError) throw commError;

          const total = commData?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
          setTotalCommissionEarned(total);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      fetchTasks(session.user.id);
    };
    checkAuth();
  }, [router]);

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      setModalMessage(null);
      
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      setModalMessage({
        text: `Task status updated to ${newStatus}`,
        type: 'success'
      });

      if (user) fetchTasks(user.id);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setModalMessage({
        text: `Failed to update task status: ${errorMessage}`,
        type: 'error'
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      return;
    }

    try {
      setModalMessage(null);
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setModalMessage({
        text: "Task deleted successfully.",
        type: 'success'
      });

      if (user) fetchTasks(user.id);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setModalMessage({
        text: `Failed to delete task: ${errorMessage}`,
        type: 'error'
      });
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    
    setModalMessage(null);
    setIsSubmitting(true);

    try {
      const updates: Partial<Task> = {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        due_date: taskDueDate || null,
        client_name: clientName.trim() || null,
        client_contact: clientContact.trim() || null,
      };

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', selectedTask.id);

      if (error) throw error;

      setModalMessage({
        text: "Task updated successfully!",
        type: 'success'
      });

      setShowEditModal(false);
      setSelectedTask(null);
      if (user) fetchTasks(user.id);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setModalMessage({
        text: `Failed to update task: ${errorMessage}`,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || "");
    setTaskDueDate(task.due_date || "");
    setClientName(task.client_name || "");
    setClientContact(task.client_contact || "");
    setShowEditModal(true);
  };

  const openViewModal = (task: Task) => {
    setSelectedTask(task);
    setShowViewModal(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalMessage(null);

    if (!employee || allEmployeeRecords.length === 0) {
      setModalMessage({
        text: "Error: No employee found. Please log out and log back in.",
        type: "error",
      });
      return;
    }

    if (!taskTitle.trim()) {
      setModalMessage({ text: "Please enter a task title.", type: "error" });
      return;
    }

    if (!selectedSectorId) {
      setModalMessage({ text: "Please select a sector.", type: "error" });
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedEmployee = allEmployeeRecords.find(
        (emp) => emp.sector_id === selectedSectorId
      );

      if (!selectedEmployee) {
        setModalMessage({
          text: "Error: You are not assigned to the selected sector.",
          type: "error",
        });
        setIsSubmitting(false);
        return;
      }

      let projectId = taskProjectId;

      if (projectInput.trim() && !taskProjectId) {
        let clientId = null;

        if (clientName.trim()) {
          const { data: newClient, error: clientError } = await supabase
            .from("clients")
            .insert({
              full_name: clientName.trim(),
              phone: clientContact.trim() || null,
            })
            .select()
            .single();

          if (clientError) {
            setModalMessage({
              text: `Client Error: ${clientError.message}`,
              type: "error",
            });
            setIsSubmitting(false);
            return;
          }
          clientId = newClient.id;
        }

        const { data: newProject, error: projectError } = await supabase
          .from("projects")
          .insert({
            description: projectInput.trim(),
            sector_id: selectedSectorId,
            client_id: clientId,
          })
          .select()
          .single();

        if (projectError) {
          setModalMessage({
            text: `Project Error: ${projectError.message}`,
            type: "error",
          });
          setIsSubmitting(false);
          return;
        }
        projectId = newProject.id;
      }

      const { error: taskError } = await supabase.from("tasks").insert({
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        due_date: taskDueDate || null,
        status: "pending",
        project_id: projectId || null,
        employee_id: selectedEmployee.id,
        sector_id: selectedSectorId,
        client_name: clientName.trim() || null,
        client_contact: clientContact.trim() || null,
      });

      if (taskError) {
        setModalMessage({
          text: `Task Error: ${taskError.message}`,
          type: "error",
        });
        setIsSubmitting(false);
        return;
      }

      setModalMessage({ text: "Task created successfully!", type: "success" });

      setTaskTitle("");
      setTaskDescription("");
      setTaskDueDate("");
      setTaskProjectId("");
      setProjectInput("");
      setClientName("");
      setClientContact("");

      setTimeout(() => {
        setShowTaskModal(false);
        setModalMessage(null);
        if (user) fetchTasks(user.id);
      }, 1500);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setModalMessage({
        text: `Unexpected Error: ${errorMessage}`,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-orange-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-0">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Tasks
          </h2>
          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Task
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Tasks</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {tasks.filter(t => t.status !== 'completed' && t.status !== 'declined').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {tasks.filter((t) => t.status === "completed").length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {tasks.length}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>

        {employee?.role === "admin" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total Commission (Sector)
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    KES {totalCommissionEarned.toFixed(2)}
                  </p>
                </div>
                <Banknote className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              My Tasks
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {tasks.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                No tasks assigned yet. Click &quot;New Task&quot; to get started.
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {task.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {task.description}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          task.status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : task.status === "approved"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : task.status === "in-progress"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                            : task.status === "declined"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {task.status}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
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
                      onClick={() => openEditModal(task)}
                      className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                      title="Edit Task"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="px-2 py-1 text-sm text-red-600 hover:text-red-800 transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {task.status === 'approved' && (
                      <button
                        onClick={() => handleTaskStatusChange(task.id, 'in-progress')}
                        className="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md whitespace-nowrap"
                      >
                        Start Work
                      </button>
                    )}
                    
                    {task.status === 'in-progress' && (
                      <button
                        onClick={() => handleTaskStatusChange(task.id, 'completed')}
                        className="px-3 py-1 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-md whitespace-nowrap"
                      >
                        Request Completion
                      </button>
                    )}
                    
                    {task.status === 'pending' && (
                      <span className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-md whitespace-nowrap">
                        Awaiting Approval
                      </span>
                    )}
                    
                    {task.status === 'completed' && (
                      <span className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-md whitespace-nowrap">
                        Pending Finalization
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create New Task
              </h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              {modalMessage && (
                <div
                  className={`p-3 mb-4 rounded-md text-sm ${
                    modalMessage.type === "success"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {modalMessage.text}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sector <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSectorId}
                  onChange={(e) => setSelectedSectorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {sectorOptions.length === 0 ? (
                    <option value="">No sectors assigned</option>
                  ) : (
                    sectorOptions.map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {sector.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="e.g. Design website logo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Describe the task..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Link to Project
                </label>
                <select
                  value={taskProjectId}
                  onChange={(e) => setTaskProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a project (optional)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.description}
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Or create a new project below:
                </div>
                <input
                  type="text"
                  value={projectInput}
                  onChange={(e) => setProjectInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Type new project name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client Name (Optional)
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client Contact (Optional)
                </label>
                <input
                  type="text"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="e.g. 0722 123 456"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
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
                      Creating...
                    </span>
                  ) : (
                    "Create Task"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Edit Task
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedTask(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="e.g. Design website logo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Describe the task..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client Name (Optional)
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client Contact (Optional)
                </label>
                <input
                  type="text"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="e.g. 0722 123 456"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedTask(null);
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
                      Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
}