import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  private popupTexts: Map<string, Phaser.GameObjects.Text> = new Map();

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    // Listen for floating text events from MainGameScene
    this.game.events.on('floatingText', this.showFloatingText, this);
  }

  showFloatingText(data: { x: number; y: number; text: string; color?: string }) {
    const { x, y, text, color = '#ffffff' } = data;
    const t = this.add.text(x, y, text, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: t,
      y: y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }

  shutdown() {
    this.game.events.off('floatingText', this.showFloatingText, this);
  }
}
