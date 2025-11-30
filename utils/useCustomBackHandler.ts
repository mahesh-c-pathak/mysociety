// hooks/useCustomBackHandler.ts
import { useEffect } from "react";
import { BackHandler } from "react-native";
import { useRouter, type Href } from "expo-router";

/**
 * Custom back handler hook.
 * - If `targetRoute` is provided → navigates to that route using router.replace().
 * - If no `targetRoute` is provided → performs router.back().
 */
export function useCustomBackHandler(targetRoute?: Href) {
  const router = useRouter();

  useEffect(() => {
    const backAction = () => {
      if (targetRoute) {
        router.replace(targetRoute);
      } else {
        router.back();
      }
      return true; // prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [router, targetRoute]);
}
