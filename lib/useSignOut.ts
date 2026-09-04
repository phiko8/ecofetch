import { useClerk } from "@clerk/clerk-expo";
import { useRef, useState } from "react";

/**
 * Shared sign-out hook.
 * - Uses useClerk for a reliable full sign-out.
 * - Guards against double-taps with a ref lock.
 * - index.tsx watches isSignedIn and handles the redirect automatically.
 */
export function useSignOut() {
  const { signOut } = useClerk();
  const [loading, setLoading] = useState(false);
  const inProgress = useRef(false);

  const performSignOut = async () => {
    if (inProgress.current) return;
    inProgress.current = true;
    setLoading(true);
    try {
      await signOut();
    } catch (err) {
      // Reset so user can try again if it genuinely fails
      inProgress.current = false;
      setLoading(false);
      console.error("Sign out error:", err);
    }
  };

  return { performSignOut, loading };
}
