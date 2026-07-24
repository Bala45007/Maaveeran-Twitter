import Phaser from 'phaser';

// Single shared emitter used to pass state between Phaser scenes and React HUD.
// Phaser scenes emit ('hud:update', {...}) and React listens; React emits
// ('input:pause') etc. for UI-driven actions.
export const EventBus = new Phaser.Events.EventEmitter();
