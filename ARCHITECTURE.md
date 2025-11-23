# Splendor Game Architecture

## Overview

This project implements the Splendor board game using a **Domain-Driven Design (DDD)** architecture with clear separation of concerns and layered organization.

## Architecture Layers

```
┌─────────────────────────────────────────┐
│  Client (React)                         │
│  - Pages, Components, Services          │
└──────────────┬──────────────────────────┘
               │ HTTP/WebSocket
┌──────────────▼──────────────────────────┐
│  API Layer                              │
│  - Routes → Controllers → DTOs          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Service Layer (Application Logic)      │
│  - GameService, LobbyService, etc.      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Domain Layer (Business Logic)          │
│  - Game, Player, Card, Commands         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Infrastructure Layer                   │
│  - Database, EmailProvider, etc.        │
└─────────────────────────────────────────┘
```

## Layer Descriptions

### 1. Client Layer (`client/src/`)

**Responsibility**: User interface and client-side state management

**Key Components**:

- **Pages**: `GamePage`, `HomePage`, `LobbyPage`, `LeaderboardPage`, etc.
- **Components**: Reusable UI components (`GameBoard`, `CardComponent`, `PlayerArea`, etc.)
- **Services**: Client-side API wrappers (`gameService`, `socketService`, `userServiceClient`)
- **Contexts**: React context for authentication and global state
- **Game Engine**: Client-side game state management and validation

**Technologies**: React, TypeScript, Material-UI, Socket.IO Client

---

### 2. API Layer (`server/src/api/`, `server/src/routes/`, `server/src/controllers/`)

**Responsibility**: HTTP endpoints, request validation, and response formatting

**Key Components**:

#### Routes (`server/src/routes/`)

- `gameRoutes.ts` - Game CRUD and action endpoints
- `userRoutes.ts` - User authentication and management
- `lobbyRoutes.ts` - Lobby management
- `notificationRoutes.ts` - Notification endpoints

#### Controllers (`server/src/controllers/`)

- `GameController` - Handles HTTP requests for game operations
- `UserController` - User management and authentication
- `LobbyController` - Lobby creation and management
- `NotificationController` - Notification operations

#### DTOs (`server/src/api/dtos.ts`)

- Data Transfer Objects for API communication
- `GameStateDTO`, `PlayerDTO`, `CardDTO`, `TokenBankDTO`, etc.

#### Mappers (`server/src/api/mappers.ts`)

- `DomainToDTOMapper` - Converts domain entities to DTOs for API responses

**Pattern**: Controller → Service → Domain

---

### 3. Service Layer (`server/src/services/`)

**Responsibility**: Application logic, orchestration, and coordination between layers

**Key Services**:

#### GameService

- Manages game lifecycle (create, join, start, end)
- Orchestrates game actions through domain commands
- Handles game state persistence (in-memory Map)
- Manages invite codes and game cleanup
- Coordinates with NotificationService for player notifications

**Key Methods**:

```typescript
- createGame(request) → GameJoinResponse
- joinGame(gameId, request) → GameJoinResponse
- startGame(gameId) → GameStateDTO
- takeTokens(gameId, playerId, tokens) → GameStateDTO
- purchaseCard(gameId, playerId, cardId, payment) → GameStateDTO
- reserveCard(gameId, playerId, cardId) → GameStateDTO
- endGame(gameId, playerId) → GameStateDTO
```

#### LobbyService

- Manages game lobbies
- Handles player matchmaking

#### NotificationService

- Creates and manages user notifications
- Integrates with EmailProvider for email notifications
- Handles notification preferences
- Sends turn reminders, game invites, and game status updates

#### UserService

- User authentication and registration
- Password hashing and verification
- User statistics and leaderboard

**Pattern**: Services use domain objects and commands, never directly mutate domain state

---

### 4. Domain Layer (`server/src/domain/`)

**Responsibility**: Core business logic and game rules - the heart of the application

**Key Entities**:

#### Game (`Game.ts`)

- **Aggregate Root** - main game entity
- Manages: players, current turn, game status, bank, card decks, nobles
- Enforces all game rules and win conditions
- Validates state transitions

**Key Methods**:

```typescript
- addPlayer(player) → void
- start() → void
- advanceTurn() → void
- checkWinCondition(player) → void
- getCurrentPlayer() → Player
- isPlayerTurn(playerId) → boolean
```

#### Player (`Player.ts`)

- Manages: tokens, purchased cards, reserved cards, nobles
- Calculates: prestige points, gem bonuses
- Validates: card affordability, token limits

#### Card (`Card.ts`)

- Immutable card data
- Properties: id, tier, cost, bonus, prestige points

#### Noble (`Noble.ts`)

- Noble tile data
- Methods: `meetsRequirements(bonuses)` → boolean

#### TokenBank (`TokenBank.ts`)

- Manages gem token inventory
- Validates token transactions

#### CardDeck (`CardDeck.ts`)

- Manages tier-specific card decks
- Handles: shuffling, drawing, visible cards

#### Commands (`server/src/domain/commands/`)

