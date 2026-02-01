export interface Renderable {
    x: number;
    y: number;
    width: number;
    height: number;
    draw(ctx: CanvasRenderingContext2D, offsetX: number): void;
    isVisible(viewX: number, viewWidth: number): boolean;
}
