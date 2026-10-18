import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

export interface Message {
    id: string;
    role: "user" | "ai";
    content: string;
    grounding?: string[];
    storesUsed?: string[];
    isCampusSearch?: boolean;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number;
    backendSessionId?: string;
}

interface ChatContextType {
    messages: Message[];
    inputValue: string;
    setInputValue: (value: string) => void;
    isTyping: boolean;
    chatHistory: ChatSession[];
    currentChatId: string | null;
    sendMessage: () => void;
    startNewChat: () => void;
    loadChat: (id: string) => void;
    stopGeneration: () => void;
    clearSession: () => void;
    chatMode: 'global' | 'campus';
    setChatMode: (mode: 'global' | 'campus') => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    // Load chatMode from localStorage, default to 'campus'
    const [chatMode, setChatMode] = useState<'global' | 'campus'>(() => {
        const savedMode = localStorage.getItem('chatMode');
        return (savedMode === 'global' || savedMode === 'campus') ? savedMode : 'campus';
    });
    const currentChatIdRef = useRef<string | null>(null);
    const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Persist chatMode to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('chatMode', chatMode);
    }, [chatMode]);

    // Load history on mount
    useEffect(() => {
        const savedHistory = localStorage.getItem("chatHistory");
        if (savedHistory) {
            try {
                setChatHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error("Failed to parse chat history", e);
            }
        }

        // Check for active session in localStorage to restore state if reload happens
        const savedSession = localStorage.getItem("currentChatSession");
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                if (session.currentChatId) {
                    setCurrentChatId(session.currentChatId);
                    currentChatIdRef.current = session.currentChatId;
                    setMessages(session.messages || []);
                }
            } catch (e) { console.error("Failed to restore session", e); }
        }
    }, []);

    // Persist active session on change
    useEffect(() => {
        if (currentChatId) {
            const currentSession = chatHistory.find(c => c.id === currentChatId);
            localStorage.setItem("currentChatSession", JSON.stringify({
                currentChatId,
                messages,
                backendSessionId: currentSession?.backendSessionId
            }));
        }
    }, [currentChatId, messages, chatHistory]);

    const saveChatToHistory = (chatId: string, msgs: Message[], backendSessionId?: string) => {
        if (msgs.length === 0) return;

        setChatHistory(prev => {
            const existingChatIndex = prev.findIndex(c => c.id === chatId);
            let updatedHistory;

            if (existingChatIndex >= 0) {
                updatedHistory = [...prev];
                updatedHistory[existingChatIndex] = {
                    ...updatedHistory[existingChatIndex],
                    messages: msgs,
                    timestamp: Date.now(),
                    backendSessionId: backendSessionId || updatedHistory[existingChatIndex].backendSessionId
                };
            } else {
                // Extract first sentence for title
                const firstMessage = msgs[0].content;
                const firstSentence = firstMessage.match(/[^.!?]+[.!?]?/)?.[0] || firstMessage;
                const title = firstSentence.trim().slice(0, 50) + (firstSentence.length > 50 ? "..." : "");

                const newChat: ChatSession = {
                    id: chatId,
                    title: title,
                    messages: msgs,
                    timestamp: Date.now(),
                    backendSessionId: backendSessionId
                };
                updatedHistory = [newChat, ...prev];
            }

            // Sort by timestamp desc
            updatedHistory.sort((a, b) => b.timestamp - a.timestamp);

            localStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
            return updatedHistory;
        });
    };

    const loadChat = (chatId: string) => {
        const chat = chatHistory.find(c => c.id === chatId);
        if (chat) {
            setCurrentChatId(chat.id);
            currentChatIdRef.current = chat.id;
            setMessages(chat.messages);
            // setIsSearchOpen(false); // UI state, handle in component
        }
    };

    const startNewChat = () => {
        setCurrentChatId(null);
        currentChatIdRef.current = null;
        setMessages([]);
        setIsTyping(false);
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        localStorage.removeItem("currentChatSession"); // clear active session persistence
    };

    const stopGeneration = () => {
        if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
        }
        setIsTyping(false);
    };

    const clearSession = () => {
        startNewChat();
    };

    const sendMessage = async () => {
        if (!inputValue.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: inputValue,
        };

        const updatedMessages = [...messages, newMessage];
        setMessages(updatedMessages);
        const currentInput = inputValue;
        setInputValue("");

        // Determine Chat ID
        let chatId = currentChatId;
        if (!chatId) {
            chatId = Date.now().toString();
            setCurrentChatId(chatId);
            currentChatIdRef.current = chatId;
        }

        // Find existing session to get backendSessionId
        const existingSession = chatHistory.find(c => c.id === chatId);
        const backendSessionId = existingSession?.backendSessionId;

        // Save user message immediately
        saveChatToHistory(chatId, updatedMessages, backendSessionId);

        setIsTyping(true);

        try {
            // Get student email
            const studentDataStr = localStorage.getItem("studentData");
            let email = "student@university.edu"; // Fallback
            if (studentDataStr) {
                try {
                    const student = JSON.parse(studentDataStr);
                    if (student.email) email = student.email;
                } catch (e) {
                    console.error("Failed to parse student data for email", e);
                }
            }

            // Prepare API URL
            const params = new URLSearchParams({
                email: email,
                question: currentInput,
                isCampusSearch: (chatMode === "campus").toString()
            });

            if (backendSessionId) {
                params.append("sessionId", backendSessionId);
            }

            const response = await fetch(`https://campusai-916628151603.asia-south1.run.app/api/ask?${params.toString()}`, {
                method: "GET",
            });

            if (!response.ok) {
                throw new Error("Failed to fetch response");
            }

            const data = await response.json();

            // data check
            if (data.error) {
                throw new Error(data.error);
            }

            const aiResponseId = (Date.now() + 1).toString();

            // Simulate typing effect for the received answer
            const fullContent = data.answer || "No response received.";
            const grounding = data.grounding || [];
            const storesUsed = data.storesUsed || [];
            const isCampusSearch = data.isCampusSearch;
            const newBackendSessionId = data.sessionId;

            // Add placeholder AI message
            if (currentChatIdRef.current === chatId) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: aiResponseId,
                        role: "ai",
                        content: "",
                        grounding,
                        storesUsed,
                        isCampusSearch
                    },
                ]);
            }

            let currentIndex = 0;
            // Clear any existing interval
            if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

            typingIntervalRef.current = setInterval(() => {
                if (currentIndex < fullContent.length) {
                    const currentText = fullContent.slice(0, currentIndex + 1);

                    if (currentChatIdRef.current === chatId) {
                        setMessages((prev) => prev.map((msg) =>
                            msg.id === aiResponseId
                                ? { ...msg, content: currentText }
                                : msg
                        ));
                    }
                    currentIndex++;
                } else {
                    if (typingIntervalRef.current) {
                        clearInterval(typingIntervalRef.current);
                        typingIntervalRef.current = null;
                    }

                    if (currentChatIdRef.current === chatId) {
                        setIsTyping(false);
                        // Final save with backendSessionId and full content
                        setMessages(prev => {
                            saveChatToHistory(chatId!, prev, newBackendSessionId);
                            return prev;
                        });
                    }
                }
            }, 10); // Fast typing

        } catch (error) {
            console.error("Chat API Error:", error);
            setIsTyping(false);
            // Add error message
            const errorId = (Date.now() + 2).toString();
            setMessages(prev => {
                const newMsgs = [
                    ...prev,
                    {
                        id: errorId,
                        role: "ai" as const,
                        content: "Sorry, I encountered an error while processing your request. Please try again."
                    }
                ];
                saveChatToHistory(chatId!, newMsgs, backendSessionId);
                return newMsgs;
            });
        }
    };


    return (
        <ChatContext.Provider value={{
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
            clearSession,
            chatMode,
            setChatMode
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
