// ==============================================================================
// StudyMate AI - Express Backend Server
// ==============================================================================
// Problem Statement 10: AI Study Buddy (College Generative AI Assignment)
// Tech Stack: Node.js, Express.js, @google/genai, dotenv, pdf-parse, multer
// ==============================================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Initialize the official Google Gen AI SDK
const { GoogleGenAI } = require('@google/genai');

const app = express();
// Port configuration: Hugging Face Spaces defaults to 7860; can be overridden via PORT
const PORT = process.env.PORT || 7860;

// Supported Flash models list with automatic fallback.
// gemini-3.5-flash is currently high-speed, reliable, and active.
// gemini-3.8-flash is also included as recommended by Google.
const FLASH_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite'
].filter(Boolean);

const GEMINI_MODEL = FLASH_MODELS[0] || 'gemini-3.5-flash';

// Configure Multer for PDF file uploads (in-memory buffer, 10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 Megabytes maximum
  },
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload a valid PDF file.'));
    }
  }
});

// Middleware for parsing JSON and form payloads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve frontend static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

/**
 * Extracts readable text from a PDF file buffer.
 * Supports both pdf-parse v1 (function) and v2+ (PDFParse class).
 */
async function extractTextFromPDF(buffer) {
  try {
    const pdfModule = require('pdf-parse');

    // Handle pdf-parse v2+ (class-based API)
    if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      const result = await parser.getText();
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
      return (result && result.text) ? result.text.trim() : '';
    }

    // Handle pdf-parse v1.x (function-based API)
    if (typeof pdfModule === 'function') {
      const data = await pdfModule(buffer);
      return (data && data.text) ? data.text.trim() : '';
    }

    // Default export fallback
    if (pdfModule.default && typeof pdfModule.default === 'function') {
      const data = await pdfModule.default(buffer);
      return (data && data.text) ? data.text.trim() : '';
    }

    throw new Error('Unrecognized pdf-parse export format.');
  } catch (error) {
    console.error('Error extracting PDF text:', error.message);
    throw new Error('Failed to extract text from the uploaded PDF: ' + error.message);
  }
}

/**
 * Validates that an API key is configured and not a placeholder.
 */
function getGeminiApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === '' || key.includes('your_api_key_here')) {
    return null;
  }
  return key.trim();
}

/**
 * Cleans and safely parses JSON returned by LLM models,
 * removing markdown code fences if present.
 */
function parseGeminiJson(rawText) {
  if (!rawText) {
    throw new Error('Gemini returned an empty response.');
  }

  let cleaned = rawText.trim();

  // Strip Markdown code fences if Gemini wrapped output in ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  // Find the outermost JSON object { ... }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Gemini response as JSON. Raw response:', rawText);
    throw new Error('Unable to parse the AI output as valid JSON. Please try again.');
  }
}

/**
 * Calls Gemini using the candidate Flash models, automatically falling back
 * if a specific model encounters temporary high demand (503) or deprecation (404).
 */
async function generateWithFallback(ai, requestParams) {
  let lastError = null;

  for (const model of FLASH_MODELS) {
    try {
      console.log(`[Gemini AI] Trying model: ${model}...`);
      const response = await ai.models.generateContent({
        ...requestParams,
        model: model
      });
      console.log(`[Gemini AI] Successfully generated content with: ${model}`);
      return { response, usedModel: model };
    } catch (err) {
      console.warn(`[Gemini AI] Model ${model} failed (${err.message || err}). Trying next model...`);
      lastError = err;
    }
  }

  throw lastError;
}

// ==============================================================================
// API ROUTES
// ==============================================================================

/**
 * Route: GET /api/status
 * Purpose: Checks server health and whether the Gemini API key is configured.
 * Does not expose the real key to the client.
 */
app.get('/api/status', (req, res) => {
  const hasKey = !!getGeminiApiKey();
  res.json({
    status: 'online',
    hasApiKey: hasKey,
    model: GEMINI_MODEL,
    message: hasKey
      ? 'Gemini API key is configured and ready.'
      : 'Gemini API key is missing. Please add your key to the .env file.'
  });
});

/**
 * Route: POST /api/study-pack
 * Purpose: Generates the complete study pack (Summary, 5 MCQs, 3 Key Terms)
 * using the official @google/genai SDK.
 */
