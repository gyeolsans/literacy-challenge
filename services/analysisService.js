(function () {
  const ADVANCED_WORDS = ["인식론", "규범", "담론", "외부성", "정당화", "상호주관성", "해석", "전제", "귀납", "연역", "환원", "구조", "매개", "제도", "합리성", "객관성", "상대성", "필요조건", "충분조건", "반론", "재반론", "논증", "타당성", "맥락", "함의", "숙의", "통치성", "자율성"];

  function sentences(passage = "") {
    return String(passage).split(/[.!?。！？]\s*|\n+/).map((part) => part.trim()).filter(Boolean);
  }

  function analyzePassage(passage = "") {
    const text = String(passage || "");
    const sentenceList = sentences(text);
    const paragraphCount = text.split(/\n+/).filter((p) => p.trim()).length || 1;
    const charCount = text.replace(/\s/g, "").length;
    const averageSentenceLength = sentenceList.length ? Math.round(charCount / sentenceList.length) : 0;
    const advancedCount = ADVANCED_WORDS.filter((word) => text.includes(word)).length;
    const difficultyScore =
      (charCount > 250 ? 1 : 0) +
      (charCount > 500 ? 2 : 0) +
      (charCount > 800 ? 3 : 0) +
      (sentenceList.length >= 6 ? 1 : 0) +
      (sentenceList.length >= 10 ? 2 : 0) +
      (paragraphCount >= 2 ? 1 : 0) +
      Math.min(advancedCount, 5);

    return {
      charCount,
      sentenceCount: sentenceList.length,
      paragraphCount,
      averageSentenceLength,
      estimatedReadingTime: estimateReadingTime(text),
      vocabularyLevel: advancedCount >= 5 ? "advanced" : advancedCount >= 2 ? "intermediate" : "basic",
      advancedWordCount: advancedCount,
      difficultyScore
    };
  }

  function estimateReadingTime(passage = "") {
    const chars = String(passage).replace(/\s/g, "").length;
    return Math.max(1, Math.ceil((chars / 500) * 60));
  }

  function textSimilarity(a = "", b = "") {
    const tokensA = new Set(String(a).toLowerCase().split(/\s+/).filter(Boolean));
    const tokensB = new Set(String(b).toLowerCase().split(/\s+/).filter(Boolean));
    if (!tokensA.size || !tokensB.size) return 0;
    const intersection = [...tokensA].filter((token) => tokensB.has(token)).length;
    return Number((intersection / new Set([...tokensA, ...tokensB]).size).toFixed(2));
  }

  function analyzeOptions(question = {}) {
    if (!Array.isArray(question.options)) return [];
    const correct = question.options[question.answer] || "";
    return question.options.map((option, index) => ({
      optionIndex: index,
      similarityToCorrect: textSimilarity(option, correct),
      trapHint: index === question.answer ? "정답 선택지" : "정답과 표현 또는 범위가 일부 겹칠 수 있으므로 지문 근거와 비교하세요."
    }));
  }

  function analyzeQuestion(question = {}) {
    return {
      type: question.type,
      difficulty: question.difficulty,
      points: Number(question.points || 0),
      optionCount: Array.isArray(question.options) ? question.options.length : 0,
      requiredReasoningSteps: question.difficultyMeta?.reasoningSteps || ({ easy: 1, normal: 2, hard: 3, expert: 4 }[question.difficulty] || 2),
      keywordCount: Array.isArray(question.keywords) ? question.keywords.length : 0,
      optionAnalysis: analyzeOptions(question)
    };
  }

  function analyzeUserPerformance(question = {}, answer, gradingResult = {}, elapsed = 0) {
    const passageAnalysis = analyzePassage(question.passage || "");
    const speedRatio = passageAnalysis.estimatedReadingTime ? Number((elapsed / passageAnalysis.estimatedReadingTime).toFixed(2)) : 0;
    const requiredKeywords = question.requiredKeywords || [];
    const matchedRequired = requiredKeywords.filter((keyword) => String(answer || "").includes(keyword));
    return {
      elapsedTime: Number(elapsed || 0),
      readingSpeedEvaluation: speedRatio < 0.6 ? "매우 빠름: 지문 근거를 놓쳤을 수 있습니다." : speedRatio > 2 ? "느림: 핵심 문장 표시 연습이 필요합니다." : "적정",
      earnedPoints: Number(gradingResult.earnedPoints || 0),
      isCorrect: Boolean(gradingResult.isCorrect),
      isPartial: Boolean(gradingResult.isPartial),
      similarity: Number(gradingResult.similarity || 0),
      keywordScore: Number(gradingResult.keywordScore || 0),
      requiredKeywordCoverage: requiredKeywords.length ? Number((matchedRequired.length / requiredKeywords.length).toFixed(2)) : 1,
      missingKeywords: requiredKeywords.filter((keyword) => !matchedRequired.includes(keyword)),
      recommendedReviewType: gradingResult.isCorrect ? "유지 학습" : question.type || "추론"
    };
  }

  function buildQuestionAnalysis(item = {}) {
    const question = item.question || {};
    return {
      passage: analyzePassage(question.passage || ""),
      question: analyzeQuestion(question),
      performance: analyzeUserPerformance(question, item.userAnswer, item.grade, item.elapsed),
      options: analyzeOptions(question)
    };
  }

  window.AnalysisService = {
    analyzePassage,
    estimateReadingTime,
    analyzeQuestion,
    analyzeUserPerformance,
    analyzeOptions,
    buildQuestionAnalysis
  };
})();
