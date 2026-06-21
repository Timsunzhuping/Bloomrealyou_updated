import { SalesCopilotPage } from '@/components/ai-agents/sales-copilot-page';

export const metadata = {
  title: 'AI Sales Copilot - Bloomrealyou',
  description: 'Chat with our AI assistant to discover products and place orders',
};

export default function AIChatPage() {
  return (
    <div className="h-[calc(100vh-3.5rem)] -mx-4 -my-10 md:-mx-10 md:-my-10">
      <SalesCopilotPage />
    </div>
  );
}
