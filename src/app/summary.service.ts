import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, takeWhile, catchError, of } from 'rxjs';
import { environment } from '../environments/environment';

export interface JobResponse {
  jobId: number;
  status: string;
  message: string;
  checkStatusUrl: string;
}

export interface JobStatus {
  jobId: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  progressPercent?: number;
  statusDetail?: string;
  miniSummary?: string;
  completedAt?: string;
  processingTimeMs?: number;
  error?: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SummaryService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // 1. Subir audio (responde inmediatamente)
  uploadAudio(formData: FormData): Observable<JobResponse> {
    return this.http.post<JobResponse>(`${this.apiUrl}/v1/jobs/upload`, formData);
  }

  // 2. Consultar estado una vez
  getJobStatus(jobId: number): Observable<JobStatus> {
    return this.http.get<JobStatus>(`${this.apiUrl}/v1/jobs/${jobId}/status`);
  }

  // 3. POLLING automático cada 5 segundos
  pollJobStatus(jobId: number): Observable<JobStatus> {
    return interval(5000).pipe( // Cada 5 segundos
      switchMap(() => this.getJobStatus(jobId)),
      takeWhile(status => status.status === 'QUEUED' || status.status === 'PROCESSING', true),
      catchError(error => {
        console.error('Error en polling:', error);
        return of({ jobId, status: 'ERROR', error: 'Error de conexión', createdAt: new Date().toISOString() } as JobStatus);
      })
    );
  }
}
