/**
 * Estado compartilhado dos formulários (useActionState).
 * Fica fora dos arquivos 'use server' porque só funções assíncronas podem ser
 * exportadas de um módulo de Server Actions.
 */
export interface FormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

export const emptyFormState: FormState = { ok: false };
