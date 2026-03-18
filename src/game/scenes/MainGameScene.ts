import Phaser from 'phaser';
import {
  BUILDING_DEFINITIONS,
  GRID_SIZE,
  ISO_TILE_HEIGHT,
  ISO_TILE_WIDTH,
  TERRAIN_ELEVATION,
  TICK_INTERVAL,
} from '../config';
import { PlacedBuilding, TerrainBiome, TerrainCell } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { saveGameState } from '../../services/worldService';

type TerrainPalette = {
  top: number;
  left: number;
  right: number;
  edge: number;
  accent: number;
};

type PrismPalette = Pick<TerrainPalette, 'top' | 'left' | 'right' | 'edge'>;

const TERRAIN_PALETTES: Record<TerrainBiome, TerrainPalette> = {
  meadow: {
    top: 0x6FAE62,
    left: 0x507E48,
    right: 0x5D9353,
    edge: 0xC3E7A5,
    accent: 0x88C97B,
  },
  grove: {
    top: 0x4E8D54,
    left: 0x376241,
    right: 0x42784A,
    edge: 0x8FC98D,
    accent: 0x5FA769,
  },
  ridge: {
    top: 0x8A9D8F,
    left: 0x627065,
    right: 0x738376,
    edge: 0xC9D2CB,
    accent: 0xA5B4A8,
  },
  clay: {
    top: 0xB98962,
    left: 0x855F44,
    right: 0x9D7353,
    edge: 0xE0C0A4,
    accent: 0xD8A177,
  },
};

export class MainGameScene extends Phaser.Scene {
  private buildingSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private terrainSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private hoverTile: Phaser.GameObjects.Polygon | null = null;
  private selectedTile: Phaser.GameObjects.Polygon | null = null;
  private tickTimer: Phaser.Time.TimerEvent | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private lastTileX = -1;
  private lastTileY = -1;
  private gridContainer!: Phaser.GameObjects.Container;
  private unsubscribe: (() => void) | null = null;
  private saveTimer: Phaser.Time.TimerEvent | null = null;
  private terrain: TerrainCell[][] = [];
  private maxTerrainHeight = 1;
  private worldOriginX = 0;
  private worldOriginY = 0;
  private contextMenuHandler = (event: Event) => event.preventDefault();

  constructor() {
    super({ key: 'MainGameScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#8fc0ff');
    this.gridContainer = this.add.container(0, 0);

    const worldSeed = useGameStore.getState().worldSeed || 1;
    this.terrain = this.generateTerrain(worldSeed);
    this.maxTerrainHeight = Math.max(...this.terrain.flat().map(cell => cell.height));
    this.worldOriginX = GRID_SIZE * ISO_TILE_WIDTH * 0.5 + 180;
    this.worldOriginY = 120;

    this.createBackdrop();
    this.createTerrain();
    this.createOverlays();
    this.setupCamera();
    this.setupInput();
    this.setupTick();
    this.setupStoreSync();

    this.scene.launch('UIScene');
    this.syncBuildings(useGameStore.getState().buildings);

    this.saveTimer = this.time.addEvent({
      delay: 30000,
      loop: true,
      callback: this.saveState,
      callbackScope: this,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  private createBackdrop() {
    const sky = this.add.rectangle(0, 0, 3200, 1800, 0xa7d7ff, 1).setOrigin(0);
    sky.setDepth(-2000);
    this.gridContainer.add(sky);

    const haze = this.add.ellipse(this.worldOriginX, this.worldOriginY + 520, 1800, 900, 0xffffff, 0.12);
    haze.setDepth(-1900);
    this.gridContainer.add(haze);
  }

  private createTerrain() {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        this.renderTerrainCell(this.terrain[y][x]);
      }
    }
  }

  private createTerrainCellPoints(height: number) {
    const halfWidth = ISO_TILE_WIDTH / 2;
    const halfHeight = ISO_TILE_HEIGHT / 2;
    const drop = height * TERRAIN_ELEVATION;

    return {
      top: [0, -halfHeight, halfWidth, 0, 0, halfHeight, -halfWidth, 0],
      left: [-halfWidth, 0, 0, halfHeight, 0, halfHeight + drop, -halfWidth, drop],
      right: [halfWidth, 0, 0, halfHeight, 0, halfHeight + drop, halfWidth, drop],
      shadow: [0, -halfHeight, halfWidth, 0, 0, halfHeight, -halfWidth, 0],
    };
  }

  private renderTerrainCell(cell: TerrainCell) {
    const position = this.projectTile(cell.x, cell.y, cell.height);
    const palette = TERRAIN_PALETTES[cell.biome];
    const points = this.createTerrainCellPoints(cell.height);
    const drop = cell.height * TERRAIN_ELEVATION;

    const container = this.add.container(position.x, position.y);
    container.setDepth(position.y + ISO_TILE_HEIGHT / 2 + drop);

    const shadow = this.add
      .polygon(0, drop + 10, points.shadow, 0x102135, 0.12)
      .setScale(1.02, 0.7);
    const left = this.add.polygon(0, 0, points.left, palette.left, 1);
    const right = this.add.polygon(0, 0, points.right, palette.right, 1);
    const top = this.add.polygon(0, -drop, points.top, palette.top, 1);
    const accent = this.add
      .polygon(0, -drop + 3, this.makeDiamondPoints(ISO_TILE_WIDTH * 0.32, ISO_TILE_HEIGHT * 0.24), palette.accent, 0.18)
      .setScale(1, 0.75);

    top.setStrokeStyle(2, palette.edge, 0.4);
    left.setStrokeStyle(1, this.adjustColor(palette.left, 0.74), 0.45);
    right.setStrokeStyle(1, this.adjustColor(palette.right, 0.72), 0.45);

    const hitArea = new Phaser.Geom.Polygon(points.top);
    top.setInteractive(hitArea, Phaser.Geom.Polygon.Contains);
    top.on('pointerover', () => this.onTileHover(cell.x, cell.y));
    top.on('pointerout', () => this.onTileOut(cell.x, cell.y));
    top.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.onTileRightClick(cell.x, cell.y);
      } else {
        this.onTileClick(cell.x, cell.y);
      }
    });

