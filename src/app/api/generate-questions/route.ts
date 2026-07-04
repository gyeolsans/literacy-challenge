import { NextRequest, NextResponse } from 'next/server';

interface GenerateQuestionsRequest {
  difficulty: string;
  count: number;
  includeShortAnswer: boolean;
  selectedTypes: string[];
}

interface AIQuestion {
  id: string;
  difficulty: string;
  type: string;
  answerType: string;
  passage: string;
  question: string;
  options?: string[];
  answer?: number;
  sampleAnswers?: string[];
  keywords?: string[];
  requiredKeywords?: string[];
  explanation: string;
  points: number;
  source: string;
}

// 문제 유효성 검사
function validateQuestion(question: any): question is AIQuestion {
  if (!question.id || !question.difficulty || !question.type || !question.passage) return false;
  if (!question.question || !question.explanation || !question.points) return false;
  
  if (question.answerType === 'multiple_choice') {
    if (!Array.isArray(question.options) || question.options.length !== 4) return false;
    if (typeof question.answer !== 'number' || question.answer < 0 || question.answer > 3) return false;
  } else if (question.answerType === 'short_answer') {
    if (!Array.isArray(question.sampleAnswers) || question.sampleAnswers.length === 0) return false;
    if (!Array.isArray(question.keywords) || question.keywords.length === 0) return false;
    if (!Array.isArray(question.requiredKeywords) || question.requiredKeywords.length === 0) return false;
  }
  
  return true;
}

async function generateQuestionsWithOpenAI(params: GenerateQuestionsRequest): Promise<AIQuestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  
  const difficultyGuide = {
    easy: '초등학교 수준의 간단한 내용 (지문 3-4문장)',
    normal: '중학교 수준의 일반적인 내용 (지문 4-5문장)',
    hard: '고등학교 수준의 복잡한 내용 (지문 5-6문장)',
    expert: '대학 입시 수준의 어려운 내용 (지문 5-6문장)'
  };

  const typeGuide = {
    main_idea: '글의 중심 내용/주제 파악',
    title: '글에 어울리는 제목 선택',
    summary: '글의 내용을 요약하여 선택',
    inference: '글에서 추론할 수 있는 내용',
    vocabulary: '단어의 의미 파악',
    context_meaning: '문맥에서의 단어 의미',
    critical_thinking: '비판적 분석 및 평가',
    claim: '글쓴이의 주장/주제 파악',
    evidence: '근거/증거 찾기',
    attitude: '글쓴이의 태도/견해 파악',
    blank: '빈칸 채우기',
    order: '사건 순서 정렬'
  };

  const selectedTypesGuide = params.selectedTypes
    .map((type: string) => `- ${type}: ${typeGuide[type as keyof typeof typeGuide] || type}`)
    .join('\n');

  const shortAnswerNote = params.includeShortAnswer
    ? `
생성할 문제 유형:
- ${Math.ceil(params.count * 0.6)}개: 객관식 (multiple_choice)
- ${Math.floor(params.count * 0.4)}개: 주관식 (short_answer)
`
    : `
생성할 문제 유형:
- ${params.count}개: 모두 객관식 (multiple_choice)
`;

  const prompt = `당신은 한국 초중고 학생들의 문해력을 평가하는 전문 교육 컨설턴트입니다.

다음 조건으로 한국어 문해력 테스트 문제를 ${params.count}개 생성하세요.

[난이도]
${difficultyGuide[params.difficulty as keyof typeof difficultyGuide] || difficultyGuide.normal}

[문제 유형]
${selectedTypesGuide || '모든 유형'}

[문제 포맷]
${shortAnswerNote}

[중요한 규칙]
1. 모든 문제와 지문은 한국어로만 작성
2. 각 지문은 자연스럽고 교육적인 내용
3. 객관식은 보기 정확히 4개 필수
4. 객관식 answer는 정답 보기의 index (0-3)
5. 주관식은 모범답안(sampleAnswers), 키워드(keywords), 필수키워드(requiredKeywords) 필수
6. 정치적 선동, 혐오, 선정적 내용, 개인정보 관련 내용 금지
7. 문제끼리 중복 없게 생성
8. 난이도에 따라 지문 길이와 추론 난이도 조절
9. 각 문제는 고유한 ID (ai-001, ai-002 등) 부여

[반드시 JSON 형식으로만 반환]

반환 형식 (JSON만 반환하고 다른 텍스트는 금지):
{
  "questions": [
    {
      "id": "ai-001",
      "difficulty": "${params.difficulty}",
      "type": "main_idea",
      "answerType": "multiple_choice",
      "passage": "지문 내용...",
      "question": "질문",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "answer": 0,
      "explanation": "해설",
      "points": 10,
      "source": "ai"
    },
    {
      "id": "ai-002",
      "difficulty": "${params.difficulty}",
      "type": "summary",
      "answerType": "short_answer",
      "passage": "지문 내용...",
      "question": "질문",
      "sampleAnswers": ["모범답안1", "모범답안2"],
      "keywords": ["핵심어1", "핵심어2"],
      "requiredKeywords": ["필수핵심어1"],
      "explanation": "해설",
      "points": 15,
      "source": "ai"
    }
  ]
}

지금 바로 JSON 응답을 생성하세요.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 한국어 문해력 테스트 문제 생성 전문가입니다. 반드시 유효한 JSON 형식으로만 응답하세요.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from OpenAI API');
    }

    // JSON 파싱 시도
    let jsonData: any;
    try {
      // 마크다운 코드 블록 제거
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      jsonData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response content:', content);
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    if (!jsonData.questions || !Array.isArray(jsonData.questions)) {
      throw new Error('Invalid response structure: missing questions array');
    }

    // 유효한 문제만 필터링
    const validQuestions = jsonData.questions
      .filter((q: any) => validateQuestion(q))
      .slice(0, params.count)
      .map((q: any, index: number) => ({
        ...q,
        id: `ai-${String(index + 1).padStart(3, '0')}`,
      }));

    if (validQuestions.length === 0) {
      throw new Error('No valid questions generated');
    }

    return validQuestions;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateQuestionsRequest;

    // 요청 검증
    if (!body.difficulty || !['easy', 'normal', 'hard', 'expert'].includes(body.difficulty)) {
      return NextResponse.json(
        { error: 'Invalid difficulty level' },
        { status: 400 }
      );
    }

    if (typeof body.count !== 'number' || body.count < 1 || body.count > 50) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 50' },
        { status: 400 }
      );
    }

    if (typeof body.includeShortAnswer !== 'boolean') {
      return NextResponse.json(
        { error: 'includeShortAnswer must be boolean' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.selectedTypes)) {
      return NextResponse.json(
        { error: 'selectedTypes must be an array' },
        { status: 400 }
      );
    }

    // API Key 확인
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error: API key not set' },
        { status: 500 }
      );
    }

    const questions = await generateQuestionsWithOpenAI(body);

    return NextResponse.json(
      { questions },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error generating questions:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    if (errorMessage.includes('JSON')) {
      return NextResponse.json(
        { error: 'Failed to generate valid questions' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
}

// GET은 허용하지 않음
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
