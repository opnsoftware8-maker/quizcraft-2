"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Plus, Pencil, Trash2, Loader2, Upload, Smile } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import {
  AiPersona,
  AiEmotion,
  EmotionDraft,
  DEFAULT_PERSONA_KEY,
  MAX_PERSONA_NAME_LENGTH,
  MAX_PERSONA_DESCRIPTION_LENGTH,
  MAX_EMOTION_LABEL_LENGTH,
  processPersonaAvatarFile,
} from "@/lib/firestore-personas";
import { PersonaAvatar } from "@/components/PersonaAvatarIcon";

interface EmotionDraftRowState extends EmotionDraft {
  localKey: string;
}

function makeLocalEmotionKey(): string {
  return `em_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toDraftRows(list: AiEmotion[]): EmotionDraftRowState[] {
  return list.map((em) => ({
    localKey: em.id,
    id: em.id,
    label: em.label,
    image: em.image,
  }));
}

interface EmotionDraftRowProps {
  draft: EmotionDraftRowState;
  index: number;
  language: "th" | "en";
  disabled: boolean;
  onPatch: (localKey: string, patch: Partial<EmotionDraftRowState>) => void;
  onRemove: () => void;
  onProcessingChange: (localKey: string, isProcessing: boolean) => void;
  onError: (msg: string) => void;
}

function EmotionDraftRow({
  draft,
  index,
  language,
  disabled,
  onPatch,
  onRemove,
  onProcessingChange,
  onError,
}: EmotionDraftRowProps) {
  const rowFileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const inputId = `emotion-photo-input-${draft.localKey}`;

  const processSelectedFile = async (file: File | undefined) => {
    if (!file) return;

    setIsProcessing(true);
    onProcessingChange(draft.localKey, true);
    onError("");

    try {
      const compressedDataUrl = await processPersonaAvatarFile(file);
      onPatch(draft.localKey, { image: compressedDataUrl });
    } catch (err: any) {
      const code = String(err?.message || "");
      if (code === "INVALID_IMAGE_TYPE") {
        onError(
          language === "en"
            ? "Please choose a valid image file (JPG, PNG, or WebP)."
            : "กรุณาเลือกไฟล์รูปภาพที่รองรับ (JPG, PNG หรือ WebP)"
        );
      } else if (code === "IMAGE_TOO_LARGE") {
        onError(
          language === "en"
            ? "Image file is too large. Please select an image under 25 MB."
            : "ไฟล์รูปภาพมีขนาดใหญ่เกินไป กรุณาเลือกรูปที่มีขนาดไม่เกิน 25 MB"
        );
      } else {
        onError(
          language === "en"
            ? "Could not process this emotion image. Please try another photo."
            : "ไม่สามารถประมวลผลรูปอารมณ์นี้ได้ กรุณาลองเลือกรูปอื่น"
        );
      }
    } finally {
      setIsProcessing(false);
      onProcessingChange(draft.localKey, false);
    }
  };

  const handleRowFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset synchronously before async work so re-selecting the same photo always triggers onChange
    e.target.value = "";
    if (!file) return;
    void processSelectedFile(file);
  };

  const handleRowDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isProcessing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processSelectedFile(file);
    }
  };

  const isLocked = disabled || isProcessing;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!isLocked) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleRowDrop}
      className={`rounded-xl border bg-white p-3 space-y-2.5 transition-colors ${
        isDragging ? "border-[#1F1E1D] bg-[#FAF9F5]" : "border-[#DFDDD6]"
      }`}
    >
      <div className="flex items-center gap-3">
        <label
          htmlFor={isLocked ? undefined : inputId}
          className={`relative rounded-full shrink-0 focus:outline-none ${
            isLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
          }`}
          aria-label={
            language === "en"
              ? `Upload image for emotion ${index + 1}`
              : `อัปโหลดรูปสำหรับอารมณ์ที่ ${index + 1}`
          }
        >
          <PersonaAvatar
            profileImage={draft.image}
            alt={draft.label || `Emotion ${index + 1}`}
            sizeClass="w-11 h-11"
          />
          {isProcessing && (
            <span className="absolute inset-0 rounded-full bg-[#FAF9F5]/80 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[#1F1E1D]" />
            </span>
          )}
        </label>

        <input
          ref={rowFileInputRef}
          id={inputId}
          type="file"
          accept="image/*"
          disabled={isLocked}
          onChange={handleRowFileChange}
          className="sr-only"
        />

        <div className="flex-1 min-w-0">
          <input
            type="text"
            maxLength={MAX_EMOTION_LABEL_LENGTH}
            value={draft.label}
            onChange={(e) => {
              onError("");
              onPatch(draft.localKey, { label: e.target.value });
            }}
            placeholder={
              language === "en"
                ? "Emotion name (e.g., Happy, Angry, Shy)"
                : "ชื่ออารมณ์ (เช่น ดีใจ, โกรธ, เขิน)"
            }
            disabled={disabled}
            className="w-full px-3 py-1.5 rounded-xl border border-[#DFDDD6] bg-[#FAF9F5] text-[#1F1E1D] text-[16px] placeholder:text-[#8C8A84] focus:outline-none focus:border-[#1F1E1D] transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="p-2 rounded-lg text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          aria-label={language === "en" ? "Remove emotion" : "ลบอารมณ์นี้"}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 pl-14">
        <label
          htmlFor={isLocked ? undefined : inputId}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#DFDDD6] bg-[#FAF9F5] hover:bg-[#EFECE4] text-xs font-medium text-[#1F1E1D] transition-colors ${
            isLocked ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span>
            {isProcessing
              ? language === "en"
                ? "Processing..."
                : "กำลังประมวลผล..."
              : draft.image
                ? language === "en"
                  ? "Change Emotion Photo"
                  : "เปลี่ยนรูปอารมณ์"
                : language === "en"
                  ? "Upload Emotion Photo"
                  : "อัปโหลดรูปอารมณ์"}
          </span>
        </label>

        {!draft.image && (
          <span className="text-[11px] text-[#6B6A65]">
            {language === "en" ? "Image required" : "ต้องอัปรูปโปรไฟล์"}
          </span>
        )}
      </div>
    </div>
  );
}

interface PersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: AiPersona[];
  emotions: AiEmotion[];
  activePersonaId: string;
  isLoading: boolean;
  onCreatePersona: (input: {
    name: string;
    description: string;
    profileImage?: string;
    emotions?: EmotionDraft[];
    selectAfterCreate?: boolean;
  }) => Promise<string>;
  onUpdatePersona: (input: {
    personaId: string;
    name: string;
    description: string;
    profileImage?: string;
    emotions?: EmotionDraft[];
  }) => Promise<void>;
  onSaveEmotionsForPersona: (
    personaId: string,
    drafts: EmotionDraft[]
  ) => Promise<void>;
  onDeletePersona: (personaId: string) => Promise<void>;
  onSelectPersona: (personaId: string) => Promise<void>;
}

export function PersonaModal({
  isOpen,
  onClose,
  personas,
  emotions,
  activePersonaId,
  isLoading,
  onCreatePersona,
  onUpdatePersona,
  onSaveEmotionsForPersona,
  onDeletePersona,
  onSelectPersona,
}: PersonaModalProps) {
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const backdropMouseDownRef = useRef<boolean>(false);

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState<string>("");
  const [descriptionInput, setDescriptionInput] = useState<string>("");
  const [profileImageInput, setProfileImageInput] = useState<string>("");
  const [emotionDrafts, setEmotionDrafts] = useState<EmotionDraftRowState[]>([]);
  const [processingEmotionKeys, setProcessingEmotionKeys] = useState<
    Record<string, boolean>
  >({});
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [isDraggingProfile, setIsDraggingProfile] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Inline AI emotions editor shared by Default ("default") and custom personas
  const [editingEmotionsPersonaId, setEditingEmotionsPersonaId] = useState<
    string | null
  >(null);
  const [inlineEmotionDrafts, setInlineEmotionDrafts] = useState<
    EmotionDraftRowState[]
  >([]);
  const [isSavingInlineEmotions, setIsSavingInlineEmotions] =
    useState<boolean>(false);
  const [inlineEmotionError, setInlineEmotionError] = useState<string>("");

  const defaultEmotions = useMemo(
    () => emotions.filter((e) => e.personaId === DEFAULT_PERSONA_KEY),
    [emotions]
  );

  const isProcessingAnyEmotion = useMemo(
    () => Object.values(processingEmotionKeys).some(Boolean),
    [processingEmotionKeys]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleEmotionProcessingChange = (
    localKey: string,
    isProcessing: boolean
  ) => {
    setProcessingEmotionKeys((prev) => {
      if (!isProcessing) {
        if (!(localKey in prev)) return prev;
        const next = { ...prev };
        delete next[localKey];
        return next;
      }
      return { ...prev, [localKey]: true };
    });
  };

  const validateEmotionDrafts = (rows: EmotionDraftRowState[]): string | null => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.label.trim()) {
        return language === "en"
          ? `Please enter a name for emotion #${i + 1}.`
          : `กรุณาระบุชื่ออารมณ์ที่ ${i + 1}`;
      }
      if (!row.image) {
        return language === "en"
          ? `Please upload a profile image for emotion "${row.label.trim()}".`
          : `กรุณาอัปโหลดรูปโปรไฟล์สำหรับอารมณ์ "${row.label.trim()}"`;
      }
    }
    return null;
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingPersonaId(null);
    setNameInput("");
    setDescriptionInput("");
    setProfileImageInput("");
    setEmotionDrafts([]);
    setProcessingEmotionKeys({});
    setErrorMsg("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const closeInlineEmotions = () => {
    setEditingEmotionsPersonaId(null);
    setInlineEmotionDrafts([]);
    setInlineEmotionError("");
    setProcessingEmotionKeys({});
  };

  const scrollToTopForm = () => {
    requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleOpenAddForm = () => {
    closeInlineEmotions();
    setEditingPersonaId(null);
    setNameInput("");
    setDescriptionInput("");
    setProfileImageInput("");
    setEmotionDrafts([]);
    setProcessingEmotionKeys({});
    setErrorMsg("");
    setIsFormOpen(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    scrollToTopForm();
  };

  const handleOpenEditForm = (persona: AiPersona) => {
    closeInlineEmotions();
    setEditingPersonaId(persona.id);
    setNameInput(persona.name);
    setDescriptionInput(persona.description);
    setProfileImageInput(persona.profileImage || "");
    const personaEmotions = emotions.filter((e) => e.personaId === persona.id);
    setEmotionDrafts(toDraftRows(personaEmotions));
    setProcessingEmotionKeys({});
    setErrorMsg("");
    setConfirmDeleteId(null);
    setIsFormOpen(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    scrollToTopForm();
  };

  const handleToggleInlineEmotions = (targetPersonaId: string) => {
    if (editingEmotionsPersonaId === targetPersonaId) {
      closeInlineEmotions();
      return;
    }
    resetForm();
    const targetEmotions = emotions.filter(
      (e) => e.personaId === targetPersonaId
    );
    setInlineEmotionDrafts(toDraftRows(targetEmotions));
    setInlineEmotionError("");
    setConfirmDeleteId(null);
    setEditingEmotionsPersonaId(targetPersonaId);
  };

  const handleAddPersonaEmotionRow = () => {
    setErrorMsg("");
    setEmotionDrafts((prev) => [
      ...prev,
      { localKey: makeLocalEmotionKey(), label: "", image: "" },
    ]);
  };

  const handleAddInlineEmotionRow = () => {
    setInlineEmotionError("");
    setInlineEmotionDrafts((prev) => [
      ...prev,
      { localKey: makeLocalEmotionKey(), label: "", image: "" },
    ]);
  };

  const handleSaveInlineEmotions = async (
    e: React.FormEvent,
    targetPersonaId: string
  ) => {
    e.preventDefault();
    const validationErr = validateEmotionDrafts(inlineEmotionDrafts);
    if (validationErr) {
      setInlineEmotionError(validationErr);
      return;
    }

    setIsSavingInlineEmotions(true);
    setInlineEmotionError("");
    try {
      await onSaveEmotionsForPersona(
        targetPersonaId,
        inlineEmotionDrafts.map(({ id, label, image }) => ({
          id,
          label: label.trim(),
          image,
        }))
      );
      closeInlineEmotions();
    } catch {
      setInlineEmotionError(
        language === "en"
          ? "Unable to save emotions. Please try again."
          : "ไม่สามารถบันทึกอารมณ์ได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setIsSavingInlineEmotions(false);
    }
  };

  const processProfileFile = async (file: File | undefined) => {
    if (!file) return;

    setIsProcessingImage(true);
    setErrorMsg("");

    try {
      const compressedDataUrl = await processPersonaAvatarFile(file);
      setProfileImageInput(compressedDataUrl);
    } catch (err: any) {
      const code = String(err?.message || "");
      if (code === "INVALID_IMAGE_TYPE") {
        setErrorMsg(
          language === "en"
            ? "Please choose a valid image file (JPG, PNG, or WebP)."
            : "กรุณาเลือกไฟล์รูปภาพที่รองรับ (JPG, PNG หรือ WebP)"
        );
      } else if (code === "IMAGE_TOO_LARGE") {
        setErrorMsg(
          language === "en"
            ? "Image file is too large. Please select an image under 25 MB."
            : "ไฟล์รูปภาพมีขนาดใหญ่เกินไป กรุณาเลือกรูปที่มีขนาดไม่เกิน 25 MB"
        );
      } else {
        setErrorMsg(
          language === "en"
            ? "Could not process this image. Please try another photo."
            : "ไม่สามารถประมวลผลรูปภาพนี้ได้ กรุณาลองเลือกรูปอื่น"
        );
      }
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset synchronously before async work so re-selecting the same photo always triggers onChange
    e.target.value = "";
    if (!file) return;
    void processProfileFile(file);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim();
    const cleanDesc = descriptionInput.trim();

    if (!cleanName) {
      setErrorMsg(
        language === "en"
          ? "Please enter a persona name."
          : "กรุณากรอกชื่อบุคลิก"
      );
      return;
    }

    if (!cleanDesc) {
      setErrorMsg(
        language === "en"
          ? "Please enter a short personality description."
          : "กรุณากรอกคำอธิบายนิสัยหรือสไตล์การสอน"
      );
      return;
    }

    const emotionValidationErr = validateEmotionDrafts(emotionDrafts);
    if (emotionValidationErr) {
      setErrorMsg(emotionValidationErr);
      return;
    }

    setIsSaving(true);
    setErrorMsg("");

    const cleanedEmotions: EmotionDraft[] = emotionDrafts.map(
      ({ id, label, image }) => ({
        id,
        label: label.trim(),
        image,
      })
    );

    try {
      if (editingPersonaId) {
        await onUpdatePersona({
          personaId: editingPersonaId,
          name: cleanName,
          description: cleanDesc,
          profileImage: profileImageInput,
          emotions: cleanedEmotions,
        });
      } else {
        await onCreatePersona({
          name: cleanName,
          description: cleanDesc,
          profileImage: profileImageInput,
          emotions: cleanedEmotions,
          selectAfterCreate: true,
        });
      }
      resetForm();
    } catch {
      setErrorMsg(
        language === "en"
          ? "Unable to save persona. Please try again."
          : "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async (personaId: string) => {
    setDeletingId(personaId);
    try {
      await onDeletePersona(personaId);
      setConfirmDeleteId(null);
      if (editingPersonaId === personaId) {
        resetForm();
      }
    } catch {
      setErrorMsg(
        language === "en"
          ? "Unable to delete persona. Please try again."
          : "ไม่สามารถลบบุคลิกได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleClose = () => {
    resetForm();
    closeInlineEmotions();
    setConfirmDeleteId(null);
    onClose();
  };

  const renderInlineEmotionsEditor = (
    targetPersonaId: string,
    titleText: string
  ) => (
    <form
      onSubmit={(e) => handleSaveInlineEmotions(e, targetPersonaId)}
      className="mt-3 pt-3 border-t border-[#ECEAE3] space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#1F1E1D]">{titleText}</span>
        <button
          type="button"
          onClick={handleAddInlineEmotionRow}
          disabled={isSavingInlineEmotions}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DFDDD6] bg-white hover:bg-[#EFECE4] text-xs font-medium text-[#1F1E1D] transition-colors cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{language === "en" ? "Add Emotion" : "เพิ่มอารมณ์"}</span>
        </button>
      </div>

      {inlineEmotionDrafts.length === 0 ? (
        <p className="text-xs text-[#6B6A65] py-2">
          {language === "en"
            ? "No emotions yet. Click Add Emotion to create one."
            : "ยังไม่มีอารมณ์ กด เพิ่มอารมณ์ เพื่อสร้างชื่ออารมณ์และอัปรูปโปรไฟล์"}
        </p>
      ) : (
        <div className="space-y-2">
          {inlineEmotionDrafts.map((draft, idx) => (
            <EmotionDraftRow
              key={draft.localKey}
              draft={draft}
              index={idx}
              language={language}
              disabled={isSavingInlineEmotions}
              onPatch={(localKey, patch) =>
                setInlineEmotionDrafts((prev) =>
                  prev.map((item) =>
                    item.localKey === localKey ? { ...item, ...patch } : item
                  )
                )
              }
              onRemove={() => {
                handleEmotionProcessingChange(draft.localKey, false);
                setInlineEmotionDrafts((prev) =>
                  prev.filter((item) => item.localKey !== draft.localKey)
                );
              }}
              onProcessingChange={handleEmotionProcessingChange}
              onError={setInlineEmotionError}
            />
          ))}
        </div>
      )}

      {inlineEmotionError && (
        <p className="text-xs text-[#1F1E1D] bg-[#EFECE4] border border-[#E5E3DC] px-3 py-2 rounded-xl">
          {inlineEmotionError}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={closeInlineEmotions}
          disabled={isSavingInlineEmotions}
          className="px-3 py-1.5 rounded-xl border border-[#DFDDD6] bg-white hover:bg-[#EFECE4] text-xs font-medium text-[#1F1E1D] transition-colors cursor-pointer"
        >
          {language === "en" ? "Cancel" : "ยกเลิก"}
        </button>
        <button
          type="submit"
          disabled={isSavingInlineEmotions || isProcessingAnyEmotion}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] disabled:bg-[#DFDDD6] disabled:text-[#8C8A84] text-white text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isSavingInlineEmotions && (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          )}
          <span>{language === "en" ? "Save Emotions" : "บันทึกอารมณ์"}</span>
        </button>
      </div>
    </form>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1E1D]/30 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && backdropMouseDownRef.current) {
          handleClose();
        }
      }}
    >
      <div
        className="bg-[#FAF9F5] rounded-2xl border border-[#E5E3DC] shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="persona-modal-title"
      >
        {/* Modal Header with "เพิ่มบุคลิก" action */}
        <div className="px-5 py-4 border-b border-[#E5E3DC] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="persona-modal-title"
              className="text-base font-semibold text-[#1F1E1D]"
            >
              {language === "en" ? "Personas" : "บุคลิก"}
            </h3>
            <p className="text-xs text-[#6B6A65] mt-0.5">
              {language === "en"
                ? "Customize personality, speaking style, and emotion photos"
                : "กำหนดนิสัย น้ำเสียง รูปโปรไฟล์ และการแสดงอารมณ์ของเอไอ"}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="persona-add-open-btn"
              onClick={handleOpenAddForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === "en" ? "Add Persona" : "เพิ่มบุคลิก"}</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer"
              aria-label={language === "en" ? "Close" : "ปิด"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div ref={scrollContainerRef} className="overflow-y-auto flex-1">
          {/* Top Section: Inline Create / Edit Form when open */}
          {isFormOpen && (
            <form
              onSubmit={handleSubmitForm}
              className="p-5 space-y-4 bg-[#F5F3EC]"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[#1F1E1D]">
                  {editingPersonaId
                    ? language === "en"
                      ? "Edit Persona"
                      : "แก้ไขบุคลิก"
                    : language === "en"
                      ? "New Persona"
                      : "สร้างบุคลิกใหม่"}
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-[#6B6A65] hover:text-[#1F1E1D] cursor-pointer"
                >
                  {language === "en" ? "Cancel" : "ยกเลิก"}
                </button>
              </div>

              {/* Profile Photo Upload (White circle by default when no image uploaded) */}
              <div
                className={`space-y-1.5 rounded-xl p-2 -m-2 transition-colors ${
                  isDraggingProfile ? "bg-[#EFECE4]/70" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isProcessingImage && !isSaving) setIsDraggingProfile(true);
                }}
                onDragLeave={() => setIsDraggingProfile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingProfile(false);
                  if (isProcessingImage || isSaving) return;
                  const file = e.dataTransfer.files?.[0];
                  if (file) void processProfileFile(file);
                }}
              >
                <span className="block text-xs font-medium text-[#1F1E1D]">
                  {language === "en" ? "Profile Photo" : "รูปโปรไฟล์"}
                </span>
                <div className="flex items-center gap-3.5">
                  <label
                    htmlFor={
                      isProcessingImage || isSaving
                        ? undefined
                        : "persona-photo-upload-input"
                    }
                    className={`relative rounded-full focus:outline-none shrink-0 ${
                      isProcessingImage || isSaving
                        ? "opacity-60 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    aria-label={
                      language === "en"
                        ? "Upload profile photo"
                        : "อัปโหลดรูปโปรไฟล์"
                    }
                  >
                    <PersonaAvatar
                      profileImage={profileImageInput}
                      alt={nameInput || "Persona"}
                      sizeClass="w-14 h-14"
                    />
                    {isProcessingImage && (
                      <span className="absolute inset-0 rounded-full bg-[#FAF9F5]/80 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-[#1F1E1D]" />
                      </span>
                    )}
                  </label>

                  <input
                    ref={fileInputRef}
                    id="persona-photo-upload-input"
                    type="file"
                    accept="image/*"
                    disabled={isProcessingImage || isSaving}
                    onChange={handleFileChange}
                    className="sr-only"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor={
                        isProcessingImage || isSaving
                          ? undefined
                          : "persona-photo-upload-input"
                      }
                      id="persona-photo-upload-btn"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DFDDD6] bg-white hover:bg-[#EFECE4] text-xs font-medium text-[#1F1E1D] transition-colors ${
                        isProcessingImage || isSaving
                          ? "opacity-50 cursor-not-allowed pointer-events-none"
                          : "cursor-pointer"
                      }`}
                    >
                      {isProcessingImage ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isProcessingImage
                          ? language === "en"
                            ? "Processing..."
                            : "กำลังประมวลผล..."
                          : profileImageInput
                            ? language === "en"
                              ? "Change Photo"
                              : "เปลี่ยนรูปโปรไฟล์"
                            : language === "en"
                              ? "Upload Photo"
                              : "อัปโหลดรูปโปรไฟล์"}
                      </span>
                    </label>

                    {profileImageInput && (
                      <button
                        type="button"
                        onClick={() => setProfileImageInput("")}
                        disabled={isProcessingImage || isSaving}
                        className="px-3 py-1.5 rounded-xl border border-[#DFDDD6] bg-white hover:bg-[#EFECE4] text-xs font-medium text-[#6B6A65] hover:text-[#1F1E1D] transition-colors cursor-pointer"
                      >
                        {language === "en" ? "Remove" : "ลบรูป"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Persona Name Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="persona-name-input"
                  className="block text-xs font-medium text-[#1F1E1D]"
                >
                  {language === "en" ? "Name" : "ชื่อบุคลิก"}
                </label>
                <input
                  id="persona-name-input"
                  type="text"
                  maxLength={MAX_PERSONA_NAME_LENGTH}
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setErrorMsg("");
                  }}
                  placeholder={
                    language === "en"
                      ? "e.g., Strict Math Professor"
                      : "เช่น อาจารย์คณิตสายเข้ม"
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-[#DFDDD6] bg-white text-[#1F1E1D] text-[16px] placeholder:text-[#8C8A84] focus:outline-none focus:border-[#1F1E1D] transition-colors"
                  disabled={isSaving}
                />
              </div>

              {/* Persona Behavior Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="persona-description-input"
                    className="block text-xs font-medium text-[#1F1E1D]"
                  >
                    {language === "en"
                      ? "Personality & Teaching Style"
                      : "นิสัยและคำอธิบายสไตล์การสอน"}
                  </label>
                  <span className="text-[11px] text-[#6B6A65] tabular-nums">
                    {descriptionInput.length.toLocaleString()} /{" "}
                    {MAX_PERSONA_DESCRIPTION_LENGTH.toLocaleString()}
                  </span>
                </div>
                <textarea
                  id="persona-description-input"
                  rows={6}
                  maxLength={MAX_PERSONA_DESCRIPTION_LENGTH}
                  value={descriptionInput}
                  onChange={(e) => {
                    setDescriptionInput(e.target.value);
                    setErrorMsg("");
                  }}
                  placeholder={
                    language === "en"
                      ? "Paste or describe personality traits, tone, and teaching instructions..."
                      : "วางหรืออธิบายนิสัย ตัวตน น้ำเสียง และสไตล์การสอนของเอไอ..."
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFDDD6] bg-white text-[#1F1E1D] text-[16px] leading-relaxed placeholder:text-[#8C8A84] focus:outline-none focus:border-[#1F1E1D] transition-colors resize-y min-h-[140px] max-h-[340px] overflow-y-auto"
                  disabled={isSaving}
                />
              </div>

              {/* Unlimited Custom AI Emotion Expressions */}
              <div className="space-y-2 pt-1 border-t border-[#E5E3DC]">
                <div className="flex items-center justify-between gap-2 pt-2">
                  <div>
                    <span className="block text-xs font-medium text-[#1F1E1D]">
                      {language === "en"
                        ? "AI Emotion Expressions"
                        : "การแสดงอารมณ์ของเอไอ"}
                    </span>
                    <span className="block text-[11px] text-[#6B6A65]">
                      {language === "en"
                        ? "Add any number of emotions with a custom profile image"
                        : "เพิ่มได้ไม่จำกัดจำนวน พร้อมระบุชื่ออารมณ์และรูปโปรไฟล์ตอนตอบ"}
                    </span>
                  </div>

                  <button
                    type="button"
                    id="persona-add-emotion-btn"
                    onClick={handleAddPersonaEmotionRow}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#DFDDD6] bg-white hover:bg-[#EFECE4] text-xs font-medium text-[#1F1E1D] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {language === "en" ? "Add Emotion" : "เพิ่มอารมณ์"}
                    </span>
                  </button>
                </div>

                {emotionDrafts.length > 0 && (
                  <div className="space-y-2">
                    {emotionDrafts.map((draft, idx) => (
                      <EmotionDraftRow
                        key={draft.localKey}
                        draft={draft}
                        index={idx}
                        language={language}
                        disabled={isSaving}
                        onPatch={(localKey, patch) =>
                          setEmotionDrafts((prev) =>
                            prev.map((item) =>
                              item.localKey === localKey
                                ? { ...item, ...patch }
                                : item
                            )
                          )
                        }
                        onRemove={() => {
                          handleEmotionProcessingChange(draft.localKey, false);
                          setEmotionDrafts((prev) =>
                            prev.filter(
                              (item) => item.localKey !== draft.localKey
                            )
                          );
                        }}
                        onProcessingChange={handleEmotionProcessingChange}
                        onError={setErrorMsg}
                      />
                    ))}
                  </div>
                )}
              </div>

              {errorMsg && (
                <p className="text-xs text-[#1F1E1D] bg-[#EFECE4] border border-[#E5E3DC] px-3 py-2 rounded-xl">
                  {errorMsg}
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-2 rounded-xl border border-[#DFDDD6] bg-white hover:bg-[#EFECE4] text-xs font-medium text-[#1F1E1D] transition-colors cursor-pointer"
                >
                  {language === "en" ? "Cancel" : "ยกเลิก"}
                </button>
                <button
                  type="submit"
                  id="persona-save-btn"
                  disabled={
                    isSaving ||
                    isProcessingImage ||
                    isProcessingAnyEmotion ||
                    !nameInput.trim() ||
                    !descriptionInput.trim()
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1F1E1D] hover:bg-[#33322F] disabled:bg-[#DFDDD6] disabled:text-[#8C8A84] text-white text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {editingPersonaId
                      ? language === "en"
                        ? "Save Changes"
                        : "บันทึกการแก้ไข"
                      : language === "en"
                        ? "Save Persona"
                        : "บันทึกบุคลิก"}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Horizontal Divider Line separating Add header/form from saved personas */}
          <div className="border-t border-[#E5E3DC]" />

          {/* Saved Personas List Below Divider */}
          <div className="p-5 space-y-2.5">
            {errorMsg && !isFormOpen && (
              <p className="text-xs text-[#1F1E1D] bg-[#EFECE4] border border-[#E5E3DC] px-3 py-2 rounded-xl">
                {errorMsg}
              </p>
            )}

            {/* Default AI Emotion Settings Card (works even without custom personas) */}
            <div
              className={`rounded-xl border p-3.5 transition-colors ${
                !activePersonaId
                  ? "bg-[#EFECE4]/80 border-[#1F1E1D]/40"
                  : "bg-white border-[#E5E3DC]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <PersonaAvatar
                    profileImage=""
                    alt={language === "en" ? "Default AI" : "เริ่มต้น"}
                    sizeClass="w-10 h-10"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[#1F1E1D]">
                        {language === "en" ? "Default" : "เริ่มต้น"}
                      </span>
                      {!activePersonaId && (
                        <span className="text-[11px] font-medium text-[#1F1E1D] bg-white border border-[#DFDDD6] px-2 py-0.5 rounded-md">
                          {language === "en" ? "Active" : "กำลังใช้"}
                        </span>
                      )}
                      {defaultEmotions.length > 0 && (
                        <span className="text-[11px] text-[#6B6A65]">
                          {language === "en"
                            ? `${defaultEmotions.length} emotions`
                            : `${defaultEmotions.length} อารมณ์`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B6A65] mt-0.5">
                      {language === "en"
                        ? "Configure unlimited emotion photos for the default AI"
                        : "ตั้งค่าอารมณ์และรูปโปรไฟล์ของเอไอเริ่มต้นได้ไม่จำกัด"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="default-emotions-toggle-btn"
                  onClick={() => handleToggleInlineEmotions(DEFAULT_PERSONA_KEY)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#DFDDD6] bg-white hover:bg-[#EFECE4] text-xs font-medium text-[#1F1E1D] transition-colors cursor-pointer shrink-0"
                >
                  <Smile className="w-3.5 h-3.5" />
                  <span>
                    {editingEmotionsPersonaId === DEFAULT_PERSONA_KEY
                      ? language === "en"
                        ? "Close"
                        : "ปิด"
                      : language === "en"
                        ? "Emotions"
                        : "ตั้งค่าอารมณ์"}
                  </span>
                </button>
              </div>

              {editingEmotionsPersonaId === DEFAULT_PERSONA_KEY &&
                renderInlineEmotionsEditor(
                  DEFAULT_PERSONA_KEY,
                  language === "en"
                    ? "Default AI Emotions"
                    : "รายการอารมณ์ของเอไอเริ่มต้น"
                )}
            </div>

            {isLoading ? (
              <div className="py-8 flex items-center justify-center text-[#6B6A65]">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : personas.length === 0 ? (
              <div className="py-6 text-center space-y-1.5">
                <p className="text-sm font-medium text-[#1F1E1D]">
                  {language === "en"
                    ? "No custom personas yet"
                    : "ยังไม่มีบุคลิกที่สร้างเอง"}
                </p>
                <p className="text-xs text-[#6B6A65]">
                  {language === "en"
                    ? "Click Add Persona above to create your own custom AI."
                    : "กดปุ่ม เพิ่มบุคลิก ด้านบนเพื่อสร้างบุคลิกและอารมณ์ของคุณเอง"}
                </p>
              </div>
            ) : (
              personas.map((persona) => {
                const isSelected = activePersonaId === persona.id;
                const isConfirmingDelete = confirmDeleteId === persona.id;
                const isDeletingThis = deletingId === persona.id;
                const personaEmotions = emotions.filter(
                  (e) => e.personaId === persona.id
                );

                return (
                  <div
                    key={persona.id}
                    className={`rounded-xl border p-3.5 transition-colors ${
                      isSelected
                        ? "bg-[#EFECE4]/80 border-[#1F1E1D]/40"
                        : "bg-white border-[#E5E3DC]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Circular Profile (White by default, or uploaded photo) */}
                      <button
                        type="button"
                        onClick={() => onSelectPersona(persona.id)}
                        className="rounded-full shrink-0 cursor-pointer"
                        title={
                          language === "en"
                            ? "Use this persona"
                            : "เลือกใช้บุคลิกนี้"
                        }
                      >
                        <PersonaAvatar
                          profileImage={persona.profileImage}
                          alt={persona.name}
                          sizeClass="w-10 h-10"
                        />
                      </button>

                      {/* Name & Short Description */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => onSelectPersona(persona.id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[#1F1E1D] truncate">
                            {persona.name}
                          </span>
                          {isSelected && (
                            <span className="text-[11px] font-medium text-[#1F1E1D] bg-white border border-[#DFDDD6] px-2 py-0.5 rounded-md">
                              {language === "en" ? "Active" : "กำลังใช้"}
                            </span>
                          )}
                          {personaEmotions.length > 0 && (
                            <span className="text-[11px] text-[#6B6A65]">
                              {language === "en"
                                ? `${personaEmotions.length} emotions`
                                : `${personaEmotions.length} อารมณ์`}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B6A65] mt-1 leading-relaxed break-words whitespace-pre-wrap max-h-44 overflow-y-auto">
                          {persona.description}
                        </p>
                      </div>
                    </div>

                    {/* Monochrome Emotions, Edit & Delete Controls */}
                    <div className="mt-3 pt-2.5 border-t border-[#ECEAE3] flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onSelectPersona(isSelected ? "" : persona.id)
                        }
                        className="text-xs font-medium text-[#6B6A65] hover:text-[#1F1E1D] transition-colors cursor-pointer"
                      >
                        {isSelected
                          ? language === "en"
                            ? "Switch to Default"
                            : "สลับเป็นเริ่มต้น"
                          : language === "en"
                            ? "Select"
                            : "เลือกใช้งาน"}
                      </button>

                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isDeletingThis}
                            className="px-2.5 py-1 rounded-lg border border-[#DFDDD6] bg-white hover:bg-[#EFECE4] text-xs font-medium text-[#6B6A65] transition-colors cursor-pointer"
                          >
                            {language === "en" ? "Cancel" : "ยกเลิก"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(persona.id)}
                            disabled={isDeletingThis}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1F1E1D] hover:bg-[#33322F] text-white text-xs font-medium transition-colors cursor-pointer"
                          >
                            {isDeletingThis && (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                            <span>
                              {language === "en" ? "Confirm" : "ยืนยันลบ"}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleInlineEmotions(persona.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer"
                          >
                            <Smile className="w-3.5 h-3.5" />
                            <span>
                              {editingEmotionsPersonaId === persona.id
                                ? language === "en"
                                  ? "Close Emotions"
                                  : "ปิดอารมณ์"
                                : language === "en"
                                  ? "Emotions"
                                  : "ตั้งค่าอารมณ์"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(persona)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>
                              {language === "en" ? "Edit" : "แก้ไข"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(persona.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#6B6A65] hover:text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{language === "en" ? "Delete" : "ลบ"}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {editingEmotionsPersonaId === persona.id &&
                      renderInlineEmotionsEditor(
                        persona.id,
                        language === "en"
                          ? `Emotions for ${persona.name}`
                          : `รายการอารมณ์ของ ${persona.name}`
                      )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
