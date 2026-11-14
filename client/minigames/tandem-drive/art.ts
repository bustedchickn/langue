import { beatMs, gateDistance, gateWordsFor, laneX, stages, switchDistance, type DriveView } from '../../../shared/minigames/tandem-drive'

const carImage = typeof Image === 'undefined' ? undefined : new Image()
if (carImage) carImage.src = '/lostintranslationcar.png'
const roadImage = typeof Image === 'undefined' ? undefined : new Image()
if (roadImage) roadImage.src = '/lostintranslationroad.png'
const crateImage = typeof Image === 'undefined' ? undefined : new Image()
if (crateImage) crateImage.src = '/lostintranslationcrates.png'
const correctGateImage = typeof Image === 'undefined' ? undefined : new Image()
if (correctGateImage) correctGateImage.src = '/lostintranslationcargamecorrect.png'
const incorrectGateImage = typeof Image === 'undefined' ? undefined : new Image()
if (incorrectGateImage) incorrectGateImage.src = '/lostintranslationcargameincorrect.png'
const cratePink = '#f26a8d'
const crateLightPink = '#fdb7ea'
// Two full dash cycles, cut in the gaps so repeated tiles join cleanly.
const ROAD_TILE_Y = 375
const ROAD_TILE_HEIGHT = 740

