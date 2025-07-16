import { connectMongo } from './mongoClient';

const COLLECTION = 'invite_roles';

export async function getRoleByInvite(inviteCode: string): Promise<string | null> {
  const client = await connectMongo();
  const db = client.db();
  const doc = await db.collection(COLLECTION).findOne({ inviteCode });
  return doc?.roleId || null;
}

export async function setInviteRole(inviteCode: string, roleId: string) {
  const client = await connectMongo();
  const db = client.db();
  await db.collection(COLLECTION).updateOne(
    { inviteCode },
    { $set: { inviteCode, roleId } },
    { upsert: true }
  );
}

export async function getAllInviteRoles(): Promise<Record<string, string>> {
  const client = await connectMongo();
  const db = client.db();
  const docs = await db.collection(COLLECTION).find({ roleId: { $ne: null } }).toArray();
  return Object.fromEntries(docs.filter(d => d.roleId).map(d => [d.inviteCode, d.roleId]));
}

export async function deleteInviteRole(inviteCode: string): Promise<boolean> {
  const client = await connectMongo();
  const db = client.db();
  const result = await db.collection(COLLECTION).deleteOne({ inviteCode });
  return result.deletedCount > 0;
}

export async function cleanupInvalidRoles(): Promise<number> {
  const client = await connectMongo();
  const db = client.db();
  const result = await db.collection(COLLECTION).deleteMany({ 
    $or: [
      { roleId: null }, 
      { roleId: undefined },
      { roleId: { $exists: false } }
    ]
  });
  return result.deletedCount;
} 