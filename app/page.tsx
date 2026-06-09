"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Code,
  Shield,
  Users,
  CheckCircle,
  Clock,
  BarChart3,
  Star,
  Zap,
  Loader2,
  Heart,
  PenTool,
  BookOpen,
} from "lucide-react";

interface Stats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalClients: number;
  totalEmployees: number;
  totalSectors: number;
}

// Define the EGW Quote type
interface EgwQuote {
  text: string;
  reference: string;
}

const bibleVerses = [
  "Commit to the Lord whatever you do, and he will establish your plans. – Proverbs 16:3",
  "I can do all this through him who gives me strength. – Philippians 4:13",
  "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future. – Jeremiah 29:11",
  "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight. – Proverbs 3:5-6",
  "The Lord is my shepherd, I lack nothing. – Psalm 23:1",
  "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go. – Joshua 1:9",
  "Let the peace of Christ rule in your hearts. – Colossians 3:15",
  "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters. – Colossians 3:23",
  "A little one shall become a thousand, and a small one a mighty nation: I the LORD will hasten it in its time. – Isaiah 60:22",
  "I will make a man more precious than fine gold; even a man than golden wedge of Ophir. – Isaiah 13:12",
];

const motivationalQuotes = [
  "The secret of getting ahead is getting started. – Mark Twain",
  "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
  "Success is the sum of small efforts, repeated day in and day out. – Robert Collier",
  "Believe you can and you're halfway there. – Theodore Roosevelt",
  "The only way to do great work is to love what you do. – Steve Jobs",
  "It does not matter how slowly you go as long as you do not stop. – Confucius",
  "If you are not willing to risk the usual, you will have to settle for the ordinary. – Jim Rohn",
  "The future belongs to those who believe in the beauty of their dreams. – Eleanor Roosevelt",
  "Hope for the best and prepare for the worst. – Moses Ogutu",
  "Stars do not seek attention, they earn admiration by shining. – TRM gift",
];

// Ellen G. White Quotes
const egwQuotes: EgwQuote[] = [
  {
    text: "Everyone should have an aim, an object, in life. The loins of the mind should be girded up, and the thoughts be trained to keep to the point as the compass to the pole. The mind should be directed in the right channel, according to well-formed plans. Then every step will be a step in advance. No time will be lost in following vague ideas and random plans. Worthy purposes should be kept constantly in view, and every thought and act should tend to their accomplishment. Let there ever be a fixedness of purpose to carry out that which is undertaken.",
    reference: "RC 163.5",
  },
  {
    text: "The Bible is the best book in the world for intellectual culture. The grand themes presented in it, the dignified simplicity with which these themes are handled, the light which it sheds upon the mysteries of heaven, bring strength and vigor to the understanding.",
    reference: "The Review and Herald, April 6, 1886 — RC 163.8",
  },
  {
    text: "Truly earnest men are few in our world, but they are greatly needed. The example of an energetic person is far-reaching; he has an electric power over others. He meets obstacles in his work; but he has the push in him, and instead of allowing his way to be hedged up, he breaks down every barrier.",
    reference: "RC 163.2",
  },
  {
    text: "There are thorns in every path. All who follow the Lord's leading must expect to meet with disappointments, crosses, and losses. But a spirit of true heroism will help them to overcome these. Many greatly magnify seeming difficulties, and then begin to pity themselves and give way to despondency. Such need to make an entire change in themselves. They need to discipline themselves to put forth exertion, and to overcome all childish feelings. They should determine that life shall not be spent in working at trifles. Let them resolve to accomplish something, and then do it.",
    reference: "RC 163.3",
  },
   {
    text: "These words are to be believed and practiced. Christians are to be superior in wisdom, in knowledge, in skill, because they believe in God and His power. The Lord desires them to reach the highest round of the ladder, that they may glorify Him. He has a treasure-house of wisdom from which they may draw.....",
    reference: "RC 164.5",
  },
];

