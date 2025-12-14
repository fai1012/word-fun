# Database Schema

## `users` (Collection)
Stores the main account information authenticated via Google.

**Document ID**: `userId` (from Auth provider)

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | User ID |
| `email` | `string` | Account email |
| `name` | `string` | Account name |
| `createdAt` | `Timestamp` | Account creation date |
| `lastLoginAt` | `Timestamp` | Last sync date |

## `profiles` (Sub-collection)
Path: `users/{userId}/profiles/{profileId}`
Stores individual player profiles associated with an account.

**Document ID**: `profileId` (Auto-generated UUID)

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Profile ID |
| `userId` | `string` | Reference to parent User ID |
| `displayName` | `string` | Player's chosen name |
| `avatarId` | `string` | ID/URL of the chosen avatar |
| `createdAt` | `Timestamp` | Profile creation date |
| `stats` | `object` | (Optional) Game stats for this profile |

## `words` (Sub-collection)
Path: `users/{userId}/profiles/{profileId}/words/{wordId}`
Stores individual flashcards for a specific profile.

**Document ID**: `wordId` (Auto-generated UUID)

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Word ID |
| `text` | `string` | The word itself |
| `revisedCount` | `number` | Number of times revised |
| `correctCount` | `number` | Number of times answered correctly |
| `examples` | `string[]` | List of example sentences |
| `createdAt` | `Timestamp` | Creation date |

## `games` (Collection)
Future use: Game sessions, linking to `profileId`.
