const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5100";

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export interface ConversationSummary {
  id: string;
  name: string | null;
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  content: string | null;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  createdAt: string;
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_URL}/conversations`);
  if (!res.ok) throw new Error("Failed to load conversations");
  return res.json();
}

export async function fetchConversationMessages(id: string): Promise<ConversationMessage[]> {
  const res = await fetch(`${API_URL}/conversations/${id}/messages`);
  if (!res.ok) throw new Error("Failed to load messages");
  return res.json();
}

export interface UploadedFileResult {
  id: string;
  name: string;
  url: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  conversationId: string;
  _count: { chunks: number };
}

export async function uploadFile(file: File, conversationId?: string): Promise<UploadedFileResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (conversationId) formData.append("conversationId", conversationId);

  const res = await fetch(`${API_URL}/files`, { method: "POST", body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new Error(body?.message ?? "Failed to upload file");
  }
  return res.json();
}

export interface ConversationFile {
  id: string;
  name: string;
  url: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  conversationId: string;
  _count: { chunks: number };
}

export async function fetchConversationFiles(conversationId: string): Promise<ConversationFile[]> {
  const res = await fetch(`${API_URL}/files?conversationId=${conversationId}`);
  if (!res.ok) throw new Error("Failed to load files");
  return res.json();
}
