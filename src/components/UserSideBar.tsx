"use client";

import {
  CalendarPlus,
  CircleDollarSign,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Building2,
  LogOut,
  ArrowRight,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; // 2. Import useRouter
import { auth } from "@/lib/firebase"; // 3. Import Firebase auth instance
import { signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { AvatarFallback, Avatar } from "./ui/avatar";
import { firestore as db } from "@/lib/firebase";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";
import { getDormitoryById } from "@/lib/vsu-admin/dormitory";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dormer",
    icon: LayoutDashboard,
  },
  {
    title: "Payments",
    url: "/dormer/payments",
    icon: CircleDollarSign,
  },
  {
    title: "Expenses",
    url: "/dormer/expenses",
    icon: CircleDollarSign,
  },
  {
    title: "Fines",
    url: "/dormer/fines",
    icon: WalletIcon,
  }
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter(); // 5. Initialize the router
  const [user, setUser] = useState(null);
  const [dormerData, setDormerData] = useState(null);
  const [dormitoryData, setDormitoryData] = useState(null);
  const { setOpenMobile } = useSidebar();
  const {dormitoryId, loading} = useCurrentDormitoryId(); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const fetchDormitoryData = async () => {
      const dormitory = await getDormitoryById(dormitoryId);
      setDormitoryData(dormitory);
    }
    fetchDormitoryData();
    return () => unsubscribe();
  }, [dormitoryId]);

  useEffect(() => {
    if (user) {
      // Only run the query if the user is logged in
      // Query to find the dormer document where 'authUid' matches the logged-in user's uid
      const fetchDormerData = async () => {
        const docRef = doc(db, "dormers", user.uid);
        const docSnap = await getDoc(docRef);
        const dormerData = docSnap.data();
        setDormerData(dormerData);
      };

      fetchDormerData();
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      // Sign out from Firebase
      await firebaseSignOut(auth);

      // Call your API to clear the session cookie
      await fetch("/api/auth/signout", {
        method: "POST",
      });

      // Redirect to login page
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };
  return (
    <Sidebar className={undefined}>
      <div className="flex flex-col h-full bg-[#12372A]">
        <SidebarHeader className="p-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-[#12372A] rounded-lg">
              <img src="/profile-old.webp" alt="Logo" width={32} height={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">DormPay</h2>
              <p className="text-xs text-white">{dormitoryData?.name}</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="flex-1 overflow-y-auto px-3 py-6">
          <SidebarGroup className={undefined}>
            <SidebarGroupContent className={undefined}>
              <SidebarMenu className="space-y-1">
                {menuItems.map((item: any) => (
                  <SidebarMenuItem key={item.title} className={undefined}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      className="group relative h-11 px-3 text-white hover:text-[#12372A] hover:bg-white data-[active=true]:bg-white data-[active=true]:text-[#12372A] data-[active=true]:font-medium transition-all duration-200 rounded-lg" tooltip={undefined}                    >
                      <Link
                        href={item.url}
                        className="flex items-center gap-3 w-full"
                        onClick={() => setOpenMobile(false)}
                      >
                        <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                        <span className="text-sm font-medium">{item.title}</span>
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className="ml-auto bg-[#12372A] text-green-800 text-xs px-2 py-0.5 transition-colors"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 flex-shrink-0">
          {dormerData && (
            <SidebarHeader className="flex items-start gap-2 pb-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-green-100 text-green-800 text-sm font-medium">
                  {dormerData.firstName[0]}
                  {dormerData.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {dormerData.firstName} {dormerData.lastName}
                </p>
                <p className="text-xs text-gray-100 truncate">
                  {dormerData.email}
                </p>
              </div>
            </SidebarHeader>
          )}
          <SidebarMenuButton
            onClick={handleSignOut}
            className=" relative flex items-center gap-3 h-11 px-3 w-full text-gray-100 hover:text-white hover:bg-red-500 transition-all duration-200 rounded-lg" tooltip={undefined}          >
            <div className="relative">
              <LogOut className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </div>
            <span className="text-sm font-medium">Sign Out</span>
            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ArrowRight className="h-4 w-4" />
            </div>
          </SidebarMenuButton>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
