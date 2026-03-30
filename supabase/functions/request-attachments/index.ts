import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { v2 as cloudinary } from 'https://esm.sh/cloudinary@2.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('PROJECT_URL') ?? '';
const supabaseAnonKey = Deno.env.get('PROJECT_ANON_KEY') ?? '';
const supabaseServiceRoleKey = Deno.env.get('PROJECT_SERVICE_ROLE_KEY') ?? '';
const cloudinaryCloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME') ?? '';
const cloudinaryApiKey = Deno.env.get('CLOUDINARY_API_KEY') ?? '';
const cloudinaryApiSecret = Deno.env.get('CLOUDINARY_API_SECRET') ?? '';

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: cloudinaryApiKey,
  api_secret: cloudinaryApiSecret,
  secure: true,
});

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const userClient = (authHeader: string) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

type CallerProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

type AttachmentRow = {
  id: string;
  request_id: string;
  file_name: string;
  storage_path: string;
  file_type: 'photo' | 'doc';
  content_type?: string | null;
  created_at?: string | null;
  size_bytes?: number | null;
  cloudinary_public_id?: string | null;
  cloudinary_resource_type?: 'image' | 'raw' | null;
  cloudinary_asset_type?: 'authenticated' | null;
  cloudinary_version?: string | null;
  cloudinary_bytes?: number | null;
  cloudinary_format?: string | null;
  original_filename?: string | null;
  migrated_at?: string | null;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const ensureConfig = () => {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error('Supabase Edge Function sem variáveis essenciais do projeto.');
  }

  if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
    throw new Error('Cloudinary não configurado. Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.');
  }
};

const buildAttachmentResponse = (row: AttachmentRow) => ({
  id: String(row.id),
  url: '',
  type: row.file_type,
  name: String(row.original_filename || row.file_name),
  path: row.storage_path || undefined,
  contentType: row.content_type || undefined,
  sizeBytes:
    typeof row.cloudinary_bytes === 'number'
      ? row.cloudinary_bytes
      : typeof row.size_bytes === 'number'
        ? row.size_bytes
        : undefined,
  createdAt: row.created_at || undefined,
  publicId: row.cloudinary_public_id || undefined,
  resourceType: row.cloudinary_resource_type || undefined,
  assetType: row.cloudinary_asset_type || undefined,
  version: row.cloudinary_version || undefined,
  format: row.cloudinary_format || undefined,
  migratedAt: row.migrated_at || undefined,
});

const loadCallerProfile = async (authHeader: string): Promise<CallerProfile> => {
  const callerClient = userClient(authHeader);
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user?.email) {
    throw new Error('Sessão autenticada inválida.');
  }

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('id, name, email, role, status')
    .eq('email', normalizeEmail(user.email))
    .limit(1)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile || profile.status !== 'Ativo') {
    throw new Error('Usuário autenticado sem perfil ativo no sistema.');
  }

  return profile as CallerProfile;
};

const insertAuditLog = async (
  caller: CallerProfile,
  entityId: string,
  summary: string,
  actionType: 'Criação' | 'Edição' | 'Exclusão' = 'Edição'
) => {
  try {
    await adminClient.from('audit_logs').insert({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user_id: caller.id,
      user_name: caller.name,
      user_role: caller.role,
      action_type: actionType,
      entity: 'Solicitação',
      entity_id: entityId,
      summary,
    });
  } catch (_error) {
    // Best effort only.
  }
};

