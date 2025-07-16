# Discord Invite Role Bot

A Discord bot that automatically assigns roles to users based on which invite link they used to join the server.

## Features

- 🎯 Automatic role assignment based on invite codes
- 📊 Invite tracking and usage detection
- 🎛️ Slash commands for managing invite-role mappings
- 📝 Optional join logging to a specified channel
- 🗄️ MongoDB persistence for invite-role mappings

## Setup

### Prerequisites

- Docker and Docker Compose
- Discord Bot Token
- Discord Server with appropriate permissions

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Discord Bot Configuration
BOT_TOKEN=your_discord_bot_token_here

# MongoDB Configuration (for Docker Compose)
MONGODB_URI=mongodb://admin:password123@mongodb:27017/invite_bot?authSource=admin

# Environment
NODE_ENV=production
```

### Discord Bot Permissions

Your bot needs the following permissions:
- `Manage Guild` (for slash commands)
- `Manage Roles` (to assign roles)
- `View Channels` (to access channels)
- `Send Messages` (for logging)
- `Use Slash Commands`

### Running with Docker Compose

1. Clone the repository
2. Create your `.env` file with the required variables
3. Run the bot and MongoDB:

```bash
docker-compose up -d
```

4. Check logs:

```bash
# Bot logs
docker-compose logs discord-bot

# MongoDB logs
docker-compose logs mongodb
```

### Development Mode

For development without Docker:

1. Install dependencies:
```bash
pnpm install
```Great

2. Start MongoDB (locally or via Docker):
```bash
docker run -d -p 27017:27017 --name mongodb -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password123 mongo:7.0
```

3. Build and run:
```bash
pnpm run build
pnpm start
```

## Slash Commands

The bot provides the following slash commands (Chinese):

- `/設定邀請角色` - Set up invite code to role mapping
- `/刪除邀請角色` - Delete an invite-role mapping
- `/更新邀請角色` - Update an existing invite-role mapping
- `/列出邀請角色` - List all current invite-role mappings

## How It Works

1. **Invite Tracking**: The bot caches all server invites when it starts
2. **Member Join Detection**: When a user joins, it compares current invite usage with cached data
3. **Smart Inference**: If direct detection fails, it uses intelligent fallback logic
4. **Role Assignment**: Automatically assigns the mapped role to the new member
5. **Logging**: Optionally logs join events to a specified channel

## Architecture

```
├── src/
│   ├── bot/
│   │   ├── index.ts          # Main bot logic and event handlers
│   │   ├── inviteTracker.ts  # Invite tracking and caching
│   │   └── slashCommands.ts  # Slash command definitions and handlers
│   ├── db/
│   │   ├── mongoClient.ts    # MongoDB connection management
│   │   └── inviteRole.ts     # Invite-role mapping database operations
│   └── index.ts              # Application entry point
├── docker-compose.yaml       # Docker Compose configuration
├── Dockerfile               # Docker image definition
└── package.json            # Dependencies and scripts
```

## Stopping the Bot

```bash
docker-compose down
```

To also remove the MongoDB data volume:

```bash
docker-compose down -v
```

## Troubleshooting

### Bot not responding to commands
- Check that the bot has the correct permissions in your Discord server
- Verify the `BOT_TOKEN` is correct
- Check bot logs: `docker-compose logs discord-bot`

### Database connection issues
- Ensure MongoDB is running: `docker-compose ps`
- Check MongoDB logs: `docker-compose logs mongodb`
- Verify the `MONGODB_URI` format

### Invite tracking not working
- Ensure the bot has `Manage Guild` and `View Channels` permissions
- Check that the bot can see the server's invite list
- Review invite tracking logs in the bot output 