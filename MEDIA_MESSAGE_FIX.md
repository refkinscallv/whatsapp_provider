# Media Message Sending Error Fix

## Problem

The application was experiencing a `TypeError: Cannot read properties of undefined (reading 'startsWith')` when sending media messages through the Baileys provider. The error stack trace showed:

```
at BaileysProvider.sendMedia (baileys.provider.js:195:28)
at WhatsAppActions.safeSendMessage (whatsappActions.service.js:194:41)
at async WhatsAppActions.sendMediaMessage (whatsappActions.service.js:123:30)
at async WhatsAppService.sendMediaMessage (whatsapp.service.js:126:16)
at async MessageQueueService.processQueue (messageQueue.service.js:204:36)
```

## Root Cause

The error occurred because `media.mimetype` was `undefined` when the `sendMedia` method tried to call `.startsWith()` on it at line 195 in [baileys.provider.js](file:///c:/APP/KW/whatsapp/whatsapp_provider/app/providers/baileys.provider.js).

The message queue was constructing media objects with only `url`, `user_token`, and `metadata` fields, but was missing the critical `mimetype` field needed by the provider to determine how to send the media (image, video, audio, or document).

## Solution Implemented

### 1. Provider-Level Fix

**File**: [baileys.provider.js](file:///c:/APP/KW/whatsapp/whatsapp_provider/app/providers/baileys.provider.js#L195-L230)

Added defensive validation in the `sendMedia` method to handle missing mimetype:

- Checks if `media.mimetype` exists
- If missing, infers mimetype from file extension using a comprehensive mime type map
- Falls back to `'application/octet-stream'` if extension is unknown
- Logs a warning when mimetype had to be inferred

This ensures the method never crashes even if mimetype is missing, while logging the issue for debugging.

### 2. Database Schema Updates

Added `media_mimetype VARCHAR(100)` column to three tables:

**Models Updated**:
- [messageQueue.model.js](file:///c:/APP/KW/whatsapp/whatsapp_provider/app/models/messageQueue.model.js#L56-L61)
- [scheduledMessage.model.js](file:///c:/APP/KW/whatsapp/whatsapp_provider/app/models/scheduledMessage.model.js#L56-L61)
- [campaign.model.js](file:///c:/APP/KW/whatsapp/whatsapp_provider/app/models/campaign.model.js#L55-L60)

**Migration Script**: [add_media_mimetype_columns.sql](file:///c:/APP/KW/whatsapp/whatsapp_provider/database/migrations/add_media_mimetype_columns.sql)

### 3. Service Layer Updates

**Message Queue Service** - [messageQueue.service.js](file:///c:/APP/KW/whatsapp/whatsapp_provider/app/services/messageQueue.service.js)

- Updated `addToQueue` to accept `media_mimetype` parameter
- Modified queue processing in both `processQueue` and `processMessageItem` to pass mimetype when sending media
- Updated scheduled message processing to include mimetype

**Campaign Service** - [campaign.service.js](file:///c:/APP/KW/whatsapp/whatsapp_provider/app/services/campaign.service.js)

- Updated `createCampaign` to accept `media_mimetype`
- Modified `processCampaign` to pass mimetype when adding messages to queue
- Updated scheduled campaign processing to include mimetype

**Message Controller** - [message.controller.js](file:///c:/APP/KW/whatsapp/whatsapp_provider/app/http/controllers/message.controller.js#L264-L304)

- Added mimetype detection logic in `sendMedia` endpoint
- Extracts mimetype from uploaded file if available
- Infers mimetype from URL extension as fallback
- Passes mimetype to both queue and immediate send operations

## Database Migration

To apply the schema changes, run the migration script:

```sql
ALTER TABLE message_queue ADD COLUMN media_mimetype VARCHAR(100) NULL COMMENT 'MIME type of media file' AFTER media_url;
ALTER TABLE scheduled_messages ADD COLUMN media_mimetype VARCHAR(100) NULL COMMENT 'MIME type of media file' AFTER media_url;
ALTER TABLE campaigns ADD COLUMN media_mimetype VARCHAR(100) NULL COMMENT 'MIME type of media file' AFTER media_url;
```

## Files Modified

1. `app/providers/baileys.provider.js` - Added mimetype validation and inference
2. `app/models/messageQueue.model.js` - Added media_mimetype field
3. `app/models/scheduledMessage.model.js` - Added media_mimetype field  
4. `app/models/campaign.model.js` - Added media_mimetype field
5. `app/services/messageQueue.service.js` - Updated to handle mimetype
6. `app/services/campaign.service.js` - Updated to handle mimetype
7. `app/http/controllers/message.controller.js` - Added mimetype detection
8. `database/migrations/add_media_mimetype_columns.sql` - Migration script

## Testing Required

- [ ] Run database migration
- [ ] Test media message sending from API with file upload
- [ ] Test media messages from queue processing
- [ ] Test media messages in campaigns
- [ ] Test media messages in scheduled messages
- [ ] Verify no errors in logs when sending media

## Verification Steps

1. **Run the migration**:
   ```powershell
   # Connect to your database and run the migration script
   ```

2. **Test immediate media send**:
   ```bash
   POST /api/messages/media
   {
     "device_token": "...",
     "to": "62xxx",
     "media_url": "https://example.com/image.jpg"
   }
   ```

3. **Test queued media send**:
   Same as above with `use_queue: true`

4. **Monitor logs**:
   Check for the warning message "Missing mimetype for media, inferred as: ..." to confirm the fallback is working

5. **Verify queue processing**:
   Ensure media messages in the queue are sent successfully without errors
