'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Home } from 'lucide-react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // 1. Sign up with Supabase Auth
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. If sign up successful, create an employee record
    if (data.user) {
      try {
        // Get the Software Development sector ID
        const { data: sectorData } = await supabase
          .from('sectors')
          .select('id')
          .eq('name', 'Software Development')
          .maybeSingle();

        const sectorId = sectorData?.id;

        // Check if the employee already exists (to avoid duplicates)
        const { data: existingEmployee } = await supabase
          .from('employees')
          .select('id')
          .eq('auth_id', data.user.id)
          .maybeSingle();

        if (!existingEmployee) {
          const { error: employeeError } = await supabase
            .from('employees')
            .insert({
              auth_id: data.user.id,
              email: email,
              full_name: fullName,
              role: 'employee',
              sector_id: sectorId,
            });

          if (employeeError) {
            setMessage('Account created! Please wait for admin to assign your role.');
          } else {
            setMessage('Account created successfully! You can now log in.');
          }
        } else {
          setMessage('Account already exists. Please log in.');
        }
        
        // 3. Redirect to login page after a short delay
        setTimeout(() => {
          router.push('/login');
        }, 2000);

      } catch {
        setMessage('Account created. Please check your email for confirmation.');
        // Redirect anyway
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* ✅ Navigation Bar */}
      <nav className="w-full bg-white dark:bg-gray-800 shadow-sm py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-orange-600 transition-colors">
            <Home className="w-5 h-5" />
            <span className="font-medium">Back to Home</span>
          </Link>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Maogast Internal
          </div>
        </div>
      </nav>

      {/* ✅ Sign Up Form Container */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
          <div>
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
              Create Account
            </h2>
            <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
              Join Maogast Internal Management
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {error}
              </div>
            )}

            {message && (
              <div className="text-green-600 text-sm text-center bg-green-50 dark:bg-green-900/20 p-2 rounded">
                {message}
                <p className="text-xs mt-1">Redirecting to login...</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>

            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-orange-600 hover:text-orange-700 font-medium">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}