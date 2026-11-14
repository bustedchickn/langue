import { gateDistance, lanes, laneX, stages, switchDistance, type DriveView } from '../../../shared/minigames/tandem-drive'

// Canvas artwork adapted from the supplied Tandem Drive prototype.
export function drawCourse(ctx: CanvasRenderingContext2D, view: DriveView) {
  const ROAD_HALF_WIDTH = 240
  const FINISH_Y = -stages * gateDistance
  const CAR_LENGTH = 68
  const CAR_WIDTH = 44
  const car = { x: view.x, y: -view.distance, angle: view.angle }
  const role = view.role === 'navigation' ? 'P1' : 'P2'
  const input = { p1LeftGas: view.left, p2RightGas: view.right }
  const staticObstacles = view.hazards
  const linguisticGates = [{
    y: -(view.stage + 1) * gateDistance,
    lanes: lanes.map((code, i) => ({ x: laneX[i], w: 112, code, safe: view.role === 'navigation' && view.gate === i })),
  }]
  ctx.fillStyle = '#020617'
  ctx.fillRect(0, 0, 500, 378)
  ctx.save()
  ctx.translate(250, 290 - car.y)
  drawRoadAndGrid(role)
  if (view.stage > 0) {
    const clearedY = -view.stage * gateDistance
    ctx.fillStyle = '#34d39955'
    ctx.fillRect(-ROAD_HALF_WIDTH + 4, clearedY - 14, ROAD_HALF_WIDTH * 2 - 8, 28)
    ctx.fillStyle = '#6ee7b7'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('CLEARED', 0, clearedY + 4)
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
    ctx.fillText('▲ NORTH FINISH // EXTRACTION ZONE ▲', 0, FINISH_Y - 100)
  }
  if (view.gateKind === 'lane') drawLinguisticGates(view.role === 'navigation')
  else {
    const y = -(view.stage + 1) * gateDistance
    ctx.fillStyle = '#293548'
    ctx.fillRect(-236, y - 14, 472, 28)
    ctx.strokeStyle = '#94a3b8'
    ctx.strokeRect(-236, y - 14, 472, 28)
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 13px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('CYCLING SHUTTER', 0, y + 4)
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
    ctx.strokeStyle = view.left ? '#fbbf24' : '#22d3ee'
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
    ctx.fillText('⇄ SIDE SWITCH', 0, y + 4)
  }
  drawCar()
  if ((view.left || view.right) && !view.blocked) {
    ctx.save()
    ctx.translate(car.x, car.y)
    ctx.rotate(car.angle)
    for (const [on, side, color] of [[view.left, -1, '#fbbf24'], [view.right, 1, '#22d3ee']] as const) {
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

  function drawRoadAndGrid(role: string) {
    const topY = FINISH_Y - 500;
    const botY = 300;
    const height = botY - topY;

    // Road Asphalt Base
    ctx.fillStyle = role === 'P2' ? '#0b1320' : '#111622';
    ctx.fillRect(-ROAD_HALF_WIDTH, topY, ROAD_HALF_WIDTH * 2, height);

    // Tactical Grid Lines
    ctx.strokeStyle = role === 'P2' ? 'rgba(34, 211, 238, 0.08)' : 'rgba(148, 163, 184, 0.07)';
    ctx.lineWidth = 1;
    const gridStep = 90;
    const startGridY = Math.floor((car.y - 900) / gridStep) * gridStep;
    const endGridY = Math.ceil((car.y + 500) / gridStep) * gridStep;

    for (let gy = startGridY; gy <= endGridY; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(-ROAD_HALF_WIDTH, gy);
      ctx.lineTo(ROAD_HALF_WIDTH, gy);
      ctx.stroke();
    }
    for (let gx = -ROAD_HALF_WIDTH; gx <= ROAD_HALF_WIDTH; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, startGridY);
      ctx.lineTo(gx, endGridY);
      ctx.stroke();
    }

    // Centerline & Lane Dividers
    ctx.save();
    ctx.setLineDash([22, 22]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, startGridY);
    ctx.lineTo(0, endGridY);
    ctx.stroke();
    ctx.restore();

    // Left & Right Road Guardrails (Color-coded Amber Left / Cyan Right!)
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#f59e0b'; // Amber Left Edge
    ctx.beginPath();
    ctx.moveTo(-ROAD_HALF_WIDTH, topY);
    ctx.lineTo(-ROAD_HALF_WIDTH, botY);
    ctx.stroke();

    ctx.strokeStyle = '#06b6d4'; // Cyan Right Edge
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

      let fill = '#1e293b';
      let stroke = '#94a3b8';
      if (obs.vis === 'P1_ONLY') {
        fill = 'rgba(245, 158, 11, 0.22)';
        stroke = '#fbbf24';
      } else if (obs.vis === 'P2_ONLY') {
        fill = 'rgba(6, 182, 212, 0.22)';
        stroke = '#22d3ee';
      }

      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2.5;
      if (obs.shape === 'drum') {
        ctx.beginPath()
        ctx.arc(obs.x, obs.y, obs.w / 2, 0, Math.PI * 2)
      } else {
        roundRect(ctx, x, y, obs.w, obs.h, obs.shape === 'rail' ? 3 : 8);
      }
      ctx.fill();
      ctx.stroke();

      // Diagonal hazard stripes
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = stroke;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 3;
      for (let sx = x - obs.h; sx < x + obs.w + obs.h; sx += 16) {
        ctx.beginPath();
        ctx.moveTo(sx, y + obs.h);
        ctx.lineTo(sx + obs.h, y);
        ctx.stroke();
      }
      ctx.restore();

      if (obs.label) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obs.label, obs.x, obs.y);
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
        // Only the navigation feed can color-code the safe gate.

        if (isRevealed) {
          ctx.fillStyle = lane.safe ? 'rgba(16, 185, 129, 0.24)' : 'rgba(244, 63, 94, 0.26)';
          ctx.strokeStyle = lane.safe ? '#34d399' : '#fb7185';
        } else {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
          ctx.strokeStyle = '#fbbf24';
        }

        ctx.lineWidth = 2.5;
        roundRect(ctx, x, y, lane.w, 28, 6);
        ctx.fill();
        ctx.stroke();

        // Phonetic Code Word Label
        ctx.fillStyle = isRevealed ? (lane.safe ? '#6ee7b7' : '#fda4af') : '#fde68a';
        ctx.font = '800 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lane.code, lane.x, gate.y);

        // Status Sub-tag
        ctx.font = '700 10px "JetBrains Mono", monospace';
        if (isRevealed) {
          ctx.fillText(lane.safe ? 'SAFE PASS' : 'LOCKED', lane.x, gate.y + 24);
        } else {
          ctx.fillText('ASK NAV', lane.x, gate.y + 24);
        }
        ctx.restore();
      }
    }
  }

  function drawCar() {
    // Draw Car Body rotated along car.angle
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Forward Heading Sightline
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(CAR_LENGTH * 0.5, 0);
    ctx.lineTo(CAR_LENGTH * 0.5 + 75, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Wheels (4 corners)
    ctx.fillStyle = '#0f172a';
    const wheelPositions = [
      { x: 18, y: -23, side: 'L' },
      { x: -18, y: -23, side: 'L' },
      { x: 18, y: 23, side: 'R' },
      { x: -18, y: 23, side: 'R' }
    ];
    for (const w of wheelPositions) {
      const active = (w.side === 'L' && input.p1LeftGas) || (w.side === 'R' && input.p2RightGas);
      ctx.fillStyle = active ? (w.side === 'L' ? '#fbbf24' : '#22d3ee') : '#1e293b';
      roundRect(ctx, w.x - 9, w.y - 4, 18, 8, 3);
      ctx.fill();
    }

    // Main Chassis
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    roundRect(ctx, -CAR_LENGTH / 2, -CAR_WIDTH / 2, CAR_LENGTH, CAR_WIDTH, 10);
    ctx.fill();
    ctx.stroke();

    // Left & Right Differential Side Pods
    // Left Side (P1 Amber)
    ctx.fillStyle = input.p1LeftGas ? '#fbbf24' : 'rgba(245, 158, 11, 0.35)';
    roundRect(ctx, -CAR_LENGTH * 0.38, -CAR_WIDTH / 2 + 3, CAR_LENGTH * 0.72, 9, 4);
    ctx.fill();

    // Right Side (P2 Cyan)
    ctx.fillStyle = input.p2RightGas ? '#22d3ee' : 'rgba(6, 182, 212, 0.35)';
    roundRect(ctx, -CAR_LENGTH * 0.38, CAR_WIDTH / 2 - 12, CAR_LENGTH * 0.72, 9, 4);
    ctx.fill();

    // Windshield & Forward Nose Arrow
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, 4, -CAR_WIDTH * 0.3, 14, CAR_WIDTH * 0.6, 4);
    ctx.fill();

    // Nose Chevron pointing Forward
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.moveTo(CAR_LENGTH / 2 - 4, 0);
    ctx.lineTo(CAR_LENGTH / 2 - 14, -7);
    ctx.lineTo(CAR_LENGTH / 2 - 14, 7);
    ctx.closePath();
    ctx.fill();

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

