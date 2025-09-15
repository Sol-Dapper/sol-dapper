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
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

app.use(express.json());

// Add explicit OPTIONS handling for chat endpoint
app.options("/api/chat", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, Origin, X-Requested-With");
  res.header("Access-Control-Allow-Credentials", "true");
  res.status(200).end();
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
  const requestId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Log request start
  console.log(`[${requestId}] Chat API request started`, {
    privyUserId,
    projectId,
    model,
    promptLength: userPrompt?.length || 0,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress
  });
  
  try {
    // Validate inputs
    if (!userPrompt || !projectId) {
      console.error(`[${requestId}] Input validation failed`, {
        hasPrompt: !!userPrompt,
        hasProjectId: !!projectId,
        privyUserId,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({ error: "Missing prompt or projectId" });
    }

    // Validate prompt length
    if (userPrompt.length > 50000) {
      console.error(`[${requestId}] Prompt too long`, {
        promptLength: userPrompt.length,
        maxAllowed: 50000,
        privyUserId,
        projectId,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({ error: "Prompt too long" });
    }

    // Get user
    let user;
    try {
      user = await prismaClient.user.findUnique({
        where: { privyUserId },
      });
    } catch (dbError) {
      console.error(`[${requestId}] Database error finding user`, {
        error: dbError,
        privyUserId,
        errorMessage: dbError instanceof Error ? dbError.message : 'Unknown error',
        errorStack: dbError instanceof Error ? dbError.stack : undefined,
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({ error: "Database error finding user" });
    }

    if (!user) {
      console.error(`[${requestId}] User not found`, {
        privyUserId,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`[${requestId}] User found`, {
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date().toISOString()
    });

    // Get project and verify ownership
    let project;
    try {
      project = await prismaClient.project.findFirst({
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
    } catch (dbError) {
      console.error(`[${requestId}] Database error finding project`, {
        error: dbError,
        projectId,
        userId: user.id,
        errorMessage: dbError instanceof Error ? dbError.message : 'Unknown error',
        errorStack: dbError instanceof Error ? dbError.stack : undefined,
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({ error: "Database error finding project" });
    }

    if (!project) {
      console.error(`[${requestId}] Project not found or access denied`, {
        projectId,
        userId: user.id,
        privyUserId,
        timestamp: new Date().toISOString()
      });
      return res
        .status(404)
        .json({ error: "Project not found or access denied" });
    }

    console.log(`[${requestId}] Project found`, {
      projectId: project.id,
      projectDescription: project.description,
      promptCount: project.prompts.length,
      timestamp: new Date().toISOString()
    });

    // Build conversation history from previous prompts
    let conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
    try {
      conversationHistory = project.prompts.map((p) => ({
        role: p.type === "USER" ? "user" as const : "assistant" as const,
        content: p.content,
      }));
    } catch (mappingError) {
      console.error(`[${requestId}] Error mapping conversation history`, {
        error: mappingError,
        promptCount: project.prompts.length,
        errorMessage: mappingError instanceof Error ? mappingError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({ error: "Error processing conversation history" });
    }

    // Determine which AI provider to use based on model name
    let modelProvider;
    try {
      if (model.includes("claude")) {
        modelProvider = anthropic(model);
        console.log(`[${requestId}] Using Anthropic model`, { model });
      } else {
        modelProvider = openai(model);
        console.log(`[${requestId}] Using OpenAI model`, { model });
      }
    } catch (modelError) {
      console.error(`[${requestId}] Error initializing AI model provider`, {
        error: modelError,
        model,
        errorMessage: modelError instanceof Error ? modelError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({ error: "Error initializing AI model" });
    }

    // Prepare messages array
    let messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    try {
      messages = [
        { role: "system" as const, content: SYSTEM_PROMPT() },
        { role: "system" as const, content: basePrompt },
        { role: "system" as const, content: BASE_PROMPT_REACT },
        ...conversationHistory,
        { role: "user" as const, content: userPrompt },
      ];
      
      console.log(`[${requestId}] Messages prepared`, {
        totalMessages: messages.length,
        systemMessagesCount: 3,
        conversationHistoryCount: conversationHistory.length,
        timestamp: new Date().toISOString()
      });
    } catch (messageError) {
      console.error(`[${requestId}] Error preparing messages array`, {
        error: messageError,
        errorMessage: messageError instanceof Error ? messageError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({ error: "Error preparing conversation messages" });
    }

    // Set streaming headers
    try {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } catch (headerError) {
      console.error(`[${requestId}] Error setting response headers`, {
        error: headerError,
        errorMessage: headerError instanceof Error ? headerError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({ error: "Error setting response headers" });
    }

    // Save user prompt to database
    try {
      await prismaClient.prompt.create({
        data: {
          content: userPrompt,
          type: "USER",
          projectId: project.id,
        },
      });
      console.log(`[${requestId}] User prompt saved to database`, {
        projectId: project.id,
        promptLength: userPrompt.length,
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error(`[${requestId}] Database error saving user prompt`, {
        error: dbError,
        projectId: project.id,
        errorMessage: dbError instanceof Error ? dbError.message : 'Unknown error',
        errorStack: dbError instanceof Error ? dbError.stack : undefined,
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({ error: "Database error saving prompt" });
    }

    // Stream the AI response
    let result;
    try {
      console.log(`[${requestId}] Initiating AI stream`, {
        model,
        temperature: 0.7,
        messageCount: messages.length,
        timestamp: new Date().toISOString()
      });
      
      result = await streamText({
        model: modelProvider,
        messages,
        temperature: 0.7,
      });
    } catch (aiError) {
      console.error(`[${requestId}] AI provider error during stream initialization`, {
        error: aiError,
        model,
        errorMessage: aiError instanceof Error ? aiError.message : 'Unknown error',
        errorStack: aiError instanceof Error ? aiError.stack : undefined,
        errorCode: aiError instanceof Error && 'code' in aiError ? (aiError as any).code : undefined,
        timestamp: new Date().toISOString()
      });
      
      if (!res.headersSent) {
        return res.status(500).json({ error: "AI service error" });
      } else {
        res.end();
        return;
      }
    }

    // Ensure result is defined before proceeding
    if (!result) {
      console.error(`[${requestId}] AI stream result is undefined`, {
        timestamp: new Date().toISOString()
      });
      if (!res.headersSent) {
        return res.status(500).json({ error: "AI service initialization failed" });
      } else {
        res.end();
        return;
      }
    }

    let fullResponse = "";
    let streamStartTime = Date.now();
    let chunkCount = 0;

    // Handle the streaming response properly
    try {
      console.log(`[${requestId}] Starting stream processing`, {
        timestamp: new Date().toISOString()
      });
      
      for await (const delta of result.textStream) {
        if (delta) {
          try {
            res.write(delta);
            fullResponse += delta;
            chunkCount++;
            
            // Log every 100 chunks to avoid spam
            if (chunkCount % 100 === 0) {
              console.log(`[${requestId}] Stream progress`, {
                chunksProcessed: chunkCount,
                responseLength: fullResponse.length,
                elapsedMs: Date.now() - streamStartTime,
                timestamp: new Date().toISOString()
              });
            }
          } catch (writeError) {
            console.error(`[${requestId}] Error writing stream chunk`, {
              error: writeError,
              chunkCount,
              deltaLength: delta.length,
              errorMessage: writeError instanceof Error ? writeError.message : 'Unknown error',
              timestamp: new Date().toISOString()
            });
            throw writeError;
          }
        }
      }

      console.log(`[${requestId}] Stream completed successfully`, {
        totalChunks: chunkCount,
        responseLength: fullResponse.length,
        totalDurationMs: Date.now() - streamStartTime,
        timestamp: new Date().toISOString()
      });

      res.end();

      // Save AI response to database after streaming is complete
      if (fullResponse.trim()) {
        try {
          await prismaClient.prompt.create({
            data: {
              content: fullResponse,
              type: "SYSTEM",
              projectId: project.id,
            },
          });
          console.log(`[${requestId}] AI response saved to database`, {
            projectId: project.id,
            responseLength: fullResponse.length,
            timestamp: new Date().toISOString()
          });
        } catch (dbError) {
          console.error(`[${requestId}] Database error saving AI response`, {
            error: dbError,
            projectId: project.id,
            responseLength: fullResponse.length,
            errorMessage: dbError instanceof Error ? dbError.message : 'Unknown error',
            errorStack: dbError instanceof Error ? dbError.stack : undefined,
            timestamp: new Date().toISOString()
          });
          // Don't return error here as the stream was successful
        }
      } else {
        console.warn(`[${requestId}] Empty AI response, not saving to database`, {
          projectId: project.id,
          timestamp: new Date().toISOString()
        });
      }

    } catch (streamError) {
      console.error(`[${requestId}] Streaming error during processing`, {
        error: streamError,
        errorMessage: streamError instanceof Error ? streamError.message : 'Unknown error',
        errorStack: streamError instanceof Error ? streamError.stack : undefined,
        chunksProcessed: chunkCount,
        responseLength: fullResponse.length,
        elapsedMs: Date.now() - streamStartTime,
        headersSent: res.headersSent,
        timestamp: new Date().toISOString()
      });
      
      if (!res.headersSent) {
        res.status(500).json({ error: "Streaming failed" });
      } else {
        res.end();
      }
    }

  } catch (error) {
    console.error(`[${requestId}] Unexpected error in chat endpoint`, {
      error: error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : undefined,
      privyUserId,
      projectId,
      model,
      headersSent: res.headersSent,
      timestamp: new Date().toISOString()
    });
    
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