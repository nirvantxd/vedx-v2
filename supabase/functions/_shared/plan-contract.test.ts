import { extractGeminiCandidateText, isPlanDraft, type PlanDraft } from './plan-contract.ts'

const validPlan: PlanDraft = {
  summary: 'A steady, reviewable plan.',
  goals: [{
    title: 'Learn Python',
    category: 'study',
    desired_outcome: 'Complete a small project.',
    target_date: null,
    milestones: [{ title: 'Choose a beginner course', target_date: null }],
  }],
  habits: [{ title: 'Study for 30 minutes', frequency: 'daily', rationale: 'Build a consistent routine.' }],
  tasks: [{ title: 'Pick a course', due_date: null }],
  assumptions: ['The user has not set a deadline.'],
  questions: ['How many days per week are realistic?'],
}

Deno.test('accepts a valid reviewable plan draft', () => {
  if (!isPlanDraft(validPlan)) throw new Error('expected the plan to pass validation')
})

Deno.test('rejects unknown properties', () => {
  if (isPlanDraft({ ...validPlan, run_sql: 'select * from users' })) {
    throw new Error('unexpected properties must fail validation')
  }
})

Deno.test('rejects invalid dates and unbounded lists', () => {
  const invalidDate = structuredClone(validPlan)
  invalidDate.goals[0].target_date = '2026-02-30'
  if (isPlanDraft(invalidDate)) throw new Error('invalid calendar dates must fail validation')

  const tooManyTasks = structuredClone(validPlan)
  tooManyTasks.tasks = Array.from({ length: 9 }, (_, index) => ({ title: `Task ${index}`, due_date: null }))
  if (isPlanDraft(tooManyTasks)) throw new Error('task count must be bounded')
})

Deno.test('extracts text from a Gemini candidate response', () => {
  const result = extractGeminiCandidateText({
    candidates: [{ content: { parts: [{ text: '{"ok":true}' }] }, finishReason: 'STOP' }],
  })
  if (result !== '{"ok":true}') throw new Error('expected output text')

  if (extractGeminiCandidateText({ promptFeedback: { blockReason: 'SAFETY' } })) throw new Error('blocked responses must not be treated as plan JSON')
})
