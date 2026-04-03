"use server";

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateBlogContent(title, category = "", tags = []) {
  try {
    if (!title || title.trim().length === 0) {
      throw new Error("Title is required to generate content");
    }

    const prompt = `Write a blog post about: "${title}"

Topic: "${title}"
Subject: "${title}"

${category ? `Category: ${category}` : ""}
${tags.length > 0 ? `Tags: ${tags.join(", ")}` : ""}

RULES:
- Write ONLY about "${title}"
- Do NOT write about blogging, content creation, writing tips, or anything unrelated
- Do NOT add preamble or explanation
- Return ONLY raw HTML, no markdown, no code blocks
- Start directly with <p> tag

HTML format:
- <p> introduction about "${title}"
- <h2> for main sections about "${title}"
- <h3> for subsections
- <p> for paragraphs
- <ul><li> for lists
- <strong><em> for emphasis
- 800-1200 words

Write the blog post about "${title}" now:`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are a blog content generator. You ONLY write about the exact topic given to you. You NEVER write about blogging tips, content creation, writing strategies, or any unrelated topic. You ALWAYS write specifically about the user's requested topic.`,
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
      .replace(/^[\s\S]*?(?=<)/, "")
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

    if (error.status === 429 || error.message?.includes("quota") || error.message?.includes("limit")) {
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
    if (!currentContent || currentContent.trim().length === 0) {
      throw new Error("Content is required for improvement");
    }

    let prompt = "";

    switch (improvementType) {
      case "expand":
        prompt = `Expand this blog content with more details. Keep the EXACT same topic.
Return ONLY pure HTML. No preamble. No markdown. Start with HTML tag.

${currentContent}

Begin expanded HTML:`;
        break;

      case "simplify":
        prompt = `Simplify this blog content. Keep the EXACT same topic.
Return ONLY pure HTML. No preamble. No markdown. Start with HTML tag.

${currentContent}

Begin simplified HTML:`;
        break;

      default:
        prompt = `Enhance this blog content. Keep the EXACT same topic.
Return ONLY pure HTML. No preamble. No markdown. Start with HTML tag.

${currentContent}

Begin enhanced HTML:`;
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are a blog content editor. You ONLY improve the content given to you while keeping the exact same topic. You NEVER change the subject or introduce unrelated topics.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const improvedContent = response.choices[0].message.content;

    const cleanContent = improvedContent
      .replace(/```html/gi, "")
      .replace(/```/g, "")
      .replace(/^[\s\S]*?(?=<)/, "")
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