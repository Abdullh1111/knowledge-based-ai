import { createAsyncThunk, createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchConversationMessages,
  fetchConversations,
  uploadFile,
  type ConversationSummary,
} from "@/lib/api";
import type { RootState } from "./store";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "file";
  content: string;
  streaming?: boolean;
  fileName?: string;
  fileStatus?: "uploading" | "completed" | "failed";
}

interface ChatState {
  messages: ChatMessage[];
  conversationId?: string;
  connected: boolean;
  isStreaming: boolean;
  isUploading: boolean;
  conversations: ConversationSummary[];
  loadingMessages: boolean;
}

const initialState: ChatState = {
  messages: [],
  connected: false,
  isStreaming: false,
  isUploading: false,
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

export const uploadChatFile = createAsyncThunk<
  Awaited<ReturnType<typeof uploadFile>>,
  { file: File; localId: string },
  { state: RootState }
>("chat/uploadFile", ({ file }, { getState }) => {
  return uploadFile(file, getState().chat.conversationId);
});

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
      })
      .addCase(uploadChatFile.pending, (state, action) => {
        state.isUploading = true;
        state.messages.push({
          id: action.meta.arg.localId,
          role: "file",
          content: "",
          fileName: action.meta.arg.file.name,
          fileStatus: "uploading",
        });
      })
      .addCase(uploadChatFile.fulfilled, (state, action) => {
        state.isUploading = false;
        state.conversationId = action.payload.conversationId;
        const message = state.messages.find((item) => item.id === action.meta.arg.localId);
        if (message) {
          message.fileStatus = action.payload.status === "FAILED" ? "failed" : "completed";
        }
      })
      .addCase(uploadChatFile.rejected, (state, action) => {
        state.isUploading = false;
        const message = state.messages.find((item) => item.id === action.meta.arg.localId);
        if (message) {
          message.fileStatus = "failed";
          message.content = action.error.message ?? "Upload failed";
        }
      });
  },
});

export const { setConnected, newConversation, messageSent, tokenReceived, responseDone, responseError } =
  chatSlice.actions;
export default chatSlice.reducer;
