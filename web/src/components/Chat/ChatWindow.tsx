"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  loadConversations,
  messageSent,
  responseDone,
  responseError,
  setConnected,
  tokenReceived,
  uploadChatFile,
} from "@/store/chatSlice";

const ACCEPTED_FILE_TYPES = ".pdf,.docx,.txt,.csv";

export default function ChatWindow() {
  const dispatch = useAppDispatch();
  const messages = useAppSelector((state) => state.chat.messages);
  const connected = useAppSelector((state) => state.chat.connected);
  const isStreaming = useAppSelector((state) => state.chat.isStreaming);
  const isUploading = useAppSelector((state) => state.chat.isUploading);
  const conversationId = useAppSelector((state) => state.chat.conversationId);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const onConnect = () => dispatch(setConnected(true));
    const onDisconnect = () => dispatch(setConnected(false));
    const onToken = (data: { token: string }) => dispatch(tokenReceived(data));
    const onDone = (data: { conversationId: string }) => {
      dispatch(responseDone(data));
      dispatch(loadConversations());
    };
    const onError = (data: { message: string }) => dispatch(responseError(data));

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("chat:token", onToken);
    socket.on("chat:done", onDone);
    socket.on("chat:error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("chat:token", onToken);
      socket.off("chat:done", onDone);
      socket.off("chat:error", onError);
    };
  }, [dispatch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    dispatch(messageSent({ content: trimmed }));
    getSocket().emit("chat:message", { message: trimmed, conversationId });
    setInput("");
  };

  const handleFilePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      await dispatch(uploadChatFile({ file, localId: crypto.randomUUID() })).unwrap();
      dispatch(loadConversations());
    } catch {
      // failure is already reflected on the file message via uploadChatFile.rejected
    }
  };

  const disabled = isStreaming || isUploading;

  return (
    <div className="flex flex-1 flex-col min-w-0">
      <header className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
        <h1 className="text-base font-semibold">Knowledge Assistant</h1>
        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-zinc-400"}`} />
          {connected ? "Connected" : "Connecting..."}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          {messages.length === 0 && (
            <p className="mt-10 text-center text-sm text-zinc-500">
              Ask anything — uploaded files are used as knowledge base.
            </p>
          )}

          {messages.map((message) => {
            if (message.role === "file") {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="flex max-w-[80%] items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-black">
                    <span>📎</span>
                    <span className="truncate">{message.fileName}</span>
                    {message.fileStatus === "uploading" && (
                      <span className="text-xs opacity-70">Uploading...</span>
                    )}
                    {message.fileStatus === "completed" && (
                      <span className="text-xs opacity-70">Ready</span>
                    )}
                    {message.fileStatus === "failed" && (
                      <span className="text-xs text-red-400">{message.content || "Failed"}</span>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                      : "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white"
                  }`}
                >
                  {message.content}
                  {message.streaming && <span className="ml-1 inline-block animate-pulse">▍</span>}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-black/10 px-4 py-3 dark:border-white/10">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
          className="mx-auto flex w-full max-w-2xl items-center gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleFilePicked}
            className="hidden"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            title="Attach a file (pdf, docx, txt, csv)"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 text-base disabled:opacity-40 dark:border-white/10"
          >
            📎
          </button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-full border border-black/10 bg-transparent px-4 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-black"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
