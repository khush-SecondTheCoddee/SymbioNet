# SymbioNet Python Backend Reference
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

# Data Structures
class Task(BaseModel):
    id: str
    title: str
    description: str
    shadow_skill: str
    intensity: str
    priority: int
    status: str = "available"
    compatibility: float = 0.0

class VolunteerProfile(BaseModel):
    id: str
    skills: List[str]
    points: int = 0
    badges: List[str] = []
    completed_tasks: int = 0

# In-memory store
tasks_db: List[Task] = []
volunteers_db = {
    "v1": VolunteerProfile(id="v1", skills=["Visual Empathy", "Micro-copywriting"])
}

def calculate_compatibility(volunteer_skills: List[str], task_requirements: List[str]) -> float:
    """
    Calculates compatibility score. Prioritizes exact matches.
    """
    score = 0.0
    for req in task_requirements:
        if req in volunteer_skills:
            score += 10.0  # Exact match bonus
        else:
            score += 1.0   # Base score for participation
    return score

@app.post("/project/shatter")
async def shatter_project(description: str, priority: int):
    model = genai.GenerativeModel('gemini-1.5-flash')
    prompt = f"Shatter this project (priority {priority}) into 15-min tasks: {description}"
    # Logic to parse Gemini JSON and populate tasks_db...
    return {"status": "success", "tasks": tasks_db}

@app.post("/task/schedule/{task_id}")
async def update_task_status(task_id: str, status: str, volunteer_id: str = "v1"):
    task = next((t for t in tasks_db if t.id == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.status = status
    if status == "completed":
        vol = volunteers_db[volunteer_id]
        vol.points += 50
        vol.completed_tasks += 1
        # Badge logic...
        if vol.completed_tasks >= 5: vol.badges.append("Steady Hand")
    
    return {"status": "updated", "profile": volunteers_db[volunteer_id]}

@app.get("/tasks/{volunteer_id}")
async def get_tasks(volunteer_id: str):
    vol = volunteers_db.get(volunteer_id)
    if not vol: raise HTTPException(status_code=404, detail="Volunteer not found")
    
    # Calculate compatibility for all tasks
    for t in tasks_db:
        t.compatibility = calculate_compatibility(vol.skills, [t.shadow_skill])
    
    # Sort by priority and compatibility
    sorted_tasks = sorted(tasks_db, key=lambda x: (x.priority, x.compatibility), reverse=True)
    return {"tasks": sorted_tasks, "profile": vol}

@app.get("/leaderboard")
async def get_leaderboard():
    # Return top volunteers sorted by points
    return [{"name": "EcoWarrior", "points": 450}, {"name": "You", "points": volunteers_db["v1"].points}]
