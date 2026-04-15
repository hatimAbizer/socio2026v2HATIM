export function normalizeApiOrigin(rawBaseUrl: string | undefined): string {
  const baseUrl = String(rawBaseUrl ?? "").trim();
  if (!baseUrl) return "";

  const withoutTrailingSlashes = baseUrl.replace(/\/+$/, "");
  return withoutTrailingSlashes.replace(/(\/api)+$/i, "");
}

export function buildServerApiUrl(
  routePath: string,
  rawBaseUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL
): string {
  const origin = normalizeApiOrigin(rawBaseUrl);

  const trimmedPath = String(routePath ?? "").trim();
  const pathWithLeadingSlash = trimmedPath.startsWith("/")
    ? trimmedPath
    : `/${trimmedPath}`;

  const pathWithApiPrefix =
    pathWithLeadingSlash === "/api" || pathWithLeadingSlash.startsWith("/api/")
      ? pathWithLeadingSlash
      : `/api${pathWithLeadingSlash}`;

  return `${origin}${pathWithApiPrefix}`;
}
