import OpenAI from "openai";

export class OpenAIProvider {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    this.client = new OpenAI({
      apiKey,
    });
  }

  getClient(): OpenAI {
    return this.client;
  }

  async sendMessage(input: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: input }],
    });

    const content = response.choices[0].message.content || "";

    // Strip markdown code blocks if present
    let cleanedContent = content.trim();
    cleanedContent = cleanedContent
      .replace(/^```(?:json)?\s*/g, "")
      .replace(/\s*```$/g, "");

    // Validate it's valid JSON and return
    try {
      JSON.parse(cleanedContent);
      return cleanedContent;
    } catch (e) {
      console.error("OpenAI returned invalid JSON:", content);
      throw new Error("Invalid JSON response from OpenAI");
    }
  }
}
