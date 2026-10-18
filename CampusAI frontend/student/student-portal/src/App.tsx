import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import Notifications from "./pages/Notifications";
import Feedback from "./pages/Feedback";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import UsersEnd from "./pages/UsersEnd";

import { BackgroundGlow } from "@/components/ui/background-glow";

const queryClient = new QueryClient();

import { ChatProvider } from "./context/ChatContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ChatProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <div className="fixed inset-0 z-50 pointer-events-none">
            <BackgroundGlow />
          </div>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              {/* Mapped legacy user routes to standard Login/Signup if accessed */}
              <Route path="/user-login" element={<Login />} />
              <Route path="/user-signup" element={<Signup />} />

              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/community" element={<Community />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/users-end" element={<UsersEnd />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ChatProvider>
  </QueryClientProvider>
);

export default App;
