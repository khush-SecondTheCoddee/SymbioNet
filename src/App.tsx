import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Heart, 
  Brain, 
  User, 
  LayoutDashboard, 
  MessageSquare, 
  Sparkles, 
  Clock, 
  ShieldAlert,
  ChevronRight,
  Send,
  CheckCircle2
} from 'lucide-react';

// Types
interface Task {
  id: string;
  title: string;
  description: string;
  shadowSkill: string;
  estimatedTime: string;
  intensity: 'Low' | 'Medium' | 'High';
  priority: number;
  status: 'available' | 'in-progress' | 'completed';
  compatibility: number;
}

interface Vibe {
  status: 'Healthy' | 'Stressed' | 'At Risk';
  score: number;
  message: string;
}

interface VolunteerProfile {
  points: number;
  badges: string[];
  completedTasks: number;
  skills: string[];
}

interface LeaderboardEntry {
  name: string;
  points: number;
  badges: number;
}

export default function App() {
  const [view, setView] = useState<'ngo' | 'volunteer'>('ngo');
  const [projectText, setProjectText] = useState('');
  const [projectPriority, setProjectPriority] = useState(3);
  const [vibeText, setVibeText] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [vibe, setVibe] = useState<Vibe>({ status: 'Healthy', score: 1, message: 'Ready to help!' });
  const [profile, setProfile] = useState<VolunteerProfile>({ points: 0, badges: [], completedTasks: 0, skills: [] });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchLeaderboard();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks);
      setVibe(data.vibe);
      setProfile(data.profile);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setLeaderboard(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShatter = async () => {
    if (!projectText) return;
    setLoading(true);
    try {
      const res = await fetch('/api/project/shatter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDescription: projectText, priority: projectPriority })
      });
      const data = await res.json();
      setTasks(prev => [...prev, ...data]);
      setProjectText('');
      alert('Project shattered into prioritized micro-tasks!');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskStatus = async (id: string, status: 'in-progress' | 'completed') => {
    try {
      const res = await fetch(`/api/task/status/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      setProfile(data.profile);
      fetchTasks();
      fetchLeaderboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckIn = async () => {
    if (!vibeText) return;
    setLoading(true);
    try {
      const res = await fetch('/api/volunteer/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibeText })
      });
      const data = await res.json();
      setVibe(data);
      setVibeText('');
      fetchTasks(); // Re-fetch to apply burnout algorithm
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-black/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center border-2 border-ink shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Zap className="w-6 h-6 text-ink" />
          </div>
          <h1 className="text-2xl font-bold tracking-tighter">SymbioNet</h1>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setView('ngo')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${view === 'ngo' ? 'bg-ink text-white' : 'hover:bg-black/5'}`}
          >
            NGO Dashboard
          </button>
          <button 
            onClick={() => setView('volunteer')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${view === 'volunteer' ? 'bg-ink text-white' : 'hover:bg-black/5'}`}
          >
            Volunteer Feed
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {view === 'ngo' ? (
            <motion.div 
              key="ngo"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header className="space-y-2">
                <h2 className="text-4xl font-bold tracking-tight">Project Shatterer</h2>
                <p className="text-ink/60 text-lg">Upload your massive goals. Let Gemini break them into 15-minute bites.</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="brutal-card bg-white p-6 space-y-4">
                    <label className="text-sm font-bold uppercase tracking-widest text-ink/40">Project Goal / Description</label>
                    <textarea 
                      value={projectText}
                      onChange={(e) => setProjectText(e.target.value)}
                      placeholder="e.g., We need to organize a 3-day community garden festival including marketing, logistics, and volunteer coordination..."
                      className="w-full h-64 p-4 bg-bg border-2 border-ink rounded-none focus:outline-none focus:ring-2 ring-accent/50 resize-none font-mono text-sm"
                    />
                    <div className="flex items-center gap-4 p-4 bg-bg border-2 border-ink">
                      <label className="text-xs font-bold uppercase">Project Priority (1-5)</label>
                      <input 
                        type="range" min="1" max="5" 
                        value={projectPriority} 
                        onChange={(e) => setProjectPriority(parseInt(e.target.value))}
                        className="flex-1 accent-ink"
                      />
                      <span className="font-bold text-xl w-8">{projectPriority}</span>
                    </div>
                    <button 
                      onClick={handleShatter}
                      disabled={loading || !projectText}
                      className="w-full py-4 bg-accent border-2 border-ink font-bold text-lg flex items-center justify-center gap-2 hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                    >
                      {loading ? 'Shattering with Gemini...' : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Shatter into Micro-Tasks
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="brutal-card bg-white p-6">
                    <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                      <LayoutDashboard className="w-5 h-5" />
                      NGO Scheduling
                    </h3>
                    <div className="space-y-4">
                      <p className="text-xs text-ink/60">Manage your project timeline and priority distribution.</p>
                      <div className="p-3 border border-ink/10 rounded bg-bg">
                        <p className="text-xs font-bold">Next Milestone</p>
                        <p className="text-sm">Community Outreach Phase</p>
                        <p className="text-[10px] text-ink/40">Due in 4 days</p>
                      </div>
                    </div>
                  </div>
                  <div className="brutal-card bg-white p-6">
                    <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                      <LayoutDashboard className="w-5 h-5" />
                      Live Stats
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-bg border border-ink/10">
                        <span className="text-sm font-medium">Active Tasks</span>
                        <span className="font-bold text-xl">{tasks.length}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-bg border border-ink/10">
                        <span className="text-sm font-medium">Volunteers Online</span>
                        <span className="font-bold text-xl">12</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-bg border border-ink/10">
                        <span className="text-sm font-medium">Burnout Level</span>
                        <span className={`font-bold text-sm px-2 py-1 rounded border-2 border-ink ${
                          vibe.status === 'Healthy' ? 'bg-accent' : vibe.status === 'Stressed' ? 'bg-burnout-mid' : 'bg-burnout-low'
                        }`}>
                          {vibe.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="volunteer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <header className="space-y-2">
                  <h2 className="text-4xl font-bold tracking-tight">Your Micro-Feed</h2>
                  <p className="text-ink/60 text-lg">15-minute tasks matched to your vibe.</p>
                </header>

                <div className={`brutal-card p-4 flex items-center gap-4 ${
                  vibe.status === 'Healthy' ? 'bg-accent' : vibe.status === 'Stressed' ? 'bg-burnout-mid' : 'bg-burnout-low'
                }`}>
                  <div className="bg-white/50 p-2 rounded-full border border-ink/20">
                    {vibe.status === 'Healthy' ? <Sparkles className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-tighter opacity-60">Current Vibe</p>
                    <p className="font-bold">{vibe.status}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Vibe & Gamification Sidebar */}
                <div className="space-y-6">
                  <div className="brutal-card bg-white p-6 space-y-4">
                    <h3 className="font-bold text-xl flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Your Progress
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-bg border border-ink/10 text-center">
                        <p className="text-[10px] font-bold uppercase opacity-40">Points</p>
                        <p className="text-2xl font-bold">{profile.points}</p>
                      </div>
                      <div className="p-3 bg-bg border border-ink/10 text-center">
                        <p className="text-[10px] font-bold uppercase opacity-40">Tasks</p>
                        <p className="text-2xl font-bold">{profile.completedTasks}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase opacity-40">Badges</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.badges.map(badge => (
                          <span key={badge} className="px-2 py-1 bg-accent border border-ink text-[10px] font-bold">
                            {badge}
                          </span>
                        ))}
                        {profile.badges.length === 0 && <p className="text-[10px] italic opacity-40">No badges yet...</p>}
                      </div>
                    </div>
                  </div>

                  <div className="brutal-card bg-white p-6 space-y-4">
                    <h3 className="font-bold text-xl flex items-center gap-2">
                      <LayoutDashboard className="w-5 h-5" />
                      Leaderboard
                    </h3>
                    <div className="space-y-2">
                      {leaderboard.map((entry, i) => (
                        <div key={entry.name} className={`flex justify-between items-center p-2 text-sm ${entry.name === 'You' ? 'bg-accent/20 border-l-4 border-accent' : ''}`}>
                          <span className="flex items-center gap-2">
                            <span className="opacity-40 font-mono">#{i+1}</span>
                            <span className="font-bold">{entry.name}</span>
                          </span>
                          <span className="font-mono font-bold">{entry.points} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="brutal-card bg-white p-6 space-y-4">
                    <h3 className="font-bold text-xl flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Vibe Check
                    </h3>
                    <p className="text-sm text-ink/60 italic">"How are you feeling today? Be honest, Gemini is listening."</p>
                    <textarea 
                      value={vibeText}
                      onChange={(e) => setVibeText(e.target.value)}
                      placeholder="e.g., Feeling a bit overwhelmed with work, but want to do something light..."
                      className="w-full h-32 p-3 bg-bg border-2 border-ink rounded-none focus:outline-none text-sm"
                    />
                    <button 
                      onClick={handleCheckIn}
                      disabled={loading || !vibeText}
                      className="w-full py-3 bg-ink text-white font-bold flex items-center justify-center gap-2 hover:bg-ink/90 transition-all"
                    >
                      {loading ? 'Analyzing...' : 'Update Vibe'}
                    </button>
                    {vibe.message && (
                      <div className="p-3 bg-accent/10 border border-accent/30 rounded text-xs leading-relaxed">
                        <strong>Gemini says:</strong> {vibe.message}
                      </div>
                    )}
                  </div>
                </div>

                {/* Task Feed */}
                <div className="lg:col-span-3 space-y-6">
                  {tasks.length === 0 ? (
                    <div className="h-64 border-2 border-dashed border-ink/20 flex flex-col items-center justify-center text-ink/40">
                      <Clock className="w-12 h-12 mb-4 opacity-20" />
                      <p className="font-medium">No tasks available for your current vibe.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {tasks.map((task) => (
                        <motion.div 
                          key={task.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="brutal-card bg-white p-6 flex flex-col justify-between group"
                        >
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col gap-1">
                                <span className="px-2 py-1 bg-ink text-white text-[10px] font-bold uppercase tracking-widest w-fit">
                                  {task.shadowSkill}
                                </span>
                                <span className="text-[10px] font-bold text-ink/40">
                                  Match Score: {task.compatibility}
                                </span>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 border border-ink ${
                                  task.intensity === 'Low' ? 'bg-accent' : task.intensity === 'Medium' ? 'bg-burnout-mid' : 'bg-burnout-low'
                                }`}>
                                  {task.intensity} Intensity
                                </span>
                                <span className="text-[10px] font-bold opacity-40">Priority {task.priority}</span>
                              </div>
                            </div>
                            <h4 className="text-xl font-bold group-hover:text-accent transition-colors">{task.title}</h4>
                            <p className="text-sm text-ink/60 line-clamp-3">{task.description}</p>
                          </div>
                          
                          <div className="mt-6 pt-6 border-t border-ink/5 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-xs font-bold text-ink/40">
                              <Clock className="w-4 h-4" />
                              {task.estimatedTime}
                            </div>
                            {task.status === 'available' ? (
                              <button 
                                onClick={() => handleTaskStatus(task.id, 'in-progress')}
                                className="flex items-center gap-1 font-bold text-sm hover:gap-2 transition-all"
                              >
                                Claim Task <ChevronRight className="w-4 h-4" />
                              </button>
                            ) : task.status === 'in-progress' ? (
                              <button 
                                onClick={() => handleTaskStatus(task.id, 'completed')}
                                className="flex items-center gap-1 font-bold text-sm bg-accent px-3 py-1 border border-ink"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Complete
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-accent flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Done
                              </span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t-2 border-ink p-12 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4">
            <h3 className="text-3xl font-bold tracking-tighter">SymbioNet</h3>
            <p className="text-ink/60 max-w-xs">Optimizing human resources through AI-driven task shattering and emotional intelligence.</p>
          </div>
          <div className="flex gap-12">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-ink/40">Solution Challenge</p>
              <p className="font-bold">2026 Entry</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-ink/40">Built with</p>
              <p className="font-bold">Gemini 1.5 Flash</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
