import authBackground from "@/assets/auth-background.jpg";

/**
 * ── Auth figure ─────────────────────────────────────────────────────────────
 *
 * A single static image, and deliberately nothing else.
 *
 * The onboarding figure earns its motion: it is fed by the form, so the camera
 * moving between steps points at the thing you just changed. Auth has no such
 * relationship — an email and a password aren't displayable, and there's no
 * workspace yet — so a camera move here would be decoration announcing itself.
 * Sign-in is also a screen people hit often, which is exactly where CLAUDE.md's
 * frequency test says to stop animating.
 *
 * Rendered as a CSS background rather than an <img>: the panel that holds this
 * is `hidden lg:block`, and browsers skip background images on elements that
 * aren't rendered, so phones never pay for a desktop-only decoration.
 *
 * The source PNG was 1920×1440 at 975 KB. It is a smooth gradient, so it is
 * stored as a 1600px JPEG at 127 KB — visually identical, ~87% smaller, and it
 * will sit on the sign-in path once this moves out of the playground.
 */
export function AuthFigure() {
  return (
    <div
      aria-hidden
      className="h-full w-full bg-cover bg-center"
      style={{ backgroundImage: `url(${authBackground})` }}
    />
  );
}
