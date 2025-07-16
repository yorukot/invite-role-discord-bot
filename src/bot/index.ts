import { Client, GatewayIntentBits, GuildMember, Invite, REST, Routes, InteractionType } from 'discord.js';
import * as dotenv from 'dotenv';
dotenv.config();
import { InviteTracker } from './inviteTracker';
import { getRoleByInvite } from '../db/inviteRole';
import { connectMongo } from '../db/mongoClient';
import {
  setInviteRoleCommand,
  deleteInviteRoleCommand,
  updateInviteRoleCommand,
  listInviteRolesCommand,
  handleSetInviteRole,
  handleDeleteInviteRole,
  handleUpdateInviteRole,
  handleListInviteRoles
} from './slashCommands';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
  ],
});

const inviteTracker = new InviteTracker(client);

// Register slash commands on startup
client.once('ready', async () => {
  console.log(`已登入為 ${client.user?.tag}!`);

  // 初始化資料庫連接
  try {
    await connectMongo();
    console.log('資料庫連接成功');
    
    // 清理無效的角色映射
    const { cleanupInvalidRoles } = await import('../db/inviteRole');
    const cleanedCount = await cleanupInvalidRoles();
    if (cleanedCount > 0) {
      console.log(`已清理 ${cleanedCount} 個無效的邀請角色映射`);
    }
  } catch (error) {
    console.error('資料庫連接失敗:', error);
    process.exit(1);
  }

  await inviteTracker.cacheAllGuilds();

  if (client.user) {
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);
    const commands = [
      setInviteRoleCommand.toJSON(),
      deleteInviteRoleCommand.toJSON(),
      updateInviteRoleCommand.toJSON(),
      listInviteRolesCommand.toJSON()
    ];
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('斜線命令已全域註冊。');
  }
});

// Update invite cache when a new invite is created
client.on('inviteCreate', invite => {
  inviteTracker.updateInvite(invite);
});

// Remove invite from cache when an invite is deleted
client.on('inviteDelete', invite => {
  inviteTracker.removeInvite(invite);
});

// When a new member joins, determine which invite was used and assign the corresponding role
client.on('guildMemberAdd', async member => {
  let usedInvite: Invite | undefined;
  
  try {
    // 使用新的檢測方法
    usedInvite = await inviteTracker.detectInviteUsageAndUpdate(member.guild);

    // 如果沒有檢測到邀請變化，使用智能推斷
    if (!usedInvite) {
      console.log('[邀請追蹤器] 使用智能推斷找到最可能的邀請...');

      // 獲取所有有角色映射的邀請碼
      const { getAllInviteRoles } = await import('../db/inviteRole');
      const inviteRoleMap = await getAllInviteRoles();
      
      // 獲取目前的邀請
      const currentInvites = await member.guild.invites.fetch();
      
      // 找到有角色映射的活躍邀請
      const activeInvitesWithRoles = Array.from(currentInvites.values()).filter(invite =>
        inviteRoleMap[invite.code] && (!invite.maxUses || invite.uses! < invite.maxUses)
      );

      if (activeInvitesWithRoles.length === 1) {
        usedInvite = activeInvitesWithRoles[0];
        console.log(`[邀請追蹤器] 推斷使用邀請: ${usedInvite.code} (唯一有角色映射的活躍邀請)`);
      } else if (activeInvitesWithRoles.length > 1) {
        // 選擇使用次數最多的邀請
        usedInvite = activeInvitesWithRoles.reduce((prev, current) =>
          (current.uses || 0) > (prev.uses || 0) ? current : prev
        );
        console.log(`[邀請追蹤器] 推斷使用邀請: ${usedInvite.code} (使用次數最多: ${usedInvite.uses})`);
      }
    }
  } catch (err) {
    console.warn('成員加入時獲取邀請出錯:', err);
    return;
  }

  let assignedRole;
  if (usedInvite) {
    const roleId = await getRoleByInvite(usedInvite.code);
    if (roleId) {
      try {
        await member.roles.add(roleId);
        assignedRole = `<@&${roleId}>`;
      } catch (err) {
        console.warn(`為 ${member.user.tag} 分配角色 ${roleId} 失敗:`, err);
      }
    }
  }
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      switch (interaction.commandName) {
        case '設定邀請角色':
          await handleSetInviteRole(interaction);
          break;
        case '刪除邀請角色':
          await handleDeleteInviteRole(interaction);
          break;
        case '更新邀請角色':
          await handleUpdateInviteRole(interaction);
          break;
        case '列出邀請角色':
          await handleListInviteRoles(interaction);
          break;
        default:
          console.warn(`未知的命令: ${interaction.commandName}`);
          if (!interaction.replied) {
            await interaction.reply({
              content: '未知的命令',
              flags: 1 << 6
            });
          }
      }
    }
  } catch (error) {
    console.error('處理互動時發生錯誤:', error);
    if (interaction.isRepliable() && !interaction.replied) {
      try {
        await interaction.reply({
          content: '處理命令時發生錯誤，請稍後再試。',
          flags: 1 << 6
        });
      } catch (replyError) {
        console.error('回應錯誤時也發生錯誤:', replyError);
      }
    }
  }
});

client.login(process.env.BOT_TOKEN);

// 優雅關閉處理
process.on('SIGINT', async () => {
  console.log('正在關閉機器人...');
  const { closeMongo } = await import('../db/mongoClient');
  await closeMongo();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('正在關閉機器人...');
  const { closeMongo } = await import('../db/mongoClient');
  await closeMongo();
  process.exit(0);
}); 