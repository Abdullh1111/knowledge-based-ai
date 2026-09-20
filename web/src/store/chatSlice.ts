import { createAsyncThunk, createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchConversationFiles,
  fetchConversationMessages,
  fetchConversations,
  uploadFile,
  type ConversationSummary,
} from "@/lib/api";
import type { RootState } from "./store";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export interface ChatFile {
  id: string;
  name: string;
  status: "uploading" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  chunkCount?: number;
  error?: string;
}

interface ChatState {
  messages: ChatMessage[];
  files: ChatFile[];
  conversationId?: string;
  connected: boolean;
  isStreaming: boolean;
  isUploading: boolean;
  conversations: ConversationSummary[];
  loadingMessages: boolean;
  loadingFiles: boolean;
}

const initialState: ChatState = {
  messages: [],
  files: [],
  connected: false,
  isStreaming: false,
  isUploading: false,
  conversations: [],
  loadingMessages: false,
  loadingFiles: false,
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

export const loadConversationFiles = createAsyncThunk(
  "chat/loadConversationFiles",
  async (conversationId: string) => {
    const files = await fetchConversationFiles(conversationId);
    return { conversationId, files };
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
      state.files = [];
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
      .addCase(loadConversationFiles.pending, (state) => {
        state.loadingFiles = true;
      })
      .addCase(loadConversationFiles.fulfilled, (state, action) => {
        state.files = action.payload.files.map((file) => ({
          id: file.id,
          name: file.name,
          status: file.status,
          chunkCount: file._count.chunks,
        }));
        state.loadingFiles = false;
      })
      .addCase(loadConversationFiles.rejected, (state) => {
        state.loadingFiles = false;
      })
      .addCase(uploadChatFile.pending, (state, action) => {
        state.isUploading = true;
        state.files.push({
          id: action.meta.arg.localId,
          name: action.meta.arg.file.name,
          status: "uploading",
        });
      })
      .addCase(uploadChatFile.fulfilled, (state, action) => {
        state.isUploading = false;
        state.conversationId = action.payload.conversationId;
        const file = state.files.find((item) => item.id === action.meta.arg.localId);
        if (file) {
          file.id = action.payload.id;
          file.status = action.payload.status;
          file.chunkCount = action.payload._count.chunks;
        }
      })
      .addCase(uploadChatFile.rejected, (state, action) => {
        state.isUploading = false;
        const file = state.files.find((item) => item.id === action.meta.arg.localId);
        if (file) {
          file.status = "FAILED";
          file.error = action.error.message ?? "Upload failed";
        }
      });
  },
});

export const { setConnected, newConversation, messageSent, tokenReceived, responseDone, responseError } =
  chatSlice.actions;
export default chatSlice.reducer;
