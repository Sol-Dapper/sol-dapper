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

// Enhanced timeout configuration for Render.com
app.use((req, res, next) => {
  // Set timeouts for streaming requests
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000); // 5 minutes
  next();
});

// Configure CORS for streaming and cross-origin requests
app.use(cors({
  origin: [
    'http://localhost:3000', 
    /\.vercel\.app$/, 
    /\.onrender\.com$/,  // Add Render.com support
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control',
    'Accept',
    'Accept-Encoding',
    'Connection'
  ],
  exposedHeaders: ['Content-Type', 'Transfer-Encoding']
}));

app.use(express.json());

// Health check endpoint for Render.com
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

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
  
  let streamStarted = false;
  let fullResponse = "";

  try {
    // Validate inputs
    if (!userPrompt || !projectId) {
      return res.status(400).json({ error: "Missing prompt or projectId" });
    }

    // Validate API keys are present
    if (model.includes("claude") && !process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "Anthropic API key not configured" });
    }
    
    if (!model.includes("claude") && !process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
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
      aiProvider = anthropic(model);
    } else {
      aiProvider = openai(model);
    }

    // Set streaming headers BEFORE starting the stream
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': req.headers.origin || "*",
      'Access-Control-Allow-Credentials': 'true',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    streamStarted = true;

    const result = await streamText({
      model: aiProvider,
      messages: [
        { role: "system", content: SYSTEM_PROMPT() },
        { role: "system", content: basePrompt },
        { role: "system", content: BASE_PROMPT_REACT },
        { role: "user", content: userPrompt },
      ],
      maxOutputTokens: 16000,
      temperature: 0.7,
      onError: (error) => {
        console.error("StreamText error:", error);
        if (!streamStarted) {
          res.status(500).json({ error: "Failed to generate response" });
        } else {
          res.write(`\n\nError: ${error.message}\n`);
          res.end();
        }
      },
    });

    // Save user prompt
    await prismaClient.prompt.create({
      data: {
        content: userPrompt,
        type: "USER",
        projectId: project.id,
      },
    });

    // Stream the response with periodic flushes
    let chunkCount = 0;
    for await (const textPart of result.textStream) {
      res.write(textPart);
      fullResponse += textPart;
      
      // Force flush every 10 chunks to ensure data reaches client
      chunkCount++;
      if (chunkCount % 10 === 0) {
        // Force flush for streaming environments
        if (res.flush) res.flush();
      }
    }

    res.end();

    // Save assistant response after streaming completes
    if (fullResponse.trim()) {
      await prismaClient.prompt.create({
        data: {
          content: fullResponse,
          type: "SYSTEM",
          projectId: project.id,
        },
      });
    }

  } catch (error) {
    console.error("Chat endpoint error:", error);
    
    if (!streamStarted) {
      // If we haven't started streaming yet, send JSON error
      res.status(500).json({ 
        error: "Failed to generate response",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else {
      // If streaming has started, write error to stream and end
      try {
        res.write(`\n\nError: ${error.message}\n`);
        res.end();
      } catch (writeError) {
        console.error("Error writing to response stream:", writeError);
      }
    }
  }
});

app.get("/api/boilerplate", async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/plain")
    const fullBoilerplate = `${basePrompt}\n\n${boilerplateComponents}`;
    res.send(fullBoilerplate);
  } catch (error) {
    console.error("Boilerplate endpoint error:", error);
    res.status(500).json({ error: "Failed to get boilerplate components" });
  }
});

// Global error handler for streaming responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global error handler:", err);
  
  if (res.headersSent) {
    // If response has started (streaming), delegate to default Express error handler
    return next(err);
  }
  
  res.status(500).json({ 
    error: "Internal server error",
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`OpenAI API configured: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`Anthropic API configured: ${!!process.env.ANTHROPIC_API_KEY}`);
});