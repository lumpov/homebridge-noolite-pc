const Player = require('./player');

let Service, Characteristic;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-radio-player-plus', 'RadioPlayerPlus', RadioPlayerPlusPlugin);
}

class RadioPlayerPlusPlugin {

  constructor(log, config) {
    this.log = log;
    this.activeStation = -1;
    this.stations = config.stations;
    this.delay = Number(config.delay) || 100;
    this.reconnectAfter = Number(config.reconnectAfter) || 45;
    this.player = new Player(this.log, this.reconnectAfter * 60000);

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(
        Characteristic.Manufacturer,
        'Michael Reiniger, Francesco Kriegel'
      )
      .setCharacteristic(
        Characteristic.Model,
        'v2.0.0'
      )
      .setCharacteristic(
        Characteristic.SerialNumber,
        'RadioPlayerPlus_2.0.0'
      );

    this.switchService = new Service.Switch('Next Radio Stream', 'next-radio-stream');
    this.switchService
      .getCharacteristic(Characteristic.On)
      .on(
        'set',
        this.nextStation.bind(this)
      )
      .on(
        'get',
        this.showAlwaysOff.bind(this)
      );

    this.services = [this.informationService, this.switchService];
    this.stationServices = [];

    for (var n in this.stations) {
      const station = this.stations[n];
      const stationService = new Service.Switch(station.name, 'radio-stream-' + n);
      stationService
        .getCharacteristic(Characteristic.On)
        .on(
          'set',
          this.controlStation.bind(this, Number(n))
        )
        .on(
          'get',
          this.isPlaying.bind(this, Number(n))
        );
      this.services.push(stationService);
      this.stationServices.push(stationService);
    }

  }

  getServices() {
    return this.services;
  }

  play() {
    if (this.activeStation != -1) {
      const station = this.stations[this.activeStation];
      this.log.info('Starting web radio "' + station.name + '" (' + station.streamUrl + ')');
      this.player.play(station.streamUrl);
      this.stationServices[this.activeStation].getCharacteristic(Characteristic.On).updateValue(true);
    }
  }

  stop() {
    if (this.activeStation != -1) {
      const station = this.stations[this.activeStation];
      this.log.info('Stopping web radio "' + station.name + '" (' + station.streamUrl + ')');
    }
    this.player.stop();
    for (var n in this.stations) {
      this.stationServices[n].getCharacteristic(Characteristic.On).updateValue(false);
    }
  }

  next() {
    this.setActiveStation(Number(this.activeStation) + 1);
  }

  setActiveStation(n) {
    this.activeStation = Number(n);
    if (this.activeStation == this.stations.length) {
      this.activeStation = Number(-1);
    }
  }

  nextStation(on, callback) {
    if (on) {
      this.stop();
      this.next();
      this.play();
      setTimeout(function() {
        this.switchService.getCharacteristic(Characteristic.On).updateValue(false)
        this.log.debug('Set state of switch to off')
      }.bind(this), this.delay)
    }
    return callback();
  }

  showAlwaysOff(callback) {
    callback(null, false);
  }

  controlStation(n, on, callback) {
    if (on) {
      this.stop();
      this.setActiveStation(n);
      this.play();
    } else {
      this.stop();
      this.setActiveStation(-1);
    }
    return callback();
  }

  isPlaying(n, callback) {
    if (this.activeStation == -1) {
      return callback(null, false);
    } else if (this.activeStation == n) {
      return callback(null, this.player.isPlaying);
    } else {
      return callback(null, false);
    }
  }

}
