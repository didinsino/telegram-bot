/// <reference path="./types.ts" />
export type { AxiosInstance } from 'axios';

import axios, { AxiosInstance, Method } from 'axios';
import EventEmitter from 'promise-events';
import chunk from 'lodash/chunk';

////

const states: AnyObject = {
  httpClient: null,
  FormData: null,
  fs: null,
  path: null,
  hasSigintListener: false,
};

///

export class TelegramBot {
  token: string;
  polingDelay: number = 200; // in MS

  private _event: EventEmitter;
  private _directReply: WebhookReply | null = null;
  private _updateOffset: number = 0;
  private _pollingTimer: ReturnType<typeof setTimeout> | null = null;
  private _hasErrorCatcher: boolean = false;
  private _requestTimeout = 30000

  constructor(token: string) {
    this.token = token;
    this._event = new EventEmitter();
  }

  get httpClient(): AxiosInstance {
    if (states.httpClient == null) {
      states.httpClient = axios.create({
        baseURL: `https://api.telegram.org/bot${this.token}`,
        responseType: 'json',
        // no need to add headers Content-Type, it's automatically by Axios
      });
    }
    return states.httpClient;
  }

  set requestTimeout(timeoutValue: number) {
    this._requestTimeout = timeoutValue
  }

  on(updateType: UpdateType, callback: (context: UpdateContext) => void): Promise<any> {
    return this._event.on(updateType, callback as TListener);
  }

  start(callback: (context: UpdateContext) => void): Promise<any> {
    return this.on('command', ctx => {
      const curCommand = ctx.message!.text!.split(' ', 1)[0].slice(1);
      if (curCommand.toLowerCase() === 'start') {
        callback(ctx);
      }
    });
  }

  command(commandStr: string, callback: (context: UpdateContext) => void): Promise<any> {
    return this.on('command', ctx => {
      const curCommand = ctx.message!.text!.split(' ', 1)[0].slice(1);
      if (curCommand.toLowerCase() === commandStr.toLowerCase()) {
        callback(ctx);
      }
    });
  }

  action(callbackData: string | RegExp, callback: (context: UpdateContext) => void): Promise<any> {
    return this.on('callback_query', ctx => {
      if (typeof callbackData === 'string') {
        if (ctx.callback_query!.data === callbackData) callback(ctx);
      } else {
        ctx.match = ctx.callback_query!.data!.match(callbackData);
        if (ctx.match != null) callback(ctx);
      }
    });
  }

  catch(callback: (error: Error) => void): Promise<any> {
    this._hasErrorCatcher = true;
    return this._event.on('error', callback as TListener);
  }

  getDirectReply(): WebhookReply | null {
    return this._directReply;
  }

  async getUpdates(options?: GetUpdatesOptions): Promise<Update[] | null> {
    try {
      if (!options?.offset) {
        options = options ?? {};
        options.offset = this._updateOffset;
      }
      const resp = await this.httpRequest('getUpdates', options);
      return resp.result;
    } catch (error) {
      return this.handleError(error, null);
    }
  }

