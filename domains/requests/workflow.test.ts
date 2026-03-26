import { describe, expect, it } from 'vitest';
import { RequestStatus, UserRole } from '../../types';
import { canEditDeadline, canTransitionRequest, getAvailableStatusTransitions } from './workflow';

describe('request workflow', () => {
  it('allows admin to move from Nova to Cadastro', () => {
    expect(canTransitionRequest(UserRole.ADMIN, RequestStatus.NOVA, RequestStatus.CADASTRO)).toBe(true);
  });

  it('blocks leadership from jumping directly to Emitido SC', () => {
    expect(canTransitionRequest(UserRole.LIDERANCA, RequestStatus.NOVA, RequestStatus.EMITIDO_SC)).toBe(false);
  });

  it('exposes only valid transitions per role', () => {
    expect(getAvailableStatusTransitions(UserRole.COMPRAS, RequestStatus.EMITIDO_SC)).toEqual([
      RequestStatus.AGUARDANDO_ENTREGA,
    ]);
  });

  it('restricts deadline editing to admin and pcm', () => {
    expect(canEditDeadline(UserRole.ADMIN)).toBe(true);
    expect(canEditDeadline(UserRole.PCM)).toBe(true);
    expect(canEditDeadline(UserRole.LIDERANCA)).toBe(false);
  });
});
