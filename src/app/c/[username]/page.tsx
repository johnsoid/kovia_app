'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable, FunctionsError } from 'firebase/functions';
import { functions as functionsInstance } from '@/lib/firebase';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, User } from 'lucide-react';
import Image from 'next/image'; // Using next/image for potential optimization
import { getZipCodeInfo } from '@/services/zip-code'; // Import zip code service
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(), // Assuming phone is optional
  zip: z.string().regex(/^\d{5}$/, "Must be a 5-digit ZIP code").optional().or(z.literal('')), // Optional 5-digit zip
});

type ContactFormData = z.infer<typeof contactSchema>;

interface PerformerData {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  socials?: { label: string; url: string }[];
  defaultRedirectUrl?: string;
  // Add other fields if needed, e.g., profile picture URL
}

export default function ContactCapturePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const username = params.username as string; // Extract username from URL
  const token = searchParams.get('token');
  const { toast } = useToast();
  const [performer, setPerformer] = useState<PerformerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [derivedState, setDerivedState] = useState<string>('');

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      zip: '',
    },
  });

  const fetchPerformer = useCallback(
    async (userName: string) => {
      if (!db) return;
      setIsLoading(true);
      try {
        const q = query(
          collection(db, 'performers'),
          where('userName', '==', userName)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const performerData = docSnap.data() as Omit<PerformerData, 'id'>;
          setPerformer({ id: docSnap.id, ...performerData });
        } else {
          setPerformer(null);
        }
      } catch (error) {
        console.error('[ContactCapture] Error fetching performer:', error);
        setPerformer(null);
      } finally {
        setIsLoading(false);
      }
    },
    [db]
  );

  const debouncedZipLookup = useCallback(
    (async (zip: string) => {
      if (zip && /^\d{5}$/.test(zip)) {
        try {
          const info = await getZipCodeInfo(zip);
          setDerivedState(info?.state || '');
        } catch (error) {
          console.error("Error fetching zip code info:", error);
          setDerivedState(''); // Clear state on error
          toast({ title: "ZIP Code Error", description: "Could not verify ZIP code.", variant: "destructive" })
        }
      } else {
        setDerivedState(''); // Clear state if zip is invalid or empty
      }
    }), [toast]
  );

  const onSubmit = useCallback(
    async (formData: ContactFormData) => {
      if (!functionsInstance || !performer || !username || !auth) {
        toast({ title: "Error", description: "Cannot submit form. System not ready.", variant: "destructive" });
        return;
      }
      setIsSubmitting(true);

      try {
        // 1. Ensure Anonymous Auth
        let user = auth.currentUser;
        if (!user) {
          console.log('[ContactCapture] Signing in anonymously...');
          const userCredential = await signInAnonymously(auth);
          user = userCredential.user;
          console.log('[ContactCapture] Signed in as:', user.uid);
        } else {
          console.log('[ContactCapture] Already signed in as:', user.uid);
        }

        // 2. Force Token Refresh to ensure we have a valid token for Cloud Run IAM
        // This handles cases where a stale emulator token might be cached
        const idToken = await user.getIdToken(true);
        console.log('[ContactCapture] ID Token refreshed. Ready to call function.');

        const payload = {
          ...formData,
          state: derivedState || '',
          targetUsername: username,
          token: token || undefined, // Pass the QR token in the body
        };

        console.log('[ContactCapture] Calling addContact Cloud Function with payload:', payload);
        const addContactFunction = httpsCallable<{
          firstName: string; lastName: string; email: string; phone?: string; zip?: string; state?: string; targetUsername: string; token?: string;
        },
          {
            success: boolean; message: string; contactId?: string; redirectUrl?: string; fieldErrors?: any;
          }>(functionsInstance, 'addContact');

        const result = await addContactFunction(payload);
        const responseData = result.data;

        console.log('[ContactCapture] Cloud Function response:', responseData);

        if (responseData.success) {
          setSubmitted(true);
          toast({ title: "Success!", description: responseData.message || "Your contact information has been saved." });

          const redirectUrl = responseData.redirectUrl;
          if (redirectUrl && typeof redirectUrl === 'string') {
            setTimeout(() => {
              window.location.href = redirectUrl;
            }, 2000);
          }
        } else {
          toast({
            title: "Submission Issue",
            description: responseData.message || "Could not save contact information.",
            variant: "destructive"
          });
        }
      } catch (error: any) {
        console.error('[ContactCapture] Error calling addContact Cloud Function:', error);
        let title = "Submission Error";
        let description = "An unexpected error occurred. Please try again.";

        if (error instanceof FunctionsError) {
          title = `Error (${error.code || 'Unknown'})`;
          description = error.message;
          if (error.details && typeof error.details === 'object') {
            const fieldErrors = error.details as Record<string, string[]>;
            let messages: string[] = [];
            for (const key in fieldErrors) {
              if (fieldErrors[key] && fieldErrors[key].length > 0) {
                messages.push(`${key}: ${fieldErrors[key].join(', ')}`);
              }
            }
            if (messages.length > 0) {
              description += "\n\nDetails:\n" + messages.join("\n");
            }
          }
        } else if (error.message) {
          description = error.message;
        }

        toast({
          title,
          description: (<div className="whitespace-pre-wrap">{description}</div>),
          variant: "destructive",
          duration: 10000
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [functionsInstance, performer, username, derivedState, toast]
  );

  useEffect(() => {
    fetchPerformer(username);
  }, [username]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'zip') {
        debouncedZipLookup(value.zip ?? '');
      }
    });
    return () => subscription.unsubscribe();
  }, [form, debouncedZipLookup]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-secondary p-4">
        <Skeleton className="w-full max-w-md h-96" />
      </div>
    );
  }

  if (!performer) {
    return (
      <p className="text-center text-muted-foreground">Performer not found.</p>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          {/* Placeholder for performer image - replace with actual image logic */}
          <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-muted flex items-center justify-center">
            <User className="h-12 w-12 text-muted-foreground" />
            {/* <Image src={performer.profileImageUrl || '/default-avatar.png'} alt={`${performer.firstName} ${performer.lastName}`} width={96} height={96} className="rounded-full object-cover" data-ai-hint="comedian portrait" /> */}
          </div>
          <CardTitle className="text-2xl">{`${performer.firstName} ${performer.lastName}`}</CardTitle>
          <CardDescription>Stay connected! Sign up for updates.</CardDescription>
        </CardHeader>

        {submitted ? (
          <CardContent className="text-center space-y-4 py-12">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <p className="text-xl font-medium">Thank You!</p>
            <p className="text-muted-foreground">Your information has been submitted.</p>
            {performer.defaultRedirectUrl && <p className="text-sm text-muted-foreground">Redirecting soon...</p>}
          </CardContent>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input placeholder="90210" {...field} maxLength={5} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Input placeholder="CA" value={derivedState ?? ''} readOnly disabled className="bg-muted" />
                    <FormDescription className="text-xs">Auto-filled from ZIP</FormDescription>
                  </FormItem>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit
                </Button>
              </CardFooter>
            </form>
          </Form>
        )}

        {/* Optional: Display Social Links */}
        {performer.socials && performer.socials.length > 0 && !submitted && (
          <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
            <p className="text-sm font-medium text-muted-foreground">Follow {performer.firstName}:</p>
            <div className="flex flex-wrap gap-3">
              {performer.socials.map((social) => (
                <Button key={social.label} variant="outline" size="sm" asChild>
                  <a href={social.url} target="_blank" rel="noopener noreferrer">
                    {/* Basic text label for now, replace with icons later */}
                    {social.label}
                  </a>
                </Button>
              ))}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
