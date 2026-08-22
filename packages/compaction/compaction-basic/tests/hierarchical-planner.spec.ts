import { describe, expect, it } from 'vitest'
import {
  CallId,
  createAssistantMessage,
  createToolResultMessage,
  createUserMessage,
} from '@deepseek-ai/dsh-llm'
import type { Message } from '@deepseek-ai/dsh-llm'
import {
  estimateMessages,
  OversizedCompactionUnitError,
  planMessageChunks,
  splitMessageChunk,
  toolBalancedUnits,
} from '@deepseek-ai/dsh-compaction-basic/src/hierarchical-planner.ts'

function user(text: string): Message {
  return createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } })
}

function priced(messages: readonly Message[], prices: readonly number[]) {
  const byId = new Map(messages.map((message, index) => [message.id, prices[index] ?? 0]))
  return (message: Message): number => byId.get(message.id) ?? 0
}

describe('hierarchical message planner', () => {
  it('sums estimates and greedily fills the budget in order', () => {
    const messages = [user('a'), user('b'), user('c')]
    const estimate = priced(messages, [5, 20, 9])
    expect(estimateMessages(messages, estimate)).toBe(34)
    expect(planMessageChunks([], 25, estimate)).toEqual([])
    expect(planMessageChunks(messages, 25, estimate).map(chunk => chunk.map(message => message.id)))
      .toEqual([
        [messages[0]?.id, messages[1]?.id],
        [messages[2]?.id],
      ])
  })

  it('keeps tool calls and results in one indivisible unit', () => {
    const callA = CallId('call-a')
    const callB = CallId('call-b')
    const request = user('run both')
    const assistant = createAssistantMessage({
      content: [
        { type: 'tool-call', id: callA, name: 'read', arguments: '{}' },
        { type: 'tool-call', id: callB, name: 'grep', arguments: '{}' },
      ],
      source: { provider: 'test', model: 'test' },
    })
    const resultA = createToolResultMessage({
      callId: callA,
      content: [{ type: 'text', text: 'a' }],
      isError: false,
    })
    const resultB = createToolResultMessage({
      callId: callB,
      content: [{ type: 'text', text: 'b' }],
      isError: false,
    })
    const after = user('continue')
    const messages = [request, assistant, resultA, resultB, after]
    const estimate = priced(messages, [2, 3, 2, 2, 2])

    expect(toolBalancedUnits(messages).map(unit => unit.map(message => message.id))).toEqual([
      [request.id],
      [assistant.id, resultA.id, resultB.id],
      [after.id],
    ])
    expect(planMessageChunks(messages, 10, estimate).map(chunk => chunk.map(message => message.id)))
      .toEqual([
        [request.id, assistant.id, resultA.id, resultB.id],
        [after.id],
      ])
    const split = splitMessageChunk(messages, estimate)
    expect(split).not.toBeNull()
    const toolSide = split?.find(side => side.some(message => message.id === assistant.id))
    expect(toolSide?.map(message => message.id)).toEqual([
      assistant.id,
      resultA.id,
      resultB.id,
      after.id,
    ])
  })

  it('chooses weighted boundaries and count-balances zero-priced units', () => {
    const weighted = [user('a'), user('b'), user('c'), user('d')]
    expect(splitMessageChunk(weighted, priced(weighted, [8, 7, 2, 1]))
      ?.map(side => side.map(message => message.id))).toEqual([
      [weighted[0]?.id],
      [weighted[1]?.id, weighted[2]?.id, weighted[3]?.id],
    ])

    const zero = splitMessageChunk(weighted, () => 0)
    expect(zero?.map(side => side.map(message => message.id))).toEqual([
      [weighted[0]?.id, weighted[1]?.id],
      [weighted[2]?.id, weighted[3]?.id],
    ])
    expect(splitMessageChunk([weighted[0] as Message], () => 1)).toBeNull()
  })

  it('rejects oversized, corrupt, unbalanced, and invalidly priced inputs', () => {
    const message = user('large')
    expect(() => planMessageChunks([message], 10, () => 11))
      .toThrow(OversizedCompactionUnitError)
    expect(() => planMessageChunks([message], 0, () => 1)).toThrow(/positive integer/)

    const call = CallId('missing')
    const orphan = createToolResultMessage({
      callId: call,
      content: [{ type: 'text', text: 'orphan' }],
      isError: false,
    })
    expect(() => toolBalancedUnits([orphan])).toThrow(/has no call/)
    const open = createAssistantMessage({
      content: [{ type: 'tool-call', id: call, name: 'read', arguments: '{}' }],
      source: { provider: 'test', model: 'test' },
    })
    expect(() => toolBalancedUnits([open])).toThrow(/unresolved tool call/)
    expect(() => toolBalancedUnits([open, open])).toThrow(/duplicate tool call/)
    expect(() => estimateMessages([message], () => -1)).toThrow(/invalid token count/)
    expect(() => estimateMessages([message], () => 1.5)).toThrow(/invalid token count/)
  })
})
