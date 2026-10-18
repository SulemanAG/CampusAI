import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlowingCard } from "@/components/ui/glowing-card";
import { Shield, ArrowLeft, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const UserLogin = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const universityId = localStorage.getItem("universityId");
        if (universityId) {
            navigate('/dashboard');
        }
    }, [navigate]);


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast({
                title: "Error",
                description: "Please fill in all fields",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const params = new URLSearchParams({
                email,
                password,
                loginType: 'admin'
            });

            const response = await fetch(`https://campusai-916628151603.asia-south1.run.app/university/login?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok) {
                // Login successful
                console.log("Admin login successful...");
                localStorage.setItem("universityId", data.data.universityId);
                localStorage.setItem("universityData", JSON.stringify(data.data));

                toast({
                    title: "Welcome Back",
                    description: "Logged in as University Administrator",
                });
                navigate("/dashboard");
            } else {
                toast({
                    title: "Login Failed",
                    description: data.error || "Invalid credentials",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Login error:", error);
            toast({
                title: "Error",
                description: "Something went wrong. Please try again later.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 bg-dot-black/[0.1] dark:bg-dot-white/[0.1]">
            <div className="w-full max-w-md space-y-6 relative z-10">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        <div className="rounded-full bg-primary/10 p-4 ring-1 ring-primary/20">
                            <Shield className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight font-montserrat">Admin Login</h1>
                    <p className="text-muted-foreground">
                        Secure access for university administrators
                    </p>
                </div>

                {/* Login Card */}
                <GlowingCard className="p-0 border-border/40 bg-card/95 backdrop-blur">
                    <CardHeader>
                        <CardTitle>Login</CardTitle>
                        <CardDescription>Manage your university campus</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Admin Email ID</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@university.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <Button variant="link" className="p-0 h-auto text-xs" type="button">Forgot password?</Button>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        className="pl-9"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Authenticating..." : "Login to Dashboard"}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                New University?{" "}
                                <Button
                                    variant="link"
                                    className="p-0 h-auto font-medium text-primary hover:text-primary/80"
                                    onClick={() => navigate("/user-signup")}
                                >
                                    Register University
                                </Button>
                            </p>
                        </div>
                    </CardContent>
                </GlowingCard>

                {/* Back to Home */}
                <div className="text-center">
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/")}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Home
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default UserLogin;
