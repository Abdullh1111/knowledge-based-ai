const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5100";

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