app.post('/api/study-pack', upload.single('pdfFile'), async (req, res) => {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Gemini API key is not configured.',
        details: 'Please open the .env file in the project folder, set GEMINI_API_KEY=your_actual_key, and restart the server.'
      });
    }

    const subject = (req.body.subject || 'General Study Material').trim();
    let pastedNotes = (req.body.notes || '').trim();
    let pdfText = '';
    let uploadedFileName = '';

    // Step 1: If a PDF was uploaded, extract its text
    if (req.file) {
      uploadedFileName = req.file.originalname;
      try {
        pdfText = await extractTextFromPDF(req.file.buffer);
      } catch (pdfErr) {
        return res.status(400).json({
          success: false,
          error: 'PDF Extraction Failed',
          details: pdfErr.message
        });
      }
    }

    // Step 2: Combine the notes cleanly
    let combinedContent = '';
    if (pastedNotes && pdfText) {
      combinedContent = `--- [PASTED NOTES] ---\n${pastedNotes}\n\n--- [EXTRACTED FROM PDF: ${uploadedFileName}] ---\n${pdfText}`;
    } else if (pdfText) {
      combinedContent = pdfText;
    } else if (pastedNotes) {
      combinedContent = pastedNotes;
    }

    // Validate that some content was supplied
    if (!combinedContent || combinedContent.trim().length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient content provided.',
        details: 'Please paste notes or upload a readable text-based PDF (at least a sentence or paragraph).'
      });
    }

    // Step 3: Construct the structured Prompt Engineering template
    const systemPrompt = `You are StudyMate AI, an expert educational assistant designed for university students.
Your task is to analyze the student's study material and generate high-quality learning resources.

SUBJECT: ${subject}

STUDY MATERIAL:
\"\"\"
${combinedContent}
\"\"\"

STRICT RULES:
1. Base all generated content STRICTLY on the provided study material. Do not hallucinate or invent outside facts.
2. If certain facts are not present in the notes, do not assume them.
3. Use clear, simple, beginner-friendly English.
4. Output MUST be valid JSON adhering exactly to the schema described below. Do not include markdown commentary outside the JSON.

REQUIRED JSON FORMAT:
{
  "summary": [
    "Clear bullet point 1 explaining a core concept in simple terms.",
    "Clear bullet point 2 highlighting an important detail.",
    "Clear bullet point 3 summarizing key mechanisms or ideas.",
    "Clear bullet point 4 explaining another critical topic.",
    "Clear bullet point 5 reinforcing practical takeaways.",
    "Clear bullet point 6 (optional 6th bullet point summarizing the chapter)."
  ],
  "quiz": [
    {
      "id": 1,
      "question": "Clear question text?",
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      "correctAnswer": "A",
      "explanation": "Short, clear explanation of why this option is correct based on the notes."
    },
    {
      "id": 2,
      "question": "Question 2?",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correctAnswer": "B",
      "explanation": "Explanation..."
    },
    {
      "id": 3,
      "question": "Question 3?",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correctAnswer": "C",
      "explanation": "Explanation..."
    },
    {
      "id": 4,
      "question": "Question 4?",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correctAnswer": "D",
      "explanation": "Explanation..."
    },
    {
      "id": 5,
      "question": "Question 5?",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correctAnswer": "A",
      "explanation": "Explanation..."
    }
  ],
  "keyTerms": [
    {
      "term": "Term 1 Name",
      "meaning": "Simple meaning in easy English.",
      "example": "One practical, easy-to-understand real-world example."
    },
    {
      "term": "Term 2 Name",
      "meaning": "Simple meaning in easy English.",
      "example": "One practical, easy-to-understand real-world example."
    },
    {
      "term": "Term 3 Name",
      "meaning": "Simple meaning in easy English.",
      "example": "One practical, easy-to-understand real-world example."
    }
  ]
}

Ensure EXACTLY:
- 5 to 6 summary bullet points.
- EXACTLY 5 multiple-choice questions, each with options A, B, C, D and one correct answer.
- EXACTLY 3 key terms, each with a term, meaning, and example.`;

    // Step 4: Call Gemini using the official @google/genai SDK with automatic Flash model fallback
    const ai = new GoogleGenAI({ apiKey });

    const { response, usedModel } = await generateWithFallback(ai, {
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2 // Low temperature for high factual accuracy
      }
    });

    const rawResponseText = response.text;
    const parsedData = parseGeminiJson(rawResponseText);

    // Step 5: Validate the structured data returned by Gemini
    if (!Array.isArray(parsedData.summary) || parsedData.summary.length < 4) {
      throw new Error('Gemini did not return the expected 5-6 summary points.');
    }
    if (!Array.isArray(parsedData.quiz) || parsedData.quiz.length !== 5) {
      throw new Error('Gemini did not return exactly 5 multiple choice questions.');
    }
    if (!Array.isArray(parsedData.keyTerms) || parsedData.keyTerms.length !== 3) {
      throw new Error('Gemini did not return exactly 3 key terms.');
    }

    // Calculate metadata
    const wordCount = combinedContent.split(/\s+/).filter(Boolean).length;

    // Send successful response to client
    return res.json({
      success: true,
      subject: subject,
      source: {
        hasPastedNotes: !!pastedNotes,
        hasUploadedPdf: !!pdfText,
        pdfFileName: uploadedFileName || null,
        wordCount: wordCount
      },
      summary: parsedData.summary,
      quiz: parsedData.quiz,
      keyTerms: parsedData.keyTerms
    });

  } catch (error) {
    console.error('Error generating study pack:', error);

    let cleanDetails = error.message || 'An unexpected error occurred during AI processing.';
    try {
      if (typeof cleanDetails === 'string' && cleanDetails.includes('{')) {
        const jsonMatch = cleanDetails.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.error && parsed.error.message) {
            cleanDetails = parsed.error.message;
          }
        }
      }
    } catch (e) {}

    return res.status(500).json({
      success: false,
      error: 'Failed to generate study pack',
      details: cleanDetails
    });
  }
});

