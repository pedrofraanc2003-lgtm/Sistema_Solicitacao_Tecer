import { describe, expect, it } from 'vitest';
import {
  REQUEST_ATTACHMENTS_MAX_FILE_SIZE_BYTES,
  validateRequestAttachmentBatch,
  validateRequestAttachmentFile,
} from './requestAttachments';

describe('requestAttachments validation', () => {
  it('accepts supported images and pdfs within the size limit', () => {
    const file = new File(['abc'], 'evidencia.png', { type: 'image/png' });
    expect(() => validateRequestAttachmentFile(file)).not.toThrow();
  });

  it('rejects unsupported mime types', () => {
    const file = new File(['abc'], 'planilha.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    expect(() => validateRequestAttachmentFile(file)).toThrow(/Tipo de arquivo/i);
  });

  it('rejects files above the configured size limit', () => {
    const file = new File(['abc'], 'manual.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', {
      value: REQUEST_ATTACHMENTS_MAX_FILE_SIZE_BYTES + 1,
    });

    expect(() => validateRequestAttachmentFile(file)).toThrow(/excede o limite/i);
  });

  it('rejects batches above the per-request limit', () => {
    const files = [new File(['abc'], '1.png', { type: 'image/png' })];
    expect(() => validateRequestAttachmentBatch(10, files)).toThrow(/Limite total/i);
  });
});
