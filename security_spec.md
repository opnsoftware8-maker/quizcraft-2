# Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity Isolation**: Every user profile (`/users/{userId}`), persona (`/users/{userId}/personas/{personaId}`), study history item (`/users/{userId}/studyHistory/{itemId}`), chat session (`/users/{userId}/chats/{chatId}`), and message (`/users/{userId}/chats/{chatId}/messages/{messageId}`) is strictly owned by `request.auth.uid == userId` with `request.auth.token.email_verified == true`.
2. **PII Protection**: Email addresses stored in `/users/{userId}` are readable only by the owner (`get` only; `list` on `/users` is strictly denied).
3. **Referential Integrity (Master Gate)**: A message cannot be created or updated unless its parent chat (`/users/{userId}/chats/{chatId}`) exists (or is created atomically in the same batch via `existsAfter`). A chat, persona, or study history item cannot be created unless the parent user profile exists.
4. **Immutable Ownership & Timestamps**: `uid`, `userId`, `chatId`, `id`, and `createdAt` can never be changed after creation. All `createdAt`/`updatedAt` timestamps must match `request.time`.
5. **Strict Field Allowlisting & Size Bounds**: Every document write validates exact keys (`hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update), valid ID regex (`^[a-zA-Z0-9_-]+$`), explicit string length limits (`name` <= 60, `description` <= 600, `profileImage` <= 60000, `studyHistory.title` <= 200, `studyHistory.content` <= 50000), and strict enum (`summary` | `quiz`) and image data URL validation.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. **Unauthenticated Profile Write**: `{ uid: "userA", ... }` with `request.auth == null`.
2. **Unverified Email Write**: Google/auth token where `email_verified == false` attempting to create `/users/userA`.
3. **Cross-User Profile/Persona/History Read/Write**: `userB` attempting `get`, `list`, or `set` on `/users/userA`, `/users/userA/personas`, or `/users/userA/studyHistory`.
4. **Users Collection Scraping (`list`)**: Any signed-in user attempting `list` on `/users`.
5. **Shadow Field Injection**: Creating `/users/userA`, `/users/userA/personas/p1`, or `/users/userA/studyHistory/h1` with extra ghost field `{ isAdmin: true }`.
6. **ID Poisoning**: Creating `/users/userA/studyHistory/bad$id` with characters outside `^[a-zA-Z0-9_-]+$` or length > 128.
7. **Owner Spoofing**: `userA` creating `/users/userA/studyHistory/h1` with `userId: "userB"`.
8. **Client-Spoofed Timestamp**: Creating `/users/userA/studyHistory/h1` with `createdAt` set to a past timestamp instead of `request.time`.
9. **Orphaned Message Creation**: `userA` creating a message under a non-existent `chatId` without creating the chat.
10. **Oversized Content (Denial of Wallet)**: Creating a studyHistory item or message with `content.size() > 50000` or `profileImage.size() > 60000`.
11. **Immutable Field Mutation on Update**: Attempting to mutate a studyHistory snapshot (`allow update: if false;`) or persona `id`/`userId`/`createdAt`.
12. **Invalid Enum / Image Data URL Injection**: Creating studyHistory with `type: "other"` instead of `"summary"` / `"quiz"`, or injecting invalid `profileImage`.
