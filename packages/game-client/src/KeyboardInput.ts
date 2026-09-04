import { IDLE_KEY_STATE, type DirectionKeyState } from "./input";

const KEY_TO_DIRECTION: Record<string, keyof DirectionKeyState> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

export function applyKeyChange(
  state: DirectionKeyState,
  code: string,
  isDown: boolean,
): DirectionKeyState {
  const direction = KEY_TO_DIRECTION[code];
  if (!direction || state[direction] === isDown) {
    return state;
  }
  return { ...state, [direction]: isDown };
}

export class KeyboardInput {
  private state: DirectionKeyState = IDLE_KEY_STATE;
  private readonly target: EventTarget;

  private readonly onKeyDown = (event: Event) => {
    this.state = applyKeyChange(this.state, (event as KeyboardEvent).code, true);
  };

  private readonly onKeyUp = (event: Event) => {
    this.state = applyKeyChange(this.state, (event as KeyboardEvent).code, false);
  };

  constructor(target: EventTarget) {
    this.target = target;
    target.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("keyup", this.onKeyUp);
  }

  getState(): DirectionKeyState {
    return this.state;
  }

  destroy() {
    this.target.removeEventListener("keydown", this.onKeyDown);
    this.target.removeEventListener("keyup", this.onKeyUp);
  }
}
