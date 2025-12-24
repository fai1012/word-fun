export class Physics {
    static readonly GRAVITY = 0.8;
    static readonly FLOOR_Y = 0.75; // % of screen height

    static checkFloorCollision(y: number, screenHeight: number): number {
        const floorY = screenHeight * Physics.FLOOR_Y;
        return Math.min(y, floorY);
    }

    static isOnFloor(y: number, screenHeight: number): boolean {
        return y >= screenHeight * Physics.FLOOR_Y - 1; // Tolerance
    }
}
