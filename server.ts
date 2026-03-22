import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory store for demo purposes
let tasks: any[] = [];
let volunteerVibe: any = { status: "Healthy", score: 1.0 };
let volunteerProfile: any = {
  points: 0,
  badges: [],
  completedTasks: 0,
  skills: ["Visual Empathy", "Micro-copywriting"]
};

// Mock leaderboard
let leaderboard: any[] = [
  { name: "EcoWarrior", points: 450, badges: 5 },
  { name: "KindSoul", points: 320, badges: 3 },
  { name: "DataGardener", points: 280, badges: 2 }
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Skill Matching Logic (Node.js version of the requested Python function)
function calculateCompatibility(volunteerSkills: string[], taskRequirements: string[]): number {
  let score = 0;
  taskRequirements.forEach(req => {
    if (volunteerSkills.includes(req)) {
      score += 10; // Priority for exact matches
    } else {
      // Partial match or related skill logic could go here
      score += 2;
    }
  });
  return score;
}

// API Routes
app.post("/api/project/shatter", async (req, res) => {
  const { projectDescription, priority } = req.body;

  if (!projectDescription) {
    return res.status(400).json({ error: "Project description is required" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Shatter the following NGO project into 15-minute micro-tasks. 
      For each task, assign a "Shadow Skill" (a niche, non-professional skill like 'Visual Empathy', 'Micro-copywriting', 'Data Gardening').
      Assign a priority level (1-5) to each task based on the project priority: ${priority}.
      Project: ${projectDescription}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              shadowSkill: { type: Type.STRING },
              estimatedTime: { type: Type.STRING },
              intensity: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
              priority: { type: Type.NUMBER }
            },
            required: ["id", "title", "description", "shadowSkill", "estimatedTime", "intensity", "priority"]
          }
        }
      }
    });

    const newTasks = JSON.parse(response.text).map((t: any) => ({
      ...t,
      status: 'available',
      compatibility: calculateCompatibility(volunteerProfile.skills, [t.shadowSkill])
    }));
    
    tasks = [...tasks, ...newTasks];
    res.json(newTasks);
  } catch (error) {
    console.error("Shatter error:", error);
    res.status(500).json({ error: "Failed to shatter project" });
  }
});

app.post("/api/task/status/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'in-progress', 'completed'

  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) return res.status(404).json({ error: "Task not found" });

  tasks[taskIndex].status = status;

  if (status === 'completed') {
    volunteerProfile.points += 50;
    volunteerProfile.completedTasks += 1;
    
    // Badge logic
    if (volunteerProfile.completedTasks === 1) volunteerProfile.badges.push("First Spark");
    if (volunteerProfile.completedTasks === 5) volunteerProfile.badges.push("Steady Hand");
    if (volunteerProfile.completedTasks === 10) volunteerProfile.badges.push("Symbio-Master");
  }

  res.json({ task: tasks[taskIndex], profile: volunteerProfile });
});

app.get("/api/leaderboard", (req, res) => {
  const fullLeaderboard = [...leaderboard, { name: "You", points: volunteerProfile.points, badges: volunteerProfile.badges.length }]
    .sort((a, b) => b.points - a.points);
  res.json(fullLeaderboard);
});

app.get("/api/tasks", (req, res) => {
  // Burnout Algorithm: Filter tasks based on vibe
  let filteredTasks = tasks.filter(t => t.status !== 'completed');
  
  if (volunteerVibe.status === "At Risk") {
    filteredTasks = filteredTasks.filter(t => t.intensity === "Low");
  } else if (volunteerVibe.status === "Stressed") {
    filteredTasks = filteredTasks.filter(t => t.intensity !== "High");
  }

  // Sort by priority (desc) and compatibility (desc)
  filteredTasks.sort((a, b) => (b.priority - a.priority) || (b.compatibility - a.compatibility));
  
  res.json({ 
    tasks: filteredTasks, 
    vibe: volunteerVibe, 
    profile: volunteerProfile 
  });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SymbioNet Server running on http://localhost:${PORT}`);
  });
}

startServer();
