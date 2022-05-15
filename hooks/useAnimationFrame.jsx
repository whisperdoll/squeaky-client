import { useCallback, useEffect, useRef, useState } from "react";

export default function useAnimationFrame(callback) {
  const animationFrameHandle = useRef(0);
  const unmounting = useRef(false);

  const fn = useCallback(() => {
    callback();

    if (!unmounting.current) {
      requestAnimationFrame(fn);
    }
  }, [callback]);

  useEffect(() => {
    callback();
    animationFrameHandle.current = requestAnimationFrame(fn);

    return () => {
      unmounting.current = true;

      if (animationFrameHandle.current) {
        cancelAnimationFrame(animationFrameHandle.current);
      }
    };
  }, []);
}