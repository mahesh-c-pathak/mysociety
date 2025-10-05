// hooks/useCustomBackHandler.ts
import { useEffect } from "react";
import { BackHandler } from "react-native";
import { useRouter, type Href } from "expo-router";

export function useCustomBackHandler(targetRoute: Href) {
  const router = useRouter();

  useEffect(() => {
    const backAction = () => {
      router.replace(targetRoute);
      return true; // prevent default
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [router, targetRoute]);
}
