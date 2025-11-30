import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebaseConfig";

type Role = "admin" | "GateKeeper" | "user" | null;
type Ctx = {
  user: User | null;
  role: Role | null;
  loading: boolean;
  isAuthenticated: boolean | undefined;
  userName: string | null;
};

const AuthRoleContext = createContext<Ctx>({
  user: null,
  role: null,
  loading: true,
  isAuthenticated: undefined,
  userName: null,
});

export function AuthRoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(
    undefined
  );
  const [userName, setUserName] = useState<string | null>(null);
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setRole(null);
        setIsAuthenticated(false); // mark explicitly
        setLoading(false);
        setUserName(null);
      } else {
        setIsAuthenticated(true); // ✅ mark authenticated immediately
        setLoading(false); // ✅ stop loading even before Firestore returns
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    let isActive = true; // ✅ Prevent race conditions after logout
    const ref = doc(db, "users", user.uid);
    const unsubRole = onSnapshot(
      ref,
      (snap) => {
        if (!isActive) return; // ✅ Guard
        const data = snap.data();
        const r = (snap.data()?.role as Role) ?? null;
        setRole(r);
        setIsAuthenticated(true);
        setLoading(false);
        setUserName(data?.displayName || data?.firstName);
      },
      () => setLoading(false)
    );
    return () => {
      isActive = false; // ✅ prevent callback from firing after cleanup
      unsubRole();
    };
  }, [user]);

  const value = useMemo(
    () => ({ user, role, loading, isAuthenticated, userName }),
    [user, role, loading, isAuthenticated, userName]
  );
  return (
    <AuthRoleContext.Provider value={value}>
      {children}
    </AuthRoleContext.Provider>
  );
}

export const useAuthRole = () => useContext(AuthRoleContext);
