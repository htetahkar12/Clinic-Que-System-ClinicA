"use client";

import { useEffect, useState } from "react";

export type DeviceOrientation = "portrait" | "landscape";
export type DeviceCategory = "compact-phone" | "phone" | "tablet" | "desktop";

export interface DeviceViewportInfo {
  width: number;
  height: number;
  orientation: DeviceOrientation;
  deviceCategory: DeviceCategory;
  isShortLandscape: boolean;
  isMobile: boolean;
}

export function useDeviceViewport(): DeviceViewportInfo {
  const [info, setInfo] = useState<DeviceViewportInfo>({
    width: 390,
    height: 844,
    orientation: "portrait",
    deviceCategory: "phone",
    isShortLandscape: false,
    isMobile: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewport = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const orientation: DeviceOrientation = w > h ? "landscape" : "portrait";

      let deviceCategory: DeviceCategory = "desktop";
      const shorterSide = Math.min(w, h);
      const longerSide = Math.max(w, h);

      if (shorterSide < 360) {
        deviceCategory = "compact-phone";
      } else if (shorterSide < 600 && longerSide < 1024) {
        deviceCategory = "phone";
      } else if (w < 1100) {
        deviceCategory = "tablet";
      } else {
        deviceCategory = "desktop";
      }

      const isShortLandscape = orientation === "landscape" && h < 560;
      const isMobile =
        deviceCategory === "compact-phone" || deviceCategory === "phone";

      document.documentElement.setAttribute("data-orientation", orientation);
      document.documentElement.setAttribute("data-device", deviceCategory);
      document.documentElement.setAttribute(
        "data-short-landscape",
        isShortLandscape ? "true" : "false"
      );

      setInfo({
        width: w,
        height: h,
        orientation,
        deviceCategory,
        isShortLandscape,
        isMobile,
      });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    const mql = window.matchMedia?.("(orientation: landscape)");
    mql?.addEventListener?.("change", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      mql?.removeEventListener?.("change", updateViewport);
    };
  }, []);

  return info;
}
