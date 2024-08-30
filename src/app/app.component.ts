/// <reference types="web-bluetooth" />
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgForOf, NgIf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  isScanning = false;
  private scan?: BluetoothLEScan;

  names = new Map<string, string>(
    [
      ['ATC_F29237', 'Living room'],
      ['ATC_A0AB05', 'Bedroom'],
      ['ATC_9060B7', 'Outside'],
      ['ATC_578151', 'Kitchen']
    ]
  );

  devices: Map<string, DeviceInfo> = new Map();

  onButtonClick() {
    this.isScanning = !this.isScanning;
    if (this.isScanning) {
      this.startScanning().then();
    } else {
      this.stopScanning();
    }
  }

  private async startScanning() {
    setTimeout(() => {
      this.stopScanning();
    }, 10000);
    try {
      this.scan = await navigator.bluetooth.requestLEScan({
        filters: [
          { namePrefix: 'ATC_' }
        ]
      });
      navigator.bluetooth.addEventListener('advertisementreceived', event => {
        const key = event.name;
        if (!key) {
          return;
        }
        const existingDevice = this.devices.get(key);
        this.devices.set(key, this.createDeviceInfo(event, existingDevice));
      });
    } catch (error) {
      console.error('Argh! ' + error);
    }
  }

  private stopScanning() {
    this.scan?.stop();
  }

  private createDeviceInfo(event: BluetoothAdvertisingEvent, existingDevice?: DeviceInfo): DeviceInfo {
    const rawInfo = [...event.serviceData.values()][0];
    const info: DeviceInfo = existingDevice || {
      name: this.names.get(event.name!) ?? event.name!,
      temperature: undefined,
      humidity: undefined,
      battery: undefined
    };
    if (rawInfo.byteLength === 11) {
      const temperatureRaw = rawInfo.getInt16(6, true);
      info.temperature = temperatureRaw / 100;

      const humidityRaw = rawInfo.getInt16(9, true);
      info.humidity = humidityRaw / 100;
    } else if (rawInfo.byteLength === 8) {
      const batteryRaw = rawInfo.getInt16(4, true);
      const battery = batteryRaw / 1000;
      info.battery = this.voltageToPercentage(battery);
    }
    return info;
  }

  private voltageToPercentage(voltage: number): number {
    const maxVoltage = 3.0; // Full battery voltage
    const minVoltage = 2.0; // Voltage at which the battery is considered empty

    if (voltage >= maxVoltage) {
      return 100; // Cap the percentage at 100%
    } else if (voltage <= minVoltage) {
      return 0; // Cap the percentage at 0%
    } else {
      // Linear interpolation between min and max voltage
      return Math.round(((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100);
    }
  }
}

interface DeviceInfo {
  name: string;
  temperature: number | undefined;
  humidity: number | undefined;
  battery: number | undefined;
}
