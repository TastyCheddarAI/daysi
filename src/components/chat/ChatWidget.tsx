import { useChat } from "@/contexts/ChatContext";
import { ChatWidgetButton } from "./ChatWidgetButton";
import { ChatWidgetPanel } from "./ChatWidgetPanel";
import { MobileChatDrawer } from "./MobileChatDrawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "react-router-dom";

export function ChatWidget() {
  const { isOpen, setIsOpen } = useChat();
  const isMobile = useIsMobile();
  const location = useLocation();

  // Hide chat widget on admin pages
  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Mobile: Use dedicated drawer component
  if (isMobile) {
    return (
      <>
        <div className="fixed bottom-4 right-4 z-50">
          <ChatWidgetButton isOpen={isOpen} onClick={handleToggle} />
        </div>
        <MobileChatDrawer open={isOpen} onOpenChange={setIsOpen} />
      </>
    );
  }

  // Desktop: floating panel
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      <ChatWidgetPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
      <ChatWidgetButton isOpen={isOpen} onClick={handleToggle} />
    </div>
  );
}
