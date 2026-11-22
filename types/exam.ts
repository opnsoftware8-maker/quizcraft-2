export interface ExamQuestion {
  id: string;
  question: string;
  // User explicit requirement: "อาเรย์ ห้าค่า สี่อันเป็นคำตอบแบบกด และอันที่ห้าคือค่าว่าเฉลยมันตอบอะไร"
  // options[0..3] = 4 choices (A, B, C, D)
  // options[4] = correct answer string
  options: [string, string, string, string, string];
  correctIndex: number; // 0..3 matching the correct choice among options[0..3]
  explanation: string;
  sourceQuote: string;
  difficulty: 'recall' | 'analysis';
  keyConcept: string;
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  keyFormulaOrFact: string;
  examWatchout: string; // ข้อควรระวัง / หลุมพรางข้อสอบ
  sourceQuote: string;
}

export interface SubjectiveQuestion {
  id: string;
  question: string;
  context: string;
  idealKeyPoints: string[];
  rubricGuide: string;
  sourceQuote: string;
}

export interface SubjectiveGradingResult {
  score: number; // 0 - 10
  total: number; // 10
  percentage: number;
  verdict: 'ยอดเยี่ยม (Mastery)' | 'ดีมาก (Proficient)' | 'ปานกลาง (Developing)' | 'ต้องทบทวนเพิ่ม (Learning Gap)';
  strengths: string[];
  missingKeyPoints: string[];
  misconceptions: string[];
  wordByWordFeedback: string;
  modelAnswer: string;
  groundedQuote: string;
}

export interface StudySummarySection {
  heading: string;
  subheading?: string;
  keyPoints: string[];
  deepDive: string;
  formulaOrRule?: string;
}

export interface ExamFocusPoint {
  concept: string;
  whyItAppearsInExam: string;
  trapWarning: string;
  sourceExcerpt: string;
}

export interface KeyTermItem {
  term: string;
  definition: string;
  contextOrExample: string;
}

export interface SelfCheckQuestion {
  question: string;
  quickAnswer: string;
}

export interface StudySummaryData {
  title: string;
  subject: string;
  readingTimeMinutes: number;
  oneMinuteElevatorPitch: string;
  coreKeyTakeaways: string[];
  sections: StudySummarySection[];
  examFocusPoints: ExamFocusPoint[];
  keyTermsTable: KeyTermItem[];
  selfCheckQuestions: SelfCheckQuestion[];
  rawMarkdownExport?: string;
}

export interface HomeworkStep {
  stepNumber: number;
  title: string;
  explanation: string;
  calculation?: string;
}

export interface HomeworkProblemItem {
  problemNumber?: string;
  problemStatement: string;
  givenInfo?: string[];
  toFind?: string;
  mainFormulaOrConcept?: string;
  steps: HomeworkStep[];
  finalAnswer: string;
  verification?: string;
  tipsOrTraps?: string;
}

export interface StructuredHomeworkSolution {
  title: string;
  subject: string;
  difficultyLevel?: string;
  overview: string;
  solutions: HomeworkProblemItem[];
  overallKeyTakeaway: string;
  rawMarkdownExport?: string;
}
