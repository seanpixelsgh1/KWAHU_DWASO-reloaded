import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useDispatch, useSelector } from "react-redux";
import { addUser, removeUser } from "@/redux/shofySlice";
import { fetchUserFromFirestore } from "@/lib/firebase/userService";
import type { RootState } from "@/redux/store";
import { formatDisplayName } from "@/lib/utils/user";

export function useUserSync() {
  const { data: session, status } = useSession();
  const dispatch = useDispatch();
  const userInfo = useSelector((state: RootState) => (state as any).kwahudwaso?.userInfo);

  useEffect(() => {
    const syncUserData = async () => {
      if (status === "loading") return;

      if (session?.user?.id) {
        // Trigger sync if:
        // 1. No user data in store
        // 2. User ID doesn't match session
        // 3. User Role in store doesn't match the hardened session role (e.g. after migration or God Mode)
        const needsSync = !userInfo || 
                          userInfo.id !== session.user.id || 
                          userInfo.role !== session.user.role;

        if (needsSync) {
          try {
            const firestoreUser = await fetchUserFromFirestore(session.user.id);
            if (firestoreUser) {
              // Light validation: ensure name is correct before dispatching to Redux
              const sanitizedUser = {
                ...firestoreUser,
                name: formatDisplayName(
                  firestoreUser.name,
                  session.user.name || session.user.email?.split("@")[0] || "User",
                  firestoreUser.profile
                ),
                // Ensure session-level role elevation (e.g. God Mode) is preserved in Redux
                role: session.user.role === "admin" ? "admin" : firestoreUser.role,
              };
              dispatch(addUser(sanitizedUser));
            } else {
              // If no Firestore data, create minimal user from session
              const sessionUser = {
                id: session.user.id,
                name: formatDisplayName(session.user.name, session.user.email?.split("@")[0] || "User", undefined),
                email: session.user.email || "",
                image: session.user.image || "",
                role: session.user.role || "user",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                emailVerified: true,
                profile: {
                  firstName: session.user.name?.split(" ")[0] || "",
                  lastName:
                    session.user.name?.split(" ").slice(1).join(" ") || "",
                  phone: "",
                  addresses: [],
                },
                preferences: {
                  newsletter: false,
                  notifications: true,
                },
                cart: [],
                wishlist: [],
                orders: [],
              };
              dispatch(addUser(sessionUser));
            }
          } catch (error) {
            console.error("Error syncing user data:", error);
          }
        }
      } else if (status === "unauthenticated") {
        // Clear user data when logged out
        if (userInfo) {
          dispatch(removeUser());
        }
      }
    };

    syncUserData();
  }, [session, status, dispatch, userInfo]);

  return {
    user: userInfo,
    session,
    isLoading: status === "loading",
    isAuthenticated: !!session?.user,
  };
}
