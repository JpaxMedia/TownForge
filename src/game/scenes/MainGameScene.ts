import Phaser from 'phaser';
import { GRID_SIZE, TILE_SIZE, TICK_INTERVAL, BUILDING_DEFINITIONS } from '../config';
import { BuildingType, PlacedBuilding } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { saveGameState } from '../../services/worldService';

export class MainGameScene extends Phaser.Scene {
  private tiles: Phaser.GameObjects.Image[][] = [];
  private buildingSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private hoverTile: Phaser.GameObjects.Image | null = null;
  private selectedTile: Phaser.GameObjects.Image | null = null;
  private tickTimer: Phaser.Time.TimerEvent | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private lastTileX = -1;
  private lastTileY = -1;
  private gridContainer!: Phaser.GameObjects.Container;
  private unsubscribe: (() => void) | null = null;
  private saveTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'MainGameScene' });
  }

  create() {
    this.gridContainer = this.add.container(0, 0);

    this.createGrid();
    this.setupCamera();
    this.setupInput();
    this.setupTick();
    this.setupStoreSync();

    // Start UI scene in parallel
    this.scene.launch('UIScene');

    // Initial render of existing buildings
    const state = useGameStore.getState();
    for (const b of state.buildings) {
      this.renderBuilding(b);
    }

    // Save every 30 seconds
    this.saveTimer = this.time.addEvent({
      delay: 30000,
      loop: true,
      callback: this.saveState,
      callbackScope: this,
    });
  }

  private createGrid() {
    this.tiles = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const tile = this.add.image(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 'grass')
          .setOrigin(0.5)
          .setInteractive();
        this.gridContainer.add(tile);

        tile.on('pointerover', () => this.onTileHover(x, y));
        tile.on('pointerout', () => this.onTileOut(x, y));
        tile.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
          if (ptr.rightButtonDown()) {
            this.onTileRightClick(x, y);
          } else {
            this.onTileClick(x, y);
          }
        });

        this.tiles[y][x] = tile;
      }
    }

    // Hover overlay
    this.hoverTile = this.add.image(0, 0, 'hover').setOrigin(0.5).setVisible(false).setDepth(10);
    this.gridContainer.add(this.hoverTile);

    // Selected overlay
    this.selectedTile = this.add.image(0, 0, 'selected').setOrigin(0.5).setVisible(false).setDepth(10);
    this.gridContainer.add(this.selectedTile);
  }

  private setupCamera() {
    const totalW = GRID_SIZE * TILE_SIZE;
    const totalH = GRID_SIZE * TILE_SIZE;
    this.cameras.main.setBounds(
      -this.scale.width / 2,
      -this.scale.height / 2,
      totalW + this.scale.width,
      totalH + this.scale.height
    );
    this.cameras.main.centerOn(totalW / 2, totalH / 2);
    this.cameras.main.setZoom(1);
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

    // Mouse wheel zoom
    this.input.on('wheel', (_ptr: Phaser.Input.Pointer, _gameObjects: unknown, _deltaX: number, deltaY: number) => {
      const cam = this.cameras.main;
      const zoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.4, 2.5);
      cam.setZoom(zoom);
    });

    // Context menu disable
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
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
    // Subscribe to store changes to re-render buildings
    this.unsubscribe = useGameStore.subscribe((state, prev) => {
      if (state.buildings !== prev.buildings) {
        this.syncBuildings(state.buildings);
      }
    });
  }

  private syncBuildings(buildings: PlacedBuilding[]) {
    // Remove sprites not in state
    const ids = new Set(buildings.map(b => b.id));
    for (const [id, sprite] of this.buildingSprites) {
      if (!ids.has(id)) {
        sprite.destroy();
        this.buildingSprites.delete(id);
      }
    }
    // Add new buildings
    for (const b of buildings) {
      if (!this.buildingSprites.has(b.id)) {
        this.renderBuilding(b);
      }
    }
  }

  private renderBuilding(b: PlacedBuilding) {
    const px = b.x * TILE_SIZE + TILE_SIZE / 2;
    const py = b.y * TILE_SIZE + TILE_SIZE / 2;

    const container = this.add.container(px, py);
    container.setDepth(5);

    // Building sprite
    const textureKey = b.type as string;
    let sprite: Phaser.GameObjects.Image;
    if (this.textures.exists(textureKey)) {
      sprite = this.add.image(0, 0, textureKey).setOrigin(0.5);
    } else {
      // Fallback colored rectangle
      const g = this.add.graphics();
      const def = BUILDING_DEFINITIONS[b.type];
      g.fillStyle(def.color);
      g.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
      sprite = this.add.image(0, 0, 'grass').setAlpha(0); // invisible placeholder
      container.add(g);
    }

    container.add(sprite);

    // Building emoji label
    const def = BUILDING_DEFINITIONS[b.type];
    const label = this.add.text(0, -TILE_SIZE / 2 + 4, def.emoji, {
      fontSize: '16px',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setDepth(6);
    container.add(label);

    this.buildingSprites.set(b.id, container);
    this.gridContainer.add(container);
  }

  private onTileHover(x: number, y: number) {
    if (x === this.lastTileX && y === this.lastTileY) return;
    this.lastTileX = x;
    this.lastTileY = y;

    const px = x * TILE_SIZE + TILE_SIZE / 2;
    const py = y * TILE_SIZE + TILE_SIZE / 2;

    const state = useGameStore.getState();
    if (state.selectedBuilding) {
      this.selectedTile!.setPosition(px, py).setVisible(true);
      this.hoverTile!.setVisible(false);
    } else {
      this.hoverTile!.setPosition(px, py).setVisible(true);
      this.selectedTile!.setVisible(false);
    }
  }

  private onTileOut(_x: number, _y: number) {
    this.hoverTile!.setVisible(false);
    this.selectedTile!.setVisible(false);
    this.lastTileX = -1;
    this.lastTileY = -1;
  }

  private onTileClick(x: number, y: number) {
    const state = useGameStore.getState();
    if (!state.selectedBuilding) return;

    const placed = state.placeBuilding(state.selectedBuilding, x, y);
    if (placed) {
      // Flash effect
      const px = x * TILE_SIZE + TILE_SIZE / 2;
      const py = y * TILE_SIZE + TILE_SIZE / 2;
      const flash = this.add.image(px, py, 'selected').setDepth(20).setAlpha(0.8);
      this.gridContainer.add(flash);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 400,
        onComplete: () => flash.destroy(),
      });

      // Floating text
      const worldPt = this.cameras.main.getWorldPoint(0, 0);
      const screenX = (px - worldPt.x) * this.cameras.main.zoom + this.scale.width / 2;
      const screenY = (py - worldPt.y) * this.cameras.main.zoom + this.scale.height / 2;
      this.game.events.emit('floatingText', {
        x: screenX,
        y: screenY,
        text: `+${BUILDING_DEFINITIONS[state.selectedBuilding].name}`,
        color: '#00ff88',
      });
    }
  }

  private onTileRightClick(x: number, y: number) {
    const state = useGameStore.getState();
    const building = state.buildings.find(b => b.x === x && b.y === y);
    if (building) {
      // Confirm removal effect
      const px = x * TILE_SIZE + TILE_SIZE / 2;
      const py = y * TILE_SIZE + TILE_SIZE / 2;
      const flash = this.add.image(px, py, 'selected').setDepth(20).setAlpha(0.8).setTint(0xff0000);
      this.gridContainer.add(flash);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 400,
        onComplete: () => flash.destroy(),
      });
      state.removeBuilding(building.id);
    }
  }

  update(_time: number, delta: number) {
    const speed = (300 / this.cameras.main.zoom) * (delta / 1000);

    if (this.cursors) {
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
  }

  private onGameTick() {
    const state = useGameStore.getState();
    state.processTick();
  }

  private saveState() {
    const state = useGameStore.getState();
    if (state.playerId) {
      saveGameState(state.playerId, {
        level: state.level,
        xp: state.xp,
        resources: state.resources,
        population: state.population,
        soldiers: state.soldiers,
        buildings: state.buildings,
        happiness: state.happiness,
        tick: state.tick,
      });
    }
  }

  shutdown() {
    if (this.unsubscribe) this.unsubscribe();
    if (this.tickTimer) this.tickTimer.destroy();
    if (this.saveTimer) this.saveTimer.destroy();
  }
}