/**
 * Route: POST /api/regenerate-quiz
 * Purpose: Generates 5 NEW multiple choice questions from existing material
 * without touching the summary or key terms.
 */
app.post('/api/regenerate-quiz', async (req, res) => {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Gemini API key is not configured.'
      });
    }

    const { subject, content, previousQuestions } = req.body;

    if (!content || content.trim().length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Study material is required to generate quiz questions.'
      });
    }

    const prevList = Array.isArray(previousQuestions) && previousQuestions.length > 0
      ? `Avoid repeating these previous questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

    const prompt = `You are StudyMate AI. Generate a FRESH set of 5 multiple-choice questions for university students.

SUBJECT: ${subject || 'General Study Material'}

STUDY MATERIAL:
\"\"\"
${content}
\"\"\"

${prevList}

STRICT REQUIREMENTS:
1. Generate EXACTLY 5 new multiple-choice questions.
2. Base questions ONLY on the provided material.
3. Each question must have four options labeled "A", "B", "C", and "D".
4. Each question must specify the single correct answer ("A", "B", "C", or "D") and a short explanation.
5. Return JSON ONLY matching this format:

{
  "quiz": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      "correctAnswer": "A",
      "explanation": "Short explanation of correct answer."
    },
    ... (exactly 5 items total)
  ]
}`;

    const ai = new GoogleGenAI({ apiKey });
    const { response, usedModel } = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    });

    const parsedData = parseGeminiJson(response.text);

    if (!Array.isArray(parsedData.quiz) || parsedData.quiz.length !== 5) {
      throw new Error('Gemini did not return exactly 5 quiz questions.');
    }

    return res.json({
      success: true,
      quiz: parsedData.quiz
    });

  } catch (error) {
    console.error('Error regenerating quiz:', error);

    let cleanDetails = error.message || 'An unexpected error occurred during quiz regeneration.';
    try {
      if (typeof cleanDetails === 'string' && cleanDetails.includes('{')) {
        const jsonMatch = cleanDetails.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.error && parsed.error.message) {
            cleanDetails = parsed.error.message;
          }
        }
      }
    } catch (e) {}

    return res.status(500).json({
      success: false,
      error: 'Failed to regenerate quiz questions',
      details: cleanDetails
    });
  }
});

// Multer error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large',
        details: 'The uploaded PDF exceeds the 10 MB limit. Please upload a smaller file.'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'File upload error',
      details: err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      error: 'Upload rejected',
      details: err.message
    });
  }
  next();
});

// Fallback middleware to serve index.html for any unhandled routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` StudyMate AI Server running at: http://localhost:${PORT}`);
  console.log(` Gemini Model configured: ${GEMINI_MODEL}`);
  console.log(` API Key status: ${getGeminiApiKey() ? 'CONFIGURED (Ready)' : 'NOT CONFIGURED (Add to .env)'}`);
  console.log(`====================================================`);
});
