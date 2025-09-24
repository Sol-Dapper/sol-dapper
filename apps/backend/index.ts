import express from "express";
import { prismaClient } from "./prisma";
import { authMiddleware } from "./middleware";
import cors from "cors";
import { basePrompt } from "./prompts/baseprompt";
import { SYSTEM_PROMPT, BASE_PROMPT_REACT } from "./prompts/prompt";
import { boilerplateComponents } from "./prompts/boilerplate-components";
import { generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import Anthropic from '@anthropic-ai/sdk';

const PORT = process.env.PORT || 3001;
const anthropic = new Anthropic({ 
  apiKey: process.env.ANTHROPIC_API_KEY 
});

function analyzeAIResponse(response: string): {
  hasForgeArtifact: boolean;
  hasForgeActions: boolean;
  estimatedFileCount: number;
  estimatedShellCommands: number;
  responseType: string;
  hasValidXML: boolean;
} {
  const hasForgeArtifact = response.includes('<forgeArtifact') || response.includes('&lt;forgeArtifact');
  const hasForgeActions = response.includes('<forgeAction') || response.includes('&lt;forgeAction');
  
  const fileMatches = response.match(/<forgeAction[^>]*type=["']file["'][^>]*>/g) || [];
  const estimatedFileCount = fileMatches.length;
  
  const shellMatches = response.match(/<forgeAction[^>]*type=["'](shell|command)["'][^>]*>/g) || [];
  const estimatedShellCommands = shellMatches.length;
  
  let responseType = 'text';
  if (hasForgeArtifact) {
    responseType = 'forge_artifact';
  } else if (hasForgeActions) {
    responseType = 'forge_actions';
  } else if (response.includes('<boltArtifact')) {
    responseType = 'bolt_artifact';
  }
  
  const hasValidXML = hasForgeArtifact ? response.includes('</forgeArtifact>') || response.includes('&lt;/forgeArtifact&gt;') : true;
  
  return {
    hasForgeArtifact,
    hasForgeActions,
    estimatedFileCount,
    estimatedShellCommands,
    responseType,
    hasValidXML
  };
}

const app = express();

app.use((req, res, next) => {
  req.setTimeout(0);
  res.setTimeout(1200000);
  next();
});

app.use(cors({
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

app.options("/api/chat", cors({
  origin: "https://dapper-web.vercel.app",
  credentials: true,
  methods: ['POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept','Origin','X-Requested-With']
}));


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
    res.status(500).json({ error: "Failed to register user" });
  }
});

app.post("/api/project", authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  const privyUserId = req.privyUserId!;

  try {
    const summaryResponse = await generateText({
      model: openai('gpt-4o'),
      messages: [
        {
          role: 'system',
          content: 'You are a project description generator. Create a concise description (maximum 4 words) that captures the essence of the user\'s Solana app idea. Return only the description, no additional text.'
        },
        {
          role: 'user',
          content: `Summarize this Solana app idea in 4 words or less: "${prompt}"`
        }
      ],
      maxOutputTokens: 20,
      temperature: 0.3,
    });

    let description = summaryResponse.text;

    description = description.trim().replace(/['"]/g, '');
    const words = description.split(' ').filter(word => word.length > 0);
    if (words.length > 4) {
      description = words.slice(0, 4).join(' ');
    }

    if (!description || description.length < 3) {
      description = prompt.split('\n')[0].substring(0, 30).trim() || 'Solana App';
    }

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
  } catch (error) {
    console.error('Error generating project description:', error);
    const description = prompt.split("\n")[0].substring(0, 30).trim() || 'Solana App';
    
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
  }
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
    orderBy: {
      createdAt: "desc",
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

    const systemPrompts = project.prompts.filter(p => p.type === 'SYSTEM');
    const userPrompts = project.prompts.filter(p => p.type === 'USER');
    const projectAnalysis = {
      totalPrompts: project.prompts.length,
      systemPrompts: systemPrompts.length,
      userPrompts: userPrompts.length,
      estimatedTotalFiles: systemPrompts.reduce((acc, prompt) => {
        const analysis = analyzeAIResponse(prompt.content);
        return acc + analysis.estimatedFileCount;
      }, 0),
      hasStructuredContent: systemPrompts.some(prompt => {
        const analysis = analyzeAIResponse(prompt.content);
        return analysis.hasForgeArtifact || analysis.hasForgeActions;
      })
    };

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

app.post("/api/chat", authMiddleware, async (req, res) => {
  const { prompt: userPrompt, projectId, model = "claude-3-7-sonnet-20250219" } = req.body;
  const privyUserId = req.privyUserId!;
  const requestId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    if (!userPrompt || !projectId) {
      return res.status(400).json({ error: "Missing prompt or projectId" });
    }

    if (userPrompt.length > 50000) {
      return res.status(400).json({ error: "Prompt too long" });
    }

    let user;
    try {
      user = await prismaClient.user.findUnique({
        where: { privyUserId },
      });
    } catch (dbError) {
      return res.status(500).json({ error: "Database error finding user" });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

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
      return res.status(500).json({ error: "Database error finding project" });
    }

    if (!project) {
      return res.status(404).json({ error: "Project not found or access denied" });
    }

    let conversationHistory;
    try {
      conversationHistory = project.prompts.map((p) => ({
        role: p.type === "USER" ? "user" : "assistant",
        content: p.content,
      }));
    } catch (mappingError) {
      return res.status(500).json({ error: "Error processing conversation history" });
    }

    let messages;
    let systemContent;
    try {
      systemContent = [
        SYSTEM_PROMPT(),
        basePrompt,
        BASE_PROMPT_REACT
      ].join('\n\n');

      messages = [
        ...conversationHistory,
        { role: "user", content: userPrompt },
      ];
    } catch (messageError) {
      return res.status(500).json({ error: "Error preparing conversation messages" });
    }

    try {
      await prismaClient.prompt.create({
        data: {
          content: userPrompt,
          type: "USER",
          projectId: project.id,
        },
      });
    } catch (dbError) {
      return res.status(500).json({ error: "Database error saving prompt" });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");


    let fullResponse = '';
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const stream = await anthropic.messages.create({
        model: model,
        max_tokens: 64000,
        temperature: 0.7,
        system: systemContent,
        messages:messages as any,
        stream: true,
      });

      for await (const chunk of stream) {
        try {
          if (chunk.type === 'message_start') {
            inputTokens = chunk.message?.usage?.input_tokens || 0;
          } 
          else if (chunk.type === 'content_block_delta') {
            if (chunk.delta?.type === 'text_delta') {
              const textChunk = chunk.delta.text;
              fullResponse += textChunk;
              
              res.write(textChunk);
            }
          }
          else if (chunk.type === 'content_block_start') {
          }
          else if (chunk.type === 'content_block_stop') {
          }
          else if (chunk.type === 'message_delta') {
            if (chunk.usage) {
              outputTokens = chunk.usage.output_tokens || 0;
            }
            if (chunk.delta?.stop_reason) {
            }
          }
          else if (chunk.type === 'message_stop') {
            break;
          }
        } catch (chunkError) {
          continue;
        }
      }

      res.end();

      if (typeof analyzeAIResponse === 'function') {
        try {
          const responseAnalysis = analyzeAIResponse(fullResponse);
        } catch (analysisError) {
        }
      }

      if (fullResponse.trim()) {
        try {
          await prismaClient.prompt.create({
            data: {
              content: fullResponse,
              type: "SYSTEM",
              projectId: project.id,
            },
          });
        } catch (dbError) {
        }
      }

    } catch (streamError) {
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to stream response from Anthropic" });
      } else {
        res.end();
      }
    }

  } catch (error) {
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
    res.status(500).json({ error: "Failed to get boilerplate components" });
  }
});

app.get("/api/debug/path-strip-test", async (req, res) => {
  try {
    const testPaths = [
      'todo-dapp/src/app/page.tsx',
      'my-solana-app/src/components/WalletButton.tsx', 
      'nft-marketplace/src/lib/utils.ts',
      'src/app/layout.tsx', // Should not be stripped
      'public/favicon.ico', // Should not be stripped
      'package.json', // Should not be stripped
      'solana-nft-dapp/anchor/programs/nft/lib.rs'
    ];
    
    const stripTopLevelFolder = (filePath: string): string => {
      const cleanPath = filePath.replace(/^\/+/, '');
      const parts = cleanPath.split('/');
      
      if (parts.length > 1 && parts[0]) {
        const firstPart = parts[0].toLowerCase();
        const validTopLevelFolders = ['src', 'public', 'pages', 'components', 'lib', 'app', 'styles', 'utils', 'hooks', 'types', 'config', 'anchor', 'tests'];
        
        if (!validTopLevelFolders.includes(firstPart) && !firstPart.startsWith('.')) {
          return parts.slice(1).join('/');
        }
      }
      
      return cleanPath;
    };
    
    const results = testPaths.map(path => ({
      original: path,
      stripped: stripTopLevelFolder(path),
      wasStripped: path !== stripTopLevelFolder(path)
    }));
    
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: "Failed to test path stripping" });
  }
});

app.get("/api/debug/parse-test", async (req, res) => {
  try {
    const emptyResponse = "";
    const testResponse = "Create a simple hello world component";
    
    const parseXML = (content: string) => {
      const fileMatches = content.match(/<forgeAction[^>]*type=["']file["'][^>]*filePath=["']([^"']+)["'][^>]*>([\s\S]*?)<\/forgeAction>/gi) || [];
      const dirMatches = content.match(/<forgeAction[^>]*type=["']directory["'][^>]*dirPath=["']([^"']+)["'][^>]*>/gi) || [];
      
      const files = fileMatches.map((match, index) => {
        const pathMatch = match.match(/filePath=["']([^"']+)["']/);
        const contentMatch = match.match(/<forgeAction[^>]*>([\s\S]*?)<\/forgeAction>/);
        return {
          id: `file-${index}`,
          path: pathMatch ? pathMatch[1] : `unknown-${index}`,
          content: contentMatch ? contentMatch[1].trim() : '',
          name: pathMatch ? pathMatch[1].split('/').pop() : `unknown-${index}`,
          language: 'text'
        };
      });
      
      const directories = dirMatches.map((match, index) => {
        const pathMatch = match.match(/dirPath=["']([^"']+)["']/);
        return {
          id: `dir-${index}`,
          path: pathMatch ? pathMatch[1] : `unknown-${index}`,
          name: pathMatch ? pathMatch[1].split('/').pop() : `unknown-${index}`,
          isDirectory: true
        };
      });
      
      return { files, directories };
    };
    
    const boilerplateResult = parseXML(boilerplateComponents);
    const emptyResult = parseXML(emptyResponse);
    const testResult = parseXML(testResponse);
    
    res.json({
      boilerplateOnly: {
        files: boilerplateResult.files.length,
        directories: boilerplateResult.directories.length,
        uiFiles: boilerplateResult.files.filter(f => f.path.includes('src/components/ui/')).length,
        sampleFiles: boilerplateResult.files.slice(0, 3).map(f => ({ path: f.path, name: f.name }))
      },
      emptyResponse: {
        files: emptyResult.files.length,
        directories: emptyResult.directories.length,
      },
      testResponse: {
        files: testResult.files.length,
        directories: testResult.directories.length,
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to test parsing" });
  }
});

app.get("/api/debug/boilerplate", async (req, res) => {
  try {
    const uiComponentCount = (boilerplateComponents.match(/src\/components\/ui\//g) || []).length;
    const fileCount = (boilerplateComponents.match(/<forgeAction[^>]*type=["']file["']/g) || []).length;
    const dirCount = (boilerplateComponents.match(/<forgeAction[^>]*type=["']directory["']/g) || []).length;
    
    const uiFiles: string[] = [];
    const uiMatches = boilerplateComponents.match(/<forgeAction[^>]*type=["']file["'][^>]*filePath=["']src\/components\/ui\/[^"']*["']/g) || [];
    
    uiMatches.forEach(match => {
      const pathMatch = match.match(/filePath=["']([^"']+)["']/);
      if (pathMatch) {
        uiFiles.push(pathMatch[1]);
      }
    });

    res.json({
      uiComponentCount,
      totalFiles: fileCount,
      totalDirectories: dirCount,
      uiFiles,
      boilerplateLength: boilerplateComponents.length,
      hasUIDirectory: boilerplateComponents.includes('src/components/ui')
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to debug boilerplate" });
  }
});

app.post("/api/admin/add-ui-components", async (req, res) => {
  try {
    
    const projects = await prismaClient.project.findMany();
    let updatedCount = 0;

    for (const project of projects) {
      
      await prismaClient.project.update({
        where: { id: project.id },
        data: { updatedAt: new Date() }
      });
      
      updatedCount++;
    }
    
    res.json({ 
      success: true, 
      message: `Processed ${updatedCount} projects`,
      note: "UI components will be available in new AI responses for these projects"
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to update projects" });
  }
});

app.get('/', (req, res) => {
  res.json({
    name: "Sol Dapper API",
    version: "1.0.0",
    description: "AI-powered Solana development platform backend API",
    status: "running",
    endpoints: [
      "POST /api/register - Register/login user",
      "POST /api/project - Create new project",
      "POST /api/chat - Chat with AI",
      "GET /api/project/:id - Get project details",
      "PUT /api/project/:id/state - Update project state"
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
