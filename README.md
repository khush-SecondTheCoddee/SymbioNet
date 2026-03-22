# SymbioNet: Solution Challenge 2026

SymbioNet is a resource-optimization platform that bridges the gap between massive NGO projects and the limited time/energy of volunteers. It uses Gemini 1.5 Flash to "shatter" complex projects into 15-minute micro-tasks assigned based on "Shadow Skills" and real-time "Vibe Checks".

## Key Features
- **Project Shattering**: Gemini breaks down large goals into atomic, actionable tasks.
- **Shadow Skill Matching**: Tasks are tagged with niche skills (e.g., "Visual Empathy", "Micro-copywriting").
- **Burnout Algorithm**: Sentiment analysis of volunteer check-ins dynamically filters task visibility to prevent stress.
- **GEAR Optimized**: Designed for high efficiency and low latency on Google Cloud Run.

## Tech Stack
- **Frontend**: React + Tailwind CSS + Framer Motion
- **Backend**: Node.js + Express + Google Generative AI SDK
- **AI**: Gemini 3 Flash (optimized for speed and reasoning)

## Setup Instructions

1. **Environment Variables**:
   Create a `.env` file with:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Build for Production**:
   ```bash
   npm run build
   ```

## Deployment (Google Cloud Run)
Build the Docker image and deploy:
```bash
gcloud builds submit --tag gcr.io/your-project/symbionet
gcloud run deploy symbionet --image gcr.io/your-project/symbionet --platform managed
```

---

### Python/FastAPI Reference (for Backend)
If you prefer a Python backend, use the provided `symbionet_python_backend.py` as a template.

### Flutter Reference (for Mobile)
If you prefer a Flutter frontend, use the provided `symbionet_flutter_frontend.dart` as a template.
