/**
 * All visual assets in this game are generated procedurally at boot time using
 * Phaser's Graphics API. No external image files are used, so the project has
 * zero art-licensing dependencies and stays 100% free to ship.
 */
import Phaser from 'phaser';

function tex(scene, key, w, h, draw) {
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function generatePlayerParts(scene) {
  // Body parts drawn as separate small textures, composed into a rig by Player.js.
  // Each part now uses a base fill plus a highlight + shadow panel (simple
  // two-tone "cel shading") instead of one flat color, which reads as far
  // less toy-like while staying 100% procedural/vector - no external art.
  tex(scene, 'p_head', 30, 30, (g) => {
    g.fillStyle(0xffd9b3, 1); // base skin
    g.fillCircle(15, 16, 13);
    g.fillStyle(0xf0c295, 1); // jaw/underside shadow
    g.fillEllipse(15, 24, 20, 10);
    g.fillStyle(0xffe6c9, 1); // forehead highlight
    g.fillEllipse(12, 10, 12, 8);
    g.fillStyle(0x3b2417, 1); // hair base
    g.fillEllipse(15, 8, 24, 13);
    g.fillStyle(0x25150c, 1); // hair shadow (underside part)
    g.fillEllipse(20, 11, 12, 7);
    g.fillStyle(0x4a2e1c, 1); // hair highlight
    g.fillEllipse(9, 6, 10, 5);
    g.fillStyle(0xc98a5a, 1); // eyebrow
    g.fillRoundedRect(18, 12, 6, 2, 1);
    g.fillStyle(0x1c1c1c, 1);
    g.fillCircle(20, 16, 2.2); // eye
    g.fillStyle(0xffffff, 1);
    g.fillCircle(20.6, 15.4, 0.6); // eye glint
  });

  tex(scene, 'p_torso', 28, 36, (g) => {
    g.fillStyle(0x2f6fdb, 1); // base jacket
    g.fillRoundedRect(2, 0, 24, 32, 7);
    g.fillStyle(0x3b7de6, 1); // highlight panel (left/front)
    g.fillRoundedRect(3, 2, 9, 28, 5);
    g.fillStyle(0x1c4fa8, 1); // shadow panel (right/back)
    g.fillRoundedRect(18, 2, 8, 28, 5);
    g.fillStyle(0x163f8a, 1); // belt / waist band
    g.fillRoundedRect(2, 20, 24, 8, 3);
    g.lineStyle(1, 0x0f2c61, 1);
    g.lineBetween(14, 0, 14, 32); // center seam
    g.lineStyle(2, 0xe8c15a, 1);
    g.strokeRoundedRect(2, 0, 24, 32, 7);
  });

  tex(scene, 'p_arm', 11, 28, (g) => {
    g.fillStyle(0x2f6fdb, 1);
    g.fillRoundedRect(0, 0, 11, 19, 4);
    g.fillStyle(0x3b7de6, 1); // sleeve highlight edge
    g.fillRoundedRect(0, 0, 4, 19, 3);
    g.fillStyle(0x1c4fa8, 1); // sleeve shadow edge
    g.fillRoundedRect(7, 0, 4, 19, 3);
    g.fillStyle(0xe8c15a, 1); // cuff
    g.fillRect(0, 15, 11, 3);
    g.fillStyle(0xffd9b3, 1);
    g.fillCircle(5.5, 23, 5.5); // glove hand
    g.fillStyle(0xf0c295, 1);
    g.fillEllipse(7, 25, 5, 3); // hand shading
  });

  tex(scene, 'p_leg', 13, 30, (g) => {
    g.fillStyle(0x1c1c1c, 1); // base pants
    g.fillRoundedRect(0, 0, 13, 19, 3);
    g.fillStyle(0x2e2e2e, 1); // pant highlight
    g.fillRoundedRect(1, 0, 4, 19, 2);
    g.fillStyle(0x111111, 1); // pant shadow
    g.fillRoundedRect(9, 0, 4, 19, 2);
    g.fillStyle(0x111111, 1); // knee shading
    g.fillRect(0, 10, 13, 2);
    g.fillStyle(0x7a4a26, 1); // boot base
    g.fillRoundedRect(-1, 17, 15, 11, 3);
    g.fillStyle(0x8f5c33, 1); // boot highlight
    g.fillRoundedRect(-1, 17, 6, 11, 3);
    g.fillStyle(0x5a3a1f, 1); // sole
    g.fillRect(-1, 25, 15, 3);
  });

  tex(scene, 'p_sword', 9, 48, (g) => {
    g.fillStyle(0xc7c7d2, 1); // blade base
    g.fillRoundedRect(2, 0, 5, 35, 2);
    g.fillStyle(0xf1f1f6, 1); // blade highlight edge
    g.fillRect(2, 0, 2, 35);
    g.fillStyle(0x8f8f9c, 1); // blade shadow edge
    g.fillRect(6, 0, 1, 35);
    g.fillStyle(0x8a8a99, 1); // crossguard
    g.fillRect(0, 33, 9, 4);
    g.fillStyle(0xe8c15a, 1);
    g.fillRect(0, 33, 9, 1.5);
    g.fillStyle(0x3b2417, 1); // grip
    g.fillRect(2.5, 37, 4, 9);
    g.fillStyle(0xe8c15a, 1); // pommel
    g.fillCircle(4.5, 47, 2.5);
  });

  tex(scene, 'p_shield', 28, 32, (g) => {
    g.fillStyle(0x2f6fdb, 1);
    g.fillEllipse(14, 16, 26, 30);
    g.fillStyle(0x3b7de6, 1); // highlight sweep
    g.fillEllipse(9, 12, 12, 16);
    g.fillStyle(0x1c4fa8, 1); // shadow sweep
    g.fillEllipse(19, 20, 10, 14);
    g.fillStyle(0xe8c15a, 1);
    g.fillCircle(14, 16, 7.5);
    g.fillStyle(0xf5da95, 1);
    g.fillCircle(12, 14, 3);
    g.lineStyle(2, 0x123a7a, 1);
    g.strokeEllipse(14, 16, 26, 30);
  });
}

export function generateEnemyParts(scene) {
  // Skeleton Soldier / Archer (shared base look)
  tex(scene, 'sk_body', 26, 36, (g) => {
    g.fillStyle(0xEDEbe0, 1); // skull base
    g.fillRoundedRect(5, 0, 16, 15, 6);
    g.fillStyle(0xd9d6c8, 1); // skull shadow (right side)
    g.fillRoundedRect(14, 0, 7, 15, 5);
    g.fillStyle(0x2a2a2a, 1); // eye sockets (deep)
    g.fillCircle(10, 7, 3.2);
    g.fillCircle(16, 7, 3.2);
    g.fillStyle(0x0d0d0d, 1);
    g.fillCircle(10, 7, 1.6);
    g.fillCircle(16, 7, 1.6);
    g.fillStyle(0xc9c6b8, 1); // jaw crack line
    g.fillRect(9, 12, 8, 1);
    g.fillStyle(0xEDEbe0, 1); // ribcage base
    g.fillRoundedRect(3, 15, 20, 18, 4);
    g.fillStyle(0xd9d6c8, 1); // ribcage shadow side
    g.fillRoundedRect(15, 15, 8, 18, 4);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(i % 2 === 0 ? 0xc9c6b8 : 0xdedbcd, 1);
      g.fillRect(5, 18 + i * 3.4, 16, 1.6);
    }
  });
  tex(scene, 'sk_limb', 9, 22, (g) => {
    g.fillStyle(0xEDEbe0, 1);
    g.fillRoundedRect(0, 0, 9, 22, 3);
    g.fillStyle(0xd9d6c8, 1); // shadow edge
    g.fillRoundedRect(6, 0, 3, 22, 2);
    g.fillStyle(0x2a2a2a, 1); // joint shading rings
    g.fillRect(0, 4, 9, 1.4);
    g.fillRect(0, 17, 9, 1.4);
  });
  tex(scene, 'sk_sword', 7, 38, (g) => {
    g.fillStyle(0xa8a8b2, 1);
    g.fillRect(2, 0, 3, 27);
    g.fillStyle(0xd0d0da, 1); // blade highlight
    g.fillRect(2, 0, 1, 27);
    g.fillStyle(0x5a4632, 1);
    g.fillRect(0, 25, 7, 3);
    g.fillRect(2.5, 28, 2, 9);
  });
  tex(scene, 'sk_bow', 6, 30, (g) => {
    g.lineStyle(3, 0x6a4a2a, 1);
    g.beginPath();
    g.arc(0, 15, 15, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(60));
    g.strokePath();
  });
  tex(scene, 'arrow', 18, 4, (g) => {
    g.fillStyle(0x6a4a2a, 1);
    g.fillRect(0, 1, 14, 2);
    g.fillStyle(0x2a2a2a, 1);
    g.fillTriangle(14, 0, 18, 2, 14, 4);
  });

  // Captain (mini boss / main villain) - larger, gold-trimmed armor plating
  tex(scene, 'cap_body', 38, 50, (g) => {
    g.fillStyle(0xEDEbe0, 1); // skull base
    g.fillRoundedRect(8, 0, 22, 19, 8);
    g.fillStyle(0xd9d6c8, 1); // skull shadow side
    g.fillRoundedRect(20, 0, 10, 19, 6);
    g.fillStyle(0x1a1a1a, 1); // eye sockets
    g.fillCircle(15, 9, 3.6);
    g.fillCircle(23, 9, 3.6);
    g.fillStyle(0xb8161f, 1); // glowing red eyes - the mark of the villain
    g.fillCircle(15, 9, 1.8);
    g.fillCircle(23, 9, 1.8);
    g.fillStyle(0xEDEbe0, 1); // armored ribcage
    g.fillRoundedRect(2, 19, 34, 25, 6);
    g.fillStyle(0xd9d6c8, 1); // ribcage shadow side
    g.fillRoundedRect(24, 19, 12, 25, 6);
    g.fillStyle(0x3a3a3a, 1); // dark iron chest plate
    g.fillRoundedRect(9, 24, 20, 16, 4);
    g.fillStyle(0x505050, 1); // chest plate highlight
    g.fillRoundedRect(9, 24, 8, 16, 3);
    g.fillStyle(0xe8c15a, 1); // shoulder pauldrons
    g.fillRoundedRect(0, 20, 10, 9, 4);
    g.fillRoundedRect(28, 20, 10, 9, 4);
    g.fillStyle(0xb8942f, 1);
    g.fillRoundedRect(0, 26, 10, 3, 2);
    g.fillRoundedRect(28, 26, 10, 3, 2);
    g.lineStyle(2, 0xe8c15a, 1);
    g.strokeRoundedRect(2, 19, 34, 25, 6);
  });
  tex(scene, 'cap_limb', 11, 28, (g) => {
    g.fillStyle(0xEDEbe0, 1);
    g.fillRoundedRect(0, 0, 11, 28, 3);
    g.fillStyle(0xd9d6c8, 1); // shadow edge
    g.fillRoundedRect(7, 0, 4, 28, 2);
    g.fillStyle(0x3a3a3a, 1); // armor band (bracer/greave)
    g.fillRect(0, 9, 11, 5);
    g.fillStyle(0xe8c15a, 1);
    g.fillRect(0, 9, 11, 1.5);
    g.fillRect(0, 12.5, 11, 1.5);
  });
  tex(scene, 'cap_sword', 12, 62, (g) => {
    g.fillStyle(0xc7c7d2, 1);
    g.fillRect(3, 0, 5, 45);
    g.fillStyle(0xf1f1f6, 1); // blade highlight
    g.fillRect(3, 0, 2, 45);
    g.fillStyle(0x8f8f9c, 1); // blade shadow
    g.fillRect(7, 0, 1, 45);
    g.fillStyle(0xe8c15a, 1); // ornate crossguard
    g.fillRect(0, 43, 12, 5);
    g.fillStyle(0xb8942f, 1);
    g.fillRect(0, 46, 12, 2);
    g.fillStyle(0x3a2a1a, 1); // grip
    g.fillRect(4, 48, 4, 11);
    g.fillStyle(0xe8c15a, 1); // pommel jewel
    g.fillCircle(6, 60, 3);
    g.fillStyle(0xb8161f, 1);
    g.fillCircle(6, 60, 1.4);
  });

  // Hero's gold crown - worn on top of the head
  tex(scene, 'p_crown', 26, 18, (g) => {
    g.fillStyle(0xe8c15a, 1);
    g.fillRect(3, 8, 20, 7);
    g.fillTriangle(3, 8, 7, 0, 11, 8);
    g.fillTriangle(9, 8, 13, -3, 17, 8);
    g.fillTriangle(15, 8, 19, 0, 23, 8);
    g.fillStyle(0xb8161f, 1);
    g.fillCircle(13, 4, 2.4);
    g.lineStyle(1, 0x8a6414, 1);
    g.strokeRect(3, 8, 20, 7);
  });

  // Villain's devil crown - dark iron crown with curled horns, worn by the Skeleton Captain
  tex(scene, 'cap_devilcrown', 34, 26, (g) => {
    g.fillStyle(0x2a2a2a, 1);
    g.fillRect(6, 12, 22, 7);
    g.fillTriangle(6, 12, 10, 4, 14, 12);
    g.fillTriangle(13, 12, 17, 0, 21, 12);
    g.fillTriangle(20, 12, 24, 4, 28, 12);
    g.fillStyle(0xb8161f, 1);
    g.fillCircle(17, 8, 2.2);
    // curled horns sweeping out from the sides
    g.lineStyle(3, 0x1c1c1c, 1);
    g.beginPath();
    g.arc(4, 16, 9, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(320));
    g.strokePath();
    g.beginPath();
    g.arc(30, 16, 9, Phaser.Math.DegToRad(-140), Phaser.Math.DegToRad(-20));
    g.strokePath();
  });
}

