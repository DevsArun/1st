/**
 * @file PreloadScene.js
 * @description Generates ALL textures procedurally — zero network requests.
 * No real asset files are needed. Game works instantly in Codespace.
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  create() {
    // Build all textures synchronously — no loading, no network calls
    this._makeAllTextures();
    this._buildAnimations();
    this._persistRegistry();

    // Go straight to MainMenu — no async loading needed
    this.scene.start('MainMenuScene');
  }

  // ── Texture factory ───────────────────────────────────────────────────

  _canvas(key, w, h) {
    if (this.textures.exists(key)) this.textures.remove(key);
    return this.textures.createCanvas(key, w, h);
  }

  _makeAllTextures() {
    this._makeBgSky();
    this._makeBgCity();
    this._makeBgMidground();
    this._makeBgForeground();
    this._makeMechTorso();
    this._makeMechWheel();
    this._makeObstacleCar();
    this._makeObstacleBuilding();
    this._makeObstacleBarrel();
    this._makeParticleSpark();
    this._makeParticleSmoke();
    this._makeParticleDebris();
    this._makePauseButton();
    this._makeLogo();
  }

  _makeBgSky() {
    const t = this._canvas('bg-sky', 1920, 860);
    const ctx = t.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, 860);
    grad.addColorStop(0,   '#c8781a');
    grad.addColorStop(0.5, '#d4950a');
    grad.addColorStop(1,   '#8b5014');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 860);
    // Sun
    const sunGrad = ctx.createRadialGradient(1400, 140, 0, 1400, 140, 90);
    sunGrad.addColorStop(0,   '#ffffcc');
    sunGrad.addColorStop(0.4, '#ffdd44');
    sunGrad.addColorStop(1,   'rgba(255,180,0,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(1400, 140, 90, 0, Math.PI * 2); ctx.fill();
    t.refresh();
  }

  _makeBgCity() {
    const t = this._canvas('bg-city', 1920, 860);
    const ctx = t.getContext();
    ctx.clearRect(0, 0, 1920, 860);
    ctx.fillStyle = 'rgba(80,50,20,0.55)';
    [[0,520,160,340],[150,480,100,380],[310,500,120,360],[500,460,150,400],
     [700,430,110,430],[900,400,80,460],[1100,450,160,410],[1320,420,100,440],
     [1540,440,80,420],[1720,460,110,400]].forEach(([x,y,w,h]) => ctx.fillRect(x, y, w, h));
    ctx.fillStyle = 'rgba(100,65,25,0.4)';
    ctx.beginPath(); ctx.moveTo(0,860);
    [[0,680],[300,580],[600,520],[900,580],[1200,540],[1500,600],[1920,560],[1920,860]].forEach(([x,y]) => ctx.lineTo(x,y));
    ctx.closePath(); ctx.fill();
    t.refresh();
  }

  _makeBgMidground() {
    const t = this._canvas('bg-midground', 1920, 860);
    const ctx = t.getContext();
    ctx.clearRect(0, 0, 1920, 860);
    ctx.fillStyle = 'rgba(60,38,14,0.6)';
    [[50,620,40,180],[300,590,60,220],[600,600,35,200],[900,570,65,230],[1200,590,50,210],[1500,600,55,200],[1750,580,60,200]].forEach(([x,y,w,h]) => ctx.fillRect(x, y, w, h));
    ctx.strokeStyle = 'rgba(60,38,14,0.45)'; ctx.lineWidth = 4;
    for (let px = 100; px < 1900; px += 280) {
      ctx.beginPath(); ctx.moveTo(px, 760); ctx.lineTo(px, 600); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px-30, 618); ctx.lineTo(px+30, 618); ctx.stroke();
    }
    t.refresh();
  }

  _makeBgForeground() {
    const t = this._canvas('bg-foreground', 1920, 860);
    const ctx = t.getContext();
    ctx.clearRect(0, 0, 1920, 860);
    ctx.fillStyle = 'rgba(50,30,10,0.65)';
    [[0,760,200,100],[400,770,150,90],[750,780,120,80],[1050,765,180,95],[1350,775,130,85],[1650,760,160,100]].forEach(([x,y,w,h]) => {
      ctx.beginPath(); ctx.ellipse(x+w/2, y+h/2, w/2, h/2, 0, 0, Math.PI*2); ctx.fill();
    });
    t.refresh();
  }

  _makeMechTorso() {
    const t = this._canvas('mech-torso', 160, 110);
    const ctx = t.getContext();
    ctx.fillStyle = '#445566'; ctx.fillRect(20, 15, 120, 80);
    ctx.fillStyle = '#2a3a4a'; ctx.fillRect(35, 20, 90, 45);
    ctx.fillStyle = '#00aaff'; ctx.fillRect(45, 22, 70, 14);
    ctx.fillStyle = '#334455'; ctx.fillRect(8, 15, 18, 55); ctx.fillRect(134, 15, 18, 55);
    ctx.fillStyle = '#ff4400'; ctx.fillRect(10, 55, 12, 28);
    t.refresh();
  }

  _makeMechWheel() {
    const t = this._canvas('mech-leg-l', 100, 100);
    const ctx = t.getContext();
    ctx.clearRect(0, 0, 100, 100);
    ctx.beginPath(); ctx.arc(50, 50, 44, 0, Math.PI*2);
    ctx.fillStyle = '#222'; ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const a = (i/4)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(50,50); ctx.lineTo(50+Math.cos(a)*40, 50+Math.sin(a)*40); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(50, 50, 10, 0, Math.PI*2);
    ctx.fillStyle = '#888'; ctx.fill();
    t.refresh();
  }

  _makeObstacleCar() {
    const t = this._canvas('obs-car', 164, 72);
    const ctx = t.getContext();
    ctx.fillStyle = '#5577aa'; ctx.fillRect(10, 26, 144, 40);
    ctx.fillStyle = '#446688'; ctx.fillRect(40, 8, 80, 24);
    ctx.fillStyle = 'rgba(180,220,255,0.5)'; ctx.fillRect(44, 10, 34, 18); ctx.fillRect(82, 10, 34, 18);
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(30,60,13,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(134,60,13,0,Math.PI*2); ctx.fill();
    t.refresh();
  }

  _makeObstacleBuilding() {
    const t = this._canvas('obs-building', 204, 310);
    const ctx = t.getContext();
    ctx.fillStyle = '#445533'; ctx.fillRect(10, 20, 184, 290);
    ctx.fillStyle = '#222';
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 4; col++)
        ctx.fillRect(22 + col*44, 40 + row*50, 28, 30);
    t.refresh();
  }

  _makeObstacleBarrel() {
    const t = this._canvas('obs-barrel', 52, 62);
    const ctx = t.getContext();
    ctx.fillStyle = '#7a5c2e'; ctx.fillRect(8, 4, 36, 54);
    ctx.strokeStyle = '#5a3c0e'; ctx.lineWidth = 3;
    [15, 30, 46].forEach(y => { ctx.beginPath(); ctx.moveTo(8,y); ctx.lineTo(44,y); ctx.stroke(); });
    t.refresh();
  }

  _makeParticleSpark() {
    const t = this._canvas('particle-spark', 16, 16);
    const ctx = t.getContext();
    const g = ctx.createRadialGradient(8,8,0,8,8,8);
    g.addColorStop(0,   'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,220,80,0.9)');
    g.addColorStop(1,   'rgba(255,100,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,16,16);
    t.refresh();
  }

  _makeParticleSmoke() {
    const t = this._canvas('particle-smoke', 48, 48);
    const ctx = t.getContext();
    const g = ctx.createRadialGradient(24,24,0,24,24,24);
    g.addColorStop(0,   'rgba(120,120,120,0.7)');
    g.addColorStop(0.6, 'rgba(80,80,80,0.3)');
    g.addColorStop(1,   'rgba(50,50,50,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,48,48);
    t.refresh();
  }

  _makeParticleDebris() {
    const t = this._canvas('particle-debris', 24, 16);
    const ctx = t.getContext();
    ctx.fillStyle = '#886644'; ctx.fillRect(0,0,24,16);
    t.refresh();
  }

  _makePauseButton() {
    const t = this._canvas('btn-pause', 64, 64);
    const ctx = t.getContext();
    ctx.beginPath(); ctx.arc(32,32,30,0,Math.PI*2);
    ctx.fillStyle = 'rgba(20,30,60,0.9)'; ctx.fill();
    ctx.strokeStyle = '#334488'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#aabbcc';
    ctx.fillRect(16,18,10,28); ctx.fillRect(38,18,10,28);
    t.refresh();
  }

  _makeLogo() {
    const t = this._canvas('logo', 2, 2); t.refresh();
  }

  _buildAnimations() {
    // No spritesheets — skip animation creation
  }

  _persistRegistry() {
    ['highScore','currency','upgradeEngine','upgradeArmor','upgradePlasma','sfxMuted','musicMuted']
      .forEach((k) => {
        try { localStorage.setItem(`mkr_${k}`, JSON.stringify(this.registry.get(k))); } catch {}
      });
  }
}