    container.add([shadow, left, right, top, accent]);
    this.terrainSprites.set(`${cell.x},${cell.y}`, container);
    this.gridContainer.add(container);
  }

  private createOverlays() {
    this.hoverTile = this.add
      .polygon(0, 0, this.makeDiamondPoints(ISO_TILE_WIDTH, ISO_TILE_HEIGHT), 0xffffff, 0.1)
      .setVisible(false);
    this.hoverTile.setStrokeStyle(2, 0xffffff, 0.75);
    this.hoverTile.setDepth(20000);
    this.gridContainer.add(this.hoverTile);

    this.selectedTile = this.add
      .polygon(0, 0, this.makeDiamondPoints(ISO_TILE_WIDTH, ISO_TILE_HEIGHT), 0xffd85d, 0.14)
      .setVisible(false);
    this.selectedTile.setStrokeStyle(3, 0xffd85d, 0.95);
    this.selectedTile.setDepth(20001);
    this.gridContainer.add(this.selectedTile);
  }

  private setupCamera() {
    const width = GRID_SIZE * ISO_TILE_WIDTH + 900;
    const height = GRID_SIZE * ISO_TILE_HEIGHT + this.maxTerrainHeight * TERRAIN_ELEVATION + 900;
    this.cameras.main.setBounds(-250, -200, width, height);

    const center = this.projectTile(GRID_SIZE / 2 - 0.5, GRID_SIZE / 2 - 0.5, this.maxTerrainHeight * 0.5);
    this.cameras.main.centerOn(center.x, center.y + 180);
    this.cameras.main.setZoom(0.9);
  }

  private setupInput() {
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    this.input.on(
      'wheel',
      (_pointer: Phaser.Input.Pointer, _gameObjects: unknown, _deltaX: number, deltaY: number) => {
        const camera = this.cameras.main;
        const zoom = Phaser.Math.Clamp(camera.zoom - deltaY * 0.001, 0.55, 1.8);
        camera.setZoom(zoom);
      }
    );

    this.game.canvas.addEventListener('contextmenu', this.contextMenuHandler);
  }

  private setupTick() {
    this.tickTimer = this.time.addEvent({
      delay: TICK_INTERVAL,
      loop: true,
      callback: this.onGameTick,
      callbackScope: this,
    });
  }

  private setupStoreSync() {
    this.unsubscribe = useGameStore.subscribe((state, prev) => {
      if (state.buildings !== prev.buildings) {
        this.syncBuildings(state.buildings);
      }
    });
  }

  private syncBuildings(buildings: PlacedBuilding[]) {
    const ids = new Set(buildings.map(building => building.id));

    for (const [id, sprite] of this.buildingSprites) {
      if (!ids.has(id)) {
        sprite.destroy();
        this.buildingSprites.delete(id);
      }
    }

    for (const building of buildings) {
      if (!this.buildingSprites.has(building.id)) {
        this.renderBuilding(building);
      }
    }
  }

  private renderBuilding(building: PlacedBuilding) {
    const cell = this.terrain[building.y]?.[building.x];
    if (!cell) return;

    const def = BUILDING_DEFINITIONS[building.type];
    const position = this.projectTile(building.x, building.y, cell.height);
    const container = this.add.container(position.x, position.y);
    const foundationHeight = Math.max(10, Math.floor(def.renderHeight * 0.45));
    const roofHeight = Math.max(8, def.renderHeight - foundationHeight);
    const baseWidth = ISO_TILE_WIDTH * def.footprintScale;
    const baseHeight = ISO_TILE_HEIGHT * def.footprintScale;
    const roofWidth = baseWidth * (building.type === 'FARM' ? 0.95 : 0.72);
    const roofDepth = baseHeight * (building.type === 'FARM' ? 0.92 : 0.72);

    container.setDepth(
      position.y + ISO_TILE_HEIGHT / 2 + cell.height * TERRAIN_ELEVATION + def.renderHeight + 100
    );

    const footprintShadow = this.add
      .polygon(0, 8, this.makeDiamondPoints(baseWidth * 0.95, baseHeight * 0.95), 0x000000, 0.14)
      .setScale(1, 0.6);
    container.add(footprintShadow);

    this.addPrism(container, 0, 0, baseWidth, baseHeight, foundationHeight, {
      top: def.color,
      left: this.adjustColor(def.color, 0.7),
      right: this.adjustColor(def.color, 0.88),
      edge: this.adjustColor(def.roofColor, 1.08),
    });

    this.addPrism(container, 0, -foundationHeight + 2, roofWidth, roofDepth, roofHeight, {
      top: def.roofColor,
      left: this.adjustColor(def.roofColor, 0.7),
      right: this.adjustColor(def.roofColor, 0.88),
      edge: this.adjustColor(def.roofColor, 1.12),
    });

    if (building.type === 'FARM') {
      const cropBand = this.add.polygon(
        0,
        -foundationHeight + 2,
        this.makeDiamondPoints(baseWidth * 0.76, baseHeight * 0.48),
        0xb7d36b,
        0.75
      );
      cropBand.setScale(1, 0.75);
      container.add(cropBand);
    }

    if (building.type === 'WATCH_TOWER') {
      this.addPrism(container, 0, -def.renderHeight + 8, baseWidth * 0.64, baseHeight * 0.64, 12, {
        top: 0xc7a164,
        left: 0x7f5d25,
        right: 0xa57631,
        edge: 0xf1d490,
      });
    }

    const label = this.add
      .text(0, -def.renderHeight - ISO_TILE_HEIGHT * 0.35, def.emoji, {
        fontSize: building.type === 'WATCH_TOWER' ? '20px' : '18px',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 1)
      .setDepth(3);
    container.add(label);

    this.buildingSprites.set(building.id, container);
    this.gridContainer.add(container);
  }

  private addPrism(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    depth: number,
    height: number,
    palette: PrismPalette
  ) {
    const halfWidth = width / 2;
    const halfDepth = depth / 2;

    const left = this.add.polygon(
      x,
      y,
      [-halfWidth, -height, 0, -height + halfDepth, 0, halfDepth, -halfWidth, 0],
      palette.left,
      1
    );
    const right = this.add.polygon(
      x,
      y,
      [halfWidth, -height, 0, -height + halfDepth, 0, halfDepth, halfWidth, 0],
      palette.right,
      1
    );
    const top = this.add.polygon(
      x,
      y,
      [0, -height - halfDepth, halfWidth, -height, 0, -height + halfDepth, -halfWidth, -height],
      palette.top,
      1
    );

    left.setStrokeStyle(1, this.adjustColor(palette.left, 0.72), 0.45);
    right.setStrokeStyle(1, this.adjustColor(palette.right, 0.72), 0.45);
    top.setStrokeStyle(2, palette.edge, 0.5);

    container.add([left, right, top]);
  }

  private onTileHover(x: number, y: number) {
    if (x === this.lastTileX && y === this.lastTileY) return;

    this.lastTileX = x;
    this.lastTileY = y;

    const cell = this.terrain[y]?.[x];
    if (!cell) return;

    const position = this.projectTile(x, y, cell.height);
    const state = useGameStore.getState();

    if (state.selectedBuilding || state.selectedTerrainTool) {
      this.selectedTile?.setPosition(position.x, position.y).setVisible(true);
      this.hoverTile?.setVisible(false);
    } else {
      this.hoverTile?.setPosition(position.x, position.y).setVisible(true);
      this.selectedTile?.setVisible(false);
    }
  }

  private onTileOut(_x: number, _y: number) {
    this.hoverTile?.setVisible(false);
    this.selectedTile?.setVisible(false);
    this.lastTileX = -1;
    this.lastTileY = -1;
  }

  private onTileClick(x: number, y: number) {
    const state = useGameStore.getState();
    const cell = this.terrain[y]?.[x];
    if (!cell) return;

    if (state.selectedTerrainTool === 'raise') {
      const raised = state.raiseTerrain(x, y, cell.height);
      if (raised) {
        this.updateTerrainHeight(x, y, cell.height + 1, '#7dd3fc');
      }
      return;
    }

    if (state.selectedTerrainTool === 'lower') {
      const lowered = state.lowerTerrain(x, y, cell.height);
      if (lowered) {
        this.updateTerrainHeight(x, y, cell.height - 1, '#c084fc');
      }
      return;
    }

    if (!state.selectedBuilding) return;

    const placed = state.placeBuilding(state.selectedBuilding, x, y);
    if (!placed) return;

    const position = this.projectTile(x, y, cell.height);
    this.spawnPulse(position.x, position.y, 0xffdc73, 0.18);

    const screen = this.worldToScreen(position.x, position.y - 18);
    this.game.events.emit('floatingText', {
      x: screen.x,
      y: screen.y,
      text: `+${BUILDING_DEFINITIONS[state.selectedBuilding].name}`,
      color: '#8cffb6',
    });
  }

  private onTileRightClick(x: number, y: number) {
    const state = useGameStore.getState();
    const building = state.buildings.find(existing => existing.x === x && existing.y === y);
    if (!building) return;

    const cell = this.terrain[y]?.[x];
    if (cell) {
      const position = this.projectTile(x, y, cell.height);
      this.spawnPulse(position.x, position.y, 0xff5c5c, 0.2);
    }

    state.removeBuilding(building.id);
  }

  update(_time: number, delta: number) {
    const speed = (330 / this.cameras.main.zoom) * (delta / 1000);

    if (!this.cursors) return;

    if (this.cursors.left?.isDown || this.wasdKeys.A.isDown) {
      this.cameras.main.scrollX -= speed;
    }
    if (this.cursors.right?.isDown || this.wasdKeys.D.isDown) {
      this.cameras.main.scrollX += speed;
    }
    if (this.cursors.up?.isDown || this.wasdKeys.W.isDown) {
      this.cameras.main.scrollY -= speed;
    }
    if (this.cursors.down?.isDown || this.wasdKeys.S.isDown) {
      this.cameras.main.scrollY += speed;
    }
  }

  private onGameTick() {
    useGameStore.getState().processTick();
  }

  private saveState() {
    const state = useGameStore.getState();
    if (!state.playerId) return;

    saveGameState(state.playerId, {
      level: state.level,
      xp: state.xp,
      resources: state.resources,
      population: state.population,
      soldiers: state.soldiers,
      buildings: state.buildings,
      happiness: state.happiness,
      tick: state.tick,
      worldSeed: state.worldSeed,
      terrainEdits: state.terrainEdits,
    });
  }

  shutdown() {
    if (this.unsubscribe) this.unsubscribe();
    if (this.tickTimer) this.tickTimer.destroy();
    if (this.saveTimer) this.saveTimer.destroy();
    this.game.canvas.removeEventListener('contextmenu', this.contextMenuHandler);
    this.buildingSprites.clear();
    this.terrainSprites.clear();
  }

  private generateTerrain(seed: number): TerrainCell[][] {
    const terrainEdits = useGameStore.getState().terrainEdits;
    const terrain: TerrainCell[][] = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      terrain[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const ridge = this.sampleNoise(seed, x * 0.26, y * 0.26);
        const detail = this.sampleNoise(seed + 97, x * 0.58 + 9, y * 0.58 - 7);
        const plateau = this.sampleNoise(seed + 211, x * 0.14 - 5, y * 0.14 + 11);
        const combined = ridge * 0.54 + detail * 0.28 + plateau * 0.18;
        const height = Phaser.Math.Clamp(1 + Math.floor(combined * 4.4), 1, 5);

        let biome: TerrainBiome = 'meadow';
        if (height >= 4 && detail > 0.42) {
          biome = 'ridge';
        } else if (detail > 0.68) {
          biome = 'grove';
        } else if (plateau < 0.28) {
          biome = 'clay';
        }

        const editedHeight = terrainEdits[`${x},${y}`];
        terrain[y][x] = {
          x,
          y,
          height: typeof editedHeight === 'number' ? Phaser.Math.Clamp(editedHeight, 1, 6) : height,
          biome,
        };
      }
    }

    return terrain;
  }

  private updateTerrainHeight(x: number, y: number, nextHeight: number, color: string) {
    const current = this.terrain[y]?.[x];
    if (!current) return;

    const oldSprite = this.terrainSprites.get(`${x},${y}`);
    if (oldSprite) {
      oldSprite.destroy();
      this.terrainSprites.delete(`${x},${y}`);
    }

    this.terrain[y][x] = {
      ...current,
      height: Phaser.Math.Clamp(nextHeight, 1, 6),
    };

    this.maxTerrainHeight = Math.max(...this.terrain.flat().map(cell => cell.height));
    this.renderTerrainCell(this.terrain[y][x]);

    const building = useGameStore.getState().buildings.find(existing => existing.x === x && existing.y === y);
    if (building) {
      const sprite = this.buildingSprites.get(building.id);
      if (sprite) {
        sprite.destroy();
        this.buildingSprites.delete(building.id);
      }
      this.renderBuilding(building);
    }

    const position = this.projectTile(x, y, this.terrain[y][x].height);
    this.spawnPulse(position.x, position.y, Phaser.Display.Color.HexStringToColor(color).color, 0.2);
    const screen = this.worldToScreen(position.x, position.y - 18);
    this.game.events.emit('floatingText', {
      x: screen.x,
      y: screen.y,
      text: `${nextHeight > current.height ? 'Raise' : 'Lower'} terrain`,
      color,
    });
  }

  private projectTile(x: number, y: number, height: number) {
    return {
      x: this.worldOriginX + (x - y) * (ISO_TILE_WIDTH / 2),
      y: this.worldOriginY + (x + y) * (ISO_TILE_HEIGHT / 2) - height * TERRAIN_ELEVATION,
    };
  }

  private makeDiamondPoints(width: number, height: number) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    return [0, -halfHeight, halfWidth, 0, 0, halfHeight, -halfWidth, 0];
  }

  private spawnPulse(x: number, y: number, color: number, alpha: number) {
    const flash = this.add
      .polygon(x, y, this.makeDiamondPoints(ISO_TILE_WIDTH, ISO_TILE_HEIGHT), color, alpha)
      .setDepth(25000);
    flash.setStrokeStyle(2, color, 0.95);
    this.gridContainer.add(flash);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 320,
      onComplete: () => flash.destroy(),
    });
  }

  private worldToScreen(x: number, y: number) {
    const camera = this.cameras.main;
    return {
      x: (x - camera.worldView.x) * camera.zoom + camera.x,
      y: (y - camera.worldView.y) * camera.zoom + camera.y,
    };
  }

  private sampleNoise(seed: number, x: number, y: number) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = this.fade(x - x0);
    const ty = this.fade(y - y0);

    const n00 = this.hash(seed, x0, y0);
    const n10 = this.hash(seed, x0 + 1, y0);
    const n01 = this.hash(seed, x0, y0 + 1);
    const n11 = this.hash(seed, x0 + 1, y0 + 1);

    const nx0 = Phaser.Math.Linear(n00, n10, tx);
    const nx1 = Phaser.Math.Linear(n01, n11, tx);
    return Phaser.Math.Linear(nx0, nx1, ty);
  }

  private hash(seed: number, x: number, y: number) {
    const value = Math.sin(x * 127.1 + y * 311.7 + seed * 0.017) * 43758.5453123;
    return value - Math.floor(value);
  }

  private fade(value: number) {
    return value * value * (3 - 2 * value);
  }

  private adjustColor(color: number, factor: number) {
    const r = Phaser.Math.Clamp(Math.round(((color >> 16) & 0xff) * factor), 0, 255);
    const g = Phaser.Math.Clamp(Math.round(((color >> 8) & 0xff) * factor), 0, 255);
    const b = Phaser.Math.Clamp(Math.round((color & 0xff) * factor), 0, 255);
    return (r << 16) | (g << 8) | b;
  }
}
