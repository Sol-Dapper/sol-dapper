import express from "express";
import { prismaClient } from "db";
import { authMiddleware } from "./middleware";
import cors from "cors";
import { basePrompt } from "./prompts/baseprompt";
import { SYSTEM_PROMPT, BASE_PROMPT_REACT } from "./prompts/prompt";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/register", async (req, res) => {
  try {
    const { privyUserId, email, walletAddress } = req.body;

    if (!privyUserId || !email) {
      return res.status(400).json({ error: "Missing required fields: privyUserId and email" });
    }

    const user = await prismaClient.user.upsert({
      where: { privyUserId },
      update: { 
        email,
        walletAddress,
        updatedAt: new Date()
      },
      create: {
        privyUserId,
        email,
        walletAddress
      }
    });

    res.json({ success: true, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

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

app.get("/project/:id", authMiddleware, async (req, res) => {
  const { id: projectId } = req.params;
  const privyUserId = req.privyUserId;

  try {
    const user = await prismaClient.user.findUnique({
      where: { privyUserId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

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
      return res.status(404).json({ error: "Project not found or access denied" });
    }

    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

app.post("/chat", authMiddleware, async (req, res) => {
  const { prompt: userPrompt, projectId, model = "gpt-4o" } = req.body;
  const privyUserId = req.privyUserId!;
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

    // Determine which AI provider to use based on model name
    let aiProvider;
    if (model === "claude-3-7-sonnet-20250219" || model === "claude-sonnet-4-20250514") {
      // Use Anthropic's Claude models
      aiProvider = anthropic(model);
    } else {
      // Default to OpenAI models
      aiProvider = openai(model);
    }
    const result = await streamText({
      model: aiProvider,
      messages: [
        { role: "system", content: SYSTEM_PROMPT() },
        { role: "system", content: basePrompt },
        { role: "system", content: BASE_PROMPT_REACT },
        { role: "user", content: userPrompt },
      ],
      maxOutputTokens: 8000,
      temperature: 0.7,
    });

    await prismaClient.prompt.create({
      data: {
        content: userPrompt,
        type: "USER",
        projectId: project.id,
      },
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    let fullResponse = "";

    // Stream the response
    for await (const textPart of result.textStream) {
      res.write(textPart);
      fullResponse += textPart;
    }

    res.end();

    await prismaClient.prompt.create({
      data: {
        content: fullResponse,
        type: "SYSTEM",
        projectId: project.id,
      },
    });

  } catch (error) {
    console.error("Chat endpoint error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

app.listen(3001, () => {
  console.log("Server started on port 3001");
});
