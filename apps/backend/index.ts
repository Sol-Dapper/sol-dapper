import express from "express";
import { prismaClient } from "db";
import { authMiddleware } from "./middleware";
import cors from "cors";
import { basePrompt } from "./prompts/baseprompt";
import { SYSTEM_PROMPT, BASE_PROMPT_REACT } from "./prompts/prompt";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/project", authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  const privyUserId = req.privyUserId!;

  const description = prompt.split("\n")[0];
  const user = await prismaClient.user.findUnique({
    where: { privyUserId },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const project = await prismaClient.project.create({
    data: { description, userId: user.id },
  });

  res.json({ project: project.id });
});

app.get("/projects", authMiddleware, async (req, res) => {
  const privyUserId = req.privyUserId;

  const user = await prismaClient.user.findUnique({
    where: { privyUserId },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const projects = await prismaClient.project.findMany({
    where: {
      userId: user.id,
    },
  });
  res.json(projects);
});

app.post("/chat", authMiddleware, async (req, res) => {
  const { prompt: userPrompt, projectId, model = "gpt-4o" } = req.body;
  const privyUserId = req.privyUserId!;
  console.log("Using the model =====>", model);
  try {
    // Validate inputs
    if (!userPrompt || !projectId) {
      return res.status(400).json({ error: "Missing prompt or projectId" });
    }

    // Get user
    const user = await prismaClient.user.findUnique({
      where: { privyUserId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get project and verify ownership
    const project = await prismaClient.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
      include: {
        prompts: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!project) {
      return res
        .status(404)
        .json({ error: "Project not found or access denied" });
    }

    // Build context from previous prompts
    const previousContext = project.prompts
      .map((p) => `${p.type}: ${p.content}`)
      .join("\n");

    // Generate AI response with streaming using selected model
    const result = await streamText({
      model: openai(model),
      messages: [
        { role: "system", content: SYSTEM_PROMPT() },
        { role: "system", content: basePrompt },
        { role: "system", content: BASE_PROMPT_REACT },
        { role: "user", content: userPrompt },
      ],
      maxOutputTokens: 4000,
      temperature: 0.7,
    });

    // Save user prompt to database
    await prismaClient.prompt.create({
      data: {
        content: userPrompt,
        type: "USER",
        projectId: project.id,
      },
    });

    // Set headers for streaming
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    let fullResponse = "";

    // Stream the response
    for await (const textPart of result.textStream) {
      res.write(textPart);
      fullResponse += textPart;
    }

    res.end();

    // Save AI response to database
    await prismaClient.prompt.create({
      data: {
        content: fullResponse,
        type: "SYSTEM",
        projectId: project.id,
      },
    });

    console.log("AI Response:", fullResponse);
  } catch (error) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

app.listen(3001, () => {
  console.log("Server started on port 3001");
});
