# Database Schema (ERD)

## Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ UserDevice : "owns/shares"
    User ||--o{ Device : "via UserDevice"
    User ||--o{ Campaign : "creates"
    User ||--o{ ScheduledMessage : "creates"
    User ||--o{ ApiKey : "generates"
    User ||--o{ UserSubscription : "has"
    User ||--|| Package : "subscribed_to"
    
    Device ||--o{ UserDevice : "shared_with"
    Device ||--o{ MessageHistory : "sends"
    Device ||--o{ MessageQueue : "queues"
    Device ||--o{ Contact : "syncs"
    Device ||--o{ AutoReplyRule : "has"
    Device ||--o{ MessageTemplate : "creates"
    Device ||--o{ Webhook : "configures"
    Device ||--o{ Campaign : "broadcasts"
    Device ||--o{ ScheduledMessage : "schedules"
    
    Campaign ||--o{ ScheduledMessage : "generates"
    Campaign ||--o{ MessageQueue : "queued_via"
    
    ContactBook ||--o{ Contact : "contains"
    ContactBook ||--|| User : "owned_by"
    
    MessageQueue ||--|| ScheduledMessage : "created_from"
    MessageQueue ||--|| Campaign : "part_of"
    
    UserSubscription ||--o{ UserSubscriptionUsage : "tracks"
    
    User {
        bigint id PK
        string token UK
        string name
        string email UK
        string password
        enum role
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    
    Device {
        bigint id PK
        string token UK
        enum status
        string name
        boolean is_auth
        string provider
        text qr
        json data
        datetime authenticated_at
        datetime created_at
    }
    
    UserDevice {
        bigint id PK
        string user_token FK
        string device_token FK
        enum role
        datetime created_at
    }
    
    MessageHistory {
        bigint id PK
        string device_token FK
        string to
        text message
        enum type
        string media_url
        enum status
        json response
        datetime sent_at
    }
    
    MessageQueue {
        bigint id PK
        string device_token FK
        string user_token FK
        string to
        text message
        enum type
        string media_url
        string media_mimetype
        enum status
        enum priority
        int retry_count
        datetime scheduled_at
        json metadata
    }
    
    Contact {
        bigint id PK
        string device_token FK
        string phone UK
        string name
        boolean is_business
        int book_id FK
        datetime last_synced
    }
    
    ContactBook {
        bigint id PK
        string user_token FK
        string name
        json contacts
        datetime created_at
    }
    
    MessageTemplate {
        bigint id PK
        string token UK
        string device_token FK
        string user_token FK
        string name
        text content
        json variables
        datetime created_at
    }
    
    AutoReplyRule {
        bigint id PK
        string token UK
        string device_token FK
        string user_token FK
        string keyword
        enum match_type
        text reply
        boolean is_active
        int trigger_count
        datetime last_triggered
    }
    
    Campaign {
        bigint id PK
        string token UK
        string device_token FK
        string user_token FK
        string name
        text message
        enum type
        string media_url
        string media_mimetype
        json target_audience
        enum status
        int total_recipients
        int sent_count
        int failed_count
        datetime scheduled_at
        json settings
    }
    
    ScheduledMessage {
        bigint id PK
        string token UK
        string device_token FK
        string user_token FK
        string campaign_token FK
        string to
        text message
        enum type
        string media_url
        string media_mimetype
        datetime scheduled_at
        enum status
        boolean is_recurring
        enum recurrence_type
        datetime recurrence_end
        int recurrence_count
        json metadata
    }
    
    Webhook {
        bigint id PK
        string token UK
        string device_token FK
        string user_token FK
        string url
        json events
        boolean is_active
        datetime created_at
    }
    
    ApiKey {
        bigint id PK
        string token UK
        string user_token FK
        string key UK
        string name
        boolean is_active
        datetime last_used
        datetime created_at
    }
    
    Package {
        bigint id PK
        string name
        decimal price
        int devices_limit
        int messages_limit
        int api_keys_limit
        json features
        boolean is_active
    }
    
    UserSubscription {
        bigint id PK
        string user_token FK
        int package_id FK
        enum status
        datetime start_date
        datetime end_date
        datetime created_at
    }
    
    UserSubscriptionUsage {
        bigint id PK
        string user_token FK
        int subscription_id FK
        enum resource_type
        int used_count
        date usage_date
    }
    
    Setting {
        bigint id PK
        string key UK
        text value
        string description
        datetime updated_at
    }
    
    UserEmailVerification {
        bigint id PK
        string user_token FK
        string verification_token UK
        datetime expires_at
        boolean is_verified
    }
    
    UserResetPassword {
        bigint id PK
        string user_token FK
        string reset_token UK
        datetime expires_at
        boolean is_used
    }
    
    NumberCheckResult {
        bigint id PK
        string device_token FK
        string user_token FK
        string phone
        boolean is_registered
        datetime checked_at
    }
```

## Table Descriptions

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **User** | User accounts | email, role, is_active |
| **Device** | WhatsApp devices | token, status, provider |
| **UserDevice** | Device sharing | user-device many-to-many |
| **MessageHistory** | Sent messages log | device, to, status, sent_at |
| **MessageQueue** | Pending messages | priority, scheduled_at, retry_count |
| **Contact** | Synced WhatsApp contacts | phone, name, is_business |
| **ContactBook** | User-created contact groups | name, contacts (JSON) |
| **MessageTemplate** | Reusable message templates | name, content, variables |
| **AutoReplyRule** | Auto-reply automation | keyword, match_type, reply |
| **Campaign** | Broadcast campaigns | target_audience, sent/failed counts |
| **ScheduledMessage** | Scheduled/recurring messages | scheduled_at, recurrence_type |
| **Webhook** | Webhook integrations | url, events, is_active |
| **ApiKey** | API authentication | key, last_used |
| **Package** | Subscription plans | limits, price, features |
| **UserSubscription** | User subscriptions | package, start/end dates |
| **UserSubscriptionUsage** | Daily usage tracking | resource_type, used_count |
| **Setting** | System settings | key-value config |
| **UserEmailVerification** | Email verification tokens | verification_token, expires_at |
| **UserResetPassword** | Password reset tokens | reset_token, expires_at |
| **NumberCheckResult** | WA number check history | phone, is_registered |

## Indexes & Performance

**Key Indexes**:
- `devices.token` (UNIQUE)
- `devices.status, is_deleted, is_logged_out` (Composite)
- `message_queue.status, scheduled_at` (Queue processing)
- `message_queue.device_token, status` (Device queue)
- `message_history.device_token, sent_at` (History queries)
- `contacts.device_token, phone` (Contact lookup)
- `campaigns.status, scheduled_at` (Campaign processing)
- `scheduled_messages.status, scheduled_at` (Schedule processing)
- `user_subscription_usage.user_token, usage_date` (Quota tracking)

## Data Types Summary

**Enums Used**:
- `User.role`: USER, SUPER_ADMIN
- `Device.status`: prepare, initializing, qr, ready, authenticated, disconnected, etc.
- `Device.provider`: wwebjs, baileys
- `MessageQueue.status`: queued, processing, completed, failed, cancelled
- `MessageQueue.priority`: free, normal, premium, high
- `MessageQueue.type`: text, image, video, audio, document
- `Campaign.status`: draft, scheduled, running, completed, paused, cancelled
- `ScheduledMessage.recurrence_type`: hourly, daily, weekly, monthly, yearly
- `AutoReplyRule.match_type`: exact, contains

**JSON Fields**:
- `Device.data` - Provider-specific metadata
- `Campaign.target_audience` - Array of phone numbers
- `Campaign.settings` - min_delay, max_delay
- `MessageQueue.metadata` - campaign_token, scheduled_msg_token, delays
- `ScheduledMessage.metadata` - Custom data per schedule
- `ContactBook.contacts` - Array of contact objects
- `Webhook.events` - Subscribed event types
