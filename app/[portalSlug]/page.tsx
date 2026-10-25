import React from "react";
import { notFound } from "next/navigation";
import { SuperAdminConsole } from "@/components/super-admin-console";

export default function DynamicPortalSlugPage({
  params,
}: {
  params: { portalSlug: string };
}) {
  const decoded = decodeURIComponent(params.portalSlug || "");
  if (
    decoded === "$uper@dmin" ||
    decoded.toLowerCase() === "$uper@dmin" ||
    decoded.toLowerCase() === "superadmin"
  ) {
    return <SuperAdminConsole />;
  }
  notFound();
}
