import { WebContainer, type FileSystemTree, type WebContainerProcess } from '@webcontainer/api'
import type { ParsedFile } from '@/lib/xml-parser'

export interface ContainerFile {
  file: {
    contents: string
  }
}

export interface ContainerDirectory {
  directory: Record<string, ContainerFile | ContainerDirectory>
}

export type ContainerFileSystemTree = Record<string, ContainerFile | ContainerDirectory>

export class WebContainerService {
  private static instance: WebContainerService | null = null
  private webcontainer: WebContainer | null = null
  private isBooting = false
  private bootPromise: Promise<WebContainer> | null = null

  static getInstance(): WebContainerService {
    if (!WebContainerService.instance) {
      WebContainerService.instance = new WebContainerService()
    }
    return WebContainerService.instance
  }

  async getWebContainer(): Promise<WebContainer> {
    if (this.webcontainer) {
      return this.webcontainer
    }

    if (this.isBooting && this.bootPromise) {
      return this.bootPromise
    }

    this.isBooting = true
    this.bootPromise = this.bootWebContainer()
    
    try {
      this.webcontainer = await this.bootPromise
      return this.webcontainer
    } finally {
      this.isBooting = false
      this.bootPromise = null
    }
  }

  private async bootWebContainer(): Promise<WebContainer> {
    console.log('Booting WebContainer...')
    const container = await WebContainer.boot()
    console.log('WebContainer booted successfully')
    return container
  }

  /**
   * Convert ParsedFile array to WebContainer FileSystemTree format
   */
  convertFilesToFileSystemTree(files: ParsedFile[]): FileSystemTree {
    const tree: FileSystemTree = {}

    files.forEach(file => {
      const pathParts = file.path.split('/').filter(part => part.length > 0)
      let current = tree

      // Navigate/create directory structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirName = pathParts[i]
        if (!dirName) continue
        
        if (!current[dirName]) {
          current[dirName] = {
            directory: {}
          }
        }
        if ('directory' in current[dirName] && current[dirName].directory) {
          current = current[dirName].directory as FileSystemTree
        }
      }

      // Add the file
      const fileName = pathParts[pathParts.length - 1]
      if (fileName) {
        current[fileName] = {
          file: {
            contents: file.content
          }
        }
      }
    })

    return tree
  }

  /**
   * Mount files to the WebContainer
   */
  async mountFiles(files: ParsedFile[]): Promise<void> {
    const container = await this.getWebContainer()
    const fileSystemTree = this.convertFilesToFileSystemTree(files)
    
    console.log('Mounting files to WebContainer:', Object.keys(fileSystemTree))
    await container.mount(fileSystemTree)
    console.log('Files mounted successfully')
  }

  /**
   * Update files in the WebContainer by writing them individually
   * This is more efficient than re-mounting the entire file system
   */
  async updateFiles(files: ParsedFile[]): Promise<void> {
    const container = await this.getWebContainer()
    
    console.log(`Updating ${files.length} files in WebContainer`)
    
    let updatedCount = 0
    let errorCount = 0
    
    for (const file of files) {
      try {
        // Ensure directory exists
        const dirPath = file.path.substring(0, file.path.lastIndexOf('/'))
        if (dirPath) {
          await container.fs.mkdir(dirPath, { recursive: true }).catch(() => {
            // Directory might already exist, ignore error
          })
        }
        
        // Write the file
        await container.fs.writeFile(file.path, file.content)
        updatedCount++
      } catch (error) {
        console.error(`Failed to update file ${file.path}:`, error)
        errorCount++
      }
    }
    
    console.log(`Files updated: ${updatedCount} successful, ${errorCount} errors`)
    
    if (errorCount > 0) {
      throw new Error(`Failed to update ${errorCount} files`)
    }
  }

  /**
   * Install dependencies using npm
   */
  async installDependencies(): Promise<{ success: boolean; exitCode: number; output: string }> {
    const container = await this.getWebContainer()
    
    console.log('Installing dependencies...')
    const installProcess = await container.spawn('npm', ['install'])
    
    let output = ''
    const reader = installProcess.output.getReader()
    
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        output += value
        console.log('Install output:', value)
      }
    } finally {
      reader.releaseLock()
    }

    const exitCode = await installProcess.exit
    console.log('Install process exited with code:', exitCode)
    
    return {
      success: exitCode === 0,
      exitCode,
      output
    }
  }

  /**
   * Start the development server
   */
  async startDevServer(): Promise<{ process: WebContainerProcess; output: string }> {
    const container = await this.getWebContainer()
    
    console.log('Starting development server...')
    const devProcess = await container.spawn('npm', ['run', 'dev'])
    
    let output = ''
    const reader = devProcess.output.getReader()
    
    // Start reading output but don't wait for completion
    const readOutput = async () => {
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          output += value
          console.log('Dev server output:', value)
        }
      } finally {
        reader.releaseLock()
      }
    }
    
    // Start reading output in background
    readOutput().catch(console.error)
    
    return {
      process: devProcess,
      output
    }
  }

  /**
   * Run a custom command
   */
  async runCommand(command: string, args: string[] = []): Promise<{ success: boolean; exitCode: number; output: string }> {
    const container = await this.getWebContainer()
    
    console.log(`Running command: ${command} ${args.join(' ')}`)
    const process = await container.spawn(command, args)
    
    let output = ''
    const reader = process.output.getReader()
    
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        output += value
        console.log('Command output:', value)
      }
    } finally {
      reader.releaseLock()
    }

    const exitCode = await process.exit
    console.log(`Command exited with code: ${exitCode}`)
    
    return {
      success: exitCode === 0,
      exitCode,
      output
    }
  }

  /**
   * Write a single file to the container
   */
  async writeFile(path: string, content: string): Promise<void> {
    const container = await this.getWebContainer()
    console.log(`Writing file: ${path}`)
    await container.fs.writeFile(path, content)
  }

  /**
   * Read a file from the container
   */
  async readFile(path: string): Promise<string> {
    const container = await this.getWebContainer()
    console.log(`Reading file: ${path}`)
    const content = await container.fs.readFile(path, 'utf-8')
    return content
  }

  /**
   * Create a directory in the container
   */
  async createDirectory(path: string): Promise<void> {
    const container = await this.getWebContainer()
    console.log(`Creating directory: ${path}`)
    await container.fs.mkdir(path, { recursive: true })
  }

  /**
   * Listen for server-ready event
   */
  async onServerReady(callback: (port: number, url: string) => void): Promise<void> {
    const container = await this.getWebContainer()
    container.on('server-ready', callback)
  }

  /**
   * Listen for port events
   */
  async onPort(callback: (port: number, type: 'open' | 'close', url: string) => void): Promise<void> {
    const container = await this.getWebContainer()
    container.on('port', callback)
  }

  /**
   * Get the container instance (for advanced usage)
   */
  async getContainer(): Promise<WebContainer> {
    return this.getWebContainer()
  }
}

// Export singleton instance
export const webContainerService = WebContainerService.getInstance() 