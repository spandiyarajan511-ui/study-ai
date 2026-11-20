---
title: StudyMate AI - Your Personal AI Study Buddy
emoji: 🎓
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# StudyMate AI – Your Personal AI Study Buddy
> **Problem Statement 10: AI Study Buddy (College Generative AI Assignment)**  
> Built with HTML5, CSS3, JavaScript, Node.js, Express.js, and Google Gemini API using the official `@google/genai` SDK.

---

## 1. Project Overview

**StudyMate AI** is a full-stack Generative AI educational platform designed to help university students study faster and more effectively. Students can paste their lecture notes, textbook passages, or upload an academic PDF document (up to 10 MB). 

Powered by **Google Gemini 3.8 Flash**, StudyMate AI automatically transforms the raw study material into:
1. **AI Summary**: 5–6 clear, beginner-friendly bullet points highlighting critical core concepts.
2. **Interactive Practice Quiz**: Exactly 5 multiple-choice questions (MCQs) with four options (A, B, C, D), automatic scoring (`SCORE: X / 5`), instant visual feedback (green/red indicators), and comprehensive answer explanations.
3. **Key Terms**: Exactly 3 foundational terms with simple definitions and real-world examples.

---

## 2. Technologies Used

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | HTML5, CSS3, Vanilla JavaScript | Responsive student-friendly dashboard, clean light-blue design, interactive quiz selection, clipboard copy. |
| **Backend Server** | Node.js & Express.js | REST API, static asset hosting, input validation, and secure handling of the Gemini API key. |
| **AI / LLM** | Google Gemini API (`@google/genai`) | High-speed, factual text generation, summarization, and question crafting with JSON mode. |
| **PDF Extraction**| `pdf-parse` & `multer` | Extracts plain text from binary PDF uploads up to 10 MB. |
| **Security** | `dotenv` | Keeps the Google Gemini API key private on the server, never exposing it to the browser. |

*Note: In accordance with assignment rules, no heavy frameworks like React or Next.js were used. Everything uses clean standard web standards.*

---

## 3. Generative AI Concepts in this Project

### A. What is Generative AI?
Unlike traditional software that only follows static rules or performs search queries, **Generative Artificial Intelligence (GenAI)** uses **Large Language Models (LLMs)** trained on vast textual datasets. In StudyMate AI, the Gemini LLM understands the semantic meaning of student notes and dynamically *generates new educational content* (summaries, quizzes, and vocabulary definitions) tailored to that exact text.

### B. What is Prompt Engineering?
**Prompt Engineering** is the practice of structuring instructions given to an LLM to achieve reliable, accurate, and predictable output.
In `server.js`, StudyMate AI uses a strict prompt template:
- **Role Assignment**: *"You are StudyMate AI, an expert educational assistant..."*
- **Constraint Enforcement**: Enforces that answers must be derived *only* from the supplied notes, strictly preventing hallucinations.
- **Structured JSON Schema**: Tells Gemini to return structured JSON with exact counts (5–6 bullets, 5 MCQs, 3 terms), which the frontend directly parses into interactive components.

---

## 4. How Generative AI Works (End-to-End Pipeline)

```
[1. Student Input]
  (Paste Notes / Upload PDF)
        │
        ▼
[2. PDF Parser] ─── (Extracts readable text from PDF)
        │
        ▼
[3. Prompt Engineering] ─── (Wraps notes in strict prompt template & JSON schema)
        │
        ▼
[4. Google Gemini LLM] ─── (Analyzes concepts & reasons over study material)
        │
        ▼
[5. Structured JSON Output] ─── (Summary, 5 MCQs, 3 Key Terms)
        │
        ▼
[6. Interactive Dashboard] ─── (Quiz scoring, explanations, copy buttons)
```

---

## 5. Project Folder Structure

```text
StudyMate-AI/
├── public/
│   ├── index.html       # Student dashboard, input tabs, quiz UI & GenAI guide
│   ├── style.css        # Modern white and light-blue student-friendly theme
│   └── script.js        # Interactive quiz engine, PDF handler, API calls
├── server.js            # Express server, PDF extraction, Gemini API routes
├── package.json         # Node.js dependencies and run scripts
├── .env                 # Secret environment variables (contains GEMINI_API_KEY)
├── .env.example         # Example configuration template for submission
├── .gitignore           # Prevents node_modules and .env from being committed
└── README.md            # Comprehensive documentation and setup guide
```

---

## 6. How to Set Up and Run the Application

