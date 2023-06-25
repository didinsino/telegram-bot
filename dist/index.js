"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramBot = void 0;
const axios_1 = __importDefault(require("axios"));
const promise_events_1 = __importDefault(require("promise-events"));
const chunk_1 = __importDefault(require("lodash/chunk"));
const states = {
    httpClient: null,
    FormData: null,
    fs: null,
    path: null,
    hasSigintListener: false,
};
class TelegramBot {
    constructor(token) {
        this.polingDelay = 200;
        this._directReply = null;
        this._updateOffset = 0;
        this._pollingTimer = null;
        this._hasErrorCatcher = false;
        this._requestTimeout = 30000;
        this.token = token;
        this._event = new promise_events_1.default();
    }
    get httpClient() {
        if (states.httpClient == null) {
            states.httpClient = axios_1.default.create({
                baseURL: `https://api.telegram.org/bot${this.token}`,
                responseType: 'json',
            });
        }
        return states.httpClient;
    }
    set requestTimeout(timeoutValue) {
        this._requestTimeout = timeoutValue;
    }
    on(updateType, callback) {
        return this._event.on(updateType, callback);
    }
    start(callback) {
        return this.on('command', ctx => {
            const curCommand = ctx.message.text.split(' ', 1)[0].slice(1);
            if (curCommand.toLowerCase() === 'start') {
                callback(ctx);
            }
        });
    }
    command(commandStr, callback) {
        return this.on('command', ctx => {
            const curCommand = ctx.message.text.split(' ', 1)[0].slice(1);
            if (curCommand.toLowerCase() === commandStr.toLowerCase()) {
                callback(ctx);
            }
        });
    }
    action(callbackData, callback) {
        return this.on('callback_query', ctx => {
            if (typeof callbackData === 'string') {
                if (ctx.callback_query.data === callbackData)
                    callback(ctx);
            }
            else {
                ctx.match = ctx.callback_query.data.match(callbackData);
                if (ctx.match != null)
                    callback(ctx);
            }
        });
    }
    catch(callback) {
        this._hasErrorCatcher = true;
        return this._event.on('error', callback);
    }
    getDirectReply() {
        return this._directReply;
    }
    async getUpdates(options) {
        try {
            if (!options?.offset) {
                options = options ?? {};
                options.offset = this._updateOffset;
            }
            const resp = await this.httpRequest('getUpdates', options);
            return resp.result;
        }
        catch (error) {
            return this.handleError(error, null);
        }
    }
    async startPolling(options) {
        try {
            if (!states.hasSigintListener) {
                process.on('SIGINT', () => {
                    this.stopPolling();
                    process.exit();
                });
                states.hasSigintListener = true;
            }
            const updates = await this.getUpdates(options);
            if (Array.isArray(updates)) {
                await Promise.all(updates.map(update => this.handleUpdate(update)));
            }
        }
        catch (error) {
            this.handleError(error);
        }
        finally {
            if (this._pollingTimer && typeof this._pollingTimer.refresh === 'function') {
                this._pollingTimer.refresh();
            }
            else {
                this._pollingTimer = setTimeout(() => this.startPolling(options), this.polingDelay);
            }
        }
    }
    stopPolling() {
        clearTimeout(this._pollingTimer);
    }
    async handleUpdate(update) {
        try {
            const thisClass = this;
            const context = {
                ...update,
                reply: (message, options, type = 'text') => {
                    const chatId = update.message?.chat.id ?? update.callback_query?.message.chat.id;
                    return thisClass.sendMessage(chatId, message, options, type);
                },
                directReply: (options) => {
                    const chatId = update.message?.chat.id ?? update.callback_query?.message.chat.id;
                    this._directReply = typeof options === 'string' ? { text: options } : options;
                    this._directReply.chat_id = chatId;
                    if (!this._directReply.method) {
                        this._directReply.method = 'sendMessage';
                    }
                },
                async deleteMessage(messageId) {
                    if (!messageId) {
                        messageId = update.message?.message_id ?? update.callback_query?.message.message_id;
                    }
                    const chatId = update.message?.chat.id ?? update.callback_query?.message.chat.id;
                    if (chatId && messageId) {
                        return thisClass.deleteMessage(chatId, messageId);
                    }
                    return false;
                },
            };
            this._directReply = null;
            this._updateOffset = update.update_id + 1;
            await this._event.emit('update', context);
            if (update.message) {
                if ((update.message.text || '').startsWith('/')) {
                    await this._event.emit('command', context);
                }
                else {
                    await this._event.emit('message', context);
                    if (update.message.text) {
                        await this._event.emit('text', context);
                    }
                    else if (update.message.photo) {
                        await this._event.emit('photo', context);
                    }
                    else if (update.message.document) {
                        await this._event.emit('document', context);
                    }
                    else if (update.message.sticker) {
                        await this._event.emit('sticker', context);
                    }
                }
            }
            else if (update.callback_query) {
                await this._event.emit('callback_query', context);
            }
        }
        catch (error) {
            this.handleError(error);
        }
    }
    async deleteMessage(chatId, messageId) {
        try {
            const resp = await this.httpRequest('deleteMessage', { message_id: messageId, chat_id: chatId });
            return resp.result;
        }
        catch (error) {
            return this.handleError(error, false);
        }
    }
    async editMessageText(chatId, messageId, text, options) {
        try {
            const resp = await this.httpRequest('editMessageText', {
                ...(options || {}),
                message_id: messageId,
                chat_id: chatId,
                text,
            });
            return resp.result;
        }
        catch (error) {
            return this.handleError(error, null);
        }
    }
    async editMessageCaption(chatId, messageId, caption, options) {
        try {
            const resp = await this.httpRequest('editMessageCaption', {
                ...(options || {}),
                message_id: messageId,
                chat_id: chatId,
                caption,
            });
            return resp.result;
        }
        catch (error) {
            return this.handleError(error, null);
        }
    }
    async sendMessage(chatId, message, options, type = 'text') {
        try {
            if (options?.buttons ||
                options?.force_reply ||
                options?.keyboard ||
                options?.remove_keyboard ||
                options?.input_field_placeholder) {
                options.reply_markup = !options.reply_markup ? {} : options.reply_markup;
                if (options?.buttons) {
                    const colCount = options.buttons_column || 1;
                    options.reply_markup.inline_keyboard = (0, chunk_1.default)(options.buttons, colCount);
                    delete options.buttons;
                    delete options.buttons_column;
                }
                if (options?.keyboard) {
                    const colCount = options.keyboard.column || 1;
                    if (options.keyboard.buttons?.length) {
                        options.reply_markup.keyboard = (0, chunk_1.default)(options.keyboard.buttons, colCount);
                        options.reply_markup.is_persistent = options.keyboard.persistent || false;
                        options.reply_markup.resize_keyboard = options.keyboard.resize || false;
                        options.reply_markup.one_time_keyboard = options.keyboard.one_time || false;
                    }
                    else {
                        options.reply_markup.remove_keyboard = true;
                    }
                    delete options.keyboard;
                }
                if (options?.remove_keyboard) {
                    options.reply_markup.remove_keyboard = true;
                    delete options.remove_keyboard;
                }
                if (options?.force_reply) {
                    options.reply_markup.force_reply = options.force_reply;
                    delete options.force_reply;
                }
                if (options?.input_placeholder) {
                    options.reply_markup.input_field_placeholder = options.input_placeholder;
                    delete options.input_placeholder;
                }
            }
            if (type === 'text') {
                const resp = await this.httpRequest('sendMessage', {
                    ...(options || {}),
                    chat_id: chatId,
                    text: message,
                });
                return resp.result;
            }
            if (states.FormData == null) {
                states.FormData = require('form-data');
            }
            const formData = new states.FormData();
            const methodName = `send${type.charAt(0).toUpperCase() + type.slice(1)}`;
            for (const key in options || {}) {
                if (key === 'chat_id' || key === type)
                    continue;
                if (key === 'reply_markup') {
                    formData.append(key, JSON.stringify(options?.[key]));
                    continue;
                }
                formData.append(key, options?.[key]);
            }
            formData.append('chat_id', chatId);
            if (typeof message === 'string') {
                if ((message.includes('/') || message.includes('\\')) &&
                    !message.startsWith('https://') &&
                    !message.startsWith('http://')) {
                    if (states.fs == null) {
                        states.fs = require('fs');
                    }
                    if (states.path == null) {
                        states.path = require('path');
                    }
                    const fileName = options?.file_name || states.path.basename(message);
                    message = states.fs.createReadStream(message);
                    formData.append(type, message, fileName);
                }
                else {
                    formData.append(type, message);
                }
            }
            else {
                formData.append(type, message, options?.file_name || type);
            }
            const resp = await this.httpRequest(methodName, formData);
            return resp.result;
        }
        catch (error) {
            return this.handleError(error, null);
        }
    }
    async sendText(chatId, text, options) {
        return this.sendMessage(chatId, text, options, 'text');
    }
    async sendSticker(chatId, sticker, options) {
        return this.sendMessage(chatId, sticker, options, 'sticker');
    }
    async sendPhoto(chatId, photo, options) {
        return this.sendMessage(chatId, photo, options, 'photo');
    }
    async sendVideo(chatId, video, options) {
        return this.sendMessage(chatId, video, options, 'video');
    }
    async sendAudio(chatId, audio, options) {
        return this.sendMessage(chatId, audio, options, 'audio');
    }
    async sendDocument(chatId, document, options) {
        return this.sendMessage(chatId, document, options, 'document');
    }
    async setWebhook(url) {
        const data = typeof url === 'string' ? { url } : url;
        const resp = await this.httpRequest('setWebhook', data);
        return resp.ok;
    }
    async getWebhookInfo() {
        const resp = await this.httpRequest('getWebhookInfo', null, 'get');
        return resp.result;
    }
    async deleteWebhook(dropPending = false) {
        const resp = await this.httpRequest('deleteWebhook', { drop_pending_updates: dropPending });
        return resp.ok;
    }
    async httpRequest(botMethod, data = null, reqMethod = 'post', otherConfig = {}) {
        try {
            const resp = await this.httpClient.request({
                ...otherConfig,
                timeout: this._requestTimeout,
                method: reqMethod,
                url: botMethod,
                data,
            });
            return resp.data;
        }
        catch (error) {
            const newErr = new Error(error.response?.data?.description || error.message);
            newErr.stack = error.stack;
            throw newErr;
        }
    }
    handleError(error, returnValue) {
        if (this._hasErrorCatcher) {
            this._event.emit('error', error);
            if (typeof returnValue !== 'undefined') {
                return returnValue;
            }
        }
        else {
            throw error;
        }
    }
}
exports.TelegramBot = TelegramBot;