  async startPolling(options?: GetUpdatesOptions): Promise<void> {
    try {
      // Gracefully stop polling process on Ctrl+C
      if (!states.hasSigintListener) {
        process.on('SIGINT', () => {
          this.stopPolling();
          process.exit();
        });
        states.hasSigintListener = true;
      }

      const updates = await this.getUpdates(options);
      if (Array.isArray(updates)) {
        await Promise.all((updates as Update[]).map(update => this.handleUpdate(update)));
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      if (this._pollingTimer && typeof this._pollingTimer.refresh === 'function') {
        this._pollingTimer.refresh();
      } else {
        this._pollingTimer = setTimeout(() => this.startPolling(options), this.polingDelay);
      }
    }
  }

  stopPolling() {
    clearTimeout(this._pollingTimer as ReturnType<typeof setTimeout>);
  }

  async handleUpdate(update: Update): Promise<WebhookReply | void> {
    try {
      const thisClass = this;
      const context: UpdateContext = {
        ...update,

        reply: (message: MessageData, options?: SendOptions, type: MessageType = 'text'): Promise<Message | null> => {
          const chatId = update.message?.chat.id ?? update.callback_query?.message.chat.id;
          return thisClass.sendMessage(chatId!, message, options, type);
        },

        directReply: (options: string | WebhookReply) => {
          const chatId = update.message?.chat.id ?? update.callback_query?.message.chat.id;
          this._directReply = typeof options === 'string' ? { text: options } : options;
          this._directReply.chat_id = chatId;
          if (!this._directReply.method) {
            this._directReply.method = 'sendMessage';
          }
        },

        async deleteMessage(messageId?: number): Promise<boolean> {
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
        } else {
          await this._event.emit('message', context);
          if (update.message.text) {
            await this._event.emit('text', context);
          } else if (update.message.photo) {
            await this._event.emit('photo', context);
          } else if (update.message.document) {
            await this._event.emit('document', context);
          } else if (update.message.sticker) {
            await this._event.emit('sticker', context);
          }
        }
      } else if (update.callback_query) {
        await this._event.emit('callback_query', context);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteMessage(chatId: number | string, messageId: number): Promise<boolean> {
    try {
      const resp = await this.httpRequest('deleteMessage', { message_id: messageId, chat_id: chatId });
      return resp.result;
    } catch (error) {
      return this.handleError(error, false);
    }
  }

  async editMessageText(
    chatId: number | string,
    messageId: number,
    text: string,
    options?: {
      parse_mode?: ParseMode;
      disable_web_page_preview?: boolean;
      entities?: MessageEntity[];
      reply_markup?: any;
    }
  ): Promise<Message | null> {
    try {
      const resp = await this.httpRequest('editMessageText', {
        ...(options || {}),
        message_id: messageId,
        chat_id: chatId,
        text,
      });
      return resp.result;
    } catch (error) {
      return this.handleError(error, null);
    }
  }

  async editMessageCaption(
    chatId: number | string,
    messageId: number,
    caption: string,
    options?: {
      parse_mode: ParseMode;
      caption_entities: MessageEntity[];
      reply_markup: any;
    }
  ): Promise<Message | null> {
    try {
      const resp = await this.httpRequest('editMessageCaption', {
        ...(options || {}),
        message_id: messageId,
        chat_id: chatId,
        caption,
      });
      return resp.result;
    } catch (error) {
      return this.handleError(error, null);
    }
  }

  async sendMessage(
    chatId: number | string,
    message: MessageData,
    options?: SendOptions,
    type: MessageType = 'text'
  ): Promise<Message | null> {
    try {
      // reply_markup
      if (
        options?.buttons ||
        options?.force_reply ||
        options?.keyboard ||
        options?.remove_keyboard ||
        options?.input_field_placeholder
      ) {
        options.reply_markup = !options.reply_markup ? {} : options.reply_markup;

        // inline keyboard buttons
        if (options?.buttons) {
          const colCount = options.buttons_column || 1;
          options.reply_markup.inline_keyboard = chunk(options.buttons, colCount);
          delete options.buttons;
          delete options.buttons_column;
        }
        // custom keyboard
        if (options?.keyboard) {
          const colCount = options.keyboard.column || 1;
          if (options.keyboard.buttons?.length) {
            options.reply_markup.keyboard = chunk(options.keyboard.buttons, colCount);
            options.reply_markup.is_persistent = options.keyboard.persistent || false;
            options.reply_markup.resize_keyboard = options.keyboard.resize || false;
            options.reply_markup.one_time_keyboard = options.keyboard.one_time || false;
          } else {
            options.reply_markup.remove_keyboard = true;
          }
          delete options.keyboard;
        }
        // remove custom keyboard
        if (options?.remove_keyboard) {
          options.reply_markup.remove_keyboard = true;
          delete options.remove_keyboard;
        }
        // force reply
        if (options?.force_reply) {
          options.reply_markup.force_reply = options.force_reply;
          delete options.force_reply;
        }
        // input placeholder
        if (options?.input_placeholder) {
          options.reply_markup.input_field_placeholder = options.input_placeholder;
          delete options.input_placeholder;
        }
      }

      // send text
      if (type === 'text') {
        const resp = await this.httpRequest('sendMessage', {
          ...(options || {}),
          chat_id: chatId,
          text: message,
        });
        return resp.result;
      }

      // send file
      if (states.FormData == null) {
        states.FormData = require('form-data');
      }
      const formData = new states.FormData();
      const methodName = `send${type.charAt(0).toUpperCase() + type.slice(1)}`;
      for (const key in options || {}) {
        if (key === 'chat_id' || key === type) continue;
        if (key === 'reply_markup') {
          formData.append(key, JSON.stringify(options?.[key]));
          continue;
        }
        formData.append(key, options?.[key]);
      }
      formData.append('chat_id', chatId);
      if (typeof message === 'string') {
        // file in server ex: "path/to/file.pdf"
        if (
          (message.includes('/') || message.includes('\\')) &&
          !message.startsWith('https://') &&
          !message.startsWith('http://')
        ) {
          if (states.fs == null) {
            states.fs = require('fs');
          }
          if (states.path == null) {
            states.path = require('path');
          }
          const fileName = options?.file_name || states.path.basename(message);
          message = states.fs.createReadStream(message);
          formData.append(type, message, fileName);
        } else {
          // file from url or file_id
          formData.append(type, message);
        }
      } else {
        // file dari Buffer (fs.readFileSync) atau stream (fs.createReadStream)
        formData.append(type, message, options?.file_name || type);
      }

      const resp = await this.httpRequest(methodName, formData);
      return resp.result;
      ////
    } catch (error) {
      return this.handleError(error, null);
    }
  }

  async sendText(chatId: number | string, text: string, options?: SendOptions): Promise<Message | null> {
    return this.sendMessage(chatId, text, options, 'text');
  }

  async sendSticker(chatId: number | string, sticker: MessageData, options?: SendOptions): Promise<Message | null> {
    return this.sendMessage(chatId, sticker, options, 'sticker');
  }

  async sendPhoto(chatId: number | string, photo: MessageData, options?: SendOptions): Promise<Message | null> {
    return this.sendMessage(chatId, photo, options, 'photo');
  }

  async sendVideo(chatId: number | string, video: MessageData, options?: SendOptions): Promise<Message | null> {
    return this.sendMessage(chatId, video, options, 'video');
  }

  async sendAudio(chatId: number | string, audio: MessageData, options?: SendOptions): Promise<Message | null> {
    return this.sendMessage(chatId, audio, options, 'audio');
  }

  async sendDocument(chatId: number | string, document: MessageData, options?: SendOptions): Promise<Message | null> {
    return this.sendMessage(chatId, document, options, 'document');
  }

  async setWebhook(url: string | AnyObject): Promise<boolean> {
    const data: AnyObject = typeof url === 'string' ? { url } : url;
    const resp = await this.httpRequest('setWebhook', data);
    return resp.ok;
  }

  async getWebhookInfo(): Promise<AnyObject> {
    const resp = await this.httpRequest('getWebhookInfo', null, 'get');
    return resp.result;
  }

  async deleteWebhook(dropPending: boolean = false): Promise<boolean> {
    const resp = await this.httpRequest('deleteWebhook', { drop_pending_updates: dropPending });
    return resp.ok;
  }

  async httpRequest(
    botMethod: string,
    data: AnyObject | null = null,
    reqMethod: Method = 'post',
    otherConfig: AnyObject = {}
  ): Promise<RequestResponse> {
    try {
      const resp = await this.httpClient.request({
        ...otherConfig,
        timeout: this._requestTimeout,
        method: reqMethod,
        url: botMethod,
        data,
      });
      return resp.data;
    } catch (error: any) {
      const newErr = new Error(error.response?.data?.description || error.message);
      newErr.stack = error.stack;
      throw newErr;
    }
  }

  handleError(error: any, returnValue?: any): any {
    if (this._hasErrorCatcher) {
      this._event.emit('error', error);
      if (typeof returnValue !== 'undefined') {
        return returnValue;
      }
    } else {
      throw error;
    }
  }
}