### Prerequisites:
- [Node.js](https://nodejs.org/) (Version 18 or higher installed on your computer).
- A Google Gemini API Key (get one free from [Google AI Studio](https://aistudio.google.com/)).

### Step 1: Open the Project Folder
Open your terminal or command prompt and navigate to the project directory:
```bash
cd StudyMate-AI
```

### Step 2: Install Dependencies
Install all required Node.js packages:
```bash
npm install
```

### Step 3: Add Your Gemini API Key
1. Open the file named `.env` in any text editor (such as VS Code or Notepad).
2. You will see:
   ```env
   GEMINI_API_KEY=
   ```
3. Paste your Gemini API key immediately after the equal sign with no spaces:
   ```env
   GEMINI_API_KEY=AIzaSyYourActualKeyHere123456789
   ```
4. Save the file.

### Step 4: Start the Server
Run the start command:
```bash
npm start
```
You will see output in the terminal:
```
====================================================
 StudyMate AI Server running at: http://localhost:3000
 Gemini Model configured: gemini-3.8-flash
 API Key status: CONFIGURED (Ready)
====================================================
```

### Step 5: Open in Your Browser
Open your browser (Chrome, Edge, Firefox) and go to:
```
http://localhost:7860
```
*(or http://localhost:3000 if PORT is set to 3000)*

---

## 7. How to Deploy to Hugging Face Spaces (Live Link)

You can host StudyMate AI completely free on Hugging Face Spaces using the included **Dockerfile**:

### Method 1: Web Interface (Simplest – No Git Required)

1. Go to [Hugging Face Spaces](https://huggingface.co/spaces) and log in (or create a free account).
2. Click **"Create new Space"**:
   - **Space name**: `StudyMate-AI` (or any name you prefer)
   - **License**: `mit`
   - **Space SDK**: Select **Docker** -> Choose **Blank**
   - **Space hardware**: Free (CPU basic · 2 vCPU · 16 GB)
   - **Visibility**: Public (or Private)
   - Click **"Create Space"**.
3. **Add Your Gemini API Key as a Secret**:
   - In your newly created Space, go to **Settings** (top navigation tab).
   - Scroll down to **"Variables and secrets"**.
   - Click **"New secret"**:
     - **Name**: `GEMINI_API_KEY`
     - **Value**: Paste your real Gemini API key (e.g., `AQ.Ab8RN6...`)
   - Click **"Save"**.
4. **Upload Project Files**:
   - In your Space, click the **"Files"** tab $\rightarrow$ click **"Add file"** $\rightarrow$ **"Upload files"**.
   - Drag and drop the following files and folders from `StudyMate-AI`:
     - `Dockerfile`
     - `.dockerignore`
     - `server.js`
     - `package.json`
     - `package-lock.json`
     - `README.md`
     - `sample_notes.pdf`
     - The entire `public/` folder (`index.html`, `style.css`, `script.js`)
   - *(Note: Do NOT upload `.env` or `node_modules` — Hugging Face injects `GEMINI_API_KEY` automatically from Secrets!)*
   - Click **"Commit changes to main"**.
5. Hugging Face will automatically build your Docker container (takes ~1-2 minutes).
6. Click the **"App"** tab to see your live, public StudyMate AI website!

---

### Method 2: Using Git CLI

```bash
# 1. Initialize git inside StudyMate-AI (if not already initialized)
cd StudyMate-AI
git init
git add .
git commit -m "Deploy StudyMate AI to Hugging Face Spaces"

# 2. Add Hugging Face Space as git remote
git remote add space https://huggingface.co/spaces/YOUR_USERNAME/StudyMate-AI

# 3. Push to Hugging Face
git push --force space main
```

---

## 8. How to Test All Features

1. **Load Sample Notes**:
   - Click the **"Load Sample Notes"** button in the top right of the input card.
   - It will automatically fill the Subject with *"Fundamentals of Computing"* and populate the notes textarea.
2. **Generate Study Pack**:
   - Click **"Generate Study Pack"**.
   - Watch the animated loading spinner while Gemini processes your material.
   - The results dashboard will appear smoothly.
3. **Review Summary**:
   - Verify the 5–6 bullet points in Section 1.
   - Click **"Copy Summary"** to verify the clipboard function.
4. **Take the Practice Quiz**:
   - Select an answer (A, B, C, or D) for each of the 5 questions.
   - Click **"Submit Quiz"**.
   - Check your score banner (`SCORE: X / 5`).
   - Notice the green highlighting for correct answers, red for incorrect answers, and the detailed explanations.
   - Click **"Retake Quiz"** to reset your answers and try again.
5. **Regenerate Quiz**:
   - Click **"Regenerate Quiz"** to have Gemini generate 5 fresh MCQs using the same notes without changing your summary.
6. **Test PDF Upload**:
   - Click the PDF upload area or drag a `.pdf` file into Option B.
   - Notice the file name and size badge appear.
   - Click **"Generate Study Pack"** to verify PDF text extraction and AI synthesis.
7. **Copy All Results**:
   - Click **"Copy All Results"** to copy the full summary, quiz, and key terms to your clipboard.
8. **Clear All**:
   - Click **"Clear All"** to reset the entire dashboard back to its initial state.

---

## 8. Preparing Submission Deliverables

### Deliverable 1: Output Screenshot (JPEG / PNG)
1. Open the application at `http://localhost:3000`.
2. Load sample notes and click **"Generate Study Pack"**.
3. Answer all 5 quiz questions and click **"Submit Quiz"** so your score banner and explanations are visible.
4. On Windows:
   - Press `Windows Key + Shift + S` to use the Snipping Tool.
   - Capture the full browser window showing the header, input summary, score banner, and output cards.
   - Save the image as `StudyMate-AI-Screenshot.png` (or `.jpg`).

### Deliverable 2: Source Code ZIP
1. **Double check API Security**:
   - Ensure the `.env` file containing your real secret key is **NOT** included in the ZIP.
   - Check that `.env.example` has `GEMINI_API_KEY=your_api_key_here`.
2. Do **not** include the heavy `node_modules` folder in your ZIP (the evaluator will run `npm install`).
3. To create the ZIP on Windows:
   - Select the `StudyMate-AI` folder (excluding `node_modules` and `.env`).
   - Right-click $\rightarrow$ **Compress to ZIP file**.
   - Name the file `StudyMate-AI.zip` (or your roll number / team name as requested by your faculty).

---

## 9. Frequently Asked Questions (FAQ)

**Q: Why do I see "Gemini API key is not configured"?**  
A: Open `.env` in `StudyMate-AI/` and paste your key after `GEMINI_API_KEY=`, then restart the server by pressing `Ctrl + C` in the terminal and running `npm start`.

**Q: Can I use both pasted notes and an uploaded PDF together?**  
A: Yes! StudyMate AI automatically detects both, safely merges them with source tags, and feeds the combined material to Gemini.

**Q: Is the Gemini API key visible in the frontend JavaScript?**  
A: No. All AI requests go through the Node.js Express backend. The API key is stored strictly on the server and loaded using `dotenv`.
