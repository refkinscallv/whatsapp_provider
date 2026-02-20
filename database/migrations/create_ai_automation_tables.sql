-- Create ai_sessions table
CREATE TABLE IF NOT EXISTS `ai_sessions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `token` VARCHAR(32) NOT NULL UNIQUE,
    `device_token` VARCHAR(32) NOT NULL,
    `user_token` VARCHAR(32) NOT NULL,
    `ai_model` ENUM('chatgpt') NOT NULL DEFAULT 'chatgpt' COMMENT 'AI provider model',
    `language` VARCHAR(10) NOT NULL DEFAULT 'id' COMMENT 'Response language (e.g. id, en)',
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT 'Auto-reply status',
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_ai_session_device` (`device_token`),
    INDEX `idx_ai_session_user` (`user_token`),
    INDEX `idx_ai_session_status` (`status`),
    CONSTRAINT `fk_ai_session_device` FOREIGN KEY (`device_token`) REFERENCES `devices` (`token`) ON DELETE CASCADE,
    CONSTRAINT `fk_ai_session_user` FOREIGN KEY (`user_token`) REFERENCES `users` (`token`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI automation sessions per device';

-- Create ai_knowledge table (hier archical structure)
CREATE TABLE IF NOT EXISTS `ai_knowledge` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
   `token` VARCHAR(32) NOT NULL UNIQUE,
    `ai_session_id` BIGINT UNSIGNED NOT NULL,
    `parent_token` VARCHAR(32) NULL COMMENT 'NULL for main node, parent token for child nodes',
    `name` VARCHAR(255) NOT NULL COMMENT 'Knowledge item name (e.g. main, item_1, item_2)',
    `content` TEXT NOT NULL COMMENT 'Knowledge content to inject in prompt',
    `order` INT NOT NULL DEFAULT 0 COMMENT 'Display order',
    `is_deletable` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 for main, 1 for child items',
    `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_ai_knowledge_session` (`ai_session_id`),
    INDEX `idx_ai_knowledge_parent` (`parent_token`),
    INDEX `idx_ai_knowledge_order` (`order`),
    CONSTRAINT `fk_ai_knowledge_session` FOREIGN KEY (`ai_session_id`) REFERENCES `ai_sessions` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ai_knowledge_parent` FOREIGN KEY (`parent_token`) REFERENCES `ai_knowledge` (`token`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hierarchical knowledge base for AI sessions';

-- Create ai_conversations table (history tracking)
CREATE TABLE IF NOT EXISTS `ai_conversations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `token` VARCHAR(32) NOT NULL UNIQUE,
    `ai_session_id` BIGINT UNSIGNED NOT NULL,
    `device_token` VARCHAR(32) NOT NULL,
    `chat_id` VARCHAR(255) NOT NULL COMMENT 'WhatsApp chat ID (contact or group)',
    `user_message` TEXT NOT NULL COMMENT 'Original message from user',
    `ai_response` TEXT NULL COMMENT 'AI generated response',
    `knowledge_snapshot` JSON NULL COMMENT 'Snapshot of knowledge used for this conversation',
    `ai_model_used` VARCHAR(20) NOT NULL COMMENT 'Model that generated response',
    `response_time_ms` INT NULL COMMENT 'AI response time in milliseconds',
    `status` ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    `error_message` TEXT NULL,
    `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_ai_conversation_session` (`ai_session_id`),
    INDEX `idx_ai_conversation_device` (`device_token`),
    INDEX `idx_ai_conversation_chat` (`chat_id`),
    INDEX `idx_ai_conversation_status` (`status`),
    INDEX `idx_ai_conversation_created` (`createdAt`),
    CONSTRAINT `fk_ai_conversation_session` FOREIGN KEY (`ai_session_id`) REFERENCES `ai_sessions` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ai_conversation_device` FOREIGN KEY (`device_token`) REFERENCES `devices` (`token`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI conversation history tracking';
