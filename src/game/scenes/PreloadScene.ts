import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  create() {
    this.createTextures();
    this.scene.start('MainGameScene');
  }

  private createTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const S = 48;

    // Grass tile
    g.clear();
    g.fillStyle(0x4a7c4e);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0x3d6b41);
    g.fillRect(0, 0, S, 2);
    g.fillRect(0, 0, 2, S);
    g.fillStyle(0x2d5a30);
    g.fillRect(S - 2, 0, 2, S);
    g.fillRect(0, S - 2, S, 2);
    // pixel details
    g.fillStyle(0x5a9960);
    for (let i = 0; i < 8; i++) {
      const px = Math.floor((i * 137 + 7) % (S - 4)) + 2;
      const py = Math.floor((i * 97 + 13) % (S - 4)) + 2;
      g.fillRect(px, py, 3, 3);
    }
    g.generateTexture('grass', S, S);

    // Selected/hover tile
    g.clear();
    g.fillStyle(0xffff00, 0.3);
    g.fillRect(0, 0, S, S);
    g.lineStyle(3, 0xffff00, 0.9);
    g.strokeRect(1, 1, S - 2, S - 2);
    g.generateTexture('selected', S, S);

    // Hover tile
    g.clear();
    g.fillStyle(0xffffff, 0.15);
    g.fillRect(0, 0, S, S);
    g.lineStyle(2, 0xffffff, 0.5);
    g.strokeRect(1, 1, S - 2, S - 2);
    g.generateTexture('hover', S, S);

    // House - brown/orange blocky
    this.makeBlockTexture(g, S, 'HOUSE', 0xCD853F, 0xA0522D, [
      { x: 10, y: 10, w: 28, h: 20, color: 0xDEB887 }, // walls
      { x: 5, y: 5, w: 38, h: 10, color: 0x8B0000 },   // roof
      { x: 16, y: 24, w: 10, h: 14, color: 0x4a3728 },  // door
      { x: 28, y: 22, w: 8, h: 8, color: 0x87CEEB },   // window
    ]);

    // Farm - greens
    this.makeBlockTexture(g, S, 'FARM', 0x6B8E23, 0x4a6316, [
      { x: 4, y: 20, w: 40, h: 4, color: 0x8B6914 },   // soil row
      { x: 4, y: 28, w: 40, h: 4, color: 0x8B6914 },
      { x: 4, y: 36, w: 40, h: 4, color: 0x8B6914 },
      { x: 6, y: 16, w: 4, h: 6, color: 0x90EE90 },    // crops
      { x: 14, y: 16, w: 4, h: 6, color: 0x90EE90 },
      { x: 22, y: 16, w: 4, h: 6, color: 0x90EE90 },
      { x: 30, y: 16, w: 4, h: 6, color: 0x90EE90 },
      { x: 38, y: 16, w: 4, h: 6, color: 0x90EE90 },
    ]);

    // Market - yellow/gold
    this.makeBlockTexture(g, S, 'MARKET', 0xDAA520, 0xB8860B, [
      { x: 8, y: 12, w: 32, h: 24, color: 0xF5DEB3 }, // building
      { x: 4, y: 8, w: 40, h: 8, color: 0xFFD700 },   // awning
      { x: 14, y: 26, w: 10, h: 10, color: 0x4a3728 }, // door
      { x: 6, y: 14, w: 7, h: 7, color: 0x87CEEB },   // window
      { x: 35, y: 14, w: 7, h: 7, color: 0x87CEEB },
    ]);

    // Lumber Mill - dark brown
    this.makeBlockTexture(g, S, 'LUMBER_MILL', 0x5C3317, 0x3d2211, [
      { x: 10, y: 14, w: 28, h: 22, color: 0x8B4513 }, // mill body
      { x: 6, y: 8, w: 10, h: 10, color: 0x696969 },  // chimney
      { x: 30, y: 30, w: 14, h: 6, color: 0xA0522D },  // logs
      { x: 4, y: 36, w: 10, h: 5, color: 0xA0522D },
    ]);

    // Quarry - gray stone
    this.makeBlockTexture(g, S, 'QUARRY', 0x808080, 0x505050, [
      { x: 6, y: 18, w: 36, h: 20, color: 0xA9A9A9 }, // excavation
      { x: 4, y: 24, w: 8, h: 14, color: 0x696969 },  // stone blocks
      { x: 14, y: 28, w: 8, h: 10, color: 0x708090 },
      { x: 26, y: 22, w: 10, h: 16, color: 0x778899 },
      { x: 20, y: 10, w: 8, h: 12, color: 0xC0C0C0 }, // cart
    ]);

    // Barracks - red/dark
    this.makeBlockTexture(g, S, 'BARRACKS', 0x6B0000, 0x3d0000, [
      { x: 6, y: 10, w: 36, h: 26, color: 0x8B0000 }, // body
      { x: 4, y: 6, w: 40, h: 8, color: 0x4a0000 },  // roof
      { x: 16, y: 24, w: 8, h: 12, color: 0x2a0000 }, // door
      { x: 6, y: 12, w: 7, h: 7, color: 0xFFD700 },   // window left
      { x: 35, y: 12, w: 7, h: 7, color: 0xFFD700 },  // window right
      { x: 22, y: 6, w: 4, h: 4, color: 0xFF0000 },   // flag
    ]);

    // Wall - gray blocks
    this.makeBlockTexture(g, S, 'WALL', 0x696969, 0x404040, [
      { x: 0, y: 16, w: 48, h: 20, color: 0x808080 }, // main wall
      { x: 0, y: 8, w: 12, h: 12, color: 0x909090 }, // battlements
      { x: 14, y: 8, w: 12, h: 12, color: 0x909090 },
      { x: 28, y: 8, w: 12, h: 12, color: 0x909090 },
      { x: 42, y: 8, w: 6, h: 12, color: 0x909090 },
    ]);

    // Watch Tower - tall brown
    this.makeBlockTexture(g, S, 'WATCH_TOWER', 0x8B6914, 0x5a4410, [
      { x: 14, y: 4, w: 20, h: 40, color: 0xA0844d }, // tower body
      { x: 10, y: 4, w: 28, h: 10, color: 0x6B4f10 }, // top platform
      { x: 6, y: 0, w: 4, h: 8, color: 0x8B0000 },   // flag staff
      { x: 10, y: 0, w: 10, h: 6, color: 0xFF0000 },  // flag
      { x: 18, y: 24, w: 12, h: 8, color: 0x87CEEB }, // window
    ]);

    // Temple - purple/white
    this.makeBlockTexture(g, S, 'TEMPLE', 0x6A0DAD, 0x4a0880, [
      { x: 8, y: 12, w: 32, h: 28, color: 0xE8E8FF }, // white walls
      { x: 4, y: 6, w: 40, h: 10, color: 0x9370DB },  // purple roof
      { x: 16, y: 26, w: 16, h: 14, color: 0x4a0880 }, // arch door
      { x: 10, y: 14, w: 8, h: 8, color: 0xFFFFAA },  // windows
      { x: 30, y: 14, w: 8, h: 8, color: 0xFFFFAA },
      { x: 22, y: 4, w: 4, h: 8, color: 0xFFD700 },   // cross/spire
    ]);

    // Soldier marker
    g.clear();
    g.fillStyle(0xCC0000);
    g.fillRect(16, 8, 16, 24);
    g.fillStyle(0xFFD700);
    g.fillRect(14, 6, 20, 10); // helmet
    g.fillStyle(0x1a1a1a);
    g.fillRect(18, 12, 4, 4); // visor
    g.generateTexture('soldier', S, S);

    g.destroy();
  }

  private makeBlockTexture(
    g: Phaser.GameObjects.Graphics,
    S: number,
    key: string,
    baseColor: number,
    shadowColor: number,
    details: Array<{ x: number; y: number; w: number; h: number; color: number }>
  ) {
    g.clear();
    // Base
    g.fillStyle(baseColor);
    g.fillRect(0, 0, S, S);
    // Shadow edges
    g.fillStyle(shadowColor);
    g.fillRect(S - 3, 0, 3, S);
    g.fillRect(0, S - 3, S, 3);
    // Details
    for (const d of details) {
      g.fillStyle(d.color);
      g.fillRect(d.x, d.y, d.w, d.h);
    }
    // Pixel art outline
    g.lineStyle(1, 0x000000, 0.3);
    g.strokeRect(0, 0, S, S);
    g.generateTexture(key, S, S);
  }
}
