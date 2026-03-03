import type { ReportData } from '../types/report'
import type { AdviceResponse } from '../types/advice'
import type { CsvAdviceResponse } from '../types/csvAdvice'
import type { CsvReportData } from '../types/csvReport'

export async function uploadReport(file: File): Promise<ReportData> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || `Upload failed (${res.status})`);
  }

  return res.json();
}

export async function fetchAdvice(
  report: ReportData,
  tone: 'helpful' | 'roast' = 'helpful',
): Promise<AdviceResponse> {
  const res = await fetch('/api/advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report, tone }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Advice generation failed' }));
    throw new Error(err.error || `Failed (${res.status})`);
  }

  return res.json();
}

export async function fetchCsvAdvice(
  report: CsvReportData,
  tone: 'helpful' | 'roast' = 'helpful',
): Promise<CsvAdviceResponse> {
  const res = await fetch('/api/csv-advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report, tone }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'CSV advice generation failed' }));
    throw new Error(err.error || `Failed (${res.status})`);
  }

  return res.json();
}

export async function analyzeTradebook(file: File): Promise<CsvReportData> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/analyze', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Analysis failed' }));
    throw new Error(err.error || `Analysis failed (${res.status})`);
  }

  return res.json();
}
