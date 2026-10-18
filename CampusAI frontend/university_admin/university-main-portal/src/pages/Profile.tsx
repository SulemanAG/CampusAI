import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, MapPin, Building, X } from "lucide-react";
import { toast } from "sonner";
import { GlowingCard } from "@/components/ui/glowing-card";

const Profile = () => {
    const navigate = useNavigate();
    const [userLocation, setUserLocation] = useState<{ state: string; city: string } | null>(null);
    const [userDepartment, setUserDepartment] = useState<string>("Department");

    const [profile, setProfile] = useState({
        name: "Official User",
        email: "official@gov.in",
        phone: "+91 98765 43210",
        department: "",
        location: ""
    });

    useEffect(() => {
        const userState = localStorage.getItem("userState");
        const userCity = localStorage.getItem("userCity");
        const dept = localStorage.getItem("userDepartment");

        if (userState && userCity) {
            setUserLocation({ state: userState, city: userCity });
        }

        if (dept) {
            const formattedDept = dept.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
            setUserDepartment(formattedDept);
            setProfile(prev => ({
                ...prev,
                department: formattedDept,
                location: userState && userCity ? `${userCity}, ${userState}` : "New Delhi, Delhi"
            }));
        }
    }, []);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success("Profile updated successfully");
    };

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-background">
                <AppSidebar />

                <div className="flex-1 flex flex-col">
                    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/60 px-6 glass">
                        <SidebarTrigger />
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-primary">{userDepartment}</span>
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
                                    <CardTitle className="text-2xl font-bold">My Profile</CardTitle>
                                    <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSave} className="space-y-6">
                                        <div className="flex items-center justify-center mb-8">
                                            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                                                <User className="h-12 w-12 text-primary" />
                                            </div>
                                        </div>

                                        <div className="grid gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    Full Name
                                                </Label>
                                                <Input
                                                    id="name"
                                                    value={profile.name}
                                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    Email Address
                                                </Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={profile.email}
                                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="phone" className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    Phone Number
                                                </Label>
                                                <Input
                                                    id="phone"
                                                    value={profile.phone}
                                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor="department" className="flex items-center gap-2">
                                                        <Building className="h-4 w-4 text-muted-foreground" />
                                                        Department
                                                    </Label>
                                                    <Input
                                                        id="department"
                                                        value={profile.department}
                                                        disabled
                                                        className="bg-muted"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="location" className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                                        Location
                                                    </Label>
                                                    <Input
                                                        id="location"
                                                        value={profile.location}
                                                        disabled
                                                        className="bg-muted"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <Button type="submit" size="lg" className="w-full md:w-auto">
                                                Save Changes
                                            </Button>
                                        </div>
                                    </form>
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
