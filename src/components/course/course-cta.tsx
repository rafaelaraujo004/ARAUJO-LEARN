'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { CheckCircle2, Clock3, CreditCard, Lock, MessageCircle, QrCode, Sparkles } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { Alert, Badge } from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { requestEnrollmentAction } from '@/server/actions/requests';
import { emptyFormState } from '@/lib/form-state';
import { formatPrice, installmentPrice, pixPrice, whatsappDigits } from '@/lib/utils';

/**
 * Bloco de preço e matrícula.
 *
 * O pagamento acontece fora da plataforma (PIX ou cartão, direto com o tutor).
 * Aqui o aluno vê o valor, as condições e registra o pedido — o tutor libera o
 * acesso no painel assim que confirmar o pagamento.
 */
export function CourseCta({
  slug,
  title,
  priceCents,
  pixDiscountPercent,
  maxInstallments,
  includes,
  isBonus,
  bonusUnlocked = true,
  bonusMissing = [],
  whatsapp,
  requestStatus,
}: {
  slug: string;
  title: string;
  priceCents: number | null;
  pixDiscountPercent: number;
  maxInstallments: number;
  includes: string[];
  isBonus: boolean;
  bonusUnlocked?: boolean;
  bonusMissing?: string[];
  whatsapp: string | null;
  requestStatus: 'NONE' | 'PENDING' | 'DECLINED';
}) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState(requestEnrollmentAction, emptyFormState);

  const waLink = whatsapp
    ? `https://wa.me/${whatsappDigits(whatsapp)}?text=${encodeURIComponent(
        `Olá! Tenho interesse no curso "${title}" da ARAÚJO LEARN.`,
      )}`
    : null;

  const sent = state.ok || requestStatus === 'PENDING';

  return (
    <div>
      {isBonus ? (
        <div className={`rounded-xl border px-4 py-3 ${bonusUnlocked ? 'border-accent-200 bg-accent-50' : 'border-ink-200 bg-ink-50'}`}>
          <p className={`flex items-center gap-2 text-sm font-semibold ${bonusUnlocked ? 'text-accent-700' : 'text-ink-600'}`}>
            {bonusUnlocked ? (
              <Sparkles aria-hidden className="size-4" />
            ) : (
              <Lock aria-hidden className="size-4" />
            )}
            Curso bônus
          </p>
          {bonusUnlocked ? (
            <p className="mt-1 text-sm text-accent-700/90">
              Você cumpriu os pré-requisitos. Solicite o acesso ao bônus.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-600">
                Adquira os dois cursos da formação para liberar este bônus.
              </p>
              {bonusMissing.length > 0 && (
                <p className="mt-1.5 text-xs text-ink-500">
                  Faltam: {bonusMissing.join(', ')}
                </p>
              )}
            </>
          )}
        </div>
      ) : priceCents ? (
        <div>
          <p className="text-xs font-medium tracking-wide text-ink-500 uppercase">Investimento</p>
          <p className="mt-1 font-display text-3xl font-semibold text-brand-900">
            {formatPrice(priceCents)}
          </p>

          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li className="flex items-start gap-2 text-ink-700">
              <QrCode aria-hidden className="mt-0.5 size-4 shrink-0 text-progress-500" />
              <span>
                <strong>{formatPrice(pixPrice(priceCents, pixDiscountPercent))}</strong> no PIX
                <span className="text-ink-500"> ({pixDiscountPercent}% de desconto)</span>
              </span>
            </li>
            <li className="flex items-start gap-2 text-ink-700">
              <CreditCard aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-500" />
              <span>
                até <strong>{maxInstallments}x</strong> de{' '}
                {formatPrice(installmentPrice(priceCents, maxInstallments))} no cartão
              </span>
            </li>
          </ul>
        </div>
      ) : null}

      {includes.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 border-t border-ink-200 pt-4 text-sm text-ink-600">
          {includes.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <CheckCircle2 aria-hidden className="size-4 shrink-0 text-progress-500" />
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5">
        {isBonus && !bonusUnlocked ? (
          <ButtonLink href="/cursos" variant="secondary" size="lg" block>
            Ver cursos da formação
          </ButtonLink>
        ) : sent ? (
          <div className="flex flex-col gap-3">
            <Alert tone="success" title="Pedido registrado" icon={<Clock3 className="size-4" />}>
              {state.message ??
                'Seu pedido está com o tutor. Combine o pagamento pelo WhatsApp, o acesso é liberado logo após a confirmação.'}
            </Alert>
            {waLink && (
              <ButtonLink href={waLink} variant="accent" size="lg" target="_blank" block>
                <MessageCircle aria-hidden className="size-4.5" />
                Falar com o tutor
              </ButtonLink>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button variant="accent" size="lg" block onClick={() => setOpen(true)}>
              {isBonus ? 'Quero este bônus' : 'Quero me matricular'}
            </Button>
            {waLink && (
              <ButtonLink href={waLink} variant="secondary" target="_blank" block>
                <MessageCircle aria-hidden className="size-4" />
                Tirar dúvida no WhatsApp
              </ButtonLink>
            )}
          </div>
        )}
      </div>

      {requestStatus === 'DECLINED' && !state.ok && (
        <Alert tone="warning" className="mt-3">
          Seu pedido anterior não foi concluído. Você pode enviar outro ou falar direto com o tutor.
        </Alert>
      )}

      <Modal
        // Fecha sozinho quando o pedido é registrado.
        open={open && !sent}
        onClose={() => setOpen(false)}
        title="Pedido de matrícula"
        description={title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" form="request-form" loading={pending} variant="accent">
              Enviar pedido
            </Button>
          </>
        }
      >
        <form id="request-form" action={action} className="flex flex-col gap-4">
          <input type="hidden" name="slug" value={slug} />

          {priceCents ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink-700">
                Como você pretende pagar?
              </legend>
              <div className="flex flex-col gap-2">
                {[
                  {
                    value: 'pix',
                    label: `PIX: ${formatPrice(pixPrice(priceCents, pixDiscountPercent))}`,
                    hint: `${pixDiscountPercent}% de desconto`,
                  },
                  {
                    value: 'cartao',
                    label: `Cartão: até ${maxInstallments}x de ${formatPrice(
                      installmentPrice(priceCents, maxInstallments),
                    )}`,
                    hint: 'parcelado no crédito',
                  },
                  { value: 'a-combinar', label: 'Prefiro combinar com o tutor', hint: '' },
                ].map((option, index) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 px-4 py-3 transition-colors hover:border-brand-300 has-checked:border-brand-500 has-checked:bg-brand-50"
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={option.value}
                      defaultChecked={index === 0}
                      className="mt-0.5 size-4 accent-brand-600"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink-900">{option.label}</span>
                      {option.hint && (
                        <span className="block text-xs text-ink-500">{option.hint}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <Badge tone="accent">Curso bônus, sem custo adicional</Badge>
          )}

          <Textarea
            label="Mensagem para o tutor"
            name="message"
            rows={3}
            hint="Opcional. Conte o que você faz e o que espera do curso."
          />

          {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}
        </form>
      </Modal>
    </div>
  );
}
