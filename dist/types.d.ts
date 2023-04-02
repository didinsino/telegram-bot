type AnyObject = Record<string, any>;
type TListener = (...args: any[]) => Promise<any>;
type UpdateType = 'update' | 'message' | 'text' | 'photo' | 'video' | 'document' | 'sticker' | 'callback_query' | 'command' | 'error';
type MessageType = 'text' | 'sticker' | 'photo' | 'video' | 'audio' | 'document';
type SendOptions = {
    chat_id?: number | string;
    text?: string;
    sticker?: MessageData;
    document?: MessageData;
    photo?: MessageData;
    video?: MessageData;
    audio?: MessageData;
    file_name?: string;
    duration?: number;
    width?: number;
    height?: number;
    thumbnail?: MessageData;
    caption?: string;
    parse_mode?: ParseMode;
    disable_content_type_detection?: boolean;
    disable_web_page_preview?: boolean;
    disable_notification?: boolean;
    protect_content?: boolean;
    reply_to_message_id?: number;
    allow_sending_without_reply?: boolean;
    buttons?: InlineKeyboardButton[];
    buttons_column?: number;
    keyboard?: {
        buttons?: KeyboardButton[];
        column?: number;
        persistent?: boolean;
        resize?: boolean;
        one_time?: boolean;
        remove?: boolean;
    };
    force_reply?: boolean;
    input_field_placeholder?: string;
    [key: string]: any;
};
type GetUpdatesOptions = {
    offset?: number;
    limit?: number;
    timeout?: number;
    allowed_updates?: string[];
};
type MessageData = any;
type ParseMode = 'HTML' | 'MarkdownV2';
type WebhookReply = {
    method?: string;
    chat_id?: number;
    text?: string;
    photo?: string;
    sticker?: string;
    document?: string;
    video?: string;
    audio?: string;
    message_id?: number;
    [key: string]: any;
};
interface User {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    [key: string]: any;
}
interface Chat {
    readonly id: number;
    readonly type: 'private' | 'group' | 'supergroup' | 'channel';
    readonly title?: string;
    readonly [key: string]: any;
}
interface MessageEntity {
    readonly type: 'mention' | 'hashtag' | 'cashtag' | 'bot_command' | 'url' | 'email' | 'phone_number' | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'spoiler' | 'code' | 'pre' | 'text_link' | 'text_mention' | 'custom_emoji';
    readonly offset: number;
    readonly length: number;
    readonly url?: string;
    readonly user?: User;
    readonly language?: string;
    readonly custom_emoji_id?: string;
}
interface PhotoSize {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
}
interface Document {
    readonly file_id: string;
    readonly file_unique_id: string;
    readonly thumbnail?: PhotoSize;
    readonly file_name?: string;
    readonly mime_type?: string;
    readonly file_size?: number;
}
interface Video {
    readonly file_id: string;
    readonly file_unique_id: string;
    readonly width: number;
    readonly height: number;
    readonly duration: number;
    readonly thumbnail?: PhotoSize;
    readonly file_name?: string;
    readonly mime_type?: string;
    readonly file_size?: number;
}
interface Sticker {
    readonly file_id: string;
    readonly file_unique_id: string;
    readonly type: 'regular' | 'mask' | 'custom_emoji';
    readonly width: number;
    readonly height: number;
    readonly is_animated: boolean;
    readonly is_video: boolean;
    readonly thumbnail?: PhotoSize;
    readonly thumb?: PhotoSize;
    readonly emoji?: string;
    readonly set_name?: string;
    readonly file_size?: number;
    readonly [key: string]: any;
}
interface Message {
    readonly message_id: number;
    readonly from: User;
    readonly sender_chat?: Chat;
    readonly date: number;
    readonly chat: Chat;
    readonly forward_from?: User;
    readonly reply_to_message?: Message;
    readonly text?: string;
    readonly entities?: MessageEntity;
    readonly document?: Document;
    readonly photo?: PhotoSize[];
    readonly sticker?: Sticker;
    readonly video: Video;
    readonly caption?: string;
    readonly has_media_spoiler?: boolean;
    readonly [key: string]: any;
}
interface KeyboardButton {
    text: string;
    request_contact?: boolean;
    request_location?: boolean;
    [key: string]: any;
}
interface InlineKeyboardButton {
    text: string;
    url?: string;
    callback_data?: string;
}
interface CallbackQuery {
    readonly id: string;
    readonly from: User;
    readonly message: Message;
    readonly inline_message_id?: string;
    readonly data?: string;
    readonly chat_instance?: string;
}
interface Update {
    update_id: number;
    message?: Message;
    edited_message?: Message;
    callback_query?: CallbackQuery;
    [key: string]: any;
}
interface RequestResponse extends AnyObject {
    ok: boolean;
    result: any;
    description?: string;
}
interface UpdateContext extends Update {
    reply(message: MessageData, options?: SendOptions, type?: MessageType): Promise<Message | null>;
    deleteMessage(messageId?: number): Promise<boolean>;
    directReply(text: string): void;
    directReply(options: WebhookReply): void;
}
