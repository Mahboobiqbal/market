import { brand } from "@/config/brand";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    ok: true,
    service: brand.appName,
    time: new Date().toISOString(),
  });
}
