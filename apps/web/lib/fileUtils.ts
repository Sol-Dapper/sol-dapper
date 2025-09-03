import { Step, StepType } from './steps';

export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileItem[];
}

/**
 * Convert steps to file structure
 */
export function stepsToFileStructure(steps: Step[]): FileItem[] {
  const files: FileItem[] = [];
  const fileMap = new Map<string, FileItem>();
  
  // Process file creation steps
  steps
    .filter(step => step.status === 'pending' && step.type === StepType.CreateFile)
    .forEach(step => {
      if (!step.path) return;
      
      const pathParts = step.path.split('/').filter(Boolean);
      const fileName = pathParts[pathParts.length - 1] || 'untitled';
      
      // Create directory structure
      let currentPath = '';
      let currentLevel = files;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!part) continue;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        let folder = fileMap.get(currentPath);
        if (!folder) {
          folder = {
            id: `folder-${currentPath}`,
            name: part,
            path: currentPath,
            type: 'folder',
            children: []
          };
          fileMap.set(currentPath, folder);
          currentLevel.push(folder);
        }
        
        currentLevel = folder.children!;
      }
      
      // Add the file
      const file: FileItem = {
        id: `file-${step.id}`,
        name: fileName,
        path: step.path || '',
        type: 'file',
        content: step.code || ''
      };
      
      currentLevel.push(file);
      if (step.path) {
        fileMap.set(step.path, file);
      }
    });
  
  return files;
}

/**
 * Create WebContainer mount structure from files
 */
export function createMountStructure(files: FileItem[]): Record<string, unknown> {
  const mountStructure: Record<string, unknown> = {};
  
  const processFile = (file: FileItem): unknown => {
    if (file.type === 'folder') {
      return {
        directory: file.children ? 
          Object.fromEntries(
            file.children.map(child => [child.name, processFile(child)])
          ) : {}
      };
    } else if (file.type === 'file') {
      return {
        file: { contents: file.content || '' }
      };
    }
  };
  
  files.forEach(file => {
    mountStructure[file.name] = processFile(file);
  });
  
  return mountStructure;
}

/**
 * Get language from file extension
 */
export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
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

  return languageMap[ext] || 'text';
} 