import Sidebar from "@/components/Chat/Sidebar";
import ChatWindow from "@/components/Chat/ChatWindow";

export default function Home() {
  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <Sidebar />
      <ChatWindow />
    </div>
  );
}
