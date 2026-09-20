import Link from 'next/link';
import { CreditCard, Inbox, MessageCircle, QrCode } from 'lucide-react';
import { Badge, Card, EmptyState } from '@/components/ui/primitives';
import { RequestActions } from '@/components/admin/request-actions';
import { PageHeader } from '@/components/admin/shell';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';
import { formatPrice, formatRelative, pixPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Solicitações' };

const PAYMENT_LABEL: Record<string, { label: string; icon: React.ElementType }> = {
  pix: { label: 'PIX', icon: QrCode },
  cartao: { label: 'Cartão', icon: CreditCard },
  'a-combinar': { label: 'A combinar', icon: MessageCircle },
};

export default async function RequestsPage() {
  await requireStaff();

  const [pending, handled] = await Promise.all([
    db.enrollmentRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        message: true,
        payment: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        course: {
          select: { title: true, priceCents: true, pixDiscountPercent: true, maxInstallments: true },
        },
      },
    }),
    db.enrollmentRequest.findMany({
      where: { status: { not: 'PENDING' } },
      orderBy: { handledAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        handledAt: true,
        user: { select: { id: true, name: true } },
        course: { select: { title: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Solicitações de matrícula"
        description="Confirme o pagamento e libere o acesso. O aluno é avisado automaticamente."
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        {pending.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title="Nenhum pedido aguardando"
            description="Quando um aluno pedir matrícula em um curso, ele aparece aqui para você liberar."
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {pending.map((request) => {
              const payment = PAYMENT_LABEL[request.payment ?? 'a-combinar'] ?? PAYMENT_LABEL['a-combinar']!;
              const price = request.course.priceCents;
              const wa = `https://wa.me/?text=${encodeURIComponent(
                `Olá, ${request.user.name.split(' ')[0]}! Recebi seu pedido para o curso "${request.course.title}".`,
              )}`;

              return (
                <li key={request.id}>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="accent" icon={<payment.icon className="size-3" />}>
                            {payment.label}
                          </Badge>
                          <span className="text-xs text-ink-500">
                            {formatRelative(request.createdAt)}
                          </span>
                        </div>

                        <p className="mt-2.5 font-sans text-base font-semibold text-ink-900">
                          <Link
                            href={`/admin/alunos/${request.user.id}`}
                            className="hover:text-brand-600 hover:underline"
                          >
                            {request.user.name}
                          </Link>
                        </p>
                        <p className="text-sm text-ink-500">{request.user.email}</p>

                        <p className="mt-2 text-sm text-ink-700">
                          Quer acesso a <strong>{request.course.title}</strong>
                          {price ? (
                            <>
                              {' '}
                              ·{' '}
                              {request.payment === 'pix'
                                ? `${formatPrice(pixPrice(price, request.course.pixDiscountPercent))} no PIX`
                                : request.payment === 'cartao'
                                  ? `${formatPrice(price)} em até ${request.course.maxInstallments}x`
                                  : formatPrice(price)}
                            </>
                          ) : null}
                        </p>

                        {request.message && (
                          <blockquote className="mt-3 border-l-2 border-ink-200 pl-3 text-sm text-ink-600 italic">
                            {request.message}
                          </blockquote>
                        )}

                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
                        >
                          <MessageCircle aria-hidden className="size-4" />
                          Responder por WhatsApp
                        </a>
                      </div>

                      <RequestActions requestId={request.id} />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {handled.length > 0 && (
          <section className="mt-10">
            <h2 className="font-sans text-sm font-semibold text-ink-700">Pedidos já tratados</h2>
            <Card className="mt-3">
              <ul className="divide-y divide-ink-100">
                {handled.map((request) => (
                  <li key={request.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink-800">
                        {request.user.name} · {request.course.title}
                      </p>
                      <p className="text-xs text-ink-500">{formatRelative(request.handledAt)}</p>
                    </div>
                    <Badge tone={request.status === 'APPROVED' ? 'progress' : 'neutral'}>
                      {request.status === 'APPROVED' ? 'Liberado' : 'Recusado'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}
      </div>
    </>
  );
}
