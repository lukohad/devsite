
import * as Matter from "matter-js";

export function initPhysics() {
    const stage = document.querySelector<HTMLElement>(".physics-stage");
    const viewport = document.querySelector<HTMLElement>(".slide-viewport");

    // Ensure both elements exist before starting the simulation.
    if (!stage || !viewport) return;

    setupPhysics(stage, viewport);
    }

    function setupPhysics(stage: HTMLElement, viewport: HTMLElement) 
    {
        const elements = Array.from(
            stage.querySelectorAll<HTMLElement>(".physics-object")
        );

    const engine = Matter.Engine.create();
    const wall = 80;

    // The world spans ALL slides, not just the visible window.
    let worldWidth = viewport.scrollWidth;
    let floorY = stage.clientHeight;

    // Optional: lower gravity for longer throws.
    engine.gravity.y = 0.45;

    // Find slide 3's starting position in world coordinates.
    const funSlide = viewport.querySelector<HTMLElement>("#fun");

    const spawnX = funSlide
        ? funSlide.getBoundingClientRect().left
          - viewport.getBoundingClientRect().left
          + viewport.scrollLeft
        : 0;

    // Create all objects in one shared physics world.
    const objects = elements.map((element, index) => {
        const w = element.offsetWidth;
        const h = element.offsetHeight;

        const x = spawnX +
            viewport.clientWidth * (index + 1) / (elements.length + 1);

        const y = 120 + index * 50;

        const body = Matter.Bodies.rectangle(x, y, w, h, {
            restitution: 0.8,
            friction: 0.005,
            frictionAir: 0.001
        });

        return { element, body, w, h };
    });

    Matter.Composite.add(
        engine.world,
        objects.map(object => object.body)
    );

    let boundaries: Matter.Body[] = [];

    function rebuildBoundaries() {
        const newWidth = viewport.scrollWidth;
        const newFloor = stage.clientHeight;

        // Preserve relative horizontal positions on window resize.
        const scale = newWidth / worldWidth;

        objects.forEach(({ body, w, h }) => {
            Matter.Body.setPosition(body, {
                x: Math.max(w / 2,
                    Math.min(newWidth - w / 2, body.position.x * scale)),
                y: Math.max(h / 2,
                    Math.min(newFloor - h / 2, body.position.y))
            });
        });

        worldWidth = newWidth;
        floorY = newFloor;

        Matter.Composite.remove(engine.world, boundaries);

        boundaries = [
            // Floor: spans the entire world
            Matter.Bodies.rectangle(
                worldWidth / 2, floorY + wall / 2,
                worldWidth + wall * 2, wall,
                { isStatic: true }
            ),

            // Ceiling: spans the entire world
            Matter.Bodies.rectangle(
                worldWidth / 2, -wall / 2,
                worldWidth + wall * 2, wall,
                { isStatic: true }
            ),

            // Far left: beginning of slide 1
            Matter.Bodies.rectangle(
                -wall / 2, floorY / 2,
                wall, floorY + wall * 2,
                { isStatic: true }
            ),

            // Far right: end of final slide
            Matter.Bodies.rectangle(
                worldWidth + wall / 2, floorY / 2,
                wall, floorY + wall * 2,
                { isStatic: true }
            )
        ];

        Matter.Composite.add(engine.world, boundaries);
    }

    rebuildBoundaries();
    window.addEventListener("resize", rebuildBoundaries);

    // Convert mouse coordinates into WORLD coordinates.
    function toWorld(event: PointerEvent) {
    const rect = stage!.getBoundingClientRect();

    return {
        x: event.clientX - rect.left + viewport!.scrollLeft,
        y: event.clientY - rect.top
    };
}
    // Dragging across the shared world.
    objects.forEach(({ element, body }) => {
        let drag: Matter.Constraint | null = null;
        let pointerId: number | null = null;

        element.addEventListener("pointerdown", event => {
            if (drag) return;
            if (event.pointerType === "mouse" && event.button !== 0) return;

            event.preventDefault();

            pointerId = event.pointerId;
            element.setPointerCapture(pointerId);

            const pointer = toWorld(event);

            const localPoint = Matter.Vector.rotate({
                x: pointer.x - body.position.x,
                y: pointer.y - body.position.y
            }, -body.angle);

            drag = Matter.Constraint.create({
                pointA: pointer,
                bodyB: body,
                pointB: localPoint,
                length: 0,
                stiffness: 0.25,
                damping: 0.1
            });

            Matter.Composite.add(engine.world, drag);
        });

        element.addEventListener("pointermove", event => {
            if (!drag || event.pointerId !== pointerId) return;

            const pointer = toWorld(event);
            drag.pointA.x = pointer.x;
            drag.pointA.y = pointer.y;
        });

        function release(event: PointerEvent) {
            if (event.pointerId !== pointerId) return;

            if (drag) {
                Matter.Composite.remove(engine.world, drag);
            }

            drag = null;
            pointerId = null;
        }

        element.addEventListener("pointerup", release);
        element.addEventListener("pointercancel", release);
        element.addEventListener("lostpointercapture", release);
    });

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    // Render objects relative to the CURRENT slide position.
    function draw() {
        const cameraX = viewport.scrollLeft;

        objects.forEach(({ element, body, w, h }) => {
            const screenX = body.position.x - cameraX - w / 2;
            const screenY = body.position.y - h / 2;

            element.style.transform = `
                translate3d(${screenX}px, ${screenY}px, 0)
                rotate(${body.angle}rad)
            `;
        });

        requestAnimationFrame(draw);
    }

    draw();
}
