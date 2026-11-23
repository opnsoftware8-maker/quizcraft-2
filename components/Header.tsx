"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Menu,
  X,
  Key,
  Globe,
  SquarePen,
  Search,
  MessageSquare,
  LogOut,
  UserCog,
  ChevronDown,
  Check,
  Pin,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "@/lib/language-context";
import { useFirebase } from "@/lib/firebase-context";
import { AiPersona } from "@/lib/firestore-personas";
import { PersonaAvatar } from "@/components/PersonaAvatarIcon";
import { SavedChatSession } from "@/lib/browser-chats";

export type AppPage = "chat" | "learn";

interface HeaderProps {
  activePage: AppPage;
  onChangePage: (page: AppPage) => void;
  onOpenApiKeyModal: () => void;
  onOpenPersonaModal: () => void;
  onOpenFeedback: () => void;
  onNewChat: () => void;
  personas: AiPersona[];
  activePersonaId: string;
  activePersona: AiPersona | null;
  onSelectPersona: (personaId: string) => Promise<void>;
  savedChats: SavedChatSession[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onTogglePinChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

export function Header({
  activePage,
  onChangePage,
  onOpenApiKeyModal,
  onOpenPersonaModal,
  onOpenFeedback,
  onNewChat,
  personas,
  activePersonaId,
  activePersona,
  onSelectPersona,
  savedChats,
  activeChatId,
  onSelectChat,
  onTogglePinChat,
  onDeleteChat,
}: HeaderProps) {
  const { language, toggleLanguage } = useLanguage();
  const { user, signOutUser } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const personaDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Body scroll lock while drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Outside click & Escape handler for persona switcher popover
  useEffect(() => {
    if (!isPersonaMenuOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (
        personaDropdownRef.current &&
        !personaDropdownRef.current.contains(e.target as Node)
      ) {
        setIsPersonaMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPersonaMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPersonaMenuOpen]);

  const topBarItemClass =
    "inline-flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg text-sm font-medium text-[#1F1E1D] hover:bg-[#F0EEE6] transition-colors cursor-pointer whitespace-nowrap shrink-0";

  const activePersonaLabel = activePersona
    ? activePersona.name
    : language === "en"
      ? "Default"
      : "เริ่มต้น";

  const handleChoosePersona = (personaId: string) => {
    setIsPersonaMenuOpen(false);
    onSelectPersona(personaId).catch((err) =>
      console.error("Failed to switch persona:", err)
    );
  };

  const filteredChats = useMemo(() => {
    const q = chatSearchQuery.trim().toLowerCase();
    if (!q) return savedChats;
    return savedChats.filter((chat) => {
      if (chat.title.toLowerCase().includes(q)) return true;
      return chat.messages.some((m) => m.content.toLowerCase().includes(q));
    });
  }, [chatSearchQuery, savedChats]);

  const pinnedChats = useMemo(
    () => filteredChats.filter((c) => c.isPinned),
    [filteredChats]
  );

  const unpinnedChats = useMemo(
    () => filteredChats.filter((c) => !c.isPinned),
    [filteredChats]
  );

  const renderChatRow = (chat: SavedChatSession) => {
    const isActive = chat.id === activeChatId;
    return (
      <div
        key={chat.id}
        className={`group flex items-center gap-1 rounded-xl px-2 py-1.5 transition-colors ${
          isActive ? "bg-[#EFECE4]" : "hover:bg-[#F0EEE6]"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            onSelectChat(chat.id);
          }}
          className="flex-1 min-w-0 text-left px-1.5 py-1 cursor-pointer"
        >
          <div className="text-sm font-medium text-[#1F1E1D] truncate">
            {chat.title}
          </div>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePinChat(chat.id);
            }}
            title={
              chat.isPinned
                ? language === "en"
                  ? "Unpin"
                  : "เลิกปักหมุด"
                : language === "en"
                  ? "Pin"
                  : "ปักหมุด"
            }
            aria-label={
              chat.isPinned
                ? language === "en"
                  ? "Unpin chat"
                  : "เลิกปักหมุดแชท"
                : language === "en"
                  ? "Pin chat"
                  : "ปักหมุดแชท"
            }
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              chat.isPinned
                ? "text-[#1F1E1D]"
                : "text-[#8C8A84] hover:text-[#1F1E1D]"
            }`}
          >
            <Pin
              className="w-3.5 h-3.5"
              fill={chat.isPinned ? "currentColor" : "none"}
            />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteChat(chat.id);
            }}
            title={language === "en" ? "Delete chat" : "ลบแชท"}
            aria-label={language === "en" ? "Delete chat" : "ลบแชท"}
            className="p-1.5 rounded-lg text-[#8C8A84] hover:text-[#1F1E1D] transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Top Bar: Hamburger + Quick New Chat + Language on left (+ Persona Switcher right underneath), Two-Page Capsule Toggle (Chat | Learn) on right */}
      <header className="w-full bg-[#FAF9F5]/95 backdrop-blur-xs sticky top-0 z-40 border-b border-[#ECEAE3]/70">
        <div className="w-full px-3 sm:px-5 pt-2 pb-2 flex items-start justify-between gap-2">
          {/* Top-left stack: [Hamburger + Quick New Chat + Language] on top, [Persona Switcher] directly underneath */}
          <div className="flex flex-col items-start gap-1 min-w-0">
            <div className="flex items-center gap-0.5 sm:gap-1.5">
              {/* Top-left Hamburger Menu Button */}
              <button
                type="button"
                id="header-hamburger-menu-btn"
                onClick={() => {
                  setIsPersonaMenuOpen(false);
                  setIsOpen((prev) => !prev);
                }}
                className={topBarItemClass}
                aria-label={isOpen ? "Close menu" : "Open menu"}
                aria-expanded={isOpen}
              >
                <Menu className="w-4 h-4 text-[#1F1E1D] shrink-0" />
              </button>

              {/* Quick New Chat Note Icon Button (matches reference header) */}
              <button
                type="button"
                id="header-new-chat-btn"
                onClick={() => {
                  setIsPersonaMenuOpen(false);
                  setIsOpen(false);
                  onNewChat();
                }}
                className={topBarItemClass}
                aria-label={language === "en" ? "New chat" : "แชทใหม่"}
                title={language === "en" ? "New chat" : "แชทใหม่"}
              >
                <SquarePen className="w-4 h-4 text-[#1F1E1D] shrink-0" />
              </button>

              {/* EN/TH Switcher */}
              <button
                type="button"
                id="header-lang-btn"
                onClick={toggleLanguage}
                className={topBarItemClass}
              >
                <Globe className="w-4 h-4 text-[#1F1E1D] shrink-0" />
                <span>{language === "en" ? "EN / TH" : "TH / EN"}</span>
              </button>
            </div>

            {/* Top-left Persona Model Switcher underneath Hamburger & Language */}
            <div className="relative pl-1" ref={personaDropdownRef}>
              <button
                type="button"
                id="header-persona-switcher-btn"
                onClick={() => setIsPersonaMenuOpen((prev) => !prev)}
                aria-expanded={isPersonaMenuOpen}
                aria-haspopup="listbox"
                className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border border-[#E2DFD7] bg-white hover:bg-[#F0EEE6] text-xs font-medium text-[#1F1E1D] transition-colors cursor-pointer max-w-[220px] sm:max-w-[270px]"
              >
                <PersonaAvatar
                  profileImage={activePersona?.profileImage}
                  alt={activePersonaLabel}
                  sizeClass="w-5 h-5"
                />
                <span className="truncate">{activePersonaLabel}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#6B6A65] shrink-0 transition-transform duration-150 ${
                    isPersonaMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Monochrome Persona Dropdown Switcher */}
              <AnimatePresence>
                {isPersonaMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.14 }}
                    role="listbox"
                    aria-label={
                      language === "en"
                        ? "AI Teacher Personas"
                        : "เลือกบุคลิกเอไอ (ครู)"
                    }
                    className="absolute left-0 mt-1.5 w-[calc(100vw-2rem)] sm:w-80 bg-[#FAF9F5] border border-[#E5E3DC] rounded-2xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="px-3.5 py-2.5 border-b border-[#ECEAE3] flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1F1E1D]">
                        {language === "en"
                          ? "AI Teacher Persona"
                          : "เลือกบุคลิกเอไอ (ครู)"}
                      </span>
                      <span className="text-[11px] text-[#6B6A65]">
                        {1 + personas.length}{" "}
                        {language === "en" ? "available" : "ตัวเลือก"}
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
                      {/* Default Option (Clean White Profile Circle) */}
                      <button
                        type="button"
                        role="option"
                        aria-selected={!activePersona}
                        onClick={() => handleChoosePersona("")}
                        className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                          !activePersona
                            ? "bg-[#EFECE4] border border-[#DFDDD6]"
                            : "hover:bg-[#F0EEE6] border border-transparent"
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">
                          <PersonaAvatar
                            alt={language === "en" ? "Default" : "เริ่มต้น"}
                            sizeClass="w-8 h-8"
                          />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#1F1E1D] truncate">
                              {language === "en" ? "Default" : "เริ่มต้น"}
                            </span>
                            {!activePersona && (
                              <Check className="w-3.5 h-3.5 text-[#1F1E1D] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#6B6A65] leading-snug mt-0.5">
                            {language === "en"
                              ? "Standard AI tutor with clear, balanced, step-by-step explanations."
                              : "เอไอครูมาตรฐาน ตอบชัดเจน สุภาพ อธิบายเป็นขั้นตอนเข้าใจง่าย"}
                          </p>
                        </div>
                      </button>

                      {/* User Personas from Cloud Firestore */}
                      {personas.map((persona) => {
                        const isSelected = activePersonaId === persona.id;
                        return (
                          <button
                            key={persona.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleChoosePersona(persona.id)}
                            className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-[#EFECE4] border border-[#DFDDD6]"
                                : "hover:bg-[#F0EEE6] border border-transparent"
                            }`}
                          >
                            <span className="mt-0.5 shrink-0">
                              <PersonaAvatar
                                profileImage={persona.profileImage}
                                alt={persona.name}
                                sizeClass="w-8 h-8"
                              />
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[#1F1E1D] truncate">
                                  {persona.name}
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-[#1F1E1D] shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-[#6B6A65] leading-snug mt-0.5 line-clamp-2">
                                {persona.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-2 border-t border-[#ECEAE3] bg-[#F5F3EC]">
                      <button
                        type="button"
                        id="dropdown-manage-personas-btn"
                        onClick={() => {
                          setIsPersonaMenuOpen(false);
                          onOpenPersonaModal();
                        }}
                        className="w-full py-1.5 px-3 rounded-xl text-xs font-medium text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        <span>
                          {language === "en"
                            ? "Manage / Add Personas"
                            : "จัดการ / เพิ่มบุคลิก"}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Two-Sided Capsule Switcher: Chat (Left) | Learn (Right) */}
          <div
            role="tablist"
            aria-label={language === "en" ? "Workspace mode" : "โหมดหน้าหลัก"}
            className="inline-flex items-center rounded-full bg-[#EFECE4] p-1 border border-[#E2DFD7] shrink-0 mt-0.5"
          >
            <button
              type="button"
              role="tab"
              id="capsule-tab-chat"
              aria-selected={activePage === "chat"}
              onClick={() => onChangePage("chat")}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activePage === "chat"
                  ? "bg-[#1F1E1D] text-white shadow-2xs"
                  : "text-[#6B6A65] hover:text-[#1F1E1D]"
              }`}
            >
              {language === "en" ? "Chat" : "แชท"}
            </button>

            <button
              type="button"
              role="tab"
              id="capsule-tab-learn"
              aria-selected={activePage === "learn"}
              onClick={() => onChangePage("learn")}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activePage === "learn"
                  ? "bg-[#1F1E1D] text-white shadow-2xs"
                  : "text-[#6B6A65] hover:text-[#1F1E1D]"
              }`}
            >
              {language === "en" ? "Learn" : "เรียนรู้"}
            </button>
          </div>
        </div>
      </header>

      {/* Left Slide-Out Sidebar Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-[#1F1E1D]/30 backdrop-blur-[1px]"
            />

            {/* Drawer sliding out from LEFT */}
            <div className="fixed inset-y-0 left-0 max-w-full flex pr-10">
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="w-72 sm:w-80 bg-[#FAF9F5] border-r border-[#E7E5DE] shadow-2xl flex flex-col h-full"
                aria-label={language === "en" ? "Sidebar navigation" : "เมนูนำทาง"}
              >
                {/* Sidebar Header */}
                <div className="px-4 h-14 flex items-center justify-between border-b border-[#ECEAE3] shrink-0">
                  <span className="text-sm font-semibold text-[#1F1E1D]">
                    {language === "en" ? "Menu" : "เมนู"}
                  </span>
                  <button
                    type="button"
                    id="sidebar-close-btn"
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg text-[#1F1E1D] hover:bg-[#F0EEE6] transition-colors cursor-pointer"
                    aria-label={language === "en" ? "Close sidebar" : "ปิดเมนู"}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Top Fixed Actions: New Chat & Search Chats Input */}
                <div className="p-3 pb-2 space-y-2 border-b border-[#ECEAE3] shrink-0">
                  <button
                    type="button"
                    id="sidebar-new-chat-btn"
                    onClick={() => {
                      setIsOpen(false);
                      onNewChat();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium text-[#1F1E1D] hover:bg-[#F0EEE6] transition-colors cursor-pointer text-left"
                  >
                    <SquarePen className="w-4 h-4 text-[#1F1E1D] shrink-0" />
                    <span>{language === "en" ? "New chat" : "แชทใหม่"}</span>
                  </button>

                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-[#6B6A65] absolute left-3 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      id="sidebar-search-chats-input"
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      placeholder={
                        language === "en" ? "Search chats..." : "ค้นหาแชท..."
                      }
                      className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-[#E5E3DC] focus:border-[#1F1E1D] outline-hidden text-[16px] sm:text-sm text-[#1F1E1D] placeholder:text-[#8C8A84]"
                    />
                    {chatSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setChatSearchQuery("")}
                        aria-label={language === "en" ? "Clear search" : "ล้างคำค้นหา"}
                        className="absolute right-2 p-1 rounded-md text-[#6B6A65] hover:text-[#1F1E1D] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrollable Saved Browser Chats Section */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {filteredChats.length === 0 ? (
                    <div className="py-6 px-3 text-center text-xs text-[#6B6A65]">
                      {chatSearchQuery.trim()
                        ? language === "en"
                          ? "No matching chats found"
                          : "ไม่พบแชทที่ค้นหา"
                        : language === "en"
                          ? "No saved chats yet"
                          : "ยังไม่มีประวัติแชท"}
                    </div>
                  ) : (
                    <>
                      {pinnedChats.length > 0 && (
                        <div className="space-y-1">
                          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#6B6A65]">
                            {language === "en" ? "Pinned" : "ปักหมุดแล้ว"}
                          </div>
                          {pinnedChats.map(renderChatRow)}
                        </div>
                      )}

                      {unpinnedChats.length > 0 && (
                        <div className="space-y-1">
                          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#6B6A65]">
                            {language === "en" ? "Chats" : "ประวัติแชท"}
                          </div>
                          {unpinnedChats.map(renderChatRow)}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Bottom Settings & Account Navigation */}
                <div className="p-3 border-t border-[#ECEAE3] space-y-1 shrink-0 bg-[#F5F3EC]/70">
                  <button
                    type="button"
                    id="sidebar-personas-btn"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenPersonaModal();
                    }}
                    className="w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-sm font-medium text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer text-left"
                  >
                    <UserCog className="w-4 h-4 text-[#1F1E1D] shrink-0" />
                    <span>{language === "en" ? "Personas" : "บุคลิก"}</span>
                  </button>

                  <button
                    type="button"
                    id="sidebar-api-key-btn"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenApiKeyModal();
                    }}
                    className="w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-sm font-medium text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer text-left"
                  >
                    <Key className="w-4 h-4 text-[#1F1E1D] shrink-0" />
                    <span>Gemini API Key</span>
                  </button>

                  <button
                    type="button"
                    id="menu-send-feedback-btn"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenFeedback();
                    }}
                    className="w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-sm font-medium text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer text-left"
                  >
                    <MessageSquare className="w-4 h-4 text-[#1F1E1D] shrink-0" />
                    <span>{language === "en" ? "Send Feedback" : "ส่งคำแนะนำ"}</span>
                  </button>

                  {user && (
                    <div className="pt-2 mt-1 border-t border-[#ECEAE3] space-y-1">
                      <div className="px-3 py-1 text-xs text-[#6B6A65] truncate">
                        {user.displayName || user.email}
                      </div>
                      <button
                        type="button"
                        id="sidebar-sign-out-btn"
                        onClick={() => {
                          setIsOpen(false);
                          signOutUser();
                        }}
                        className="w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-sm font-medium text-[#1F1E1D] hover:bg-[#EFECE4] transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 text-[#1F1E1D] shrink-0" />
                        <span>{language === "en" ? "Sign out" : "ออกจากระบบ"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.aside>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