**Pattern**: Command Pattern for game actions

**Base Class**: `GameCommand`

```typescript
abstract class GameCommand {
  abstract run(game: Game): void;
  protected validateGameInProgress(game: Game): void;
  protected validatePlayerTurn(game: Game, playerId: string): void;
}
```

**Implementations**:

- `TakeTokensCommand` - Validates and executes token taking
- `PurchaseCardCommand` - Validates and executes card purchase from board
- `ReserveCardCommand` - Validates and executes card reservation
- `PurchaseReservedCardCommand` - Validates and executes reserved card purchase

**Benefits**:

- Encapsulates game actions
- Centralizes validation logic
- Enables easy testing and undo/redo (if needed)
- Maintains game invariants

---

### 5. Infrastructure Layer (`server/src/infrastructure/`)

**Responsibility**: External integrations and technical implementations

**Key Components**:

#### DatabaseConnection (`database.ts`)

- Singleton pattern for SQLite connection
- Manages: users, notifications, preferences, statistics
- Initializes database schema on startup

#### EmailProvider (`emailProvider.ts`)

- Sends email notifications
- Currently file-based logging (can be replaced with real SMTP)
- Methods: `sendEmail()`, `sendWelcomeEmail()`, `sendGameInviteEmail()`

#### HashingService (`hashingService.ts`)

- Password hashing and verification
- Uses bcrypt for secure password storage

**Pattern**: Infrastructure components are injected into services as dependencies

---

## Communication Patterns

### REST API

- **Purpose**: CRUD operations, game actions
- **Endpoints**: `/api/games`, `/api/users`, `/api/lobbies`, `/api/notifications`
- **Format**: JSON request/response

### WebSockets (Socket.IO)

- **Purpose**: Real-time game updates and synchronization
- **Implementation**: `server/src/sockets/gameSocket.ts`
- **Events**:
  - `join-game` - Player joins a game room
  - `leave-game` - Player leaves a game room
  - `game-action` - Player performs an action (take tokens, purchase card, etc.)
  - `game-state` - Broadcast updated game state to all players
  - `player-joined` / `player-left` - Notify room of player changes
  - `error` - Send error messages to specific client

### Event Broadcasting

- Socket.IO rooms for multi-player synchronization
- Each game has its own room (identified by `gameId`)
- State changes broadcast to all players in the room

---

## Data Flow Example: Purchasing a Card

```
1. Client clicks "Purchase Card"
   ↓
2. Client calls gameService.purchaseCard(gameId, playerId, cardId, payment)
   ↓
3. HTTP POST /api/games/:gameId/actions/purchase-card
   ↓
4. GameController.purchaseCard() receives request
   ↓
5. GameController calls GameService.purchaseCard()
   ↓
6. GameService creates PurchaseCardCommand
   ↓
7. Command.run(game) executes:
   - Validates game state
   - Validates player turn
   - Validates card affordability
   - Updates player tokens and cards
   - Returns tokens to bank
   - Checks for noble visits
   - Checks win condition
   - Advances turn
   ↓
8. GameService notifies next player (via NotificationService)
   ↓
9. GameService maps Game → GameStateDTO
   ↓
10. Controller returns GameStateDTO as JSON
    ↓
11. Socket broadcasts 'game-state' to all players in room
    ↓
12. All clients receive updated game state and re-render
```

---

## Key Design Patterns

### 1. Domain-Driven Design (DDD)

- Rich domain model with behavior
- Entities and value objects
- Aggregate roots (Game)
- Repository pattern (in-memory, can be swapped)

### 2. Command Pattern

- Encapsulates game actions
- Centralizes validation
- Maintains single responsibility

### 3. Singleton Pattern

- DatabaseConnection (single DB connection)

### 4. Dependency Injection

- Services receive dependencies via constructor
- Enables testing and flexibility

### 5. DTO Pattern

- Separates domain models from API contracts
- Prevents exposing internal structure

### 6. Mapper Pattern

- DomainToDTOMapper converts entities to DTOs
- One-way mapping (domain → DTO only)

---

## Adding New Features

### Adding a New Game Action

1. **Create Command** in `server/src/domain/commands/`:

   ```typescript
   export class YourActionCommand extends GameCommand {
     constructor(private playerId: string /* params */) {
       super();
     }

     run(game: Game): void {
       this.validateGameInProgress(game);
       this.validatePlayerTurn(game, this.playerId);
       // Your logic here
     }
   }
   ```

2. **Add Service Method** in `GameService`:

   ```typescript
   async yourAction(gameId: string, playerId: string, params: any) {
     const game = this.getGameDomain(gameId);
     const command = new YourActionCommand(playerId, params);
     command.run(game);
     return DomainToDTOMapper.mapGame(game);
   }
   ```

3. **Add Controller Method** in `GameController`:

   ```typescript
   yourAction = async (req: Request, res: Response) => {
     const { gameId } = req.params;
     const { playerId, params } = req.body;
     const game = await this.gameService.yourAction(gameId, playerId, params);
     res.json(game);
   };
   ```

