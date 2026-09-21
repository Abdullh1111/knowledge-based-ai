"use client";

import { useState } from "react";
import Sidebar from "@/components/Chat/Sidebar";
import ChatWindow from "@/components/Chat/ChatWindow";

export default function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative flex flex-1 min-h-0 bg-zinc-50 dark:bg-black">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ChatWindow onOpenSidebar={() => setSidebarOpen(true)} />
    </div>
  );
}
