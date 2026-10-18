import { useState, useRef, useEffect } from "react";
import {
    MessageSquare,
    Share2,
    Ticket,
    Grid,
    Clock,
    GraduationCap,
    Search,
    Settings,
    LogOut,
    FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { NavLink, useNavigate } from "react-router-dom";
import CommunityFeed from "@/components/CommunityFeed";
import UserTickets from "@/components/UserTickets";
import UserServices from "@/components/UserServices";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsDialog } from "@/components/SettingsDialog";
import { AnimatedAIChat } from "@/components/ui/animated-ai-chat";
import { BackgroundGlow } from "@/components/ui/background-glow";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { useChat } from "@/context/ChatContext";

const UsersEnd = () => {
    const {
        messages,
        inputValue,
        setInputValue,
        isTyping,
        chatHistory,
        currentChatId,
        sendMessage,
        startNewChat,
        loadChat,
        stopGeneration,
        chatMode,
        setChatMode
    } = useChat();

    const [activeTab, setActiveTab] = useState("Chat");
    const [userLocation, setUserLocation] = useState<{ state: string; city: string } | null>(null);
    const [universityName, setUniversityName] = useState<string | null>(null);
    const [studentName, setStudentName] = useState("Student");
    const [studentEmail, setStudentEmail] = useState("student@university.edu");

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showMyPosts, setShowMyPosts] = useState(false);

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const handleSidebarToggle = () => setIsSidebarOpen(!isSidebarOpen);

    const handleLogout = () => {
        localStorage.removeItem("studentData");
        localStorage.removeItem("authToken");
        localStorage.removeItem("userState");
        localStorage.removeItem("userCity");
        localStorage.removeItem("userUniversity");
        navigate("/login");
    };

    useEffect(() => {
        const studentDataStr = localStorage.getItem("studentData");
        if (studentDataStr) {
            try {
                const student = JSON.parse(studentDataStr);
                if (student.universityName) {
                    setUniversityName(student.universityName);
                }
                if (student.name) setStudentName(student.name);
                if (student.email) setStudentEmail(student.email);
            } catch (e) {
                console.error("Failed to parse student data", e);
            }
        } else {
            // Fallback for demo
            setUniversityName("Smart Campus University");
        }
    }, []);

    const handleStopGeneration = () => {
        stopGeneration();
    };

    const handleSendMessage = () => {
        sendMessage();
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
            {/* Custom Sidebar */}
            <div className={cn("flex-shrink-0 border-r border-border/40 flex flex-col bg-card/30 backdrop-blur-xl transition-all duration-300 ease-in-out", isSidebarOpen ? "w-[280px]" : "w-[80px]")}>
                <div className="p-4 flex flex-col h-full">
                    {/* Logo Header */}
                    <div className={cn("flex items-center mb-6 transition-all duration-300", isSidebarOpen ? "px-2 justify-between" : "justify-center px-0")}>
                        <div className={cn("flex items-center gap-3", !isSidebarOpen && "justify-center")}>
                            <div className="h-10 w-10 flex-shrink-0">
                                <div onClick={() => { startNewChat(); setActiveTab("Chat"); }} className="block w-full h-full cursor-pointer">
                                    <div className="h-full w-full rounded-full border border-border flex items-center justify-center bg-background hover:ring-2 hover:ring-primary transition-all">
                                        <GraduationCap className="h-6 w-6 text-primary" />
                                    </div>
                                </div>
                            </div>
                            {isSidebarOpen && (
                                <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                                    <span className="font-poppins font-extrabold text-[12px] tracking-wide whitespace-nowrap">CampusAi</span>
                                    {universityName && (
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider whitespace-nowrap truncate max-w-[180px]">
                                            {universityName}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* New Chat Button */}
                    <div className={cn("mb-2 transition-all duration-300", isSidebarOpen ? "px-2" : "px-0 flex justify-center")}>
                        <div
                            onClick={() => { startNewChat(); setActiveTab("Chat"); }}
                            className={cn(
                                "flex items-center gap-2 bg-primary/10 rounded-full text-primary hover:bg-primary/20 transition-all cursor-pointer border border-primary/20",
                                isSidebarOpen ? "px-4 py-2.5" : "h-10 w-10 justify-center p-0"
                            )}
                        >
                            <MessageSquare className="h-4 w-4" />
                            {isSidebarOpen && <span className="text-sm font-medium animate-in fade-in zoom-in duration-200">New Chat</span>}
                        </div>
                    </div>

                    {/* Search Chats Trigger */}
                    <div className={cn("mb-6 transition-all duration-300", isSidebarOpen ? "px-2" : "px-0 flex justify-center")}>
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className={cn(
                                "flex items-center gap-2 w-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer rounded-lg border border-transparent hover:border-border/50",
                                isSidebarOpen ? "px-3 py-2" : "h-10 w-10 justify-center p-0"
                            )}
                        >
                            <Search className="h-4 w-4" />
                            {isSidebarOpen && <span className="text-sm font-medium truncate">Search chats...</span>}
                        </button>
                    </div>

                    {/* Main Navigation */}
                    <nav className="space-y-2 mb-8">
                        {[
                            { icon: MessageSquare, label: "Chat" },
                            { icon: Share2, label: "Social Media" },
                            { icon: Ticket, label: "Tickets" },
                            { icon: Grid, label: "Departments" },
                        ].map((item) => (
                            <TooltipProvider key={item.label} delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => {
                                                setActiveTab(item.label);
                                                if (item.label !== "Social Media") {
                                                    setShowMyPosts(false);
                                                }
                                            }}
                                            className={cn(
                                                "flex items-center gap-3 w-full rounded-lg transition-colors text-[15px] font-medium h-10",
                                                isSidebarOpen ? "px-4 justify-start" : "justify-center px-0",
                                                activeTab === item.label
                                                    ? "bg-secondary/80 text-foreground font-semibold"
                                                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                                            )}
                                        >
                                            <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                                            {isSidebarOpen && <span className="animate-in fade-in slide-in-from-left-2 duration-200">{item.label}</span>}
                                        </button>
                                    </TooltipTrigger>
                                    {!isSidebarOpen && <TooltipContent side="right">{item.label}</TooltipContent>}
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </nav>

                    {/* History Section - Only visible when open */}
                    <div className={cn("flex-1 overflow-y-auto pr-2", !isSidebarOpen && "hidden")}>
                        <div className="px-4 mb-2 flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm font-semibold">History</span>
                        </div>

                        <div className="space-y-4 pl-4 mt-2">
                            {chatHistory.length === 0 ? (
                                <div className="text-xs text-muted-foreground px-2">No history yet</div>
                            ) : (
                                <div>
                                    <h3 className="text-xs font-medium text-muted-foreground/70 mb-2 px-2">Recent</h3>
                                    {chatHistory.map((chat) => (
                                        <button
                                            key={chat.id}
                                            onClick={() => {
                                                loadChat(chat.id);
                                                setActiveTab("Chat"); // Switch back to chat tab when loading
                                            }}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate mb-1",
                                                currentChatId === chat.id
                                                    ? "bg-secondary text-foreground font-medium"
                                                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                                            )}
                                        >
                                            {chat.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User Profile Dropdown */}
                    <div className="mt-auto pt-4 border-t border-border/20">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className={cn("relative h-12 w-full hover:bg-secondary/50 rounded-xl group overflow-hidden", isSidebarOpen ? "px-2 justify-start" : "justify-center px-0")}>
                                    <div className={cn("flex items-center gap-3 w-full", !isSidebarOpen && "justify-center")}>
                                        <Avatar className="h-9 w-9 border border-border/50 transition-transform group-hover:scale-105 flex-shrink-0">
                                            <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {studentName.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {isSidebarOpen && (
                                            <div className="flex flex-col items-start text-left transition-opacity duration-200 animate-in fade-in slide-in-from-left-2">
                                                <span className="text-sm font-medium leading-none group-hover:text-primary">{studentName}</span>
                                                <span className="text-xs text-muted-foreground truncate w-32 group-hover:text-muted-foreground/80">{studentEmail}</span>
                                            </div>
                                        )}
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 mb-2 ml-2" align="start" side="top" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{studentName}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {studentEmail}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setIsSettingsOpen(true)} className="cursor-pointer">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Settings</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div >

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative h-full overflow-hidden">
                {/* Theme Toggle - Absolute Positioned - Only for Chat */}
                {activeTab === "Chat" && (
                    <div className="absolute top-4 right-4 z-50">
                        <ThemeToggle />
                    </div>
                )}

                {activeTab === "Chat" ? (
                    <AnimatedAIChat
                        key={currentChatId || 'new-chat'}
                        inputValue={inputValue}
                        setInputValue={setInputValue}
                        onSendMessage={handleSendMessage}
                        isTyping={isTyping}
                        messages={messages}
                        onStopGeneration={handleStopGeneration}
                        chatMode={chatMode}
                        setChatMode={setChatMode}
                    />
                ) : activeTab === "Social Media" ? (
                    <div className="flex-1 flex flex-col relative h-full overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 z-50">
                            <UnifiedHeader
                                title="Community"
                                subtitle={showMyPosts ? "My Posts" : "Student Portal"}
                                onSidebarToggle={handleSidebarToggle}
                                isSidebarOpen={isSidebarOpen}
                                onMyPostsClick={() => setShowMyPosts(!showMyPosts)}
                            />
                        </div>
                        <div className="h-full overflow-y-auto w-full pt-16">
                            <div className="relative flex-1 flex justify-center min-h-full">
                                <BackgroundGlow />
                                <div className="relative z-10 w-full min-h-full flex justify-center">
                                    <CommunityFeed showMyPosts={showMyPosts} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === "Tickets" ? (
                    <div className="flex-1 flex flex-col relative h-full overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 z-50">
                            <UnifiedHeader title="My Tickets" subtitle="Student Portal" onSidebarToggle={handleSidebarToggle} isSidebarOpen={isSidebarOpen} />
                        </div>
                        <div className="h-full overflow-y-auto w-full pt-16">
                            <div className="relative flex-1 flex justify-center min-h-full">
                                <BackgroundGlow />
                                <div className="relative z-10 w-full h-full flex justify-center">
                                    <UserTickets />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === "Departments" ? (
                    <div className="flex-1 flex flex-col relative h-full overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 z-50">
                            <UnifiedHeader title="Departments" subtitle="Student Portal" onSidebarToggle={handleSidebarToggle} isSidebarOpen={isSidebarOpen} />
                        </div>
                        <div className="h-full overflow-y-auto w-full pt-16">
                            <div className="relative flex-1 flex justify-center min-h-full">
                                <BackgroundGlow />
                                <div className="relative z-10 w-full h-full flex justify-center">
                                    <UserServices />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Coming Soon
                    </div>
                )}
            </div>

            <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <CommandInput placeholder="Search previous chats..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="History">
                        {chatHistory.map((chat) => (
                            <CommandItem
                                key={chat.id}
                                onSelect={() => {
                                    loadChat(chat.id);
                                    setActiveTab("Chat");
                                    setIsSearchOpen(false);
                                }}
                            >
                                <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                                <span>{chat.title}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>

            <SettingsDialog
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
                variant="user"
                onViewMyPosts={() => {
                    setActiveTab("Social Media");
                    setShowMyPosts(true);
                    // No need to close explicitly if SettingsDialog handles it, but let's be sure.
                    // The onOpenChange(false) inside SettingsDialog handles it.
                }}
            />
        </div>
    );
};

export default UsersEnd;
