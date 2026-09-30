import {releaseVersion} from "../../lib/release-version";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({version: releaseVersion}, {headers: {"Cache-Control": "private, no-store, max-age=0"}});
}
