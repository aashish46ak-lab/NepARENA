/** Platform routes use NepARENA nav/footer. Organizer routes use league nav/footer. */
export function isPlatformPath(pathname: string): boolean {
  if (pathname === "/") return true;
  const platformPrefixes = [
    "/organizers",
    "/following",
    "/platform",
    "/users",
    "/ownership",
    "/auth",
    "/invite",
    "/reset-password",
    "/games",
    "/vote",
  ];
  return platformPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
