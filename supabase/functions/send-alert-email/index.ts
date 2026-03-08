const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AlertEmailRequest {
  to: string;
  title: string;
  message: string;
  severity: string;
  pipeline_name: string;
  pipeline_id: string;
  run_id: string;
  rows_processed: number;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const body: AlertEmailRequest = await req.json();

    if (!body.to || !body.title) {
      return new Response(JSON.stringify({ error: "Missing 'to' or 'title'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isError = body.severity === "error" || body.status === "failed";
    const statusColor = isError ? "#ef4444" : "#22c55e";
    const statusLabel = isError ? "FAILED" : "SUCCESS";
    const emoji = isError ? "🔴" : "✅";

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:${statusColor};padding:20px 24px;">
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">
        ${emoji} AstraFlow Alert
      </h1>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:16px;font-weight:600;">${body.title}</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.5;">${body.message}</p>
      
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="padding:8px 12px;background:#f1f5f9;border-radius:6px 0 0 0;font-size:12px;color:#64748b;font-weight:600;">Status</td>
          <td style="padding:8px 12px;background:#f1f5f9;border-radius:0 6px 0 0;font-size:12px;color:${statusColor};font-weight:700;">${statusLabel}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #f1f5f9;">Pipeline</td>
          <td style="padding:8px 12px;font-size:12px;color:#0f172a;border-bottom:1px solid #f1f5f9;">${body.pipeline_name}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #f1f5f9;">Rows Processed</td>
          <td style="padding:8px 12px;font-size:12px;color:#0f172a;border-bottom:1px solid #f1f5f9;">${(body.rows_processed || 0).toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-size:12px;color:#64748b;font-weight:600;">Run ID</td>
          <td style="padding:8px 12px;font-size:12px;color:#0f172a;font-family:monospace;">${(body.run_id || "").substring(0, 8)}…</td>
        </tr>
      </table>

      <p style="margin:0;color:#94a3b8;font-size:11px;">This alert was sent by AstraFlow. Manage your alert rules in the Alerts dashboard.</p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "AstraFlow Alerts <onboarding@resend.dev>",
        to: [body.to],
        subject: `${emoji} ${body.title}`,
        html: htmlBody,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", result);
      return new Response(JSON.stringify({ success: false, error: result }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Alert email sent to", body.to, "id:", result.id);
    return new Response(JSON.stringify({ success: true, email_id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Send alert email error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
