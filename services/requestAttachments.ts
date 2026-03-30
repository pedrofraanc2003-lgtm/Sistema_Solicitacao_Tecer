const MB = 1024 * 1024;

export const REQUEST_ATTACHMENTS_MAX_FILES = 10;
export const REQUEST_ATTACHMENTS_MAX_FILE_SIZE_BYTES = 10 * MB;
export const REQUEST_ATTACHMENTS_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const REQUEST_ATTACHMENTS_ACCEPT_ATTRIBUTE = '.jpg,.jpeg,.png,.webp,.pdf';

const isMimeTypeAllowed = (mimeType: string) =>
  REQUEST_ATTACHMENTS_ALLOWED_MIME_TYPES.includes(mimeType as (typeof REQUEST_ATTACHMENTS_ALLOWED_MIME_TYPES)[number]);

const formatBytes = (value: number) => `${(value / MB).toFixed(value % MB === 0 ? 0 : 1)} MB`;

export const validateRequestAttachmentFile = (file: File) => {
  if (!isMimeTypeAllowed(file.type)) {
    throw new Error(`Tipo de arquivo não permitido para "${file.name}". Envie JPG, PNG, WEBP ou PDF.`);
  }

  if (file.size > REQUEST_ATTACHMENTS_MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Arquivo "${file.name}" excede o limite de ${formatBytes(REQUEST_ATTACHMENTS_MAX_FILE_SIZE_BYTES)}.`
    );
  }
};

export const validateRequestAttachmentBatch = (existingCount: number, files: File[]) => {
  const totalFiles = existingCount + files.length;
  if (totalFiles > REQUEST_ATTACHMENTS_MAX_FILES) {
    throw new Error(`Limite total de ${REQUEST_ATTACHMENTS_MAX_FILES} arquivos por solicitação atingido.`);
  }

  files.forEach(validateRequestAttachmentFile);
};
