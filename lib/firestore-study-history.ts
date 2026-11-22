import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { makeSafeFirestoreId } from "@/lib/firestore-chat";
import {
  StudySummaryData,
  ExamQuestion,
  Flashcard,
  SubjectiveQuestion,
} from "@/types/exam";
import { Language } from "@/lib/i18n";

export type StudyHistoryType = "summary" | "quiz";

export interface StudyHistoryItem {
  id: string;
  userId: string;
  type: StudyHistoryType;
  title: string;
  subject: string;
  content: string;
  createdAtMs: number;
}

export const MAX_HISTORY_TITLE_LENGTH = 200;
export const MAX_HISTORY_SUBJECT_LENGTH = 120;
export const MAX_HISTORY_CONTENT_LENGTH = 50000;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

function assertSafeId(id: string): string {
  if (SAFE_ID_PATTERN.test(id)) return id;
  return (
    id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128) ||
    makeSafeFirestoreId("hist")
  );
}

function clampRequiredText(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (!trimmed) return " ";
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

function clampOptionalText(text: string, maxLen: number): string {
  const trimmed = text.trim();
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

export function formatSummaryForHistory(
  summary: StudySummaryData,
  language: Language
): { title: string; subject: string; content: string } {
  const title =
    summary.title?.trim() ||
    (language === "en" ? "Lesson Summary" : "สรุปเนื้อหาบทเรียน");
  const subject =
    summary.subject?.trim() ||
    (language === "en" ? "Summary" : "สรุปเนื้อหา");

  const parts: string[] = [
    `# ${title}`,
    `${language === "en" ? "Subject" : "วิชา"}: ${subject}`,
  ];

  if (summary.oneMinuteElevatorPitch) {
    parts.push(
      `## ${language === "en" ? "Overview" : "ภาพรวม"}\n${summary.oneMinuteElevatorPitch}`
    );
  }

  if (summary.coreKeyTakeaways?.length > 0) {
    parts.push(
      `## ${language === "en" ? "Core Takeaways" : "แก่นสำคัญ"}\n` +
        summary.coreKeyTakeaways.map((t) => `- ${t}`).join("\n")
    );
  }

  if (summary.sections?.length > 0) {
    parts.push(
      `## ${language === "en" ? "Detailed Topics" : "เนื้อหาเจาะลึก"}\n` +
        summary.sections
          .map((sec, idx) => {
            const kps = sec.keyPoints?.length
              ? `\n${sec.keyPoints.map((kp) => `  - ${kp}`).join("\n")}`
              : "";
            const formula = sec.formulaOrRule
              ? `\n  ${language === "en" ? "Formula/Rule" : "สูตร/กฎ"}: ${sec.formulaOrRule}`
              : "";
            return `### ${idx + 1}. ${sec.heading}\n${sec.deepDive}${kps}${formula}`;
          })
          .join("\n\n")
    );
  }

  if (summary.examFocusPoints?.length > 0) {
    parts.push(
      `## ${language === "en" ? "Exam Focus" : "จุดเน้นข้อสอบ"}\n` +
        summary.examFocusPoints
          .map(
            (e) =>
              `- **${e.concept}**: ${e.whyItAppearsInExam} (${language === "en" ? "Watchout" : "ระวัง"}: ${e.trapWarning})`
          )
          .join("\n")
    );
  }

  if (summary.keyTermsTable?.length > 0) {
    parts.push(
      `## ${language === "en" ? "Key Terms" : "คำศัพท์สำคัญ"}\n` +
        summary.keyTermsTable
          .map((t) => `- **${t.term}**: ${t.definition}`)
          .join("\n")
    );
  }

  return {
    title: clampRequiredText(title, MAX_HISTORY_TITLE_LENGTH),
    subject: clampOptionalText(subject, MAX_HISTORY_SUBJECT_LENGTH),
    content: clampRequiredText(parts.join("\n\n"), MAX_HISTORY_CONTENT_LENGTH),
  };
}

export function formatQuizForHistory(params: {
  examTitle: string;
  subject: string;
  questions: ExamQuestion[];
  userAnswers?: Record<number, number>;
  language: Language;
}): { title: string; subject: string; content: string } {
  const { examTitle, subject, questions, userAnswers, language } = params;
  const cleanTitle =
    examTitle?.trim() ||
    (language === "en" ? "Practice Quiz" : "แบบทดสอบฝึกหัด");
  const cleanSubject =
    subject?.trim() || (language === "en" ? "Quiz" : "แบบทดสอบ");
  const letters = ["A", "B", "C", "D"];

  const qBlocks = questions.map((q, idx) => {
    const opts = q.options
      .slice(0, 4)
      .map((opt, oIdx) => `  ${letters[oIdx]}. ${opt}`)
      .join("\n");
    const correctLabel = `${letters[q.correctIndex] || "A"}. ${
      q.options[q.correctIndex] || ""
    }`;
    const userPickedIdx = userAnswers?.[idx];
    const userLine =
      userPickedIdx !== undefined
        ? `\n  ${language === "en" ? "User answer" : "คำตอบที่เลือก"}: ${letters[userPickedIdx] || ""}`
        : "";
    return `${idx + 1}. ${q.question}\n${opts}\n  ${
      language === "en" ? "Correct Answer" : "เฉลย"
    }: ${correctLabel}${userLine}\n  ${
      language === "en" ? "Explanation" : "คำอธิบาย"
    }: ${q.explanation}`;
  });

  const content = [
    `# ${cleanTitle}`,
    `${language === "en" ? "Subject" : "วิชา"}: ${cleanSubject} (${questions.length} ${
      language === "en" ? "questions" : "ข้อ"
    })`,
    qBlocks.join("\n\n"),
  ].join("\n\n");

  return {
    title: clampRequiredText(cleanTitle, MAX_HISTORY_TITLE_LENGTH),
    subject: clampOptionalText(cleanSubject, MAX_HISTORY_SUBJECT_LENGTH),
    content: clampRequiredText(content, MAX_HISTORY_CONTENT_LENGTH),
  };
}

export function formatFlashcardsForHistory(params: {
  topic: string;
  cards: Flashcard[];
  language: Language;
}): { title: string; subject: string; content: string } {
  const { topic, cards, language } = params;
  const cleanTitle =
    topic?.trim() ||
    (language === "en" ? "Flashcards Deck" : "ชุดแฟลชการ์ดทบทวน");
  const cleanSubject = language === "en" ? "Flashcards" : "แฟลชการ์ด";

  const blocks = cards.map(
    (c, idx) =>
      `${idx + 1}. **${c.term}**\n  ${language === "en" ? "Definition" : "นิยาม"}: ${c.definition}\n  ${language === "en" ? "Watchout" : "ข้อควรระวัง"}: ${c.examWatchout}`
  );

  const content = [
    `# ${cleanTitle}`,
    `${language === "en" ? "Flashcards" : "แฟลชการ์ด"} (${cards.length})`,
    blocks.join("\n\n"),
  ].join("\n\n");

  return {
    title: clampRequiredText(cleanTitle, MAX_HISTORY_TITLE_LENGTH),
    subject: clampOptionalText(cleanSubject, MAX_HISTORY_SUBJECT_LENGTH),
    content: clampRequiredText(content, MAX_HISTORY_CONTENT_LENGTH),
  };
}

export function formatSubjectiveForHistory(params: {
  title: string;
  questions: SubjectiveQuestion[];
  language: Language;
}): { title: string; subject: string; content: string } {
  const { title, questions, language } = params;
  const cleanTitle =
    title?.trim() ||
    (language === "en" ? "Free-Response Exam" : "แบบทดสอบข้อเขียน");
  const cleanSubject = language === "en" ? "Free Response" : "ข้อเขียน";

  const blocks = questions.map(
    (q, idx) =>
      `${idx + 1}. ${q.question}\n  ${language === "en" ? "Rubric" : "เกณฑ์"}: ${q.rubricGuide}\n  ${
        language === "en" ? "Key Points" : "ประเด็นสำคัญ"
      }: ${(q.idealKeyPoints || []).join(", ")}`
  );

  const content = [
    `# ${cleanTitle}`,
    `${language === "en" ? "Free-Response Questions" : "ข้อสอบอัตนัย"} (${questions.length})`,
    blocks.join("\n\n"),
  ].join("\n\n");

  return {
    title: clampRequiredText(cleanTitle, MAX_HISTORY_TITLE_LENGTH),
    subject: clampOptionalText(cleanSubject, MAX_HISTORY_SUBJECT_LENGTH),
    content: clampRequiredText(content, MAX_HISTORY_CONTENT_LENGTH),
  };
}

export async function saveStudyHistoryItemToFirestore(params: {
  userId: string;
  type: StudyHistoryType;
  title: string;
  subject: string;
  content: string;
}): Promise<string> {
  const uid = assertSafeId(params.userId);
  const itemId = makeSafeFirestoreId("hist");
  const path = `users/${uid}/studyHistory/${itemId}`;

  try {
    const ref = doc(db, "users", uid, "studyHistory", itemId);
    await setDoc(ref, {
      id: itemId,
      userId: uid,
      type: params.type === "quiz" ? "quiz" : "summary",
      title: clampRequiredText(params.title, MAX_HISTORY_TITLE_LENGTH),
      subject: clampOptionalText(params.subject, MAX_HISTORY_SUBJECT_LENGTH),
      content: clampRequiredText(params.content, MAX_HISTORY_CONTENT_LENGTH),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return itemId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteStudyHistoryItemFromFirestore(params: {
  userId: string;
  itemId: string;
}): Promise<void> {
  const uid = assertSafeId(params.userId);
  const iid = assertSafeId(params.itemId);
  const path = `users/${uid}/studyHistory/${iid}`;

  try {
    await deleteDoc(doc(db, "users", uid, "studyHistory", iid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
