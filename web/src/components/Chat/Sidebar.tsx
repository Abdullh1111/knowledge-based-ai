"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  loadConversationFiles,
  loadConversationMessages,
  loadConversations,
  newConversation,
} from "@/store/chatSlice";

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const conversations = useAppSelector((state) => state.chat.conversations);
  const activeConversationId = useAppSelector((state) => state.chat.conversationId);
  const isStreaming = useAppSelector((state) => state.chat.isStreaming);

  useEffect(() => {
    dispatch(loadConversations());
  }, [dispatch]);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-black/10 dark:border-white/10">
      <div className="p-3">
        <button
          type="button"
          disabled={isStreaming}
          onClick={() => dispatch(newConversation())}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-left text-sm font-medium hover:bg-black/5 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5"
        >
          + New chat
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            disabled={isStreaming}
            onClick={() => {
              dispatch(loadConversationMessages(conversation.id));
              dispatch(loadConversationFiles(conversation.id));
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
  );
}
