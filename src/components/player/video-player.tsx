'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Check,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn, formatTimecode } from '@/lib/utils';
import { PROGRESS_SAVE_INTERVAL_MS } from '@/lib/constants';

/**
 * Player da aula.
 *
 * Construído sobre o <video> nativo em vez de uma biblioteca pronta por dois
 * motivos: controle total da telemetria de progresso (que é o coração do
 * produto) e nenhum quilo de JavaScript que o aluno no celular teria de baixar
 * antes de ver a primeira imagem.
 *
 * Responsabilidades:
 *  - buscar a URL assinada (o bucket é privado, o link expira);
 *  - retomar exatamente de onde o aluno parou;
 *  - registrar posição e percentual assistido, inclusive ao fechar a aba;
 *  - avisar quando a aula termina e oferecer a próxima.
 */

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

interface VideoResponse {
  url: string;
  mimeType: string;
  durationSeconds: number | null;
}

export function VideoPlayer({
  lessonId,
  title,
  resumeAt,
  initialCompleted,
  nextLessonHref,
  onProgress,
}: {
  lessonId: string;
  title: string;
  resumeAt: number;
  initialCompleted: boolean;
  nextLessonHref: string | null;
  onProgress?: (result: { lessonCompleted: boolean; coursePercent: number }) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const shellRef = React.useRef<HTMLDivElement>(null);

  const [source, setSource] = React.useState<VideoResponse | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [buffering, setBuffering] = React.useState(true);
  const [playing, setPlaying] = React.useState(false);
  const [current, setCurrent] = React.useState(resumeAt);
  const [duration, setDuration] = React.useState(0);
  const [buffered, setBuffered] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [muted, setMuted] = React.useState(false);
  const [rate, setRate] = React.useState(1);
  const [rateOpen, setRateOpen] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [controlsVisible, setControlsVisible] = React.useState(true);
  const [ended, setEnded] = React.useState(false);
  const [completed, setCompleted] = React.useState(initialCompleted);
  const [resumed, setResumed] = React.useState(resumeAt < 5);

  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = React.useRef(0);

  // ---------------------------------------------------------- URL assinada
  React.useEffect(() => {
    let active = true;

    fetch(`/api/lessons/${lessonId}/video`)
      .then(async (response) => {
        const data = (await response.json()) as VideoResponse & { error?: string };
        if (!response.ok) throw new Error(data.error ?? 'Não foi possível carregar o vídeo.');
        if (active) setSource(data);
      })
      .catch((error: Error) => {
        if (active) {
          setLoadError(error.message);
          setBuffering(false);
        }
      });

    return () => {
      active = false;
    };
  }, [lessonId]);

  // ------------------------------------------------------------- Progresso
  const save = React.useCallback(
    (position: number, options: { completed?: boolean; beacon?: boolean } = {}) => {
      const video = videoRef.current;
      const total = video?.duration;
      const payload = JSON.stringify({
        lessonId,
        positionSeconds: Math.max(0, Math.floor(position)),
        durationSeconds: Number.isFinite(total) ? Math.floor(total ?? 0) : undefined,
        completed: options.completed,
      });

      // Ao fechar a aba, `fetch` normal é cancelado; o beacon sobrevive.
      if (options.beacon && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon('/api/progress', new Blob([payload], { type: 'text/plain' }));
        return;
      }

      void fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((result: { lessonCompleted: boolean; coursePercent: number } | null) => {
          if (!result) return;
          if (result.lessonCompleted) setCompleted(true);
          onProgress?.(result);
        })
        .catch(() => {
          // Falha de rede aqui não pode atrapalhar a aula: o próximo salvamento
          // (ou o beacon de saída) reenvia a posição.
        });
    },
    [lessonId, onProgress],
  );

  // Salva ao sair da página e ao trocar de aba.
  React.useEffect(() => {
    const flush = () => {
      const video = videoRef.current;
      if (video && video.currentTime > 0) save(video.currentTime, { beacon: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, [save]);

  // --------------------------------------------------------------- Ações
  const togglePlay = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setLoadError('O navegador bloqueou a reprodução. Toque no vídeo para iniciar.'));
    else video.pause();
  }, []);

  const seekBy = React.useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(
      Math.max(0, video.currentTime + seconds),
      video.duration || Number.MAX_SAFE_INTEGER,
    );
  }, []);

  const toggleFullscreen = React.useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shell.requestFullscreen().catch(() => {});
  }, []);

  React.useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ------------------------------------------------------------- Teclado
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Não sequestra o teclado enquanto o aluno digita em um campo.
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (!shellRef.current?.contains(document.activeElement) && document.activeElement !== document.body) {
        return;
      }

      switch (event.key) {
        case ' ':
        case 'k':
          event.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          event.preventDefault();
          seekBy(10);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          seekBy(-10);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setVolume((value) => Math.min(1, value + 0.1));
          break;
        case 'ArrowDown':
          event.preventDefault();
          setVolume((value) => Math.max(0, value - 0.1));
          break;
        case 'm':
          setMuted((value) => !value);
          break;
        case 'f':
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seekBy, toggleFullscreen, togglePlay]);

  // Aplica volume, mudo e velocidade ao elemento.
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
    video.playbackRate = rate;
  }, [volume, muted, rate]);

  function showControls() {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 2800);
  }

  const percent = duration > 0 ? (current / duration) * 100 : 0;

  // ------------------------------------------------------------- Render
  if (loadError) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-brand-950 px-6 text-center">
        <AlertTriangle aria-hidden className="size-8 text-accent-300" />
        <p className="text-sm font-medium text-white">{loadError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-white/25 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      className={cn(
        'group relative aspect-video w-full overflow-hidden rounded-xl bg-black select-none',
        !controlsVisible && playing && 'cursor-none',
      )}
      onMouseMove={showControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
    >
      {source ? (
        <video
          ref={videoRef}
          src={source.url}
          className="size-full"
          playsInline
          preload="metadata"
          // A aula abre rápido mesmo com vídeo grande: só os metadados são
          // baixados até o aluno apertar play.
          onClick={togglePlay}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            setDuration(video.duration || source.durationSeconds || 0);
            if (!resumed && resumeAt > 0 && resumeAt < video.duration - 2) {
              video.currentTime = resumeAt;
            }
            setResumed(true);
            setBuffering(false);
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            setCurrent(video.currentTime);
            if (video.buffered.length > 0) {
              setBuffered(video.buffered.end(video.buffered.length - 1));
            }
            // Salva a cada intervalo, sem inundar o servidor.
            if (Date.now() - lastSaved.current > PROGRESS_SAVE_INTERVAL_MS) {
              lastSaved.current = Date.now();
              save(video.currentTime);
            }
          }}
          onPlay={() => {
            setPlaying(true);
            setEnded(false);
            showControls();
          }}
          onPause={(event) => {
            setPlaying(false);
            setControlsVisible(true);
            save(event.currentTarget.currentTime);
          }}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onEnded={(event) => {
            setPlaying(false);
            setEnded(true);
            setControlsVisible(true);
            save(event.currentTarget.duration, { completed: true });
          }}
          onError={() =>
            setLoadError('O vídeo não pôde ser carregado. Verifique sua conexão e tente de novo.')
          }
        >
          <track kind="captions" />
        </video>
      ) : (
        <div className="grid size-full place-items-center">
          <Loader2 aria-hidden className="size-8 animate-spin text-white/60" />
        </div>
      )}

      {/* Carregando */}
      {buffering && source && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 aria-hidden className="size-10 animate-spin text-white/80" />
        </div>
      )}

      {/* Botão central de play */}
      {!playing && !ended && source && !buffering && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={`Reproduzir: ${title}`}
          className="absolute inset-0 grid place-items-center bg-black/25 transition-colors hover:bg-black/35"
        >
          <span className="grid size-20 place-items-center rounded-full bg-white/95 text-brand-900 shadow-lift transition-transform hover:scale-105">
            <Play aria-hidden className="size-9 translate-x-0.5" fill="currentColor" />
          </span>
        </button>
      )}

      {/* Fim da aula */}
      {ended && (
        <div className="absolute inset-0 grid place-items-center bg-brand-950/90 px-6 text-center backdrop-blur-sm">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-progress-500 text-white">
              <Check aria-hidden className="size-7" />
            </span>
            <p className="mt-4 font-display text-xl font-semibold text-white">Aula concluída</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const video = videoRef.current;
                  if (!video) return;
                  video.currentTime = 0;
                  void video.play();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                <RotateCcw aria-hidden className="size-4" />
                Assistir de novo
              </button>
              {nextLessonHref && (
                <a
                  href={nextLessonHref}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-400 px-4 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-accent-300"
                >
                  Próxima aula
                  <SkipForward aria-hidden className="size-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Controles */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pt-10 pb-2.5 transition-opacity duration-200 sm:px-4',
          controlsVisible || !playing ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        {/* Barra de progresso */}
        <div className="relative flex items-center">
          <div className="absolute inset-x-0 h-1.5 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full bg-white/35"
              style={{ width: `${duration > 0 ? (buffered / duration) * 100 : 0}%` }}
            />
          </div>
          <div
            className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-accent-400"
            style={{ width: `${percent}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            aria-label="Posição do vídeo"
            onChange={(event) => {
              const value = Number(event.target.value);
              setCurrent(value);
              if (videoRef.current) videoRef.current.currentTime = value;
            }}
            className="relative z-10 h-1.5 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
          />
        </div>

        <div className="mt-2 flex items-center gap-1 text-white">
          <ControlButton label={playing ? 'Pausar' : 'Reproduzir'} onClick={togglePlay}>
            {playing ? (
              <Pause aria-hidden className="size-5" fill="currentColor" />
            ) : (
              <Play aria-hidden className="size-5" fill="currentColor" />
            )}
          </ControlButton>

          <ControlButton label="Voltar 10 segundos" onClick={() => seekBy(-10)}>
            <RotateCcw aria-hidden className="size-4.5" />
          </ControlButton>
          <ControlButton label="Avançar 10 segundos" onClick={() => seekBy(10)}>
            <RotateCw aria-hidden className="size-4.5" />
          </ControlButton>

          {/* Volume */}
          <div className="group/volume flex items-center">
            <ControlButton
              label={muted || volume === 0 ? 'Ativar som' : 'Silenciar'}
              onClick={() => setMuted((value) => !value)}
            >
              {muted || volume === 0 ? (
                <VolumeX aria-hidden className="size-5" />
              ) : (
                <Volume2 aria-hidden className="size-5" />
              )}
            </ControlButton>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              aria-label="Volume"
              onChange={(event) => {
                setVolume(Number(event.target.value));
                setMuted(Number(event.target.value) === 0);
              }}
              className="ml-1 hidden h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/35 transition-[width] duration-200 group-hover/volume:w-20 focus:w-20 sm:block [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </div>

          <span className="ml-1.5 text-xs font-medium tabular-nums text-white/90">
            {formatTimecode(current)} <span className="text-white/50">/ {formatTimecode(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1">
            {completed && (
              <span className="mr-1 hidden items-center gap-1 rounded-pill bg-progress-500/90 px-2.5 py-1 text-xs font-medium text-white sm:inline-flex">
                <Check aria-hidden className="size-3" />
                Concluída
              </span>
            )}

            {/* Velocidade */}
            <div className="relative">
              <ControlButton
                label={`Velocidade de reprodução: ${rate}x`}
                onClick={() => setRateOpen((value) => !value)}
                active={rateOpen}
              >
                <span className="flex items-center gap-1 text-xs font-semibold">
                  <Settings aria-hidden className="size-4" />
                  {rate}x
                </span>
              </ControlButton>
              {rateOpen && (
                <ul
                  className="absolute right-0 bottom-full mb-2 w-28 overflow-hidden rounded-xl border border-white/15 bg-brand-950/95 py-1 shadow-lift backdrop-blur"
                  role="listbox"
                  aria-label="Velocidade de reprodução"
                >
                  {RATES.map((value) => (
                    <li key={value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={value === rate}
                        onClick={() => {
                          setRate(value);
                          setRateOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between px-3 py-1.5 text-sm transition-colors hover:bg-white/10',
                          value === rate ? 'text-accent-300' : 'text-white/80',
                        )}
                      >
                        {value}x
                        {value === rate && <Check aria-hidden className="size-3.5" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <ControlButton
              label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
              onClick={toggleFullscreen}
            >
              {fullscreen ? (
                <Minimize aria-hidden className="size-5" />
              ) : (
                <Maximize aria-hidden className="size-5" />
              )}
            </ControlButton>
          </div>
        </div>
      </div>

      {/* Aviso de retomada */}
      {resumeAt > 5 && !playing && !ended && current <= resumeAt + 1 && (
        <div className="absolute top-3 left-3 rounded-lg bg-brand-950/85 px-3 py-2 text-xs font-medium text-white backdrop-blur">
          Retomando de {formatTimecode(resumeAt)}
        </div>
      )}
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'grid min-h-9 min-w-9 place-items-center rounded-lg px-2 transition-colors hover:bg-white/15',
        active && 'bg-white/15',
      )}
    >
      {children}
    </button>
  );
}
