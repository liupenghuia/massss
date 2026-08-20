import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Session = {
  accountId: number;
  loginName: string;
  role: "admin" | "super_admin";
  mustChangePassword: boolean;
};

type SessionContextValue = {
  session: Session | null;
  setSession: (session: Session | null) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const value = useMemo(() => ({ session, setSession }), [session]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession 必须在 SessionProvider 内使用");
  }
  return ctx;
}
