import { useAuthStore } from "@/store/auth.store";
import { ReactNode, useEffect, createElement } from "react";
import { useNavigate } from "react-router-dom";

type ProtectedUserProps = {
  children: ReactNode;
  authentication: boolean;
};

function Protected({ children, authentication }: ProtectedUserProps) {
  const { authStatus, loading } = useAuthStore();
  const navigate = useNavigate();
  console.log(authStatus, loading);

  useEffect(() => {
    if (!loading) {
      if (authentication && !authStatus) {
        navigate("/login");
      } else if (!authentication && authStatus) {
        navigate("/");
      }
    }
  }, [authStatus, authentication, navigate, loading]);

  if (loading) {
    return createElement(
      "div",
      {
        className:
          "flex flex-col items-center justify-center min-h-screen bg-gray-50",
      },
      createElement("div", {
        className:
          "w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4",
      }),
      createElement(
        "p",
        { className: "text-gray-700 text-lg font-medium animate-pulse" },
        "fetching",
      ),
    );
  }

  return children;
}

export default Protected;
