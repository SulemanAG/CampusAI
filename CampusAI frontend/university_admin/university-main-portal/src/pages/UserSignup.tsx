import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ArrowLeft, Check, Building2, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SignupStep = "credentials" | "university_details" | "success";

const UserSignup = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState<SignupStep>("credentials");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const universityId = localStorage.getItem("universityId");
        if (universityId) {
            navigate('/dashboard');
        }
    }, [navigate]);

    // Form state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // University Details
    const [universityName, setUniversityName] = useState("");
    const [universityType, setUniversityType] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [country, setCountry] = useState("");
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [establishedDate, setEstablishedDate] = useState("");
    const [emailExtension, setEmailExtension] = useState("");

    const universityTypes = [
        "Public",
        "Private",
        "Government",
        "Deemed",
        "Autonomous"
    ];

    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`https://campusai-916628151603.asia-south1.run.app/university/register/initiate?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok) {
                toast({
                    title: "Success",
                    description: data.message || "Initial registration successful.",
                });
                setCurrentStep("university_details");
            } else {
                toast({
                    title: "Registration Failed",
                    description: data.error || "An error occurred during registration.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Network Error",
                description: "Unable to connect to the server. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUniversityDetailsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const params = new URLSearchParams({
                email,
                universityName,
                universityType,
                city,
                state,
                country,
                websiteUrl,
                establishedDate,
                studentEmailExtension: emailExtension, // Mapping emailExtension to studentEmailExtension
                description: "Premier institute", // Adding optional fields as placeholders or from state if they existed
                phoneNumber: "", // Optional
                accreditation: "" // Optional
            });

            const response = await fetch(`https://campusai-916628151603.asia-south1.run.app/university/register/complete?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok) {
                // Cache everything as requested
                localStorage.setItem("universityData", JSON.stringify(data.university));
                localStorage.setItem("universityId", data.universityId);

                setCurrentStep("success");
                toast({
                    title: "Success",
                    description: data.message || "University registered successfully.",
                });
            } else {
                toast({
                    title: "Registration Failed",
                    description: data.error || "Please check your details and try again.",
                    variant: "destructive",
                });
            }

        } catch (error) {
            toast({
                title: "Network Error",
                description: "Failed to connect to the server.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case "credentials":
                return (
                    <form onSubmit={handleCredentialsSubmit} className="space-y-4">
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
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Create a strong password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Validating..." : "Next Step"}
                        </Button>
                    </form>
                );

            case "university_details":
                return (
                    <form onSubmit={handleUniversityDetailsSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="uniName">University Name</Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="uniName"
                                    className="pl-9"
                                    placeholder="e.g. KLE Technological University"
                                    value={universityName}
                                    onChange={(e) => setUniversityName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="uniType">University Type</Label>
                            <Select value={universityType} onValueChange={setUniversityType} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Type / Program Focus" />
                                </SelectTrigger>
                                <SelectContent>
                                    {universityTypes.map((t) => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    placeholder="Hubli"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input
                                    id="state"
                                    placeholder="Karnataka"
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Input
                                id="country"
                                placeholder="India"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="website">University Website URL</Label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="website"
                                    className="pl-9"
                                    type="url"
                                    placeholder="https://kletech.ac.in"
                                    value={websiteUrl}
                                    onChange={(e) => setWebsiteUrl(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="estDate">Established Date</Label>
                                <Input
                                    id="estDate"
                                    type="date"
                                    value={establishedDate}
                                    onChange={(e) => setEstablishedDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="emailExt">Student ID Extension</Label>
                                <Input
                                    id="emailExt"
                                    placeholder="@kletech.ac.in"
                                    value={emailExtension}
                                    onChange={(e) => setEmailExtension(e.target.value)}
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground">Used to verify student emails later</p>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Registering..." : "Complete Registration"}
                        </Button>
                    </form>
                );

            case "success":
                return (
                    <div className="flex flex-col items-center justify-center p-6 space-y-6 text-center animate-fade-in">
                        <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/20">
                            <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-foreground">Welcome Aboard!</h3>
                            <p className="text-muted-foreground">
                                <span className="font-semibold text-foreground">{universityName}</span> has been successfully registered. You can now login to the admin dashboard.
                            </p>
                        </div>
                        <Button
                            onClick={() => navigate("/user-login")}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11"
                        >
                            Proceed to Login
                        </Button>
                    </div>
                );

            default:
                return null;
        }
    };

    const getStepTitle = () => {
        switch (currentStep) {
            case "credentials": return "Admin Credentials";
            case "university_details": return "University Details";
            case "success": return "Registration Complete";
            default: return "";
        }
    };

    const getStepDescription = () => {
        switch (currentStep) {
            case "credentials": return "Create your administrator account";
            case "university_details": return "Enter official university information";
            case "success": return "Account created successfully";
            default: return "";
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 bg-dot-black/[0.1] dark:bg-dot-white/[0.1]">
            <div className="w-full max-w-lg space-y-6 relative z-10">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        <div className="rounded-full bg-primary/10 p-4 ring-1 ring-primary/20">
                            <Shield className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight font-montserrat">University Registration</h1>
                    <p className="text-muted-foreground">
                        Join the Smart Campus network
                    </p>
                </div>

                {/* Step Indicator */}
                <div className="flex justify-center gap-2 mb-8">
                    {["credentials", "university_details", "success"].map((step, index) => {
                        const stepsOrder = ["credentials", "university_details", "success"];
                        const currentIndex = stepsOrder.indexOf(currentStep);
                        const stepIndex = stepsOrder.indexOf(step);
                        const isCompleted = currentIndex > stepIndex;
                        const isCurrent = currentIndex === stepIndex;

                        return (
                            <div key={step} className="flex items-center">
                                <div
                                    className={`h-2.5 rounded-full transition-all duration-500 ${isCompleted || isCurrent ? "w-12 bg-primary" : "w-8 bg-muted"
                                        }`}
                                />
                                {index < 2 && <div className="w-2" />}
                            </div>
                        );
                    })}
                </div>

                {/* Form Card */}
                <Card className="w-full border-border/40 bg-card/95 backdrop-blur shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl">{getStepTitle()}</CardTitle>
                        <CardDescription>{getStepDescription()}</CardDescription>
                    </CardHeader>
                    <CardContent>{renderStepContent()}</CardContent>
                </Card>

                {/* Navigation Footer */}
                {currentStep !== "success" && (
                    <div className="text-center space-y-4">
                        {currentStep === "credentials" && (
                            <p className="text-sm text-muted-foreground">
                                Already registered?{" "}
                                <Button
                                    variant="link"
                                    className="p-0 h-auto font-medium text-primary hover:text-primary/80"
                                    onClick={() => navigate("/user-login")}
                                >
                                    Admin Login
                                </Button>
                            </p>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => {
                                if (currentStep === "university_details") setCurrentStep("credentials");
                                else navigate("/");
                            }}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {currentStep === "university_details" ? "Back to Step 1" : "Back to Home"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserSignup;
