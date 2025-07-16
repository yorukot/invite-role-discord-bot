import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { setInviteRole, getAllInviteRoles, deleteInviteRole } from '../db/inviteRole';

// Slash command: Set invite-role mapping
export const setInviteRoleCommand = new SlashCommandBuilder()
  .setName('設定邀請角色')
  .setDescription('將邀請碼對應到身分組')
  .addStringOption(option =>
    option.setName('邀請碼')
      .setDescription('邀請碼（不是完整網址）')
      .setRequired(true)
  )
  .addRoleOption(option =>
    option.setName('身分組')
      .setDescription('要分配的身分組')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

// Slash command: Delete invite-role mapping
export const deleteInviteRoleCommand = new SlashCommandBuilder()
  .setName('刪除邀請角色')
  .setDescription('刪除邀請碼與身分組的對應關係')
  .addStringOption(option =>
    option.setName('邀請碼')
      .setDescription('要刪除對應的邀請碼')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

// Slash command: Update invite-role mapping
export const updateInviteRoleCommand = new SlashCommandBuilder()
  .setName('更新邀請角色')
  .setDescription('更新邀請碼對應的身分組')
  .addStringOption(option =>
    option.setName('邀請碼')
      .setDescription('要更新的邀請碼')
      .setRequired(true)
  )
  .addRoleOption(option =>
    option.setName('新身分組')
      .setDescription('要更新成的新身分組')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

// Slash command: List all invite-role mappings
export const listInviteRolesCommand = new SlashCommandBuilder()
  .setName('列出邀請角色')
  .setDescription('列出所有邀請碼與身分組的對應關係')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

// Handle set invite role interaction
export async function handleSetInviteRole(interaction: ChatInputCommandInteraction) {
  try {
    const inviteCode = interaction.options.getString('邀請碼', true);
    const role = interaction.options.getRole('身分組', true);

    await setInviteRole(inviteCode, role.id);
    await interaction.reply({
      content: `已將邀請碼 \`${inviteCode}\` 對應到身分組 <@&${role.id}>`,
      flags: 1 << 6 // MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error('設定邀請角色時發生錯誤:', error);
    if (!interaction.replied) {
      await interaction.reply({
        content: '執行命令時發生錯誤，請稍後再試。',
        flags: 1 << 6
      });
    }
  }
}

// Handle delete invite role interaction
export async function handleDeleteInviteRole(interaction: ChatInputCommandInteraction) {
  try {
    const inviteCode = interaction.options.getString('邀請碼', true);

    // Check if mapping exists
    const allRoles = await getAllInviteRoles();
    if (allRoles[inviteCode]) {
      // Delete the mapping from database
      const deleted = await deleteInviteRole(inviteCode);
      if (deleted) {
        await interaction.reply({
          content: `已成功刪除邀請碼 \`${inviteCode}\` 的身分組對應`,
          flags: 1 << 6
        });
      } else {
        await interaction.reply({
          content: `刪除邀請碼 \`${inviteCode}\` 時發生錯誤`,
          flags: 1 << 6
        });
      }
    } else {
      await interaction.reply({
        content: `找不到邀請碼 \`${inviteCode}\` 的對應關係`,
        flags: 1 << 6
      });
    }
  } catch (error) {
    console.error('刪除邀請角色時發生錯誤:', error);
    if (!interaction.replied) {
      await interaction.reply({
        content: '執行命令時發生錯誤，請稍後再試。',
        flags: 1 << 6
      });
    }
  }
}

// Handle update invite role interaction
export async function handleUpdateInviteRole(interaction: ChatInputCommandInteraction) {
  try {
    const inviteCode = interaction.options.getString('邀請碼', true);
    const newRole = interaction.options.getRole('新身分組', true);

    await setInviteRole(inviteCode, newRole.id);
    await interaction.reply({
      content: `已將邀請碼 \`${inviteCode}\` 的身分組更新為 <@&${newRole.id}>`,
      flags: 1 << 6
    });
  } catch (error) {
    console.error('更新邀請角色時發生錯誤:', error);
    if (!interaction.replied) {
      await interaction.reply({
        content: '執行命令時發生錯誤，請稍後再試。',
        flags: 1 << 6
      });
    }
  }
}

// Handle list invite roles interaction
export async function handleListInviteRoles(interaction: ChatInputCommandInteraction) {
  try {
    const inviteRoles = await getAllInviteRoles();
    const entries = Object.entries(inviteRoles) as Array<[string, string]>;

    if (entries.length === 0) {
      await interaction.reply({
        content: '目前沒有設定任何邀請碼身分組對應',
        flags: 1 << 6
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('邀請碼身分組對應列表')
      .setColor(0x0099FF)
      .setDescription('目前所有邀請碼與身分組的對應關係：');

    // Explicitly type mapping and index
    const fields = entries.map(([inviteCode, roleId]: [string, string], index: number) => ({
      name: `${index + 1}. 邀請碼: \`${inviteCode}\``,
      value: `身分組: <@&${roleId}>`,
      inline: false
    }));

    embed.addFields(fields);

    await interaction.reply({
      embeds: [embed],
      flags: 1 << 6
    });
  } catch (error) {
    console.error('列出邀請角色時發生錯誤:', error);
    if (!interaction.replied) {
      await interaction.reply({
        content: '執行命令時發生錯誤，請稍後再試。',
        flags: 1 << 6
      });
    }
  }
} 