import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, PanelLeft } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface UnifiedHeaderProps {
    title: string;
    subtitle?: string;
    onSidebarToggle?: () => void;
    isSidebarOpen?: boolean;
    showProfile?: boolean;
}

export const UnifiedHeader = ({ title, subtitle, showProfile = false, onSidebarToggle }: UnifiedHeaderProps) => {
    return (
        <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/60 px-6 glass backdrop-blur-xl transition-all duration-300">
            {onSidebarToggle ? (
                <Button variant="ghost" size="icon" onClick={onSidebarToggle} className="-ml-2 h-7 w-7">
                    <PanelLeft />
                </Button>
            ) : (
                <SidebarTrigger />
            )}

            <div className="flex items-center gap-2">
                {subtitle && (
                    <>
                        <span className="text-sm font-semibold text-primary">{subtitle}</span>
                        <span className="text-muted-foreground">•</span>
                    </>
                )}
                <h1 className="text-2xl font-bold tracking-tight">
                    {title}
                </h1>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-4">
                <ThemeToggle />

                {showProfile && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                <Avatar className="h-10 w-10 border border-border">
                                    <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                                    <AvatarFallback>AD</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">Admin User</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        admin@university.edu
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
};
