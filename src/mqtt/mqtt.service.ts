// src/mqtt/mqtt.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit {
  private logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;

  // Handlers
  private storeHandlers: Array<(uid: string) => void> = [];
  private sellHandlers: Array<(uid: string) => void> = [];

  onModuleInit() {
    // Kết nối MQTTS đến EMQX Cloud
    this.client = mqtt.connect(
      'mqtts://pee4ef34.ala.eu-central-1.emqxsl.com:8883',
      {
        username: 'admin',
        password: '123',
        rejectUnauthorized: false,
      },
    );

    this.client.on('connect', () => {
      this.logger.log('MQTT Connected!');

      // Subscribe topic STORE MODE
      this.client.subscribe('rfid/store', (err) => {
        if (!err) this.logger.log('Subscribed to rfid/store');
      });

      // Subscribe topic SELL MODE
      this.client.subscribe('rfid/sell', (err) => {
        if (!err) this.logger.log('Subscribed to rfid/sell');
      });
    });

    this.client.on('message', (topic, payload) => {
      const msg = payload.toString();

      // STORE MODE
      if (topic === 'rfid/store') {
        this.logger.log(`Topic rfid/store -> ${msg}`);
        this.storeHandlers.forEach((handler) => handler(msg));
      }

      // SELL MODE
      if (topic === 'rfid/sell') {
        this.logger.log(`Topic rfid/sell -> ${msg}`);
        this.sellHandlers.forEach((handler) => handler(msg));
      }
    });

    this.client.on('error', (err) => {
      this.logger.error('MQTT Error: ' + err.message);
    });
  }

  // ---------- STORE MODE ----------
  registerStoreHandler(handler: (uid: string) => void) {
    this.storeHandlers.push(handler);
  }

  // ---------- SELL MODE ----------
  registerSellHandler(handler: (uid: string) => void) {
    this.sellHandlers.push(handler);
  }

  publish(topic: string, message: string) {
    if (this.client?.connected) {
      this.client.publish(topic, message);
    } else {
      this.logger.warn('MQTT NOT CONNECTED — cannot publish');
    }
  }
}