export default function LandingPage() {
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    totalClients: 0,
    totalEmployees: 0,
    totalSectors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentQuote, setCurrentQuote] = useState("");
  const [currentVerse, setCurrentVerse] = useState("");
  // Use object state for EGW quotes
  const [currentEgwQuote, setCurrentEgwQuote] = useState<EgwQuote | null>(null);

  const fetchStats = async () => {
    try {
      // Fetch tasks stats
      const { count: totalTasks } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true });

      const { count: pendingTasks } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: inProgressTasks } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("status", "in-progress");

      const { count: completedTasks } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed");

      // Fetch clients stats
      const { count: totalClients } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      // Fetch employees stats
      const { count: totalEmployees } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true });

      // Fetch sectors stats
      const { count: totalSectors } = await supabase
        .from("sectors")
        .select("*", { count: "exact", head: true });

      setStats({
        totalTasks: totalTasks || 0,
        pendingTasks: pendingTasks || 0,
        inProgressTasks: inProgressTasks || 0,
        completedTasks: completedTasks || 0,
        totalClients: totalClients || 0,
        totalEmployees: totalEmployees || 0,
        totalSectors: totalSectors || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();

    // Set random quote, verse, and EGW quote on load
    const randomQuote =
      motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    const randomVerse =
      bibleVerses[Math.floor(Math.random() * bibleVerses.length)];
    const randomEgw =
      egwQuotes[Math.floor(Math.random() * egwQuotes.length)];
    setCurrentQuote(randomQuote);
    setCurrentVerse(randomVerse);
    setCurrentEgwQuote(randomEgw);

    // Rotate quotes, verses, and EGW quotes every 50 seconds
    const interval = setInterval(() => {
      const newQuote =
        motivationalQuotes[
          Math.floor(Math.random() * motivationalQuotes.length)
        ];
      const newVerse =
        bibleVerses[Math.floor(Math.random() * bibleVerses.length)];
      const newEgw =
        egwQuotes[Math.floor(Math.random() * egwQuotes.length)];
      setCurrentQuote(newQuote);
      setCurrentVerse(newVerse);
      setCurrentEgwQuote(newEgw);
    }, 50000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section with Dynamic Stats */}
      <div className="relative overflow-hidden bg-linear-to-br from-gray-900 via-gray-800 to-orange-900">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500 rounded-full blur-3xl opacity-20 animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse delay-1000" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-semibold mb-6 animate-fade-in-up border border-orange-500/20">
              <Zap className="w-3 h-3" />
              Internal Management System
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-fade-in-up animation-delay-200">
              <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-yellow-500">
                Maogast
              </span>{" "}
              Manager
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10 animate-fade-in-up animation-delay-400">
              Built on Code, Grounded in Faith – A powerful internal management
              system for Maogast Softworks.
            </p>

            {loading ? (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-10 animate-fade-in-up animation-delay-600">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-300">Total Tasks</p>
                      <p className="text-2xl font-bold text-white">
                        {stats.totalTasks}
                      </p>
                    </div>
                    <BarChart3 className="w-6 h-6 text-orange-400" />
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-300">Pending</p>
                      <p className="text-2xl font-bold text-yellow-300">
                        {stats.pendingTasks}
                      </p>
                    </div>
                    <Clock className="w-6 h-6 text-yellow-300" />
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-300">In Progress</p>
                      <p className="text-2xl font-bold text-purple-300">
                        {stats.inProgressTasks}
                      </p>
                    </div>
                    <Loader2 className="w-6 h-6 text-purple-300 animate-spin" />
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-300">Completed</p>
                      <p className="text-2xl font-bold text-green-300">
                        {stats.completedTasks}
                      </p>
                    </div>
                    <CheckCircle className="w-6 h-6 text-green-300" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 justify-center animate-fade-in-up animation-delay-800">
              <Link
                href="/login"
                className="px-8 py-4 bg-linear-to-r from-orange-500 to-yellow-500 text-white rounded-full hover:shadow-lg hover:shadow-orange-500/25 transition-all transform hover:-translate-y-1 font-semibold flex items-center gap-2"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-full hover:bg-white/20 transition-all font-semibold"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary - Additional Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Employees
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalEmployees}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Clients
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalClients}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Code className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sectors
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalSectors}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Completion Rate
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalTasks > 0
                    ? Math.round(
                        (stats.completedTasks / stats.totalTasks) * 100,
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bible Verse Section */}
      <div className="bg-linear-to-r from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <Heart className="w-8 h-8 text-green-500 mx-auto fill-green-500" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-l-4 border-green-500">
            <p className="text-xl md:text-2xl text-gray-800 dark:text-gray-200 italic">
              &quot;{currentVerse}&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Visual Boundary */}
      <div className="w-full h-4 bg-linear-to-r from-green-50 to-orange-50 dark:from-gray-800 dark:to-gray-900" />

      {/* Motivational Quote Section */}
      <div className="bg-linear-to-r from-orange-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <Heart className="w-8 h-8 text-orange-500 mx-auto fill-orange-500" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-l-4 border-orange-500">
            <p className="text-xl md:text-2xl text-gray-800 dark:text-gray-200 italic">
              &quot;{currentQuote}&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Pen of Inspiration Section (Ellen G. White) */}
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <PenTool className="w-8 h-8 text-blue-600 mx-auto" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">
              Pen of Inspiration
            </h3>
          </div>
          {currentEgwQuote && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border-l-4 border-blue-600 relative overflow-hidden">
              {/* Decorative circle */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 dark:bg-blue-900/30 rounded-full blur-2xl opacity-50" />
              
              <div className="relative">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-4" />
                <p className="text-lg md:text-xl text-gray-800 dark:text-gray-200 text-justify leading-relaxed">
                  &quot;{currentEgwQuote.text}&quot;
                </p>
                <p className="mt-6 text-sm text-blue-600 dark:text-blue-400 font-medium text-right border-t pt-4 border-gray-200 dark:border-gray-700">
                  — Ellen G. White, <span className="font-bold">{currentEgwQuote.reference}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Why Maogast Manager?
          </h2>
          <div className="w-20 h-1 bg-orange-500 mx-auto rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-orange-200">
            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-500 transition-colors">
              <Code className="w-7 h-7 text-orange-600 dark:text-orange-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Task Management
            </h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Track and manage tasks across all sectors with real-time updates
              and status tracking.
            </p>
          </div>
          <div className="group p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-orange-200">
            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-500 transition-colors">
              <Users className="w-7 h-7 text-orange-600 dark:text-orange-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Multi-Sector Support
            </h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Employees can belong to multiple sectors and access tasks from all
              their assigned areas.
            </p>
          </div>
          <div className="group p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-orange-200">
            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-500 transition-colors">
              <Shield className="w-7 h-7 text-orange-600 dark:text-orange-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Admin Controls
            </h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Full admin panel for managing commissions, employee rates, and
              tracking financials.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-900 py-8 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>
            © {new Date().getFullYear()} Maogast Softworks Ltd. Built on Code,
            Grounded in Faith.
          </p>
        </div>
      </footer>
    </div>
  );
}