export type PlanCategory = 'personal' | 'study' | 'fitness' | 'nutrition' | 'finance' | 'career' | 'wellbeing' | 'other'

export type PlanDraft = {
  summary: string
  goals: Array<{
    title: string
    category: PlanCategory
    desired_outcome: string
    target_date: string | null
    milestones: Array<{ title: string; target_date: string | null }>
  }>
  habits: Array<{ title: string; frequency: 'daily' | 'weekly'; rationale: string }>
  tasks: Array<{ title: string; due_date: string | null }>
  assumptions: string[]
  questions: string[]
}

const categories: PlanCategory[] = ['personal', 'study', 'fitness', 'nutrition', 'finance', 'career', 'wellbeing', 'other']

export const planSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string', maxLength: 800 },
    goals: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', maxLength: 160 },
          category: { type: 'string', enum: categories },
          desired_outcome: { type: 'string', maxLength: 500 },
          target_date: { type: ['string', 'null'] },
          milestones: {
            type: 'array',
            maxItems: 5,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                title: { type: 'string', maxLength: 160 },
                target_date: { type: ['string', 'null'] },
              },
              required: ['title', 'target_date'],
            },
          },
        },
        required: ['title', 'category', 'desired_outcome', 'target_date', 'milestones'],
      },
    },
    habits: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', maxLength: 160 },
          frequency: { type: 'string', enum: ['daily', 'weekly'] },
          rationale: { type: 'string', maxLength: 300 },
        },
        required: ['title', 'frequency', 'rationale'],
      },
    },
    tasks: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', maxLength: 160 },
          due_date: { type: ['string', 'null'] },
        },
        required: ['title', 'due_date'],
      },
    },
    assumptions: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 300 } },
    questions: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 300 } },
  },
  required: ['summary', 'goals', 'habits', 'tasks', 'assumptions', 'questions'],
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key))
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function isDateOrNull(value: unknown): value is string | null {
  if (value === null) return true
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}

function isMilestone(value: unknown): value is PlanDraft['goals'][number]['milestones'][number] {
  return isRecord(value)
    && hasOnlyKeys(value, ['title', 'target_date'])
    && isText(value.title, 160)
    && isDateOrNull(value.target_date)
}

function isGoal(value: unknown): value is PlanDraft['goals'][number] {
  return isRecord(value)
    && hasOnlyKeys(value, ['title', 'category', 'desired_outcome', 'target_date', 'milestones'])
    && isText(value.title, 160)
    && typeof value.category === 'string'
    && categories.includes(value.category as PlanCategory)
    && isText(value.desired_outcome, 500)
    && isDateOrNull(value.target_date)
    && Array.isArray(value.milestones)
    && value.milestones.length <= 5
    && value.milestones.every(isMilestone)
}

function isHabit(value: unknown): value is PlanDraft['habits'][number] {
  return isRecord(value)
    && hasOnlyKeys(value, ['title', 'frequency', 'rationale'])
    && isText(value.title, 160)
    && (value.frequency === 'daily' || value.frequency === 'weekly')
    && isText(value.rationale, 300)
}

function isTask(value: unknown): value is PlanDraft['tasks'][number] {
  return isRecord(value)
    && hasOnlyKeys(value, ['title', 'due_date'])
    && isText(value.title, 160)
    && isDateOrNull(value.due_date)
}

function isTextList(value: unknown, maxItems: number): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => isText(item, 300))
}

export function isPlanDraft(value: unknown): value is PlanDraft {
  return isRecord(value)
    && hasOnlyKeys(value, ['summary', 'goals', 'habits', 'tasks', 'assumptions', 'questions'])
    && isText(value.summary, 800)
    && Array.isArray(value.goals) && value.goals.length <= 3 && value.goals.every(isGoal)
    && Array.isArray(value.habits) && value.habits.length <= 5 && value.habits.every(isHabit)
    && Array.isArray(value.tasks) && value.tasks.length <= 8 && value.tasks.every(isTask)
    && isTextList(value.assumptions, 6)
    && isTextList(value.questions, 6)
}

export function extractGeminiCandidateText(value: unknown): string | undefined {
  if (!isRecord(value) || !Array.isArray(value.candidates)) return undefined
  const candidate = value.candidates[0]
  if (!isRecord(candidate) || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) return undefined
  const textPart = candidate.content.parts.find((part) => isRecord(part) && typeof part.text === 'string')
  return isRecord(textPart) && typeof textPart.text === 'string' ? textPart.text : undefined
}