4. **Add Route** in `gameRoutes.ts`:

   ```typescript
   router.post("/:gameId/actions/your-action", gameController.yourAction);
   ```

5. **Add Socket Handler** (optional) in `gameSocket.ts`:
   ```typescript
   case 'your-action':
     updatedGame = await this.gameService.yourAction(gameId, payload.playerId, payload.params);
     break;
   ```

### Adding External Integration (e.g., OpenAI)

1. **Create Provider** in `server/src/infrastructure/`:

   ```typescript
   export class OpenAIProvider {
     // Integration logic
   }
   ```

2. **Create Service** in `server/src/services/`:

   ```typescript
   export class AIService {
     constructor(private gameService: GameService) {}
     // Business logic using OpenAIProvider
   }
   ```

3. **Add Controller & Routes** following standard pattern

4. **Keep Domain Pure**: Never import infrastructure in domain layer

---

## Testing Strategy

### Unit Tests

- Domain entities and commands (pure logic)
- Services (mock dependencies)
- Utilities and mappers

### Integration Tests

- API endpoints (controllers + services)
- Database operations
- Socket communication

### E2E Tests

- Full game flows using Playwright
- Located in `tests/`

### Mutation Testing

- Stryker configuration in `stryker.conf.json`
- Run with `npm run mutate`

---

## File Organization

```
server/src/
├── index.ts                    # Application entry point
├── api/
│   ├── dtos.ts                # Data Transfer Objects
│   ├── mappers.ts             # Domain ↔ DTO conversions
│   └── index.ts               # API exports
├── controllers/               # HTTP request handlers
│   ├── gameController.ts
│   ├── userController.ts
│   ├── lobbyController.ts
│   └── notificationController.ts
├── services/                  # Application logic
│   ├── gameService.ts
│   ├── userService.ts
│   ├── lobbyService.ts
│   └── notificationService.ts
├── domain/                    # Business logic
│   ├── Game.ts               # Aggregate root
│   ├── Player.ts
│   ├── Card.ts
│   ├── Noble.ts
│   ├── TokenBank.ts
│   ├── CardDeck.ts
│   ├── GameFactory.ts        # Factory for creating domain objects
│   ├── types.ts              # Domain types/enums
│   └── commands/             # Command pattern
│       ├── GameCommand.ts    # Abstract base
│       ├── TakeTokensCommand.ts
│       ├── PurchaseCardCommand.ts
│       ├── ReserveCardCommand.ts
│       └── PurchaseReservedCardCommand.ts
├── infrastructure/           # External integrations
│   ├── database.ts
│   ├── emailProvider.ts
│   └── hashingService.ts
├── routes/                   # Express routes
│   ├── gameRoutes.ts
│   ├── userRoutes.ts
│   ├── lobbyRoutes.ts
│   └── notificationRoutes.ts
├── sockets/                  # WebSocket handlers
│   └── gameSocket.ts
└── data/                     # Game data
    ├── cards.ts              # Card definitions
    └── nobles.ts             # Noble definitions
```

---

## Technology Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Real-time**: Socket.IO
- **Database**: SQLite (via better-sqlite3)
- **Authentication**: bcrypt for password hashing

### Frontend

- **Framework**: React
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI)
- **State Management**: React Context + Hooks
- **Real-time**: Socket.IO Client
- **Build Tool**: Vite

### Development

- **Testing**: Vitest, Playwright
- **Mutation Testing**: Stryker
- **Package Manager**: npm
- **Dev Container**: Docker-based development environment

---

## Environment Variables

```bash
# Server (.env)
PORT=3001
CLIENT_URL=http://localhost:3000
NODE_ENV=development
DATABASE_PATH=./data/splendor.db

# Optional for future integrations
OPENAI_API_KEY=your_key_here
SMTP_HOST=smtp.example.com
SMTP_PORT=587
```

---

## Best Practices

1. **Keep Domain Pure**: No external dependencies in domain layer
2. **Use Commands**: All game actions should use the command pattern
3. **Validate Early**: Validate in commands before mutating state
4. **Map at Boundaries**: Always use DTOs for API responses
5. **Service Orchestration**: Services coordinate, domain entities execute
6. **Immutability**: Prefer immutable data where possible
7. **Type Safety**: Leverage TypeScript's type system
8. **Error Handling**: Use try-catch in controllers, throw descriptive errors in domain
9. **Logging**: Use structured logging for debugging and monitoring
10. **Testing**: Write tests for domain logic first, then services

---

## Future Enhancements

- **AI Integration**: Add OpenAI for AI opponents (infrastructure ready)
- **Persistence**: Replace in-memory game storage with database
- **Authentication**: JWT tokens for stateless auth
- **Real-time Presence**: Show online/offline status
- **Game Replay**: Store and replay game history
- **Tournament Mode**: Organize multi-game tournaments
- **Achievements**: Track and reward player accomplishments

---

## Resources

- [Splendor Rules](https://www.spacecowboys.fr/splendor)
- [Express.js Documentation](https://expressjs.com/)
- [Socket.IO Documentation](https://socket.io/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
