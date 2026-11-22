"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { useFirebase } from "@/lib/firebase-context";
import {
  StudyHistoryItem,
  StudyHistoryType,
  saveStudyHistoryItemToFirestore,
  deleteStudyHistoryItemFromFirestore,
} from "@/lib/firestore-study-history";

export function useStudyHistory(userId: string) {
  const { user, authReady } = useFirebase();
  const [items, setItems] = useState<StudyHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!authReady || !user || user.uid !== userId) {
      return;
    }

    const historyPath = `users/${userId}/studyHistory`;
    const historyQuery = query(
      collection(db, "users", userId, "studyHistory"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      historyQuery,
      (snapshot) => {
        const list: StudyHistoryItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          const createdAtMs =
            typeof data.createdAt?.toMillis === "function"
              ? data.createdAt.toMillis()
              : 0;
          return {
            id: typeof data.id === "string" ? data.id : d.id,
            userId: typeof data.userId === "string" ? data.userId : userId,
            type: data.type === "quiz" ? "quiz" : "summary",
            title: typeof data.title === "string" ? data.title : "",
            subject: typeof data.subject === "string" ? data.subject : "",
            content: typeof data.content === "string" ? data.content : "",
            createdAtMs,
          };
        });

        // Sort newest first
        list.sort((a, b) => {
          if (a.createdAtMs !== b.createdAtMs) {
            return b.createdAtMs - a.createdAtMs;
          }
          return b.id.localeCompare(a.id);
        });

        setItems(list);
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
        handleFirestoreError(error, OperationType.LIST, historyPath);
      }
    );

    return () => unsubscribe();
  }, [authReady, user, userId]);

  const summaryItems = useMemo(
    () => items.filter((item) => item.type === "summary"),
    [items]
  );

  const quizItems = useMemo(
    () => items.filter((item) => item.type === "quiz"),
    [items]
  );

  const saveHistoryItem = useCallback(
    async (input: {
      type: StudyHistoryType;
      title: string;
      subject: string;
      content: string;
    }) => {
      return saveStudyHistoryItemToFirestore({
        userId,
        type: input.type,
        title: input.title,
        subject: input.subject,
        content: input.content,
      });
    },
    [userId]
  );

  const deleteHistoryItem = useCallback(
    async (itemId: string) => {
      await deleteStudyHistoryItemFromFirestore({
        userId,
        itemId,
      });
    },
    [userId]
  );

  return {
    items,
    summaryItems,
    quizItems,
    isLoading,
    saveHistoryItem,
    deleteHistoryItem,
  };
}
