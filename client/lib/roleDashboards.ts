export type ServiceRoleSlug =
  | "it"
  | "venue"
  | "catering-vendors"
  | "stalls-misc";

export interface ServiceRoleDashboardConfig {
  slug: ServiceRoleSlug;
  label: string;
  aliases: string[];
  userFlagKeys: string[];
}

export const SERVICE_ROLE_DASHBOARDS: ServiceRoleDashboardConfig[] = [
  {
    slug: "it",
    label: "IT",
    aliases: ["it", "it service", "it services", "information technology"],
    userFlagKeys: ["is_it"],
  },
  {
    slug: "venue",
    label: "Venue",
    aliases: ["venue", "venues"],
    userFlagKeys: ["is_venue"],
  },
  {
    slug: "catering-vendors",
    label: "Catering Vendors",
    aliases: [
      "catering vendors",
      "catering vendor",
      "catering",
      "cateringvendors",
    ],
    userFlagKeys: ["is_catering_vendor", "is_catering_vendors"],
  },
  {
    slug: "stalls-misc",
    label: "Stalls/Misc",
    aliases: ["stalls misc", "stall misc", "stalls", "stallsmisc"],
    userFlagKeys: ["is_stalls_misc", "is_stall_misc", "is_stalls"],
  },
];

export function normalizeRoleValue(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function hasRoleAlias(rawRole: unknown, aliases: string[]): boolean {
  const normalizedRole = normalizeRoleValue(rawRole);
  if (!normalizedRole) {
    return false;
  }

  return aliases.some((alias) => normalizeRoleValue(alias) === normalizedRole);
}

export function getServiceRoleConfigBySlug(
  slug: string | null | undefined
): ServiceRoleDashboardConfig | null {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  return (
    SERVICE_ROLE_DASHBOARDS.find((roleConfig) => roleConfig.slug === normalizedSlug) ||
    null
  );
}

export function hasServiceRoleAccess(
  userLike: Record<string, unknown> | null | undefined,
  roleConfig: ServiceRoleDashboardConfig
): boolean {
  if (!userLike) {
    return false;
  }

  const hasFlag = roleConfig.userFlagKeys.some((key) => Boolean(userLike[key]));
  if (hasFlag) {
    return true;
  }

  return hasRoleAlias(userLike.university_role, roleConfig.aliases);
}

export function getAccessibleServiceRoleDashboards(
  userLike: Record<string, unknown> | null | undefined,
  isMasterAdmin: boolean
): ServiceRoleDashboardConfig[] {
  if (isMasterAdmin) {
    return SERVICE_ROLE_DASHBOARDS;
  }

  return SERVICE_ROLE_DASHBOARDS.filter((roleConfig) =>
    hasServiceRoleAccess(userLike, roleConfig)
  );
}
