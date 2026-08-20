/** Platform routes use NepARENA nav/footer. Organizer routes use league nav/footer. */
export function isPlatformPath(pathname: string): boolean {
  if (pathname === "/") return true;
  const platformPrefixes = [
    "/organizers",
    "/become-organizer",
    "/following",
    "/following-people",
    "/followers",
    "/platform",
    "/users",
    "/ownership",
    "/auth",
    "/invite",
    "/reset-password",
    "/games",
    "/vote",
    "/feed",
    "/messages",
    "/members",
    "/profile",
    "/settings",
    "/about",
    "/rules",
    "/news",
    "/guides",
  ];
  return platformPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
