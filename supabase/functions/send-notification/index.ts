/* eslint-disable */
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  try {
    const { receiverId, title, body } = await req.json();

    // conectare la Supabase (server-side)
    const supabase = createClient(
      Deno.env.get("URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // ia push token-ul userului care primește mesajul
    const { data, error } = await supabase
      .from("profiles")
      .select("push_token")
      .eq("id", receiverId)
      .single();

    if (error || !data?.push_token) {
      return new Response("No push token found", { status: 400 });
    }

    // trimite notificarea la Expo
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: data.push_token,
        title,
        body,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
});