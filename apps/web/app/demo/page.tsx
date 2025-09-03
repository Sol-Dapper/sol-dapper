import { ForgeParserDemo } from '@/components/ForgeParserDemo'
import { ParserDebug } from '@/components/ParserDebug'
import { SimpleMonacoTest } from '@/components/SimpleMonacoTest'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Monaco Editor & File Structure Demo</h1>
            <p className="text-xl text-muted-foreground">
              Experience how AI responses are parsed into interactive file trees and code editors
            </p>
          </div>
          
          <div className="space-y-8">
            <SimpleMonacoTest />
            <ParserDebug />
            <ForgeParserDemo />
          </div>
        </div>
      </div>
    </div>
  )
} 