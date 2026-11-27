"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Plus, Pencil, Trash2, Loader2, Upload } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import {
  AiPersona,
  MAX_PERSONA_NAME_LENGTH,
  MAX_PERSONA_DESCRIPTION_LENGTH,
  processPersonaAvatarFile,
} from "@/lib/firestore-personas";
import { PersonaAvatar } from "@/components/PersonaAvatarIcon";

interface PersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: AiPersona[];
  activePersonaId: string;
  isLoading: boolean;
  onCreatePersona: (input: {
    name: string;
    description: string;
    profileImage?: string;
    selectAfterCreate?: boolean;
  }) => Promise<string>;
  onUpdatePersona: (input: {
    personaId: string;
    name: string;
    description: string;
    profileImage?: string;
  }) => Promise<void>;
  onDeletePersona: (personaId: string) => Promise<void>;
  onSelectPersona: (personaId: string) => Promise<void>;
}

export function PersonaModal({
  isOpen,
  onClose,
  personas,
  activePersonaId,
  isLoading,
  onCreatePersona,
  onUpdatePersona,
  onDeletePersona,
  onSelectPersona,
}: PersonaModalProps) {
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState<string>("");
  const [descriptionInput, setDescriptionInput] = useState<string>("");
  const [profileImageInput, setProfileImageInput] = useState<string>("");
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

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

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingPersonaId(null);
    setNameInput("");
    setDescriptionInput("");
    setProfileImageInput("");
    setErrorMsg("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenAddForm = () => {
    setEditingPersonaId(null);
    setNameInput("");
    setDescriptionInput("");
    setProfileImageInput("");
    setErrorMsg("");
    setIsFormOpen(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenEditForm = (persona: AiPersona) => {
    setEditingPersonaId(persona.id);
    setNameInput(persona.name);
    setDescriptionInput(persona.description);
    setProfileImageInput(persona.profileImage || "");
    setErrorMsg("");
    setConfirmDeleteId(null);
    setIsFormOpen(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
            ? "Image file is too large. Please select an image under 10 MB."
            : "ไฟล์รูปภาพมีขนาดใหญ่เกินไป กรุณาเลือกรูปที่มีขนาดไม่เกิน 10 MB"
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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

    setIsSaving(true);
    setErrorMsg("");

    try {
      if (editingPersonaId) {
        await onUpdatePersona({
          personaId: editingPersonaId,
          name: cleanName,
          description: cleanDesc,
          profileImage: profileImageInput,
        });
      } else {
        await onCreatePersona({
          name: cleanName,
          description: cleanDesc,
          profileImage: profileImageInput,
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
    setConfirmDeleteId(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1E1D]/30 backdrop-blur-[1px]"
      onClick={handleClose}
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
                ? "Customize how your AI teacher thinks, teaches, and speaks"
                : "กำหนดนิสัย น้ำเสียง และสไตล์การสอนของเอไอ (ครู)"}
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
        <div className="overflow-y-auto flex-1">
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
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-[#1F1E1D]">
                  {language === "en" ? "Profile Photo" : "รูปโปรไฟล์"}
                </span>
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingImage || isSaving}
                    className="rounded-full focus:outline-none cursor-pointer shrink-0"
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
                  </button>

                  <input
                    ref={fileInputRef}
                    id="persona-photo-upload-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      id="persona-photo-upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingImage || isSaving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DFDDD6] bg-white hover:bg-[#EFECE4] text-xs font-medium text-[#1F1E1D] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isProcessingImage ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {profileImageInput
                          ? language === "en"
                            ? "Change Photo"
                            : "เปลี่ยนรูปโปรไฟล์"
                          : language === "en"
                            ? "Upload Photo"
                            : "อัปโหลดรูปโปรไฟล์"}
                      </span>
                    </button>

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

            {isLoading ? (
              <div className="py-8 flex items-center justify-center text-[#6B6A65]">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : personas.length === 0 ? (
              <div className="py-8 text-center space-y-1.5">
                <p className="text-sm font-medium text-[#1F1E1D]">
                  {language === "en"
                    ? "Only the Default persona is active"
                    : "มีเฉพาะบุคลิกเริ่มต้นในขณะนี้"}
                </p>
                <p className="text-xs text-[#6B6A65]">
                  {language === "en"
                    ? "Click Add Persona above to create your own custom AI teacher."
                    : "กดปุ่ม เพิ่มบุคลิก ด้านบนเพื่อสร้างบุคลิกและอัปรูปโปรไฟล์ของคุณเอง"}
                </p>
              </div>
            ) : (
              personas.map((persona) => {
                const isSelected = activePersonaId === persona.id;
                const isConfirmingDelete = confirmDeleteId === persona.id;
                const isDeletingThis = deletingId === persona.id;

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
                        </div>
                        <p className="text-xs text-[#6B6A65] mt-1 leading-relaxed break-words whitespace-pre-wrap max-h-44 overflow-y-auto">
                          {persona.description}
                        </p>
                      </div>
                    </div>

                    {/* Monochrome Edit & Delete Controls */}
                    <div className="mt-3 pt-2.5 border-t border-[#ECEAE3] flex items-center justify-between gap-2">
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
                        <div className="flex items-center gap-1">
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
