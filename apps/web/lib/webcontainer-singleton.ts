import { WebContainer, type WebContainerProcess } from '@webcontainer/api'

export class WebContainerSingleton {
  private static instance: WebContainer | null = null
  private static isBooting = false
  private static bootPromise: Promise<WebContainer> | null = null

  static async getInstance(): Promise<WebContainer> {
    // If we already have an instance, return it
    if (this.instance) {
      return this.instance
    }

    // If we're currently booting, wait for that to complete
    if (this.isBooting && this.bootPromise) {
      return this.bootPromise
    }

    // Start booting
    this.isBooting = true
    this.bootPromise = this.bootWebContainer()

    try {
      this.instance = await this.bootPromise
      return this.instance
    } finally {
      this.isBooting = false
      this.bootPromise = null
    }
  }

  private static async bootWebContainer(): Promise<WebContainer> {
    try {
      console.log('WebContainer: Starting boot process...')
      const container = await WebContainer.boot()
      console.log('WebContainer: Boot successful')
      return container
    } catch (error) {
      console.error('WebContainer: Boot failed:', error)
      
      // Reset state on error
      this.isBooting = false
      this.bootPromise = null
      
      throw error
    }
  }

  static isReady(): boolean {
    return this.instance !== null
  }

  static getInstanceSync(): WebContainer | null {
    return this.instance
  }

  // Method to reset the singleton (useful for cleanup or testing)
  static reset(): void {
    this.instance = null
    this.isBooting = false
    this.bootPromise = null
  }
} 