/*
 * Copyright 2023 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { SignalsApi } from '@backstage/plugin-signals-react';
import { JsonObject } from '@backstage/types';
import { DiscoveryApi, IdentityApi } from '@backstage/core-plugin-api';
import { v4 as uuid } from 'uuid';

/** @internal */
type Subscription = {
  topic: string;
  callback: (message: JsonObject) => void;
};

/** @internal */
const WS_CLOSE_NORMAL = 1000;
/** @internal */
const WS_CLOSE_GOING_AWAY = 1001;

/** @public */
export class SignalsClient implements SignalsApi {
  static readonly CONNECT_TIMEOUT_MS: number = 1000;
  static readonly RECONNECT_TIMEOUT_MS: number = 5000;
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private messageQueue: string[] = [];
  private reconnectTimeout: any;

  static create(options: {
    identity: IdentityApi;
    discoveryApi: DiscoveryApi;
  }) {
    const { identity, discoveryApi } = options;
    return new SignalsClient(identity, discoveryApi);
  }

  private constructor(
    private identity: IdentityApi,
    private discoveryApi: DiscoveryApi,
  ) {}

  subscribe(onMessage: (message: JsonObject) => void, topic: string): string {
    const subscriptionId = uuid();
    const exists = [...this.subscriptions.values()].find(
      sub => sub.topic === topic,
    );
    this.subscriptions.set(subscriptionId, { topic, callback: onMessage });

    this.connect()
      .then(() => {
        // Do not subscribe twice to same topic even there is multiple callbacks
        if (!exists) {
          this.send({ action: 'subscribe', topic });
        }
      })
      .catch(() => {
        this.reconnect();
      });
    return subscriptionId;
  }

  unsubscribe(subscription: string): void {
    const sub = this.subscriptions.get(subscription);
    if (!sub) {
      return;
    }
    const topic = sub.topic;
    this.subscriptions.delete(subscription);
    const exists = [...this.subscriptions.values()].find(
      s => s.topic === topic,
    );
    // If there are subscriptions still listening to this topic, do not
    // unsubscribe from the server
    if (!exists) {
      this.send({ action: 'unsubscribe', topic: sub.topic });
    }

    // If there are no subscriptions, close the connection
    if (this.subscriptions.size === 0) {
      this.ws?.close(WS_CLOSE_NORMAL);
      this.ws = null;
    }
  }

  private send(data?: JsonObject): void {
    const jsonMessage = JSON.stringify(data);
    if (jsonMessage.length === 0) {
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (data) {
        this.messageQueue.unshift(jsonMessage);
      }
      return;
    }

    // First send queue
    for (const msg of this.messageQueue) {
      this.ws!.send(msg);
    }
    this.messageQueue = [];
    if (data) {
      this.ws!.send(jsonMessage);
    }
  }

  private async connect() {
    if (this.ws) {
      return;
    }

    const apiUrl = `${await this.discoveryApi.getBaseUrl('signals')}`;
    const url = new URL(apiUrl);
    url.protocol = url.protocol === 'http:' ? 'ws' : 'wss';
    this.ws = new WebSocket(url.toString());

    this.ws.onmessage = (data: MessageEvent) => {
      this.handleMessage(data);
    };

    this.ws.onerror = () => {
      this.reconnect();
    };

    this.ws.onclose = (ev: CloseEvent) => {
      if (ev.code !== WS_CLOSE_NORMAL && ev.code !== WS_CLOSE_GOING_AWAY) {
        this.reconnect();
      }
    };

    // Wait until connection is open
    let connectSleep = 0;
    while (
      this.ws &&
      this.ws.readyState !== WebSocket.OPEN &&
      connectSleep < SignalsClient.CONNECT_TIMEOUT_MS
    ) {
      await new Promise(r => setTimeout(r, 100));
      connectSleep += 100;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Connect timeout');
    }

    // Authenticate
    await this.authenticate();
  }

  private handleMessage(data: MessageEvent) {
    try {
      const json = JSON.parse(data.data) as JsonObject;
      if (json.topic) {
        for (const sub of this.subscriptions.values()) {
          if (sub.topic === json.topic) {
            sub.callback(json.message as JsonObject);
          }
        }
      }
    } catch (e) {
      // NOOP
    }
  }

  private async authenticate() {
    const { token } = await this.identity.getCredentials();
    if (token) {
      // Authentication is done with websocket message to server as the plain
      // websocket does not allow sending headers during connection upgrade
      this.send({ action: 'authenticate', token: token });
    }
  }

  private reconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.ws) {
        this.ws.close();
      }
      this.ws = null;
      this.connect()
        .then(() => {
          // Resubscribe to existing topics in case we lost connection
          for (const topic of this.subscriptions.keys()) {
            this.send({ action: 'subscribe', topic });
          }
        })
        .catch(() => {
          this.reconnect();
        });
    }, SignalsClient.RECONNECT_TIMEOUT_MS);
  }
}
