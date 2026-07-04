module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY 환경 변수가 설정되어 있지 않습니다." });
  }

  try {
    const { question, userAnswer, gradingResult, passageAnalysis } = req.body || {};
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "너는 한국어 문해력 문제 풀이를 분석하는 교사다. 반드시 JSON만 반환한다."
          },
          {
            role: "user",
            content: JSON.stringify({
              instruction: "문제, 지문, 사용자 답안, 채점 결과를 바탕으로 상세 해설 분석을 생성하라.",
              requiredSchema: {
                summary: "글의 핵심 요약",
                paragraphSummaries: ["1문단 요약"],
                answerReason: "정답 근거",
                wrongOptionAnalysis: [{ optionIndex: 0, analysis: "이 보기가 틀린 이유" }],
                userMistakeAnalysis: "사용자가 헷갈린 지점",
                solvingStrategy: "다음 전략",
                vocabularyNotes: [{ word: "핵심어", meaning: "뜻" }],
                reasoningSteps: ["1단계", "2단계"]
              },
              question,
              userAnswer,
              gradingResult,
              passageAnalysis
            })
          }
        ]
      })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return res.status(response.status).json({ error: payload?.error?.message || "OpenAI 분석 요청에 실패했습니다." });
    }
    const content = payload?.choices?.[0]?.message?.content || "{}";
    return res.status(200).json(JSON.parse(content));
  } catch (error) {
    return res.status(500).json({ error: error.message || "AI 상세 분석 중 오류가 발생했습니다." });
  }
};
