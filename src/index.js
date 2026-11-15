export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://juventus31000.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Méthode non autorisée" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    try {
      const data = await request.json();
      const question = data.question;

      if (!question || typeof question !== "string" || question.length > 4000) {
        return new Response(
          JSON.stringify({ error: "يرجى كتابة سؤال صحيح لا يتجاوز 4000 حرف." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fast",
        {
          messages: [
            {
              role: "system",
              content: `أنت MONABIH AI، مساعد ذكي للمواطن الجزائري.
تحدث بلغة المستخدم: الدارجة الجزائرية أو العربية أو الفرنسية.
ساعد في فهم الإجراءات الإدارية والتوظيف والوثائق والاستمارات.
كن واضحاً وعملياً ومنظماً.
لا تخترع القوانين أو المواعيد أو العناوين أو الوثائق المطلوبة.
إذا كانت المعلومة تحتاج إلى تحقق من مصدر رسمي، قل ذلك بوضوح.
لا تدّعِ أنك تحققت من مصدر رسمي أو أنك بحثت في الإنترنت إذا لم تفعل.
اشرح للمستخدم الخطوات بطريقة بسيطة.`
            },
            {
              role: "user",
              content: question
            }
          ]
        }
      );

      return new Response(
        JSON.stringify({
          success: true,
          answer: result.response || "لم أتمكن من توليد إجابة."
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "حدث خطأ أثناء معالجة السؤال."
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
};
