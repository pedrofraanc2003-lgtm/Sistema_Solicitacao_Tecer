import { describe, expect, it } from 'vitest';
import { UserRole } from '../../types';
import { canAccessRoute, getRequestPermissions } from './permissions';

describe('permissions', () => {
  it('permite apenas admin acessar users e audits', () => {
    expect(canAccessRoute({ role: UserRole.ADMIN } as never, 'users')).toBe(true);
    expect(canAccessRoute({ role: UserRole.PCM } as never, 'users')).toBe(false);
    expect(canAccessRoute({ role: UserRole.ADMIN } as never, 'audits')).toBe(true);
    expect(canAccessRoute({ role: UserRole.COMPRAS } as never, 'audits')).toBe(false);
  });

  it('expõe restrições de liderança para edição de insumos existentes', () => {
    const permissions = getRequestPermissions(UserRole.LIDERANCA);
    expect(permissions.canEditGeneralDeadline).toBe(false);
    expect(permissions.canEditItemDeadline).toBe(false);
    expect(permissions.canRemoveExistingInsumo).toBe(false);
  });
});
