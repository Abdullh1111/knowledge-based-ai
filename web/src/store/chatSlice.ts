import { createAsyncThunk, createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";
import { fetchConversationMessages, fetchConversations, type ConversationSummary } from "@/lib/api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  conversationId?: string;
  connected: boolean;
  isStreaming: boolean;
  conversations: ConversationSummary[];
  loadingMessages: boolean;
}

const initialState: ChatState = {
  messages: [],
  connected: false,
  isStreaming: false,
  conversations: [],
  loadingMessages: false,
};

export const loadConversations = createAsyncThunk("chat/loadConversations", async () => {
  return fetchConversations();
});

export const loadConversationMessages = createAsyncThunk(
  "chat/loadConversationMessages",
  async (conversationId: string) => {
    const messages = await fetchConversationMessages(conversationId);
    return { conversationId, messages };
  },
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConnected(state, action: PayloadAction<boolean>) {
      state.connected = action.payload;
    },
    newConversation(state) {
      state.conversationId = undefined;
      state.messages = [];
      state.isStreaming = false;
    },
    messageSent(state, action: PayloadAction<{ content: string }>) {
      const id = nanoid();
      state.messages.push({ id, role: "user", content: action.payload.content });
      state.messages.push({ id: `${id}-assistant`, role: "assistant", content: "", streaming: true });
      state.isStreaming = true;
    },
    tokenReceived(state, action: PayloadAction<{ token: string }>) {
      const last = state.messages[state.messages.length - 1];
      if (last?.role === "assistant") {
        last.content += action.payload.token;
      }
    },
    responseDone(state, action: PayloadAction<{ conversationId: string }>) {
      const last = state.messages[state.messages.length - 1];
      if (last?.role === "assistant") {
        last.streaming = false;
      }
      state.conversationId = action.payload.conversationId;
      state.isStreaming = false;
    },
    responseError(state, action: PayloadAction<{ message: string }>) {
      const last = state.messages[state.messages.length - 1];
      if (last?.role === "assistant") {
        last.content = last.content || `Error: ${action.payload.message}`;
        last.streaming = false;
      }
      state.isStreaming = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadConversations.fulfilled, (state, action) => {
        state.conversations = action.payload;
      })
      .addCase(loadConversationMessages.pending, (state) => {
        state.loadingMessages = true;
      })
      .addCase(loadConversationMessages.fulfilled, (state, action) => {
        state.conversationId = action.payload.conversationId;
        state.messages = action.payload.messages.map((message) => ({
          id: message.id,
          role: message.role === "ASSISTANT" ? "assistant" : "user",
          content: message.content ?? "",
        }));
        state.loadingMessages = false;
        state.isStreaming = false;
      })
      .addCase(loadConversationMessages.rejected, (state) => {
        state.loadingMessages = false;
      });
  },
});

export const { setConnected, newConversation, messageSent, tokenReceived, responseDone, responseError } =
  chatSlice.actions;
export default chatSlice.reducer;
