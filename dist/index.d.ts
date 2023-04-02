/// <reference path="types.d.ts" />
export type { AxiosInstance } from 'axios';
import { AxiosInstance, Method } from 'axios';
export declare class TelegramBot {
    token: string;
    polingDelay: number;
    private _event;
    private _directReply;
    private _updateOffset;
    private _pollingTimer;
    private _hasErrorCatcher;
    constructor(token: string);
    get httpClient(): AxiosInstance;
    on(updateType: UpdateType, callback: (context: UpdateContext) => void): Promise<any>;
    start(callback: (context: UpdateContext) => void): Promise<any>;
    command(commandStr: string, callback: (context: UpdateContext) => void): Promise<any>;
    action(callbackData: string | RegExp, callback: (context: UpdateContext) => void): Promise<any>;
    catch(callback: (error: Error) => void): Promise<any>;
    getDirectReply(): WebhookReply | null;
    getUpdates(options?: GetUpdatesOptions): Promise<Update[] | null>;
    startPolling(options?: GetUpdatesOptions): Promise<void>;
    stopPolling(): void;
    handleUpdate(update: Update): Promise<WebhookReply | void>;
    deleteMessage(chatId: number | string, messageId: number): Promise<boolean>;
    editMessageText(chatId: number | string, messageId: number, text: string, options?: {
        parse_mode?: ParseMode;
        disable_web_page_preview?: boolean;
        entities?: MessageEntity[];
        reply_markup?: any;
    }): Promise<Message | null>;
    editMessageCaption(chatId: number | string, messageId: number, caption: string, options?: {
        parse_mode: ParseMode;
        caption_entities: MessageEntity[];
        reply_markup: any;
    }): Promise<Message | null>;
    sendMessage(chatId: number | string, message: MessageData, options?: SendOptions, type?: MessageType): Promise<Message | null>;
    sendText(chatId: number | string, text: string, options?: SendOptions): Promise<Message | null>;
    sendSticker(chatId: number | string, sticker: MessageData, options?: SendOptions): Promise<Message | null>;
    sendPhoto(chatId: number | string, photo: MessageData, options?: SendOptions): Promise<Message | null>;
    sendVideo(chatId: number | string, video: MessageData, options?: SendOptions): Promise<Message | null>;
    sendAudio(chatId: number | string, audio: MessageData, options?: SendOptions): Promise<Message | null>;
    sendDocument(chatId: number | string, document: MessageData, options?: SendOptions): Promise<Message | null>;
    setWebhook(url: string | AnyObject): Promise<boolean>;
    getWebhookInfo(): Promise<AnyObject>;
    deleteWebhook(dropPending?: boolean): Promise<boolean>;
    httpRequest(botMethod: string, data?: AnyObject | null, reqMethod?: Method, otherConfig?: AnyObject): Promise<RequestResponse>;
    handleError(error: any, returnValue?: any): any;
}