const validateFile = (file: File) => {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`Tipo de arquivo não permitido para "${file.name}".`);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Arquivo "${file.name}" excede o limite de 10 MB.`);
  }
};

const toBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const uploadFileToCloudinary = async (requestId: string, attachmentId: string, file: File) => {
  const resourceType = file.type === 'application/pdf' ? 'raw' : 'image';
  const dataUri = `data:${file.type};base64,${toBase64(await file.arrayBuffer())}`;
  const publicId = `requests/${requestId}/${attachmentId}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    public_id: publicId,
    resource_type: resourceType,
    type: 'authenticated',
    overwrite: false,
    filename_override: file.name,
    use_filename: false,
    unique_filename: false,
  });

  return {
    publicId: String(result.public_id),
    resourceType: resourceType as 'image' | 'raw',
    assetType: 'authenticated' as const,
    version: String(result.version),
    bytes: Number(result.bytes),
    format: String(result.format || ''),
    originalFilename: String(result.original_filename || file.name),
  };
};

const loadAttachment = async (attachmentId: string) => {
  const { data, error } = await adminClient
    .from('request_attachments')
    .select(
      'id, request_id, file_name, storage_path, file_type, content_type, created_at, size_bytes, cloudinary_public_id, cloudinary_resource_type, cloudinary_asset_type, cloudinary_version, cloudinary_bytes, cloudinary_format, original_filename, migrated_at'
    )
    .eq('id', attachmentId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Anexo não encontrado.');
  }

  return data as AttachmentRow;
};

const buildCloudinarySignedUrl = (attachment: AttachmentRow, expiresInSeconds = 120) => {
  if (!attachment.cloudinary_public_id || !attachment.cloudinary_resource_type || !attachment.cloudinary_format) {
    throw new Error('Anexo ainda não migrado para Cloudinary.');
  }

  return cloudinary.utils.private_download_url(attachment.cloudinary_public_id, attachment.cloudinary_format, {
    resource_type: attachment.cloudinary_resource_type,
    type: attachment.cloudinary_asset_type || 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    attachment: false,
  });
};

const deleteCloudinaryAsset = async (attachment: AttachmentRow) => {
  if (!attachment.cloudinary_public_id) return;

  await cloudinary.uploader.destroy(attachment.cloudinary_public_id, {
    resource_type: attachment.cloudinary_resource_type || 'image',
    type: attachment.cloudinary_asset_type || 'authenticated',
    invalidate: true,
  });
};

