/**
 * Shared camera for the onboarding figures.
 *
 * Reproduces the reference block's spring (Framer: stiffness 300, damping 40,
 * mass 1). That spring is OVERDAMPED — damping ratio 1.155 — so it starts from
 * zero velocity, eases in, and settles over a long tail. `--ease-out` does the
 * opposite: it leaves at full velocity and decelerates, which reads as sharp.
 * CSS `linear()` reproduces the real curve; browsers without it fall back to
 * the default `ease`, which is still softer than `--ease-out`.
 */
export const SPRING =
  "linear(0, 0.0199 2.5%, 0.068 5%, 0.1314 7.5%, 0.2018 10%, 0.3441 15%, 0.4731 20%, 0.582 25%, 0.6709 30%, 0.7982 40%, 0.8771 50%, 0.9254 60%, 0.9547 70%, 0.9725 80%, 0.9833 90%, 1)";

export type ZoomTarget = {
  /** How far to push in. 1 is the wide shot. */
  scale: number;
  /**
   * Focal point in the figure's own coordinates — 0-1 spans the element, and
   * values outside that range are allowed and useful: the reference frames its
   * close-ups from `-20% -10%` and `180% -10%`, i.e. from beyond the corners,
   * which pushes harder than anything inside the box can.
   */
  focus: [number, number];
};

/**
 * Builds an interpolatable transform for a focal-point zoom.
 *
 * The obvious approach — animating `scale` and switching `transform-origin`
 * per step — does NOT work: transform-origin is not usefully interpolatable,
 * so the change applies instantly and the figure teleports between steps.
 *
 * Pinning the origin at 0 0 and folding the focal point into a translate makes
 * both components animate together, so every move is continuous.
 */
export function zoomTransform({ scale, focus: [fx, fy] }: ZoomTarget) {
  const tx = (1 - scale) * fx * 100;
  const ty = (1 - scale) * fy * 100;
  return `translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%) scale(${scale})`;
}

/** Inline style for the element the camera moves. */
export function zoomStyle(target: ZoomTarget): React.CSSProperties {
  return {
    transform: zoomTransform(target),
    transformOrigin: "0 0",
    transitionTimingFunction: SPRING,
    willChange: "transform",
  };
}
