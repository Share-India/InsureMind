import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const payload = await req.json();
    
    // The payload from Supabase Send SMS Hook
    console.log("Webhook payload:", JSON.stringify(payload));
    const phone = payload.user?.phone || payload.user?.new_phone || payload.user?.user_metadata?.phone;
    const otp = payload.sms?.otp;

    if (!phone || !otp) {
      throw new Error("Missing phone number or OTP in the webhook payload");
    }

    const authKey = Deno.env.get('MSG91_AUTH_KEY');
    // We are temporarily hardcoding the PolicyWise template ID because we know its exact variables (var and var1)
    const templateId = '69df4bef132297c323058a23';

    if (!authKey || !templateId) {
      throw new Error("Missing MSG91 credentials in environment variables");
    }

    // MSG91 requires the mobile number with country code but without the '+' sign
    const cleanPhone = phone.replace('+', '');

    // MSG91 Flow API Endpoint (handles custom variables better than the strict OTP API)
    const response = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "authkey": authKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        template_id: templateId,
        short_url: "0",
        recipients: [
          {
            mobiles: cleanPhone,
            alphanumeric: "InsureMind App",
            otp: otp,
            OTP: otp,
            var: "InsureMind App",
            var1: otp,
            var2: otp,
            code: otp,
            CODE: otp,
            token: otp,
            password: otp,
            alphanumeric1: otp,
            alphanumeric2: otp
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok || data.type === 'error') {
      console.error("MSG91 Error:", data);
      throw new Error(`MSG91 API error: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, message: "OTP sent successfully" }), {
      headers: { "Content-Type": "application/json" },
      status: 200 
    });
  } catch (error) {
    console.error("Error processing SMS hook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500 
    });
  }
});
