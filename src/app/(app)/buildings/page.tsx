import { requirePermission } from "@/lib/auth/require-permission";
import BuildingsPage from "../admin/buildings/page";

type BuildingsRouteProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BuildingsRoute(
  props: BuildingsRouteProps,
): Promise<React.JSX.Element> {
  await requirePermission("buildings.view");

  return <BuildingsPage {...props} />;
}
