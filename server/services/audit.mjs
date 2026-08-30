import { getPool } from "../db/pool.mjs";

export async function audit(req, { action, entityType, entityId, summary, companyId, metadata = {} }) {
  await getPool().query(
    `INSERT INTO activity_logs (user_id,company_id,action,entity_type,entity_id,summary,metadata,ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
    [req.user?.id || null, companyId || null, action, entityType, entityId ? String(entityId) : null, summary, JSON.stringify(metadata), req.ip || null]
  );
}
