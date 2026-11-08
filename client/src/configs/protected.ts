import { useAuthStore } from "@/store/auth.store";
import { type ReactNode, createElement } from "react";
import { Navigate } from "react-router-dom";

type ProtectedUserProps = {
  children: ReactNode;
  authentication: boolean;
};

function Protected({ children, authentication }: ProtectedUserProps) {
  // Tokens are persisted; authStatus is transient and resets on page reload.
  const signedIn = useAuthStore((state) => Boolean(state.accessToken));
  if (authentication && !signedIn) return createElement(Navigate, { to: "/login", replace: true });
  if (!authentication && signedIn) return createElement(Navigate, { to: "/", replace: true });

  return children;
}

export default Protected;
