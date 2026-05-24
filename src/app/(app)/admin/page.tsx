import { requireAnyPermission } from "@/lib/auth/require-permission";
import { hasAnyPermission } from "@/lib/auth/permissions";

type AdminCapabilityArea =
  | "Identity"
  | "Camp setup"
  | "Operations"
  | "Security"
  | "Data"
  | "System";

type AdminCapability = {
  label: string;
  description: string;
  permissions: readonly string[];
  area: AdminCapabilityArea;
};

const adminCapabilities = [
  {
    label: "User administration",
    description: "Invite users, review account status, and manage access.",
    permissions: ["users.view"],
    area: "Identity",
  },
  {
    label: "Role administration",
    description: "Review roles and permission assignments.",
    permissions: ["roles.view", "roles.update", "roles.assign_permissions"],
    area: "Identity",
  },
  {
    label: "Camp setup",
    description: "Manage active camps and camp-level operational scope.",
    permissions: ["camps.view"],
    area: "Camp setup",
  },
  {
    label: "Building setup",
    description: "Maintain camp building blocks used by room inventory.",
    permissions: ["buildings.view"],
    area: "Camp setup",
  },
  {
    label: "Room inventory",
    description: "Maintain rooms, statuses, room types, and amenities.",
    permissions: ["rooms.view"],
    area: "Camp setup",
  },
  {
    label: "Guest documents",
    description: "Review protected guest documents through signed access.",
    permissions: ["guest_documents.view"],
    area: "Security",
  },
  {
    label: "Security clearance",
    description: "Review security-facing guest clearance and risk visibility.",
    permissions: ["security.view_clearance"],
    area: "Security",
  },
  {
    label: "Gate operations",
    description: "Monitor gate movement and active camp presence.",
    permissions: ["security.view_gate_dashboard"],
    area: "Security",
  },
  {
    label: "Notifications",
    description: "Review operational alerts and internal messages.",
    permissions: ["notifications.view"],
    area: "Operations",
  },
  {
    label: "Imports",
    description: "Validate bulk upload access for rooms, guests, or users.",
    permissions: [
      "imports.view",
      "imports.rooms",
      "imports.guests",
      "imports.users",
    ],
    area: "Data",
  },
  {
    label: "Exports",
    description: "Review access to private operational report exports.",
    permissions: [
      "reports.view_exports",
      "exports.reports",
      "reports.export_csv",
      "reports.export_excel",
      "reports.export_pdf",
    ],
    area: "Data",
  },
  {
    label: "Audit logs",
    description: "Review access to sensitive operational history.",
    permissions: ["audit_logs.view"],
    area: "Data",
  },
  {
    label: "System settings",
    description: "Review system-level configuration access.",
    permissions: ["settings.view", "system_settings.update"],
    area: "System",
  },
] as const satisfies readonly AdminCapability[];

const adminPagePermissions = Array.from(
  new Set(adminCapabilities.flatMap((capability) => capability.permissions)),
);

const capabilityAreas: readonly AdminCapabilityArea[] = [
  "Identity",
  "Camp setup",
  "Operations",
  "Security",
  "Data",
  "System",
];

function getCapabilityState(
  capability: AdminCapability,
  currentUser: Awaited<ReturnType<typeof requireAnyPermission>>,
): "available" | "restricted" {
  return hasAnyPermission(currentUser, [...capability.permissions])
    ? "available"
    : "restricted";
}

function getStateLabel(state: "available" | "restricted"): string {
  return state === "available" ? "Available" : "Restricted";
}

function getStateClassName(state: "available" | "restricted"): string {
  return state === "available"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-border bg-muted/40 text-muted-foreground";
}

export default async function AdminPage(): Promise<React.JSX.Element> {
  const currentUser = await requireAnyPermission(adminPagePermissions);

  const capabilityRows = adminCapabilities.map((capability) => ({
    ...capability,
    state: getCapabilityState(capability, currentUser),
  }));

  const availableCount = capabilityRows.filter(
    (capability) => capability.state === "available",
  ).length;

  const restrictedCount = capabilityRows.length - availableCount;

  const visibleByArea = capabilityAreas
    .map((area) => ({
      area,
      capabilities: capabilityRows.filter(
        (capability) => capability.area === area,
      ),
    }))
    .filter((group) => group.capabilities.length > 0);

  return (
    <main className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="border-b border-border bg-surface px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              System overview
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Administration
            </h1>

            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Administrative access summary for identity, camp setup, security,
              data movement, audit visibility, and system configuration.
            </p>
          </div>
        </div>

        <div className="grid border-b border-border bg-muted/30 sm:grid-cols-4">
          <div className="metadata-item border-b border-border px-4 py-3 sm:border-b-0 sm:border-r sm:px-5">
            <p className="metadata-label">Available areas</p>
            <p className="metadata-value">{availableCount}</p>
          </div>

          <div className="metadata-item border-b border-border px-4 py-3 sm:border-b-0 sm:border-r sm:px-5">
            <p className="metadata-label">Restricted areas</p>
            <p className="metadata-value">{restrictedCount}</p>
          </div>

          <div className="metadata-item border-b border-border px-4 py-3 sm:border-b-0 sm:border-r sm:px-5">
            <p className="metadata-label">Access mode</p>
            <p className="metadata-value">Permission scoped</p>
          </div>

          <div className="metadata-item px-4 py-3 sm:px-5">
            <p className="metadata-label">Setup links</p>
            <p className="metadata-value">Navigation only</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Admin scope
            </h2>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              This page summarizes access only. Admin destinations now live in
              the sidebar navigation.
            </p>
          </div>

          <div className="divide-y divide-border">
            {visibleByArea.map((group) => {
              const availableInArea = group.capabilities.filter(
                (capability) => capability.state === "available",
              ).length;

              return (
                <div key={group.area} className="px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.area}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {availableInArea} / {group.capabilities.length} available
                  </p>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="surface-panel min-w-0 overflow-hidden">
          <div className="border-b border-border bg-surface px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-foreground">
              Capability matrix
            </h2>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Operational visibility by permission group. Use the sidebar to
              open the actual admin tools.
            </p>
          </div>

          <div className="divide-y divide-border">
            {capabilityRows.map((capability) => (
              <div
                key={capability.label}
                className="grid gap-3 px-4 py-4 sm:grid-cols-[12rem_minmax(0,1fr)_8rem] sm:items-center sm:px-5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {capability.area}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {capability.label}
                  </p>
                </div>

                <p className="text-sm leading-6 text-muted-foreground">
                  {capability.description}
                </p>

                <div className="sm:text-right">
                  <span
                    className={[
                      "inline-flex border px-2.5 py-1 text-xs font-semibold",
                      getStateClassName(capability.state),
                    ].join(" ")}
                  >
                    {getStateLabel(capability.state)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
