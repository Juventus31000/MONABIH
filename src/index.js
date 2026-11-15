export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://juventus31000.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    const jsonResponse = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=UTF-8"
        }
      });

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Méthode non autorisée" }, 405);
    }

    try {
      const data = await request.json();
      const question = data.question;

      if (
        !question ||
        typeof question !== "string" ||
        question.length > 4000
      ) {
        return jsonResponse({
          error: "يرجى كتابة سؤال صحيح لا يتجاوز 4000 حرف."
        }, 400);
      }

      if (!env.TAVILY_API_KEY) {
        return jsonResponse({
          error: "مفتاح البحث Tavily غير مربوط بالخادم."
        }, 500);
      }

      // البحث في المصادر الرسمية الجزائرية
      const searchResponse = await fetch(
        "https://api.tavily.com/search",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.TAVILY_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            query: question + " الجزائر Algérie",
            search_depth: "basic",
            topic: "general",
            max_results: 6,
            include_answer: false,
            include_raw_content: false,
            include_domains: [
              "dgfp.gov.dz",
              "mtess.gov.dz",
              "education.gov.dz",
              "joradp.dz",
              "interieur.gov.dz",
              "mcepe.gov.dz"
            ]
          })
        }
      );

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error("Tavily error:", errorText);

        return jsonResponse({
          error: "تعذر البحث في الإنترنت. تحقق من إعدادات Tavily."
        }, 502);
      }

      const searchData = await searchResponse.json();

      const sources = (searchData.results || []).map((item, index) => ({
        number: index + 1,
        title: item.title,
        url: item.url,
        content: item.content
      }));

      const searchContext = sources.length
        ? JSON.stringify(sources)
        : "لم يتم العثور على نتائج من المواقع الرسمية المحددة.";

      // إرسال السؤال ونتائج البحث إلى الذكاء الاصطناعي
      const result = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fast",
        {
          messages: [
            {
              role: "system",
              content: `أنت MONABIH AI، مساعد ذكي للمواطن الجزائري.

تحدث بلغة المستخدم: الدارجة الجزائرية أو العربية أو الفرنسية.

مهمتك:
- شرح الإجراءات الإدارية والتوظيف والوثائق والاستمارات.
- تحليل نتائج البحث المرفقة قبل الإجابة.
- إعطاء الأولوية للمعلومات الموجودة في المصادر الرسمية.
- ذكر روابط المصادر التي اعتمدت عليها في نهاية الإجابة.
- إذا لم تجد مصدراً رسمياً، صرّح بذلك بوضوح.
- لا تخترع القوانين أو المواعيد أو الشروط أو العناوين.
- لا تعتبر نتيجة البحث وحدها دليلاً على أن الإعلان ما زال سارياً.
- لا تدّعِ أنك تحققت من وثيقة كاملة إذا لم تقرأها.
- ميّز بين تاريخ نشر المعلومة وتاريخ البحث عنها.
- إذا كانت النتائج غير كافية، قل ذلك بصراحة.

أجب بطريقة واضحة وعملية ومنظمة.`
            },
            {
              role: "user",
              content:
                "سؤال المواطن:\n" +
                question +
                "\n\nنتائج البحث:\n" +
                searchContext
            }
          ]
        }
      );

      return jsonResponse({
        success: true,
        answer: result.response || "لم أتمكن من توليد إجابة.",
        sources: sources
      });

    } catch (error) {
      console.error("MONABIH error:", error);

      return jsonResponse({
        success: false,
        error: "حدث خطأ أثناء معالجة السؤال."
      }, 500);
    }
  }
};
