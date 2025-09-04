export enum StepType {
  CreateFile = 'CreateFile',
  CreateFolder = 'CreateFolder', 
  RunScript = 'RunScript',
  EditFile = 'EditFile',
  InstallPackage = 'InstallPackage'
}

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Step {
  id: number;
  title: string;
  description: string;
  type: StepType;
  status: StepStatus;
  code?: string;
  path?: string;
  command?: string;
}

export function parseForgeXml(response: string): Step[] {
    const steps: Step[] = [];
    let stepId = 1;
    
    console.log('Parsing forge XML from response:', response);
    
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
        console.log('No forgeArtifact found in response');
        return steps;
    }
        
    const fullMatch = artifactMatch[0] || '';
    const attributes = artifactMatch[1] || '';
    const content = artifactMatch[2] || '';
    
    console.log('Found forgeArtifact:', { 
        fullMatch: fullMatch.substring(0, 200) + '...', 
        attributes,
        contentLength: content.length,
        hasClosingTag: fullMatch.includes('</forgeArtifact>') || fullMatch.includes('&lt;/forgeArtifact&gt;')
    });
    
    // Extract id and title attributes from the opening tag attributes
    const idMatch = attributes.match(/id=["']([^"']*)["']/i); 
    const titleMatch = attributes.match(/title=["']([^"']*)["']/i); 
    
    const artifactId: string = (idMatch && idMatch[1]) || 'unknown';
    const title: string = (titleMatch && titleMatch[1]) || 'Untitled Project';
    
    console.log('Found artifact:', { artifactId, title });
    
    if (!content) {
        console.log('No content found in artifact');
        return steps;
    }
    
    // Add initial artifact step
    steps.push({
        id: stepId++,
        title: title,
        description: `Project: ${artifactId}`,
        type: StepType.CreateFolder,
        status: 'pending'
    });

    // Enhanced parsing for forgeAction elements
    const actionRegex = /<forgeAction\s+([^>]*?)>([\s\S]*?)<\/forgeAction>/gi;
    let actionMatch;
    
    console.log('Searching for forgeAction elements in content...');
    
    while ((actionMatch = actionRegex.exec(content)) !== null) {
        const attributes = actionMatch[1] || '';
        const actionContent = actionMatch[2] || '';
        
        console.log('Raw attributes found:', attributes);
        console.log('Raw content found:', actionContent.substring(0, 100) + '...');
        
        // Parse attributes more robustly - handle both quoted and unquoted values
        const typeMatch = attributes.match(/type=["']?([^"'\s]*)["']?/i);
        const filePathMatch = attributes.match(/filePath=["']?([^"'\s]*)["']?/i);
        const commandMatch = attributes.match(/command=["']?([^"'\s]*)["']?/i);
        
        const type = typeMatch ? typeMatch[1] : '';
        const filePath = filePathMatch ? filePathMatch[1] : '';
        const command = commandMatch ? commandMatch[1] : '';
        
        console.log('Found forgeAction:', { type, filePath, command, contentLength: actionContent.length });
        
        if (type === 'file' && filePath && actionContent) {
            // Create any necessary directory structure
            const directories = getDirectoriesFromPath(filePath);
            directories.forEach(dirPath => {
                // Check if we already have this directory step
                if (!steps.some(step => step.type === StepType.CreateFolder && step.path === dirPath)) {
                    steps.push({
                        id: stepId++,
                        title: `Create directory ${getFileName(dirPath)}`,
                        description: `Creating directory: ${dirPath}`,
                        type: StepType.CreateFolder,
                        status: 'pending',
                        path: dirPath
                    });
                }
            });
            
            // File creation step
            const fileName = getFileName(filePath);
            const cleanContent = actionContent.trim();
            
            steps.push({
                id: stepId++,
                title: `Create ${fileName}`,
                description: `Creating file: ${filePath} (${cleanContent.length} characters)`,
                type: StepType.CreateFile,
                status: 'pending',
                code: cleanContent,
                path: filePath
            });
            
            console.log(`Added file step: ${filePath}`);
            
        } else if ((type === 'shell' || type === 'command') && (command || actionContent)) {
            // Shell command step
            const commandText = command || actionContent.trim();
            if (commandText) {
                steps.push({
                    id: stepId++,
                    title: `Run: ${commandText}`,
                    description: `Execute command: ${commandText}`,
                    type: StepType.RunScript,
                    status: 'pending',
                    code: commandText,
                    command: commandText
                });
                
                console.log(`Added shell step: ${commandText}`);
            }
        } else {
            console.log('Unhandled action type or missing data:', { type, filePath, command, hasContent: !!actionContent });
        }
    }
    
    console.log(`Parsed ${steps.length} total steps`);
    return steps;
}

// Helper function to extract filename from path
function getFileName(filePath: string | undefined): string {
    if (!filePath) return 'file';
    return filePath.split('/').pop() || filePath;
}

// Helper function to extract directory paths from a file path
function getDirectoriesFromPath(filePath: string): string[] {
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

// Enhanced parser that handles both bolt and forge formats
export function parseUniversalXml(response: string): Step[] {
  // Try forge format first
  const forgeSteps = parseForgeXml(response);
  if (forgeSteps.length > 0) {
    return forgeSteps;
  }
  
  // Fallback to bolt format - would need to implement this if you have bolt format support
  // return parseBoltXml(response);
  return [];
}

// Enhanced parser that handles both formats
export function parseXml(response: string): Step[] {
    // Try forge format first
    const forgeSteps = parseForgeXml(response);
    if (forgeSteps.length > 0) {
        return forgeSteps;
    }
    
    // Fallback to original bolt format parsing
    const xmlMatch = response.match(/<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/);
    
    if (!xmlMatch) {
        return [];
    }

    const xmlContent = xmlMatch[1] || '';
    const steps: Step[] = [];
    let stepId = 1;

    // Extract artifact title
    const titleMatch = response.match(/title="([^"]*)"/);
    const artifactTitle = (titleMatch && titleMatch[1]) || 'Project Files';

    // Add initial artifact step
    steps.push({
        id: stepId++,
        title: artifactTitle,
        description: '',
        type: StepType.CreateFolder,
        status: 'pending'
    });

    // Regular expression to find boltAction elements
    const actionRegex = /<boltAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/boltAction>/g;
    
    let match;
    while ((match = actionRegex.exec(xmlContent)) !== null) {
        const [, type, filePath, content] = match;

        if (type === 'file' && content) {
            // File creation step
            steps.push({
                id: stepId++,
                title: `Create ${filePath || 'file'}`,
                description: '',
                type: StepType.CreateFile,
                status: 'pending',
                code: content.trim(),
                path: filePath || 'file'
            });
        } else if (type === 'shell' && content) {
            // Shell command step
            steps.push({
                id: stepId++,
                title: 'Run command',
                description: '',
                type: StepType.RunScript,
                status: 'pending',
                code: content.trim()
            });
        }
    }

    return steps;
} 