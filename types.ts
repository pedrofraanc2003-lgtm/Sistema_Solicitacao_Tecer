
export enum UserRole {
  ADMIN = 'Admin',
  PCM = 'PCM',
  LIDERANCA = 'Liderança',
  COMPRAS = 'Compras'
}

export enum UserStatus {
  ATIVO = 'Ativo',
  INATIVO = 'Inativo'
}

export interface User {
  id: string;
  name: string;
  email?: string;
  username: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
}

export enum RequestType {
  PECA = 'Peça',
  SERVICO = 'Serviço',
  FERRAMENTA = 'Ferramenta'
}

export enum DemandClassification {
  CORRETIVA = 'Corretiva',
  PREVENTIVA = 'Preventiva',
  MELHORIA = 'Melhoria',
  INSPECAO = 'Inspeção'
}

export enum UrgencyLevel {
  ALTA = 'Alta',
  MEDIA = 'Média',
  BAIXA = 'Baixa'
}

export enum OperationalImpact {
  SEM_IMPACTO = 'Sem impacto',
  IMPACTO_PARCIAL = 'Impacto parcial',
  EQUIPAMENTO_PARADO = 'Equipamento parado',
  EQUIPAMENTO_INOPERANTE = 'Equipamento inoperante'
}

export enum RequestStatus {
  NOVA = 'Nova',
  CADASTRO = 'Cadastro',
  EMITIDO_SC = 'Emitido SC',
  AGUARDANDO_ENTREGA = 'Aguardando entrega',
  DISPONIVEL = 'Disponível',
  CANCELADA = 'Cancelada'
}

export interface Insumo {
  id: string;
  code?: string;
  description: string;
  quantity: number;
  unit: string;
  catalogStatus?: 'Cadastrado' | 'Novo/Cadastro';
  deadline?: string;
  notes?: string;
}

export interface MaintenanceRequest {
  id: string; // SOL-MNT-XXXXXX
  type: RequestType;
  classification?: DemandClassification;
  equipmentId?: string;
  description: string;
  urgency: UrgencyLevel;
  impact: OperationalImpact;
  status: RequestStatus;
  requesterId: string;
  pcmResponsibleId?: string;
  createdAt: string;
  deadline?: string;
  insumos: Insumo[];
  attachments: RequestAttachment[];
  comments: Comment[];
  history: HistoryEntry[];
}

export interface RequestAttachment {
  id: string;
  url: string;
  type: 'photo' | 'doc';
  name: string;
  path?: string;
  contentType?: string;
  sizeBytes?: number;
  createdAt?: string;
  publicId?: string;
  resourceType?: 'image' | 'raw';
  assetType?: 'authenticated';
  version?: string;
  format?: string;
  migratedAt?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface HistoryEntry {
  id: string;
  oldStatus?: RequestStatus;
  newStatus: RequestStatus;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface Equipment {
  id: string;
  tag: string;
  name: string;
  type: string;
  status: UserStatus;
  notes?: string;
}

export enum WorkshopKanbanStatus {
  PENDENTE = 'Pendente',
  EM_ANDAMENTO = 'Em Andamento',
  LIBERADO = 'Liberado'
}

export enum WorkshopMaintenanceType {
  MECANICA = 'Mecânica',
  ELETRICA = 'Elétrica',
  PINTURA = 'Pintura',
  SOLDA = 'Solda',
  REFORMA = 'Reforma'
}

export interface WorkshopKanbanItem {
  id: string;
  equipmentId: string;
  tag: string;
  equipmentName: string;
  maintenanceType: WorkshopMaintenanceType;
  description: string;
  status: WorkshopKanbanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  actionType: 'Criação' | 'Edição' | 'Exclusão' | 'Status';
  entity: 'Solicitação' | 'Equipamento' | 'Usuário' | 'Kanban Oficina';
  entityId: string;
  summary: string;
}

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  requestId: string;
  read: boolean;
}


