import type { ApiResponse } from '../types/auth'
import apiClient from './apiClient'

export type BenchmarkDifficulty = 'Easy' | 'Medium' | 'Hard'

export interface BenchmarkQuestion {
  id: string
  question: string
  subject: string
  difficulty: BenchmarkDifficulty
  expectedAnswer: string
  documentId?: string
  createdAt: string
  updatedAt?: string
}

export interface BenchmarkEvaluationScore {
  answerCorrectness: number
  faithfulness: number
  relevance: number
  completeness: number
  overallScore: number
  explanation: string
}

export interface BenchmarkRunResult {
  id: string
  benchmarkQuestionId: string
  question: string
  expectedAnswer: string
  answer: string
  evaluation: BenchmarkEvaluationScore
  createdAt: string
}

export interface BenchmarkSummary {
  totalRuns: number
  averageScore: number
  averageAnswerCorrectness: number
  averageFaithfulness: number
  averageRelevance: number
  averageCompleteness: number
}

export async function listBenchmarkQuestions(): Promise<BenchmarkQuestion[]> {
  const { data } = await apiClient.get<ApiResponse<BenchmarkQuestion[]>>('/api/benchmark/questions')
  return Array.isArray(data.data) ? data.data : []
}

export async function createBenchmarkQuestion(payload: {
  question: string
  subject: string
  expectedAnswer: string
  difficulty: BenchmarkDifficulty
}): Promise<BenchmarkQuestion> {
  const { data } = await apiClient.post<ApiResponse<BenchmarkQuestion>>(
    '/api/benchmark/questions',
    payload
  )
  if (!data.data) throw new Error(data.message || 'Create failed')
  return data.data
}

export async function deleteBenchmarkQuestion(id: string): Promise<void> {
  await apiClient.delete(`/api/benchmark/questions/${id}`)
}

export async function runBenchmarkQuestion(id: string): Promise<BenchmarkRunResult> {
  const { data } = await apiClient.post<ApiResponse<BenchmarkRunResult>>(
    `/api/benchmark/run/${id}`
  )
  if (!data.data) throw new Error(data.message || 'Run failed')
  return data.data
}

export async function getBenchmarkSummary(): Promise<BenchmarkSummary> {
  const { data } = await apiClient.get<ApiResponse<BenchmarkSummary>>('/api/benchmark/summary')
  if (!data.data) {
    return {
      totalRuns: 0,
      averageScore: 0,
      averageAnswerCorrectness: 0,
      averageFaithfulness: 0,
      averageRelevance: 0,
      averageCompleteness: 0,
    }
  }
  return data.data
}
