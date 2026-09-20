'use client';

import * as React from 'react';
import { CheckCircle2, CloudUpload, FileVideo, Loader2, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, Progress } from '@/components/ui/primitives';
import { uploadFile, type UploadedMedia, type UploadKind } from '@/lib/uploader';
import {
  ACCEPTED_DOCUMENT_TYPES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from '@/lib/constants';
import { cn, formatBytes, formatDuration } from '@/lib/utils';

/**
 * Área de envio de arquivos do painel.
 * Mostra o que está acontecendo o tempo todo: progresso real, possibilidade de
 * cancelar e mensagem de erro específica — nunca um spinner mudo.
 */

const RULES: Record<UploadKind, { accept: string[]; max: number; label: string }> = {
  VIDEO: { accept: ACCEPTED_VIDEO_TYPES, max: MAX_VIDEO_BYTES, label: 'vídeo' },
  DOCUMENT: { accept: ACCEPTED_DOCUMENT_TYPES, max: MAX_DOCUMENT_BYTES, label: 'arquivo' },
  IMAGE: { accept: ACCEPTED_IMAGE_TYPES, max: MAX_IMAGE_BYTES, label: 'imagem' },
};

export function FileUpload({
  kind,
  onUploaded,
  current,
  onRemove,
  hint,
}: {
  kind: UploadKind;
  onUploaded: (media: UploadedMedia) => void;
  current?: { name: string; sizeBytes?: number; durationSeconds?: number | null } | null;
  onRemove?: () => void;
  hint?: string;
}) {
  const rules = RULES[kind];
  const inputRef = React.useRef<HTMLInputElement>(null);
  const controllerRef = React.useRef<AbortController | null>(null);

  const [dragging, setDragging] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);

  async function start(file: File) {
    setError(null);

    if (file.size > rules.max) {
      setError(
        `Este ${rules.label} tem ${formatBytes(file.size)}. O limite é ${formatBytes(rules.max)}.`,
      );
      return;
    }
    if (file.type && !rules.accept.includes(file.type)) {
      setError(`Formato não aceito: ${file.type || 'desconhecido'}.`);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setFileName(file.name);
    setProgress(0);

    try {
      const media = await uploadFile(file, kind, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      onUploaded(media);
      setProgress(null);
      setFileName(null);
    } catch (uploadError) {
      if (uploadError instanceof DOMException && uploadError.name === 'AbortError') {
        setError('Envio cancelado.');
      } else {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : 'Não foi possível enviar o arquivo.',
        );
      }
      setProgress(null);
    } finally {
      controllerRef.current = null;
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const uploading = progress !== null;

  if (current && !uploading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-progress-100 text-progress-700">
          {kind === 'VIDEO' ? (
            <FileVideo aria-hidden className="size-5" />
          ) : (
            <CheckCircle2 aria-hidden className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-900">{current.name}</p>
          <p className="text-xs text-ink-500">
            {current.sizeBytes ? formatBytes(current.sizeBytes) : 'Arquivo enviado'}
            {current.durationSeconds
              ? ` · ${formatDuration(current.durationSeconds)}`
              : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            Substituir
          </Button>
          {onRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove}>
              Remover
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={rules.accept.join(',')}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void start(file);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file && !uploading) void start(file);
        }}
        className={cn(
          'rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors',
          dragging ? 'border-brand-400 bg-brand-50' : 'border-ink-300 bg-white',
          uploading && 'border-brand-300 bg-brand-50/50',
        )}
      >
        {uploading ? (
          <div className="mx-auto max-w-sm">
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-ink-800">
              <Loader2 aria-hidden className="size-4 animate-spin text-brand-500" />
              Enviando {fileName}
            </p>
            <Progress value={progress ?? 0} showValue className="mt-4" label="Progresso do envio" />
            <p className="mt-2 text-xs text-ink-500">
              O arquivo vai direto para o armazenamento. Você pode continuar editando em outra aba.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => controllerRef.current?.abort()}
            >
              <X aria-hidden className="size-4" />
              Cancelar envio
            </Button>
          </div>
        ) : (
          <>
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-500">
              {kind === 'VIDEO' ? (
                <FileVideo aria-hidden className="size-6" />
              ) : (
                <CloudUpload aria-hidden className="size-6" />
              )}
            </span>
            <p className="mt-3 text-sm font-medium text-ink-800">
              Arraste o {rules.label} aqui ou
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => inputRef.current?.click()}
            >
              <Paperclip aria-hidden className="size-4" />
              Escolher arquivo
            </Button>
            <p className="mt-3 text-xs text-ink-500">
              {hint ?? `Até ${formatBytes(rules.max)}.`}
            </p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={rules.accept.join(',')}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void start(file);
          }}
        />
      </div>

      {error && (
        <Alert tone="danger" className="mt-3">
          {error}
        </Alert>
      )}
    </div>
  );
}