Deno.serve(async (req) => {
  try {
    ensureConfig();

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return json(405, { error: 'Method not allowed' });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json(401, { error: 'Missing authorization header' });
    }

    const caller = await loadCallerProfile(authHeader);
    const contentType = req.headers.get('Content-Type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const action = String(formData.get('action') || '');
      const requestId = String(formData.get('requestId') || '').trim();
      const file = formData.get('file');

      if (action !== 'upload') {
        return json(400, { error: 'Unsupported multipart action' });
      }

      if (!requestId) {
        return json(400, { error: 'Missing requestId' });
      }

      if (!(file instanceof File)) {
        return json(400, { error: 'Missing attachment file' });
      }

      validateFile(file);

      const attachmentId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      try {
        const cloudinaryAsset = await uploadFileToCloudinary(requestId, attachmentId, file);
        const rowPayload = {
          id: attachmentId,
          request_id: requestId,
          file_name: file.name,
          storage_path: `cloudinary:${cloudinaryAsset.publicId}`,
          file_type: file.type.startsWith('image/') ? 'photo' : 'doc',
          content_type: file.type || null,
          size_bytes: file.size,
          created_at: createdAt,
          cloudinary_public_id: cloudinaryAsset.publicId,
          cloudinary_resource_type: cloudinaryAsset.resourceType,
          cloudinary_asset_type: cloudinaryAsset.assetType,
          cloudinary_version: cloudinaryAsset.version,
          cloudinary_bytes: cloudinaryAsset.bytes,
          cloudinary_format: cloudinaryAsset.format,
          original_filename: cloudinaryAsset.originalFilename,
          migrated_at: createdAt,
        };

        const { data, error } = await adminClient
          .from('request_attachments')
          .insert(rowPayload)
          .select(
            'id, request_id, file_name, storage_path, file_type, content_type, created_at, size_bytes, cloudinary_public_id, cloudinary_resource_type, cloudinary_asset_type, cloudinary_version, cloudinary_bytes, cloudinary_format, original_filename, migrated_at'
          )
          .single();

        if (error || !data) {
          await deleteCloudinaryAsset({
            id: attachmentId,
            request_id: requestId,
            file_name: file.name,
            storage_path: rowPayload.storage_path,
            file_type: rowPayload.file_type,
            content_type: rowPayload.content_type,
            created_at: createdAt,
            size_bytes: file.size,
            cloudinary_public_id: cloudinaryAsset.publicId,
            cloudinary_resource_type: cloudinaryAsset.resourceType,
            cloudinary_asset_type: cloudinaryAsset.assetType,
            cloudinary_version: cloudinaryAsset.version,
            cloudinary_bytes: cloudinaryAsset.bytes,
            cloudinary_format: cloudinaryAsset.format,
            original_filename: cloudinaryAsset.originalFilename,
            migrated_at: createdAt,
          });
          throw new Error(error?.message || 'Falha ao persistir metadados do anexo.');
        }

        await insertAuditLog(caller, requestId, `Anexo ${file.name} enviado para Cloudinary.`, 'Edição');
        return json(200, { attachment: buildAttachmentResponse(data as AttachmentRow) });
      } catch (error) {
        await insertAuditLog(caller, requestId, `Falha no upload do anexo ${file.name}: ${error instanceof Error ? error.message : String(error)}.`, 'Edição');
        return json(400, { error: error instanceof Error ? error.message : 'Upload failed' });
      }
    }

    const payload = await req.json().catch(() => ({}));
    const action = String(payload.action || '');
    const attachmentId = String(payload.attachmentId || '').trim();

    if (!attachmentId) {
      return json(400, { error: 'Missing attachmentId' });
    }

    const attachment = await loadAttachment(attachmentId);

    if (action === 'sign') {
      try {
        const signedUrl = buildCloudinarySignedUrl(attachment);
        return json(200, { signedUrl });
      } catch (error) {
        await insertAuditLog(caller, attachment.request_id, `Falha ao assinar acesso do anexo ${attachment.file_name}: ${error instanceof Error ? error.message : String(error)}.`, 'Edição');
        return json(400, { error: error instanceof Error ? error.message : 'Sign failed' });
      }
    }

    if (action === 'download') {
      try {
        const signedUrl = buildCloudinarySignedUrl(attachment);
        const cloudinaryResponse = await fetch(signedUrl);
        if (!cloudinaryResponse.ok || !cloudinaryResponse.body) {
          throw new Error(`Cloudinary retornou HTTP ${cloudinaryResponse.status}.`);
        }

        return new Response(cloudinaryResponse.body, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': attachment.content_type || 'application/octet-stream',
            'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.original_filename || attachment.file_name)}"`,
            'Cache-Control': 'private, max-age=60',
          },
        });
      } catch (error) {
        await insertAuditLog(caller, attachment.request_id, `Falha ao baixar o anexo ${attachment.file_name}: ${error instanceof Error ? error.message : String(error)}.`, 'Edição');
        return json(400, { error: error instanceof Error ? error.message : 'Download failed' });
      }
    }

    if (action === 'delete') {
      try {
        await deleteCloudinaryAsset(attachment);
        const { error } = await adminClient.from('request_attachments').delete().eq('id', attachmentId);
        if (error) {
          throw new Error(error.message);
        }

        await insertAuditLog(caller, attachment.request_id, `Anexo ${attachment.file_name} removido do Cloudinary.`, 'Exclusão');
        return json(200, { ok: true });
      } catch (error) {
        await insertAuditLog(caller, attachment.request_id, `Falha ao excluir o anexo ${attachment.file_name}: ${error instanceof Error ? error.message : String(error)}.`, 'Exclusão');
        return json(400, { error: error instanceof Error ? error.message : 'Delete failed' });
      }
    }

    return json(400, { error: 'Unsupported action' });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});
