import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";

import { fetchAPI } from "@/lib/fetch";

export const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`${key} was used 🔐 \n`);
      } else {
        console.log("No values stored under key: " + key);
      }
      return item;
    } catch (error) {
      console.error("SecureStore get item error: ", error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

export const googleOAuth = async (startOAuthFlow: any, role?: string) => {
  try {
    const { createdSessionId, setActive, signUp } = await startOAuthFlow({
      redirectUrl: Linking.createURL("/"),
    });

    if (createdSessionId) {
      if (setActive) {
        await setActive({ session: createdSessionId });

        // Only save to DB on first-time sign-up (not returning sign-ins)
        if (signUp?.createdUserId) {
          await fetchAPI("/(api)/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: `${signUp.firstName ?? ""} ${signUp.lastName ?? ""}`.trim() || "User",
              email: signUp.emailAddress,
              clerkId: signUp.createdUserId,
              role: role ?? "disposer",
            }),
          });
        }

        return {
          success: true,
          code: "success",
          isNewUser: !!signUp?.createdUserId,
          message: "You have successfully signed in with Google",
        };
      }
    }

    return {
      success: false,
      code: "error",
      isNewUser: false,
      message: "An error occurred while signing in with Google",
    };
  } catch (err: any) {
    console.error(err);
    return {
      success: false,
      code: err.code,
      isNewUser: false,
      message: err?.errors?.[0]?.longMessage ?? "Google sign-in failed",
    };
  }
};