// Shared frame geometry. The rails (see frame.tsx) and every piece of
// content that lines up with them use the same width, so a section's inner
// edge sits exactly on the rail.
//
// < sm: full width with the 16px gutter, no rails.
// sm+:  min(100% - 3rem, 76rem) centred, rails on both edges.
export const FRAME_WIDTH = "mx-auto w-full max-w-[76rem] sm:w-[calc(100%-3rem)]"

// Horizontal padding inside the frame — content never touches the rails.
export const FRAME_GUTTER = "px-4 sm:px-6 lg:px-10"
