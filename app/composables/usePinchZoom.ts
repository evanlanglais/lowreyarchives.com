import { ref, computed, onMounted, onBeforeUnmount, type Ref } from "vue";

interface PinchZoomOptions {
  minScale?: number;
  maxScale?: number;
  doubleTapScale?: number;
}

export function usePinchZoom(
  target: Ref<HTMLElement | null>,
  options: PinchZoomOptions = {},
) {
  const { minScale = 1, maxScale = 5, doubleTapScale = 2 } = options;

  const scale = ref(1);
  const translateX = ref(0);
  const translateY = ref(0);

  const isZoomed = computed(() => scale.value > 1);

  const transformStyle = computed(
    () =>
      `transform: scale(${scale.value}) translate(${translateX.value}px, ${translateY.value}px);` +
      `transform-origin: center center;` +
      `will-change: transform;`,
  );

  // Pinch tracking state
  let initialPinchDistance = 0;
  let initialScale = 1;

  // Pan tracking state
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let initialTranslateX = 0;
  let initialTranslateY = 0;

  // Double-tap detection
  let lastTapTime = 0;

  function clampTranslation() {
    const el = target.value;
    if (!el || scale.value <= 1) {
      translateX.value = 0;
      translateY.value = 0;
      return;
    }

    // When scaled, the overflow on each axis is (scale - 1) * dimension / 2
    // Since we use translate (which moves in pre-scale coordinates), divide by scale
    const maxTx = ((scale.value - 1) * el.clientWidth) / (2 * scale.value);
    const maxTy = ((scale.value - 1) * el.clientHeight) / (2 * scale.value);

    translateX.value = Math.max(-maxTx, Math.min(maxTx, translateX.value));
    translateY.value = Math.max(-maxTy, Math.min(maxTy, translateY.value));
  }

  function reset() {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  }

  function getTouchDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length === 2) {
      // Start pinch
      isPanning = false;
      initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
      initialScale = scale.value;
    } else if (e.touches.length === 1) {
      // Double-tap detection
      const now = Date.now();
      if (now - lastTapTime < 300) {
        // Double tap
        e.preventDefault();
        if (scale.value > 1) {
          reset();
        } else {
          scale.value = doubleTapScale;
          clampTranslation();
        }
        lastTapTime = 0;
        return;
      }
      lastTapTime = now;

      // Start pan (only when zoomed)
      if (isZoomed.value) {
        isPanning = true;
        panStartX = e.touches[0].clientX;
        panStartY = e.touches[0].clientY;
        initialTranslateX = translateX.value;
        initialTranslateY = translateY.value;
      }
    }
  }

  function onTouchMove(e: TouchEvent) {
    if (e.touches.length === 2) {
      // Pinch zoom
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const ratio = currentDistance / initialPinchDistance;
      scale.value = Math.max(
        minScale,
        Math.min(maxScale, initialScale * ratio),
      );
      clampTranslation();
    } else if (e.touches.length === 1 && isPanning && isZoomed.value) {
      // Pan
      e.preventDefault();
      const dx = (e.touches[0].clientX - panStartX) / scale.value;
      const dy = (e.touches[0].clientY - panStartY) / scale.value;
      translateX.value = initialTranslateX + dx;
      translateY.value = initialTranslateY + dy;
      clampTranslation();
    }
  }

  function onTouchEnd(e: TouchEvent) {
    if (e.touches.length < 2) {
      initialPinchDistance = 0;
    }
    if (e.touches.length === 0) {
      isPanning = false;
      // Snap back to 1x if barely zoomed
      if (scale.value < 1.05) {
        reset();
      }
    }
  }

  onMounted(() => {
    const el = target.value;
    if (!el) return;
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
  });

  onBeforeUnmount(() => {
    const el = target.value;
    if (!el) return;
    el.removeEventListener("touchstart", onTouchStart);
    el.removeEventListener("touchmove", onTouchMove);
    el.removeEventListener("touchend", onTouchEnd);
  });

  return {
    transformStyle,
    isZoomed,
    reset,
    scale,
  };
}
