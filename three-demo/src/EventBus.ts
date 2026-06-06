type Handler<T> = (payload: T) => void;

/** Lightweight pub/sub � swap for SpacetimeDB reducer calls later. */
class EventBus {
  private renderHandlers = new Set<Handler<import('./renderState').RenderState>>();
  private clickHandlers = new Set<Handler<{ x: number; y: number }>>();

  emitRenderState(state: import('./renderState').RenderState): void {
    this.renderHandlers.forEach((h) => h(state));
  }

  onRenderState(handler: Handler<import('./renderState').RenderState>): () => void {
    this.renderHandlers.add(handler);
    return () => this.renderHandlers.delete(handler);
  }

  emitTileClick(payload: { x: number; y: number }): void {
    this.clickHandlers.forEach((h) => h(payload));
  }

  onTileClick(handler: Handler<{ x: number; y: number }>): () => void {
    this.clickHandlers.add(handler);
    return () => this.clickHandlers.delete(handler);
  }
}

export const eventBus = new EventBus();
