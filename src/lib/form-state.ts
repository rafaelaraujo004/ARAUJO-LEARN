/**
 * Estado compartilhado dos formulários (useActionState).
 * Fica fora dos arquivos 'use server' porque só funções assíncronas podem ser
 * exportadas de um módulo de Server Actions.
 */
export interface FormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Id do registro recém-criado, para a tela poder ir direto até ele. */
  createdId?: string;
}

export const emptyFormState: FormState = { ok: false };
