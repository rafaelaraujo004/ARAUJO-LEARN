'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, BookOpen, CheckCheck, Info, ShieldCheck } from 'lucide-react';
import { cn, formatRelative } from '@/lib/utils';
import {
  getNotificationsAction,
  getUnreadCountAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationItem,
} from '@/server/actions/notifications';

const TYPE_ICON: Record<string, React.ElementType> = {
  request: BookOpen,
  access: ShieldCheck,
  info: Info,
};

export function NotificationBell({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unread, setUnread] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    getUnreadCountAction().then(setUnread);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    getNotificationsAction().then(setItems);
  }, [open]);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  async function handleMarkAllRead() {
    await markAllNotificationsReadAction();
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
  }

  async function handleClick(item: NotificationItem) {
    if (!item.readAt) {
      await markNotificationReadAction(item.id);
      setUnread((c) => Math.max(0, c - 1));
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date() } : n)));
    }
    setOpen(false);
  }

  const isDark = variant === 'dark';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={unread ? `${unread} notificações não lidas` : 'Notificações'}
        className={cn(
          'relative rounded-lg p-2 transition-colors',
          isDark
            ? 'text-brand-200 hover:bg-white/10 hover:text-white'
            : 'text-ink-500 hover:bg-ink-100 hover:text-ink-800',
        )}
      >
        <Bell aria-hidden className="size-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-accent-500 text-[0.625rem] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-white shadow-lg sm:w-96',
            'animate-fade',
          )}
        >
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-ink-900">Notificações</h3>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
              >
                <CheckCheck aria-hidden className="size-3.5" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-500">
              Nenhuma notificação por enquanto.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-ink-100 overflow-y-auto">
              {items.map((item) => {
                const Icon = TYPE_ICON[item.type] ?? Info;
                const content = (
                  <div
                    className={cn(
                      'flex gap-3 px-4 py-3 transition-colors hover:bg-ink-50',
                      !item.readAt && 'bg-brand-50/50',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                        !item.readAt ? 'bg-brand-100 text-brand-600' : 'bg-ink-100 text-ink-400',
                      )}
                    >
                      <Icon aria-hidden className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-sm',
                          !item.readAt ? 'font-semibold text-ink-900' : 'text-ink-700',
                        )}
                      >
                        {item.title}
                      </p>
                      {item.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{item.body}</p>
                      )}
                      <p className="mt-1 text-[0.6875rem] text-ink-400">
                        {formatRelative(item.createdAt)}
                      </p>
                    </div>
                    {!item.readAt && (
                      <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-500" />
                    )}
                  </div>
                );

                return (
                  <li key={item.id}>
                    {item.link ? (
                      <Link href={item.link} onClick={() => handleClick(item)}>
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => handleClick(item)}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
