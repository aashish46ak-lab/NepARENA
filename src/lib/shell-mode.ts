/** Platform routes use NepARENA nav/footer. Organizer routes use league nav/footer. */
export function isPlatformPath(pathname: string): boolean {
  if (pathname === "/") return true;
  const platformPrefixes = [
    "/organizers",
    "/platform",
    "/users",
    "/ownership",
    "/auth",
    "/invite",
    "/reset-password",
  ];
  return platformPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
