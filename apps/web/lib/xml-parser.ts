import { XMLParser } from 'fast-xml-parser';
import { Step, parseForgeXml } from './steps';

export interface ParsedFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isDirectory?: boolean;
  children?: ParsedFile[];
}

export interface ParsedResponse {
  text?: string;
  files: ParsedFile[];
  directories: ParsedFile[];
  codeBlocks: {
    id: string;
    language: string;
    content: string;
    filename?: string;
  }[];
  review?: {
    summary: string;
    suggestions: string[];
    issues: string[];
  };
  artifact?: {
    id: string;
    title: string;
    shellCommands: string[];
  };
  steps?: Step[];
}

export class AIResponseParser {
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseTagValue: false,
      parseAttributeValue: false,
      trimValues: true,
      preserveOrder: true,
      unpairedTags: ["hr", "br", "img"]
    });
  }

  /**
   * Extract just plain text from a streaming response, removing XML and code blocks
   * This is optimized for real-time streaming where XML might be incomplete
   */
  extractStreamingPlainText(response: string): string {
    return this.extractPlainTextForStreaming(response);
  }

  /**
   * Parse AI response text that may contain XML tags for files, code, etc.
   */
  parseResponse(response: string, isStreaming: boolean = false): ParsedResponse {
    console.log('XML Parser - Input response:', response, 'isStreaming:', isStreaming);
    
    const result: ParsedResponse = {
      files: [],
      directories: [],
      codeBlocks: [],
    };

    // For streaming responses, try to extract partial content
    if (isStreaming) {
      this.parseStreamingContent(response, result);
    } else {
      // Extract and parse forgeArtifact specifically
      this.parseForgeArtifactDirectly(response, result);
    }

    // Extract code blocks (markdown style) as fallback
    result.codeBlocks.push(...this.extractCodeBlocks(response));

    // Extract plain text (remove XML and code blocks)
    if (isStreaming) {
      // Use streaming-optimized plain text extraction
      result.text = this.extractPlainTextForStreaming(response);
    } else {
      const xmlBlocks = this.extractXMLBlocks(response);
      result.text = this.extractPlainText(response, xmlBlocks);
    }

    // Also parse as steps for the Builder component
    result.steps = parseForgeXml(response);

    console.log('XML Parser - Final result:', result);
    return result;
  }

  /**
   * Merge boilerplate components with AI response
   * AI files take precedence - boilerplate only fills in missing files
   */
  parseResponseWithBoilerplate(response: string, boilerplateComponents: string): ParsedResponse {
    console.log('XML Parser - Adding boilerplate to fill gaps in AI response');
    const aiResult = this.parseResponse(response, false);
    const boilerplateResult = this.parseResponse(boilerplateComponents, false);
    
    console.log('XML Parser - AI response parsed:', {
      files: aiResult.files.length,
      directories: aiResult.directories.length
    });
    
    console.log('XML Parser - Boilerplate parsed:', {
      files: boilerplateResult.files.length,
      directories: boilerplateResult.directories.length
    });
    
    // Start with AI files (these take precedence)
    const mergedFiles: ParsedFile[] = [...aiResult.files];
    const mergedDirectories: ParsedFile[] = [...aiResult.directories];
    
    // Add boilerplate files ONLY if AI didn't provide them
    boilerplateResult.files.forEach(boilerplateFile => {
      const aiFileExists = aiResult.files.some(aiFile => aiFile.path === boilerplateFile.path);
      if (!aiFileExists) {
        mergedFiles.push(boilerplateFile);
        console.log('XML Parser - Adding missing boilerplate file:', boilerplateFile.path);
      } else {
        console.log('XML Parser - AI provided file, skipping boilerplate:', boilerplateFile.path);
      }
    });
    
    // Add boilerplate directories ONLY if AI didn't provide them
    boilerplateResult.directories.forEach(boilerplateDir => {
      const aiDirExists = aiResult.directories.some(aiDir => aiDir.path === boilerplateDir.path);
      if (!aiDirExists) {
        mergedDirectories.push(boilerplateDir);
        console.log('XML Parser - Adding missing boilerplate directory:', boilerplateDir.path);
      } else {
        console.log('XML Parser - AI provided directory, skipping boilerplate:', boilerplateDir.path);
      }
    });
    
    // Merge other properties (prioritize AI content)
    const mergedResult: ParsedResponse = {
      files: mergedFiles,
      directories: mergedDirectories,
      codeBlocks: [...aiResult.codeBlocks, ...boilerplateResult.codeBlocks],
      text: aiResult.text || boilerplateResult.text, // Prefer AI response text
      review: aiResult.review, // Use AI review if present
      artifact: aiResult.artifact || boilerplateResult.artifact, // Prefer AI artifact
      steps: [...(aiResult.steps || []), ...(boilerplateResult.steps || [])],
    };
    
    console.log('XML Parser - Final result:', {
      totalFiles: mergedResult.files.length,
      totalDirectories: mergedResult.directories.length,
      aiFiles: aiResult.files.length,
      addedBoilerplateFiles: mergedResult.files.length - aiResult.files.length,
      codeBlocks: mergedResult.codeBlocks.length
    });
    
    return mergedResult;
  }

  /**
   * Merge existing files with new AI response
   * New AI files take precedence - existing files are preserved only if not overwritten
   */
  parseResponseWithExistingFiles(newResponse: string, existingFiles: string, boilerplateComponents?: string): ParsedResponse {
    console.log('XML Parser - Merging new AI response with existing files');
    
    // Parse the new AI response
    const newResult = this.parseResponse(newResponse, false);
    
    // Parse existing files
    const existingResult = this.parseResponse(existingFiles, false);
    
    console.log('XML Parser - New AI response parsed:', {
      files: newResult.files.length,
      directories: newResult.directories.length
    });
    
    console.log('XML Parser - Existing files parsed:', {
      files: existingResult.files.length,
      directories: existingResult.directories.length
    });
    
    // Start with existing files
    const mergedFiles: ParsedFile[] = [...existingResult.files];
    const mergedDirectories: ParsedFile[] = [...existingResult.directories];
    
    // Add or update files from new AI response (these take precedence)
    newResult.files.forEach(newFile => {
      const existingFileIndex = mergedFiles.findIndex(existingFile => existingFile.path === newFile.path);
      if (existingFileIndex >= 0) {
        // Replace existing file with new version
        mergedFiles[existingFileIndex] = newFile;
        console.log('XML Parser - Updated existing file:', newFile.path);
      } else {
        // Add new file
        mergedFiles.push(newFile);
        console.log('XML Parser - Added new file:', newFile.path);
      }
    });
    
    // Add or update directories from new AI response
    newResult.directories.forEach(newDir => {
      const existingDirIndex = mergedDirectories.findIndex(existingDir => existingDir.path === newDir.path);
      if (existingDirIndex >= 0) {
        // Replace existing directory with new version
        mergedDirectories[existingDirIndex] = newDir;
        console.log('XML Parser - Updated existing directory:', newDir.path);
      } else {
        // Add new directory
        mergedDirectories.push(newDir);
        console.log('XML Parser - Added new directory:', newDir.path);
      }
    });
    
    // If boilerplate is provided, add missing boilerplate files
    if (boilerplateComponents) {
      const boilerplateResult = this.parseResponse(boilerplateComponents);
      
      boilerplateResult.files.forEach(boilerplateFile => {
        const fileExists = mergedFiles.some(file => file.path === boilerplateFile.path);
        if (!fileExists) {
          mergedFiles.push(boilerplateFile);
          console.log('XML Parser - Added missing boilerplate file:', boilerplateFile.path);
        }
      });
      
      boilerplateResult.directories.forEach(boilerplateDir => {
        const dirExists = mergedDirectories.some(dir => dir.path === boilerplateDir.path);
        if (!dirExists) {
          mergedDirectories.push(boilerplateDir);
          console.log('XML Parser - Added missing boilerplate directory:', boilerplateDir.path);
        }
      });
    }
    
    // Merge other properties (prioritize new AI content)
    const mergedResult: ParsedResponse = {
      files: mergedFiles,
      directories: mergedDirectories,
      codeBlocks: [...(existingResult.codeBlocks || []), ...(newResult.codeBlocks || [])],
      text: newResult.text || existingResult.text, // Prefer new AI response text
      review: newResult.review || existingResult.review, // Prefer new AI review
      artifact: newResult.artifact || existingResult.artifact, // Prefer new AI artifact
      steps: [...(existingResult.steps || []), ...(newResult.steps || [])],
    };
    
    console.log('XML Parser - Final merged result:', {
      totalFiles: mergedResult.files.length,
      totalDirectories: mergedResult.directories.length,
      existingFiles: existingResult.files.length,
      newFiles: newResult.files.length,
      finalFilesList: mergedResult.files.map(f => f.path)
    });
    
    return mergedResult;
  }

  /**
   * Parse streaming content - handles incomplete XML during generation
   */
  private parseStreamingContent(response: string, result: ParsedResponse) {
    console.log('XML Parser - Parsing streaming content');
    
    // Look for the start of a forgeArtifact block
    const artifactStartRegex = /<forgeArtifact\s+([^>]*)>/i;
    const artifactStartMatch = artifactStartRegex.exec(response);
    
    if (!artifactStartMatch) {
      console.log('XML Parser - No forgeArtifact start found in streaming content');
      return;
    }

    // Extract attributes from the opening tag
    const attributes = artifactStartMatch[1] || '';
    const idMatch = attributes.match(/id=["']([^"']*)["']/i);
    const titleMatch = attributes.match(/title=["']([^"']*)["']/i);
    
    const artifactId = (idMatch && idMatch[1]) || 'streaming-project';
    const title = (titleMatch && titleMatch[1]) || 'Streaming Project';
    
    // Set artifact metadata
    result.artifact = {
      id: artifactId,
      title: title,
      shellCommands: [],
    };

    // Get content after the opening tag
    const contentStart = artifactStartMatch.index! + artifactStartMatch[0].length;
    const contentAfterTag = response.substring(contentStart);
    
    // Look for any complete forgeAction elements
    const actionRegex = /<forgeAction\s+([^>]*?)>([\s\S]*?)<\/forgeAction>/gi;
    let actionMatch;
    
    console.log('XML Parser - Searching for complete forgeAction elements in streaming content...');
    
    while ((actionMatch = actionRegex.exec(contentAfterTag)) !== null) {
      const actionAttributes = actionMatch[1] || '';
      const actionContent = actionMatch[2] || '';
      
      // Parse attributes
      const typeMatch = actionAttributes.match(/type=["']?([^"'\s]*)["']?/i);
      const filePathMatch = actionAttributes.match(/filePath=["']?([^"'\s]*)["']?/i);
      
      const type = typeMatch ? typeMatch[1] : '';
      const filePath = filePathMatch ? filePathMatch[1] : '';
      
      console.log('XML Parser - Found streaming forgeAction:', { type, filePath });

      if (type === 'file' && filePath && actionContent) {
        // Handle file actions
        const fileName = this.extractFileName(filePath);
        const content = actionContent.trim();
        
        // Create directory structure if needed
        const directories = this.getDirectoriesFromPath(filePath);
        directories.forEach(dirPath => {
          const dirName = this.extractFileName(dirPath);
          const existingDir = result.directories.find(d => d.path === dirPath);
          if (!existingDir) {
            const parsedDir: ParsedFile = {
              id: `dir-${dirPath.replace(/[^a-zA-Z0-9]/g, '-')}`,
              name: dirName,
              path: dirPath,
              content: '',
              language: '',
              isDirectory: true,
              children: []
            };
            console.log('XML Parser - Adding streaming directory:', parsedDir);
            result.directories.push(parsedDir);
          }
        });
        
        // Check if file already exists (handle duplicates)
        const existingFileIndex = result.files.findIndex(f => f.path === filePath);
        if (existingFileIndex >= 0) {
          // Update existing file (later files override earlier ones)
          result.files[existingFileIndex] = {
            id: `file-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
            name: fileName,
            path: filePath,
            content: content,
            language: this.detectLanguage(fileName),
          };
          console.log('XML Parser - Updating existing streaming file:', filePath);
        } else {
          // Add new file
          const parsedFile: ParsedFile = {
            id: `file-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
            name: fileName,
            path: filePath,
            content: content,
            language: this.detectLanguage(fileName),
          };
          
          console.log('XML Parser - Adding new streaming file:', parsedFile);
          result.files.push(parsedFile);
        }

        // Also add as code block for display
        const existingCodeBlock = result.codeBlocks.find(cb => cb.filename === filePath);
        if (!existingCodeBlock) {
          result.codeBlocks.push({
            id: `code-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
            language: this.detectLanguage(fileName),
            content: content,
            filename: filePath,
          });
        }
      } else if (type === 'shell') {
        // Handle shell commands
        if (actionContent.trim()) {
          result.artifact.shellCommands.push(actionContent.trim());
        }
      }
    }

    // Also look for incomplete forgeAction elements (still being written)
    const incompleteActionRegex = /<forgeAction\s+([^>]*?)>([\s\S]*?)$/i;
    const incompleteMatch = incompleteActionRegex.exec(contentAfterTag);
    
    if (incompleteMatch) {
      const actionAttributes = incompleteMatch[1] || '';
      const partialContent = incompleteMatch[2] || '';
      
      // Parse attributes
      const typeMatch = actionAttributes.match(/type=["']?([^"'\s]*)["']?/i);
      const filePathMatch = actionAttributes.match(/filePath=["']?([^"'\s]*)["']?/i);
      
      const type = typeMatch ? typeMatch[1] : '';
      const filePath = filePathMatch ? filePathMatch[1] : '';
      
      if (type === 'file' && filePath && partialContent.length > 10) {
        console.log('XML Parser - Found incomplete streaming file:', filePath);
        
        const fileName = this.extractFileName(filePath);
        const content = partialContent.trim();
        
        // Add as a streaming file (will be updated as more content arrives)
        const parsedFile: ParsedFile = {
          id: `streaming-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
          name: fileName + ' (streaming...)',
          path: filePath,
          content: content,
          language: this.detectLanguage(fileName),
        };
        
        // Check if we already have this file and update it
        const existingIndex = result.files.findIndex(f => f.path === filePath);
        if (existingIndex >= 0) {
          result.files[existingIndex] = parsedFile;
        } else {
          result.files.push(parsedFile);
        }
      }
    }
    
    console.log('XML Parser - Streaming parse complete. Found:', {
      files: result.files.length,
      directories: result.directories.length
    });
  }

  /**
   * Parse forgeArtifact directly from raw text using regex
   */
  private parseForgeArtifactDirectly(response: string, result: ParsedResponse) {
    console.log('XML Parser - Starting forgeArtifact parsing');
    
    // Extract the entire forgeArtifact block including opening tag, content, and closing tag
    let artifactRegex = /<forgeArtifact\s+([^>]*)>([\s\S]*?)<\/forgeArtifact>/gi;
    let artifactMatch = artifactRegex.exec(response);
    
    // If not found, try HTML-encoded version
    if (!artifactMatch) {
      artifactRegex = /&lt;forgeArtifact\s+([^&gt;]*)&gt;([\s\S]*?)&lt;\/forgeArtifact&gt;/gi;
      artifactMatch = artifactRegex.exec(response);
    }
    
    // If still not found, try without closing tag (assume content goes to end)
    if (!artifactMatch) {
      artifactRegex = /<forgeArtifact\s+([^>]*)>([\s\S]*?)$/gi;
      artifactMatch = artifactRegex.exec(response);
    }
    
    // If still not found, try HTML-encoded without closing tag
    if (!artifactMatch) {
      artifactRegex = /&lt;forgeArtifact\s+([^&gt;]*)&gt;([\s\S]*?)$/gi;
      artifactMatch = artifactRegex.exec(response);
    }
    
    if (!artifactMatch) {
      console.log('XML Parser - No forgeArtifact found');
      return;
    }

    const fullMatch = artifactMatch[0] || '';
    const attributes = artifactMatch[1] || '';
    const artifactContent = artifactMatch[2] || '';
    
    console.log('XML Parser - Found forgeArtifact:', { 
      fullMatch: fullMatch.substring(0, 200) + '...',
      attributes,
      contentLength: artifactContent.length,
      hasClosingTag: fullMatch.includes('</forgeArtifact>') || fullMatch.includes('&lt;/forgeArtifact&gt;')
    });
    
    // Extract id and title from the opening tag attributes
    const idMatch = attributes.match(/id=["']([^"']*)["']/i);
    const titleMatch = attributes.match(/title=["']([^"']*)["']/i);
    
    const artifactId = (idMatch && idMatch[1]) || 'unknown';
    const title = (titleMatch && titleMatch[1]) || 'Untitled Project';
    
    console.log('XML Parser - Found forgeArtifact:', { artifactId, title });
    
    if (!artifactContent) {
      console.log('XML Parser - No artifact content found');
      return;
    }

    // Set artifact metadata
    result.artifact = {
      id: artifactId,
      title: title,
      shellCommands: [],
    };

    // Enhanced parsing for forgeAction elements using regex
    const actionRegex = /<forgeAction\s+([^>]*?)>([\s\S]*?)<\/forgeAction>/gi;
    let actionMatch;
    let shellIndex = 0;
    
    console.log('XML Parser - Searching for forgeAction elements...');
    
    while ((actionMatch = actionRegex.exec(artifactContent)) !== null) {
      const attributes = actionMatch[1] || '';
      const actionContent = actionMatch[2] || '';
      
      console.log('XML Parser - Raw attributes found:', attributes);
      console.log('XML Parser - Raw content found:', actionContent.substring(0, 100) + '...');
      
      // Parse attributes more robustly - handle both quoted and unquoted values
      const typeMatch = attributes.match(/type=["']?([^"'\s]*)["']?/i);
      const filePathMatch = attributes.match(/filePath=["']?([^"'\s]*)["']?/i);
      const commandMatch = attributes.match(/command=["']?([^"'\s]*)["']?/i);
      
      const type = typeMatch ? typeMatch[1] : '';
      const rawFilePath = filePathMatch ? filePathMatch[1] : '';
      const filePath = rawFilePath ? this.stripTopLevelFolder(rawFilePath) : '';
      const command = commandMatch ? commandMatch[1] : '';
      
      // Debug logging for path stripping
      if (rawFilePath && rawFilePath !== filePath) {
        console.log(`🔧 XML Parser - Stripped path: "${rawFilePath}" → "${filePath}"`);
      }
      
      console.log('XML Parser - Found forgeArtifact:', { 
        fullMatch: fullMatch.substring(0, 200) + '...',
        attributes,
        contentLength: artifactContent.length,
        hasClosingTag: fullMatch.includes('</forgeArtifact>') || fullMatch.includes('&lt;/forgeArtifact&gt;')
      });

      if (type === 'file' && filePath && actionContent) {
        // Handle file actions
        const fileName = this.extractFileName(filePath);
        const content = actionContent.trim();
        
        // Create directory structure if needed
        const directories = this.getDirectoriesFromPath(filePath);
        directories.forEach(dirPath => {
          const dirName = this.extractFileName(dirPath);
          const existingDir = result.directories.find(d => d.path === dirPath);
          if (!existingDir) {
            const parsedDir: ParsedFile = {
              id: `dir-${dirPath.replace(/[^a-zA-Z0-9]/g, '-')}`,
              name: dirName,
              path: dirPath,
              content: '',
              language: '',
              isDirectory: true,
              children: []
            };
            console.log('XML Parser - Adding directory:', parsedDir);
            result.directories.push(parsedDir);
          }
        });
        
        // Check if file already exists (handle duplicates)
        const existingFileIndex = result.files.findIndex(f => f.path === filePath);
        if (existingFileIndex >= 0) {
          // Update existing file (later files override earlier ones)
          result.files[existingFileIndex] = {
            id: `file-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
            name: fileName,
            path: filePath,
            content: content,
            language: this.detectLanguage(fileName),
          };
          console.log('XML Parser - Updating existing file:', filePath);
        } else {
          // Add new file
          const parsedFile: ParsedFile = {
            id: `file-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
            name: fileName,
            path: filePath,
            content: content,
            language: this.detectLanguage(fileName),
          };
          
          console.log('XML Parser - Adding new file:', parsedFile);
          result.files.push(parsedFile);
        }

        // Also add as code block for display (check for duplicates)
        const existingCodeBlock = result.codeBlocks.find(cb => cb.filename === filePath);
        if (!existingCodeBlock) {
          result.codeBlocks.push({
            id: `code-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
            language: this.detectLanguage(fileName),
            content: content,
            filename: filePath,
          });
        }

      } else if ((type === 'shell' || type === 'command') && (command || actionContent)) {
        // Handle shell commands
        const commandText = command || actionContent.trim();
        if (commandText) {
          console.log('XML Parser - Adding shell command:', commandText);
          result.artifact!.shellCommands.push(commandText);
          
          // Also add as code block for display (avoid duplicates)
          const shellCodeBlockId = `shell-${shellIndex++}`;
          const existingShellBlock = result.codeBlocks.find(cb => cb.content === commandText && cb.language === 'bash');
          if (!existingShellBlock) {
            result.codeBlocks.push({
              id: shellCodeBlockId,
              language: 'bash',
              content: commandText,
              filename: 'shell-commands.sh',
            });
          }
        }
      } else {
        console.log('XML Parser - Unhandled action type or missing data:', { type, filePath, command, hasContent: !!actionContent });
      }
    }
    
    // Final deduplication step
    result.files = this.deduplicateFiles(result.files);
    result.directories = this.deduplicateDirectories(result.directories);
    
    console.log('XML Parser - Completed parsing:', {
      filesFound: result.files.length,
      directoriesFound: result.directories.length,
      codeBlocks: result.codeBlocks.length,
      shellCommands: result.artifact?.shellCommands.length || 0
    });
  }

  /**
   * Deduplicate files by path, keeping the last occurrence
   */
  private deduplicateFiles(files: ParsedFile[]): ParsedFile[] {
    const fileMap = new Map<string, ParsedFile>();
    files.forEach(file => {
      const existing = fileMap.get(file.path);
      if (!existing) {
        // Use consistent ID format for files
        fileMap.set(file.path, {
          ...file,
          id: `file-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`
        });
      } else {
        // Update existing file with new content but keep consistent ID
        fileMap.set(file.path, {
          ...file,
          id: existing.id // Keep the existing ID to prevent key conflicts
        });
      }
    });
    return Array.from(fileMap.values());
  }

  /**
   * Deduplicate directories by path, keeping the last occurrence
   */
  private deduplicateDirectories(directories: ParsedFile[]): ParsedFile[] {
    const dirMap = new Map<string, ParsedFile>();
    directories.forEach(dir => {
      const existing = dirMap.get(dir.path);
      if (!existing) {
        // Use consistent ID format for directories
        dirMap.set(dir.path, {
          ...dir,
          id: `dir-${dir.path.replace(/[^a-zA-Z0-9]/g, '-')}`
        });
      }
    });
    return Array.from(dirMap.values());
  }

  /**
   * Extract filename from path
   */
  private extractFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  }

  /**
   * Normalize file paths for comparison (remove leading slashes, handle case sensitivity)
   */
  private normalizePath(filePath: string): string {
    return filePath.replace(/^\/+/, '').toLowerCase();
  }

  /**
   * Remove top-level project folder from AI-generated paths
   * Example: "todo-dapp/src/app/page.tsx" -> "src/app/page.tsx"
   */
  private stripTopLevelFolder(filePath: string): string {
    const cleanPath = filePath.replace(/^\/+/, ''); // Remove leading slashes
    const parts = cleanPath.split('/');
    
    // If path has more than 1 part and starts with a project folder name (not src, public, etc.)
    if (parts.length > 1 && parts[0]) {
      const firstPart = parts[0].toLowerCase();
      const validTopLevelFolders = ['src', 'public', 'pages', 'components', 'lib', 'app', 'styles', 'utils', 'hooks', 'types', 'config', 'anchor', 'tests'];
      
      // If first part is NOT a valid top-level folder, it's probably an AI-generated project name
      if (!validTopLevelFolders.includes(firstPart) && !firstPart.startsWith('.')) {
        console.log(`XML Parser - Stripping top-level folder "${parts[0]}" from path: ${filePath}`);
        return parts.slice(1).join('/'); // Remove first part
      }
    }
    
    return cleanPath; // Return as-is if no stripping needed
  }

  /**
   * Extract directory paths from a file path
   */
  private getDirectoriesFromPath(filePath: string): string[] {
    const directories: string[] = [];
    const parts = filePath.split('/');
    
    // Remove the filename (last part) and build directory paths
    for (let i = 0; i < parts.length - 1; i++) {
      const dirPath = parts.slice(0, i + 1).join('/');
      if (dirPath) {
        directories.push(dirPath);
      }
    }
    
    return directories;
  }

  /**
   * Extract XML blocks from the response
   */
  private extractXMLBlocks(text: string): { type: string; content: string }[] {
    const blocks: { type: string; content: string }[] = [];
    
    // Primary tags for Forge responses
    const xmlTags = ['forgeArtifact', 'files', 'file', 'directory', 'code', 'review', 'project'];
    
    xmlTags.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        if (match[0]) {
          blocks.push({
            type: tag,
            content: match[0]
          });
        }
      }
    });

    return blocks;
  }

  /**
   * Extract markdown code blocks
   */
  private extractCodeBlocks(text: string): ParsedResponse['codeBlocks'] {
    const codeBlocks: ParsedResponse['codeBlocks'] = [];
    const regex = /```(\w+)?\s*(?:\/\/\s*(.*))?\n([\s\S]*?)```/g;
    let match;
    let index = 0;

    while ((match = regex.exec(text)) !== null) {
      const [, language = 'text', filename, content] = match;
      codeBlocks.push({
        id: `code-${index++}`,
        language,
        content: content?.trim() || '',
        filename: filename?.trim(),
      });
    }

    return codeBlocks;
  }

  /**
   * Extract plain text by removing XML artifacts but preserving markdown formatting
   */
  private extractPlainText(text: string, xmlBlocks: { type: string; content: string }[]): string {
    let plainText = text;

    // Remove XML blocks
    xmlBlocks.forEach(block => {
      plainText = plainText.replace(block.content, '');
    });

    // Remove forgeArtifact and forgeAction blocks but preserve other markdown
    plainText = plainText.replace(/<forgeArtifact[\s\S]*?<\/forgeArtifact>/gi, '');
    plainText = plainText.replace(/<forgeAction[\s\S]*?<\/forgeAction>/gi, '');
    plainText = plainText.replace(/&lt;forgeArtifact[\s\S]*?&lt;\/forgeArtifact&gt;/gi, '');
    plainText = plainText.replace(/&lt;forgeAction[\s\S]*?&lt;\/forgeAction&gt;/gi, '');

    // Remove any remaining XML attributes that might have leaked through
    plainText = plainText.replace(/\s+(id|type|filePath|command)=["'][^"']*["']/gi, '');

    // Clean up extra whitespace but preserve markdown formatting
    plainText = plainText.replace(/\n\s*\n\s*\n/g, '\n\n'); // Multiple line breaks
    plainText = plainText.trim();

    return plainText;
  }

  /**
   * Extract plain text for streaming responses - remove XML artifacts but preserve markdown
   * This handles incomplete XML tags and streaming content
   */
  private extractPlainTextForStreaming(text: string): string {
    let plainText = text;

    // Remove complete forgeArtifact blocks first
    plainText = plainText.replace(/<forgeArtifact[\s\S]*?<\/forgeArtifact>/gi, '');
    
    // Remove incomplete forgeArtifact blocks (for streaming)
    plainText = plainText.replace(/<forgeArtifact[\s\S]*$/gi, '');
    
    // Remove any forgeAction blocks (complete and incomplete)
    plainText = plainText.replace(/<forgeAction[\s\S]*?<\/forgeAction>/gi, '');
    plainText = plainText.replace(/<forgeAction[\s\S]*$/gi, '');
    
    // Remove HTML-encoded XML (complete and incomplete)
    plainText = plainText.replace(/&lt;forgeArtifact[\s\S]*?&lt;\/forgeArtifact&gt;/gi, '');
    plainText = plainText.replace(/&lt;forgeArtifact[\s\S]*$/gi, '');
    plainText = plainText.replace(/&lt;forgeAction[\s\S]*?&lt;\/forgeAction&gt;/gi, '');
    plainText = plainText.replace(/&lt;forgeAction[\s\S]*$/gi, '');
    
    // Remove any XML attributes that might have leaked through
    plainText = plainText.replace(/\s+(id|type|filePath|command)=["'][^"']*["']/gi, '');
    
    // Clean up extra whitespace but preserve markdown formatting
    plainText = plainText.replace(/\n\s*\n\s*\n/g, '\n\n'); // Multiple line breaks
    plainText = plainText.trim();
    
    return plainText;
  }

  /**
   * Detect programming language from filename
   */
  private detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rs': 'rust',
      'go': 'go',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'dart': 'dart',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'md': 'markdown',
      'sh': 'bash',
      'sql': 'sql',
    };

    // Special cases for Solana/Anchor files
    if (filename.includes('Anchor.toml') || filename.includes('Cargo.toml')) {
      return 'toml';
    }
    if (filename.includes('lib.rs') || ext === 'rs') {
      return 'rust';
    }
    if (filename.includes('package.json') || filename.includes('tsconfig.json')) {
      return 'json';
    }
    if (filename.includes('next.config')) {
      return 'typescript';
    }
    if (filename.includes('tailwind.config')) {
      return 'javascript';
    }

    return languageMap[ext] || 'text';
  }

  /**
   * Convert parsed files to tree structure for file explorer
   */
  static filesToTree(files: ParsedFile[], directories: ParsedFile[] = []): ParsedFile[] {
    // Use Maps for efficient deduplication
    const allNodes = new Map<string, ParsedFile>()
    
    // Add existing directories first
    directories.forEach(dir => {
      allNodes.set(dir.path, { ...dir, children: [] })
    })
    
    // Process all files and create necessary directory structure
    files.forEach(file => {
      const pathParts = file.path.split('/').filter(Boolean)
      
      // Create directory structure for this file
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirPath = pathParts.slice(0, i + 1).join('/')
        const dirName = pathParts[i]
        
                 if (!allNodes.has(dirPath)) {
           allNodes.set(dirPath, {
             id: `dir-${dirPath.replace(/[^a-zA-Z0-9]/g, '-')}`,
             name: dirName || '',
             path: dirPath,
             content: '',
             language: '',
             isDirectory: true,
             children: [],
           })
         }
      }
      
      // Add the file itself
      allNodes.set(file.path, { ...file, children: undefined })
    })
    
    // Build the tree structure
    const tree: ParsedFile[] = []
    const nodesByPath = new Map<string, ParsedFile>()
    
    // Convert map to array and sort by path depth
    const sortedNodes = Array.from(allNodes.values()).sort((a, b) => {
      const aDepth = a.path.split('/').length
      const bDepth = b.path.split('/').length
      return aDepth - bDepth
    })
    
    // Build tree by adding nodes level by level
    sortedNodes.forEach(node => {
      nodesByPath.set(node.path, node)
      
      const pathParts = node.path.split('/').filter(Boolean)
      
      if (pathParts.length === 1) {
        // Root level file or directory
        tree.push(node)
      } else {
        // Find parent directory
        const parentPath = pathParts.slice(0, -1).join('/')
        const parent = nodesByPath.get(parentPath)
        
        if (parent && parent.children) {
          // Check for duplicates before adding
          const existingChild = parent.children.find(child => child.path === node.path)
          if (!existingChild) {
            parent.children.push(node)
          }
        }
      }
    })

    return tree
  }
}