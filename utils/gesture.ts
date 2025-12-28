import { Point, GestureType } from '../types';

// Helper to calculate distance
const dist = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

export const recognizeGesture = (points: Point[]): GestureType => {
  if (points.length < 5) return GestureType.NONE;

  const start = points[0];
  const end = points[points.length - 1];
  
  // Bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  points.forEach(p => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const totalDist = dist(start, end);

  // 1. Horizontal Line (-)
  // Width is significantly larger than height, and start/end Y are close
  if (width > height * 2.5) {
    return GestureType.HORIZONTAL;
  }

  // 2. Vertical Line (|)
  // Height is significantly larger than width, and start/end X are close
  if (height > width * 2.5) {
    return GestureType.VERTICAL;
  }

  // Complex shapes analysis
  // We divide the path into segments to detect changes in direction
  
  // 3. Caret (^) or Vee (v) or Lightning (z)
  // We need to find the inflection point (highest or lowest Y)
  
  // Find index of min Y (highest point visually) and max Y (lowest point visually)
  let lowestY = Infinity;
  let highestY = -Infinity;
  let lowestYIndex = -1;
  let highestYIndex = -1;

  points.forEach((p, i) => {
    if (p.y < lowestY) { lowestY = p.y; lowestYIndex = i; }
    if (p.y > highestY) { highestY = p.y; highestYIndex = i; }
  });

  // Normalize indexes to 0-1 range to check if peak is roughly in middle
  const peakRatio = lowestYIndex / points.length;
  const troughRatio = highestYIndex / points.length;

  // CARET (^): Starts low, goes high (low Y), goes low
  // Start and End should be lower (higher Y value) than the peak
  if (height > width * 0.5 && start.y > lowestY + height * 0.3 && end.y > lowestY + height * 0.3) {
     if (peakRatio > 0.2 && peakRatio < 0.8) {
       return GestureType.CARET;
     }
  }

  // VEE (v): Starts high, goes low (high Y), goes high
  if (height > width * 0.5 && start.y < highestY - height * 0.3 && end.y < highestY - height * 0.3) {
    if (troughRatio > 0.2 && troughRatio < 0.8) {
      return GestureType.VEE;
    }
  }

  // LIGHTNING (Z or similar zigzag)
  // Primitive check: Mostly horizontal travel but with sharp Y changes
  // Or, checking for 3 segments: Right-Right, Down-Left, Right-Right
  // Simplified: If it fits in a square-ish box and has high total path length vs displacement
  // A simple heuristic for lightning in this context: 
  // It's not a line, not a ^, not a v. 
  // Often drawn as horizontal-ish top, diagonal down, horizontal bottom.
  // Let's rely on aspect ratio being somewhat square and path length being long.
  
  const pathLength = points.reduce((acc, p, i) => {
    if (i === 0) return 0;
    return acc + dist(points[i-1], p);
  }, 0);

  if (width > height * 0.5 && height > width * 0.5 && pathLength > totalDist * 1.5) {
      // Check if start is top-leftish and end is bottom-rightish
      if (start.x < end.x && start.y < end.y) {
          return GestureType.LIGHTNING;
      }
  }

  return GestureType.NONE;
};