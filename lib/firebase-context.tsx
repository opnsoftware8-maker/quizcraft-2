"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  auth,
  db,
  googleProvider,
  testFirestoreConnection,
  handleFirestoreError,
  OperationType,
} from "@/lib/firebase";
import { useLanguage } from "@/lib/language-context";

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  isSigningIn: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue>({
  user: null,
  authReady: false,
  isSigningIn: false,
  authError: null,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  clearAuthError: () => {},
});

function sanitizeProfilePayload(user: User, lang: "en" | "th") {
  const email = (user.email || `${user.uid}@users.local`).trim().slice(0, 320);
  const displayName = (user.displayName || "").trim().slice(0, 120);
  const photoURL = (user.photoURL || "").trim().slice(0, 1000);
  const preferredLanguage = lang === "en" ? "en" : "th";

  return {
    uid: user.uid,
    email,
    displayName,
    photoURL,
    preferredLanguage,
  };
}

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    testFirestoreConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocPath = `users/${firebaseUser.uid}`;
        const userRef = doc(db, "users", firebaseUser.uid);
        try {
          const snap = await getDoc(userRef);
          const safeData = sanitizeProfilePayload(firebaseUser, language);
          if (!snap.exists()) {
            try {
              await setDoc(userRef, {
                ...safeData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            } catch (writeErr) {
              handleFirestoreError(writeErr, OperationType.CREATE, userDocPath);
            }
          } else {
            try {
              await updateDoc(userRef, {
                email: safeData.email,
                displayName: safeData.displayName,
                photoURL: safeData.photoURL,
                preferredLanguage: safeData.preferredLanguage,
                updatedAt: serverTimestamp(),
              });
            } catch (updateErr) {
              handleFirestoreError(updateErr, OperationType.UPDATE, userDocPath);
            }
          }
        } catch (readErr) {
          console.error("Failed to sync user profile:", readErr);
        }
      }

      setUser(firebaseUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [language]);

  const signInWithGoogle = useCallback(async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthError(null);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const code = String(err?.code || "");
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        setAuthError(null);
      } else if (code === "auth/popup-blocked") {
        setAuthError(
          language === "en"
            ? "Pop-up was blocked by your browser. Please allow pop-ups and try again."
            : "เบราว์เซอร์บล็อกหน้าต่างล็อกอิน กรุณาอนุญาตป๊อปอัปแล้วลองใหม่อีกครั้ง"
        );
      } else if (code === "auth/unauthorized-domain") {
        setAuthError(
          language === "en"
            ? "This domain is not authorized for Google Sign-In yet."
            : "โดเมนนี้ยังไม่ได้รับอนุญาตให้เข้าสู่ระบบด้วย Google"
        );
      } else {
        setAuthError(
          language === "en"
            ? "Unable to sign in with Google. Please try again."
            : "ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่อีกครั้ง"
        );
      }
    } finally {
      setIsSigningIn(false);
    }
  }, [isSigningIn, language]);

  const signOutUser = useCallback(async () => {
    try {
      await signOut(auth);
      setAuthError(null);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        isSigningIn,
        authError,
        signInWithGoogle,
        signOutUser,
        clearAuthError,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  return useContext(FirebaseContext);
}
