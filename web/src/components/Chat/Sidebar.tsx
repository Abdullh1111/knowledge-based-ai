"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  loadConversationFiles,
  loadConversationMessages,
  loadConversations,
  newConversation,
} from "@/store/chatSlice";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const dispatch = useAppDispatch();
  const conversations = useAppSelector((state) => state.chat.conversations);
  const activeConversationId = useAppSelector((state) => state.chat.conversationId);
  const isStreaming = useAppSelector((state) => state.chat.isStreaming);

  useEffect(() => {
    dispatch(loadConversations());
  }, [dispatch]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 max-w-[85vw] shrink-0 flex-col border-r border-black/10 bg-zinc-50 transition-transform duration-200 ease-in-out dark:border-white/10 dark:bg-black md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 p-3">
          <button
            type="button"
            disabled={isStreaming}
            onClick={() => {
              dispatch(newConversation());
              onClose();
            }}
            className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-left text-sm font-medium hover:bg-black/5 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"
          >
            + New chat
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/10 text-sm dark:border-white/10 md:hidden"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              disabled={isStreaming}
              onClick={() => {
                dispatch(loadConversationMessages(conversation.id));
                dispatch(loadConversationFiles(conversation.id));
                onClose();
              }}
              className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm disabled:opacity-40 ${
                conversation.id === activeConversationId
                  ? "bg-black/10 dark:bg-white/10"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              {conversation.name || "Untitled conversation"}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
