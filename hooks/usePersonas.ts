"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { useFirebase } from "@/lib/firebase-context";
import {
  AiPersona,
  STARTER_PERSONA_IDS,
  normalizePersonaIcon,
  normalizePersonaImage,
  createPersonaInFirestore,
  updatePersonaInFirestore,
  deletePersonaInFirestore,
  setActivePersonaInFirestore,
} from "@/lib/firestore-personas";

const CLEANED_STARTERS_PREFIX = "quizcraft_cleaned_starters_v1_";

export function usePersonas(userId: string) {
  const { user, authReady } = useFirebase();

  const [personas, setPersonas] = useState<AiPersona[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const cleanupAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authReady || !user || user.uid !== userId) {
      return;
    }

    const personasPath = `users/${userId}/personas`;
    const userPath = `users/${userId}`;

    const personasQuery = query(
      collection(db, "users", userId, "personas"),
      where("userId", "==", userId)
    );

    const unsubscribePersonas = onSnapshot(
      personasQuery,
      (snapshot) => {
        const list: AiPersona[] = snapshot.docs.map((d) => {
          const data = d.data();
          const createdAtMs =
            typeof data.createdAt?.toMillis === "function"
              ? data.createdAt.toMillis()
              : 0;
          return {
            id: typeof data.id === "string" ? data.id : d.id,
            userId: typeof data.userId === "string" ? data.userId : userId,
            name: typeof data.name === "string" ? data.name : "",
            description:
              typeof data.description === "string" ? data.description : "",
            profileIcon: normalizePersonaIcon(data.profileIcon),
            profileImage: normalizePersonaImage(data.profileImage),
            createdAtMs,
          };
        });

        list.sort((a, b) => {
          if (a.createdAtMs !== b.createdAtMs) {
            return a.createdAtMs - b.createdAtMs;
          }
          return a.id.localeCompare(b.id);
        });

        setPersonas(list);
        setIsLoading(false);

        // One-time cleanup of previously auto-seeded starter personas so the user starts with only Default ("เริ่มต้น")
        if (cleanupAttemptedRef.current !== userId) {
          cleanupAttemptedRef.current = userId;
          let alreadyCleaned = false;
          try {
            alreadyCleaned =
              typeof window !== "undefined" &&
              window.localStorage.getItem(`${CLEANED_STARTERS_PREFIX}${userId}`) ===
                "1";
          } catch {
            alreadyCleaned = false;
          }

          if (!alreadyCleaned) {
            try {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(
                  `${CLEANED_STARTERS_PREFIX}${userId}`,
                  "1"
                );
              }
            } catch {
              // ignore storage errors
            }
            const leftoverStarters = list.filter((p) =>
              STARTER_PERSONA_IDS.includes(p.id)
            );
            if (leftoverStarters.length > 0) {
              Promise.all(
                leftoverStarters.map((p) =>
                  deletePersonaInFirestore({ userId, personaId: p.id })
                )
              ).catch((err) =>
                console.error("Failed to remove starter personas:", err)
              );
            }
          }
        }
      },
      (error) => {
        setIsLoading(false);
        handleFirestoreError(error, OperationType.LIST, personasPath);
      }
    );

    const userDocRef = doc(db, "users", userId);
    const unsubscribeUser = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const savedId =
            typeof data?.activePersonaId === "string"
              ? data.activePersonaId
              : "";
          setActivePersonaId(savedId);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, userPath);
      }
    );

    return () => {
      unsubscribePersonas();
      unsubscribeUser();
    };
  }, [authReady, user, userId]);

  const activePersona = useMemo<AiPersona | null>(() => {
    if (!activePersonaId) return null;
    return personas.find((p) => p.id === activePersonaId) || null;
  }, [personas, activePersonaId]);

  const selectPersona = useCallback(
    async (personaId: string) => {
      setActivePersonaId(personaId);
      await setActivePersonaInFirestore({
        userId,
        activePersonaId: personaId,
      });
    },
    [userId]
  );

  const createPersona = useCallback(
    async (input: {
      name: string;
      description: string;
      profileImage?: string;
      selectAfterCreate?: boolean;
    }) => {
      const newId = await createPersonaInFirestore({
        userId,
        name: input.name,
        description: input.description,
        profileImage: input.profileImage || "",
      });
      if (input.selectAfterCreate) {
        setActivePersonaId(newId);
        await setActivePersonaInFirestore({
          userId,
          activePersonaId: newId,
        });
      }
      return newId;
    },
    [userId]
  );

  const updatePersona = useCallback(
    async (input: {
      personaId: string;
      name: string;
      description: string;
      profileImage?: string;
    }) => {
      await updatePersonaInFirestore({
        userId,
        personaId: input.personaId,
        name: input.name,
        description: input.description,
        profileImage: input.profileImage || "",
      });
    },
    [userId]
  );

  const deletePersona = useCallback(
    async (personaId: string) => {
      await deletePersonaInFirestore({
        userId,
        personaId,
      });
      if (activePersonaId === personaId) {
        setActivePersonaId("");
        await setActivePersonaInFirestore({
          userId,
          activePersonaId: "",
        });
      }
    },
    [userId, activePersonaId]
  );

  return {
    personas,
    activePersonaId,
    activePersona,
    isLoading,
    selectPersona,
    createPersona,
    updatePersona,
    deletePersona,
  };
}
