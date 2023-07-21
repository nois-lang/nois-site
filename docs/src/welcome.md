# Welcome

Welcome to the Nois programming language documentation.

```rust
use std::math

trait Area {
    fn area(self): Num
}

type Shape {
    Rect(width: Num, height: Num),
    Circle(radius: Num),
}

impl Area for Shape {
    fn area(self): Num {
        match self {
            Rect(width, height) -> width * height,
            Circle(radius) -> math::pi * radius ^ 2
        }
    }
}

fn main() {
    let shapes: List<Shape> = [
        Rect(width: 4, height: 2),
        Circle(radius: 12.34),
    ]
    println(shapes)
}
```
