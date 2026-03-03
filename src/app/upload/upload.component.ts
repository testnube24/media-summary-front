import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SummaryService, JobStatus } from '../summary.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnDestroy {
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  isLoading = false;
  isDragOver = false;

  // Polling state
  currentJob: JobStatus | null = null;
  pollingSubscription: Subscription | null = null;

  // UI state
  showProgress = false;
  progressMessage = '';

  // Final state
  completedJob: JobStatus | null = null;
  errorMessage = '';

  readonly allowedExtensions = [
    '.3ga', '.8svx', '.aac', '.ac3', '.aif', '.aiff', '.alac', '.amr', '.ape', '.au',
    '.dss', '.flac', '.m4a', '.m4b', '.m4p', '.m4r', '.mp3', '.mpga', '.oga', '.ogg',
    '.mogg', '.opus', '.qcp', '.tta', '.voc', '.wav', '.wma', '.wv'
  ];

  constructor(
    private fb: FormBuilder,
    private summaryService: SummaryService
  ) {
    this.uploadForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.setSelectedFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.setSelectedFile(file);
  }

  onSubmit() {
    if (this.uploadForm.invalid || !this.selectedFile) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.completedJob = null;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('email', this.uploadForm.get('email')?.value);

    this.summaryService.uploadAudio(formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.showProgress = true;
        this.startPolling(response.jobId);
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Error al subir archivo. Intenta nuevamente.';
      }
    });
  }

  startPolling(jobId: number) {
    this.progressMessage = 'En cola...';

    this.pollingSubscription = this.summaryService.pollJobStatus(jobId).subscribe({
      next: (status) => {
        this.currentJob = status;
        this.updateProgressMessage(status.status);

        if (status.status === 'COMPLETED') {
          this.completedJob = status;
          this.showProgress = false;
          this.stopPolling();
        } else if (status.status === 'ERROR') {
          this.errorMessage = status.error || 'Error en procesamiento';
          this.showProgress = false;
          this.stopPolling();
        }
      },
      error: () => {
        this.errorMessage = 'Error de conexion';
        this.showProgress = false;
        this.stopPolling();
      }
    });
  }

  stopPolling() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  private updateProgressMessage(status: string) {
    switch (status) {
      case 'QUEUED':
        this.progressMessage = 'En cola de procesamiento...';
        break;
      case 'PROCESSING':
        this.progressMessage = 'Transcribiendo y generando resumen...';
        break;
      default:
        this.progressMessage = 'Procesando...';
    }
  }

  resetForm() {
    this.uploadForm.reset();
    this.selectedFile = null;
    this.currentJob = null;
    this.completedJob = null;
    this.showProgress = false;
    this.errorMessage = '';
    this.isDragOver = false;
    this.stopPolling();
  }

  private setSelectedFile(file: File | null) {
    if (!file) {
      this.selectedFile = null;
      return;
    }

    const fileName = file.name.toLowerCase();
    const isAllowed = this.allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!isAllowed) {
      this.selectedFile = null;
      this.errorMessage = 'Formato no soportado. Usa un formato compatible con AssemblyAI.';
      return;
    }

    this.errorMessage = '';
    this.selectedFile = file;
  }
}