export function generateWorldTextures(scene) {
  // Parallax sky gradient
  tex(scene, 'bg_sky', 800, 600, (g) => {
    g.fillGradientStyle(0x8fd3ff, 0x8fd3ff, 0xd7f2ff, 0xfff6d6, 1);
    g.fillRect(0, 0, 800, 600);
  });

  tex(scene, 'bg_mountains', 900, 400, (g) => {
    g.fillStyle(0x9fb8d9, 0.9);
    for (let i = 0; i < 6; i++) {
      const bx = i * 170 - 40;
      g.fillTriangle(bx, 400, bx + 140, 150, bx + 280, 400);
    }
  });

  tex(scene, 'bg_forest', 900, 350, (g) => {
    g.fillStyle(0x4f8f5a, 0.95);
    for (let i = 0; i < 9; i++) {
      const bx = i * 110;
      g.fillTriangle(bx, 350, bx + 55, 120, bx + 110, 350);
    }
  });

  tex(scene, 'cloud', 90, 40, (g) => {
    g.fillStyle(0xffffff, 0.9);
    g.fillEllipse(20, 22, 40, 22);
    g.fillEllipse(45, 15, 45, 26);
    g.fillEllipse(68, 24, 34, 18);
  });

  tex(scene, 'ground', 64, 64, (g) => {
    g.fillStyle(0x6fbf5e, 1);
    g.fillRect(0, 0, 64, 18);
    g.fillStyle(0x7a5232, 1);
    g.fillRect(0, 18, 64, 46);
    g.fillStyle(0x87c975, 1);
    g.fillRect(0, 0, 64, 6);
  });

  tex(scene, 'platform', 96, 24, (g) => {
    g.fillStyle(0x6fbf5e, 1);
    g.fillRoundedRect(0, 0, 96, 24, 8);
    g.fillStyle(0x7a5232, 1);
    g.fillRoundedRect(0, 10, 96, 14, 6);
  });

  tex(scene, 'tree', 120, 220, (g) => {
    g.fillStyle(0x6b4226, 1);
    g.fillRect(50, 100, 20, 120);
    g.fillStyle(0x3f8f4c, 1);
    g.fillCircle(60, 90, 55);
    g.fillStyle(0x59b364, 1);
    g.fillCircle(35, 70, 35);
    g.fillCircle(90, 75, 32);
  });

  tex(scene, 'waterfall', 40, 260, (g) => {
    g.fillStyle(0xbfeaff, 0.85);
    g.fillRect(0, 0, 40, 260);
    g.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 8; i++) g.fillRect(i * 5, 0, 2, 260);
  });

  tex(scene, 'coin', 20, 20, (g) => {
    g.fillStyle(0xffd94a, 1);
    g.fillCircle(10, 10, 9);
    g.fillStyle(0xffef9e, 1);
    g.fillCircle(10, 10, 5);
    g.lineStyle(2, 0xb8860b, 1);
    g.strokeCircle(10, 10, 9);
  });

  tex(scene, 'gem', 20, 22, (g) => {
    g.fillStyle(0x37e0e0, 1);
    g.fillTriangle(10, 0, 0, 9, 10, 22);
    g.fillTriangle(10, 0, 20, 9, 10, 22);
    g.fillStyle(0xb6fbfb, 1);
    g.fillTriangle(10, 3, 4, 9, 10, 16);
  });

  tex(scene, 'heart', 20, 18, (g) => {
    g.fillStyle(0xe8425a, 1);
    g.fillCircle(6, 6, 6);
    g.fillCircle(14, 6, 6);
    g.fillTriangle(0, 8, 20, 8, 10, 18);
  });

  tex(scene, 'spike', 24, 20, (g) => {
    g.fillStyle(0x8a8a99, 1);
    for (let i = 0; i < 3; i++) g.fillTriangle(i * 8, 20, i * 8 + 4, 0, i * 8 + 8, 20);
  });

  tex(scene, 'particle_dust', 8, 8, (g) => {
    g.fillStyle(0xd7c79a, 0.8);
    g.fillCircle(4, 4, 4);
  });

  tex(scene, 'particle_spark', 8, 8, (g) => {
    g.fillStyle(0xfff2b0, 1);
    g.fillCircle(4, 4, 4);
  });

  tex(scene, 'checkpoint', 20, 60, (g) => {
    g.fillStyle(0x7a5232, 1);
    g.fillRect(8, 0, 4, 60);
    g.fillStyle(0xe8c15a, 1);
    g.fillTriangle(12, 4, 12, 24, 0, 14);
  });

  tex(scene, 'goal_gate', 60, 140, (g) => {
    g.fillStyle(0xb98a3a, 1);
    g.fillRoundedRect(0, 0, 60, 140, 10);
    g.fillStyle(0xe8c15a, 1);
    g.fillRoundedRect(6, 6, 48, 128, 8);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(30, 40, 16);
  });

  // --- New enemy props for Level 2/3 -----------------------------------
  tex(scene, 'wiz_staff', 8, 42, (g) => {
    g.fillStyle(0x4a2e1c, 1);
    g.fillRect(3, 6, 2, 36);
    g.fillStyle(0x9b5de5, 1);
    g.fillCircle(4, 5, 5);
    g.fillStyle(0xd8b8ff, 1);
    g.fillCircle(4, 5, 2.4);
  });
  tex(scene, 'fireball', 18, 18, (g) => {
    g.fillStyle(0xb8161f, 1);
    g.fillCircle(9, 9, 8);
    g.fillStyle(0xff7a2e, 1);
    g.fillCircle(9, 9, 5.5);
    g.fillStyle(0xffe08a, 1);
    g.fillCircle(9, 9, 2.5);
  });
  tex(scene, 'iceball', 18, 18, (g) => {
    g.fillStyle(0x1c6fb0, 1);
    g.fillCircle(9, 9, 8);
    g.fillStyle(0x5fc7ff, 1);
    g.fillCircle(9, 9, 5.5);
    g.fillStyle(0xe4f8ff, 1);
    g.fillCircle(9, 9, 2.5);
  });
  tex(scene, 'bomb', 16, 20, (g) => {
    g.fillStyle(0x1c1c1c, 1);
    g.fillCircle(8, 12, 7);
    g.fillStyle(0x3a3a3a, 1);
    g.fillCircle(6, 10, 3);
    g.fillStyle(0x5a3a1f, 1);
    g.fillRect(7, 1, 2, 5);
    g.fillStyle(0xff7a2e, 1);
    g.fillCircle(8, 1, 2);
  });
  tex(scene, 'bat_body', 30, 22, (g) => {
    g.fillStyle(0x2a2a2a, 1);
    g.fillTriangle(0, 11, 12, 2, 12, 20);
    g.fillTriangle(30, 11, 18, 2, 18, 20);
    g.fillStyle(0xEDEbe0, 1);
    g.fillCircle(15, 11, 8);
    g.fillStyle(0xd9d6c8, 1);
    g.fillCircle(19, 11, 5);
    g.fillStyle(0xb8161f, 1);
    g.fillCircle(12, 9, 1.6);
    g.fillCircle(18, 9, 1.6);
  });
  tex(scene, 'trap_marker', 24, 20, (g) => {
    g.fillStyle(0xb8161f, 0.5);
    g.fillTriangle(12, 0, 22, 18, 2, 18);
    g.lineStyle(2, 0xb8161f, 0.9);
    g.strokeTriangle(12, 0, 22, 18, 2, 18);
    g.fillStyle(0xffffff, 1);
    g.fillRect(11, 5, 2, 7);
    g.fillRect(11, 13, 2, 2);
  });
  tex(scene, 'lava_pool', 64, 24, (g) => {
    g.fillStyle(0x8a1a0a, 1);
    g.fillRoundedRect(0, 6, 64, 18, 6);
    g.fillStyle(0xff5a1f, 1);
    g.fillEllipse(16, 12, 14, 8);
    g.fillEllipse(40, 10, 12, 7);
    g.fillStyle(0xffb347, 1);
    g.fillCircle(16, 12, 3);
    g.fillCircle(40, 10, 2.5);
  });
  tex(scene, 'crystal_deco', 40, 70, (g) => {
    g.fillStyle(0x6fd3e0, 0.85);
    g.fillTriangle(20, 0, 40, 70, 0, 70);
    g.fillStyle(0xc7f5ff, 0.6);
    g.fillTriangle(20, 10, 30, 70, 10, 70);
  });
}

export function generateAllTextures(scene) {
  generatePlayerParts(scene);
  generateEnemyParts(scene);
  generateWorldTextures(scene);
}
