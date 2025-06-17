# fastboard

A robust AI-powered dashboard generator that transforms natural language prompts into interactive data visualizations.

🔗 **Live Demo**: [https://fastboard-frontend.onrender.com/](https://fastboard-frontend.onrender.com/)

## Quick Installation

### Prerequisites

- Node.js 18+, Python 3.8+, Perplexity AI API key

### Setup

```bash
# Backend (terminal 1)
cd backend
pip install -r requirements.txt
echo "PERPLEXITY_API_KEY=your_key" > .env
python app.py

# Frontend (new, terminal 2)
cd frontend
npm install
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000" > .env.local
npm run dev

# then open http://localhost:3000
```

## Usage

1. **Text Prompts**: Enter any topic (e.g., "Tesla stock performance")
2. **File Upload**: Upload CSV files (work best) for data analysis
3. **Widget Interaction**: Click any widget to replace it with a new prompt

## Deployment

**Render.com (Recommended):**

- Backend: Root directory `backend`, start with `python app.py`
- Frontend: Root directory `frontend`, start with `npm start`
- Set environment variables: `PERPLEXITY_API_KEY`, `NEXT_PUBLIC_API_BASE_URL`

## Authors

- **Nathan Liu** - Full-stack development and UI/UX design
- **Samih Qureshi** - Full-stack development and AI integration

_Created at Corgi Hacks with ❤️_

## Tech Stack

**Frontend:** Next.js, React, Tailwind CSS, Recharts
**Backend:** Flask, Flask-CORS, Requests
**AI:** Perplexity Sonar Pro
**Hosting:** Render.com
