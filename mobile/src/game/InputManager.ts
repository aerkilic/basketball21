import { InputFrame } from "./types";

// Bridges the touch UI (joystick + buttons) and the simulation. The UI calls the
// setters from gesture handlers; the sim pulls a consolidated InputFrame each step
// and edge-detection (down/up this frame) is resolved here.
export class InputManager {
  private moveX = 0;
  private moveZ = 0;
  private sprint = false;

  // raw button "is pressed" booleans pushed from UI
  private shootPressed = false;
  private jumpPressed = false;

  // edge requests latched until consumed by next frame
  private passEdge = false;
  private specialEdge = false;

  // internal previous states for edge detection
  private prevShoot = false;
  private prevJump = false;

  setMove(x: number, z: number) {
    this.moveX = x;
    this.moveZ = z;
  }
  setSprint(on: boolean) {
    this.sprint = on;
  }
  setShoot(on: boolean) {
    this.shootPressed = on;
  }
  setJump(on: boolean) {
    this.jumpPressed = on;
  }
  pressPass() {
    this.passEdge = true;
  }
  pressSpecial() {
    this.specialEdge = true;
  }

  // Called once per simulation step. Resolves edges and clears latches.
  consume(): InputFrame {
    const shootDown = this.shootPressed && !this.prevShoot;
    const shootUp = !this.shootPressed && this.prevShoot;
    const jumpEdge = this.jumpPressed && !this.prevJump;

    const frame: InputFrame = {
      moveX: this.moveX,
      moveZ: this.moveZ,
      sprint: this.sprint,
      shootDown,
      shootHeld: this.shootPressed,
      shootUp,
      pass: this.passEdge,
      jump: jumpEdge,
      jumpHeld: this.jumpPressed,
      special: this.specialEdge,
    };

    this.prevShoot = this.shootPressed;
    this.prevJump = this.jumpPressed;
    this.passEdge = false;
    this.specialEdge = false;
    return frame;
  }

  reset() {
    this.moveX = this.moveZ = 0;
    this.sprint = this.shootPressed = this.jumpPressed = false;
    this.passEdge = this.specialEdge = false;
    this.prevShoot = this.prevJump = false;
  }
}
