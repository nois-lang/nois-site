# Welcome

Welcome to the Nois programming language documentation.

```rust
use std::{ math::pi, iter::MapAdapter }

trait Area {
    fn area(self): Float
}

type Shape {
    Rect(width: Float, height: Float),
    Circle(radius: Float),
}

impl Area for Shape {
    fn area(self): Float {
        match self {
            Shape::Rect(width, height) { width * height }
            Shape::Circle(radius) { pi * radius ^ 2. }
        }
    }
}

fn main() {
    let shapes: List<Shape> = [
        Shape::Rect(width: 4., height: 2.),
        Shape::Circle(radius: 12.34),
    ]
    println(shapes.iter().map(Area::area).collect<List<_>>())
}
```
