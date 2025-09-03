"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeEditor } from './CodeEditor'

export function SimpleMonacoTest() {
  const [showEditor, setShowEditor] = useState(false)

  const sampleCode = `// Simple TypeScript test
interface User {
  id: string;
  name: string;
}

const user: User = {
  id: "123",
  name: "John Doe"
};

console.log(user);`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monaco Editor Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <button 
          onClick={() => setShowEditor(!showEditor)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {showEditor ? 'Hide' : 'Show'} Monaco Editor
        </button>
        
        {showEditor && (
          <div>
            <h4 className="font-semibold mb-2">Monaco Editor:</h4>
            <CodeEditor
              code={sampleCode}
              language="typescript"
              filename="test.ts"
              height={300}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
} 