import { createContext, useContext, type ReactNode } from "react";
import { localUser } from "@/lib/browser-store";

type LocalUser = ReturnType<typeof localUser>;

type AuthContextValue = {
  session: { user: LocalUser } | null;
  user: LocalUser | null;
  loading: boolean;
};

const value: AuthContextValue = {
  session: { user: localUser() },
  user: localUser(),
  loading: false,
};

const AuthContext = createContext<AuthContextValue>(value);

/** No sign-in anymore: everyone uses the app directly, data stays in the browser. */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
