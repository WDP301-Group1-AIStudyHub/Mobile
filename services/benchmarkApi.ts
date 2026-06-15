import type { ApiResponse } from '../types/auth'
import apiClient from './apiClient'

export type BenchmarkDifficulty = 'Easy' | 'Medium' | 'Hard'

export interface BenchmarkQuestion {
  id: string
  question: string
  subject: string
  difficulty: BenchmarkDifficulty
  expectedAnswer?: string
  hasResult: boolean
  winner: 'basic' | 'corrective' | 'tie' | null
  basicScore: number | null
  correctiveScore: number | null
  createdAt: string
  updatedAt?: string
}

export interface BenchmarkSummary {
  totalRuns: number
  basicAvg: number
  correctiveAvg: number
  correctiveWinRate: number
  basicWinRate: number
  tieRate: number
  faithfulnessImprovement: string
  correctnessImprovement: string
}

export async function listBenchmarkQuestions(): Promise<BenchmarkQuestion[]> {
  const { data } = await apiClient.get<ApiResponse<BenchmarkQuestion[]>>('/api/benchmarks/questions')
  return Array.isArray(data.data) ? data.data : []
}

export async function createBenchmarkQuestion(payload: {
  question: string
  subject: string
  expectedAnswer?: string
  difficulty: BenchmarkDifficulty
}): Promise<BenchmarkQuestion> {
  const { data } = await apiClient.post<ApiResponse<BenchmarkQuestion>>(
    '/api/benchmarks/questions',
    payload
  )
  if (!data.data) throw new Error(data.message || 'Create failed')
  return data.data
}

export async function deleteBenchmarkQuestion(id: string): Promise<void> {
  await apiClient.delete(`/api/benchmarks/questions/${id}`)
}

export async function runBenchmarkQuestion(id: string): Promise<BenchmarkQuestion> {
  const { data } = await apiClient.post<ApiResponse<BenchmarkQuestion>>(
    `/api/benchmarks/run/${id}`
  )
  if (!data.data) throw new Error(data.message || 'Run failed')
  return data.data
}

export async function getBenchmarkSummary(): Promise<BenchmarkSummary> {
  const { data } = await apiClient.get<ApiResponse<BenchmarkSummary>>('/api/benchmarks/summary')
  if (!data.data) {
    return {
      totalRuns: 0,
      basicAvg: 0,
      correctiveAvg: 0,
      correctiveWinRate: 0,
      basicWinRate: 0,
      tieRate: 0,
      faithfulnessImprovement: '0%',
      correctnessImprovement: '0%',
    }
  }
  return data.data
}
