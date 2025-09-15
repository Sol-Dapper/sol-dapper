import express from "express";
import { prismaClient } from "./prisma";
import { authMiddleware } from "./middleware";
import cors from "cors";
import { basePrompt } from "./prompts/baseprompt";
import { SYSTEM_PROMPT, BASE_PROMPT_REACT } from "./prompts/prompt";
import { boilerplateComponents } from "./prompts/boilerplate-components";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

const PORT = process.env.PORT || 3001;
const app = express();

// Configure CORS for streaming and cross-origin requests
app.use(cors());

app.use(express.json());

app.post("/api/register", async (req, res) => {
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

app.post("/api/project", authMiddleware, async (req, res) => {
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

app.get("/api/projects", authMiddleware, async (req, res) => {
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

app.get("/api/project/:id", authMiddleware, async (req, res) => {
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

app.post("/api/chat", authMiddleware, async (req, res) => {
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

    // Build conversation history from previous prompts
    const conversationHistory = project.prompts.map((p) => ({
      role: p.type === "USER" ? "user" : "assistant",
      content: p.content,
    }));

    // Determine which AI provider to use based on model name
    let modelProvider;
    if (model.includes("claude")) {
      modelProvider = anthropic(model);
    } else {
      modelProvider = openai(model);
    }

    // Prepare messages array
    const messages = [
      { role: "system", content: SYSTEM_PROMPT() },
      { role: "system", content: basePrompt },
      { role: "system", content: BASE_PROMPT_REACT },
      ...conversationHistory,
      { role: "user", content: userPrompt },
    ];

    // Set streaming headers
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Save user prompt to database
    await prismaClient.prompt.create({
      data: {
        content: userPrompt,
        type: "USER",
        projectId: project.id,
      },
    });

    // Stream the AI response
    const result = await streamText({
      model: modelProvider,
      messages,
      maxTokens: 16000,
      temperature: 0.7,
    });

    let fullResponse = "";

    // Handle the streaming response properly
    try {
      for await (const delta of result.textStream) {
        if (delta) {
          res.write(delta);
          fullResponse += delta;
        }
      }

      res.end();

      // Save AI response to database after streaming is complete
      if (fullResponse.trim()) {
        await prismaClient.prompt.create({
          data: {
            content: fullResponse,
            type: "SYSTEM",
            projectId: project.id,
          },
        });
      }

    } catch (streamError) {
      console.error("Streaming error:", streamError);
      if (!res.headersSent) {
        res.status(500).json({ error: "Streaming failed" });
      } else {
        res.end();
      }
    }

  } catch (error) {
    console.error("Chat endpoint error:", error);
    
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate response" });
    } else {
      res.end();
    }
  }
});

app.get("/api/boilerplate", async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/plain");
    const fullBoilerplate = `${basePrompt}\n\n${boilerplateComponents}`;
    res.send(fullBoilerplate);
  } catch (error) {
    console.error("Boilerplate endpoint error:", error);
    res.status(500).json({ error: "Failed to get boilerplate components" });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});