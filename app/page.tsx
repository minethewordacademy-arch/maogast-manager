// app/page.tsx
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
  Sparkles,
  ArrowRight,
  Layers,
  Target,
  TrendingUp,
  Quote,
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
  "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters. – Colossians 3:23",
  "A little one shall become a thousand, and a small one a mighty nation: I the LORD will hasten it in its time. – Isaiah 60:22",
];

const motivationalQuotes = [
  "The secret of getting ahead is getting started. – Mark Twain",
  "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
  "Success is the sum of small efforts, repeated day in and day out. – Robert Collier",
  "Believe you can and you're halfway there. – Theodore Roosevelt",
  "The only way to do great work is to love what you do. – Steve Jobs",
  "It does not matter how slowly you go as long as you do not stop. – Confucius",
  "The future belongs to those who believe in the beauty of their dreams. – Eleanor Roosevelt",
  "Stars do not seek attention, they earn admiration by shining. – TRM gift",
];

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
  const [currentEgwQuote, setCurrentEgwQuote] = useState<EgwQuote | null>(null);

  const fetchStats = async () => {
    try {
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

      const { count: totalClients } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      const { count: totalEmployees } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true });

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

    const randomQuote =
      motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    const randomVerse =
      bibleVerses[Math.floor(Math.random() * bibleVerses.length)];
    const randomEgw =
      egwQuotes[Math.floor(Math.random() * egwQuotes.length)];
    setCurrentQuote(randomQuote);
    setCurrentVerse(randomVerse);
    setCurrentEgwQuote(randomEgw);

    const interval = setInterval(() => {
      const newQuote =
        motivationalQuotes[
          Math.floor(Math.random() * motivationalQuotes.length)
        ];
      const newVerse =
        bibleVerses[Math.floor(Math.random() * bibleVerses.length)];
      const newEgw = egwQuotes[Math.floor(Math.random() * egwQuotes.length)];
      setCurrentQuote(newQuote);
      setCurrentVerse(newVerse);
      setCurrentEgwQuote(newEgw);
    }, 50000);

    return () => clearInterval(interval);
  }, []);

  const completionRate =
    stats.totalTasks > 0
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* ============================================================
          HERO SECTION
      ============================================================ */}
      <div className="relative overflow-hidden bg-linear-to-br from-gray-950 via-gray-900 to-orange-950">
        {/* Animated floating orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 -right-20 w-96 h-96 bg-orange-500 rounded-full blur-3xl opacity-20 animate-float" />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20 animate-float-delay" />
          <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-purple-500 rounded-full blur-3xl opacity-10 animate-float-slow" />
        </div>

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="text-center">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 text-orange-300 text-xs sm:text-sm font-semibold mb-6 animate-fade-in-up border border-orange-500/20 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Internal Management System</span>
            </div>

            {/* Logo emblem */}
            <div className="flex justify-center mb-6 animate-fade-in-up animation-delay-100">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-linear-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-2xl shadow-orange-500/30 rotate-3 hover:rotate-0 transition-transform duration-500">
                <span className="text-white text-3xl sm:text-4xl font-bold font-display">
                  M
                </span>
              </div>
            </div>

            {/* Main heading */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-white mb-6 animate-fade-in-up animation-delay-200 text-balance">
              <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-400 via-yellow-400 to-orange-500 animate-gradient">
                Maogast
              </span>{" "}
              <span className="font-display">Manager</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10 animate-fade-in-up animation-delay-400 text-pretty">
              <span className="font-display font-semibold text-white">
                Built on Code, Grounded in Faith.
              </span>
              <br className="hidden sm:block" />
              <span className="text-gray-400 text-base sm:text-lg">
                A powerful workspace where our team turns purpose into progress.
              </span>
            </p>

            {/* Live Stats Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-10 animate-fade-in-up animation-delay-600">
                <div className="glass rounded-xl p-3 sm:p-4 border border-white/10 hover:border-orange-500/30 transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
                        Total Tasks
                      </p>
                      <p className="text-xl sm:text-3xl font-bold text-white font-display">
                        {stats.totalTasks}
                      </p>
                    </div>
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
                  </div>
                </div>
                <div className="glass rounded-xl p-3 sm:p-4 border border-white/10 hover:border-yellow-500/30 transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
                        Pending
                      </p>
                      <p className="text-xl sm:text-3xl font-bold text-yellow-300 font-display">
                        {stats.pendingTasks}
                      </p>
                    </div>
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
                  </div>
                </div>
                <div className="glass rounded-xl p-3 sm:p-4 border border-white/10 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
                        In Progress
                      </p>
                      <p className="text-xl sm:text-3xl font-bold text-purple-300 font-display">
                        {stats.inProgressTasks}
                      </p>
                    </div>
                    <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-300 animate-spin" />
                  </div>
                </div>
                <div className="glass rounded-xl p-3 sm:p-4 border border-white/10 hover:border-green-500/30 transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">
                        Completed
                      </p>
                      <p className="text-xl sm:text-3xl font-bold text-green-300 font-display">
                        {stats.completedTasks}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-300" />
                  </div>
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-fade-in-up animation-delay-800">
              <Link
                href="/login"
                className="group px-6 sm:px-8 py-3.5 sm:py-4 bg-linear-to-r from-orange-500 to-yellow-500 text-white rounded-full hover:shadow-2xl hover:shadow-orange-500/30 transition-all transform hover:-translate-y-1 font-semibold flex items-center justify-center gap-2"
              >
                Sign In
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/signup"
                className="px-6 sm:px-8 py-3.5 sm:py-4 bg-white/5 backdrop-blur-sm text-white border border-white/20 rounded-full hover:bg-white/10 transition-all font-semibold"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          COMPANY PULSE — Key Metrics
      ============================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-semibold mb-3">
            <TrendingUp className="w-3 h-3" />
            Company Pulse
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            What&apos;s Moving Today
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Team Members
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-display">
                  {stats.totalEmployees}
                </p>
              </div>
            </div>
          </div>

          <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-900/50 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Star className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Clients Served
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-display">
                  {stats.totalClients}
                </p>
              </div>
            </div>
          </div>

          <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-900/50 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Sectors
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-display">
                  {stats.totalSectors}
                </p>
              </div>
            </div>
          </div>

          <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-900/50 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Completion Rate
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-display">
                  {completionRate}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          BIBLE VERSE
      ============================================================ */}
      <div className="bg-linear-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 py-14 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center">
              <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-green-500 fill-green-500" />
            </div>
          </div>
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 sm:p-10 border-l-4 border-green-500">
            <Quote className="absolute -top-3 -left-3 w-8 h-8 text-green-500 bg-white dark:bg-gray-800 rounded-full p-1 border-2 border-green-500" />
            <p className="text-lg sm:text-xl md:text-2xl text-gray-800 dark:text-gray-200 italic leading-relaxed text-balance">
              &quot;{currentVerse}&quot;
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
          MOTIVATIONAL QUOTE
      ============================================================ */}
      <div className="bg-linear-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 py-14 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-500/10 border-2 border-orange-500/20 flex items-center justify-center">
              <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500 fill-orange-500" />
            </div>
          </div>
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 sm:p-10 border-l-4 border-orange-500">
            <Quote className="absolute -top-3 -left-3 w-8 h-8 text-orange-500 bg-white dark:bg-gray-800 rounded-full p-1 border-2 border-orange-500" />
            <p className="text-lg sm:text-xl md:text-2xl text-gray-800 dark:text-gray-200 italic leading-relaxed text-balance">
              &quot;{currentQuote}&quot;
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
          PEN OF INSPIRATION (EGW)
      ============================================================ */}
      <div className="bg-linear-to-br from-blue-50 via-indigo-50 to-slate-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 py-14 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-500/10 border-2 border-blue-500/20 mb-4">
              <PenTool className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-display">
              Pen of Inspiration
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Words to carry through your workday
            </p>
          </div>

          {currentEgwQuote && (
            <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 sm:p-10 border-l-4 border-blue-600 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100 dark:bg-blue-900/30 rounded-full blur-3xl opacity-50 -mr-10 -mt-10" />

              <div className="relative">
                <BookOpen className="w-7 h-7 text-blue-600 dark:text-blue-400 mb-5" />
                <p className="text-base sm:text-lg md:text-xl text-gray-800 dark:text-gray-200 text-justify leading-relaxed">
                  &quot;{currentEgwQuote.text}&quot;
                </p>
                <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium text-right">
                    — Ellen G. White,{" "}
                    <span className="font-bold">
                      {currentEgwQuote.reference}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          FEATURES
      ============================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3 h-3" />
            Built for Excellence
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4 font-display">
            Why Maogast Manager?
          </h2>
          <div className="w-20 h-1 bg-linear-to-r from-orange-500 to-yellow-500 mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
          {[
            {
              icon: Code,
              title: "Precision Task Management",
              description:
                "Track, assign, and complete tasks across every sector with real-time status updates and clear accountability.",
              color: "orange",
            },
            {
              icon: Users,
              title: "Multi-Sector Collaboration",
              description:
                "Empower every team member to contribute across departments and see the full picture of what we're building together.",
              color: "blue",
            },
            {
              icon: Shield,
              title: "Admin Power & Clarity",
              description:
                "Complete control over commissions, employee rates, finances, and the entire operation — all in one place.",
              color: "purple",
            },
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="group relative p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:-translate-y-1 overflow-hidden"
              >
                <div
                  className={`absolute inset-0 bg-linear-to-br from-${feature.color}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
                />
                <div className="relative">
                  <div
                    className={`w-14 h-14 bg-${feature.color}-100 dark:bg-${feature.color}-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon
                      className={`w-7 h-7 text-${feature.color}-600 dark:text-${feature.color}-400`}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 font-display">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          FINAL CTA
      ============================================================ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
        <div className="relative overflow-hidden bg-linear-to-br from-gray-900 via-gray-800 to-orange-900 rounded-3xl p-8 sm:p-14 text-center">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-orange-500 rounded-full blur-3xl opacity-20 animate-float" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-blue-500 rounded-full blur-3xl opacity-20 animate-float-delay" />
          </div>
          <div className="relative">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 font-display text-balance">
              Ready to build something that lasts?
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto mb-8 text-pretty">
              Every task you complete, every client you serve, every line of
              code you write — it all contributes to a greater mission.
            </p>
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-linear-to-r from-orange-500 to-yellow-500 text-white rounded-full hover:shadow-2xl hover:shadow-orange-500/30 transition-all transform hover:-translate-y-1 font-semibold"
            >
              Enter the Workspace
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================
          FOOTER
      ============================================================ */}
      <footer className="bg-gray-50 dark:bg-gray-900 py-8 sm:py-10 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold font-display">
                M
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 font-display">
              Maogast Softworks
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Maogast Softworks Ltd. Built on Code,
            Grounded in Faith.
          </p>
        </div>
      </footer>
    </div>
  );
}