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
   * Parse AI response text that may contain XML tags for files, code, etc.
   */
  parseResponse(response: string): ParsedResponse {
    console.log('XML Parser - Input response:', response);
    
    const result: ParsedResponse = {
      files: [],
      directories: [],
      codeBlocks: [],
    };

    // Extract and parse forgeArtifact specifically
    this.parseForgeArtifactDirectly(response, result);

    // Extract code blocks (markdown style) as fallback
    result.codeBlocks.push(...this.extractCodeBlocks(response));

    // Extract plain text (remove XML and code blocks)
    const xmlBlocks = this.extractXMLBlocks(response);
    result.text = this.extractPlainText(response, xmlBlocks);

    // Also parse as steps for the Builder component
    result.steps = parseForgeXml(response);

    console.log('XML Parser - Final result:', result);
    return result;
  }

  /**
   * Merge boilerplate components with AI response
   * The boilerplate components will be parsed first, then the AI response will override/extend them
   */
  parseResponseWithBoilerplate(response: string, boilerplateComponents: string): ParsedResponse {
    console.log('XML Parser - Merging boilerplate with AI response');
    const boilerplateResult = this.parseResponse(boilerplateComponents);
    const aiResult = this.parseResponse(response);
    
    console.log('XML Parser - Boilerplate parsed:', {
      files: boilerplateResult.files.length,
      directories: boilerplateResult.directories.length
    });
    
    console.log('XML Parser - AI response parsed:', {
      files: aiResult.files.length,
      directories: aiResult.directories.length
    });
    
    // Start with boilerplate files and directories
    const mergedFiles: ParsedFile[] = [...boilerplateResult.files];
    const mergedDirectories: ParsedFile[] = [...boilerplateResult.directories];
    
    // Override/add files from AI response
    aiResult.files.forEach(aiFile => {
      const existingIndex = mergedFiles.findIndex(f => f.path === aiFile.path);
      if (existingIndex >= 0) {
        // Override existing file
        mergedFiles[existingIndex] = aiFile;
        console.log('XML Parser - Overriding file:', aiFile.path);
      } else {
        // Add new file
        mergedFiles.push(aiFile);
        console.log('XML Parser - Adding new file:', aiFile.path);
      }
    });
    
    // Add directories from AI response (avoid duplicates)
    aiResult.directories.forEach(aiDir => {
      const existingIndex = mergedDirectories.findIndex(d => d.path === aiDir.path);
      if (existingIndex >= 0) {
        // Keep existing directory (boilerplate takes precedence for directory structure)
        console.log('XML Parser - Keeping existing directory:', aiDir.path);
      } else {
        // Add new directory
        mergedDirectories.push(aiDir);
        console.log('XML Parser - Adding new directory:', aiDir.path);
      }
    });
    
    // Merge other properties
    const mergedResult: ParsedResponse = {
      files: mergedFiles,
      directories: mergedDirectories,
      codeBlocks: [...boilerplateResult.codeBlocks, ...aiResult.codeBlocks],
      text: aiResult.text || boilerplateResult.text, // Prefer AI response text
      review: aiResult.review, // Use AI review if present
      artifact: aiResult.artifact || boilerplateResult.artifact, // Prefer AI artifact
      steps: [...(boilerplateResult.steps || []), ...(aiResult.steps || [])],
    };
    
    console.log('XML Parser - Merged result:', {
      totalFiles: mergedResult.files.length,
      totalDirectories: mergedResult.directories.length,
      codeBlocks: mergedResult.codeBlocks.length,
      preservedBoilerplateFiles: mergedResult.files.filter(f => 
        boilerplateResult.files.some(bf => bf.path === f.path) && 
        !aiResult.files.some(af => af.path === f.path)
      ).length
    });
    
    return mergedResult;
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
    let fileIndex = 0;
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
      const filePath = filePathMatch ? filePathMatch[1] : '';
      const command = commandMatch ? commandMatch[1] : '';
      
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
            id: `forge-file-${fileIndex++}`,
            name: fileName,
            path: filePath,
            content: content,
            language: this.detectLanguage(fileName),
          };
          console.log('XML Parser - Updating existing file:', filePath);
        } else {
          // Add new file
          const parsedFile: ParsedFile = {
            id: `forge-file-${fileIndex++}`,
            name: fileName,
            path: filePath,
            content: content,
            language: this.detectLanguage(fileName),
          };
          
          console.log('XML Parser - Adding new file:', parsedFile);
          result.files.push(parsedFile);
        }

        // Also add as code block for display
        result.codeBlocks.push({
          id: `forge-code-${fileIndex}`,
          language: this.detectLanguage(fileName),
          content: content,
          filename: filePath,
        });

      } else if ((type === 'shell' || type === 'command') && (command || actionContent)) {
        // Handle shell commands
        const commandText = command || actionContent.trim();
        if (commandText) {
          console.log('XML Parser - Adding shell command:', commandText);
          result.artifact!.shellCommands.push(commandText);
          
          // Also add as code block for display
          result.codeBlocks.push({
            id: `forge-shell-${shellIndex++}`,
            language: 'bash',
            content: commandText,
            filename: 'shell-commands.sh',
          });
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
      fileMap.set(file.path, file);
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
   * Extract plain text by removing XML and code blocks
   */
  private extractPlainText(text: string, xmlBlocks: { type: string; content: string }[]): string {
    let plainText = text;

    // Remove XML blocks
    xmlBlocks.forEach(block => {
      plainText = plainText.replace(block.content, '');
    });

    // Remove code blocks
    plainText = plainText.replace(/```[\s\S]*?```/g, '');

    return plainText.trim();
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
    const tree: ParsedFile[] = [...directories];
    
    // Group files by directory
    const filesByDir: { [key: string]: ParsedFile[] } = {};
    
    files.forEach(file => {
      const pathParts = file.path.split('/').filter(Boolean);
      if (pathParts.length > 1) {
        const dirPath = pathParts.slice(0, -1).join('/');
        if (!filesByDir[dirPath]) {
          filesByDir[dirPath] = [];
        }
        filesByDir[dirPath].push(file);
      } else {
        tree.push(file);
      }
    });

    // Create directory structure
    Object.entries(filesByDir).forEach(([dirPath, dirFiles]) => {
      const pathParts = dirPath.split('/');
      let currentLevel = tree;
      
      pathParts.forEach((part, index) => {
        const currentPath = pathParts.slice(0, index + 1).join('/');
        let dir = currentLevel.find(item => item.isDirectory && item.path === currentPath);
        
        if (!dir) {
          dir = {
            id: `dir-${currentPath}`,
            name: part,
            path: currentPath,
            content: '',
            language: '',
            isDirectory: true,
            children: [],
          };
          currentLevel.push(dir);
        }
        
        currentLevel = dir.children!;
      });
      
      // Add files to the deepest directory
      const deepestDir = pathParts.reduce((level, part, index) => {
        const currentPath = pathParts.slice(0, index + 1).join('/');
        return level.find(item => item.isDirectory && item.path === currentPath)?.children || [];
      }, tree);
      
      deepestDir.push(...dirFiles);
    });

    return tree;
  }
}