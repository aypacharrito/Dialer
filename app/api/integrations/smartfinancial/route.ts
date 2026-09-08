import {
  GET as leadsGET,
  POST as leadsPOST,
} from "../leads/route";

// Keep the existing authenticated GET behavior.
export const GET = leadsGET;

// SmartFinancial compatibility wrapper:
// - Process/save the lead using Pacifica's normal inbound lead handler.
// - Convert any successful 2xx result (200/201/etc.) into a plain empty 200 OK.
// - Preserve actual error responses so failed requests still report correctly.
export async function POST(request: Request) {
  const response = await leadsPOST(request);

  if (response.ok) {
    return new Response(null, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  return response;
}
