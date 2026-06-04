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
  private trickEdge = false;
  // shoot edges are latched on the transition itself, so a fast tap whose press
  // AND release both land within one frame is never swallowed.
  private shootDownEdge = false;
  private shootUpEdge = false;

  // internal previous states for edge detection
  private prevJump = false;

  setMove(x: number, z: number) {
    this.moveX = x;
    this.moveZ = z;
  }
  setSprint(on: boolean) {
    this.sprint = on;
  }
  setShoot(on: boolean) {
    if (on && !this.shootPressed) this.shootDownEdge = true;
    else if (!on && this.shootPressed) this.shootUpEdge = true;
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
  pressTrick() {
    this.trickEdge = true;
  }

  // Called once per simulation step. Resolves edges and clears latches.
  consume(): InputFrame {
    const jumpEdge = this.jumpPressed && !this.prevJump;

    const frame: InputFrame = {
      moveX: this.moveX,
      moveZ: this.moveZ,
      sprint: this.sprint,
      shootDown: this.shootDownEdge,
      shootHeld: this.shootPressed,
      shootUp: this.shootUpEdge,
      pass: this.passEdge,
      jump: jumpEdge,
      jumpHeld: this.jumpPressed,
      special: this.specialEdge,
      trick: this.trickEdge,
    };

    this.prevJump = this.jumpPressed;
    this.shootDownEdge = false;
    this.shootUpEdge = false;
    this.passEdge = false;
    this.specialEdge = false;
    this.trickEdge = false;
    return frame;
  }

  reset() {
    this.moveX = this.moveZ = 0;
    this.sprint = this.shootPressed = this.jumpPressed = false;
    this.passEdge = this.specialEdge = this.trickEdge = false;
    this.shootDownEdge = this.shootUpEdge = false;
    this.prevJump = false;
  }
}
