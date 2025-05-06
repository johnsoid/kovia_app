'use client';

import type { z as zod } from 'zod'; // Use import type for Zod type
import * as z from 'zod'; // Keep the runtime import
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Ensure auth is imported
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ClientOnlyWrapper } from '@/components/client-only-wrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { authSchema } from '@/lib/schemas/auth';

type AuthFormData = zod.infer<typeof authSchema>;

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  // No need for isAuthInitialized state anymore, firebase.ts handles sync init

  // Effect to check if auth object exists on mount (for debugging mostly)
  useEffect(() => {
    if (!auth) {
      const initErrorMsg = "Authentication service failed to initialize. Please check the configuration and environment variables (.env.local). Ensure NEXT_PUBLIC_FIREBASE_* variables are set correctly and restart the server.";
      console.error("AuthPage: Firebase Auth instance is not available. Initialization might have failed in firebase.ts.", {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Exists' : 'MISSING',
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Exists' : 'MISSING',
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Exists' : 'MISSING',
      });
      setAuthError(initErrorMsg);
      toast({
          title: "Initialization Error",
          description: initErrorMsg,
          variant: "destructive",
          duration: 15000, // Keep message longer
      });
    } else {
        console.log("AuthPage: Firebase Auth instance confirmed available.");
    }
  }, [toast]);


  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleAuth = async (data: AuthFormData, isSignUp: boolean) => {
    setIsLoading(true);
    setAuthError(null);

    console.log(`Attempting ${isSignUp ? 'sign up' : 'log in'} for:`, data.email);

    // Check if auth object is available right before the attempt.
    // This is crucial as initialization issues might occur.
    if (!auth) {
      console.error("Auth attempt failed: Firebase Auth is not initialized or available.");
      const errorMsg = "Authentication service is not ready. Cannot proceed. Please check logs and configuration.";
      setAuthError(errorMsg);
      toast({ title: "Auth Error", description: errorMsg, variant: "destructive" });
      setIsLoading(false);
      return;
    }


    try {
      if (isSignUp) {
        console.log("Calling createUserWithEmailAndPassword...");
        await createUserWithEmailAndPassword(auth, data.email, data.password);
        toast({
          title: "Account Created!",
          description: "Welcome to Kovia Connect.",
        });
      } else {
         console.log("Calling signInWithEmailAndPassword...");
        await signInWithEmailAndPassword(auth, data.email, data.password);
         toast({
          title: "Logged In Successfully!",
          description: "Welcome back.",
        });
      }
       console.log("Auth successful, redirecting...");
      router.push('/performer/dashboard'); // Redirect to performer dashboard after successful auth
    } catch (error: any) {
      console.error("Authentication error:", error);
       console.error("Error Code:", error.code);
       console.error("Error Message:", error.message);

      let errorMessage = "An unexpected error occurred. Please try again.";
       if (error.code) {
         switch (error.code) {
            case 'auth/configuration-not-found':
                 errorMessage = `Firebase Auth configuration error: The "Email/Password" sign-in method might be disabled. \n\nACTION REQUIRED: \n1. Go to your Firebase Console -> Authentication -> Sign-in method. \n2. Ensure "Email/Password" provider is ENABLED. \n3. Also verify your '.env.local' file has the correct NEXT_PUBLIC_FIREBASE_* variables. \n4. IMPORTANT: RESTART your development server (npm run dev) after checking settings or .env.local.`;
                console.error("CRITICAL CHECK: Firebase console authentication settings (Email/Password provider MUST be enabled) and .env.local variables (and server restart).");
                break;
           case 'auth/requires-recent-login':
                 errorMessage = 'Firebase requires recent login. Please log out and log back in. If the problem persists, check Firebase console & .env.local config.';
                 break;
           case 'auth/email-already-in-use':
             errorMessage = 'This email is already registered. Please log in.';
             break;
           case 'auth/invalid-email':
             errorMessage = 'Please enter a valid email address.';
             break;
           case 'auth/weak-password':
             errorMessage = 'Password is too weak. Please choose a stronger password.';
             break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = 'Invalid email or password.';
            break;
          case 'auth/network-request-failed':
             errorMessage = 'Network error. Please check your internet connection and Firebase status.';
             break;
           case 'auth/api-key-not-valid':
           case 'auth/invalid-api-key':
                errorMessage = 'Invalid Firebase API Key. Check your .env.local configuration (NEXT_PUBLIC_FIREBASE_API_KEY) and ensure it matches the key in your Firebase project settings. Restart the server after changes.';
                break;
           default:
            errorMessage = `Error: ${error.message} (${error.code || 'unknown code'})`;
         }
       }
      setAuthError(errorMessage);
      toast({
        title: "Authentication Failed",
        description: (<div className="whitespace-pre-wrap">{errorMessage}</div>), // Use pre-wrap for newlines
        variant: "destructive",
        duration: error.code === 'auth/configuration-not-found' || error.code === 'auth/invalid-api-key' ? 15000 : 10000, // Show longer for critical config errors
      })
    } finally {
      setIsLoading(false);
    }
  };

  const AuthFormFallback = () => (
     <Card className="w-full max-w-md">
       <CardHeader>
         <Skeleton className="h-8 w-2/5 mb-2" />
         <Skeleton className="h-4 w-4/5" />
       </CardHeader>
       <CardContent className="space-y-4">
         <Skeleton className="h-10 w-full" />
         <Skeleton className="h-10 w-full" />
       </CardContent>
       <CardFooter>
         <Skeleton className="h-10 w-full" />
       </CardFooter>
     </Card>
   );


  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary p-4">
       <ClientOnlyWrapper fallback={<AuthFormFallback />}>
            <Tabs defaultValue="login" className="w-full max-w-md">
                <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                <Card>
                    <CardHeader>
                    <CardTitle>Log In</CardTitle>
                    <CardDescription>Access your Kovia Connect account.</CardDescription>
                    </CardHeader>
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => handleAuth(data, false))} noValidate>
                        <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                <Input placeholder="you@example.com" {...field} type="email" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                <Input placeholder="••••••••" {...field} type="password" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         {/* Display general auth error */}
                         {authError && <p className="text-sm font-medium text-destructive whitespace-pre-wrap">{authError}</p>}
                        </CardContent>
                        <CardFooter>
                        {/* Disable button only while loading or if auth object is definitely null */}
                        <Button type="submit" className="w-full" disabled={isLoading || !auth}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {auth ? 'Log In' : 'Auth Unavailable'}
                        </Button>
                        </CardFooter>
                    </form>
                    </Form>
                </Card>
                </TabsContent>

                {/* Sign Up Tab */}
                <TabsContent value="signup">
                <Card>
                    <CardHeader>
                    <CardTitle>Sign Up</CardTitle>
                    <CardDescription>Create your Kovia Connect account.</CardDescription>
                    </CardHeader>
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => handleAuth(data, true))} noValidate>
                        <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                <Input placeholder="you@example.com" {...field} type="email" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                <Input placeholder="••••••••" {...field} type="password" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         {authError && <p className="text-sm font-medium text-destructive whitespace-pre-wrap">{authError}</p>}
                        </CardContent>
                        <CardFooter>
                         {/* Disable button only while loading or if auth object is definitely null */}
                        <Button type="submit" className="w-full" disabled={isLoading || !auth}>
                           {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           {auth ? 'Sign Up' : 'Auth Unavailable'}
                        </Button>
                        </CardFooter>
                    </form>
                    </Form>
                </Card>
                </TabsContent>
            </Tabs>
       </ClientOnlyWrapper>
    </div>
  );
}
