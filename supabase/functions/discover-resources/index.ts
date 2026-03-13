import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {

    const authHeader = req.headers.get("Authorization");

    console.log("Authorization header:", authHeader);

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Process discovery request
    const body = await req.json();
    const { type, host, username, password, target, database_name, schema_name, warehouse_name } = body;

    if (type === "snowflake") {
      try {
        const result = await discoverSnowflake({
          host,
          username,
          password: password || "",
          target,
          database_name,
          schema_name,
          warehouse_name
        });
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Default placeholder for other types
    return new Response(
      JSON.stringify({
        success: true,
        user: data.user.id,
        results: ["Sample Table 1", "Sample Table 2"]
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function discoverSnowflake(params: any) {
  const accountUrl = params.host.includes(".") ? `https://${params.host}` : `https://${params.host}.snowflakecomputing.com`;
  
  // Login to get session token
  const loginResp = await fetch(`${accountUrl}/session/v1/login-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      data: {
        ACCOUNT_NAME: params.host.split(".")[0],
        LOGIN_NAME: params.username,
        PASSWORD: params.password,
      },
    }),
  });

  const loginData = await loginResp.json();
  if (!loginData.success) {
    throw new Error(loginData.message || "Snowflake authentication failed");
  }

  const token = loginData.data.token;
  let sql = "";

  if (params.target === "warehouses") {
    sql = "SHOW WAREHOUSES";
  } else if (params.target === "databases") {
    sql = "SHOW DATABASES";
  } else if (params.target === "schemas") {
    sql = `SHOW SCHEMAS IN DATABASE "${params.database_name}"`;
  } else if (params.target === "tables") {
    sql = `SHOW TABLES IN SCHEMA "${params.database_name}"."${params.schema_name}"`;
  }

  const queryResp = await fetch(`${accountUrl}/queries/v1/query-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Snowflake Token="${token}"`,
      "Accept": "application/json"
    },
    body: JSON.stringify({
      sqlText: sql,
    }),
  });

  const queryData = await queryResp.json();
  if (!queryData.success) {
     // If query fails, try to return some helpful message
     throw new Error(queryData.message || "Snowflake query failed");
  }

  // Extract results based on target
  const results: string[] = [];
  const rows = queryData.data.rowSet;
  const columns = queryData.data.rowType;

  // Find the index of the name column (usually at index 0 for SHOW commands)
  const nameColIndex = columns.findIndex((c: any) => c.name === "name");
  
  for (const row of rows) {
    results.push(row[nameColIndex >= 0 ? nameColIndex : 0]);
  }

  return { results };
}
