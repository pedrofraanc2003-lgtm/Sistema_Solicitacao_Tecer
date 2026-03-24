import {
  User,
  UserRole,
  UserStatus,
  Equipment,
  RequestType,
  DemandClassification,
  UrgencyLevel,
  OperationalImpact,
  RequestStatus,
  MaintenanceRequest,
} from '../types';

export const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin Tecer', email: 'admin@tecer.com', username: 'admin', role: UserRole.ADMIN, status: UserStatus.ATIVO, password: 'admin' },
  { id: '2', name: 'Joao PCM', email: 'joao.pcm@tecer.com', username: 'joao.pcm', role: UserRole.PCM, status: UserStatus.ATIVO, password: 'pcm' },
  { id: '3', name: 'Maria Lider', email: 'maria.lider@tecer.com', username: 'maria.lider', role: UserRole.LIDERANCA, status: UserStatus.ATIVO, password: 'lider' },
  { id: '4', name: 'Carlos Compras', email: 'carlos.compras@tecer.com', username: 'carlos.compras', role: UserRole.COMPRAS, status: UserStatus.ATIVO, password: 'compras' },
];

export const MOCK_EQUIPMENTS: Equipment[] = [
  { id: 'eq1', tag: 'EMP-001', name: 'Empilhadeira Reach Stacker', type: 'Movimentacao', status: UserStatus.ATIVO },
  { id: 'eq2', tag: 'GUIN-010', name: 'Guindaste MHC', type: 'Portuario', status: UserStatus.ATIVO },
  { id: 'eq3', tag: 'TRA-005', name: 'Trator de Terminal', type: 'Transporte', status: UserStatus.ATIVO },
];

export const MOCK_REQUESTS: MaintenanceRequest[] = [
  {
    id: 'SOL-MNT-000001',
    type: RequestType.PECA,
    classification: DemandClassification.CORRETIVA,
    equipmentId: 'eq1',
    description: 'Vazamento de oleo no cilindro principal de elevacao.',
    urgency: UrgencyLevel.ALTA,
    impact: OperationalImpact.EQUIPAMENTO_PARADO,
    status: RequestStatus.EMITIDO_SC,
    requesterId: '3',
    pcmResponsibleId: '2',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    deadline: new Date(Date.now() - 86400000).toISOString(),
    insumos: [
      { id: 'ins1', description: 'Reparo Cilindro Hidraulico', quantity: 1, unit: 'un', deadline: new Date(Date.now() + 86400000 * 2).toISOString() },
      { id: 'ins2', description: 'Oleo Hidraulico ISO 68', quantity: 20, unit: 'l', deadline: new Date(Date.now() + 86400000 * 4).toISOString() },
    ],
    attachments: [],
    comments: [],
    history: [
      { id: 'h1', newStatus: RequestStatus.NOVA, userId: '3', userName: 'Maria Lider', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
    ],
  },
];
