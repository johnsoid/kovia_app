'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface UserData {
    id: string;
    email?: string | null;
    firstName?: string;
    lastName?: string;
    userName?: string;
    // Add other relevant user fields
}

export default function AdminDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    // Redirect if not logged in or not admin (basic check, improve with roles/claims later)
    useEffect(() => {
        if (!authLoading && (!user /* || user.displayName !== 'admin' */)) { // Add admin check logic here
             router.push('/auth');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchUsers = async () => {
             if (!user) return; // Don't fetch if not logged in

            setLoading(true);
            try {
                // Note: Listing all users requires admin privileges or specific backend function.
                // This example fetches data from a 'performers' collection as a placeholder.
                // Replace with actual user fetching logic (e.g., Cloud Function).
                const querySnapshot = await getDocs(collection(db, 'performers')); // Placeholder collection
                const fetchedUsers: UserData[] = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    email: doc.data().email || 'N/A', // Assuming email field exists
                    firstName: doc.data().firstName,
                    lastName: doc.data().lastName,
                    userName: doc.data().userName,
                }));
                setUsers(fetchedUsers);
            } catch (error) {
                console.error("Error fetching users:", error);
                // Handle error display to user
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading && user) {
             fetchUsers();
        }
    }, [user, authLoading]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/auth');
        } catch (error) {
            console.error("Error signing out: ", error);
            // Handle logout error
        }
    };


    if (authLoading || loading) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <div className="flex justify-between items-center mb-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-24" />
                 </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

     if (!user /* || user.displayName !== 'admin' */ ) { // Add admin check logic here
         // This should ideally be handled by the redirect, but acts as a fallback
         return null;
     }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <header className="flex justify-between items-center mb-6">
                 <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
                 <Button variant="outline" onClick={handleLogout}>
                     <LogOut className="mr-2 h-4 w-4" /> Logout
                 </Button>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Registered Users</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>First Name</TableHead>
                                <TableHead>Last Name</TableHead>
                                <TableHead>Username</TableHead>
                                {/* Add more headers as needed */}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length > 0 ? (
                                users.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>{u.firstName || '-'}</TableCell>
                                        <TableCell>{u.lastName || '-'}</TableCell>
                                        <TableCell>{u.userName || '-'}</TableCell>
                                        {/* Add more cells as needed */}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
