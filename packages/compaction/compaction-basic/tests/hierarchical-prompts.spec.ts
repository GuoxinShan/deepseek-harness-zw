import { describe, expect, it } from 'vitest'
import {
  framePartialSummary,
  mapInstruction,
  reduceInstruction,
  SUMMARY_SECTIONS,
  validateStructuredSummary,
} from '@deepseek-ai/dsh-compaction-basic/src/hierarchical-prompts.ts'

const summary = SUMMARY_SECTIONS.map(section => `## ${section}\n- value`).join('\n\n')

describe('hierarchical compaction prompts', () => {
  it('requires the complete checkpoint structure for map and reduce calls', () => {
    for (const section of SUMMARY_SECTIONS) {
      expect(mapInstruction(1, 2, 3)).toContain(`## ${section}`)
      expect(reduceInstruction(2, 1, 2, 3)).toContain(`## ${section}`)
    }
    expect(mapInstruction(1, 2, 3)).toContain('source units 1-2 of 3')
    expect(reduceInstruction(2, 1, 2, 3)).toContain('reduce round 2, source units 1-2 of 3')
  })

  it('joins text blocks and rejects empty or structurally incomplete results', () => {
    expect(validateStructuredSummary([{ type: 'text', text: summary }], 'map')).toBe(summary)
    expect(() => validateStructuredSummary([
      { type: 'text', text: summary.replace('## Next Step', '## Missing') },
    ], 'reduce')).toThrow(/Next Step/)
    expect(() => validateStructuredSummary([], 'map')).toThrow(/no text/)
  })

  it('frames partials with stable source coordinates', () => {
    expect(framePartialSummary('checkpoint', 2, 5)).toBe(
      '<partial-summary start="2" end="5">\ncheckpoint\n</partial-summary>',
    )
  })
})
