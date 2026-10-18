"use client";

import { useEffect, useRef, useCallback, useTransition } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    ImageIcon,
    Figma,
    MonitorIcon,
    Paperclip,
    SendIcon,
    XIcon,
    LoaderIcon,
    Sparkles,
    Command,
    Copy,
    Bot,
    User,
    ArrowUp,
    Rocket,
    ChevronDown,
    Square,
    Plus,
    BookOpen,
    Mic,
    AudioLines,
    Search,
    Globe,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
    value?: string;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
    value,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = 'auto'; // Reset to auto to correctly read scrollHeight
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    useEffect(() => {
        adjustHeight();
    }, [value, adjustHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

interface CommandSuggestion {
    icon: React.ReactNode;
    label: string;
    description: string;
    prefix: string;
}

interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    containerClassName?: string;
    showRing?: boolean;
    startContent?: React.ReactNode;
    endContent?: React.ReactNode;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, containerClassName, showRing = true, ...props }, ref) => {
        const [isFocused, setIsFocused] = React.useState(false);

        return (
            <div className={cn(
                "relative",
                containerClassName
            )}>
                <textarea
                    className={cn(
                        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                        "transition-colors duration-200 ease-in-out", // Removed transition-all to fix resize glitch
                        "placeholder:text-muted-foreground",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        showRing ? "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" : "",
                        className
                    )}
                    ref={ref}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...props}
                />

                {props.startContent && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                        {props.startContent}
                    </div>
                )}

                {props.endContent && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                        {props.endContent}
                    </div>
                )}

                {showRing && isFocused && (
                    <motion.span
                        className="absolute inset-0 rounded-md pointer-events-none ring-2 ring-offset-0 ring-violet-500/30"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                )}

                {props.onChange && (
                    <div
                        className="absolute bottom-2 right-2 opacity-0 w-2 h-2 bg-violet-500 rounded-full"
                        style={{
                            animation: 'none',
                        }}
                        id="textarea-ripple"
                    />
                )}
            </div>
        )
    }
)
Textarea.displayName = "Textarea"

interface AnimatedAIChatProps {
    inputValue: string;
    setInputValue: (value: string) => void;
    onSendMessage: () => void;
    isTyping?: boolean;
    messages?: any[];
    onStopGeneration?: () => void;
    chatMode: 'global' | 'campus';
    setChatMode: (mode: 'global' | 'campus') => void;
}

