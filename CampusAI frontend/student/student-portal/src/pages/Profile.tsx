import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { User, Mail, School, Building, X, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { GlowingCard } from "@/components/ui/glowing-card";
import { studentApi } from "@/lib/api";

const Profile = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    // We'll trust the interface from api.ts
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const loadProfile = async () => {
            const cachedData = localStorage.getItem("studentData");

            if (cachedData) {
                setProfile(JSON.parse(cachedData));
            } else {
                // If no data, redirect to login
                navigate("/login");
                return;
            }

            // Fetch fresh data in background
            try {
                const parsedData = JSON.parse(cachedData || "{}");
                if (parsedData.email) {
                    const freshData = await studentApi.getProfile(parsedData.email);
                    setProfile(freshData);
                    localStorage.setItem("studentData", JSON.stringify(freshData));
                }
            } catch (error) {
                console.error("Failed to refresh profile", error);
                // Keep showing cached data
            }
        };

        loadProfile();
    }, [navigate]);

    if (!profile) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/60 px-6 glass">
                        <SidebarTrigger />
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-primary">{profile.selectedNonPrimaryAccount?.accountName || "Student"}</span>
                            <span className="text-muted-foreground">•</span>
                            <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
                        </div>
                        <div className="flex-1" />
                        <ThemeToggle />
                    </header>

                    <main className="flex-1 p-6 animate-fade-in">
                        <div className="max-w-2xl mx-auto">
                            <GlowingCard className="shadow-lg p-0">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-2xl font-bold">Student Profile</CardTitle>
                                        <p className="text-sm text-muted-foreground">{profile.universityName}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-center mb-8">
                                            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                                                <User className="h-12 w-12 text-primary" />
                                            </div>
                                        </div>

                                        <div className="grid gap-6">
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    Full Name
                                                </Label>
                                                <Input value={profile.name} disabled className="bg-muted" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    Email Address
                                                </Label>
                                                <Input value={profile.email} disabled className="bg-muted" />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        <School className="h-4 w-4 text-muted-foreground" />
                                                        University
                                                    </Label>
                                                    <Input
                                                        value={profile.universityName}
                                                        disabled
                                                        className="bg-muted"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        <Building className="h-4 w-4 text-muted-foreground" />
                                                        Department (Non-Primary)
                                                    </Label>
                                                    <Input
                                                        value={profile.selectedNonPrimaryAccount?.accountName}
                                                        disabled
                                                        className="bg-muted"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2">
                                                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                                                    Student ID
                                                </Label>
                                                <Input
                                                    value={profile.studentId}
                                                    disabled
                                                    className="bg-muted font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </GlowingCard>
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
};

export default Profile;
