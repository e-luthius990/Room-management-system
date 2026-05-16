import Link from "next/link";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { hasAnyPermission } from "@/lib/auth/permissions";

const adminCards = [
  {
    title: "Users",
    description: "Invite staff, review account status, roles, and camp access.",
    href: "/admin/users",
    permissions: ["users.view"],
  },
  {
    title: "Camps",
    description:
      "Manage International Camp, Airport Camp, and future camp setup.",
    href: "/admin/camps",
    permissions: ["camps.view"],
  },
  {
    title: "Rooms",
    description: "Manage buildings, room inventory, room types, and amenities.",
    href: "/admin/rooms",
    permissions: ["rooms.view"],
  },
  {
    title: "Buildings",
    description: "Create building blocks under each camp.",
    href: "/admin/buildings",
    permissions: ["buildings.view"],
  },
  {
    title: "Room Types",
    description:
      "Manage classifications like single, shared, VIP, and delegate rooms.",
    href: "/admin/room-types",
    permissions: ["settings.update_room_types"],
  },
  {
    title: "Amenities",
    description: "Manage amenities that can be attached to rooms.",
    href: "/admin/amenities",
    permissions: ["rooms.manage_amenities"],
  },
  {
    title: "Room Board",
    description:
      "Open the live operational room board used by reception and managers.",
    href: "/room-board",
    permissions: ["rooms.view"],
  },
  {
    title: "Guest Documents",
    description: "Review private guest documents through signed access links.",
    href: "/guest-documents/review",
    permissions: ["guest_documents.view"],
  },
  {
    title: "Security Review",
    description:
      "Review guest clearance status, risk notes, and gate-facing access visibility.",
    href: "/security",
    permissions: ["security.view_clearance"],
  },
  {
    title: "Gate Dashboard",
    description: "View today’s arrivals and active stays for gate security.",
    href: "/security/gate",
    permissions: ["security.view_gate_dashboard"],
  },
  {
    title: "Notifications",
    description: "Send and review internal operational alerts.",
    href: "/notifications",
    permissions: ["notifications.view"],
  },
  {
    title: "Housekeeping",
    description: "Review cleaning tasks and inspection handoff after turnover.",
    href: "/housekeeping",
    permissions: ["housekeeping.view"],
  },
  {
    title: "Inspections",
    description: "Approve room readiness after cleaning or maintenance.",
    href: "/housekeeping/inspections",
    permissions: ["inspections.view"],
  },
  {
    title: "Maintenance",
    description:
      "Review maintenance tickets, blocked rooms, repairs, and verification.",
    href: "/maintenance",
    permissions: ["maintenance.view"],
  },
  {
    title: "Keys & Access Cards",
    description:
      "Manage inventory, issuing, returns, and lost key/card events.",
    href: "/keys",
    permissions: ["keys.view"],
  },
  {
    title: "Room Service",
    description:
      "Manage in-stay service requests, room refreshes, linen, towels, water, and VIP service.",
    href: "/room-service",
    permissions: ["room_service.view"],
  },
  {
    title: "Audit Logs",
    description: "Review sensitive operational and access history.",
    href: "/admin/audit-logs",
    permissions: ["audit_logs.view"],
  },
  {
    title: "Data Imports",
    description: "Upload and validate bulk room or guest CSV imports.",
    href: "/imports",
    permissions: ["imports.view"],
  },
  {
    title: "Report Exports",
    description: "Generate and download private operational CSV exports.",
    href: "/reports/exports",
    permissions: ["reports.view_exports"],
  },
] as const;

const adminPagePermissions = Array.from(
  new Set(adminCards.flatMap((card) => card.permissions)),
);

export default async function AdminPage() {
  const currentUser = await requireAnyPermission(adminPagePermissions);

  const visibleCards = adminCards.filter((card) => {
    return hasAnyPermission(currentUser, [...card.permissions]);
  });

  return (
    <div>
      <PageHeader
        title="Administration"
        description="Manage users, camp access, room inventory, workflows, security, notifications, private documents, and audit visibility."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-base font-semibold text-neutral-950">
              {card.title}
            </div>

            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {card.description}
            </p>
          </Link>
        ))}

        {visibleCards.length === 0 ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-800 md:col-span-2 xl:col-span-4">
            You do not currently have access to any administration modules.
          </div>
        ) : null}
      </div>
    </div>
  );
}
