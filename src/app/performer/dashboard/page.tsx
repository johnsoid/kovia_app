'use client';

import type { z } from 'zod';
import * as z from 'zod'; // Import Zod
import type { DocumentData } from 'firebase/firestore';
import { useEffect, useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'; // Added FormDescription
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Save, Loader2, Trash2, PlusCircle, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionShad, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // Renamed Shadcn DialogDescription
import QRCode from 'qrcode.react'; // Need to install: npm install qrcode.react @types/qrcode.react
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';


const socialProfileSchema = z.object({
  label: z.string().min(1, "Label is required"),
  url: z.string().url("Must be a valid URL"),
});

const performerProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  userName: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  defaultRedirectUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  socials: z.array(socialProfileSchema).optional(),
});

type PerformerProfileFormData = z.infer<typeof performerProfileSchema>;

interface CapturedContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  zip?: string;
  state?: string;
  capturedAt: Date; // Assuming timestamp from Firestore
}

export default function PerformerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [profileExists, setProfileExists] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [capturedContacts, setCapturedContacts] = useState<CapturedContact[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const form = useForm<PerformerProfileFormData>({
    resolver: zodResolver(performerProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      userName: '',
      defaultRedirectUrl: '',
      socials: [],
    },
  });

   const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "socials",
  });

  // Fetch Performer Profile
  const fetchProfile = useCallback(
    async (uid: string) => {
      if (!db || !user) return;
      setIsLoadingProfile(true);
      try {
        console.log('[Dashboard] Fetching profile for uid:', uid);
        const docRef = doc(db, 'performers', uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as PerformerProfileFormData;
          form.reset(data); // Populate form with existing data
          setProfileExists(true);
          if(data.userName && typeof window !== 'undefined') { // Ensure window is defined
            setQrCodeUrl(`${window.location.origin}/c/${data.userName}`);
          }
          console.log('[Dashboard] Profile fetched:', docSnap.data());
        } else {
          setProfileExists(false);
          form.reset(); // Reset form if no profile exists
          setQrCodeUrl('');
          console.log('[Dashboard] No profile found');
        }
      } catch (error) {
        console.error('[Dashboard] Error fetching profile:', error);
        toast({ title: "Error", description: "Could not load profile.", variant: "destructive" });
        setQrCodeUrl('');
      } finally {
        setIsLoadingProfile(false);
      }
    },
    [form, toast, user, db]
  );

   // Fetch Captured Contacts
  const fetchContacts = useCallback(
    async (performerUid: string) => {
      if (!db || !user) return;
      setIsLoadingContacts(true);
      try {
        console.log('[Dashboard] Fetching contacts for performerUid:', performerUid);
        const q = query(
          collection(db, 'contacts'),
          where('performerUid', '==', performerUid)
        );
        const querySnapshot = await getDocs(q);
        const fetchedContacts = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            capturedAt: data.capturedAt?.toDate ? data.capturedAt.toDate() : new Date(),
          };
        });
        setCapturedContacts(fetchedContacts);
        console.log('[Dashboard] Contacts fetched:', fetchedContacts);
      } catch (error) {
        console.error('[Dashboard] Error fetching contacts:', error);
      } finally {
        setIsLoadingContacts(false);
      }
    },
    [user, db]
  );

  // Effect to fetch profile and contacts when user is available
  useEffect(() => {
    if (!authLoading && user) {
      fetchProfile(user.uid);
      fetchContacts(user.uid);
    }
  }, [authLoading, user, fetchProfile, fetchContacts]);

  // Effect to fetch contacts once profile is loaded and username is available
  useEffect(() => {
    const userName = form.getValues('userName');
    if (profileExists && userName && !isLoadingProfile) {
      fetchContacts(user.uid);
    } else if (!isLoadingProfile && !profileExists) {
      // If profile doesn't exist yet, clear contacts and stop loading
      setCapturedContacts([]);
      setIsLoadingContacts(false);
    }
  }, [profileExists, isLoadingProfile, fetchContacts, form, user]);

  // Handle Profile Save/Update
  const onSubmit = async (data: PerformerProfileFormData) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'performers', user.uid);
      // Ensure username uniqueness check here if necessary (e.g., using a Cloud Function)
      if (profileExists) {
        await updateDoc(docRef, { ...data, userId: user.uid }); // Add userId on update too
        toast({ title: "Success", description: "Profile updated successfully." });
      } else {
        await setDoc(docRef, { ...data, userId: user.uid, email: user.email }); // Add userId and email on creation
        setProfileExists(true); // Set profile exists after creation
        toast({ title: "Success", description: "Profile created successfully." });
      }
      if (typeof window !== 'undefined') { // Ensure window is defined
        setQrCodeUrl(`${window.location.origin}/c/${data.userName}`); // Update QR code URL after save
      }
      fetchContacts(user.uid); // Re-fetch contacts in case username changed
    } catch (error: any) {
      console.error("Error saving profile:", error);
      let errMsg = "Could not save profile.";
      // Add specific error handling if needed, e.g., for username conflicts
      // if (error.code === '...') errMsg = 'Username already taken.';
      toast({ title: "Error", description: errMsg, variant: "destructive" });
      setQrCodeUrl('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/auth');
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({ title: "Logout Error", description: "Could not log out.", variant: "destructive"})
    }
  };

  // Use Effect for generating QR code URL to avoid hydration errors
  useEffect(() => {
    const userName = form.getValues('userName');
    if (userName && typeof window !== 'undefined') {
      setQrCodeUrl(`${window.location.origin}/c/${userName}`);
    } else {
      setQrCodeUrl('');
    }
  }, [form, form.watch('userName')]); // Watch username changes. Added form dependency

  if (authLoading || isLoadingProfile) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) return null; // Should be redirected, but good practice

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Performer Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </header>

      {/* Profile Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Update your public performer information.</CardDescription>
        </CardHeader>
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
                      <FormControl><Input placeholder="Louis" {...field} /></FormControl>
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
                      <FormControl><Input placeholder="Johnson" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="userName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl><Input placeholder="your_unique_username" {...field} /></FormControl>
                    <FormDescription>Unique identifier for your capture page URL (e.g., /c/your_username).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultRedirectUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Redirect URL (Optional)</FormLabel>
                    <FormControl><Input type="url" placeholder="https://yourwebsite.com" {...field} /></FormControl>
                    <FormDescription>Where users are sent after submitting the form if no other logic applies.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Social Links */}
              <div>
                <Label className="mb-2 block">Social Links</Label>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                      <FormField
                        control={form.control}
                        name={`socials.${index}.label`}
                        render={({ field: itemField }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="sr-only">Label</FormLabel>
                            <FormControl><Input placeholder="YouTube" {...itemField} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`socials.${index}.url`}
                        render={({ field: itemField }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="sr-only">URL</FormLabel>
                            <FormControl><Input type="url" placeholder="https://..." {...itemField} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => remove(index)}
                        aria-label="Remove social link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => append({ label: '', url: '' })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Social Link
                </Button>
              </div>

            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> {profileExists ? 'Update Profile' : 'Create Profile'}
              </Button>
              {profileExists && qrCodeUrl && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <QrCode className="mr-2 h-4 w-4" /> Show QR Code
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Your Contact Capture QR Code</DialogTitle>
                      <DialogDescriptionShad>
                        Share this code with your audience to capture contacts. It links to: {qrCodeUrl}
                      </DialogDescriptionShad>
                    </DialogHeader>
                    <div className="flex justify-center p-4 bg-white rounded-md">
                      <QRCode value={qrCodeUrl} size={256} level="H" />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {profileExists && !qrCodeUrl && (
                <p className="text-sm text-muted-foreground">Save profile with a username to generate QR code.</p>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>

      {/* Captured Contacts Table */}
      {profileExists && (
        <Card>
          <CardHeader>
            <CardTitle>Captured Contacts</CardTitle>
            <CardDescription>Contacts collected through your QR code page.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingContacts ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>ZIP</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capturedContacts.length > 0 ? (
                    capturedContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>{contact.name}</TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.phone || '-'}</TableCell>
                        <TableCell>{contact.zip || '-'}</TableCell>
                        <TableCell>{contact.state || '-'}</TableCell>
                        <TableCell>{contact.capturedAt.toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No contacts captured yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
