import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { User, Moon, Check, X, Zap, FileText } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { studentApi } from "@/lib/api";

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    variant?: 'admin' | 'user';
    onViewMyPosts?: () => void;
}

export function SettingsDialog({ open, onOpenChange, variant = 'admin', onViewMyPosts }: SettingsDialogProps) {
    const { theme, setTheme } = useTheme();

    // Student Profile State
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // Load student data when dialog opens
    useEffect(() => {
        if (open && variant === 'user') {
            const loadProfile = async () => {
                const cachedData = localStorage.getItem("studentData");
                if (cachedData) {
                    const parsed = JSON.parse(cachedData);
                    setProfile(parsed);

                    // Fetch fresh data if we have email
                    if (parsed.email) {
                        try {
                            const freshData = await studentApi.getProfile(parsed.email);
                            setProfile(freshData);
                            localStorage.setItem("studentData", JSON.stringify(freshData));
                        } catch (error) {
                            console.error("Failed to refresh profile in settings", error);
                        }
                    }
                }
            };
            loadProfile();
        }
    }, [open, variant]);

    // Admin State (Keep existing logic for admin)
    const [adminName, setAdminName] = useState(() => localStorage.getItem("userFullName") || "Admin User");
    const [adminEmail, setAdminEmail] = useState(() => localStorage.getItem("userEmail") || "admin@localgov.in");

    // Helper to get initials
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[700px] p-0 overflow-hidden glass-panel flex gap-0 sm:rounded-xl shadow-2xl transition-all duration-300">
                <DialogTitle className="sr-only">Settings</DialogTitle>

                <Tabs defaultValue="account" orientation="vertical" className="flex h-full w-full">
                    {/* Sidebar */}
                    <div className="w-64 bg-muted/10 border-r border-border/40 flex flex-col gap-2 shrink-0 py-6">
                        <div className="px-6 mb-4">
                            <h2 className="text-xl font-bold tracking-tight">Settings</h2>
                        </div>
                        <TabsList className="flex flex-col h-auto bg-transparent space-y-1 p-0 px-3">
                            <TabsTrigger
                                value="account"
                                className="w-full justify-start px-3 py-2.5 h-auto text-sm font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-lg transition-colors"
                            >
                                <User className="w-4 h-4 mr-3" /> Account
                            </TabsTrigger>
                            {variant === 'user' && (
                                <TabsTrigger
                                    value="social-posts"
                                    className="w-full justify-start px-3 py-2.5 h-auto text-sm font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-lg transition-colors"
                                >
                                    <FileText className="w-4 h-4 mr-3" /> Social Media Posts
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto bg-background">
                        <TabsContent value="account" className="m-0 p-0 h-full animate-in fade-in duration-300 slide-in-from-right-4">
                            <div className="p-8 max-w-3xl mx-auto space-y-8">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h1 className="text-3xl font-bold tracking-tight">Your account</h1>
                                        <p className="text-muted-foreground text-lg">Manage your account information.</p>
                                    </div>
                                    <Avatar className="h-16 w-16 border-2 border-border/50">
                                        <AvatarImage src="" />
                                        <AvatarFallback className="text-xl bg-primary/10 text-primary font-semibold">
                                            {variant === 'user' && profile?.name ? getInitials(profile.name) : 'AD'}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>

                                <div className="space-y-6">
                                    {/* Full Name */}
                                    <div className="group flex items-center justify-between py-4 border-b border-border/40 min-h-[72px]">
                                        <div className="space-y-1 flex-1 mr-4">
                                            <Label className="text-sm font-medium text-muted-foreground">Full name</Label>
                                            <p className="text-base font-medium">
                                                {variant === 'user' ? profile?.name || 'Loading...' : adminName}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="group flex items-center justify-between py-4 border-b border-border/40 min-h-[72px]">
                                        <div className="space-y-1 flex-1 mr-4">
                                            <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                                            <p className="text-base font-medium">
                                                {variant === 'user' ? profile?.email || 'Loading...' : adminEmail}
                                            </p>
                                        </div>
                                    </div>

                                    {variant === 'user' && profile && (
                                        <>
                                            {/* University */}
                                            <div className="group flex items-center justify-between py-4 border-b border-border/40 min-h-[72px]">
                                                <div className="space-y-1 flex-1 mr-4">
                                                    <Label className="text-sm font-medium text-muted-foreground">University</Label>
                                                    <p className="text-base font-medium">{profile.universityName}</p>
                                                </div>
                                            </div>

                                            {/* Department */}
                                            <div className="group flex items-center justify-between py-4 border-b border-border/40 min-h-[72px]">
                                                <div className="space-y-1 flex-1 mr-4">
                                                    <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                                                    <p className="text-base font-medium">
                                                        {profile.selectedNonPrimaryAccount?.accountName || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Student ID */}
                                            <div className="group flex items-center justify-between py-4 border-b border-border/40 min-h-[72px]">
                                                <div className="space-y-1 flex-1 mr-4">
                                                    <Label className="text-sm font-medium text-muted-foreground">Student ID</Label>
                                                    <p className="text-base font-medium font-mono text-muted-foreground">
                                                        {profile.studentId || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Fallback Location Fields (Static or Default if not in API) */}
                                            {/* The user requested Profile API integration. The API doesn't return City/State/Pincode directly. 
                                                I will verify if I should show these. The user's image shows them.
                                                If I don't have them, I can show N/A or hide them. 
                                                I'll hide them to avoid "N/A" clutter unless requested to mock them.
                                            */}
                                        </>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        {variant === 'user' && (
                            <TabsContent value="social-posts" className="m-0 p-0 h-full animate-in fade-in duration-300 slide-in-from-right-4">
                                <div className="p-8 max-w-3xl mx-auto space-y-8">
                                    <div className="space-y-1">
                                        <h1 className="text-3xl font-bold tracking-tight">Social Media Posts</h1>
                                        <p className="text-muted-foreground text-lg">Manage your community contributions.</p>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="bg-card/50 p-6 rounded-xl border border-border/50">
                                            <p className="text-base mb-4">View and manage all the posts you have shared with the community.</p>
                                            <Button onClick={() => {
                                                if (onViewMyPosts) {
                                                    onViewMyPosts();
                                                }
                                                onOpenChange(false);
                                            }}>
                                                View My Posts in Community
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        )}
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
