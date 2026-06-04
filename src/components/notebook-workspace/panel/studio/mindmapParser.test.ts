import { describe, expect, it } from 'vitest'
import { parseMermaidMindmap } from './mindmapParser'

describe('parseMermaidMindmap', () => {
  it('parses fenced mermaid mindmap into tree nodes', () => {
    const parsed = parseMermaidMindmap(`
\`\`\`mermaid
mindmap
  root((火星探秘历程))
    探测器时代
      海盗号生命实验无定论
    火星车探索
      毅力号样本封装
\`\`\`
`)

    expect(parsed.parseError).toBe('')
    expect(parsed.nodes).toHaveLength(5)
    expect(parsed.edges).toHaveLength(4)
    expect(parsed.rootId).toBe(parsed.nodes[0]?.id ?? null)
  })

  it('returns parse error for empty content', () => {
    const parsed = parseMermaidMindmap('   ')
    expect(parsed.parseError).not.toBe('')
    expect(parsed.nodes).toHaveLength(0)
  })
})