export function AnimatedAIChat({
    inputValue,
    setInputValue,
    onSendMessage,
    isTyping = false,
    messages = [],
    onStopGeneration,
    chatMode,
    setChatMode
}: AnimatedAIChatProps) {
    const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [recentCommand, setRecentCommand] = useState<string | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 40,
        maxHeight: 200,
        value: inputValue,
    });
    const commandPaletteRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputContainerRef = useRef<HTMLDivElement>(null);

    const commandSuggestions: CommandSuggestion[] = [];

    useEffect(() => {
        if (inputValue.startsWith('/') && !inputValue.includes(' ')) {
            setShowCommandPalette(true);

            const matchingSuggestionIndex = commandSuggestions.findIndex(
                (cmd) => cmd.prefix.startsWith(inputValue)
            );

            if (matchingSuggestionIndex >= 0) setActiveSuggestion(matchingSuggestionIndex);
            else setActiveSuggestion(-1);
        } else {
            setShowCommandPalette(false);
        }
    }, [inputValue]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const commandButton = document.querySelector('[data-command-button]');

            // Handle Command Palette
            if (commandPaletteRef.current &&
                !commandPaletteRef.current.contains(target) &&
                !commandButton?.contains(target)) {
                setShowCommandPalette(false);
            }

            // Chat bar stays open once clicked - never collapses
            // Removed auto-collapse behavior
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isTyping]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showCommandPalette) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestion(prev => prev < commandSuggestions.length - 1 ? prev + 1 : 0);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestion(prev => prev > 0 ? prev - 1 : commandSuggestions.length - 1);
            } else if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                if (activeSuggestion >= 0) {
                    const selectedCommand = commandSuggestions[activeSuggestion];
                    setInputValue(selectedCommand.prefix + ' ');
                    setShowCommandPalette(false);

                    setRecentCommand(selectedCommand.label);
                    setTimeout(() => setRecentCommand(null), 3500);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowCommandPalette(false);
            }
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (inputValue.trim()) {
                onSendMessage();
                // Keep input expanded, just adjust height without resetting
                setTimeout(() => adjustHeight(true), 0);
            }
        }
    };

    const selectCommandSuggestion = (index: number) => {
        const selectedCommand = commandSuggestions[index];
        setInputValue(selectedCommand.prefix + ' ');
        setShowCommandPalette(false);

        setRecentCommand(selectedCommand.label);
        setTimeout(() => setRecentCommand(null), 2000);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="flex flex-col w-full h-full bg-transparent text-foreground relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse dark:bg-violet-500/20" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700 dark:bg-indigo-500/20" />
                <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000 dark:bg-fuchsia-500/20" />
            </div>

            {/* Messages Area */}
            {messages && messages.length > 0 ? (
                <ScrollArea className="flex-1 w-full relative z-10">
                    <div className="max-w-3xl mx-auto flex flex-col gap-6 py-10 px-4 pb-40">
                        {messages.map((msg, index) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex w-full animate-in fade-in slide-in-from-bottom-5 duration-500 ease-out",
                                    msg.role === "user" ? "justify-end" : "justify-start"
                                )}
                            >
                                {msg.role === "user" ? (
                                    <div className="bg-primary text-primary-foreground px-5 py-3 rounded-2xl max-w-[80%] text-base shadow-sm">
                                        {msg.content}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2 max-w-[90%] group">
                                        {isTyping && index === messages.length - 1 && !msg.content && (
                                            <div className="flex items-center gap-2 mb-1 pl-1">
                                                <span className="text-sm text-muted-foreground">Thinking</span>
                                                <TypingDots />
                                            </div>
                                        )}
                                        <div className="text-foreground text-base leading-relaxed pl-1">
                                            {msg.content}
                                        </div>
                                        {(!isTyping || index !== messages.length - 1) && (
                                            <div className="flex items-center gap-2 pl-1 mt-1">
                                                {/* Sources Dialog */}
                                                {msg.grounding && msg.grounding.length > 0 && (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10">
                                                                <BookOpen className="w-3.5 h-3.5" />
                                                                Sources
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                            <DialogHeader>
                                                                <DialogTitle>Grounding Sources</DialogTitle>
                                                                <DialogDescription>Information sources used to generate this response.</DialogDescription>
                                                            </DialogHeader>
                                                            <div className="space-y-4 mt-4">
                                                                {msg.storesUsed && msg.storesUsed.length > 0 && (
                                                                    <div>
                                                                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Data Stores</h4>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {msg.storesUsed.map((store: any, i: number) => (
                                                                                <span key={i} className="px-2 py-1 bg-secondary rounded-md text-xs font-mono">{store}</span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Grounding Data</h4>
                                                                    <div className="space-y-3">
                                                                        {msg.grounding.map((ground: any, i: number) => (
                                                                            <div key={i} className="p-3 bg-muted/50 rounded-lg text-sm border border-border/50">{ground}</div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background/50 rounded-md transition-colors"
                                                    onClick={() => handleCopy(msg.content)}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                    <span className="sr-only">Copy</span>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {/* Typing Indicator at bottom */}
                        {isTyping && messages[messages.length - 1]?.role === "user" && (
                            <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-5 duration-500">
                                <div className="flex gap-4 max-w-[90%] pl-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Thinking</span>
                                        <TypingDots />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center relative z-10 pb-32">
                    <motion.div
                        className="text-center space-y-3 mb-8"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                        <motion.div
                            className="inline-block"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        >
                            <h1 className="text-3xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/50">
                                How can I help you today?
                            </h1>
                        </motion.div>

                    </motion.div>
                </div>
            )}

            {/* Input Area */}
            <div className="absolute left-0 right-0 w-full mx-auto z-20 px-4 max-w-3xl transition-all duration-500 ease-in-out bottom-0 pb-6">
                <motion.div
                    ref={inputContainerRef}
                    className="relative backdrop-blur-2xl bg-background/80 rounded-[24px] border border-border/50 shadow-2xl overflow-hidden transition-all duration-500"
                    layout
                >
                    <AnimatePresence>
                        {showCommandPalette && (
                            <motion.div
                                ref={commandPaletteRef}
                                className="absolute left-4 right-4 bottom-full mb-2 backdrop-blur-xl bg-popover/90 rounded-lg z-50 shadow-lg border border-border overflow-hidden"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div className="py-1 bg-popover/95">
                                    {commandSuggestions.map((suggestion, index) => (
                                        <motion.div
                                            key={suggestion.prefix}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer",
                                                activeSuggestion === index
                                                    ? "bg-accent text-accent-foreground"
                                                    : "text-muted-foreground hover:bg-accent/50"
                                            )}
                                            onClick={() => selectCommandSuggestion(index)}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.03 }}
                                        >
                                            <div className="w-5 h-5 flex items-center justify-center text-muted-foreground">
                                                {suggestion.icon}
                                            </div>
                                            <div className="font-medium">{suggestion.label}</div>
                                            <div className="text-muted-foreground/60 text-xs ml-1">
                                                {suggestion.prefix}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Textarea and buttons */}
                    <div className="relative p-1.5 pl-3">

                        {/* Expanded View (Always visible) */}
                        <motion.div
                            className="flex flex-col items-stretch gap-2"
                        >
                            <Textarea
                                ref={textareaRef}
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    adjustHeight();
                                }}
                                onFocus={() => {
                                    setTimeout(() => adjustHeight(), 50);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder={chatMode === 'campus' ? "Search campus resources..." : "Ask anything..."}
                                containerClassName="w-full"
                                disabled={isTyping}
                                className="w-full px-2 py-2 resize-none bg-transparent border-none text-foreground text-sm focus:outline-none flex items-center transition-all min-h-[40px]"
                                style={{ overflow: "hidden" }}
                                showRing={false}
                            />

                            <div className={cn(
                                "flex items-center justify-between transition-all duration-500 ease-out overflow-hidden w-full"
                            )}>
                                {/* Left Side: Search Mode Pills */}
                                <div className={cn(
                                    "flex items-center gap-2 transition-all duration-500 ease-out overflow-hidden"
                                )}>
                                    <button
                                        type="button"
                                        onClick={() => setChatMode('campus')}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border",
                                            chatMode === 'campus'
                                                ? "bg-indigo-600 text-white border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)] ring-1 ring-indigo-400/20"
                                                : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-foreground"
                                        )}
                                    >
                                        <Search className="w-4 h-4" />
                                        <span>Campus Search</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setChatMode('global')}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border",
                                            chatMode === 'global'
                                                ? "bg-indigo-600 text-white border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)] ring-1 ring-indigo-400/20"
                                                : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-foreground"
                                        )}
                                    >
                                        <Globe className="w-4 h-4" />
                                        <span>Global Search</span>
                                    </button>
                                </div>

                                {/* Right Side: Send Button */}
                                <div className={cn("flex items-center gap-3 transition-all duration-300 ml-auto")}>
                                    <motion.button
                                        type="button"
                                        onClick={() => {
                                            if (isTyping) {
                                                onStopGeneration?.();
                                            } else if (inputValue.trim()) {
                                                onSendMessage();
                                                // Keep input expanded, just adjust height without resetting
                                                setTimeout(() => adjustHeight(true), 0);
                                            }
                                        }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        disabled={!isTyping && !inputValue.trim()}
                                        className={cn(
                                            "rounded-full w-9 h-9 flex items-center justify-center transition-all shadow-lg",
                                            inputValue.trim() || isTyping
                                                ? "bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                                : "bg-muted text-muted-foreground hover:bg-muted/80 shadow-none opacity-50"
                                        )}
                                    >
                                        {isTyping ? (
                                            <Square className="w-3.5 h-3.5 fill-current" />
                                        ) : (
                                            <ArrowUp className="w-5 h-5 stroke-[2.5px]" />
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>

            <AnimatePresence>
                {isTyping && messages.length === 0 && (
                    <motion.div
                        className="fixed bottom-32 left-1/2 transform -translate-x-1/2 backdrop-blur-2xl bg-background/80 rounded-full px-4 py-2 shadow-lg border border-border z-30"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-7 rounded-full bg-primary/10 flex items-center justify-center text-center">
                                <span className="text-xs font-medium text-primary mb-0.5">zap</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Thinking</span>
                                <TypingDots />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TypingDots() {
    return (
        <div className="flex items-center ml-1">
            {[1, 2, 3].map((dot) => (
                <motion.div
                    key={dot}
                    className="w-1.5 h-1.5 bg-foreground/90 rounded-full mx-0.5"
                    initial={{ opacity: 0.3 }}
                    animate={{
                        opacity: [0.3, 0.9, 0.3],
                        scale: [0.85, 1.1, 0.85]
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: dot * 0.15,
                        ease: "easeInOut",
                    }}
                    style={{
                        boxShadow: "0 0 4px rgba(255, 255, 255, 0.3)"
                    }}
                />
            ))}
        </div>
    );
}