// Canvas artwork adapted from the supplied Tandem Drive prototype.
export function drawCourse(ctx: CanvasRenderingContext2D, view: DriveView, text: (label: string) => string) {
  const palette = view.map
  const ROAD_HALF_WIDTH = 240
  const FINISH_Y = -stages * gateDistance
  const car = { x: view.x, y: -view.distance, angle: view.angle }
  const staticObstacles = view.hazards
  const linguisticGates = [{
    y: -(view.stage + 1) * gateDistance,
    lanes: gateWordsFor(view.stage, view.language).map((word, i) => ({ x: laneX[i], w: 112, word, safe: view.role === 'navigation' && view.gate === i })),
  }]
  ctx.fillStyle = palette.background
  ctx.fillRect(0, 0, 500, 378)
  ctx.save()
  ctx.translate(250, 290 - car.y)
  drawRoad()
  if (view.stage > 0) {
    const clearedY = -view.stage * gateDistance
    ctx.fillStyle = '#34d39955'
    ctx.fillRect(-ROAD_HALF_WIDTH + 4, clearedY - 14, ROAD_HALF_WIDTH * 2 - 8, 28)
    ctx.fillStyle = '#6ee7b7'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(text('CLEARED'), 0, clearedY + 4)
  }
  drawStaticObstacles()
  if (view.stage === stages - 1) {
    const tileSize = 22.5
    const cols = Math.floor(ROAD_HALF_WIDTH * 2 / tileSize)
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#10b981' : '#0f172a'
        ctx.fillRect(-ROAD_HALF_WIDTH + col * tileSize, FINISH_Y - 88 + row * tileSize, tileSize, tileSize)
      }
    }
    ctx.fillStyle = '#34d399'
    ctx.font = '800 18px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(text('▲ NORTH FINISH // EXTRACTION ZONE ▲'), 0, FINISH_Y - 100)
  }
  if (view.gateKind === 'lane') drawLinguisticGates(view.role === 'navigation')
  else {
    const y = -(view.stage + 1) * gateDistance
    const beat = view.role === 'cadence' ? Math.floor((view.serverNow - view.beatStartsAt) / beatMs) % 4 : -1
    const cycleOpen = view.role === 'cadence' && (beat === view.openBeat || beat === (view.openBeat + 1) % 4)
    ctx.fillStyle = cycleOpen ? '#82e5e9' : cratePink
    ctx.fillRect(-236, y - 14, 472, 28)
    ctx.strokeStyle = cycleOpen ? '#176b57' : crateLightPink
    ctx.strokeRect(-236, y - 14, 472, 28)
    ctx.fillStyle = '#3a2231'
    ctx.font = 'bold 13px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(text('CYCLING SHUTTER'), 0, y + 4)
  }
  const gateY = -(view.stage + 1) * gateDistance
  if (view.unlockedUntil > view.serverNow) {
    ctx.save()
    ctx.shadowBlur = 14
    ctx.shadowColor = '#34d399'
    ctx.fillStyle = '#6ee7b7'
    ctx.fillRect(-ROAD_HALF_WIDTH + 4, gateY - 17, ROAD_HALF_WIDTH * 2 - 8, 3)
    ctx.restore()
  }
  if (view.left !== view.right) {
    const side = view.left ? 34 : -34
    const pivotX = car.x - Math.sin(car.angle) * side
    const pivotY = car.y + Math.cos(car.angle) * side
    ctx.strokeStyle = view.left ? '#fbbf24' : '#8b5cf6'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(car.x, car.y)
    ctx.lineTo(pivotX, pivotY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.arc(pivotX, pivotY, 9, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (view.switchAhead) {
    const y = -switchDistance
    ctx.fillStyle = 'rgba(167, 139, 250, .25)'
    ctx.fillRect(-240, y - 12, 480, 24)
    ctx.fillStyle = '#ddd6fe'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(text('⇄ SIDE SWITCH'), 0, y + 4)
  }
  drawCar()
  if ((view.left || view.right) && !view.blocked) {
    ctx.save()
    ctx.translate(car.x, car.y)
    ctx.rotate(car.angle)
    for (const [on, side, color] of [[view.left, -1, '#fbbf24'], [view.right, 1, '#8b5cf6']] as const) {
      if (!on) continue
      for (let i = 0; i < 5; i++) {
        const age = ((view.serverNow / 140) + i / 5) % 1
        ctx.fillStyle = color
        ctx.globalAlpha = (1 - age) * .75
        ctx.fillRect(-35 - age * 22, side * 15 + Math.sin(i * 3) * age * 8, 3, 3)
      }
    }
    ctx.restore()
  }
  ctx.restore()

  function drawRoad() {
    const topY = FINISH_Y - 500;
    const botY = 300;
    const height = botY - topY;

    ctx.fillStyle = '#8be4e6';
    ctx.fillRect(-ROAD_HALF_WIDTH, topY, ROAD_HALF_WIDTH * 2, height);
    if (roadImage?.complete && roadImage.naturalWidth) {
      const tileHeight = ROAD_HALF_WIDTH * 2 * ROAD_TILE_HEIGHT / roadImage.naturalWidth
      const viewTop = Math.max(topY, car.y - 290)
      const viewBottom = Math.min(botY, car.y + 88)
      ctx.save()
      ctx.beginPath()
      ctx.rect(-ROAD_HALF_WIDTH, topY, ROAD_HALF_WIDTH * 2, height)
      ctx.clip()
      for (let y = Math.floor(viewTop / tileHeight) * tileHeight; y < viewBottom; y += tileHeight) {
        ctx.drawImage(roadImage, 0, ROAD_TILE_Y, roadImage.naturalWidth, ROAD_TILE_HEIGHT,
          -ROAD_HALF_WIDTH, y, ROAD_HALF_WIDTH * 2, tileHeight)
      }
      ctx.restore()
    }

    // Left and right road guardrails match the players' yellow and purple controls.
    ctx.lineWidth = 6;
    ctx.strokeStyle = palette.leftRail;
    ctx.beginPath();
    ctx.moveTo(-ROAD_HALF_WIDTH, topY);
    ctx.lineTo(-ROAD_HALF_WIDTH, botY);
    ctx.stroke();

    ctx.strokeStyle = palette.rightRail;
    ctx.beginPath();
    ctx.moveTo(ROAD_HALF_WIDTH, topY);
    ctx.lineTo(ROAD_HALF_WIDTH, botY);
    ctx.stroke();
  }

  function drawStaticObstacles() {
    for (const obs of staticObstacles) {
      ctx.save();
      const x = obs.x - obs.w / 2;
      const y = obs.y - obs.h / 2;
      if (obs.shape === 'drum') {
        ctx.beginPath()
        ctx.arc(obs.x, obs.y, obs.w / 2, 0, Math.PI * 2)
      } else {
        roundRect(ctx, x, y, obs.w, obs.h, obs.shape === 'rail' ? 3 : 8);
      }
      ctx.save();
      ctx.clip();
      if (crateImage?.complete && crateImage.naturalWidth) {
        ctx.imageSmoothingEnabled = false;
        const tile = Math.min(obs.w, obs.h);
        for (let tileX = x; tileX < x + obs.w; tileX += tile) {
          ctx.drawImage(crateImage, tileX, y, tile, tile);
        }
      } else {
        ctx.fillStyle = crateLightPink;
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = obs.vis === 'P1_ONLY' ? '#fbbf24' : obs.vis === 'P2_ONLY' ? '#8b5cf6' : palette.hazard;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      if (obs.label) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text(obs.label), obs.x, obs.y);
      }
      ctx.restore();
    }
  }

  function drawLinguisticGates(isRevealed: boolean) {
    for (const gate of linguisticGates) {
      for (const lane of gate.lanes) {
        const x = lane.x - lane.w / 2;
        const y = gate.y - 14;

        ctx.save();
        // The navigator alone sees which word marks the safe lane.
        const safe = isRevealed && lane.safe;
        const image = safe ? correctGateImage : incorrectGateImage;
        if (image?.complete && image.naturalWidth) {
          ctx.drawImage(image, x, y, lane.w, 28);
        } else {
          ctx.fillStyle = safe ? '#acd3c3' : '#f34767';
          roundRect(ctx, x, y, lane.w, 28, 6);
          ctx.fill();
        }

        ctx.fillStyle = '#29212a';
        ctx.font = '800 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lane.word, lane.x, gate.y, lane.w - 12);
        ctx.restore();
      }
    }
  }

  function drawCar() {
    ctx.save();
    ctx.translate(car.x, car.y);
    // The supplied image faces up; the physics heading points right at angle zero.
    ctx.rotate(car.angle + Math.PI / 2);
    if (carImage?.complete && carImage.naturalWidth) {
      ctx.drawImage(carImage, 295, 0, 1350, 1935, -27, -38, 54, 76);
    } else {
      ctx.fillStyle = '#f26a8d';
      ctx.strokeStyle = '#b7b1f2';
      ctx.lineWidth = 2;
      roundRect(ctx, -25, -36, 50, 72, 14);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

