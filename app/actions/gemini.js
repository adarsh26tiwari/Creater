"use server";

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateBlogContent(title, category = "", tags = []) {
  try {
    if (!title || title.trim().length === 0) {
      throw new Error("Title is required to generate content");
    }

    const prompt = `IMPORTANT: You are writing ONLY about "${title}". Do not write about anything else.

Write a comprehensive blog post about: "${title}"

${category ? `Category: ${category}` : ""}
${tags.length > 0 ? `Tags: ${tags.join(", ")}` : ""}

STRICT RULES:
- Write ONLY about "${title}" - nothing else
- Do NOT write about blogging, SEO, content creation, or writing tips unless the title is specifically about those topics
- If the title is a person (e.g. Virat Kohli), write about that person's life, career, achievements
- If the title is a sport, write about that sport specifically
- If the title is a place, write about that place specifically
- If the title is a technology, write about that technology specifically
- Stay 100% on the topic: "${title}"
- Include 3-5 main sections with clear subheadings about "${title}"
- Write in a conversational yet professional tone
- Approximately 800-1200 words
- Use <h2> for main sections, <h3> for subsections
- Use <p> tags for paragraphs
- Use <ul> and <li> for bullet points
- Use <strong> and <em> for emphasis
- Do NOT include the title as a heading
- Start directly with an introduction paragraph about "${title}"
- Every section must be specifically about "${title}"`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are a blog content generator. The user will give you a topic and you MUST write ONLY about that exact topic.

NEVER write about:
- Blogging tips or strategies
- Content creation advice  
- SEO or digital marketing
- Writing tips
- "Target audience" or "compelling narrative" advice
- Anything unrelated to the user's specific topic

ALWAYS write about:
- Exactly what the user asked for
- If it's a person → their life, career, achievements, impact
- If it's a sport → rules, history, famous players, tournaments
- If it's a place → geography, culture, history, attractions
- If it's a technology → how it works, uses, benefits, future

Return only raw HTML content. No markdown. No code blocks. No preamble.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0].message.content;

    if (!content || content.trim().length < 100) {
      throw new Error("Generated content is too short or empty");
    }

    const cleanContent = content
      .replace(/```html/gi, "")
      .replace(/```/g, "")
      .trim();

    return {
      success: true,
      content: cleanContent,
    };
  } catch (error) {
    console.error("Groq AI Error:", error);

    if (error.message?.includes("API key") || error.status === 401) {
      return {
        success: false,
        error: "AI service configuration error. Please try again later.",
      };
    }

    if (
      error.status === 429 ||
      error.message?.includes("quota") ||
      error.message?.includes("limit")
    ) {
      return {
        success: false,
        error: "AI service is temporarily unavailable. Please try again later.",
      };
    }

    return {
      success: false,
      error: error.message || "Failed to generate content. Please try again.",
    };
  }
}

export async function improveContent(
  currentContent,
  improvementType = "enhance"
) {
  try {
    const plainText = currentContent.replace(/<[^>]*>/g, "").trim();

    // Block all known placeholder/garbage content
    const blockedPhrases = [
      "To create truly captivating content",
      "This space is intentionally left blank",
      "please provide details",
      "compelling narrative that resonates",
      "target audience and crafting",
      "solid foundation",
      "driving reader engagement",
      "content creation lies in providing value",
    ];

    const isPlaceholder = blockedPhrases.some((phrase) =>
      plainText.includes(phrase)
    );

    if (!currentContent || plainText.length < 10 || isPlaceholder) {
      return {
        success: false,
        error:
          "Invalid content detected. Please delete this draft and generate fresh content.",
      };
    }

    const prompts = {
      expand: `Expand the following blog content with more details, examples, and insights about the SAME topic only.

RULES:
- Do NOT change the topic
- Do NOT add blogging tips, SEO advice, or content creation strategies
- Only add more information about the exact same subject
- Keep the same HTML structure
- Return only raw HTML, no markdown

Content to expand:
${currentContent}`,

      simplify: `Simplify the following blog content while keeping it about the SAME topic.

RULES:
- Do NOT change the topic
- Do NOT add blogging tips, SEO advice, or content creation strategies
- Use simpler language but keep all key points about the same subject
- Keep the same HTML structure
- Return only raw HTML, no markdown

Content to simplify:
${currentContent}`,

      enhance: `Enhance the following blog content to make it more engaging.

RULES:
- Do NOT change the topic
- Do NOT add blogging tips, SEO advice, or content creation strategies
- Only improve the flow, readability, and engagement of the existing content
- Keep the same HTML structure
- Return only raw HTML, no markdown

Content to enhance:
${currentContent}`,
    };

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are a blog content editor. You improve content while keeping it 100% about the same topic.

NEVER:
- Change the subject of the content
- Add blogging tips or content creation advice
- Add SEO strategies or digital marketing advice
- Introduce topics not in the original content

ALWAYS:
- Keep the exact same topic and subject matter
- Only improve quality, not change the subject
- Return raw HTML only, no markdown, no code blocks`,
        },
        {
          role: "user",
          content: prompts[improvementType] ?? prompts.enhance,
        },
      ],
    });

    const improvedContent = response.choices[0].message.content;

    const cleanContent = improvedContent
      .replace(/```html/gi, "")
      .replace(/```/g, "")
      .trim();

    return {
      success: true,
      content: cleanContent,
    };
  } catch (error) {
    console.error("Content improvement error:", error);
    return {
      success: false,
      error: error.message || "Failed to improve content. Please try again.",
    };
  }
}