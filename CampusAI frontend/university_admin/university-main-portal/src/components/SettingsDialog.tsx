import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    BarChart3,
    Zap,
    Globe,
    Bot,
    ChevronRight,
    TrendingUp,
    Activity,
    Building2
} from "lucide-react";
import { UniversityProfileSection } from "./UniversityProfileSection";
import { useToast } from "@/hooks/use-toast";

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type SettingsTab = "analytics" | "automation" | "account";

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<SettingsTab>("account");
    const [isReadingWebsite, setIsReadingWebsite] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [universityEmail, setUniversityEmail] = useState("");

    useEffect(() => {
        if (open) {
            const data = localStorage.getItem("universityData");
            if (data) {
                try {
                    const parsedData = JSON.parse(data);
                    setIsReadingWebsite(!!parsedData.read_website);
                    setUniversityEmail(parsedData.email || "");
                } catch (e) {
                    console.error("Failed to parse university data", e);
                }
            }
        }
    }, [open]);

    const handleToggleWebsite = async (checked: boolean) => {
        if (!universityEmail) {
            toast({
                title: "Error",
                description: "University email not found. Please re-login.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        // Optimistic update
        const previousState = isReadingWebsite;
        setIsReadingWebsite(checked);

        try {
            // Use update-profile to explicitly set the value avoids sync issues with toggle endpoint
            const response = await fetch(`https://campusai-916628151603.asia-south1.run.app/university/update-profile?email=${encodeURIComponent(universityEmail)}&read_website=${checked}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok) {
                // Update local storage
                const localData = localStorage.getItem("universityData");
                if (localData) {
                    const parsed = JSON.parse(localData);
                    parsed.read_website = checked;
                    localStorage.setItem("universityData", JSON.stringify(parsed));
                }

                toast({
                    title: checked ? "Website Access Enabled" : "Website Access Disabled",
                    description: "University website crawling setting updated.",
                });
            } else {
                throw new Error(data.error || "Update failed");
            }
        } catch (error) {
            // Revert on failure
            setIsReadingWebsite(previousState);
            toast({
                title: "Action Failed",
                description: "Failed to update setting. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[600px] bg-background/95 backdrop-blur-3xl border-border/40 p-0 overflow-hidden text-foreground flex gap-0 shadow-2xl">

                {/* Sidebar */}
                <div className="w-64 bg-muted/20 border-r border-border/40 flex flex-col p-4">
                    <div className="mb-8 pl-2">
                        <h2 className="text-xl font-bold tracking-tight">Settings</h2>
                    </div>

                    <nav className="space-y-1">
                        <Button
                            variant={activeTab === "account" ? "secondary" : "ghost"}
                            className={`w-full justify-start h-10 px-4 font-medium transition-all ${activeTab === "account"
                                ? "bg-primary/10 text-primary hover:bg-primary/15"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                }`}
                            onClick={() => setActiveTab("account")}
                        >
                            <Building2 className="mr-3 h-4 w-4" />
                            Profile
                        </Button>

                        <Button
                            variant={activeTab === "analytics" ? "secondary" : "ghost"}
                            className={`w-full justify-start h-10 px-4 font-medium transition-all ${activeTab === "analytics"
                                ? "bg-primary/10 text-primary hover:bg-primary/15"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                }`}
                            onClick={() => setActiveTab("analytics")}
                        >
                            <BarChart3 className="mr-3 h-4 w-4" />
                            Analytics
                        </Button>

                        <Button
                            variant={activeTab === "automation" ? "secondary" : "ghost"}
                            className={`w-full justify-start h-10 px-4 font-medium transition-all ${activeTab === "automation"
                                ? "bg-primary/10 text-primary hover:bg-primary/15"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                }`}
                            onClick={() => setActiveTab("automation")}
                        >
                            <Zap className="mr-3 h-4 w-4" />
                            Automation
                        </Button>
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="h-full overflow-y-auto p-8">
                        {activeTab === "account" && (
                            <UniversityProfileSection email={universityEmail} />
                        )}

                        {activeTab === "analytics" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="mb-6">
                                    <h3 className="text-2xl font-semibold tracking-tight mb-2">Analytics</h3>
                                    <p className="text-muted-foreground">Monitor the performance of your AI agents.</p>
                                </div>

                                {/* Dummy Analytics Content */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 rounded-xl bg-card border border-border/40 shadow-sm flex flex-col justify-between h-32">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-sm font-medium">Total Interactions</span>
                                            <Activity className="h-4 w-4 text-primary opacity-70" />
                                        </div>
                                        <div className="text-3xl font-bold">12,453</div>
                                    </div>
                                    <div className="p-6 rounded-xl bg-card border border-border/40 shadow-sm flex flex-col justify-between h-32">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-sm font-medium">Success Rate</span>
                                            <TrendingUp className="h-4 w-4 text-green-500 opacity-70" />
                                        </div>
                                        <div className="text-3xl font-bold">98.2%</div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border/40 bg-card/50 p-8 flex items-center justify-center h-64 border-dashed">
                                    <div className="text-center space-y-2">
                                        <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                                        <p className="text-muted-foreground font-medium">Detailed charts coming soon</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "automation" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="mb-6">
                                    <h3 className="text-2xl font-semibold tracking-tight mb-2">Automation</h3>
                                    <p className="text-muted-foreground">Manage your automation settings.</p>
                                </div>

                                <div className="space-y-4">
                                    {/* Option 1: Read Official Website */}
                                    <div className="flex items-center justify-between p-5 rounded-xl border border-border/40 bg-card hover:bg-card/80 transition-colors">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Globe className="h-4 w-4 text-primary" />
                                                <span className="font-medium text-foreground">Allow reading your official website</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground max-w-sm">
                                                Grant AI access to crawl and learn from your official university website content automatically.
                                            </p>
                                        </div>
                                        <div>
                                            <Switch
                                                checked={isReadingWebsite}
                                                onCheckedChange={handleToggleWebsite}
                                                disabled={isLoading}
                                                aria-label="Toggle website reading"
                                            />
                                        </div>
                                    </div>

                                    {/* Option 2: Add AI Agent */}
                                    <div className="flex items-center justify-between p-5 rounded-xl border border-border/40 bg-card hover:bg-card/80 transition-colors">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Bot className="h-4 w-4 text-purple-500" />
                                                <span className="font-medium text-foreground">Add AI agent to your official website</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground max-w-sm">
                                                Deploy your configured AI agent as a chat widget directly onto your student portal.
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm" className="gap-2">
                                            Configure <ChevronRight className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
