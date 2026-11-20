// ==============================================================================
// StudyMate AI – Frontend JavaScript Logic
// ==============================================================================
// Problem Statement 10: AI Study Buddy (College Generative AI Assignment)
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // ----------------------------------------------------------------------------
  // APPLICATION STATE
  // ----------------------------------------------------------------------------
  let state = {
    selectedFile: null,
    currentStudyPack: null,
    userAnswers: {},         // questionId -> 'A' | 'B' | 'C' | 'D'
    isQuizSubmitted: false,
    activeContentText: ''    // Cache of notes / text used for quiz regeneration
  };

  // Sample notes for 1-click college assignment demonstration
  const SAMPLE_NOTES = `Subject: Fundamentals of Computing
Chapter: Computer System Architecture and Operation

A computer system is an integrated set of hardware and software components designed to process raw data into meaningful information. The central hardware architecture revolves around the Von Neumann model, which consists of the Central Processing Unit (CPU), Primary Memory, and Input/Output (I/O) interfaces connected via system buses.

The CPU acts as the brain of the computer and contains three vital sub-units:
1. Arithmetic Logic Unit (ALU): Performs all arithmetic computations (addition, subtraction) and logical decisions (AND, OR, NOT, comparisons).
2. Control Unit (CU): Decodes instructions fetched from memory and coordinates the flow of signals between the ALU, registers, and other system peripherals.
3. Registers: High-speed, small-capacity temporary storage locations directly inside the processor used to hold active instructions and operands.

Memory hierarchy is critical to modern computer speed. Primary memory includes:
- RAM (Random Access Memory): Volatile storage used to hold currently running programs and data. Its contents are lost when power is turned off.
- ROM (Read-Only Memory): Non-volatile storage containing permanent firmware (such as BIOS / UEFI boot instructions).
- Cache Memory: Extremely high-speed static RAM positioned between the CPU and main RAM to reduce average memory access latency.

System software, primarily the Operating System (OS), bridges the hardware layer and application software. The OS manages processor scheduling, virtual memory allocation, secondary storage file systems, and hardware device drivers. Everything inside the digital processor operates using the binary number system (0s and 1s), representing electrical voltage states.`;

  // ----------------------------------------------------------------------------
  // DOM ELEMENT REFERENCES
  // ----------------------------------------------------------------------------
  const apiStatusBadge = document.getElementById('api-status-badge');
  const apiStatusText = document.getElementById('api-status-text');

  // Educational Section
  const toggleGenaiBtn = document.getElementById('toggle-genai-info');
  const genaiStepsContainer = document.getElementById('genai-steps-container');

  // Input Elements
  const subjectInput = document.getElementById('subject-input');
  const notesTextarea = document.getElementById('notes-textarea');
  const charCountEl = document.getElementById('char-count');
  const wordCountEl = document.getElementById('word-count');
  const btnSampleNotes = document.getElementById('btn-sample-notes');

  // File Upload Elements
  const dropZone = document.getElementById('drop-zone');
  const pdfFileInput = document.getElementById('pdf-file-input');
  const dropZoneIdle = document.getElementById('drop-zone-idle');
  const uploadedFileCard = document.getElementById('uploaded-file-card');
  const fileNameText = document.getElementById('file-name-text');
  const fileSizeText = document.getElementById('file-size-text');
  const btnRemoveFile = document.getElementById('btn-remove-file');

  // Main Action Buttons
  const btnGenerate = document.getElementById('btn-generate');
  const btnClearAll = document.getElementById('btn-clear-all');

  // Feedback & Loading Cards
  const loadingCard = document.getElementById('loading-card');
  const loadingTitle = document.getElementById('loading-title');
  const loadingSubtitle = document.getElementById('loading-status-text');
  const errorCard = document.getElementById('error-card');
  const errorTitle = document.getElementById('error-title');
  const errorMessage = document.getElementById('error-message');
  const btnDismissError = document.getElementById('btn-dismiss-error');

  // Results Dashboard Elements
  const resultsDashboard = document.getElementById('results-dashboard');
  const resultSubjectBadge = document.getElementById('result-subject-badge');
  const resultWordCount = document.getElementById('result-word-count');
  const resultSourceTag = document.getElementById('result-source-tag');
  const summaryList = document.getElementById('summary-list');
  const quizContainer = document.getElementById('quiz-container');
  const quizScoreBanner = document.getElementById('quiz-score-banner');
  const scoreDisplayText = document.getElementById('score-display-text');
  const scoreMessageText = document.getElementById('score-message-text');
  const keyTermsContainer = document.getElementById('key-terms-container');

  // Output Action Buttons
  const btnCopySummary = document.getElementById('btn-copy-summary');
  const btnCopyAll = document.getElementById('btn-copy-all');
  const btnRegenerateQuiz = document.getElementById('btn-regenerate-quiz');
  const btnSubmitQuiz = document.getElementById('btn-submit-quiz');
  const btnRetakeQuiz = document.getElementById('btn-retake-quiz');
  const btnRetakeQuizTop = document.getElementById('btn-retake-quiz-top');

  const toastContainer = document.getElementById('toast-container');

  // ----------------------------------------------------------------------------
  // INITIALIZATION: CHECK API STATUS
  // ----------------------------------------------------------------------------
  async function checkServerStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();

      apiStatusBadge.className = 'status-badge';
      if (data.hasApiKey) {
        apiStatusBadge.classList.add('ready');
        apiStatusText.textContent = `Gemini API Ready (${data.model})`;
      } else {
        apiStatusBadge.classList.add('missing');
        apiStatusText.textContent = 'API Key Required (.env)';
      }
    } catch (err) {
      apiStatusBadge.className = 'status-badge missing';
      apiStatusText.textContent = 'Server Offline';
    }
  }

  checkServerStatus();

  // ----------------------------------------------------------------------------
  // TOAST NOTIFICATION HELPER
  // ----------------------------------------------------------------------------
  function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(30px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ----------------------------------------------------------------------------
  // TEXTAREA COUNTER
  // ----------------------------------------------------------------------------
  function updateTextareaStats() {
    const text = notesTextarea.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    charCountEl.textContent = `${chars.toLocaleString()} characters`;
    wordCountEl.textContent = `${words.toLocaleString()} words`;
  }

  notesTextarea.addEventListener('input', updateTextareaStats);

  // ----------------------------------------------------------------------------
  // SAMPLE NOTES INSERTER
  // ----------------------------------------------------------------------------
  btnSampleNotes.addEventListener('click', () => {
    subjectInput.value = 'Fundamentals of Computing';
    notesTextarea.value = SAMPLE_NOTES;
    updateTextareaStats();
    showToast('Loaded sample notes on Fundamentals of Computing!', 'success');
  });

  // ----------------------------------------------------------------------------
  // EDUCATIONAL SECTION TOGGLE
  // ----------------------------------------------------------------------------
  toggleGenaiBtn.addEventListener('click', () => {
    if (genaiStepsContainer.classList.contains('hidden')) {
      genaiStepsContainer.classList.remove('hidden');
      toggleGenaiBtn.textContent = 'Hide Guide';
    } else {
      genaiStepsContainer.classList.add('hidden');
      toggleGenaiBtn.textContent = 'Show Guide';
    }
  });

  // ----------------------------------------------------------------------------
  // PDF UPLOAD & DRAG-AND-DROP
  // ----------------------------------------------------------------------------
  function handleFileSelection(file) {
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showError('Invalid File Type', 'Please upload a PDF document (.pdf).');
      return;
    }

    // 10 MB limit check
    if (file.size > 10 * 1024 * 1024) {
      showError('File Too Large', 'The uploaded PDF exceeds 10 MB. Please upload a smaller file.');
      return;
    }

    state.selectedFile = file;
    fileNameText.textContent = file.name;
    fileSizeText.textContent = formatBytes(file.size);

    dropZoneIdle.classList.add('hidden');
    uploadedFileCard.classList.remove('hidden');
    hideError();
    showToast(`PDF selected: ${file.name}`, 'info');
  }

  function clearSelectedFile() {
    state.selectedFile = null;
    pdfFileInput.value = '';
    dropZoneIdle.classList.remove('hidden');
    uploadedFileCard.classList.add('hidden');
  }

  btnRemoveFile.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSelectedFile();
    showToast('Uploaded PDF removed.', 'info');
  });

  pdfFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  });

  function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  // ----------------------------------------------------------------------------
  // ERROR & LOADING MANAGERS
  // ----------------------------------------------------------------------------
  function showError(title, message) {
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    errorCard.classList.remove('hidden');
    errorCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function hideError() {
    errorCard.classList.add('hidden');
  }

  btnDismissError.addEventListener('click', hideError);

  function setLoading(isLoading, title = 'Generating your Study Pack...', status = 'Connecting to Google Gemini...') {
    if (isLoading) {
      loadingTitle.textContent = title;
      loadingSubtitle.textContent = status;
      loadingCard.classList.remove('hidden');
      btnGenerate.disabled = true;
      btnGenerate.style.opacity = '0.7';
      hideError();
    } else {
      loadingCard.classList.add('hidden');
      btnGenerate.disabled = false;
      btnGenerate.style.opacity = '1';
    }
  }

  // ----------------------------------------------------------------------------
  // FEATURE 1: GENERATE STUDY PACK
  // ----------------------------------------------------------------------------
  btnGenerate.addEventListener('click', async () => {
    const subject = subjectInput.value.trim();
    const notes = notesTextarea.value.trim();
    const hasPdf = !!state.selectedFile;

    // Validation: ensure either notes or PDF is provided
    if (!notes && !hasPdf) {
      showError(
        'Missing Study Material',
        'Please paste your study notes in Option A or upload a PDF document in Option B.'
      );
      showToast('Please provide notes or upload a PDF first.', 'error');
      return;
    }

    if (notes && notes.length < 20 && !hasPdf) {
      showError(
        'Input Too Short',
        'Please enter a bit more study content (at least 20 characters) so Gemini has enough context to generate quality summaries and quizzes.'
      );
      return;
    }

    // Build FormData
    const formData = new FormData();
    formData.append('subject', subject || 'General Notes');
    formData.append('notes', notes);
    if (hasPdf) {
      formData.append('pdfFile', state.selectedFile);
    }

    setLoading(
      true,
      'Generating your Study Pack...',
      hasPdf ? 'Extracting text from PDF and querying Gemini Flash...' : 'Sending structured prompt to Gemini Flash...'
    );

    try {
      const response = await fetch('/api/study-pack', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.details || data.error || 'Failed to generate study pack.');
      }

      // Save state
      state.currentStudyPack = data;
      state.userAnswers = {};
      state.isQuizSubmitted = false;
      state.activeContentText = notes; // will serve for quiz regeneration

      // Render the 3 main output sections
      renderResults(data);

      showToast('Study Pack generated successfully!', 'success');
      resultsDashboard.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      console.error(err);
      showError('Generation Failed', err.message);
      showToast(err.message, 'error', 5000);
    } finally {
      setLoading(false);
    }
  });

  // ----------------------------------------------------------------------------
  // RENDER COMPLETE RESULTS DASHBOARD
  // ----------------------------------------------------------------------------
  function renderResults(data) {
    // 1. Header Overview
    resultSubjectBadge.textContent = `Subject: ${data.subject}`;
    resultWordCount.textContent = `~${data.source.wordCount || 0} words analyzed`;

    if (data.source.hasPastedNotes && data.source.hasUploadedPdf) {
      resultSourceTag.textContent = `Source: Notes + PDF (${data.source.pdfFileName})`;
    } else if (data.source.hasUploadedPdf) {
      resultSourceTag.textContent = `Source: PDF (${data.source.pdfFileName})`;
    } else {
      resultSourceTag.textContent = 'Source: Pasted Notes';
    }

    // 2. Render SECTION 1: Summary Bullets
    renderSummary(data.summary);

    // 3. Render SECTION 2: Quiz
    renderQuiz(data.quiz);

    // 4. Render SECTION 3: Key Terms
    renderKeyTerms(data.keyTerms);

    // Reveal dashboard
    resultsDashboard.classList.remove('hidden');
  }

  // ----------------------------------------------------------------------------
  // SECTION 1: RENDER AI SUMMARY
  // ----------------------------------------------------------------------------
  function renderSummary(bullets) {
    summaryList.innerHTML = '';

    bullets.forEach((point, index) => {
      const li = document.createElement('li');
      li.className = 'summary-bullet-item';
      li.innerHTML = `
        <span class="bullet-number-badge">${index + 1}</span>
        <div class="bullet-text">${escapeHtml(point)}</div>
      `;
      summaryList.appendChild(li);
    });
  }

  // ----------------------------------------------------------------------------
  // SECTION 2: RENDER PRACTICE QUIZ
  // ----------------------------------------------------------------------------
  function renderQuiz(questions) {
    quizContainer.innerHTML = '';
    state.userAnswers = {};
    state.isQuizSubmitted = false;

    // Reset score banner
    quizScoreBanner.classList.add('hidden');
    btnSubmitQuiz.classList.remove('hidden');
    btnRetakeQuiz.classList.add('hidden');

    questions.forEach((q, qIndex) => {
      const card = document.createElement('div');
      card.className = 'quiz-question-card';
      card.id = `quiz-question-${q.id || qIndex + 1}`;

      const optionsKeys = ['A', 'B', 'C', 'D'];

      let optionsHtml = '';
      optionsKeys.forEach(optKey => {
        const optText = (q.options && q.options[optKey]) ? q.options[optKey] : '';
        optionsHtml += `
          <label class="quiz-option-label" data-qid="${q.id || qIndex + 1}" data-opt="${optKey}">
            <input 
              type="radio" 
              name="question_${q.id || qIndex + 1}" 
              value="${optKey}" 
              class="quiz-option-radio"
            >
            <span class="option-key-badge">${optKey})</span>
            <span class="option-text">${escapeHtml(optText)}</span>
          </label>
        `;
      });

      card.innerHTML = `
        <div class="quiz-question-header">
          <span class="question-num-tag">Q${qIndex + 1}</span>
          <h4 class="question-text">${escapeHtml(q.question)}</h4>
        </div>
        <div class="quiz-options-group">
          ${optionsHtml}
        </div>
        <div class="quiz-explanation-box hidden" id="explanation-${q.id || qIndex + 1}">
          <strong>Explanation:</strong> ${escapeHtml(q.explanation || 'Based on the provided notes.')}
        </div>
      `;

      quizContainer.appendChild(card);
    });

    // Attach click handlers to option labels
    document.querySelectorAll('.quiz-option-label').forEach(label => {
      label.addEventListener('click', (e) => {
        if (state.isQuizSubmitted) return; // Prevent changing after submit

        const qId = label.getAttribute('data-qid');
        const optKey = label.getAttribute('data-opt');

        // Select the radio input
        const radio = label.querySelector('.quiz-option-radio');
        radio.checked = true;

        // Update state
        state.userAnswers[qId] = optKey;

        // Highlight selected option visually
        const parentGroup = label.closest('.quiz-options-group');
        parentGroup.querySelectorAll('.quiz-option-label').forEach(l => l.classList.remove('selected'));
        label.classList.add('selected');
      });
    });
  }

  // ----------------------------------------------------------------------------
  // QUIZ SUBMISSION & SCORING
  // ----------------------------------------------------------------------------
  btnSubmitQuiz.addEventListener('click', () => {
    if (!state.currentStudyPack || !state.currentStudyPack.quiz) return;

    const questions = state.currentStudyPack.quiz;
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(state.userAnswers).length;

    if (answeredCount < totalQuestions) {
      const confirmSubmit = confirm(
        `You have answered ${answeredCount} out of ${totalQuestions} questions. Do you want to submit anyway?`
      );
      if (!confirmSubmit) return;
    }

    state.isQuizSubmitted = true;
    let score = 0;

    questions.forEach((q, qIndex) => {
      const qId = q.id || qIndex + 1;
      const studentAnswer = state.userAnswers[qId];
      const correctAnswer = (q.correctAnswer || '').trim().toUpperCase();

      const questionCard = document.getElementById(`quiz-question-${qId}`);
      if (!questionCard) return;

      const optionLabels = questionCard.querySelectorAll('.quiz-option-label');

      optionLabels.forEach(label => {
        const optKey = label.getAttribute('data-opt');

        // Highlight correct answer in green
        if (optKey === correctAnswer) {
          label.classList.add('correct');
        }

        // Highlight wrong chosen answer in red
        if (studentAnswer === optKey && studentAnswer !== correctAnswer) {
          label.classList.add('wrong');
        }
      });

      // Show explanation
      const explanationBox = document.getElementById(`explanation-${qId}`);
      if (explanationBox) {
        explanationBox.classList.remove('hidden');
      }

      if (studentAnswer === correctAnswer) {
        score++;
      }
    });

    // Display Score Banner: SCORE: X / 5
    scoreDisplayText.textContent = `SCORE: ${score} / ${totalQuestions}`;
    
    let remark = '';
    if (score === 5) {
      remark = 'Outstanding! Perfect score! You have mastered this material.';
    } else if (score >= 4) {
      remark = 'Great job! Strong grasp of the fundamental concepts.';
    } else if (score >= 3) {
      remark = 'Good effort! Review the explanations below to reinforce weak areas.';
    } else {
      remark = 'Keep practicing! Review the summary points and try retaking the quiz.';
    }
    scoreMessageText.textContent = remark;

    quizScoreBanner.classList.remove('hidden');
    btnSubmitQuiz.classList.add('hidden');
    btnRetakeQuiz.classList.remove('hidden');

    quizScoreBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast(`Quiz Submitted! Your Score: ${score} / ${totalQuestions}`, 'success');
  });

  // ----------------------------------------------------------------------------
  // RETAKE QUIZ FEATURE
  // ----------------------------------------------------------------------------
  function retakeQuiz() {
    if (!state.currentStudyPack || !state.currentStudyPack.quiz) return;

    state.isQuizSubmitted = false;
    state.userAnswers = {};

    // Clear highlights, radios and explanations
    document.querySelectorAll('.quiz-option-label').forEach(label => {
      label.classList.remove('selected', 'correct', 'wrong');
      const radio = label.querySelector('.quiz-option-radio');
      if (radio) radio.checked = false;
    });

    document.querySelectorAll('.quiz-explanation-box').forEach(box => {
      box.classList.add('hidden');
    });

    quizScoreBanner.classList.add('hidden');
    btnSubmitQuiz.classList.remove('hidden');
    btnRetakeQuiz.classList.add('hidden');

    quizContainer.scrollIntoView({ behavior: 'smooth' });
    showToast('Quiz reset! You can now select your answers again.', 'info');
  }

  btnRetakeQuiz.addEventListener('click', retakeQuiz);
  btnRetakeQuizTop.addEventListener('click', retakeQuiz);

  // ----------------------------------------------------------------------------
  // FEATURE 2: REGENERATE QUIZ (New 5 MCQs without re-summarizing)
  // ----------------------------------------------------------------------------
  btnRegenerateQuiz.addEventListener('click', async () => {
    if (!state.currentStudyPack) return;

    const subject = state.currentStudyPack.subject || 'General Notes';
    const notesContent = state.activeContentText || notesTextarea.value.trim();

    if (!notesContent && !state.selectedFile) {
      showToast('Study material is needed to generate new questions.', 'error');
      return;
    }

    const previousQuestions = (state.currentStudyPack.quiz || []).map(q => q.question);

    btnRegenerateQuiz.disabled = true;
    showToast('Generating 5 fresh questions with Gemini...', 'info');

    try {
      const response = await fetch('/api/regenerate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject,
          content: notesContent || 'Study material previously provided',
          previousQuestions: previousQuestions
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.details || data.error || 'Failed to regenerate quiz questions.');
      }

      // Update quiz in state and re-render quiz section only
      state.currentStudyPack.quiz = data.quiz;
      renderQuiz(data.quiz);

      showToast('Fresh quiz questions generated!', 'success');
      quizContainer.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      console.error(err);
      showError('Quiz Regeneration Failed', err.message);
      showToast(err.message, 'error');
    } finally {
      btnRegenerateQuiz.disabled = false;
    }
  });

  // ----------------------------------------------------------------------------
  // SECTION 3: RENDER KEY TERMS
  // ----------------------------------------------------------------------------
  function renderKeyTerms(terms) {
    keyTermsContainer.innerHTML = '';

    terms.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'key-term-card';
      card.innerHTML = `
        <div class="term-header">
          <h4 class="term-title">${escapeHtml(item.term)}</h4>
          <span class="term-tag">Term ${index + 1}</span>
        </div>
        <p class="term-meaning">${escapeHtml(item.meaning)}</p>
        <div class="term-example-box">
          <strong>Example:</strong> ${escapeHtml(item.example)}
        </div>
      `;
      keyTermsContainer.appendChild(card);
    });
  }

  // ----------------------------------------------------------------------------
  // COPY FEATURE: COPY SUMMARY
  // ----------------------------------------------------------------------------
  btnCopySummary.addEventListener('click', () => {
    if (!state.currentStudyPack || !state.currentStudyPack.summary) return;

    const summaryText = state.currentStudyPack.summary
      .map((bullet, idx) => `${idx + 1}. ${bullet}`)
      .join('\n\n');

    const fullCopy = `StudyMate AI - Summary (${state.currentStudyPack.subject})\n\n${summaryText}`;

    navigator.clipboard.writeText(fullCopy)
      .then(() => showToast('Summary copied to clipboard!', 'success'))
      .catch(() => showToast('Failed to copy to clipboard.', 'error'));
  });

  // ----------------------------------------------------------------------------
  // COPY FEATURE: COPY ALL RESULTS
  // ----------------------------------------------------------------------------
  btnCopyAll.addEventListener('click', () => {
    if (!state.currentStudyPack) return;

    const data = state.currentStudyPack;
    let fullOutput = `====================================================\n`;
    fullOutput += `STUDYMATE AI - STUDY PACK\n`;
    fullOutput += `Subject: ${data.subject}\n`;
    fullOutput += `====================================================\n\n`;

    // 1. Summary
    fullOutput += `--- SECTION 1: AI SUMMARY ---\n`;
    data.summary.forEach((pt, i) => {
      fullOutput += `${i + 1}. ${pt}\n`;
    });
    fullOutput += `\n`;

    // 2. Practice Quiz
    fullOutput += `--- SECTION 2: PRACTICE QUIZ (5 MCQs) ---\n`;
    data.quiz.forEach((q, i) => {
      fullOutput += `Q${i + 1}: ${q.question}\n`;
      fullOutput += `  A) ${q.options.A}\n`;
      fullOutput += `  B) ${q.options.B}\n`;
      fullOutput += `  C) ${q.options.C}\n`;
      fullOutput += `  D) ${q.options.D}\n`;
      fullOutput += `  Answer: Option ${q.correctAnswer}\n`;
      fullOutput += `  Explanation: ${q.explanation}\n\n`;
    });

    // 3. Key Terms
    fullOutput += `--- SECTION 3: KEY TERMS ---\n`;
    data.keyTerms.forEach((t, i) => {
      fullOutput += `${i + 1}. ${t.term}\n`;
      fullOutput += `   Meaning: ${t.meaning}\n`;
      fullOutput += `   Example: ${t.example}\n\n`;
    });

    navigator.clipboard.writeText(fullOutput)
      .then(() => showToast('All study materials copied to clipboard!', 'success'))
      .catch(() => showToast('Failed to copy to clipboard.', 'error'));
  });

  // ----------------------------------------------------------------------------
  // CLEAR ALL FEATURE
  // ----------------------------------------------------------------------------
  btnClearAll.addEventListener('click', () => {
    // Reset inputs
    subjectInput.value = '';
    notesTextarea.value = '';
    updateTextareaStats();
    clearSelectedFile();

    // Reset state & hide outputs
    state.currentStudyPack = null;
    state.userAnswers = {};
    state.isQuizSubmitted = false;
    state.activeContentText = '';

    resultsDashboard.classList.add('hidden');
    hideError();
    loadingCard.classList.add('hidden');

    showToast('All inputs and generated results cleared.', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ----------------------------------------------------------------------------
  // UTILITY: ESCAPE HTML
  // ----------------------------------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

});
