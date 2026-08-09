/**
 * React splash is intentionally a no-op.
 * Boot splash is rendered in __root RootShell as static HTML/CSS/JS so it
 * cannot freeze, loop, or blank the app if React re-renders/crashes.
 */
export function SplashScreen() {
  return null;
}
