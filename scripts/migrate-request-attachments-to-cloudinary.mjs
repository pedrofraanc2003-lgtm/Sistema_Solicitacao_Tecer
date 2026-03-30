import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const batchSize = Number(process.env.BATCH_SIZE || 20);
const requestIdFilter = process.env.REQUEST_ID?.trim();
const dryRun = process.env.DRY_RUN === '1';

const signCloudinaryParams = (params) => {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto.createHash('sha1').update(`${serialized}${process.env.CLOUDINARY_API_SECRET}`).digest('hex');
};

const uploadToCloudinary = async ({ requestId, attachmentId, fileName, contentType, buffer }) => {
  const resourceType = contentType === 'application/pdf' ? 'raw' : 'image';
  const publicId = `requests/${requestId}/${attachmentId}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    public_id: publicId,
    timestamp,
    type: 'authenticated',
    overwrite: 'false',
    filename_override: fileName,
    use_filename: 'false',
    unique_filename: 'false',
  };

  const signature = signCloudinaryParams(params);
  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: contentType }), fileName);
  formData.append('api_key', process.env.CLOUDINARY_API_KEY);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('public_id', publicId);
  formData.append('type', 'authenticated');
  formData.append('overwrite', 'false');
  formData.append('filename_override', fileName);
  formData.append('use_filename', 'false');
  formData.append('unique_filename', 'false');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Cloudinary upload failed for ${attachmentId}.`);
  }

  return {
    publicId: String(data.public_id),
    resourceType,
    assetType: 'authenticated',
    version: String(data.version),
    bytes: Number(data.bytes),
    format: String(data.format || ''),
    originalFilename: String(data.original_filename || fileName),
  };
};

const loadBatch = async (from, to) => {
  let query = supabase
    .from('request_attachments')
    .select(
      'id, request_id, file_name, storage_path, content_type, cloudinary_public_id, cloudinary_resource_type, cloudinary_asset_type, cloudinary_version, cloudinary_bytes, cloudinary_format, original_filename, migrated_at'
    )
    .is('cloudinary_public_id', null)
    .order('created_at', { ascending: true })
    .range(from, to);

  if (requestIdFilter) {
    query = query.eq('request_id', requestIdFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
};

let offset = 0;
for (;;) {
  const rows = await loadBatch(offset, offset + batchSize - 1);
  if (!rows.length) break;

  for (const row of rows) {
    if (!row.storage_path || String(row.storage_path).startsWith('cloudinary:')) {
      continue;
    }

    console.log(`Migrating attachment ${row.id} (${row.file_name})`);
    if (dryRun) continue;

    const { data: fileBlob, error: downloadError } = await supabase.storage.from('anexos').download(String(row.storage_path));
    if (downloadError || !fileBlob) {
      throw new Error(downloadError?.message || `Failed to download ${row.id} from Supabase Storage.`);
    }

    const uploaded = await uploadToCloudinary({
      requestId: String(row.request_id),
      attachmentId: String(row.id),
      fileName: String(row.file_name),
      contentType: String(row.content_type || fileBlob.type || 'application/octet-stream'),
      buffer: Buffer.from(await fileBlob.arrayBuffer()),
    });

    const { error: updateError } = await supabase
      .from('request_attachments')
      .update({
        storage_path: `cloudinary:${uploaded.publicId}`,
        cloudinary_public_id: uploaded.publicId,
        cloudinary_resource_type: uploaded.resourceType,
        cloudinary_asset_type: uploaded.assetType,
        cloudinary_version: uploaded.version,
        cloudinary_bytes: uploaded.bytes,
        cloudinary_format: uploaded.format,
        original_filename: uploaded.originalFilename,
        migrated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  offset += rows.length;
}

console.log('Cloudinary migration completed.');
