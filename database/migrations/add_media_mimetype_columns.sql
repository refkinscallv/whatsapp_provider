ALTER TABLE message_queue ADD COLUMN media_mimetype VARCHAR(100) NULL COMMENT 'MIME type of media file' AFTER media_url;

ALTER TABLE scheduled_messages ADD COLUMN media_mimetype VARCHAR(100) NULL COMMENT 'MIME type of media file' AFTER media_url;

ALTER TABLE campaigns ADD COLUMN media_mimetype VARCHAR(100) NULL COMMENT 'MIME type of media file' AFTER media_url;
