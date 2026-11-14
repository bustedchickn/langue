export const drivePhysics = { straightSpeed: 118, pivotOffset: 34, angularSpeed: 1.48 }

export type Pose = { x: number; y: number; angle: number }

export function driveStep(pose: Pose, left: boolean, right: boolean, seconds: number): Pose {
  const { x, y, angle } = pose
  if (left && right) {
    const step = drivePhysics.straightSpeed * seconds
    return { x: x + Math.cos(angle) * step, y: y + Math.sin(angle) * step, angle }
  }
  if (!left && !right) return pose
  const offset = (left ? 1 : -1) * drivePhysics.pivotOffset
  const nextAngle = angle + (left ? 1 : -1) * drivePhysics.angularSpeed * seconds
  return {
    x: x + offset * (Math.sin(nextAngle) - Math.sin(angle)),
    y: y + offset * (Math.cos(angle) - Math.cos(nextAngle)),
    angle: nextAngle,
  }
}
