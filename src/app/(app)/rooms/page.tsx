import { requirePermission } from "@/lib/auth/require-permission";
import RoomsPage from "../admin/rooms/page";

type RoomsRouteProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RoomsRoute(
  props: RoomsRouteProps,
): Promise<React.JSX.Element> {
  await requirePermission("rooms.view");

  return <RoomsPage {...props} />;
}
