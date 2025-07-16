import { Client, Guild, Invite } from 'discord.js';

// 簡單的邀請快照
interface InviteSnapshot {
  code: string;
  uses: number;
  timestamp: number;
}

// InviteTracker class is responsible for tracking and caching invite usage
export class InviteTracker {
  private inviteSnapshots = new Map<string, InviteSnapshot>();

  constructor(private client: Client) { }

  // Cache all invites for a specific guild
  async cacheGuildInvites(guild: Guild) {
    try {
      const invites = await guild.invites.fetch();
      const timestamp = Date.now();

      invites.forEach(invite => {
        this.inviteSnapshots.set(invite.code, {
          code: invite.code,
          uses: invite.uses || 0,
          timestamp
        });
      });

      console.log(`[邀請追蹤器] 已快取伺服器 ${guild.id} 的邀請:`,
        Array.from(invites.values()).map(i => `${i.code}:${i.uses}`));
    } catch (err) {
      console.warn(`無法獲取伺服器 ${guild.id} 的邀請:`, err);
    }
  }

  // Cache invites for all guilds the bot is in
  async cacheAllGuilds() {
    for (const guild of this.client.guilds.cache.values()) {
      await this.cacheGuildInvites(guild);
    }
  }

  // Update the cache when an invite is created or updated
  updateInvite(invite: Invite) {
    this.inviteSnapshots.set(invite.code, {
      code: invite.code,
      uses: invite.uses || 0,
      timestamp: Date.now()
    });
    console.log(`[邀請追蹤器] 邀請已建立/更新: ${invite.code}, 使用次數: ${invite.uses}`);
  }

  // Remove an invite from the cache when it is deleted
  removeInvite(invite: Invite) {
    this.inviteSnapshots.delete(invite.code);
    console.log(`[邀請追蹤器] 邀請已刪除: ${invite.code}`);
  }

  // 檢測邀請使用並更新快取
  async detectInviteUsageAndUpdate(guild: Guild): Promise<Invite | undefined> {
    try {
      const currentInvites = await guild.invites.fetch();
      const timestamp = Date.now();
      let usedInvite: Invite | undefined;

      console.log(`[邀請追蹤器] 檢測邀請使用變化...`);

      // 檢查每個當前邀請與我們快取的差異
      for (const invite of currentInvites.values()) {
        const snapshot = this.inviteSnapshots.get(invite.code);
        const currentUses = invite.uses || 0;
        const cachedUses = snapshot?.uses || 0;

        console.log(`[邀請追蹤器] 邀請 ${invite.code}: 目前=${currentUses}, 快取=${cachedUses}`);

        if (currentUses > cachedUses) {
          usedInvite = invite;
          console.log(`[邀請追蹤器] ✅ 檢測到邀請被使用: ${invite.code} (${cachedUses} -> ${currentUses})`);
          break;
        }
      }

      // 更新所有邀請的快取
      currentInvites.forEach(invite => {
        this.inviteSnapshots.set(invite.code, {
          code: invite.code,
          uses: invite.uses || 0,
          timestamp
        });
      });

      if (!usedInvite) {
        console.log('[邀請追蹤器] ❌ 未檢測到邀請使用變化');
      }

      return usedInvite;
    } catch (err) {
      console.warn('檢測邀請使用時發生錯誤:', err);
      return undefined;
    }
  }

  // Helper: Get a cached invite snapshot by its code
  getCachedSnapshot(code: string): InviteSnapshot | undefined {
    return this.inviteSnapshots.get(code);
  }

  // Helper: Get all cached snapshots
  getAllSnapshots(): InviteSnapshot[] {
    return Array.from(this.inviteSnapshots.values());
  }
} 