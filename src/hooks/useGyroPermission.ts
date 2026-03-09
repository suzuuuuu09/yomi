import { useCallback, useEffect, useState } from "react";

type DeviceOrientationEventiOS = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

export interface UseGyroPermissionResult {
  // ジャイロの使用が許可されているか
  granted: boolean;
  // iOS 13+でユーザーに許可を求める必要があるか
  needsPrompt: boolean;
  // iOS 13+でユーザーに許可を求めるための関数
  requestPermission: () => Promise<void>;
}

/**
 * デバイスジャイロ（DeviceOrientationEvent）の許可状態を管理するフック。
 * - Android / PC: 即座に `granted = true`
 * - iOS 13+: `needsPrompt = true` になるため、ユーザー操作後に `requestPermission()` を呼ぶ
 *
 * @param enabled false のとき状態をリセットして許可を解除する
 */
export function useGyroPermission(enabled: boolean): UseGyroPermissionResult {
  const [granted, setGranted] = useState(false);
  const [needsPrompt, setNeedsPrompt] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setGranted(false);
      setNeedsPrompt(false);
      return;
    }
    const DOE = DeviceOrientationEvent as DeviceOrientationEventiOS;
    if (typeof DOE.requestPermission === "function") {
      setNeedsPrompt(true); // iOS 13+
    } else {
      setGranted(true); // Android / PC
    }
  }, [enabled]);

  const requestPermission = useCallback(async () => {
    const DOE = DeviceOrientationEvent as DeviceOrientationEventiOS;
    const result = await DOE.requestPermission?.();
    if (result === "granted") {
      setGranted(true);
      setNeedsPrompt(false);
    }
  }, []);

  return { granted, needsPrompt, requestPermission };
}
