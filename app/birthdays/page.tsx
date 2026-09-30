// app/birthdays/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Gift, 
  Calendar, 
  Users, 
  User as UserIcon,
  Loader2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface BirthdayPerson {
  id: string;
  full_name: string;
  email?: string;
  birthday: string;
  type: 'client' | 'employee';
  sector?: string;
}

export default function BirthdaysPage() {
  const [loading, setLoading] = useState(true);
  const [birthdays, setBirthdays] = useState<BirthdayPerson[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const router = useRouter();

  const fetchBirthdays = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch clients with birthdays
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, full_name, email, birthday')
        .not('birthday', 'is', null);

      if (clientsError) throw new Error(clientsError.message);

      // Fetch employees with birthdays
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, full_name, email, birthday')
        .not('birthday', 'is', null);

      if (employeesError) throw new Error(employeesError.message);

      // Combine and format
      const allBirthdays: BirthdayPerson[] = [
        ...(clients || []).map(c => ({
          id: c.id,
          full_name: c.full_name,
          email: c.email || undefined,
          birthday: c.birthday,
          type: 'client' as const,
        })),
        ...(employees || []).map(e => ({
          id: e.id,
          full_name: e.full_name,
          email: e.email,
          birthday: e.birthday,
          type: 'employee' as const,
        })),
      ];

      // Sort by month and day
      allBirthdays.sort((a, b) => {
        const aDate = new Date(a.birthday);
        const bDate = new Date(b.birthday);
        if (aDate.getMonth() !== bDate.getMonth()) {
          return aDate.getMonth() - bDate.getMonth();
        }
        return aDate.getDate() - bDate.getDate();
      });

      setBirthdays(allBirthdays);
    } catch (err: unknown) {
      console.error('Error fetching birthdays:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load birthdays';
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
      fetchBirthdays();
    };
    checkAuth();
  }, [router]);

  const getMonthName = (monthIndex: number) => {
    return new Date(2026, monthIndex).toLocaleString('default', { month: 'long' });
  };

  const filteredBirthdays = birthdays.filter(b => {
    const month = new Date(b.birthday).getMonth();
    return month === selectedMonth;
  });

  const upcomingBirthdays = birthdays.filter(b => {
    const today = new Date();
    const birthday = new Date(b.birthday);
    birthday.setFullYear(today.getFullYear());
    const diffDays = Math.ceil((birthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-orange-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading birthdays...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 shrink-0" />
              Birthday Tracker
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Celebrating our clients and team members on their special day
            </p>
          </div>
          <Link
            href="/clients"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Users className="w-5 h-5" />
            Manage Clients
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Upcoming Birthdays */}
        <div className="mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600 shrink-0" />
            Upcoming Birthdays (Next 30 Days)
          </h2>
          {upcomingBirthdays.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
              No upcoming birthdays in the next 30 days.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingBirthdays.map((person) => {
                const today = new Date();
                const birthday = new Date(person.birthday);
                birthday.setFullYear(today.getFullYear());
                const diffDays = Math.ceil((birthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={person.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-l-4 border-orange-500 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link 
                          href={person.type === 'client' ? `/clients` : `/admin?employee=${person.id}`}
                          className="font-semibold text-gray-900 dark:text-white hover:text-orange-600 hover:underline block truncate"
                        >
                          {person.full_name}
                        </Link>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {person.email || 'No email'} • <span className="capitalize">{person.type}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap justify-between items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        🎂 {new Date(person.birthday).toLocaleDateString()}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                        diffDays === 0 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {diffDays === 0 ? 'Today!' : `${diffDays} day${diffDays === 1 ? '' : 's'}`}
                      </span>
                    </div>
                    
                    {person.type === 'client' && (
                      <Link 
                        href={`/clients`}
                        className="mt-3 inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        View Client Details <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Month Filter */}
        <div className="mb-6 sm:mb-8">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter by Month
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full sm:w-64 px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white text-base"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {getMonthName(i)}
              </option>
            ))}
          </select>
        </div>

        {/* All Birthdays List */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600 shrink-0" />
            {getMonthName(selectedMonth)} Birthdays
          </h2>
          {filteredBirthdays.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
              No birthdays in {getMonthName(selectedMonth)}.
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBirthdays.map((person) => (
                  <div key={person.id} className="p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center shrink-0">
                        <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <Link 
                          href={person.type === 'client' ? `/clients` : `/admin?employee=${person.id}`}
                          className="font-medium text-gray-900 dark:text-white hover:text-orange-600 hover:underline block truncate"
                        >
                          {person.full_name}
                        </Link>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {person.email || 'No email'} • <span className="capitalize">{person.type}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 ml-13 sm:ml-0">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(person.birthday).toLocaleDateString()}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        person.type === 'client' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {person.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}