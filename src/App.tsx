import React, { useState, useEffect, useMemo, Component } from 'react';
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
  CheckCircle2,
  LogOut,
  LogIn,
  Trophy,
  Award,
  TrendingUp
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  getDoc,
  limit
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth, signIn, logOut } from "./firebase";

// --- Types ---
interface Task {
  id: string;
  title: string;
  description: string;
  shadowSkill: string;
  estimatedTime: string;
  intensity: 'Low' | 'Medium' | 'High';
  priority: number;
  status: 'available' | 'in-progress' | 'completed';
  authorUid: string;
  createdAt: any;
  compatibility?: number;
}

interface Vibe {
  status: 'Healthy' | 'Stressed' | 'At Risk';
  score: number;
  message: string;
}

interface VolunteerProfile {
  uid: string;
  points: number;
  badges: string[];
  completedTasks: number;
  skills: string[];
  displayName: string;
  vibeStatus?: 'Healthy' | 'Stressed' | 'At Risk';
  vibeMessage?: string;
}

interface LeaderboardEntry {
  name: string;
  points: number;
  badges: number;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

// --- Error Handling ---
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // In a real app, we might show a toast here
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if ((this as any).state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-6">
          <div className="brutal-card bg-white p-8 max-w-md w-full text-center">
            <ShieldAlert className="w-16 h-16 text-burnout-low mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-ink/60 mb-6">{(this as any).state.error?.message || "An unexpected error occurred."}</p>
            <button 
              onClick={() => window.location.reload()}
              className="brutal-btn bg-accent w-full py-3 font-bold"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

// --- Logic ---
function calculateCompatibility(volunteerSkills: string[], taskRequirement: string): number {
  if (volunteerSkills.includes(taskRequirement)) return 10;
  return 2;
}

// --- Main App ---
export default function App() {
  return (
    <ErrorBoundary>
      <SymbioNet />
    </ErrorBoundary>
  );
}

function SymbioNet() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [view, setView] = useState<'ngo' | 'volunteer'>('ngo');
  const [projectText, setProjectText] = useState('');
  const [projectPriority, setProjectPriority] = useState(3);
  const [vibeText, setVibeText] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Gemini Initialization
  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }), []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Ensure profile exists
        const userRef = doc(db, "users", u.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const newProfile: VolunteerProfile = {
              uid: u.uid,
              points: 0,
              badges: [],
              completedTasks: 0,
              skills: ["Visual Empathy", "Micro-copywriting"],
              displayName: u.displayName || "Volunteer",
              vibeStatus: 'Healthy',
              vibeMessage: 'Ready to help!'
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          } else {
            setProfile(snap.data() as VolunteerProfile);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
        }
      } else {
        setProfile(null);
      }
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  // Real-time Listeners
  useEffect(() => {
    if (!isAuthReady || !user) return;

    // Tasks Listener
    const tasksQuery = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snap) => {
      const taskList = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
      setTasks(taskList);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "tasks"));

    // Profile Listener
    const unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as VolunteerProfile);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));

    // Leaderboard (Mocked for now, but could be a query)
    setLeaderboard([
      { name: "EcoWarrior", points: 450, badges: 5 },
      { name: "KindSoul", points: 320, badges: 3 },
      { name: "DataGardener", points: 280, badges: 2 }
    ]);

    return () => {
      unsubscribeTasks();
      unsubscribeProfile();
    };
  }, [isAuthReady, user]);

  const handleShatter = async () => {
    if (!projectText || !user) return;
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Shatter the following NGO project into 15-minute micro-tasks. 
        For each task, assign a "Shadow Skill" (a niche, non-professional skill like 'Visual Empathy', 'Micro-copywriting', 'Data Gardening').
        Assign a priority level (1-5) to each task based on the project priority: ${projectPriority}.
        Project: ${projectText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                shadowSkill: { type: Type.STRING },
                estimatedTime: { type: Type.STRING },
                intensity: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                priority: { type: Type.NUMBER }
              },
              required: ["title", "description", "shadowSkill", "estimatedTime", "intensity", "priority"]
            }
          }
        }
      });

      const shatteredTasks = JSON.parse(response.text);
      for (const t of shatteredTasks) {
        const taskId = Math.random().toString(36).substring(7);
        await setDoc(doc(db, "tasks", taskId), {
          ...t,
          id: taskId,
          status: 'available',
          authorUid: user.uid,
          createdAt: serverTimestamp()
        });
      }
      
      setProjectText('');
      alert('Project shattered into prioritized micro-tasks!');
    } catch (err) {
      console.error("Shatter error:", err);
      handleFirestoreError(err, OperationType.WRITE, "tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskStatus = async (id: string, status: 'in-progress' | 'completed') => {
    if (!user || !profile) return;
    try {
      const taskRef = doc(db, "tasks", id);
      await updateDoc(taskRef, { status });

      if (status === 'completed') {
        const userRef = doc(db, "users", user.uid);
        const newPoints = profile.points + 50;
        const newCompleted = profile.completedTasks + 1;
        const newBadges = [...profile.badges];
        
        if (newCompleted === 1 && !newBadges.includes("First Spark")) newBadges.push("First Spark");
        if (newCompleted === 5 && !newBadges.includes("Steady Hand")) newBadges.push("Steady Hand");
        if (newCompleted === 10 && !newBadges.includes("Symbio-Master")) newBadges.push("Symbio-Master");

        await updateDoc(userRef, {
          points: newPoints,
          completedTasks: newCompleted,
          badges: newBadges
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const handleCheckIn = async () => {
    if (!vibeText || !user) return;
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this volunteer's check-in text and return a "vibe" status.
        Text: "${vibeText}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING, enum: ["Healthy", "Stressed", "At Risk"] },
              score: { type: Type.NUMBER },
              message: { type: Type.STRING }
            },
            required: ["status", "score", "message"]
          }
        }
      });

      const vibeData = JSON.parse(response.text);
      await updateDoc(doc(db, "users", user.uid), {
        vibeStatus: vibeData.status,
        vibeMessage: vibeData.message
      });
      setVibeText('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered & Sorted Tasks
  const processedTasks = useMemo(() => {
    if (!profile) return [];
    let filtered = tasks.filter(t => t.status !== 'completed');
    
    if (profile.vibeStatus === "At Risk") {
      filtered = filtered.filter(t => t.intensity === "Low");
    } else if (profile.vibeStatus === "Stressed") {
      filtered = filtered.filter(t => t.intensity !== "High");
    }

    return filtered.map(t => ({
      ...t,
      compatibility: calculateCompatibility(profile.skills, t.shadowSkill)
    })).sort((a, b) => (b.priority - a.priority) || ((b.compatibility || 0) - (a.compatibility || 0)));
  }, [tasks, profile]);

  if (!isAuthReady) return <div className="min-h-screen bg-bg flex items-center justify-center font-bold">Initializing SymbioNet...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="brutal-card bg-white p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-ink">
            <Sparkles className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black mb-4 tracking-tighter">SymbioNet</h1>
          <p className="text-ink/60 mb-8">Resource optimization for the 2026 Solution Challenge. Connect your skills to real impact.</p>
          <button 
            onClick={signIn}
            className="brutal-btn bg-accent w-full py-4 font-bold flex items-center justify-center gap-2 text-lg"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-black/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-accent border-2 border-ink flex items-center justify-center font-black text-xl">S</div>
          <span className="font-black text-2xl tracking-tighter">SymbioNet</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex bg-white border-2 border-ink p-1">
            <button 
              onClick={() => setView('ngo')}
              className={`px-4 py-2 font-bold transition-colors ${view === 'ngo' ? 'bg-ink text-white' : 'hover:bg-accent'}`}
            >
              NGO Dashboard
            </button>
            <button 
              onClick={() => setView('volunteer')}
              className={`px-4 py-2 font-bold transition-colors ${view === 'volunteer' ? 'bg-ink text-white' : 'hover:bg-accent'}`}
            >
              Volunteer Feed
            </button>
          </div>
          <button onClick={logOut} className="p-2 hover:bg-burnout-low border-2 border-transparent hover:border-ink transition-all">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {view === 'ngo' ? (
            <motion.div
              key="ngo"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* NGO Dashboard Content */}
              <div className="lg:col-span-2 space-y-8">
                <div className="brutal-card bg-white p-8">
                  <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                    <Brain className="w-8 h-8 text-accent" />
                    Project Shatterer
                  </h2>
                  <p className="text-ink/60 mb-6">Paste your project goals below. Gemini will shatter them into 15-minute micro-tasks.</p>
                  
                  <div className="space-y-4">
                    <textarea 
                      value={projectText}
                      onChange={(e) => setProjectText(e.target.value)}
                      placeholder="e.g., We need to organize a community garden event including social media outreach, seed sorting, and volunteer coordination..."
                      className="w-full h-48 p-4 border-4 border-ink focus:ring-0 focus:border-accent resize-none font-medium"
                    />
                    
                    <div className="p-4 bg-bg border-2 border-ink">
                      <label className="block font-bold mb-2 flex justify-between">
                        Project Priority
                        <span className="text-accent">{projectPriority}</span>
                      </label>
                      <input 
                        type="range" 
                        min="1" 
                        max="5" 
                        value={projectPriority}
                        onChange={(e) => setProjectPriority(parseInt(e.target.value))}
                        className="w-full accent-ink"
                      />
                    </div>

                    <button 
                      onClick={handleShatter}
                      disabled={loading || !projectText}
                      className="brutal-btn bg-accent w-full py-4 font-black text-xl flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {loading ? "Shattering..." : (
                        <>
                          <Zap className="w-6 h-6" />
                          SHATTER WITH AI
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="brutal-card bg-white p-8">
                  <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    NGO Scheduling
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border-2 border-ink bg-bg">
                      <span className="block text-xs font-bold uppercase opacity-50">Current Timeline</span>
                      <span className="font-bold">March 2026 - Sprint 1</span>
                    </div>
                    <div className="p-4 border-2 border-ink bg-bg">
                      <span className="block text-xs font-bold uppercase opacity-50">Resource Load</span>
                      <span className="font-bold">85% Optimized</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
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
                        profile?.vibeStatus === 'Healthy' ? 'bg-accent' : profile?.vibeStatus === 'Stressed' ? 'bg-burnout-mid' : 'bg-burnout-low'
                      }`}>
                        {profile?.vibeStatus || 'Healthy'}
                      </span>
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
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Volunteer Feed Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Vibe Check Section */}
                <div className="brutal-card bg-white p-8">
                  <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                    <Heart className="w-8 h-8 text-burnout-low" />
                    Vibe Check
                  </h2>
                  <div className="flex gap-4">
                    <input 
                      type="text"
                      value={vibeText}
                      onChange={(e) => setVibeText(e.target.value)}
                      placeholder="How are you feeling today? (e.g., 'Feeling great and ready to work!')"
                      className="flex-1 p-4 border-4 border-ink focus:ring-0 focus:border-accent font-medium"
                    />
                    <button 
                      onClick={handleCheckIn}
                      disabled={loading || !vibeText}
                      className="brutal-btn bg-ink text-white px-8 font-bold disabled:opacity-50"
                    >
                      <Send className="w-6 h-6" />
                    </button>
                  </div>
                  {profile?.vibeMessage && (
                    <div className="mt-4 p-4 bg-bg border-l-8 border-ink italic">
                      "{profile.vibeMessage}"
                    </div>
                  )}
                </div>

                {/* Task Feed */}
                <div className="space-y-6">
                  <h3 className="text-2xl font-black flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-accent" />
                    Your Micro-Tasks
                  </h3>
                  {processedTasks.length === 0 ? (
                    <div className="brutal-card bg-white p-12 text-center">
                      <p className="text-ink/40 font-bold">No tasks available for your current vibe. Take a break!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {processedTasks.map(task => (
                        <motion.div 
                          layout
                          key={task.id} 
                          className="brutal-card bg-white p-6 border-4 border-ink hover:-translate-y-1 hover:translate-x-1 transition-transform"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className={`text-xs font-black px-2 py-1 border-2 border-ink ${
                              task.intensity === 'Low' ? 'bg-accent' : task.intensity === 'Medium' ? 'bg-burnout-mid' : 'bg-burnout-low'
                            }`}>
                              {task.intensity} Intensity
                            </span>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs font-bold bg-ink text-white px-2 py-0.5">Priority {task.priority}</span>
                              <span className="text-[10px] font-black uppercase text-accent">Match: {task.compatibility}%</span>
                            </div>
                          </div>
                          <h4 className="font-black text-xl mb-2">{task.title}</h4>
                          <p className="text-sm text-ink/70 mb-4 line-clamp-2">{task.description}</p>
                          <div className="flex items-center gap-4 mb-6">
                            <div className="flex items-center gap-1 text-xs font-bold">
                              <Clock className="w-4 h-4" />
                              {task.estimatedTime}
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold">
                              <Brain className="w-4 h-4" />
                              {task.shadowSkill}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            {task.status === 'available' ? (
                              <button 
                                onClick={() => handleTaskStatus(task.id, 'in-progress')}
                                className="brutal-btn bg-accent flex-1 py-2 font-bold text-sm"
                              >
                                Claim Task
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleTaskStatus(task.id, 'completed')}
                                className="brutal-btn bg-ink text-white flex-1 py-2 font-bold text-sm flex items-center justify-center gap-2"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Complete
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                {/* Gamification Sidebar */}
                <div className="brutal-card bg-white p-6">
                  <h3 className="font-black text-2xl mb-6 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-accent" />
                    Your Progress
                  </h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-bg border-2 border-ink text-center">
                        <span className="block text-3xl font-black">{profile?.points || 0}</span>
                        <span className="text-[10px] font-bold uppercase opacity-50">Points</span>
                      </div>
                      <div className="p-4 bg-bg border-2 border-ink text-center">
                        <span className="block text-3xl font-black">{profile?.completedTasks || 0}</span>
                        <span className="text-[10px] font-bold uppercase opacity-50">Tasks</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm mb-3 uppercase tracking-wider opacity-50">Badges Earned</h4>
                      <div className="flex flex-wrap gap-2">
                        {profile?.badges.length === 0 ? (
                          <span className="text-xs italic opacity-40">Complete tasks to earn badges!</span>
                        ) : profile?.badges.map(badge => (
                          <span key={badge} className="bg-accent border-2 border-ink px-3 py-1 text-xs font-black flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Leaderboard */}
                <div className="brutal-card bg-white p-6">
                  <h3 className="font-black text-xl mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Leaderboard
                  </h3>
                  <div className="space-y-3">
                    {leaderboard.map((entry, i) => (
                      <div key={entry.name} className={`flex items-center justify-between p-3 border-2 border-ink ${i === 0 ? 'bg-accent/20' : 'bg-bg'}`}>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-lg w-4">{i + 1}</span>
                          <span className="font-bold">{entry.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="block font-black text-sm">{entry.points} pts</span>
                          <span className="text-[10px] font-bold opacity-50">{entry.badges} badges</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
